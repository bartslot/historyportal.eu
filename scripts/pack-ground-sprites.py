#!/usr/bin/env python3
"""Pack a bundle's low plant pictures into ONE sprite sheet for the strewn ground (engine-mvp stage25d/scatter.ts).

    python3 scripts/pack-ground-sprites.py ~/BartsMedia/historyportal/library/nl-prehistory
    php artisan library:sync ~/BartsMedia/historyportal/library/nl-prehistory

No new art: the cells are the bundle's own pictures (grass, heather, reeds, shrubs). The sheet's entry in
library.json (kind 'sheet', its `cells`) is the manifest the engine cuts it by, so a hand-made sheet replaces this
stand-in by writing its own entry: { id, kind: 'sheet', file, w, h, cells: [{ tags, height_m, rect: [u0, v0, du, dv] }] }
(rect in shares of the sheet, v 0 at the top). Run again after adding plants; the entry is replaced, never doubled.
"""
import json
import sys
from pathlib import Path

from PIL import Image

SHEET_ID = 'ground-sprites-01'
PLANT_TAGS = {'grass', 'heather', 'reeds', 'shrub', 'bramble', 'juniper', 'hazel', 'meadow', 'fern', 'bush', 'sedge', 'flower'}
MAX_M = 6.0          # low plants and shrubs; trees stay single pictures (a tagged shrub, like hawthorn, comes along)
CELL_PX = 360        # every cell this tall, its width from the picture's own aspect
PAD_PX = 16          # transparent gap: far-off mip levels never bleed a neighbour in
SHEET_W = 2048


def plants(lib):
    for a in lib['assets']:
        tags = set(a.get('tags', []))
        wide_strip = 'ground' in tags and a.get('height_m', 0) >= 2 and a['w'] / max(1, a['h']) >= 2
        if (a.get('kind') or a['layer'] in ('ground', 'sky', 'bg', 'figure') or a.get('tileable_x') or wide_strip
                or not tags & PLANT_TAGS or (a.get('height_m', 0) > MAX_M and 'shrub' not in tags)):
            continue
        yield a


def main(folder: Path) -> None:
    path = folder / 'library.json'
    lib = json.loads(path.read_text())
    picks = sorted(plants(lib), key=lambda a: a['id'])
    if not picks:
        sys.exit(f'{folder}: no plant pictures to pack')
    images = []
    for a in picks:
        im = Image.open(folder / a['file']).convert('RGBA')
        w = round(im.width * CELL_PX / im.height)
        images.append((a, im.resize((w, CELL_PX), Image.LANCZOS)))
    # shelves: left to right, a new row when the next one does not fit
    x = y = PAD_PX
    spots = []
    for a, im in images:
        if x + im.width + PAD_PX > SHEET_W:
            x, y = PAD_PX, y + CELL_PX + PAD_PX
        spots.append((a, im, x, y))
        x += im.width + PAD_PX
    h = y + CELL_PX + PAD_PX
    sheet = Image.new('RGBA', (SHEET_W, h), (0, 0, 0, 0))
    cells = []
    for a, im, cx, cy in spots:
        sheet.paste(im, (cx, cy))
        cells.append({'tags': a['tags'], 'height_m': a['height_m'], 'rect': [cx / SHEET_W, cy / h, im.width / SHEET_W, CELL_PX / h], 'from': a['id']})
    sheet.save(folder / f'{SHEET_ID}.webp', 'WEBP', quality=90, method=6)
    entry = {'id': SHEET_ID, 'layer': 'prop', 'kind': 'sheet', 'tags': [], 'file': f'{SHEET_ID}.webp', 'w': SHEET_W, 'h': h,
             'anchor': [0.5, 1], 'height_m': 1, 'cells': cells}
    lib['assets'] = [a for a in lib['assets'] if a['id'] != SHEET_ID] + [entry]
    path.write_text(json.dumps(lib, ensure_ascii=False, indent=1) + '\n')
    print(f'{SHEET_ID}: {len(cells)} cells, {SHEET_W}x{h} -> {folder / entry["file"]}')
    for c in cells:
        print(f"  {c['from']:<22} {c['height_m']:>5} m  {', '.join(c['tags'])}")


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).expanduser())
