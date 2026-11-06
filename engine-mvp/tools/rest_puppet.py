#!/usr/bin/env python3
"""Cut one rest drawing into a rigid upper-body puppet (bones.ts bindPuppet), so nothing bends like rubber.

In:  the rest drawing (cut-out), its flat colour part map on the same canvas, the same drawing with the waistcoat off
     (only what the drawing hides is taken from it), and the joints in the drawing's px.
Out: an atlas and a puppet json. Every visible pixel is the rest drawing's own, so at rest it IS the drawing.

Parts, back to front: the far arm, the legs (they never move: legs come from drawn poses), the near arm, the neck, the head,
the chest. So a near hand swings in front of the breeches and a far one behind them; the chest stays on top because the sleeves
go on under the waistcoat, so a near hand stops at its edge (bones.ts safe).
Hidden parts come from the waistcoat-off picture: the sleeves up to the shoulder, the waistband, the neck. A forearm has
nothing painted under its cuff, so a round cap of its own mirror image fills the outside of a bent elbow.

usage: rest_puppet.py REST.png MAP.png UNDER.png OUT_DIR --atlas-url /storage/.../pieter-rigid.png
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

SOLID = 10
ATLAS_MARGIN = 16        # px of air around a part on the atlas, so its edge never samples a neighbour
SKIN = 45                # red above blue by this much, and bright: skin, not linen
INK = 110                # darker than this on average: a drawn line
LINEN_PATCH = 150        # px: a pale patch this big is sleeve (the folds of a rolled cuff); smaller, a fingernail
BROWN = 70               # red above blue by this much: waistcoat, not linen
EDGE = 14                # px from where two parts meet that a pixel may change sides by its colour
CUFF_INK = 3             # a line this much nearer to the skin than the sleeve still counts as the cuff's
PAPER = 225              # every channel at least this: paper left around a cut-out
ELBOW_INSIDE = 18        # px inside the cuff that a forearm turns around
NECK = 80                # radius of the neck's hidden part
SLEEVE_MARGIN = 14       # px a sleeve's hidden part reaches past the sleeve's own width
WAISTBAND = 120          # px of the breeches' hidden top above the waistcoat's hem
EDGE_THREAD = 4          # px: thinner than twice this, a bit of the chest at a sleeve is not the waistcoat's
SHIRT_FRONT = 2500       # px: a linen patch on the chest this big is the shirt front, smaller at a sleeve is the sleeve's

COLOURS = {'arm_f': (0, 0, 255), 'arm_n': (255, 0, 0), 'leg_f': (255, 255, 0), 'leg_n': (0, 255, 0), 'chest': (0, 255, 255), 'head': (255, 0, 255)}


def labels_of(map_rgb, solid):
    """Each solid pixel's part: the nearest colour on the map, -1 in the air."""
    names = list(COLOURS)
    colours = np.array([COLOURS[n] for n in names], float)
    d = ((map_rgb[..., None, :] - colours) ** 2).sum(axis=-1)
    return names, np.where(solid, d.argmin(axis=-1), -1)


def whole_parts(masks):
    """A part is one piece: a stray speck on the map joins the part nearest to it, so no part spans the whole figure."""
    kept, strays = {}, np.zeros_like(next(iter(masks.values())))
    for name, m in masks.items():
        found, n = ndimage.label(m)
        if n == 0:
            kept[name] = m
            continue
        largest = found == (int(np.argmax(ndimage.sum(m, found, range(1, n + 1)))) + 1)
        kept[name] = largest
        strays |= m & ~largest
    names = list(kept)
    far = np.stack([ndimage.distance_transform_edt(~kept[n]) for n in names])
    nearest = far.argmin(axis=0)
    return {n: kept[n] | (strays & (nearest == i)) for i, n in enumerate(names)}


def true_edge(rgba, arm, chest):
    """The map's border between a sleeve and the waistcoat only roughly follows the drawn edge: near it, each pixel goes by
    its colour, waistcoat brown to the chest and linen to the arm. Moved around an arm it would show as a jagged edge."""
    r, b = rgba[..., 0].astype(int), rgba[..., 2].astype(int)
    light = rgba[..., :3].mean(axis=-1)
    brown = (r - b > BROWN) & (light < 190)
    linen = (r - b <= BROWN) & (light >= 170)
    to_chest = arm & brown & (ndimage.distance_transform_edt(~chest) <= EDGE)
    to_arm = chest & linen & (ndimage.distance_transform_edt(~arm) <= EDGE)
    return (arm & ~to_chest) | to_arm, (chest & ~to_arm) | to_chest


