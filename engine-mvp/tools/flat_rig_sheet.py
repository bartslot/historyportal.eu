#!/usr/bin/env python3
"""A rig sheet folder for a flat-sheet figure (vault topics/character-bones/plan.md, 10), for rig_parts.py as it is.

In:  RIG_DIR   the checked painted rig sheet (rest, under-a/b/c, map, map-b, map-pieces.json; rig_check.py passed it)
     FLAT_DIR  the figure's clean flat-colour sheets on the same canvas: flat.png, head-flat.png (the head at close-up
               size) and under-a/b/c-flat.png, each an edit_image of the painted under sheet with flat.png as its style
Out: OUT_DIR   rest.png and under-a/b/c.png painted by kit_render.py (shading wash, aquarel, pen) on #00FF00, and the
               maps copied, so rig_parts.py cuts the flat figure with the joints, bands and limits it found before.

An under sheet only counts where it shows something the flat sheet hides (the tunic under the shawl, the thighs under
the skirt, no arm): another flat colour, or the figure's edge moved. Everywhere else an under sheet IS the flat sheet,
so its paint, grain and lines match the rest drawing's. (Naming the PAINTED under sheets' pixels instead failed: in the
painting skin and tunic are the same beige, about 15 Lab apart, and folds read as rope.)

usage: flat_rig_sheet.py RIG_DIR FLAT_DIR OUT_DIR
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
UNDERS = ('under-a', 'under-b', 'under-c')
SCALE = 2                 # painted at twice the sheet's size, then brought down: smooth pen edges at sheet size
OTHER_DE = 25             # Lab distance between two flat colours that are different materials (cream tunic to skin ~30)
INK_LUM = 60              # a sheet's contour line and its soft rim: not a colour to compare
SHOWN_PX = 300            # a smaller patch is the two drawings differing by a line's width, not something hidden
SHOWN_GROW = 4            # px round what an under sheet shows that is taken from it too, so its lines join cleanly
GREEN = np.array((0, 255, 0), np.float32)
LUMA = np.array([0.3, 0.59, 0.11])


def rgb_of(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert('RGB')).astype(np.float32)


def is_green(rgb: np.ndarray) -> np.ndarray:
    return (rgb[..., 1] > 170) & (rgb[..., 0] < 120) & (rgb[..., 2] < 120)


def lab_of(rgb: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(rgb.clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)


def paint_only(rgb: np.ndarray) -> np.ndarray:
    """A sheet with every ink pixel (and its soft rim) given the paint next to it: a fringe of red tassels drawn in lines
    reads as red, a belt drawn in lines as rope, while a contour both sheets share cancels out."""
    ink = ndimage.binary_dilation(rgb @ LUMA < INK_LUM, iterations=2)
    jj = ndimage.distance_transform_edt(ink, return_distances=False, return_indices=True)
    return rgb[jj[0], jj[1]]


def shown(under: np.ndarray, flat: np.ndarray) -> np.ndarray:
    """Where a flat under sheet shows another flat colour than the flat sheet, or the figure's edge moved."""
    fig_u, fig_f = ~is_green(under), ~is_green(flat)
    other = np.linalg.norm(lab_of(paint_only(under)) - lab_of(paint_only(flat)), axis=-1) > OTHER_DE
    diff = ndimage.binary_opening((other & fig_u & fig_f) | (fig_u != fig_f), iterations=2)
    found, n = ndimage.label(diff)
    if n:
        sizes = ndimage.sum(diff, found, range(1, n + 1))
        diff = np.isin(found, 1 + np.flatnonzero(sizes >= SHOWN_PX))
    return ndimage.binary_dilation(diff, iterations=SHOWN_GROW)


def under_sheet(under_path: Path, flat_path: Path) -> tuple[np.ndarray, np.ndarray]:
    """The flat sheet, with the under sheet's own drawing where it shows what the flat sheet hides."""
    under, flat = rgb_of(under_path), rgb_of(flat_path)
    region = shown(under, flat)
    return np.where(region[..., None], under, flat).clip(0, 255).astype(np.uint8), region


