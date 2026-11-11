#!/usr/bin/env python3
"""Bake the data behind the watercolour sea chart (resources/js/map-chart.js).

One land raster in Web Mercator, one distance field from it, and everything the chart places is read
off that field:

  public/map-chart/glaze/{z}/{x}/{y}.webp the sea's depth glaze. The reference chart is pale against
                                          every coast and deeper with distance from land, whatever the
                                          real sea floor does (real bathymetry contours were tried and
                                          read as hard angular patches). So: one thin glaze per band
                                          of distance from land, the first stronger so the shallows
                                          read as a band. Raster tiles z0-4; MapLibre's linear
                                          resampling gives the bands a soft wet edge.
  public/map-chart/coast.geojson          the coastline as land outlines that all run the same way round, so a
                                          fixed line-offset puts the dashed line on the sea side everywhere.
                                          (Natural Earth's coastline lines run either way: the dash was
                                          offshore in Australia and inland around all of Afro-Eurasia.)
                                          Edges along the 180° cut and the south pole are dropped.
  public/map-chart/{peaks,tufts,waves}/   vector tiles (tippecanoe), so a view fetches only its own
                                          points: as GeoJSON the three were 3.3 MB on a school laptop.

  peaks   inland ridges. Bart 2026-10-20: "They can't be that close to
                                          the shore". Only peaks at least MIN_RIDGE_KM inland, spaced,
                                          each carrying `fit` = km to the coast so the layer can cap
                                          its size and a ridge never reaches the shore at any zoom.
          Bart 2026-11-11 ("these mountains are very very high", "why is there no peak at the Mont
          Blanc"): real summits first. Natural Earth's named summits (ne_10m_geography_regions_
          elevation_points, true heights) are placed before anything else, highest first, so Mont
          Blanc, Triglav and Aneto stand where they are. Then the elevation grid fills each range,
          higher tiers first. Low hills (the grid's `smaller` tier, under ~600 m) get no peak, only
          tufts, and every ridge is sized by its height (RIDGE_TIER_SIZE).
  tufts   olive foothills around the ranges, never on a ridge.
  waves   ink wave marks on open water, jittered, ranked 0-3 for zoom.

Deterministic: the same inputs give byte-identical outputs (seeded RNG, sorted inputs). `--check`
builds twice in memory and fails if anything differs.

  python3 scripts/build-chart-data.py --land storage/app/naturalearth/ne_50m_land.geojson
  (summits: ne_10m_geography_regions_elevation_points.geojson next to it, from
   github.com/nvkelso/natural-earth-vector/tree/master/geojson)
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
import tempfile
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'tools' / 'watercolour'))
import aquarel  # noqa: E402  the shared watercolour method (docs/aquarel-method.md)
from aquarel import hue_to_rgb, periodic_noise  # noqa: E402

N = 8192                       # raster width/height in px (Web Mercator, whole world)
PAD = 512                      # horizontal wrap padding so distances cross the antimeridian
MAX_LAT = 85.05112878
EARTH_KM = 40075.016686

GLAZE_BANDS_KM = [50, 90, 135, 185, 240, 300, 370]
GLAZE_FIRST, GLAZE_REST = 0.24, 0.07   # first band = visible edge of the shallows
GLAZE_TEXTURE = Path('resources/map-chart/sea-glaze.webp')  # the approved lab's glaze paint (ChatGPT, 10-21)
GLAZE_MAX_Z = 4
GLAZE_EDGE_PX = 1.2               # feather of each glaze band, in z4 pixels

MIN_RIDGE_KM, RIDGE_SPACING_KM = 55, 85
# The lab's 40 km suited the empty Tasman box; across the Mediterranean it carpeted every range.
TUFT_SPACING_KM, TUFT_CLEAR_KM = 100, 35
# Islets smaller than this push no shallows out around them: their glaze halo floated on open sea
# where the land tiles draw nothing at that zoom (Samoa, Lakshadweep).

RIDGE_GLYPHS, TUFT_GLYPHS, WAVE_GLYPHS = 12, 16, 4
VERSION_FILE = Path('resources/js/map-chart-version.json')
HILL_GLYPHS = 12                   # rounded olive hills (ChatGPT sheet, 11-11) for the middle ranges
TIERS = ('smaller', 'small', 'medium', 'large')
RIDGE_TIER_SIZE = {'small': 0.62, 'medium': 0.82, 'large': 1.0}   # `smaller` hills draw no ridge
HILL_TIERS = {'small'}   # Bart 11-11: middle ranges (Vosges, Black Forest, Harz) are rounded hills, not sharp peaks
SUMMIT_MIN_M = 1100


def summit_tier(metres: float) -> str:
    """A summit's true height → the grid's tier (the grid's are ~10 km averages, so summits sit higher)."""
    return 'large' if metres >= 2500 else 'medium' if metres >= 1800 else 'small' if metres >= SUMMIT_MIN_M else 'smaller'
WAVE_STEP_DEG, WAVE_CLEAR_KM = 1.5, 45
SEED = 1642


def merc_px(lng: float, lat: float) -> tuple[float, float]:
    lat = max(-MAX_LAT, min(MAX_LAT, lat))
    x = (lng + 180) / 360 * N
    y = (1 - math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) / math.pi) / 2 * N
    return x, y


def km_per_px(y: float) -> float:
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / N))))
    return EARTH_KM / N * math.cos(math.radians(lat))


def land_mask(land_path: Path, lakes_path: Path) -> np.ndarray:
    """Land is land minus its lakes: ridges and tufts measure their distance to any water, so none
    is ever placed on the Great Lakes (tester 10-26: symbols drawn on Lake Superior)."""
    img = Image.new('L', (N, N), 0)
    draw = ImageDraw.Draw(img)
    for poly in polygons(land_path):
        for i, ring in enumerate(poly):
            draw.polygon([merc_px(x, y) for x, y in ring], fill=0 if i else 255)
    for poly in water_lakes(lakes_path):
        draw.polygon([merc_px(x, y) for x, y in poly[0]], fill=0)
    return np.asarray(img) > 127


