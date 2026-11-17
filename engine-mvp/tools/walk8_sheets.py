#!/usr/bin/env python3
"""
The walk's frames from tests/playwright/walk-8-capture.js laid into two sheets to judge by eye (Bart 11-17):

    python3 walk8_sheets.py ../../output/walk-8      # -> output/walk-8-poses.webp, output/walk-8-steps.webp

poses: first the walk's own side view (walk8.py on the body it is fitted on: bones as lines, near side dark, far side
light, the floor and the ankle that stands), then per figure one row, the 8 drawings of a cycle side by side (CONTACT,
DOWN, PASSING, UP, twice). The side view is where knees and feet are judged: the kit people wear robes.
steps: per figure the frames every 0.1 s over two cycles in one still frame, each with the floor line and a faint
grid every tenth of the figure's height, so a sliding foot or a foot through the floor shows.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import walk8

NAMES = ['CONTACT', 'DOWN', 'PASSING', 'UP'] * 2
LABEL_H = 44
STEP_COLS = 5
WEBP_MAX = 16000      # px: WebP's limit is 16383 a side


def font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size)
    except OSError:
        return ImageFont.load_default()


def marked(img: Image.Image, frame: dict, label: str) -> Image.Image:
    """The frame with its floor line (the standing sole) and a grid every tenth of the figure's height."""
    out = Image.new('RGB', (img.width, img.height + LABEL_H), 'white')
    out.paste(img, (0, LABEL_H))
    d = ImageDraw.Draw(out, 'RGBA')
    step = frame['height'] / 10
    x = 0.0
    while x < img.width:
        d.line([(x, LABEL_H), (x, out.height)], fill=(0, 0, 0, 40), width=1)
        x += step
    sole = LABEL_H + frame['sole']
    d.line([(0, sole), (img.width, sole)], fill=(220, 0, 0, 200), width=2)
    d.text((10, 8), label, fill='black', font=font(28))
    return out


def scaled(img: Image.Image, k: float) -> Image.Image:
    return img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)


SIDE_H = 900          # px: the side view's cell height


def side_view(i: int, dx: float, bob: float) -> Image.Image:
    """Drawing i on the fitted body, side view (the far limbs moved onto the near ones' hip and shoulder: the body is
    drawn 3/4, here it is seen from the side), the hips lowered by the clip's bob (body heights)."""
    p, sk = walk8.pose(i), walk8.SKELETON
    w = walk8.world(p)
    k = SIDE_H / (walk8.HEIGHT_PX * 1.1)
    ox, oy = 0.55 * SIDE_H - (sk['hips'][1][0] + 0.1 * walk8.HEIGHT_PX) * k, 0.05 * SIDE_H
    at = lambda q, sx=0.0, sy=0.0: (ox + (q[0] + sx + dx * walk8.HEIGHT_PX) * k, oy + (q[1] + sy - bob * walk8.HEIGHT_PX) * k)
    hip = sk['thigh_n'][1][0] - sk['thigh_f'][1][0]
    shoulder = (sk['upperarm_n'][1][0] - sk['upperarm_f'][1][0], sk['upperarm_n'][1][1] - sk['upperarm_f'][1][1])
    floor_up = walk8.FLOOR['n'] - walk8.FLOOR['f']
    img = Image.new('RGB', (round(0.75 * SIDE_H), SIDE_H + LABEL_H), 'white')
    d = ImageDraw.Draw(img)
    floor = at((0, walk8.FLOOR['n']))[1] + LABEL_H
    d.line([(0, floor), (img.width, floor)], fill=(220, 0, 0), width=2)
    for side, colour in (('f', (170, 170, 190)), ('n', (30, 30, 40))):
        far = side == 'f'
        chain = [w[f'thigh_{side}'][0], w[f'shin_{side}'][0], w[f'foot_{side}'][0]]
        sole = walk8.sole(p, side)
        arm = [w[f'upperarm_{side}'][0], w[f'forearm_{side}'][0], walk8.point(p, f'forearm_{side}', sk[f'forearm_{side}'][2], w)]
        legs = (chain, [sole['heel'], sole['ankle'], sole['toe'], sole['heel']])
        for line in legs:   # the far leg: on the near hip, its floor on the near floor (it is drawn shorter, 3/4)
            d.line([(x, y + LABEL_H) for x, y in (at(q, hip if far else 0, floor_up if far else 0) for q in line)], fill=colour, width=6, joint='curve')
        d.line([(x, y + LABEL_H) for x, y in (at(q, *(shoulder if far else (0, 0))) for q in arm)], fill=colour, width=6, joint='curve')
    spine = [w['chest'][0], w['head'][0], walk8.point(p, 'head', sk['head'][2], w)]
    d.line([(x, y + LABEL_H) for x, y in map(at, spine)], fill=(30, 30, 40), width=8)
    d.text((10, 8), f'side {i + 1} {NAMES[i]}  hips {bob * 100:+.1f}%', fill='black', font=font(26))
    return img


def grid(cells: list[Image.Image], cols: int) -> Image.Image:
    w, h = max(c.width for c in cells), max(c.height for c in cells)
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * w, rows * h), 'white')
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % cols) * w, (i // cols) * h))
    return sheet


def stack(rows: list[Image.Image]) -> Image.Image:
    sheet = Image.new('RGB', (max(r.width for r in rows), sum(r.height for r in rows)), 'white')
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height
    return sheet


def main(src: str) -> int:
    root = Path(src)
    figs = sorted(p for p in root.iterdir() if (p / 'frame.json').is_file())
    clip = walk8.build()[0]
    poses = [grid([side_view(i, 0.0, clip['keys'][i]['bob']) for i in range(8)], 8)]
    steps = []
    stepped = [f for f in figs if (f / 'step-00.png').is_file()]
    if stepped:   # step frames as large as WebP's size allows for all of them (they span the whole walk)
        cell = Image.open(stepped[0] / 'step-00.png').height + LABEL_H
        rows = (len(list(stepped[0].glob('step-*.png'))) + STEP_COLS - 1) // STEP_COLS
        step_scale = min(1.0, WEBP_MAX / (len(stepped) * rows * cell))
    for fig in figs:
        frame = json.loads((fig / 'frame.json').read_text())
        poses.append(grid([marked(Image.open(fig / f'pose-{i}.png').convert('RGB'), frame, f'{fig.name} {i + 1} {NAMES[i]}')
                           for i in range(8)], 8))
        shots = sorted(fig.glob('step-*.png'))
        if fig not in stepped:
            continue
        small = {**frame, 'sole': frame['sole'] * step_scale, 'height': frame['height'] * step_scale}
        steps.append(grid([marked(scaled(Image.open(s).convert('RGB'), step_scale), small, f'{fig.name} {int(s.stem[5:]) / 10:.1f} s')
                           for s in shots], STEP_COLS))
    out = root.parent
    stack(poses).save(out / 'walk-8-poses.webp', quality=80)
    stack(steps).save(out / 'walk-8-steps.webp', quality=70)
    print(out / 'walk-8-poses.webp', stack(poses).size, out / 'walk-8-steps.webp', stack(steps).size)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else '../../output/walk-8'))