def regions_map(map_rgb: np.ndarray, region: np.ndarray) -> np.ndarray:
    """The part map for an under sheet: what it shows instead takes the nearest part beside it, so no part's edge (a
    shawl that is not there) draws a shade line through plain tunic."""
    jj = ndimage.distance_transform_edt(region, return_distances=False, return_indices=True)
    return map_rgb[jj[0], jj[1]].astype(np.uint8)


def on_green(rgba: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    """A painted RGBA picture brought to size (premultiplied, so green never bleeds into an edge), over #00FF00."""
    a = rgba[..., 3:] / 255
    pre = np.concatenate([rgba[..., :3] * a, a], -1)
    chans = [np.asarray(Image.fromarray(pre[..., c].astype(np.float32), mode='F').resize(size, Image.LANCZOS)) for c in range(4)]
    alpha = np.clip(chans[3], 0, 1)[..., None]
    rgb = np.stack(chans[:3], -1) / np.maximum(alpha, 1e-6)
    return (rgb * alpha + GREEN * (1 - alpha)).clip(0, 255).astype(np.uint8)


def paint(sheet: Path, part_map: Path, head: Path, size: tuple[int, int]) -> np.ndarray:
    """A flat sheet painted by kit_render.py at SCALE, on its own canvas, brought to sheet size on #00FF00."""
    with tempfile.TemporaryDirectory() as out:
        env = dict(os.environ, FLAT=str(sheet), HEAD_SHEET=str(head), RENDERS='canvas', CANVAS_SCALE=str(SCALE), NAME='sheet')
        for key in ('KIT', 'HAIR_MASK', 'DROP_BRAID', 'PAL', 'HEAD_BOX', 'MOUTH_MASK'):
            env.pop(key, None)
        run = subprocess.run([sys.executable, str(HERE / 'kit_render.py'), str(sheet.parent), str(part_map), out],
                             env=env, capture_output=True, text=True)
        if run.returncode:
            raise SystemExit(f'kit_render.py failed on {sheet}:\n{run.stderr[-2000:]}')
        rgba = np.asarray(Image.open(Path(out) / 'sheet-canvas.png').convert('RGBA')).astype(np.float32)
    return on_green(rgba, size)


def build(rig_dir: Path, flat_dir: Path, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp = out_dir / '_flat'
    tmp.mkdir(exist_ok=True)
    for name in ('map.png', 'map-b.png', 'map-pieces.json'):
        if (rig_dir / name).exists():
            shutil.copy(rig_dir / name, out_dir / name)
    head = flat_dir / 'head-flat.png'
    rest = Image.open(rig_dir / 'rest.png')
    Image.fromarray(paint(flat_dir / 'flat.png', rig_dir / 'map.png', head, rest.size)).save(out_dir / 'rest.png')
    map_rgb = np.asarray(Image.open(rig_dir / 'map.png').convert('RGB'))
    report = {}
    for name in UNDERS:
        sheet, region = under_sheet(flat_dir / f'{name}-flat.png', flat_dir / 'flat.png')
        Image.fromarray(sheet).save(tmp / f'{name}-flat.png')
        Image.fromarray(regions_map(map_rgb, region)).save(tmp / f'{name}-map.png')
        Image.fromarray(paint(tmp / f'{name}-flat.png', tmp / f'{name}-map.png', head, rest.size)).save(out_dir / f'{name}.png')
        report[name] = int(region.sum())
        print(f'{name}: {region.sum()} px from its own flat sheet')
    (out_dir / 'flat-sheet.json').write_text(json.dumps({'flat': str(flat_dir), 'rig': str(rig_dir), 'shown_px': report}, indent=1))
    return report


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('rig_dir', type=Path)
    ap.add_argument('flat_dir', type=Path)
    ap.add_argument('out_dir', type=Path)
    args = ap.parse_args()
    build(args.rig_dir, args.flat_dir, args.out_dir)


if __name__ == '__main__':
    main()