def water_lakes(lakes_path: Path):
    """Lakes that hold water. The salt pans of the Australian outback (Eyre, Torrens, Gairdner) are
    dry, so they are not painted. Only there: Natural Earth also files the IJsselmeer as 'Alkaline Lake'."""
    for feat in json.loads(lakes_path.read_text())['features']:
        geom = feat['geometry']
        if feat['properties'].get('featurecla') == 'Alkaline Lake':
            ring = (geom['coordinates'][0] if geom['type'] == 'Polygon' else geom['coordinates'][0][0])
            lng, lat = sum(x for x, _ in ring) / len(ring), sum(y for _, y in ring) / len(ring)
            if 112 < lng < 155 and -40 < lat < -10:
                continue
        yield from (geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']])


def ring_area(ring: list) -> float:
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1])) / 2


def on_cut(a: list, b: list) -> bool:
    """An edge Natural Earth added to close a polygon at the antimeridian or the south pole."""
    return (abs(a[0]) >= 179.999 and abs(b[0]) >= 179.999) or (a[1] <= -89.9 and b[1] <= -89.9)


COAST_SIMPLIFY_DEG = 0.03   # ~3 km, then corner cutting: fjord-level detail read as spiky (prod 10-26)
SMOOTH_KEEP_DEG = 0.006     # ~600 m: below a pixel at the closest lesson zoom
CHAIKIN_PASSES = 3          # one pass still left corners at z5-6 (ChatGPT round 4: 'angular segments')


def simplify(line: list, tol: float) -> list:
    """Douglas-Peucker, iterative."""
    pts = np.asarray(line, float)
    keep = np.zeros(len(pts), bool); keep[[0, -1]] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        seg = pts[b] - pts[a]
        rel = pts[a + 1:b] - pts[a]
        norm = np.hypot(*seg)
        d = np.abs(seg[0] * rel[:, 1] - seg[1] * rel[:, 0]) / norm if norm else np.hypot(rel[:, 0], rel[:, 1])
        i = int(np.argmax(d))
        if d[i] > tol:
            keep[a + 1 + i] = True
            stack += [(a, a + 1 + i), (a + 1 + i, b)]
    return pts[keep].tolist()


# Area (km2) an island needs before it is drawn at a zoom. MUST equal ISLET_KM2 in
# resources/js/map-chart.js (asserted by map-chart.test.js): the glaze tiles leave out the shallows of
# exactly the islands the map leaves out, or a pale halo floats on the sea with nothing in it.
ISLET_KM2 = [(0, 20000), (2.5, 3000), (3.5, 800), (4.5, 100), (5.5, 40), (6.5, 0)]


def islet_km2(zoom: float) -> float:
    return [km2 for z, km2 in ISLET_KM2 if z <= zoom][-1]


# the islet rule for a 256-px raster tile of zoom z: strictest map zoom it is shown at (z - 1.5)
TILE_ZOOM_RULE = lambda z: islet_km2(max(0.0, z - 1.5))


# Islands an illustrator would draw even when small: the landfalls of the lessons' voyages.
# (lng, lat); a ring whose bounding box contains one of these is always kept.
KEEP_ISLANDS = [(57.55, -20.25), (55.5, -21.1), (63.4, -19.7), (-175.2, -21.2), (-174.0, -18.65), (178.0, -17.8),
                (179.3, -16.6), (-172.5, -13.7), (-171.7, -14.0), (172.6, -40.6), (145.0, -40.8), (148.0, -40.0)]


def ring_km2(ring: list) -> float:
    lat = math.radians(sum(y for _, y in ring) / len(ring))
    return abs(ring_area(ring)) * (111.32 ** 2) * math.cos(lat)


def chaikin(ring: list, closed: bool = True) -> list:
    """One pass of corner cutting: removes the polygon zig-zag, keeps the shape (a confident stroke)."""
    pts = ring
    out = [] if closed else [pts[0]]
    n = len(pts)
    for i in range(n if closed else n - 1):
        (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
        out += [[0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]]
    if not closed:
        out.append(pts[-1])
    return out


def drawn_ring(ring: list) -> list:
    """Simplified then smoothed: the outline an illustrator would draw, shared by fill and ink."""
    if ring[0] == ring[-1]:
        ring = ring[:-1]
    if len(ring) < 4:
        return ring
    simple = simplify(ring + ring[:1], COAST_SIMPLIFY_DEG)[:-1]
    if len(simple) < 3:
        return ring
    def smooth(pts: list, closed: bool) -> list:
        for _ in range(CHAIKIN_PASSES):
            pts = chaikin(pts, closed)
        # corner cutting multiplies the points 8x; drop the ones a curve does not need (the four
        # files were 9 MB, a lot for a school laptop on a lesson that is already loading)
        return simplify(pts + pts[:1], SMOOTH_KEEP_DEG)[:-1] if closed else simplify(pts, SMOOTH_KEEP_DEG)
    edges = list(zip(simple, simple[1:] + simple[:1]))
    cuts = [i for i, (a, b) in enumerate(edges) if on_cut(a, b)]
    if not cuts:
        return smooth(simple, True)
    # Eurasia, Antarctica and a few others carry closing edges NE adds at 180° and the south pole:
    # smooth each run of real coast between them, keep the cut edges straight (they are never drawn).
    start = (cuts[0] + 1) % len(simple)
    rot = simple[start:] + simple[:start]
    out, run = [], [rot[0]]
    for a, b in zip(rot, rot[1:] + rot[:1]):
        if on_cut(a, b):
            out += smooth(run, False) if len(run) > 2 else run
            run = [b]
        else:
            run.append(b)
    return out


def ring_props(ring: list) -> dict:
    xs, ys = [x for x, _ in ring], [y for _, y in ring]
    keep = any(min(xs) - 0.3 <= kx <= max(xs) + 0.3 and min(ys) - 0.3 <= ky <= max(ys) + 0.3 for kx, ky in KEEP_ISLANDS)
    return {'a': round(ring_km2(ring)), 'k': 1 if keep else 0}


def polygons(path: Path):
    for feat in json.loads(path.read_text())['features']:
        geom = feat['geometry']
        yield from (geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']])


def round_ring(ring: list) -> list:
    r = [[round(x, 3), round(y, 3)] for x, y in ring]
    return r + r[:1]


def chart_shapes(land_path: Path, lakes_path: Path) -> tuple[dict, dict, dict]:
    """Land polygons, lake polygons and coast lines, all from the same drawn rings.

    Coast lines run with the land on the left (land rings counter-clockwise, lake rings clockwise), so
    one line-offset sign puts the dash on the water side everywhere. Every feature carries `a` (km²
    of its ring) and `k` (a story island to keep), which the layers use to leave islets out by zoom.
    """
    land, lakes, lines = [], [], []

    def add_lines(ring: list, props: dict) -> None:
        ring = ring + ring[:1]
        run = [ring[0]]
        for a, b in zip(ring, ring[1:]):
            if on_cut(a, b):
                if len(run) > 1:
                    lines.append((run, props))
                run = [b]
            else:
                run.append(b)
        if len(run) > 1:
            lines.append((run, props))

    for poly in polygons(land_path):
        outer = drawn_ring(poly[0])
        if ring_area(outer) < 0:
            outer = outer[::-1]
        props = ring_props(poly[0])            # area of the real outline, not the smoothed one
        holes = [drawn_ring(h) for h in poly[1:]]
        land.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'Polygon', 'coordinates': [round_ring(outer)] + [round_ring(h) for h in holes if len(h) > 2]}})
        add_lines(outer, props)
        for hole in holes:                     # the Caspian is a hole in Eurasia: it gets its shore too
            if len(hole) > 2:
                add_lines(hole[::-1] if ring_area(hole) > 0 else hole, {**props, 'lake': 1})
    for poly in water_lakes(lakes_path):
        ring = drawn_ring(poly[0])
        if ring_area(ring) > 0:
            ring = ring[::-1]                     # clockwise: the shore runs with land on the left
        props = ring_props(poly[0])
        lakes.append({'type': 'Feature', 'properties': props, 'geometry': {'type': 'Polygon', 'coordinates': [round_ring(ring)]}})
        add_lines(ring, {**props, 'lake': 1})
    coast = [{'type': 'Feature', 'properties': pr, 'geometry': {'type': 'LineString', 'coordinates': [[round(x, 3), round(y, 3)] for x, y in ln]}}
             for ln, pr in lines]
    fc = lambda f: {'type': 'FeatureCollection', 'features': f}
    return fc(land), fc(lakes), fc(coast)


