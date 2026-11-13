"""Lineup of the body-type presets at stage size (height from height_m), grouped girl / woman / man, + a row of close-ups.

  python3 kit_sheet.py     -> kits/old-babylonian/v1/kit-bodies-lineup.webp, kit-bodies-closeups.webp
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from img_io import find, save as save_image  # noqa: E402

K = Path.home() / 'BartsMedia/historyportal/topics/character-creator/kits/old-babylonian/v1'
ANA = Path.home() / 'BartsMedia/historyportal/topics/character-creator/part-sheets/ana/v1/out2'
GROUPS = [('Girl body', ['ana', 'miller-girl']), ('Woman body', ['weaver', 'naditu', 'tavern-keeper', 'grandmother']),
          ('Man body', ['scribe', 'merchant', 'soldier'])]
H0, TALL = 900, 1.72
PAPER = (0xf6, 0xf5, 0xee)
INK = (40, 30, 20)


def item(i):
    if i == 'ana':
        return 'Ana (hero)', Image.open(find(ANA / 'ana-full-on-paper.png')), 1.42, Image.open(find(ANA / 'ana-closeup-on-paper.png'))
    d = K / 'presets-bodies' / i
    r = json.loads((d / 'recipe.json').read_text())
    return r['role'], Image.open(find(d / f'{i}-full-on-paper.png')), r['height_m'], Image.open(find(d / f'{i}-closeup-on-paper.png'))


def main():
    cols, ups = [], []
    for g, ids in GROUPS:
        for n, i in enumerate(ids):
            name, im, hm, up = item(i)
            h = int(H0 * hm / TALL)
            cols.append((g if n == 0 else '', name, im.resize((int(im.width * h / im.height), h), Image.LANCZOS)))
            ups.append(up)
        cols.append(None)
    width = sum(c[2].width + 30 for c in cols if c) + 70 * len(GROUPS) + 40
    sheet = Image.new('RGB', (width, H0 + 110), PAPER)
    d = ImageDraw.Draw(sheet)
    x = 40
    for c in cols:
        if c is None:
            x += 70
            continue
        g, name, im = c
        if g:
            d.text((x, 12), g, fill=INK)
        sheet.paste(im, (x, H0 + 50 - im.height))
        d.text((x, H0 + 70), name, fill=INK)
        x += im.width + 30
    save_image(sheet, K / 'kit-bodies-lineup.webp')
    w = 420
    row = Image.new('RGB', (w * len(ups), int(w * 1540 / 1600)), PAPER)
    for k, u in enumerate(ups):
        row.paste(u.resize((w, int(w * u.height / u.width)), Image.LANCZOS), (k * w, 0))
    save_image(row, K / 'kit-bodies-closeups.webp')
    print('ok')


if __name__ == '__main__':
    main()