def loose_linen(rgba, arm, chest):
    """Scraps of a sleeve's linen the map left on the chest, along the waistcoat's edge: left behind when the arm lifts. A small
    pale patch close to the arm goes with the arm; the shirt front in the waistcoat's opening is big, and stays."""
    r, b = rgba[..., 0].astype(int), rgba[..., 2].astype(int)
    pale = chest & (r - b <= BROWN) & (rgba[..., :3].mean(axis=-1) >= 170)
    found, n = ndimage.label(pale)
    if n == 0:
        return arm, chest
    near = np.unique(found[ndimage.distance_transform_edt(~arm) <= 2 * EDGE])
    sizes = ndimage.sum(pale, found, range(1, n + 1))
    scraps = np.isin(found, [i for i in near if i > 0 and sizes[i - 1] < SHIRT_FRONT])
    chest = chest & ~scraps
    # and the ink specks and threads the map left at that edge: what only hangs on to the waistcoat by a thread
    thin = chest & ~ndimage.binary_opening(chest, iterations=EDGE_THREAD) & (ndimage.distance_transform_edt(~(arm | scraps)) <= 2 * EDGE)
    return arm | scraps | thin, chest & ~thin


def facing_of(legs):
    """Which way the figure looks, from its feet: a shoe reaches past the ankle towards the toes."""
    ys, _ = np.where(legs)
    top, bottom = ys.min(), ys.max()
    h = bottom - top
    ankle = legs[int(bottom - h * 0.2):int(bottom - h * 0.12)]
    shoe = legs[int(bottom - h * 0.06):bottom + 1]
    return 1 if np.where(shoe)[1].mean() >= np.where(ankle)[1].mean() else -1


def sizeable(mask):
    """The pieces of a mask of at least LINEN_PATCH px."""
    found, n = ndimage.label(mask)
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, found, range(1, n + 1))
    return np.isin(found, np.where(sizes >= LINEN_PATCH)[0] + 1)


def biggest(mask):
    """The largest connected piece of a mask."""
    found, n = ndimage.label(mask)
    if n == 0:
        return mask
    return found == (int(np.argmax(ndimage.sum(mask, found, range(1, n + 1)))) + 1)


def paper_flecks(rgba, part, above):
    """White left around the hair by an old white-paper cut-out: paper-white above row `above` that touches the air.
    White inside (an eye) stays, and so does the shirt below the chin."""
    white = part & (rgba[..., :3].min(axis=-1) >= PAPER)
    white[above:] = False
    found, n = ndimage.label(white)
    if n == 0:
        return white
    air = ndimage.binary_dilation(rgba[..., 3] <= SOLID, iterations=2)
    touching = np.unique(found[air & white])
    return np.isin(found, touching[touching > 0])


def capsule(shape, a, b, radius):
    """The px within `radius` of the segment a-b."""
    yy, xx = np.mgrid[:shape[0], :shape[1]]
    ab = np.array(b, float) - a
    t = np.clip(((xx - a[0]) * ab[0] + (yy - a[1]) * ab[1]) / max((ab ** 2).sum(), 1e-6), 0, 1)
    return np.hypot(xx - a[0] - ab[0] * t, yy - a[1] - ab[1] * t) <= radius


def split_arm(rgba, arm):
    """An arm's forearm: the biggest patch of skin. Every sizeable patch of linen is the sleeve, and everything else in the arm
    (a finger past a line, a drawn line itself) goes with whichever is nearer. A tie stays on the sleeve: the cuff keeps its ink."""
    r, b = rgba[..., 0].astype(int), rgba[..., 2].astype(int)
    light = rgba[..., :3].mean(axis=-1) >= INK
    skin = biggest(ndimage.binary_opening(arm & light & (r - b > SKIN) & (r > 120), iterations=2))
    linen = sizeable(ndimage.binary_opening(arm & light & (r - b <= SKIN), iterations=1))
    if not skin.any():
        return np.zeros_like(arm)
    if not linen.any():
        return arm.copy()
    return arm & (ndimage.distance_transform_edt(~skin) + CUFF_INK < ndimage.distance_transform_edt(~linen))