def without_islets(land: np.ndarray, scale: np.ndarray, min_km2: float) -> np.ndarray:
    """Land with the islands the map does not draw at this zoom removed (story islands stay)."""
    labels, n = ndimage.label(land)
    km2 = ndimage.sum(np.broadcast_to(scale ** 2, land.shape), labels, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = km2 >= min_km2
    for lng, lat in KEEP_ISLANDS:
        x, y = merc_px(lng, lat)
        keep[labels[min(N - 1, int(y)), int(x) % N]] = True
    keep[0] = False
    return keep[labels]


def distance_fields(land: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Mercator-px distance to the nearest land (sea side) and to the nearest sea (land side)."""
    wrapped = np.pad(land, ((0, 0), (PAD, PAD)), mode='wrap')
    to_land = ndimage.distance_transform_edt(~wrapped)[:, PAD:-PAD]
    to_sea = ndimage.distance_transform_edt(wrapped)[:, PAD:-PAD]
    return to_land, to_sea


def row_scale() -> np.ndarray:
    return np.array([km_per_px(y + 0.5) for y in range(N)])[:, None]


def shelf_scaled_km(land: np.ndarray, scale: np.ndarray) -> np.ndarray:
    """Distance to land divided by the nearest landmass's shelf factor, at half resolution.

    The approved lab chart widened the shallows around big land and narrowed them round islets
    (0.7x to 1.6x by log area). Each sea pixel takes the factor of the landmass nearest to it.
    """
    half = land.reshape(N // 2, 2, N // 2, 2).any(axis=(1, 3))
    labels, n = ndimage.label(half)
    px_km2 = (scale[::2, 0] * 2) ** 2
    area_km2 = ndimage.sum(np.broadcast_to(px_km2[:, None], half.shape), labels, range(1, n + 1))
    factor = np.concatenate([[1.0], np.clip(np.log10(area_km2 / 1e3 + 1) / 2.2, 0.7, 1.6)])
    wrapped = np.pad(~half, ((0, 0), (PAD // 2, PAD // 2)), mode='wrap')
    dist, (iy, ix) = ndimage.distance_transform_edt(wrapped, return_indices=True)
    dist, iy, ix = dist[:, PAD // 2:-PAD // 2], iy[:, PAD // 2:-PAD // 2], ix[:, PAD // 2:-PAD // 2]
    nearest = labels[iy, (ix - PAD // 2) % (N // 2)]
    # smoothed, or the shallows jump in a straight seam wherever the nearest landmass changes
    f = ndimage.gaussian_filter(factor[nearest], sigma=(30, 30), mode=('nearest', 'wrap'))
    km = dist * scale[::2] * 2 / f
    return np.repeat(np.repeat(km, 2, axis=0), 2, axis=1)


def glaze_alpha(to_land_km: np.ndarray, size: int) -> Image.Image:
    bands = sum((to_land_km > d).astype(np.uint8) for d in GLAZE_BANDS_KM)
    clear = np.where(bands > 0, (1 - GLAZE_FIRST) * (1 - GLAZE_REST) ** np.maximum(bands - 1, 0), 1.0)
    # each band's edge feathered by about a pixel at z4: a wet edge, not a step (ChatGPT: "stepped halos")
    alpha = ndimage.gaussian_filter((1 - clear) * 255, sigma=GLAZE_EDGE_PX * 2, mode=('nearest', 'wrap'))
    return Image.fromarray(alpha.astype(np.uint8), 'L').resize((size, size), Image.BOX)


def glaze_tiles(land: np.ndarray, scale: np.ndarray, out: Path) -> int:
    """One glaze per tile zoom, each with the islands that zoom draws (see ISLET_KM2)."""
    # glazed with the painted sea, not a flat colour: the texture repeats every 512 px at z4, so
    # the granulation sits at the same scale as the base sea pattern on screen
    tex = Image.open(GLAZE_TEXTURE).convert('RGB').resize((512, 512), Image.LANCZOS)
    full = 256 * 2 ** GLAZE_MAX_Z
    paint = Image.new('RGB', (full, full))
    for x in range(0, full, 512):
        for y in range(0, full, 512):
            paint.paste(tex, (x, y))
    count = 0
    for z in range(GLAZE_MAX_Z + 1):
        # MapLibre's zoom is 512-px based and it rounds: a 256-px tile of zoom z is on screen from map
        # zoom z-1.5 to z-0.5. Use the strictest rule in that range (TILE_ZOOM_RULE), so no shallows are
        # painted round an island the map is not drawing yet.
        size = 256 * 2 ** z
        a = glaze_alpha(shelf_scaled_km(without_islets(land, scale, TILE_ZOOM_RULE(z)), scale), size)
        level = Image.merge('RGBA', [*paint.resize((size, size), Image.BOX).split(), a])
        for x in range(2 ** z):
            for y in range(2 ** z):
                path = out / str(z) / str(x) / f'{y}.webp'
                path.parent.mkdir(parents=True, exist_ok=True)
                level.crop((x * 256, y * 256, x * 256 + 256, y * 256 + 256)).save(path, quality=80, alpha_quality=85, method=6)
                count += 1
    return count


# Painted washes (ChatGPT, History Lines, 2026-10-26): Bart, "there should also be lots of watercolour
# textures that i was missing". Two per surface, laid over the world in big flipped/offset cells and
# mixed by a slow noise, so no repeat shows at classroom zoom.
WASH_SOURCES = {'sea': ['wash-sea-1', 'wash-sea-2'], 'land': ['wash-land-1', 'wash-land-2']}
WASH_BASE = {'sea': 'public/map-chart/art/sea.webp', 'land': 'public/map-chart/art/land.webp'}
SEA_WASH_SOFTEN_PX = 4.0         # at z4 (~6 km): keeps passes, drops the mottle
SEA_WASH_CONTRAST = 2.2          # broad, uneven passes across the water (ChatGPT round 8: 'too uniform')
WASH_CONTRAST = 1.7              # a little more than painted: the washes are seen through the base
WASH_CELL_PX = 1024              # one painted sheet spans 1024 px at z4 (~2,500 km at 40°)
WASH_LAND_FADE_KM = 14           # the land wash thins out over the last km before the coast
BLEED_KM = 9                     # pigment pooling along the shore, on the water side
BLEED_RGB = (58, 140, 160)


# The colours of the earth as it is (Bart 11-11: "more green, in beautiful aquarel style, the colours of earth how it
# is"): NASA's Blue Marble (public domain, the globe already shows it), softened into washes and thinned like diluted
# pigment on the paper, so forest paints olive, steppe pale green, desert sand and ice stays paper.
EARTH_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'
EARTH_CACHE = Path('storage/app/chart-earth/bluemarble-z4.webp')
EARTH_SOFTEN_PX = 5      # at z4 (~10 km/px at the equator): a wash, never a photo
EARTH_PIGMENT = 0.22     # 1 = the photo's own colour, 0 = bare paper; the exponent of the colour on the paper
EARTH_COAST_KEEP = 0.85  # how much of the land wash still lies on the coast itself
EARTH_GREEN = 0.7        # how far olive and khaki turn toward sap green (0 = the photo's own hue)
EARTH_SAP_HUE = 100      # a fresh sap green
EARTH_FRESH = 1.5        # the photo's greens are olive-brown: a little more colour, so a wash reads fresh, not muddy
EARTH_WARP_PX = 9        # the wash edges wander, so a forest edge is a painted edge, not a blurred border


def earth_colour(size: int) -> np.ndarray:
    """The Blue Marble at z4 (fetched once, cached), as float RGB 0..1 at `size`, softened and with wandering edges."""
    if not EARTH_CACHE.exists():
        n = 16
        def tile(xy):
            x, y = xy
            with urllib.request.urlopen(EARTH_URL.format(z=4, x=x, y=y), timeout=60) as r:
                return xy, Image.open(__import__('io').BytesIO(r.read())).convert('RGB')
        sheet = Image.new('RGB', (256 * n, 256 * n))
        with ThreadPoolExecutor(8) as pool:
            for (x, y), im in pool.map(tile, [(x, y) for x in range(n) for y in range(n)]):
                sheet.paste(im, (x * 256, y * 256))
        EARTH_CACHE.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(EARTH_CACHE, lossless=True, method=4)
    rgb = np.asarray(Image.open(EARTH_CACHE).convert('RGB').resize((size, size), Image.LANCZOS), float) / 255
    k = size / 4096
    rgb = ndimage.gaussian_filter(rgb, sigma=(EARTH_SOFTEN_PX * k, EARTH_SOFTEN_PX * k, 0), mode='wrap')
    warp = periodic_noise(512, 24, 9)
    wx = np.asarray(Image.fromarray((warp * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), float) / 255 - 0.5
    wy = np.roll(wx, size // 3, axis=0)
    yy, xx = np.mgrid[0:size, 0:size].astype(float)
    coords = [np.clip(yy + wy * EARTH_WARP_PX * 2 * k, 0, size - 1), (xx + wx * EARTH_WARP_PX * 2 * k) % size]
    rgb = np.dstack([ndimage.map_coordinates(rgb[..., c], coords, order=1, mode='wrap') for c in range(3)])
    grey = rgb.mean(axis=2, keepdims=True)
    rgb = grey + (rgb - grey) * EARTH_FRESH
    # Bart 11-11 "it looks a bit brown green": the photo's farmland and forest are olive and khaki (hue 40-90). Those hues
    # turn toward a fresh sap green; the deserts' sand (hue under ~38) and the snow (no colour) stay as they are.
    rgb = np.clip(rgb, 0, 1)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    chroma = mx - mn
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hue = np.where(mx == r, ((g - b) / (chroma + 1e-6)) % 6, np.where(mx == g, (b - r) / (chroma + 1e-6) + 2, (r - g) / (chroma + 1e-6) + 4)) * 60
    veg = np.clip((hue - 38) / 14, 0, 1) * np.clip((140 - hue) / 30, 0, 1) * np.clip(chroma / 0.06, 0, 1)
    new_hue = hue + (EARTH_SAP_HUE - hue) * EARTH_GREEN * veg
    new_chroma = chroma * (1 + 0.35 * veg)
    return np.clip(aquarel.paint(hue_to_rgb(new_hue, new_chroma, mx) * 255, aquarel.RECIPES['map-land'], 31) / 255, 0, 1)


# The mountains, hills and tufts take the land's colour (Bart 11-11: "the base of the hills and the mountains should
# fade into the aquarel land, whatever colour it is; if it's green the hills should be green too"). Symbols cannot read
# the land under them, so each drawing is baked in GLYPH_FAMILIES earth colours (the land colours under all of them,
# clustered) with its foot fading out, and every peak and tuft names its family (`f`).
GLYPH_FAMILIES = 6
GLYPH_FOOT = 0.22            # the bottom share of a drawing that fades into the land
GLYPH_FOOT_BY_KIND = {'hill': 0.5, 'tuft': 0.35}   # a low hill is mostly foot: it melts over half its height
GLYPH_SHADE = 0.78           # a drawing is a deeper wash of its land's colour, so it keeps its body and only its foot melts in
GLYPH_SETS = {'ridge': 12, 'hill': 12, 'tuft': 16}
GLYPH_LAYOUT_FILE = Path('resources/js/map-chart-glyphs.json')


def land_paper() -> np.ndarray:
    return np.asarray(Image.open(WASH_BASE['land']).convert('RGB'), float).reshape(-1, 3).mean(0)


def land_colours(points: list[dict], earth: np.ndarray) -> np.ndarray:
    """The washed land colour (0..255) under each point, as the land wash paints it."""
    k = earth.shape[0] / N
    out = []
    for p in points:
        x, y = merc_px(p['lng'], p['lat'])
        out.append(earth[min(earth.shape[0] - 1, int(y * k)), int(x * k) % earth.shape[1]])
    return land_paper() * np.clip(np.array(out), 1e-3, 1) ** EARTH_PIGMENT


def families(colours: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Plain k-means, seeded by brightness quantiles so it is deterministic: (centres, label per colour)."""
    lum = colours @ np.array([0.3, 0.59, 0.11])
    centres = np.array([colours[np.argsort(lum)[int(q * (len(lum) - 1))]] for q in np.linspace(0.05, 0.95, GLYPH_FAMILIES)])
    for _ in range(20):
        labels = np.argmin(((colours[:, None] - centres[None]) ** 2).sum(-1), axis=1)
        centres = np.array([colours[labels == i].mean(0) if (labels == i).any() else centres[i] for i in range(GLYPH_FAMILIES)])
    return centres, labels


def tinted(glyph: Image.Image, colour: np.ndarray, kind: str) -> Image.Image:
    """The drawing in a land colour: its watercolour (never its ink) takes the colour, most at the foot, and the foot fades out."""
    a = np.asarray(glyph.convert('RGBA'), float)
    rgb, alpha = a[..., :3], a[..., 3]
    h = a.shape[0]
    down = np.linspace(0, 1, h)[:, None]
    lum = rgb @ np.array([0.3, 0.59, 0.11]) / 255
    # a tuft is all wash (its greens are darker than a ridge's paper-light flanks); a ridge keeps its ink and hatching
    # a tuft or a hill is all wash; a ridge keeps the paper-light rock of its flanks, its ink and hatching
    wash = np.clip((lum - 0.12) / 0.25, 0, 1) if kind != 'ridge' else np.clip((lum - 0.35) / 0.3, 0, 1)
    t = {'tuft': np.full_like(down, 0.75), 'hill': 0.5 + 0.4 * down}.get(kind, 0.3 + 0.55 * down) * wash
    # a deeper wash of the land's colour up top, exactly the land's colour at the foot (Bart 11-11: the small hills
    # ended on a hard, darker line), so the foot has nothing to stand out with
    shade = (GLYPH_SHADE + (1 - GLYPH_SHADE) * np.clip((down - 0.4) / 0.6, 0, 1))[..., None]
    rgb = rgb * (1 - t[..., None]) + colour * shade * t[..., None]
    foot = GLYPH_FOOT_BY_KIND.get(kind, GLYPH_FOOT)
    fade = np.clip((1 - down) / foot, 0, 1)
    fade = fade * fade * (3 - 2 * fade)          # smoothstep: no line where the fade begins either
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), alpha * fade]).astype(np.uint8), 'RGBA')


