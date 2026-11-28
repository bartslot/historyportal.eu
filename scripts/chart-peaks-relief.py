#!/usr/bin/env python3
"""
chart-peaks-relief.py: keep the chart's mountains on real mountain ranges.

Bart, 2026-11-23, on the Silk Road map: "and more around the real mountain ranges". The peaks
build-chart-data.py places come from an elevation grid, so they follow HEIGHT, and height is not
a range: the Tarim basin (the Taklamakan Desert) and the Tibetan plateau are high and flat, and
they were covered in peaks like the Pamir and the Kunlun around them.

What makes a mountain range is RELIEF: how far the ground rises and falls nearby. This keeps a
ridge only where the land within RELIEF_KM rises at least RIDGE_RELIEF_M above its lowest point,
and a foothill tuft only where it rises TUFT_RELIEF_M. Relief comes from the same open elevation
tiles the chart's sea depth uses (Mapzen terrarium, AWS open data), read at z5 (~5 km a pixel).

It rewrites the vector tiles in place (public/map-chart/{peaks,tufts}/{z}/{x}/{y}.pbf, z3-5,
every point at every zoom like tippecanoe -r1) and bumps their hashes in map-chart-version.json.
Run it after build-chart-data.py. It is deterministic and idempotent: points it drops stay
dropped, and a second run keeps the same set.

  pip install mapbox-vector-tile numpy pillow
  python3 scripts/chart-peaks-relief.py
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import urllib.request
from pathlib import Path

import mapbox_vector_tile as mvt
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHART = ROOT / 'public/map-chart'
VERSION_FILE = ROOT / 'resources/js/map-chart-version.json'
CACHE = ROOT / 'storage/app/chart-earth/terrarium-z5'
DEM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
DEM_Z = 5
EXTENT = 4096
BUFFER = 80              # tile units, tippecanoe's default 5 px of 256
ZOOMS = (3, 4, 5)
RELIEF_KM = 45           # the radius a range is read over
RIDGE_RELIEF_M = 1400    # a ridge needs this much rise nearby: the Pamir, the Kunlun, the Alps keep theirs, the Tibetan plateau does not
TUFT_RELIEF_M = 450      # foothills need a little


def lnglat_to_world(lng: float, lat: float) -> tuple[float, float]:
    """0..1 Web Mercator."""
    x = (lng + 180) / 360
    s = math.sin(math.radians(max(-85.05, min(85.05, lat))))
    y = 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
    return x, y


def world_to_lnglat(x: float, y: float) -> tuple[float, float]:
    lng = x * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y))))
    return lng, lat


def read_points(layer: str) -> list[dict]:
    """Every point of the layer, from its z5 tiles (z5 holds them all), each once."""
    seen, out = set(), []
    for f in sorted((CHART / layer / '5').rglob('*.pbf')):
        x, y = int(f.parent.name), int(f.stem)
        data = mvt.decode(f.read_bytes(), default_options={'y_coord_down': True})
        for feat in data.get(layer, {}).get('features', []):
            px, py = feat['geometry']['coordinates']
            if not (0 <= px < EXTENT and 0 <= py < EXTENT):
                continue   # a neighbour's buffer copy
            wx, wy = (x + px / EXTENT) / 32, (y + py / EXTENT) / 32
            lng, lat = world_to_lnglat(wx, wy)
            key = (round(lng, 3), round(lat, 3))
            if key in seen:
                continue
            seen.add(key)
            out.append({'lng': lng, 'lat': lat, 'props': feat['properties']})
    out.sort(key=lambda p: (p['lng'], p['lat']))
    return out


_dem: dict[tuple[int, int], np.ndarray] = {}


def dem_tile(x: int, y: int) -> np.ndarray:
    n = 2 ** DEM_Z
    x %= n
    if not 0 <= y < n:
        return np.zeros((256, 256), dtype=np.float32)
    if (x, y) not in _dem:
        path = CACHE / f'{x}-{y}.png'
        if not path.exists():
            CACHE.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(DEM_URL.format(z=DEM_Z, x=x, y=y), timeout=60) as r:
                path.write_bytes(r.read())
        rgb = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32)
        _dem[(x, y)] = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768
    return _dem[(x, y)]


def relief_m(lng: float, lat: float) -> float:
    """Highest minus lowest ground within RELIEF_KM, sea counted as 0 m."""
    n = 2 ** DEM_Z * 256
    wx, wy = lnglat_to_world(lng, lat)
    cx, cy = wx * n, wy * n
    km_px = 40075.016686 * math.cos(math.radians(lat)) / n
    r = max(2, int(round(RELIEF_KM / km_px)))
    lo, hi = math.inf, -math.inf
    for ty in range(int((cy - r) // 256), int((cy + r) // 256) + 1):
        for tx in range(int((cx - r) // 256), int((cx + r) // 256) + 1):
            t = dem_tile(tx, ty)
            x0, y0 = tx * 256, ty * 256
            ys = np.arange(max(y0, int(cy - r)), min(y0 + 256, int(cy + r) + 1))
            xs = np.arange(max(x0, int(cx - r)), min(x0 + 256, int(cx + r) + 1))
            if not len(xs) or not len(ys):
                continue
            yy, xx = np.meshgrid(ys, xs, indexing='ij')
            inside = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
            if not inside.any():
                continue
            v = np.maximum(t[yy - y0, xx - x0][inside], 0)
            lo, hi = min(lo, float(v.min())), max(hi, float(v.max()))
    return hi - lo if hi >= lo else 0.0


def write_tiles(layer: str, points: list[dict]) -> None:
    for z in ZOOMS:
        n = 2 ** z
        tiles: dict[tuple[int, int], list] = {}
        for p in points:
            wx, wy = lnglat_to_world(p['lng'], p['lat'])
            fx, fy = wx * n, wy * n
            tx, ty = int(fx), int(fy)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    x, y = tx + dx, ty + dy
                    if not 0 <= y < n:
                        continue
                    px, py = round((fx - x) * EXTENT), round((fy - y) * EXTENT)
                    if -BUFFER <= px < EXTENT + BUFFER and -BUFFER <= py < EXTENT + BUFFER:
                        tiles.setdefault((x % n, y), []).append({'geometry': f'POINT({px} {py})', 'properties': p['props']})
        old = CHART / layer / str(z)
        for f in old.rglob('*.pbf'):
            f.unlink()
        for (x, y), feats in sorted(tiles.items()):
            path = old / str(x) / f'{y}.pbf'
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(mvt.encode({'name': layer, 'features': feats}, default_options={'extents': EXTENT, 'y_coord_down': True, 'quantize_bounds': None}))
        for d in old.iterdir():
            if d.is_dir() and not any(d.iterdir()):
                d.rmdir()


def tiles_hash(layer: str) -> str:
    h = hashlib.sha256()
    for f in sorted((CHART / layer).rglob('*.pbf')):
        h.update(str(f.relative_to(CHART)).encode())
        h.update(f.read_bytes())
    return h.hexdigest()[:10]


def main() -> None:
    versions = json.loads(VERSION_FILE.read_text())
    for layer, need in (('peaks', RIDGE_RELIEF_M), ('tufts', TUFT_RELIEF_M)):
        pts = read_points(layer)
        kept = [p for p in pts if relief_m(p['lng'], p['lat']) >= need]
        print(f'{layer}: kept {len(kept)} of {len(pts)} (relief >= {need} m within {RELIEF_KM} km)')
        write_tiles(layer, kept)
        versions[layer] = tiles_hash(layer)
    VERSION_FILE.write_text(json.dumps(versions, indent=2) + '\n')


if __name__ == '__main__':
    main()
