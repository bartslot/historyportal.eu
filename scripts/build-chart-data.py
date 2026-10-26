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
  tufts   olive foothills around the ranges, never on a ridge.
  waves   ink wave marks on open water, jittered, ranked 0-3 for zoom.

Deterministic: the same inputs give byte-identical outputs (seeded RNG, sorted inputs). `--check`
builds twice in memory and fails if anything differs.

  python3 scripts/build-chart-data.py --land storage/app/naturalearth/ne_50m_land.geojson
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

N = 8192                       # raster width/height in px (Web Mercator, whole world)
PAD = 512                      # horizontal wrap padding so distances cross the antimeridian
MAX_LAT = 85.05112878
EARTH_KM = 40075.016686

GLAZE_BANDS_KM = [50, 90, 135, 185, 240, 300, 370]
GLAZE_FIRST, GLAZE_REST = 0.24, 0.07   # first band = visible edge of the shallows
GLAZE_TEXTURE = Path('resources/map-chart/sea-glaze.webp')  # the approved lab's glaze paint (ChatGPT, 10-21)
GLAZE_MAX_Z = 4

MIN_RIDGE_KM, RIDGE_SPACING_KM = 55, 105
# The lab's 40 km suited the empty Tasman box; across the Mediterranean it carpeted every range.
TUFT_SPACING_KM, TUFT_CLEAR_KM = 120, 40
# Islets smaller than this push no shallows out around them: their glaze halo floated on open sea
# where the land tiles draw nothing at that zoom (Samoa, Lakshadweep).

RIDGE_GLYPHS, TUFT_GLYPHS, WAVE_GLYPHS = 12, 16, 4
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
    return Image.fromarray(((1 - clear) * 255).astype(np.uint8), 'L').resize((size, size), Image.BOX)


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
        # a tile of zoom z is on screen from z to z+1; use the strictest rule in that range (at z), so
        # no shallows are painted round an island the map is not drawing yet
        size = 256 * 2 ** z
        a = glaze_alpha(shelf_scaled_km(without_islets(land, scale, islet_km2(z)), scale), size)
        level = Image.merge('RGBA', [*paint.resize((size, size), Image.BOX).split(), a])
        for x in range(2 ** z):
            for y in range(2 ** z):
                path = out / str(z) / str(x) / f'{y}.webp'
                path.parent.mkdir(parents=True, exist_ok=True)
                level.crop((x * 256, y * 256, x * 256 + 256, y * 256 + 256)).save(path, quality=80, alpha_quality=85, method=6)
                count += 1
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


def ridges_and_tufts(peaks_path: Path, to_sea_km: np.ndarray) -> tuple[list[dict], list[dict]]:
    rng = np.random.default_rng(SEED)
    raw = json.loads(peaks_path.read_text())['features']
    pts = sorted(({'lng': f['geometry']['coordinates'][0], 'lat': f['geometry']['coordinates'][1],
                   'sz': float(f['properties'].get('sz', 1))} for f in raw), key=lambda p: (-p['sz'], p['lng'], p['lat']))
    for p in pts:
        p['fit'] = round(sample(to_sea_km, p['lng'], p['lat']))
    inland = [p for p in pts if p['fit'] >= MIN_RIDGE_KM]
    ridges = spaced(inland, RIDGE_SPACING_KM)
    tufts = spaced(inland, TUFT_SPACING_KM, avoid=ridges, clear_km=TUFT_CLEAR_KM)
    r = [point(p, {'g': int(rng.integers(RIDGE_GLYPHS)), 'sz': round(p['sz'], 2), 'fit': p['fit']}) for p in ridges]
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


def build(land_path: Path, peaks_path: Path, out: Path, tiles: bool = True) -> dict[str, str]:
    lakes_path = land_path.with_name('ne_50m_lakes.geojson')
    land = land_mask(land_path, lakes_path)
    to_land, to_sea = distance_fields(land)
    scale = row_scale()
    to_land_km, to_sea_km = to_land * scale, to_sea * scale
    ridges, tufts = ridges_and_tufts(peaks_path, to_sea_km)
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
        print('glaze tiles:', glaze_tiles(land, scale, out / 'glaze'))
        for name, data in zip(('land', 'lakes', 'coast'), chart_shapes(land_path, lakes_path)):
            text = json.dumps(data, separators=(',', ':'))
            (out / f'{name}.geojson').write_text(text)
            print(f'{name}.geojson: {len(data["features"])} features, {len(text) / 1e6:.1f} MB')
    return digests


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--land', type=Path, required=True)
    ap.add_argument('--peaks', type=Path, default=Path('public/timemap/mountains-points.geojson'))
    ap.add_argument('--out', type=Path, default=Path('public/map-chart'))
    ap.add_argument('--check', action='store_true', help='build twice and fail unless identical')
    a = ap.parse_args()
    first = build(a.land, a.peaks, a.out)
    if a.check:
        assert build(a.land, a.peaks, a.out, tiles=False) == first, 'chart data is not deterministic'
        print('deterministic: ok')