def glyph_atlases(centres: np.ndarray, out: Path) -> dict:
    """One atlas per family, same layout for all: art/glyphs-<f>.webp, layout in GLYPH_LAYOUT_FILE."""
    art = out / 'art'
    sources = [(f'{kind}-{i}', kind, Image.open(art / f'{kind}-{i}.webp')) for kind, n in GLYPH_SETS.items() for i in range(n)]
    width = 1024
    rects, x, y, row = {}, 0, 0, 0
    for name, _, im in sources:
        if x + im.width > width:
            x, y, row = 0, y + row + 2, 0
        rects[name] = [x, y, im.width, im.height]
        x, row = x + im.width + 2, max(row, im.height)
    height = y + row
    for f, colour in enumerate(centres):
        sheet = Image.new('RGBA', (width, height))
        for name, kind, im in sources:
            sheet.paste(tinted(im, colour, kind), tuple(rects[name][:2]))
        sheet.save(art / f'glyphs-{f}.webp', quality=90, alpha_quality=92, method=6)   # lossy WebP: half the size of lossless
    layout = {'families': len(centres), 'colours': [[round(c) for c in col] for col in centres], 'rects': rects}
    GLYPH_LAYOUT_FILE.write_text(json.dumps(layout, indent=1) + '\n')
    return layout


