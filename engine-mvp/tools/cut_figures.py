#!/usr/bin/env python3
"""Cut a 4x2 pose sheet (8 separate figures on #00FF00, or on white paper for older sheets) into real-alpha figure cutouts.

  cut_figures.py <poses.png> <char> <height_m> <out_dir> [pose,names,x8]

Writes fig-<char>-<pose>-01.webp (faces right) and fig-<char>-<pose>-01-l.webp (mirrored) and prints
library.json entries. Scale: one px/m for the whole sheet, taken from the STAND figure (pose 1), so a
kneeling figure is as small as it really is. Pose names default to POSES; a sheet drawn for a scene passes
its own eight (the first must still be the standing figure). Anchor = the feet: x is the mean of the lowest opaque rows.
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools/artkit'))
import green_key

POSES = ['stand', 'walk', 'point', 'kneel', 'carry', 'push', 'dig', 'sit']
WHITE = 236      # a pixel whose darkest channel is above this is paper
SOFT = 40        # alpha ramps over this many levels below WHITE (anti-aliased edge)
HOLE_PX = 1500   # an enclosed paper gap bigger than this (between staff and leg) is background, not white cloth
MERGE_PX = 5    # dilation that joins a figure's loose parts (hand, tool, hair) into one blob
# Cleaning (Bart 2026-11-05: white rings round gaps, a dashed outline). Figures only: on props, pale paint looks like a gap.
INK_LUM = 120        # darker than this is a drawn line, the walls of a region
GAP_MEDIAN_DE = 5.0  # a region whose median is this close to paper is a gap
PALE_DE = 8.0        # paper-coloured enough to go
GAP_PX = 300         # a gap the first pass never opened must be this big; smaller ones look like teeth: small_gaps() + extra_gaps
RING_PX = 60         # a region the first pass partly opened goes whole from this size
PEEL_PX, FRINGE_DE = 3, 30.0   # the pale halo: how far it is peeled, how pale
CRUMB_PX = 40        # bits the cleaning itself broke off
SMALL_GAP_PX = 12
SOLID_PX = 6          # how far from a known edge the cleaning stops


def to_lab(rgb: np.ndarray) -> np.ndarray:
    c = rgb.astype(np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]]).T
    f = xyz / np.array([0.95047, 1.0, 1.08883])
    f = np.where(f > 0.008856, np.cbrt(f), 7.787 * f + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def _regions(rgb: np.ndarray) -> dict:
    b = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    paper = np.median(b, axis=0).astype(np.uint8)
    de = np.linalg.norm(to_lab(rgb) - to_lab(paper.reshape(1, 3))[0], axis=-1)
    lum = rgb @ np.array([0.299, 0.587, 0.114])
    ink = lum < INK_LUM
    regs, n = ndi.label(~ndi.binary_dilation(ink, iterations=1))
    idx = np.arange(1, n + 1)
    return {'de': de, 'ink': ink, 'regs': regs, 'idx': idx, 'area': ndi.sum(regs > 0, regs, idx),
            'gap': (ndi.median(de, regs, idx) < GAP_MEDIAN_DE) & ((ndi.standard_deviation(lum, regs, idx) < 6) | (ndi.mean(de < PALE_DE, regs, idx) > 0.8)),
            'border': set(np.unique(np.concatenate([regs[0], regs[-1], regs[:, 0], regs[:, -1]]))) - {0}}


def _holes(r: dict, opened_mask: np.ndarray, extra_gaps, gap_px=GAP_PX) -> np.ndarray:
    opened = ndi.mean(opened_mask, r['regs'], r['idx'])
    out = opened_mask.copy()
    for i, o, a, g in zip(r['idx'], opened, r['area'], r['gap']):
        if g and i not in r['border'] and (a >= gap_px or (o > 0.02 and a >= RING_PX) or o > 0.5):
            out |= r['regs'] == i
    for x, y in extra_gaps:
        if r['regs'][y, x]:
            out |= r['regs'] == r['regs'][y, x]
    pale = np.isin(r['regs'], list(r['border'])) & (r['de'] < PALE_DE)
    lab, _ = ndi.label(pale | opened_mask)
    reach = np.unique(lab[opened_mask])
    out |= np.isin(lab, reach[reach > 0])
    return out | (ndi.binary_dilation(out, iterations=1) & ~r['ink'] & (r['de'] < 2 * PALE_DE))


def small_gaps(rgb: np.ndarray, outside: np.ndarray) -> list[tuple[int, int, int]]:
    """(x, y, px) of small enclosed paper spots left in. A script can't tell them from teeth: a person picks, extra_gaps cuts."""
    r = _regions(rgb)
    gone = _holes(r, outside, ())
    found = []
    for i, a, g in zip(r['idx'], r['area'], r['gap']):
        mask = r['regs'] == i
        if g and i not in r['border'] and a >= SMALL_GAP_PX and gone[mask].mean() <= 0.5:
            ys, xs = np.nonzero(mask)
            found.append((int(xs.mean()), int(ys.mean()), int(a)))
    return found


