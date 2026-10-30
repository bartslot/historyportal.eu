#!/usr/bin/env python3
"""Cut a 4x2 pose sheet (white paper, 8 separate figures) into real-alpha figure cutouts.

  cut_figures.py <poses.png> <char> <height_m> <out_dir>

Writes fig-<char>-<pose>-01.webp (faces right) and fig-<char>-<pose>-01-l.webp (mirrored) and prints
library.json entries. Scale: one px/m for the whole sheet, taken from the STAND figure (pose 1), so a
kneeling figure is as small as it really is. Anchor = the feet: x is the mean of the lowest opaque rows.
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

POSES = ['stand', 'walk', 'point', 'kneel', 'carry', 'push', 'dig', 'sit']
WHITE = 236      # a pixel whose darkest channel is above this is paper
SOFT = 40        # alpha ramps over this many levels below WHITE (anti-aliased edge)
HOLE_PX = 1500   # an enclosed paper gap bigger than this (between staff and leg) is background, not white cloth
MERGE_PX = 5    # dilation that joins a figure's loose parts (hand, tool, hair) into one blob


def cutout(rgb: np.ndarray, box, mine: np.ndarray) -> Image.Image:
    y0, y1, x0, x1 = box
    crop = rgb[y0:y1, x0:x1].astype(np.float32)
    mine = mine[y0:y1, x0:x1]
    dark = crop.min(axis=2)
    paper = dark > WHITE
    lab, _ = ndi.label(paper)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndi.sum(paper, lab, range(1, lab.max() + 1))
    big = {i + 1 for i, a in enumerate(sizes) if a > HOLE_PX}
    outside = np.isin(lab, list(border | big)) | ~mine   # paper that touches the crop edge or is a big hole; small white (eyes) stays
    inside = ~outside
    edge = ndi.binary_dilation(outside, iterations=3) & inside
    a = np.where(edge, np.clip((WHITE + 10 - dark) / SOFT * 1.0, 0, 1), inside.astype(np.float32))
    a = np.where(inside, np.maximum(a, 0), 0)
    a = ndi.gaussian_filter(a, 0.6) * inside
    # un-matte the white fringe: c = (c - 255 (1 - a)) / a on the soft edge
    af = np.clip(a, 0.05, 1)[..., None]
    col = np.where(edge[..., None], (crop - 255 * (1 - af)) / af, crop)
    out = np.dstack([np.clip(col, 0, 255), (a * 255)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def trim_box(im: Image.Image) -> tuple:
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 12)
    return (max(0, xs.min() - 2), max(0, ys.min() - 2), min(im.width, xs.max() + 3), ys.max() + 1)


def main(sheet: str, char: str, height_m: float, out_dir: str) -> None:
    rgb = np.array(Image.open(sheet).convert('RGB'))
    ink = rgb.min(axis=2) <= WHITE
    blobs, n = ndi.label(ndi.binary_dilation(ink, iterations=MERGE_PX))
    areas = ndi.sum(ink, blobs, range(1, n + 1))
    order = np.argsort(areas)[::-1] + 1
    objs = ndi.find_objects(blobs)
    box = lambda k: (objs[k - 1][0].start, objs[k - 1][0].stop, objs[k - 1][1].start, objs[k - 1][1].stop)
    if n < 8:
        sys.exit(f'{sheet}: only {n} figures found')
    seeds = {int(k): list(box(int(k))) for k in order[:8]}
    members = {k: [k] for k in seeds}
    for k in order[8:]:   # a loose piece (a raised hand, a tool tip) joins the nearest figure
        b = box(int(k))
        cx, cy = (b[2] + b[3]) / 2, (b[0] + b[1]) / 2
        near = min(seeds, key=lambda s: (max(seeds[s][2] - cx, 0, cx - seeds[s][3])) ** 2 + (max(seeds[s][0] - cy, 0, cy - seeds[s][1])) ** 2)
        members[near].append(int(k))
        seeds[near] = [min(seeds[near][0], b[0]), max(seeds[near][1], b[1]), min(seeds[near][2], b[2]), max(seeds[near][3], b[3])]
    boxes = [tuple(v) for v in seeds.values()]
    masks = [np.isin(blobs, members[k]) for k in seeds]
    paired = sorted(zip(boxes, masks), key=lambda p: (p[0][0] + p[0][1]) / 2)
    ordered_p = sorted(paired[:4], key=lambda p: p[0][2]) + sorted(paired[4:], key=lambda p: p[0][2])
    ordered = [p[0] for p in ordered_p]
    pad = 6
    imgs = [cutout(rgb, (max(0, b[0] - pad), min(rgb.shape[0], b[1] + pad), max(0, b[2] - pad), min(rgb.shape[1], b[3] + pad)), m) for b, m in ordered_p]
    px_per_m = (ordered[0][1] - ordered[0][0]) / height_m
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    entries = []
    for pose, im in zip(POSES, imgs):
        im = im.crop(trim_box(im))   # the soles are the bottom edge: the stage stands the picture's last row on the floor
        a = np.array(im)[..., 3]
        rows_on = np.where(a.max(axis=1) > 40)[0]
        bot = rows_on.max()
        foot = a[max(0, bot - int(0.04 * im.height)):bot + 1] > 40
        ax = float(np.where(foot)[1].mean() / im.width)
        h_m = round(im.height / px_per_m, 3)
        for facing, img, ox in (('right', im, ax), ('left', im.transpose(Image.FLIP_LEFT_RIGHT), 1 - ax)):
            fid = f'fig-{char}-{pose}-01' + ('' if facing == 'right' else '-l')
            img.save(out / f'{fid}.webp', quality=90, method=6)
            entries.append({
                'id': fid, 'layer': 'figure', 'tags': ['figure', f'char:{char}', f'pose:{pose}', f'facing:{facing}', char, pose],
                'file': f'{fid}.webp', 'w': img.width, 'h': img.height, 'anchor': [round(ox, 3), 1.0],
                'height_m': h_m, 'motion': 'none', 'era': 'figure-v1', 'qa': {'score': 7, 'alpha_ok': True},
            })
    (out / f'_{char}.json').write_text(json.dumps(entries, indent=1))
    print(char, 'px/m', round(px_per_m, 1), [(e['id'].split('-')[2], e['height_m']) for e in entries if e['id'].endswith('01')])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4])