# The water in watercolour by its real depth (Bart 11-11: "make the water more beautiful", "aquarel style water"): the
# sea floor from the elevation tiles the project already reads (AWS Terrain Tiles, Terrarium), softened like the land,
# laid as a colour ramp under the painted sea wash: pale aqua on the shelves, teal on the slopes, a soft deep blue out
# on the ocean. The distance glaze still paints the pale band along every coast on top.
DEPTH_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
DEPTH_CACHE = Path('storage/app/chart-earth/depth-z4.npz')
DEPTH_SOFTEN_PX = 7      # at z4: broad washes, never the sea floor's ridges
DEPTH_RAMP = [           # metres below the sea, watercolour colour
    (0, (196, 236, 230)), (150, (166, 222, 222)), (800, (122, 196, 212)),
    (2500, (88, 160, 196)), (5000, (70, 134, 182)),
]


def sea_depth(size: int) -> np.ndarray:
    """Metres below sea level (0 on land) at `size`, fetched once at z4 and cached, softened, with wandering edges."""
    if not DEPTH_CACHE.exists():
        n = 16
        def tile(xy):
            x, y = xy
            with urllib.request.urlopen(DEPTH_URL.format(z=4, x=x, y=y), timeout=60) as r:
                a = np.asarray(Image.open(__import__('io').BytesIO(r.read())).convert('RGB'), float)
            return xy, a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
        grid = np.zeros((256 * n, 256 * n), np.float32)
        with ThreadPoolExecutor(8) as pool:
            for (x, y), h in pool.map(tile, [(x, y) for x in range(n) for y in range(n)]):
                grid[y * 256:(y + 1) * 256, x * 256:(x + 1) * 256] = h
        DEPTH_CACHE.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(DEPTH_CACHE, depth=np.clip(-grid, 0, None).astype(np.float16))   # metres below sea, 0 on land
    depth = np.load(DEPTH_CACHE)['depth'].astype(np.float32)
    depth = np.asarray(Image.fromarray(depth.astype(np.float32)).resize((size, size), Image.BILINEAR))
    k = size / 4096
    return ndimage.gaussian_filter(depth, sigma=DEPTH_SOFTEN_PX * k, mode='wrap')