def clean_alpha(rgb: np.ndarray, a: np.ndarray, outside: np.ndarray, extra_gaps=(), gap_px=GAP_PX) -> np.ndarray:
    """Whole gaps out, no pale halo. Only paper-coloured pixels can go, so drops, rope and teeth stay. a only gets smaller."""
    r = _regions(rgb)
    out = np.minimum(a, 1 - ndi.gaussian_filter(_holes(r, outside, extra_gaps, gap_px).astype(np.float32), 0.6))
    near = ndi.distance_transform_edt(~r['ink']) <= PEEL_PX
    for _ in range(PEEL_PX):
        edge = (out > .1) & ndi.binary_dilation(out <= .1, iterations=1)
        peel = edge & ~r['ink'] & (r['de'] < FRINGE_DE) & near
        if not peel.any():
            break
        out[peel] = 0
    out = np.minimum(out, np.clip(ndi.gaussian_filter((out > .1).astype(np.float32), 0.5) * 1.6, 0, 1))
    now, n = ndi.label(out > .1)
    if n:
        was, _ = ndi.label(a > .1)
        sizes = ndi.sum(out > .1, now, np.arange(1, n + 1))
        for k in np.flatnonzero(sizes < CRUMB_PX) + 1:   # a piece that was already separate (a drop) stays
            ids = was[now == k]; ids = ids[ids > 0]
            if ids.size and ndi.sum(a > .1, was, np.bincount(ids).argmax()) > 4 * sizes[k - 1]:
                out[now == k] = 0
    return out