def elbow_of(part, frm, to):
    """Where a forearm turns: just inside the cuff, on the middle of the line where it comes out, and how wide it is there.
    A cuff that reached far past this point would hang off the elbow, so the drawn joint only gives the direction."""
    axis = np.array(to, float) - frm
    axis /= np.hypot(*axis)
    ys, xs = np.where(part)
    along = (xs - frm[0]) * axis[0] + (ys - frm[1]) * axis[1]
    start = np.percentile(along, 2)
    top = along <= start + 12
    centre = np.array([xs[top].mean(), ys[top].mean()])
    across = (xs[top] - centre[0]) * -axis[1] + (ys[top] - centre[1]) * axis[0]
    return centre - axis * ELBOW_INSIDE, float(np.percentile(np.abs(across), 95)), axis, start


def elbow_cap(rgba, part, frm, to):
    """What fills the outside of a bent elbow: the forearm mirrored back across where it comes out, a round cap around the
    elbow. Being round it stays under the cuff at any angle, where a straight stub would poke out the far side."""
    pivot, radius, axis, start = elbow_of(part, frm, to)
    yy, xx = np.mgrid[:part.shape[0], :part.shape[1]]
    s = (xx - frm[0]) * axis[0] + (yy - frm[1]) * axis[1] - start
    near = (s < 0) & (np.hypot(xx - pivot[0], yy - pivot[1]) <= radius)
    mx = np.rint(xx + (-2 * s) * axis[0]).astype(int).clip(0, part.shape[1] - 1)
    my = np.rint(yy + (-2 * s) * axis[1]).astype(int).clip(0, part.shape[0] - 1)
    out = np.zeros_like(rgba)
    take = near & part[my, mx]
    out[take] = rgba[my[take], mx[take]]
    return out


def layered(*sources):
    """Later sources show only where the earlier ones are see-through. Each source: (rgba, mask)."""
    out = np.zeros_like(sources[0][0])
    for rgba, mask in reversed(sources):
        out[mask] = rgba[mask]
    return out


def cut(rest, parts_map, under, joints):
    """The parts as full-canvas RGBA pictures, back to front, each with its bone; the way the figure faces; where its elbows are."""
    solid = rest[..., 3] > SOLID
    names, labels = labels_of(parts_map[..., :3].astype(float), solid)
    mask = whole_parts({n: labels == names.index(n) for n in names})
    for arm in ('arm_f', 'arm_n'):
        mask[arm], mask['chest'] = true_edge(rest, mask[arm], mask['chest'])
        mask[arm], mask['chest'] = loose_linen(rest, mask[arm], mask['chest'])
    under_solid = under[..., 3] > SOLID
    legs = mask['leg_f'] | mask['leg_n']
    j = {x['name']: x for x in joints}
    arms, elbows = {'f': [], 'n': []}, {}
    for side in ('f', 'n'):
        arm = mask[f'arm_{side}']
        fore = split_arm(rest, arm)
        fore_joint = j[f'forearm_{side}']
        cap = elbow_cap(rest, fore, fore_joint['from'], fore_joint['to'])
        elbows[f'forearm_{side}'] = elbow_of(fore, fore_joint['from'], fore_joint['to'])[0].round(2).tolist()
        arms[side].append((f'forearm_{side}', layered((rest, fore), (cap, cap[..., 3] > SOLID))))
        upper_joint = j[f'upperarm_{side}']
        sleeve = arm & ~fore
        width = 2 * np.percentile(ndimage.distance_transform_edt(sleeve)[sleeve], 95) if sleeve.any() else 40
        hidden = capsule(solid.shape, upper_joint['from'], upper_joint['to'], width / 2 + SLEEVE_MARGIN) & under_solid & mask['chest']
        arms[side].append((f'upperarm_{side}', layered((rest, sleeve), (under, hidden))))
    hem = np.where(mask['chest'].any(axis=1))[0].max()
    waist = np.zeros_like(solid)
    waist[hem - WAISTBAND:hem + 1] = True
    out = [*arms['f'], ('hips', layered((rest, legs), (under, waist & under_solid & mask['chest']))), *arms['n']]
    pivot_row = int(j['head']['from'][1])
    # what lies under the turning point stays with the chest: the throat and the shirt's V. The head turning above it opens no
    # hole in the collar, and no skin swings out at the jaw
    below = np.zeros_like(solid)
    below[pivot_row:] = True
    around = capsule(solid.shape, j['head']['from'], j['head']['from'], NECK) & under_solid
    out.append(('neck', layered((rest, mask['head'] & below), (under, around & (mask['head'] | mask['chest'])))))
    out.append(('head', layered((rest, mask['head'] & ~below & ~paper_flecks(rest, mask['head'], pivot_row)),)))
    out.append(('chest', layered((rest, mask['chest']),)))
    return out, facing_of(legs), elbows