def depth_colour(depth: np.ndarray) -> np.ndarray:
    """The ramp's colour (0..255) at each depth, interpolated on the square root of the depth (shallow water changes fastest)."""
    xs = np.sqrt([d for d, _ in DEPTH_RAMP])
    r = np.sqrt(depth)
    return np.dstack([np.interp(r, xs, [c[i] for _, c in DEPTH_RAMP]) for i in range(3)])


def wash_canvas(names: list, size: int, seed: int, contrast: float = 0) -> np.ndarray:
    """The painted sheets laid edge to edge in flipped, offset cells, two sheets mixed by noise."""
    rng = np.random.default_rng(seed)
    layers = []
    for name in names:
        tex = Image.open(Path('resources/map-chart') / f'{name}.webp').convert('RGB').resize((WASH_CELL_PX, WASH_CELL_PX), Image.LANCZOS)
        canvas = Image.new('RGB', (size, size))
        # Mirror tiling: every cell is its neighbour's reflection, so each edge meets itself and no
        # seam can show (random flips left hard lines where two sheets met; tester 10-26).
        for i, x in enumerate(range(0, size, WASH_CELL_PX)):
            for j, y in enumerate(range(0, size, WASH_CELL_PX)):
                t = tex.transpose(Image.FLIP_LEFT_RIGHT) if i % 2 else tex
                t = t.transpose(Image.FLIP_TOP_BOTTOM) if j % 2 else t
                canvas.paste(t, (x, y))
        layers.append(np.roll(np.asarray(canvas, float), (int(rng.integers(size)), int(rng.integers(size))), (0, 1)))
    mix = periodic_noise(512, 3, seed)
    mix = np.asarray(Image.fromarray((mix * 255).astype(np.uint8)).resize((size, size), Image.BICUBIC), float)[..., None] / 255
    out = layers[0] * (1 - mix) + layers[1] * mix
    # Re-centred on the chart's own base colour: the washes bring their VARIATION (deeper and paler
    # passages, granulation), not their overall tint, which darkened the sea and yellowed the land.
    base = np.asarray(Image.open(WASH_BASE[names[0].split('-')[1]]).convert('RGB'), float).reshape(-1, 3).mean(0)
    return np.clip((out - out.reshape(-1, 3).mean(0)) * (contrast or WASH_CONTRAST) + base, 0, 255)


def save_pyramid(rgba: Image.Image, out: Path) -> int:
    count = 0
    for z in range(GLAZE_MAX_Z + 1):
        level = rgba.resize((256 * 2 ** z,) * 2, Image.LANCZOS) if z < GLAZE_MAX_Z else rgba
        for x in range(2 ** z):
            for y in range(2 ** z):
                path = out / str(z) / str(x) / f'{y}.webp'
                path.parent.mkdir(parents=True, exist_ok=True)
                level.crop((x * 256, y * 256, x * 256 + 256, y * 256 + 256)).save(path, quality=90, alpha_quality=88, method=6)
                count += 1
    return count


def save_level(img: Image.Image, z: int, out: Path) -> int:
    for x in range(2 ** z):
        for y in range(2 ** z):
            path = out / str(z) / str(x) / f'{y}.webp'
            path.parent.mkdir(parents=True, exist_ok=True)
            img.crop((x * 256, y * 256, x * 256 + 256, y * 256 + 256)).save(path, quality=90, alpha_quality=88, method=6)
    return 4 ** z