def cutout(rgb: np.ndarray, box, mine: np.ndarray, extra_gaps=(), seen_gaps=None) -> Image.Image:
    """seen_gaps: where the source itself is known see-through (a generator's transparency). With it, a near-white shirt can't be
    mistaken for a gap: only regions it opens go, nothing on size alone."""
    y0, y1, x0, x1 = box
    if green_key.is_green_sheet(rgb):
        clean, a = green_key.key(rgb[y0:y1, x0:x1])
        return Image.fromarray(np.dstack([clean, a * mine[y0:y1, x0:x1] * 255]).astype(np.uint8), 'RGBA')
    crop = rgb[y0:y1, x0:x1].astype(np.float32)
    mine = mine[y0:y1, x0:x1]
    dark = crop.min(axis=2)
    paper = dark > WHITE
    lab, _ = ndi.label(paper)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndi.sum(paper, lab, range(1, lab.max() + 1))
    big = {i + 1 for i, a in enumerate(sizes) if a > HOLE_PX} if seen_gaps is None else set()
    outside = np.isin(lab, list(border | big)) | ~mine   # paper that touches the crop edge or is a big hole; small white (eyes) stays
    inside = ~outside
    edge = ndi.binary_dilation(outside, iterations=3) & inside
    a = np.where(edge, np.clip((WHITE + 10 - dark) / SOFT * 1.0, 0, 1), inside.astype(np.float32))
    a = np.where(inside, np.maximum(a, 0), 0)
    a = ndi.gaussian_filter(a, 0.6) * inside
    if seen_gaps is None:
        a = clean_alpha(rgb[y0:y1, x0:x1], a, outside, extra_gaps)
    else:
        a = clean_alpha(rgb[y0:y1, x0:x1], a, outside | seen_gaps[y0:y1, x0:x1], extra_gaps, gap_px=10 ** 9)
        # An undrawn edge lets the paper test run into pale cloth; inside the source's solid area the cleaning has no say.
        a = np.maximum(a, ndi.binary_erosion(~seen_gaps[y0:y1, x0:x1], iterations=SOLID_PX, border_value=1).astype(a.dtype))
    edge = edge | ((a > 0) & (a < 1) & inside)
    # un-matte the white fringe: c = (c - 255 (1 - a)) / a on the soft edge
    af = np.clip(a, 0.05, 1)[..., None]
    col = np.where(edge[..., None], (crop - 255 * (1 - af)) / af, crop)
    out = np.dstack([np.clip(col, 0, 255), (a * 255)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def trim_box(im: Image.Image) -> tuple:
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 12)
    return (max(0, xs.min() - 2), max(0, ys.min() - 2), min(im.width, xs.max() + 3), ys.max() + 1)


def main(sheet: str, char: str, height_m: float, out_dir: str, poses: list[str] = POSES) -> None:
    if len(poses) not in (4, 8):
        sys.exit(f'{sheet}: need 4 (a 2x2 sheet) or 8 (a 4x2 sheet) pose names, got {len(poses)}')
    count, half = len(poses), len(poses) // 2
    rgb = np.array(Image.open(sheet).convert('RGB'))
    ink = green_key.key(rgb)[1] > 0.5 if green_key.is_green_sheet(rgb) else rgb.min(axis=2) <= WHITE
    blobs, n = ndi.label(ndi.binary_dilation(ink, iterations=MERGE_PX))
    areas = ndi.sum(ink, blobs, range(1, n + 1))
    order = np.argsort(areas)[::-1] + 1
    objs = ndi.find_objects(blobs)
    box = lambda k: (objs[k - 1][0].start, objs[k - 1][0].stop, objs[k - 1][1].start, objs[k - 1][1].stop)
    if n < count:
        sys.exit(f'{sheet}: only {n} figures found')
    seeds = {int(k): list(box(int(k))) for k in order[:count]}
    members = {k: [k] for k in seeds}
    for k in order[count:]:   # a loose piece (a raised hand, a tool tip) joins the nearest figure
        b = box(int(k))
        cx, cy = (b[2] + b[3]) / 2, (b[0] + b[1]) / 2
        near = min(seeds, key=lambda s: (max(seeds[s][2] - cx, 0, cx - seeds[s][3])) ** 2 + (max(seeds[s][0] - cy, 0, cy - seeds[s][1])) ** 2)
        members[near].append(int(k))
        seeds[near] = [min(seeds[near][0], b[0]), max(seeds[near][1], b[1]), min(seeds[near][2], b[2]), max(seeds[near][3], b[3])]
    boxes = [tuple(v) for v in seeds.values()]
    masks = [np.isin(blobs, members[k]) for k in seeds]
    paired = sorted(zip(boxes, masks), key=lambda p: (p[0][0] + p[0][1]) / 2)
    ordered_p = sorted(paired[:half], key=lambda p: p[0][2]) + sorted(paired[half:], key=lambda p: p[0][2])
    ordered = [p[0] for p in ordered_p]
    pad = 6
    imgs = [cutout(rgb, (max(0, b[0] - pad), min(rgb.shape[0], b[1] + pad), max(0, b[2] - pad), min(rgb.shape[1], b[3] + pad)), m) for b, m in ordered_p]
    px_per_m = (ordered[0][1] - ordered[0][0]) / height_m
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    entries = []
    for pose, im in zip(poses, imgs):
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
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4], sys.argv[5].split(',') if len(sys.argv) > 5 else POSES)
