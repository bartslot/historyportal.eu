"""The Old Babylonian soldier's helmet (man body) as ONE SVG kit piece, drawn from a few numbers.

Bart 2026-11-18: the baked helmet sat on the hair like a small cap ("needs to be bigger"), and he asked for SVG "so it
can be programmatically changed". A conical copper helmet with a riveted band, covering the skull down to the top of
the ear. Change the numbers below (rim, band, peak), run this, reload the Character tab: no bake, no AI.

The browser reads the groups (resources/js/character/svg-piece.js): `.fill` shapes carry `data-kind`, `.shade` and
`.cast` are masks at `data-strength`, `.ink` is the pen line. The root's `data-box` is where the piece sits on the body
canvas; kit_bake.py copies it into kit.json so a re-bake keeps the SVG.

  python3 engine-mvp/tools/kit_helmet_svg.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / 'public/character-kits/babylonia-old-babylonian/v1/man/headwear-man-helmet.svg'

OX, OY, W, H = 790, 4, 412, 340           # the piece box on the man's body canvas (px)
B = dict(back=(816, 318), c1=(880, 250), c2=(1000, 208), front=(1182, 216))   # the rim's lower edge: behind the ear to the brow
BAND = 26                                  # band height (px)
P = lambda x, y: f'{x - OX:.1f},{y - OY:.1f}'
def bottom(dy=0):
    b, c1, c2, f = B['back'], B['c1'], B['c2'], B['front']
    return f'{P(b[0], b[1]+dy)} C {P(c1[0], c1[1]+dy)} {P(c2[0], c2[1]+dy)} {P(f[0], f[1]+dy)}'
top_back, top_front = (B['back'][0] - 2, B['back'][1] - BAND), (B['front'][0] + 2, B['front'][1] - BAND)
peak = (996, 14)                           # the cone's point
dome = (f'M {P(*top_back)} C {P(800, 200)} {P(900, 70)} {P(*peak)} '
        f'C {P(1080, 70)} {P(1180, 120)} {P(*top_front)}')
whole = (f'M {P(*top_back)} C {P(800, 200)} {P(900, 70)} {P(*peak)} C {P(1080, 70)} {P(1180, 120)} {P(*top_front)} '
         f'L {P(*B["front"])} C {P(*B["c2"])} {P(*B["c1"])} {P(*B["back"])} Z')
band_top = f'M {bottom(-BAND)}'
seam = f'M {P(*peak)} C {P(1020, 80)} {P(1046, 150)} {P(1056, 204)}'
def on_rim(t, dy):
    pts = [B['back'], B['c1'], B['c2'], B['front']]
    w = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3]
    return sum(wi * p[0] for wi, p in zip(w, pts)), sum(wi * p[1] for wi, p in zip(w, pts)) + dy
rivets = ''.join(f'<circle cx="{x-OX:.1f}" cy="{y-OY:.1f}" r="3.2"/>' for x, y in (on_rim(t, -BAND / 2) for t in (0.12, 0.3, 0.48, 0.66, 0.84)))
shade = (f'M {P(*top_back)} C {P(800, 200)} {P(900, 70)} {P(*peak)} C {P(930, 90)} {P(900, 190)} {P(910, 268)} Z')
cast = f'M {bottom(0)} L {P(B["front"][0], B["front"][1]+16)} C {P(1000, 230)} {P(880, 268)} {P(B["back"][0], B["back"][1]+16)} Z'
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" data-box="{OX} {OY} {W} {H}">
  <!-- Made by engine-mvp/tools/kit_helmet_svg.py: change the numbers there, not here. -->
  <defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter></defs>
  <g class="fill"><path data-kind="ochre" fill="#c4a35a" d="{whole}"/></g>
  <g class="shade" data-strength="0.55" fill="#000" opacity="0.18" filter="url(#soft)"><path d="{shade}"/></g>
  <g class="cast" data-strength="0.6" fill="#000" opacity="0" filter="url(#soft)"><path d="{cast}"/></g>
  <g class="ink" fill="none" stroke="#191410" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="{whole}"/>
    <path d="{band_top}"/>
    <path stroke-width="3" d="{seam}"/>
    <g fill="#191410" stroke="none">{rivets}</g>
  </g>
</svg>
'''
OUT.write_text(svg)
# point kit.json at it with its content in the URL (the SVG is cached for a month), as kit_bake.svg_pieces does on a bake
import json  # noqa: E402
import hashlib  # noqa: E402
kit_path = OUT.parents[1] / 'kit.json'
kit = json.loads(kit_path.read_text())
for b in kit['bodies']:
    for pc in b['pieces']:
        if pc['id'] == 'headwear/man-helmet':
            pc['files'] = {'svg': f'{OUT.name}?v={hashlib.sha256(svg.encode()).hexdigest()[:10]}'}
            pc['box'] = [OX, OY, W, H]
kit_path.write_text(json.dumps(kit, indent=1))
print(OUT)