def wash_tiles(land: np.ndarray, scale: np.ndarray, out: Path, earth: np.ndarray) -> int:
    """Three raster sets: sea wash and shore bleed (drawn UNDER the land fill, which clips them
    exactly at the coast) and the land wash (over the fill, fading out just inside the coast).

    The land wash and the bleed are baked per zoom with the map's islet rule, like the glaze: baked
    once, they painted islets the map hides, as pale un-inked "ghost islands" and, from the bleed
    round them, dark blots that read as splashes on open water (tester round 3, 10-26).
    """
    size = 256 * 2 ** GLAZE_MAX_Z
    count = 0
    # Only the broad passes of the sea wash: its granulation, magnified past z4, read as chunky digital
    # mottling (ChatGPT round 6). The fine grain on the water comes from the base paint and the paper.
    sea = ndimage.gaussian_filter(wash_canvas(WASH_SOURCES['sea'], size, 11, contrast=SEA_WASH_CONTRAST), sigma=(SEA_WASH_SOFTEN_PX, SEA_WASH_SOFTEN_PX, 0), mode='wrap')
    # the painted wash keeps its passes and granulation; its colour is the sea's depth
    sea = np.clip(aquarel.paint(depth_colour(sea_depth(size)), aquarel.RECIPES['map-sea'], 47) * sea / sea.reshape(-1, 3).mean(axis=0), 0, 255)
    count += save_pyramid(Image.fromarray(np.dstack([sea, np.full((size, size), 255.)]).astype(np.uint8), 'RGBA'), out / 'wash-sea')
    land_paint = Image.fromarray(wash_canvas(WASH_SOURCES['land'], size, 23).astype(np.uint8))
    wobble_full = Image.fromarray((periodic_noise(512, 24, 5) * 255).astype(np.uint8))
    for z in range(GLAZE_MAX_Z + 1):
        n = 256 * 2 ** z
        shown = without_islets(land, scale, TILE_ZOOM_RULE(z))
        mask = np.asarray(Image.fromarray(shown.astype(np.uint8) * 255).resize((n, n), Image.BOX)) > 127
        row_km = scale[:: N // n] * (N // n)
        pad = max(4, n // 16)
        to_land = ndimage.distance_transform_edt(~np.pad(mask, ((0, 0), (pad, pad)), mode='wrap'))[:, pad:-pad] * row_km
        to_sea = ndimage.distance_transform_edt(np.pad(mask, ((0, 0), (pad, pad)), mode='wrap'))[:, pad:-pad] * row_km
        # the earth's colour runs to the coast: a wash that thinned out there showed the cream base as a pale rim
        fade = (EARTH_COAST_KEEP + (1 - EARTH_COAST_KEEP) * np.clip(to_sea / WASH_LAND_FADE_KM, 0, 1)) * mask
        paint = np.asarray(land_paint.resize((n, n), Image.LANCZOS), float)
        # the painted wash keeps its own watercolour variation; its colour is the earth's, thinned on the paper
        grain = paint / paint.reshape(-1, 3).mean(axis=0)
        pigment = np.clip(earth[:: size // n, :: size // n] if n < size else earth, 1e-3, 1) ** EARTH_PIGMENT
        paint = np.clip(paint.reshape(-1, 3).mean(axis=0) * pigment * grain, 0, 255)
        count += save_level(Image.fromarray(np.dstack([paint, fade * 255]).astype(np.uint8), 'RGBA'), z, out / 'wash-land')
        wobble = 0.6 + 0.8 * np.asarray(wobble_full.resize((n, n), Image.BICUBIC), float) / 255
        bleed = np.exp(-to_land / (BLEED_KM * wobble)) * ~mask
        rgb = np.broadcast_to(np.array(BLEED_RGB, float), (n, n, 3))
        count += save_level(Image.fromarray(np.dstack([rgb, bleed * 255]).astype(np.uint8), 'RGBA'), z, out / 'bleed')
    return count


def sample(field_km: np.ndarray, lng: float, lat: float) -> float:
    x, y = merc_px(lng, lat)
    return float(field_km[min(N - 1, int(y)), int(x) % N])


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    (lng1, lat1), (lng2, lat2) = a, b
    p1, p2 = math.radians(lat1), math.radians(lat2)
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def spaced(points: list[dict], spacing_km: float, avoid: list[dict] = (), clear_km: float = 0) -> list[dict]:
    """Greedy keep-in-order with a 1-degree grid index, so the world's 44k peaks stay fast."""
    cell = lambda p: (math.floor(p['lng']), math.floor(p['lat']))
    grid: dict[tuple[int, int], list[tuple[float, float]]] = {}
    blocked: dict[tuple[int, int], list[tuple[float, float]]] = {}
    for q in avoid:
        blocked.setdefault(cell(q), []).append((q['lng'], q['lat']))
    near = lambda idx, p, r_km, reach: any(
        haversine_km((p['lng'], p['lat']), q) < r_km
        for dx in range(-reach, reach + 1) for dy in (-1, 0, 1)
        for q in idx.get((cell(p)[0] + dx, cell(p)[1] + dy), ()))
    kept = []
    for p in points:
        reach = 1 + int(1 / max(0.15, math.cos(math.radians(p['lat']))))
        if clear_km and near(blocked, p, clear_km, reach):
            continue
        if near(grid, p, spacing_km, reach):
            continue
        grid.setdefault(cell(p), []).append((p['lng'], p['lat']))
        kept.append(p)
    return kept


def point(p: dict, props: dict) -> dict:
    return {'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [round(p['lng'], 3), round(p['lat'], 3)]}, 'properties': props}


def ridges_and_tufts(peaks_path: Path, summits_path: Path, to_sea_km: np.ndarray) -> tuple[list[dict], list[dict]]:
    rng = np.random.default_rng(SEED)
    raw = json.loads(peaks_path.read_text())['features']
    rank = {t: i for i, t in enumerate(TIERS)}
    pts = sorted(({'lng': f['geometry']['coordinates'][0], 'lat': f['geometry']['coordinates'][1],
                   'sz': float(f['properties'].get('sz', 1)), 't': f['properties'].get('t', 'medium')} for f in raw),
                 key=lambda p: (-rank.get(p['t'], 2), -p['sz'], p['lng'], p['lat']))
    for p in pts:
        p['fit'] = round(sample(to_sea_km, p['lng'], p['lat']))
    inland = [p for p in pts if p['fit'] >= MIN_RIDGE_KM]
    summits = []
    for f in json.loads(summits_path.read_text())['features']:
        metres = f['properties'].get('elevation') or 0
        if f['properties'].get('featurecla') != 'mountain' or metres < SUMMIT_MIN_M:
            continue
        lng, lat = f['geometry']['coordinates']
        if not -56 <= lat <= 82:   # the elevation grid's own band (build-mountain-points.mjs): no Antarctica
            continue
        fit = round(sample(to_sea_km, lng, lat))
        if fit >= MIN_RIDGE_KM / 2:   # a famous summit may stand nearer the coast than a grid peak
            summits.append({'lng': lng, 'lat': lat, 'sz': 1.0, 't': summit_tier(metres), 'm': metres, 'fit': fit})
    summits.sort(key=lambda p: (-p['m'], p['lng'], p['lat']))
    ridges = spaced(summits + [p for p in inland if p['t'] in RIDGE_TIER_SIZE], RIDGE_SPACING_KM)
    tufts = spaced(inland, TUFT_SPACING_KM, avoid=ridges, clear_km=TUFT_CLEAR_KM)
    hill = lambda p: p['t'] in HILL_TIERS
    r = [point(p, {'i': 'hill' if hill(p) else 'ridge', 'g': int(rng.integers(HILL_GLYPHS if hill(p) else RIDGE_GLYPHS)),
                   'sz': round(p['sz'] * RIDGE_TIER_SIZE[p['t']], 2), 'fit': p['fit']}) for p in ridges]
    t = [point(p, {'g': int(rng.integers(TUFT_GLYPHS)), 'sz': round(p['sz'], 2), 'fit': p['fit']}) for p in tufts]
    return r, t


def waves(to_land_km: np.ndarray) -> list[dict]:
    rng = np.random.default_rng(SEED + 1)
    out = []
    for lat in np.arange(-70, 75, WAVE_STEP_DEG):
        for lng in np.arange(-180, 180, WAVE_STEP_DEG):
            jx, jy, g, r, sz = rng.random(), rng.random(), rng.integers(WAVE_GLYPHS), rng.integers(4), rng.random()
            p = {'lng': float(lng + (jx - 0.5) * WAVE_STEP_DEG * 0.9), 'lat': float(lat + (jy - 0.5) * WAVE_STEP_DEG * 0.9)}
            if sample(to_land_km, p['lng'], p['lat']) < WAVE_CLEAR_KM:
                continue
            out.append(point(p, {'g': int(g), 'r': int(r), 'sz': round(0.8 + 0.4 * float(sz), 2)}))
    return out


# Ridges and tufts only draw from z3.6; waves below z4 show only rank 0 (see map-chart.js).
TILE_ARGS = {
    'peaks': ['-Z3', '-z5'],
    'tufts': ['-Z3', '-z5'],
    'waves': ['-Z0', '-z5', '-j', json.dumps({'*': ['any', ['>=', '$zoom', 4], ['==', 'r', 0]]})],
}


def vector_tiles(src: Path, dest: Path) -> None:
    layer = dest.name
    shutil.rmtree(dest, ignore_errors=True)
    subprocess.run(['tippecanoe', '-q', '-f', '-e', str(dest), '-l', layer, '-r1', '--no-feature-limit',
                    '--no-tile-size-limit', '--no-tile-compression', *TILE_ARGS[layer], str(src)], check=True)


def build(land_path: Path, peaks_path: Path, summits_path: Path, out: Path, tiles: bool = True) -> dict[str, str]:
    lakes_path = land_path.with_name('ne_50m_lakes.geojson')
    land = land_mask(land_path, lakes_path)
    to_land, to_sea = distance_fields(land)
    scale = row_scale()
    to_land_km, to_sea_km = to_land * scale, to_sea * scale
    earth = earth_colour(256 * 2 ** GLAZE_MAX_Z)
    ridges, tufts = ridges_and_tufts(peaks_path, summits_path, to_sea_km)
    pts = [{'lng': f['geometry']['coordinates'][0], 'lat': f['geometry']['coordinates'][1]} for f in ridges + tufts]
    centres, labels = families(land_colours(pts, earth))
    for feature, label in zip(ridges + tufts, labels):
        feature['properties']['f'] = int(label)
    files = {
        'peaks.geojson': {'type': 'FeatureCollection', 'features': ridges},
        'tufts.geojson': {'type': 'FeatureCollection', 'features': tufts},
        'waves.geojson': {'type': 'FeatureCollection', 'features': waves(to_land_km)},
    }
    digests = {}
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for name, data in files.items():
            text = json.dumps(data, separators=(',', ':'))
            digests[name] = hashlib.sha256(text.encode()).hexdigest()
            print(f'{name}: {len(data["features"])} features')
            if tiles:
                src = Path(tmp) / name
                src.write_text(text)
                vector_tiles(src, out / name.removesuffix('.geojson'))
    if tiles:
        # the tiles are cached for a month (SiteGround's proxy and the browser): the map asks for them by this version,
        # so a rebuild reaches every teacher at once (resources/js/map-chart.js)
        VERSION_FILE.write_text(json.dumps({n.removesuffix('.geojson'): d[:10] for n, d in digests.items()}, indent=2) + '\n')
        print('glaze tiles:', glaze_tiles(land, scale, out / 'glaze'))
        print('wash tiles:', wash_tiles(land, scale, out, earth))
        print('glyph families:', glyph_atlases(centres, out)['colours'])
        # the land wash and the drawings change with every look tweak: versioned like the vector tiles
        versions = json.loads(VERSION_FILE.read_text())
        for name in ('wash-land', 'wash-sea'):
            versions[name] = hashlib.sha256((out / f'{name}/0/0/0.webp').read_bytes()).hexdigest()[:10]
        versions['glyphs'] = hashlib.sha256(b''.join((out / f'art/glyphs-{f}.webp').read_bytes() for f in range(GLYPH_FAMILIES))).hexdigest()[:10]
        VERSION_FILE.write_text(json.dumps(versions, indent=2) + '\n')
        for name, data in zip(('land', 'lakes', 'coast'), chart_shapes(land_path, lakes_path)):
            text = json.dumps(data, separators=(',', ':'))
            (out / f'{name}.geojson').write_text(text)
            print(f'{name}.geojson: {len(data["features"])} features, {len(text) / 1e6:.1f} MB')
    return digests


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--land', type=Path, required=True)
    ap.add_argument('--peaks', type=Path, default=Path('public/timemap/mountains-points.geojson'))
    ap.add_argument('--summits', type=Path, help='Natural Earth elevation points (default: next to --land)')
    ap.add_argument('--out', type=Path, default=Path('public/map-chart'))
    ap.add_argument('--check', action='store_true', help='build twice and fail unless identical')
    a = ap.parse_args()
    summits = a.summits or a.land.with_name('ne_10m_geography_regions_elevation_points.geojson')
    first = build(a.land, a.peaks, summits, a.out)
    if a.check:
        assert build(a.land, a.peaks, summits, a.out, tiles=False) == first, 'chart data is not deterministic'
        print('deterministic: ok')
