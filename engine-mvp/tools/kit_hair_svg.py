"""Hair styles as SVG kit pieces, grown around the body's own skull (read from its face piece), drawn from a few numbers.

Bart 2026-11-18: "we need more hair styles. for marco polo he has curly hair". Same route as the helmet
(kit_helmet_svg.py): each style is ONE SVG the browser renders into fill / shade / cast / ink
(resources/js/character/svg-piece.js), so a style is a handful of numbers here, not a painting.

How a style is built:
  - the skull: the face piece's outline, measured on rays from the head's centre (so it fits that body);
  - the cap: the skull between the hairline (forehead, temple, over the ear) and the nape, pushed out by `volume`;
  - curly: overlapping round curls along the cap's edge and along the fringe, curl marks inside;
    smooth: the cap's own edge, a few strand lines inside;
  - one outline round the whole shape (a wide stroke masked to the outside), so overlapping curls read as one mass.

  python3 engine-mvp/tools/kit_hair_svg.py            # writes every style into the kit and adds it to kit.json
"""
import hashlib
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image

KIT = Path(__file__).resolve().parents[2] / 'public/character-kits/babylonia-old-babylonian/v1'
INK = '#191410'
LINE = 5.0                       # px: the outline, as the baked pieces' ink

# Per body: the head's centre, the hairline (forehead -> temple -> over the ear -> behind it) and the nape, in body-canvas px.
HEADS = {
    'man': dict(centre=(1005, 252), face='face/man',
                hairline=[(1158, 176), (1112, 186), (1052, 198), (996, 214), (958, 238), (946, 262), (944, 286),
                          (914, 266), (884, 260), (862, 272), (850, 300)],
                nape=(858, 372)),
}

STYLES = {
    # Marco Polo: short dark curls, a curly fringe on the forehead
    'man-curly-short': dict(body='man', label='Curly short', kind='curly', volume=10, curl=16, fringe=11, nape_drop=0, seed=4),
    # longer curls down to the collar
    'man-curly-long': dict(body='man', label='Curly long', kind='curly', volume=18, curl=19, fringe=11, nape_drop=95, seed=9),
    # a smooth cap cut level at the ear: the bowl cut a Venetian boy of 1271 would wear
    'man-straight-bowl': dict(body='man', label='Straight bowl', kind='smooth', volume=14, curl=0, fringe=0, nape_drop=0, seed=2),
}


def skull(body: str) -> tuple[np.ndarray, tuple[int, int]]:
    """The face piece's outline as a radius per degree round the head's centre (0 = to the right, counter-clockwise)."""
    head = HEADS[body]
    kit = json.loads((KIT / 'kit.json').read_text())
    piece = next(p for b in kit['bodies'] if b['id'] == body for p in b['pieces'] if p['id'] == head['face'])
    x0, y0, w, h = piece['box']
    alpha = np.asarray(Image.open(KIT / body / piece['files']['fill']).convert('RGBA'))[..., 3] > 128
    cx, cy = head['centre']
    radius = np.zeros(360)
    for deg in range(360):
        t = math.radians(deg)
        for r in range(400, 0, -1):
            px, py = int(cx + r * math.cos(t)) - x0, int(cy - r * math.sin(t)) - y0
            if 0 <= px < w and 0 <= py < h and alpha[py, px]:
                radius[deg] = r
                break
    return radius, (cx, cy)


def angle_of(p, c) -> float:
    return math.degrees(math.atan2(c[1] - p[1], p[0] - c[0])) % 360


def outer_edge(radius, c, start: float, end: float, volume: float, step: float = 2.0) -> list[tuple[float, float]]:
    """The skull pushed out by `volume`, counter-clockwise from `start` to `end` degrees (end > start, may pass 360)."""
    pts = []
    d = start
    while d <= end:
        r = radius[int(round(d)) % 360] + volume
        t = math.radians(d)
        pts.append((c[0] + r * math.cos(t), c[1] - r * math.sin(t)))
        d += step
    return pts


def resample(pts, spacing: float) -> list[tuple[float, float]]:
    out, carry = [pts[0]], 0.0
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        seg = math.hypot(bx - ax, by - ay)
        d = spacing - carry
        while d <= seg:
            out.append((ax + (bx - ax) * d / seg, ay + (by - ay) * d / seg))
            d += spacing
        carry = (carry + seg) % spacing
    return out


def path(pts, close=True) -> str:
    return 'M ' + ' L '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + (' Z' if close else '')


