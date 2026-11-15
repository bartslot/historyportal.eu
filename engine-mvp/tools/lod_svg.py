#!/usr/bin/env python3
"""Far, low-detail copies of a bundle's vegetation (Bart 11-15: "Make lod's for the grass and bushes, shrubs, blocking
layers that are further away: less detail (maybe use SVG's for this with our aquarel easthetic and outline, make sure
to fade the bottom to transparent)").

Each copy is traced FROM the painted picture, so it keeps that picture's shape and colours: a few flat watercolour
washes laid light to dark (each wash covers everything darker, so no gaps), a little lighter toward the paper (it stands
far off), one ink line round the silhouette, and the bottom fading to transparent (per cell on a sprite sheet). Each
is written to the repo as resources/library-lod/<bundle>/<stem>.lod.svg (the picture's layout, at most MAX_W wide):
the bundles themselves live outside the repo. `php artisan library:lod` (also run by every library:sync) puts them
beside the pictures and names each on its asset ("lod"); the stage draws it far from the camera (stage25d/lod.ts).

    python3 engine-mvp/tools/lod_svg.py storage/app/public/library/<bundle> [--force] [--only id,id]
    php artisan library:lod <bundle>

Needs potrace (brew install potrace), Pillow and numpy.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# what counts as vegetation, and which pictures of it stand far (rows, screens, sheets, single plants)
PLANT_TAGS = {'grass', 'bush', 'shrub', 'shrub-low', 'scrub', 'tree', 'palms', 'palm', 'date-palm', 'grove', 'hedge',
              'forest', 'reeds', 'heather', 'fern', 'bramble', 'juniper', 'hazel', 'sedge', 'flower', 'meadow',
              'undergrowth', 'saltbush', 'thorn', 'complete-tree', 'oak-lime', 'hawthorn'}
SKIP_LAYERS = {'figure', 'sky', 'bg', 'ground', 'cloud'}
# strips of ground, water, a terrain's far edge, built things: not vegetation, they keep their painting
SKIP_TAGS = {'ground', 'path', 'water', 'fence', 'pen', 'building'}
WASHES = 4                 # flat colour washes per picture
INK_SHARE = 0.12           # the darkest px (hatching, ink): part of the darkest wash, the outline is the ink
HAZE = 0.25                # how far each wash goes toward the paper: it stands far off, lighter than the painting
SATURATE = 1.3             # a flat wash of mean colours goes grey: give it back its colour
PAPER = (243, 236, 222)
INK = '#2a2219'
FADE_FROM = 0.65           # share of the height (from the top) where the bottom fade starts
MAX_W = 1024               # the copy's px width at most: it is only drawn far off, small
MIN_H = 256                # ...but never fewer px tall than this (a 259 px palm row at 65 px went to blobs)


def eligible(a: dict) -> bool:
    if a.get('layer') in SKIP_LAYERS or a.get('kind') == 'animation' or a.get('puppet') or SKIP_TAGS & set(a.get('tags') or []):
        return False
    return bool(PLANT_TAGS & set(a.get('tags') or [])) or (a.get('kind') == 'sheet' and any(
        PLANT_TAGS & set(c.get('tags') or []) for c in a.get('cells') or []))


def trace(mask: np.ndarray, turd: int) -> str:
    """potrace's paths for a boolean mask, as one <g> in the mask's px (potrace draws y up, scaled by 0.1)."""
    with tempfile.TemporaryDirectory() as d:
        pbm, svg = Path(d) / 'm.pbm', Path(d) / 'm.svg'
        Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert('1').save(pbm)
        subprocess.run(['potrace', str(pbm), '-s', '-o', str(svg), '--turdsize', str(turd), '--alphamax', '1.2',
                        '--opttolerance', '0.5', '--flat'], check=True)
        text = svg.read_text()
    g = re.search(r'<g transform="([^"]+)"[^>]*>(.*?)</g>', text, re.S)
    if not g:
        return ''
    paths = ''.join(re.findall(r'd="([^"]+)"', g.group(2)))
    return f'<path transform="{g.group(1)}" d="{paths}"/>' if paths else ''


def saturate(c: np.ndarray) -> np.ndarray:
    grey = c @ np.array([0.299, 0.587, 0.114])
    return np.clip(grey + (c - grey) * SATURATE, 0, 255)


def lod_svg(src: Path, cells: list[list[float]] | None) -> str:
    img = Image.open(src).convert('RGBA')
    k = min(1.0, max(MAX_W / img.width, MIN_H / img.height))
    if k < 1:
        img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    w, h = img.size
    soft = max(1, round(h / 300))
    alpha = np.asarray(img.getchannel('A').filter(ImageFilter.GaussianBlur(soft)))
    shape = alpha > 110
    if not shape.any():
        raise ValueError('empty picture')
    turd = max(6, (w * h) // 40000)
    # the washes: the picture's own colours in WASHES steps, lightest first, each covering everything darker
    rgb = np.asarray(img.convert('RGB').filter(ImageFilter.MedianFilter(5)))
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    edges = np.quantile(lum[shape], np.linspace(INK_SHARE, 1, WASHES + 1))
    edges[0] = 0
    washes = []
    for i in range(WASHES):
        band = shape & (lum >= edges[WASHES - 1 - i]) & (lum <= edges[WASHES - i] + 1e-6)
        if not band.any():
            continue
        colour = saturate(np.median(rgb[band], axis=0)) * (1 - HAZE) + np.array(PAPER) * HAZE
        covered = np.asarray(Image.fromarray(((shape & (lum <= edges[WASHES - i] + 1e-6)) * 255).astype(np.uint8))
                             .filter(ImageFilter.MedianFilter(5))) > 127
        path = trace(covered, turd)
        if path:
            washes.append(path.replace('<path ', f'<path fill="#{int(colour[0]):02x}{int(colour[1]):02x}{int(colour[2]):02x}" '))
    outline = trace(shape, turd).replace('<path ', f'<path fill="none" stroke="{INK}" stroke-width="{12 * max(1.0, h / 400)}" stroke-linejoin="round" stroke-opacity="0.55" ')
    boxes = cells or [[0, 0, 1, 1]]
    fade = ''.join(f'<rect x="{u * w:.1f}" y="{v * h:.1f}" width="{du * w:.1f}" height="{dv * h:.1f}" fill="url(#f)"/>' for u, v, du, dv in boxes)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="{FADE_FROM}" stop-color="#fff"/>'
            f'<stop offset="1" stop-color="#000"/></linearGradient>'
            f'<filter id="wet" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/>'
            f'<feDisplacementMap in="SourceGraphic" scale="{max(1.5, h / 250):.1f}"/></filter>'
            f'<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="{w}" height="{h}">{fade}</mask></defs>'
            f'<g mask="url(#m)"><g filter="url(#wet)" fill-opacity="0.92">{"".join(washes)}</g>{outline}</g></svg>')


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('bundle', type=Path)
    ap.add_argument('--force', action='store_true', help='trace again where a copy exists')
    ap.add_argument('--only', default='', help='comma-separated asset ids')
    ap.add_argument('--out', type=Path, default=None, help='where the copies go (default resources/library-lod/<bundle>)')
    o = ap.parse_args()
    lib = json.loads((o.bundle / 'library.json').read_text())
    out_dir = o.out or Path(__file__).resolve().parents[2] / 'resources' / 'library-lod' / o.bundle.resolve().name
    only = {x for x in o.only.split(',') if x}
    edges = {a['horizon'] for a in lib['assets'] if a.get('horizon')}   # a terrain's own far edge keeps its painting
    made = 0
    for a in lib['assets']:
        if (only and a['id'] not in only) or a['id'] in edges or not eligible(a):
            continue
        out = out_dir / (Path(a['file']).stem + '.lod.svg')
        if out.exists() and not o.force:
            continue
        try:
            svg = lod_svg(o.bundle / a['file'], [c['rect'] for c in a['cells']] if a.get('kind') == 'sheet' else None)
        except (OSError, ValueError, subprocess.CalledProcessError) as e:
            print(f'skip {a["id"]}: {e}', file=sys.stderr)
            continue
        out_dir.mkdir(parents=True, exist_ok=True)
        out.write_text(svg)
        made += 1
        print(f'{a["id"]} -> {out.name} ({len(svg) // 1024} KB)')
    print(f'{made} low copies in {out_dir}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
