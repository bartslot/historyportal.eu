#!/usr/bin/env python3
"""Bake the data behind the watercolour sea chart (resources/js/map-chart.js).

One land raster in Web Mercator, one distance field from it, and everything the chart places is read
off that field:

  public/map-chart/glaze/{z}/{x}/{y}.png  the sea's depth glaze. The reference chart is pale against
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
GLAZE_RGB = (79, 168, 182)             # the painted sea's own teal (mean of sea-glaze)
GLAZE_MAX_Z = 4

MIN_RIDGE_KM, RIDGE_SPACING_KM = 55, 50
TUFT_SPACING_KM, TUFT_CLEAR_KM = 70, 30
# Islets smaller than this push no shallows out around them: their glaze halo floated on open sea
# where the land tiles draw nothing at that zoom (Samoa, Lakshadweep).
MIN_GLAZE_ISLAND_PX = 150
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


def land_mask(land_path: Path) -> np.ndarray:
    img = Image.new('L', (N, N), 0)
    draw = ImageDraw.Draw(img)
    for feat in json.loads(land_path.read_text())['features']:
        geom = feat['geometry']
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        for poly in polys:
            for i, ring in enumerate(poly):
                draw.polygon([merc_px(x, y) for x, y in ring], fill=0 if i else 255)
    return np.asarray(img) > 127


def ring_area(ring: list) -> float:
    return sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1])) / 2


def on_cut(a: list, b: list) -> bool:
    """An edge Natural Earth added to close a polygon at the antimeridian or the south pole."""
    return (abs(a[0]) >= 179.999 and abs(b[0]) >= 179.999) or (a[1] <= -89.9 and b[1] <= -89.9)


def coast_lines(land_path: Path) -> dict:
    """Every exterior ring counter-clockwise (land on the left of the direction of travel)."""
    lines = []
    for feat in json.loads(land_path.read_text())['features']:
        geom = feat['geometry']
        for poly in geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]:
            ring = poly[0][:-1] if poly[0][0] == poly[0][-1] else poly[0]
            if ring_area(ring) < 0:
                ring = ring[::-1]
            ring = ring + ring[:1]
            run = [ring[0]]
            for a, b in zip(ring, ring[1:]):
                if on_cut(a, b):
                    if len(run) > 1:
                        lines.append(run)
                    run = [b]
                else:
                    run.append(b)
            if len(run) > 1:
                lines.append(run)
    return {'type': 'FeatureCollection', 'features': [
        {'type': 'Feature', 'properties': {}, 'geometry': {'type': 'LineString', 'coordinates': [[round(x, 4), round(y, 4)] for x, y in ln]}}
        for ln in lines]}


def without_islets(land: np.ndarray) -> np.ndarray:
    labels, n = ndimage.label(land)
    sizes = ndimage.sum(land, labels, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= MIN_GLAZE_ISLAND_PX
    return keep[labels]


def distance_fields(land: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Mercator-px distance to the nearest land (sea side) and to the nearest sea (land side)."""
    wrapped = np.pad(land, ((0, 0), (PAD, PAD)), mode='wrap')
    to_land = ndimage.distance_transform_edt(~wrapped)[:, PAD:-PAD]
    to_sea = ndimage.distance_transform_edt(wrapped)[:, PAD:-PAD]
    return to_land, to_sea


def row_scale() -> np.ndarray:
    return np.array([km_per_px(y + 0.5) for y in range(N)])[:, None]


def glaze_tiles(to_land_km: np.ndarray, out: Path) -> int:
    bands = sum((to_land_km > d).astype(np.uint8) for d in GLAZE_BANDS_KM)
    clear = np.where(bands > 0, (1 - GLAZE_FIRST) * (1 - GLAZE_REST) ** np.maximum(bands - 1, 0), 1.0)
    alpha = (1 - clear) * 255
    full = 256 * 2 ** GLAZE_MAX_Z
    a = Image.fromarray(alpha.astype(np.uint8), 'L').resize((full, full), Image.BOX)
    rgba = Image.merge('RGBA', [Image.new('L', a.size, c) for c in GLAZE_RGB] + [a])
    count = 0
    for z in range(GLAZE_MAX_Z + 1):
        level = rgba if z == GLAZE_MAX_Z else rgba.resize((256 * 2 ** z,) * 2, Image.BOX)
        for x in range(2 ** z):
            for y in range(2 ** z):
                path = out / str(z) / str(x) / f'{y}.png'
                path.parent.mkdir(parents=True, exist_ok=True)
                level.crop((x * 256, y * 256, x * 256 + 256, y * 256 + 256)).save(path, optimize=True)
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
    land = land_mask(land_path)
    to_land, to_sea = distance_fields(land)
    scale = row_scale()
    to_land_km, to_sea_km = to_land * scale, to_sea * scale
    ridges, tufts = ridges_and_tufts(peaks_path, to_sea_km)
    glaze_km = ndimage.distance_transform_edt(~np.pad(without_islets(land), ((0, 0), (PAD, PAD)), mode='wrap'))[:, PAD:-PAD] * scale
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
        print('glaze tiles:', glaze_tiles(glaze_km, out / 'glaze'))
        coast = json.dumps(coast_lines(land_path), separators=(',', ':'))
        (out / 'coast.geojson').write_text(coast)
        print(f'coast.geojson: {len(coast) / 1e6:.1f} MB')
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