def pack(parts):
    """Each part cropped onto one atlas at the drawing's own scale, in shelves. Returns the atlas and each part's box."""
    boxes = []
    for bone, rgba in parts:
        ys, xs = np.where(rgba[..., 3] > 0)
        boxes.append((bone, xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    width = max(2048, 2 * max(b[3] - b[1] for b in boxes) + 3 * ATLAS_MARGIN)   # wide: school tablets top out at 4096 tall
    x, y, shelf, placed = ATLAS_MARGIN, ATLAS_MARGIN, 0, []
    for box in boxes:
        w, h = box[3] - box[1], box[4] - box[2]
        if x + w + ATLAS_MARGIN > width:
            x, y, shelf = ATLAS_MARGIN, y + shelf + ATLAS_MARGIN, 0
        placed.append((x, y))
        x, shelf = x + w + ATLAS_MARGIN, max(shelf, h)
    atlas = np.zeros((y + shelf + ATLAS_MARGIN, width, 4), 'uint8')
    for (bone, rgba), box, (ax, ay) in zip(parts, boxes, placed):
        _, x0, y0, x1, y1 = box
        atlas[ay:ay + y1 - y0, ax:ax + x1 - x0] = rgba[y0:y1, x0:x1]
    return atlas, boxes, placed


def puppet_of(parts, joints, facing, elbows, size, atlas_url):
    atlas, boxes, placed = pack(parts)
    aw, ah = atlas.shape[1], atlas.shape[0]
    used = {x['name']: x for x in joints}
    bones = [{'name': 'hips', 'parent': None, 'from': used['chest']['from']}, {'name': 'chest', 'parent': 'hips', 'from': used['chest']['from']}]
    for name in ('head', 'upperarm_n', 'upperarm_f'):
        bones.append({'name': name, 'parent': 'chest', 'from': used[name]['from']})
    for side in ('n', 'f'):
        bones.append({'name': f'forearm_{side}', 'parent': f'upperarm_{side}', 'from': elbows[f'forearm_{side}']})
    quads = []
    for (bone, x0, y0, x1, y1), (ax, ay) in zip(boxes, placed):
        quads.append({
            'bone': 'chest' if bone == 'neck' else bone, 'quad': [[int(x0), int(y0)], [int(x1), int(y0)], [int(x1), int(y1)], [int(x0), int(y1)]],
            'uv': [ax / aw, ay / ah, (ax + x1 - x0) / aw, (ay + y1 - y0) / ah],
        })
    return atlas, {'atlas': atlas_url, 'width': size[1], 'height': size[0], 'facing': facing, 'bones': bones, 'parts': quads}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('rest')
    ap.add_argument('map')
    ap.add_argument('under')
    ap.add_argument('out_dir')
    ap.add_argument('--joints', required=True, help='json: the rest drawing\'s joints in its px (the `rig` of a layer)')
    ap.add_argument('--atlas-url', required=True)
    ap.add_argument('--name', default='puppet')
    args = ap.parse_args()
    rest = np.asarray(Image.open(args.rest).convert('RGBA'))
    size = rest.shape[:2]
    resized = lambda p, mode, how: np.asarray(Image.open(p).convert(mode).resize((size[1], size[0]), how))
    parts_map, under = resized(args.map, 'RGBA', Image.NEAREST), resized(args.under, 'RGBA', Image.LANCZOS)
    with open(args.joints) as f:
        joints = json.load(f)
    parts, facing, elbows = cut(rest, parts_map, under, joints)
    atlas, puppet = puppet_of(parts, joints, facing, elbows, size, args.atlas_url)
    visible = rest[..., 3] > SOLID
    drawn = np.zeros_like(rest)
    for _, rgba in parts:
        drawn[rgba[..., 3] > 0] = rgba[rgba[..., 3] > 0]
    changed = (np.abs(drawn.astype(int) - rest).sum(axis=-1) > 0) & visible
    print(f'at rest {int(changed.sum())} of {int(visible.sum())} visible px differ from the drawing')
    os.makedirs(args.out_dir, exist_ok=True)
    Image.fromarray(atlas).save(os.path.join(args.out_dir, f'{args.name}.png'))
    with open(os.path.join(args.out_dir, f'{args.name}.json'), 'w') as f:
        json.dump(puppet, f, indent=1)
    print(f'{args.name}: atlas {atlas.shape[1]}x{atlas.shape[0]}, {len(puppet["parts"])} parts, facing {facing}')


if __name__ == '__main__':
    main()