def style_svg(sid: str, s: dict) -> tuple[str, list[int]]:
    head = HEADS[s['body']]
    radius, c = skull(s['body'])
    rnd = random.Random(s['seed'])
    front, nape = head['hairline'][0], (head['nape'][0], head['nape'][1] + s['nape_drop'])
    a0, a1 = angle_of(front, c), angle_of(nape, c)      # forehead (~35 deg) round the top and back to the nape (~235 deg)
    edge = outer_edge(radius, c, a0, a1, s['volume'])
    if s['nape_drop'] > 20:   # long: the back hangs down behind the ear and the neck, as wide as the back of the head
        back = min(range(len(edge)), key=lambda i: edge[i][0])      # the back of the head: hang straight down from there
        bx, by = edge[back]
        low = head['nape'][1] + s['nape_drop']
        edge = edge[:back + 1] + [(bx + 2, (by + low) / 2), (bx + 14, low), (head['nape'][0] + 46, low + 6)]
        nape = (head['nape'][0] + 48, head['nape'][1] + 24)
    cap = [front] + edge + [nape] + head['hairline'][::-1][:-1]
    shapes = [f'<path d="{path(cap)}"/>']
    marks = []
    if s['kind'] == 'curly':
        for i, (x, y) in enumerate(resample(edge + [nape], s['curl'] * 1.25)):
            r = s['curl'] * rnd.uniform(0.85, 1.15)
            shapes.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>')
        for (x, y) in resample(head['hairline'][:5], s['fringe'] * 1.5):   # a curly fringe along the forehead and temple
            shapes.append(f'<circle cx="{x:.1f}" cy="{y + 2:.1f}" r="{s["fringe"] * rnd.uniform(0.9, 1.15):.1f}"/>')
        # curl marks inside: short open arcs, each turned its own way
        inner = outer_edge(radius, c, a0 + 8, a1 - 8, s['volume'] - s['curl'] * 1.4, 2)
        for band in (0.0, 0.45):
            for (x, y) in resample(inner, s['curl'] * 1.6)[1:]:
                x, y = c[0] + (x - c[0]) * (1 - band * 0.35), c[1] + (y - c[1]) * (1 - band * 0.35)
                r = s['curl'] * rnd.uniform(0.45, 0.65)
                t0 = rnd.uniform(0, 2 * math.pi)
                p0 = (x + r * math.cos(t0), y + r * math.sin(t0))
                p1 = (x + r * math.cos(t0 + 4.2), y + r * math.sin(t0 + 4.2))
                marks.append(f'<path d="M {p0[0]:.1f},{p0[1]:.1f} A {r:.1f} {r:.1f} 0 1 1 {p1[0]:.1f},{p1[1]:.1f}"/>')
    else:
        # strands: a few long lines from the crown toward the edge
        crown = (c[0] + 10, c[1] - radius[90] * 0.55)
        for (x, y) in resample(edge, 46)[1:-1]:
            mx, my = crown[0] + (x - crown[0]) * 0.55, crown[1] + (y - crown[1]) * 0.55
            ex, ey = crown[0] + (x - crown[0]) * 0.9, crown[1] + (y - crown[1]) * 0.9
            marks.append(f'<path d="M {mx:.1f},{my:.1f} Q {mx + rnd.uniform(-6, 6):.1f},{(my + ey) / 2:.1f} {ex:.1f},{ey:.1f}"/>')
    # the box: everything the shapes reach, plus the stroke
    xs = [p[0] for p in cap + edge] + [p[0] for p in resample(edge + [nape], 1)]
    ys = [p[1] for p in cap + edge]
    pad = s['curl'] * 1.3 + LINE + 4
    box = [int(min(xs) - pad), int(min(ys) - pad), int(max(xs) - min(xs) + 2 * pad), int(max(ys) - min(ys) + 2 * pad)]
    ox, oy, w, h = box
    shade = path(outer_edge(radius, c, 150, a1, s['volume'] * 0.4) + [nape, head['hairline'][-1], head['hairline'][-3]])
    fringe_cast = path([(x, y + 14) for x, y in head['hairline'][:6]], close=False)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{ox} {oy} {w} {h}" width="{w}" height="{h}" data-box="{ox} {oy} {w} {h}">
  <!-- Made by engine-mvp/tools/kit_hair_svg.py ({sid}): change the numbers there, not here. -->
  <defs>
    <g id="shape">{''.join(shapes)}</g>
    <mask id="outside" maskUnits="userSpaceOnUse" x="{ox}" y="{oy}" width="{w}" height="{h}">
      <rect x="{ox}" y="{oy}" width="{w}" height="{h}" fill="#fff"/><use href="#shape" fill="#000"/>
    </mask>
    <mask id="inside" maskUnits="userSpaceOnUse" x="{ox}" y="{oy}" width="{w}" height="{h}">
      <use href="#shape" fill="#fff"/>
    </mask>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
  </defs>
  <g class="fill"><use href="#shape" data-kind="hair" fill="#7a5236"/></g>
  <g class="shade" data-strength="0.5" fill="#000" opacity="0.18" filter="url(#soft)" mask="url(#inside)"><path d="{shade}"/></g>
  <g class="cast" data-strength="0.5" fill="none" stroke="#000" stroke-width="16" opacity="0" filter="url(#soft)"><path d="{fringe_cast}"/></g>
  <g class="ink" fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">
    <use href="#shape" stroke-width="{LINE * 2}" mask="url(#outside)"/>
    <g stroke-width="2.6" mask="url(#inside)">{''.join(marks)}</g>
  </g>
</svg>
'''
    return svg, box


def main() -> None:
    kit_path = KIT / 'kit.json'
    kit = json.loads(kit_path.read_text())
    for sid, s in STYLES.items():
        svg, box = style_svg(sid, s)
        out = KIT / s['body'] / f'hair-{sid}.svg'
        out.write_text(svg)
        body = next(b for b in kit['bodies'] if b['id'] == s['body'])
        pid = f'hair/{sid}'
        entry = {'id': pid, 'slot': 'hair', 'label': s['label'], 'kinds': ['hair'], 'box': box,
                 'files': {'svg': f'{out.name}?v={hashlib.sha256(svg.encode()).hexdigest()[:10]}'}}
        at = next((i for i, p in enumerate(body['pieces']) if p['id'] == pid), None)
        if at is None:
            after = max(i for i, p in enumerate(body['pieces']) if p['slot'] == 'hair')
            body['pieces'].insert(after + 1, entry)
        else:
            body['pieces'][at] = {**body['pieces'][at], **entry}
        print(out, box)
    kit_path.write_text(json.dumps(kit, indent=1))


if __name__ == '__main__':
    main()
