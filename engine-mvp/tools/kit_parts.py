"""Old Babylonian kit: cut every part out of its sheet (what the sheet adds to its own base) and compose head sheets.

  python3 kit_parts.py            -> kits/old-babylonian/v1/parts/<folder>/<name>.png (+ -mask.png)
A part file is the sheet's own pixels where the part is, green elsewhere. compose(face, [parts]) layers them in order.
"""
from __future__ import annotations
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from img_io import find, save as save_image  # noqa: E402

ROOT = Path.home() / 'BartsMedia/historyportal/topics/character-creator'
ANA = ROOT / 'part-sheets/ana/v1'
K = ROOT / 'kits/old-babylonian/v1'
LUMA = np.array([0.3, 0.59, 0.11])
rgb = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(np.int32)
is_green = lambda a: (a[..., 1] > 170) & (a[..., 0] < 120) & (a[..., 2] < 120)

FACES = {'girl': ANA / 'parts/head-bald.png', 'young-woman': K / 'heads/young-woman.png',
         'woman': K / 'heads/woman-40.png', 'old-woman': ANA / 'parts/head-bald-old.png', 'man': K / 'heads/man.png'}
# part: (sheet, its own base, kind of cut)
PARTS = {
    'hair/braid': (ANA / 'head-flat.png', ANA / 'parts/head-bald.png', 'add'),
    'hair/bun': (ANA / 'parts/head-old-greybun.png', ANA / 'parts/head-bald-old.png', 'add'),
    'hair/loose': (K / 'hair/loose.png', ANA / 'parts/head-bald.png', 'add'),
    'headwear/headband': (K / 'headwear/headband.png', ANA / 'parts/head-old-greybun.png', 'add'),
    'headwear/shawl-over-head': (K / 'headwear/shawl-over-head.png', ANA / 'parts/head-old-greybun.png', 'cover'),
    'extras/jewellery': (K / 'extras/jewellery.png', ANA / 'parts/head-bald.png', 'add'),
    **{f'mouths/{m}': (K / f'mouths/{m}.png', ANA / 'parts/head-bald.png', 'patch') for m in ['ah', 'oh', 'down', 'pressed', 'gentle-smile']},
    # the man's parts are cut against his own face (body types, 11-13)
    **{name: (K / f'{name}.png', K / 'heads/man.png', how) for name, how in
       {'hair/man-beard': 'add', 'hair/man-hair-headband': 'add', 'headwear/man-helmet': 'cover', 'extras/man-seal': 'add'}.items()},
}
MOUTH_ZONE = (590, 560, 900, 720)          # head-sheet px: where a mouth may change (nose and jaw stay)


def keep_big(m, min_px):
    lab, n = ndimage.label(m)
    if not n:
        return m
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return np.isin(lab, 1 + np.flatnonzero(sizes >= min_px))


def cut(sheet, base, how):
    """The part's mask on the head canvas."""
    changed = np.abs(sheet - base).sum(-1) > 60
    ink = (sheet @ LUMA) < 42
    if how == 'patch':                      # a mouth: everything inside a padded hull of the change, inside the zone
        x0, y0, x1, y1 = MOUTH_ZONE
        zone = np.zeros(changed.shape, bool); zone[y0:y1, x0:x1] = True
        core = keep_big(ndimage.binary_opening(changed & zone, iterations=1), 25)
        return ndimage.binary_fill_holes(ndimage.binary_dilation(core, iterations=10)) & zone & ~is_green(sheet)
    paint = changed & ~is_green(sheet) & ~ink
    core = keep_big(ndimage.binary_opening(paint, iterations=2), 150)
    near = ndimage.binary_dilation(core, iterations=6)
    mask = ndimage.binary_closing(core | (near & ink & (changed | ndimage.binary_dilation(core, iterations=3))), iterations=3)
    if how == 'cover':                      # a head cloth also hides what it covers on any face: the whole silhouette it adds over
        mask = ndimage.binary_fill_holes(mask)
    return mask & ~is_green(sheet)


# A shoulder sits beside the neck, a little lower, and the hip well below it, all as shares of the body's head box. The
# girl's joints measured off her map landed mid-arm and inside the skirt (her shawl covers the far shoulder and the waist).
SHOULDER_DROP = 0.25      # of the head box's height: a shoulder no lower than this under the neck
SHOULDER_REACH = 0.6      # of the head box's width: a shoulder no further than this from the neck
HIP_DROP = (0.5, 1.5)     # of the head box's height: the hip this far under the neck


def joint_problems(joints, box):
    """What is wrong with a body's joints for its head box (x0, y0, x1, y1); empty when they make sense."""
    bw, bh = box[2] - box[0], box[3] - box[1]
    nx, ny = joints['NECK']
    out = []
    for side, (sx, sy) in joints['SHOULDER'].items():
        if not -0.1 * bh <= sy - ny <= SHOULDER_DROP * bh:
            out.append(f'shoulder {side} is {sy - ny:.0f} px under the neck')
        if ((sx - nx) ** 2 + (sy - ny) ** 2) ** 0.5 > SHOULDER_REACH * bw:
            out.append(f'shoulder {side} is {((sx - nx) ** 2 + (sy - ny) ** 2) ** 0.5:.0f} px from the neck')
    drop = joints['HIP'][1] - ny
    if not HIP_DROP[0] * bh <= drop <= HIP_DROP[1] * bh:
        out.append(f'hip is {drop:.0f} px under the neck')
    return out


def body_joints(body):
    """A body type's joints and head box from the kit (body/joints.json, body/head-boxes.json), checked."""
    joints = json.loads((K / 'body/joints.json').read_text())[body]
    box = tuple(json.loads((K / 'body/head-boxes.json').read_text())[body])
    problems = joint_problems(joints, box)
    if problems:
        raise SystemExit(f'body/joints.json, {body}: ' + '; '.join(problems))
    return joints, box


def save_part(name, sheet, m):
    """A part as the sheet's own pixels where it is, green elsewhere, and its mask: lossless .webp (re-read by compose)."""
    (K / 'parts' / name).parent.mkdir(parents=True, exist_ok=True)
    save_image(np.where(m[..., None], sheet, [0, 255, 0]).astype(np.uint8), K / 'parts' / f'{name}.png', lossless=True)
    save_image((m * 255).astype(np.uint8), K / 'parts' / f'{name}-mask.png', lossless=True)


def part(name):
    p = find(K / 'parts' / f'{name}.png')
    m = find(K / 'parts' / f'{name}-mask.png')
    return rgb(p), np.asarray(Image.open(m).convert('L')) > 127


def compose(face, names):
    """A head sheet: the face, then each part over it in order. Returns (sheet, mask of everything the parts drew)."""
    out = rgb(FACES[face]).copy()
    drawn = np.zeros(out.shape[:2], bool)
    for n in names:
        px, m = part(n)
        out[m] = px[m]
        drawn |= m if not n.startswith('mouths/') else False
    return out.astype(np.uint8), drawn


if __name__ == '__main__':
    for name, (sp, bp, how) in PARTS.items():
        sheet, base = rgb(sp), rgb(bp)
        m = cut(sheet, base, how)
        save_part(name, sheet, m)
        print(f'{name:28s} {int(m.sum()):7d} px')
