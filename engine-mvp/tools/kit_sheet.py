"""Lineup of the kit presets at stage size (height from height_m) + a row of close-ups."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
K = Path.home() / 'BartsMedia/historyportal/topics/character-creator/kits/old-babylonian/v1'
ANA = Path.home() / 'BartsMedia/historyportal/topics/character-creator/part-sheets/ana/v1/out2'
ids = ['miller-girl', 'weaver', 'naditu', 'tavern-keeper', 'grandmother']
H0, TALL = 900, 1.58
items = [('Ana (hero)', Image.open(ANA / 'ana-full-on-paper.png'), 1.42)]
for i in ids:
    r = json.loads((K / 'presets' / i / 'recipe.json').read_text())
    items.append((r['role'], Image.open(K / 'presets' / i / f'{i}-full-on-paper.png'), r['height_m']))
paper = (0xf6, 0xf5, 0xee)
cols = []
for name, im, hm in items:
    h = int(H0 * hm / TALL)
    cols.append((name, im.resize((int(im.width * h / im.height), h), Image.LANCZOS)))
W = sum(c.width for _, c in cols) + 40 * (len(cols) + 1)
sheet = Image.new('RGB', (W, H0 + 80), paper)
d = ImageDraw.Draw(sheet)
x = 40
for name, c in cols:
    sheet.paste(c, (x, H0 + 20 - c.height))
    d.text((x, H0 + 40), name, fill=(40, 30, 20))
    x += c.width + 40
sheet.save(K / 'kit-lineup.png')
# close-ups
ups = [Image.open(ANA / 'ana-closeup-on-paper.png')] + [Image.open(K / 'presets' / i / f'{i}-closeup-on-paper.png') for i in ids]
w = 520
row = Image.new('RGB', (w * len(ups), int(w * ups[1].height / ups[1].width)), paper)
for k, u in enumerate(ups):
    row.paste(u.resize((w, int(w * u.height / u.width)), Image.LANCZOS), (k * w, 0))
row.save(K / 'kit-closeups.png')
print('ok')
