"""Billboards for a terrain: pack library pictures into one strew sheet (kind 'sheet', like ground-sprites-01).

The stage scatters a sheet's cells over every terrain slot whose tags share one with the cell (engine-mvp
stage25d/strew.ts, cells up to 1.5 m), so a floor stops looking flat (Bart 11-11: "every terrain should consist of a
couple of layers distributed in 3D space, like the grass on the meadow").

    python3 billboards.py <bundle> <sheet-id> <spec.json>

spec: [{"from": "<asset id>", "tags": [...], "height_m": 0.9, "split": 4}, ...]. `split` cuts a wide strip into that
many clumps at its thinnest columns; height_m is the whole picture's height (a piece keeps its share of it).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

LIBRARY = Path.home() / 'BartsMedia/historyportal/library'
SHEET_W = 2048
GAP = 8


def trim(rgba: np.ndarray) -> np.ndarray:
    solid = rgba[..., 3] > 8
    rows, cols = np.where(solid.any(axis=1))[0], np.where(solid.any(axis=0))[0]
    return rgba[rows.min():rows.max() + 1, cols.min():cols.max() + 1]


def split(rgba: np.ndarray, n: int) -> list[np.ndarray]:
    """n pieces, each cut at the emptiest column near an even share of the width."""
    if n <= 1:
        return [trim(rgba)]
    fill = (rgba[..., 3] > 8).sum(axis=0).astype(float)
    w, cuts = rgba.shape[1], [0]
    for k in range(1, n):
        mid, reach = w * k // n, w // (2 * n)
        window = fill[mid - reach:mid + reach]
        cuts.append(mid - reach + int(np.argmin(window)))
    cuts.append(w)
    return [trim(rgba[:, a:b]) for a, b in zip(cuts, cuts[1:]) if (rgba[:, a:b, 3] > 8).any()]


def pack(pieces: list[np.ndarray]) -> tuple[np.ndarray, list[tuple[int, int, int, int]]]:
    """Shelf packing, left to right, rows as tall as their tallest piece."""
    boxes, x, y, row_h = [], 0, 0, 0
    for p in pieces:
        h, w = p.shape[:2]
        if x + w > SHEET_W:
            x, y, row_h = 0, y + row_h + GAP, 0
        boxes.append((x, y, w, h))
        x, row_h = x + w + GAP, max(row_h, h)
    sheet = np.zeros((y + row_h, SHEET_W, 4), np.uint8)
    for p, (bx, by, w, h) in zip(pieces, boxes):
        sheet[by:by + h, bx:bx + w] = p
    return sheet, boxes


def build(bundle: str, sheet_id: str, spec: list[dict]) -> dict:
    lib_dir = LIBRARY / bundle
    lib = json.loads((lib_dir / 'library.json').read_text())
    by_id = {a['id']: a for a in lib['assets']}
    pieces, meta = [], []
    for s in spec:
        src = by_id[s['from']]
        full = np.array(Image.open(lib_dir / src['file']).convert('RGBA'))
        for p in split(full, s.get('split', 1)):
            pieces.append(p)
            meta.append({'tags': s['tags'], 'height_m': round(s['height_m'] * p.shape[0] / full.shape[0], 2), 'from': s['from']})
    sheet, boxes = pack(pieces)
    H = sheet.shape[0]
    cells = [{**m, 'rect': [x / SHEET_W, y / H, w / SHEET_W, h / H]} for m, (x, y, w, h) in zip(meta, boxes)]
    Image.fromarray(sheet, 'RGBA').save(lib_dir / f'{sheet_id}.webp', quality=92)
    entry = {'id': sheet_id, 'layer': 'prop', 'kind': 'sheet', 'tags': [], 'file': f'{sheet_id}.webp', 'w': SHEET_W, 'h': H,
             'anchor': [0.5, 1], 'height_m': 1, 'cells': cells}
    lib['assets'] = [a for a in lib['assets'] if a['id'] != sheet_id] + [entry]
    (lib_dir / 'library.json').write_text(json.dumps(lib, indent=1) + '\n')
    return entry


def _check() -> None:
    strip = np.zeros((40, 300, 4), np.uint8)
    strip[10:40, 20:120, 3] = 255
    strip[5:40, 180:280, 3] = 255
    parts = split(strip, 2)
    assert [p.shape[:2] for p in parts] == [(30, 100), (35, 100)], [p.shape for p in parts]
    sheet, boxes = pack(parts)
    assert boxes[1][0] == 100 + GAP and sheet.shape == (35, SHEET_W, 4)


if __name__ == '__main__':
    _check()
    if len(sys.argv) == 4:
        e = build(sys.argv[1], sys.argv[2], json.loads(Path(sys.argv[3]).read_text()))
        print(e['id'], len(e['cells']), 'cells', e['w'], 'x', e['h'])
