#!/usr/bin/env python3
"""Cut a checked part sheet into a full-body puppet: legs and feet too (vault topics/character-bones/plan.md, 3.1).

In:  a sheet folder that rig_check.py passed: rest.png, map.png, under-a.png, under-b.png, map-b.png (all on one canvas).
Out: <name>.png (atlas) and <name>.json (bones.ts Puppet: bones with from, to and limit; parts back to front).

Every visible pixel is the rest drawing's own, so at rest the puppet IS the drawing. The joints are found, not drawn: each
is the middle of the border two parts share on the map; a hip, hidden under the tunic, sits one shin's length up the thigh
(a child's thigh and shin are about as long). Which way the figure faces comes from its feet (ankle to toe), never assumed.

Moho's cut-out overlap: a part that turns UNDER its neighbour gets a round end at its joint, painted from what the under
passes show there (or, for an elbow with nothing under the sleeve, its own mirror image), so a bend never opens a hole.
Hidden paint only goes where a part drawn above covers it at rest, so it can never change the drawing at rest.

usage: rig_parts.py SHEET_DIR OUT_DIR --name fig-ana-rig-01 --atlas-url fig-ana-rig-01.png
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import rig_check as rc
from rest_puppet import capsule, elbow_cap, elbow_of, pack

# Back to front. A child that turns under its parent comes first (forearm under the sleeve, foot under the shin, shin
# under the thigh); the skirt covers both thighs; the belt (with its tassels) stays with the hips, over the tunic, so a
# turned chest slides under it; the near arm hangs in front of the body, the far one behind it.
ORDER = [
    ('forearm_f', 'forearm_f'), ('upperarm_f', 'upperarm_f'), ('braid', 'braid'),
    ('foot_f', 'foot_f'), ('shin_f', 'shin_f'), ('thigh_f', 'thigh_f'),
    ('foot_n', 'foot_n'), ('shin_n', 'shin_n'), ('thigh_n', 'thigh_n'),
    ('skirt', 'hips'), ('chest', 'chest'), ('belt', 'hips'), ('shawl', 'chest'),
    ('forearm_n', 'forearm_n'), ('upperarm_n', 'upperarm_n'), ('neck', 'chest'), ('head', 'head'),
]
PARTS = [p for p, _ in ORDER]
PARENT = {'hips': None, 'chest': 'hips', 'head': 'chest', 'braid': 'head', 'upperarm_n': 'chest', 'upperarm_f': 'chest',
          'forearm_n': 'upperarm_n', 'forearm_f': 'upperarm_f', 'thigh_n': 'hips', 'thigh_f': 'hips',
          'shin_n': 'thigh_n', 'shin_f': 'thigh_f', 'foot_n': 'shin_n', 'foot_f': 'shin_f'}
# How far each bone turns from the drawing: degrees clockwise on screen for a figure facing right (bones.ts limitBone
# multiplies by facing). Clockwise swings a hanging limb to the left, which is BACK for a figure facing right: a knee
# folds positive, a thigh, an upper arm and an elbow swing forward negative, toes come up negative.
LIMIT = {'head': [-25, 25], 'chest': [-12, 12], 'braid': [-25, 25],
         'upperarm_n': [-150, 40], 'upperarm_f': [-150, 40], 'forearm_n': [-140, 5], 'forearm_f': [-140, 5],
         'thigh_n': [-80, 30], 'thigh_f': [-80, 30], 'shin_n': [0, 120], 'shin_f': [0, 120],
         'foot_n': [-30, 20], 'foot_f': [-30, 20]}

WAIST_BAND = 40          # px of tunic above the waist the skirt keeps under the chest
WAIST_ROWS = 12          # px: the top of the skirt that says where the waist is
THIGH_TO_SHIN = 1.2      # a thigh, hip to knee, is this many shins long (femur to tibia; joint to joint about the same)
HEAD_PIVOT = 0.2         # the head turns this share of its height above the collar: halfway up the neck
PARENT_CAP = 0.8         # a parent's round end of the rest drawing's own pixels: this share of half the joint's width,
                         # inside the limb, so no outline of the child is copied into it
CAP_MARGIN = 1.15        # a round end's radius, in half joint widths: a little past the edge, so its outline is under the parent
SLEEVE_MARGIN = 12       # px a hidden upper arm reaches past the sleeve's own half width
NECK_R = 0.9             # radius of the neck's hidden paint, in neck widths
BEHIND_ARM = 25          # px past the body's own outline that the tunic behind an arm may reach
FRINGE_REACH = 6         # px from the shawl that a sliver outside the tunic counts as fringe
NEAR_BRAID = 15          # px around the braid where the paint the near arm hides is the braid's
SWEEP_STEP = 5           # degrees between the poses the hole check bends a joint through
HOLE_PX = 4              # an opened gap bigger than this, near a joint, is a hole
HOLE_REACH = 0.4         # how far from a joint a hole counts, in joint widths: inside the limb (within the parent's round
                         # end), not its outline, which changes shape as an elbow or knee folds


def rgba_of(rgb, alpha):
    return np.dstack([rgb, (alpha * 255).round().astype(np.uint8)])


def load(folder):
    """The sheet's pictures on its one canvas, keyed, and its parts labelled as rig_check.py checked them."""
    at = lambda n: os.path.join(folder, n)
    keyed = {}
    for name in ('rest', 'under-a', 'under-b', 'under-c'):
        c, a = rc.keyed(rc.rgb_of(at(f'{name}.png')))
        keyed[name] = rgba_of(c, a)
    solid = keyed['rest'][..., 3] > rc.SOLID * 255
    labels, _ = rc.labels_of(rc.rgb_of(at('map.png')), rc.MAP_PARTS)
    labels = rc.absorb_islands(rc.clean_labels(labels, solid), islands=False)
    solid_b = keyed['under-b'][..., 3] > rc.SOLID * 255
    labels_b, _ = rc.labels_of(rc.rgb_of(at('map-b.png')), rc.MAP_B_PARTS)
    labels_b = rc.absorb_islands(rc.clean_labels(labels_b, solid_b), islands=False)
    return keyed, labels, labels_b


def owners(labels, labels_b):
    """Each visible pixel's part in PARTS, -1 in the air. The map's shin starts at the hem, but its top, above the knee
    map-b found, is thigh; the neck (below the head's pivot row) is split off in split_neck once the pivot is known."""
    out = np.full(labels.shape, -1)
    for i, name in enumerate(rc.MAP_PARTS):
        out[labels == i] = PARTS.index(name)
    for side in 'nf':
        above_knee = (out == PARTS.index(f'shin_{side}')) & (labels_b == rc.MAP_B_PARTS.index(f'thigh_{side}'))
        out[above_knee] = PARTS.index(f'thigh_{side}')
    return out


def fringe_slivers(own, keyed):
    """Tunic-coloured slivers between the shawl's fringe strands that lie outside the tunic under-c draws: they are the
    fringe's own look, not cloth behind it, and go with the shawl (else they float as pale streaks when it swings)."""
    out = own.copy()
    solid_c = keyed['under-c'][..., 3] > 127
    cloth = is_part(own, 'skirt', 'chest') & ~solid_c
    near_shawl = ndi.binary_dilation(is_part(own, 'shawl'), iterations=FRINGE_REACH)
    out[cloth & near_shawl] = PARTS.index('shawl')
    return out


def split_belt(own):
    out = own.copy()
    chest = out == PARTS.index('chest')   # the map's chest below the shawl is the belt and its tassels
    found, k = ndi.label(chest)
    if k > 1:
        biggest = 1 + int(np.argmax(ndi.sum(chest, found, range(1, k + 1))))
        out[chest & (found != biggest)] = PARTS.index('belt')
    return out


def is_part(own, *names):
    return np.isin(own, [PARTS.index(n) for n in names])


def axis_of(mask, start):
    """The main direction of a part's pixels, pointing away from `start` (its joint)."""
    ys, xs = np.where(mask)
    pts = np.stack([xs, ys], 1).astype(float)
    centre = pts.mean(0)
    _, vecs = np.linalg.eigh(np.cov((pts - centre).T))
    axis = vecs[:, -1]
    return axis if np.dot(centre - start, axis) >= 0 else -axis


def border(a, b):
    """(middle, width) of where part masks a and b touch; width across the child's own axis. None if they do not touch."""
    touch = a & ndi.binary_dilation(b)
    if touch.sum() < 3:
        return None
    ys, xs = np.where(touch)
    middle = np.array([xs.mean(), ys.mean()])
    ax = axis_of(a, middle)
    across = np.array([-ax[1], ax[0]])
    proj = (xs - middle[0]) * across[0] + (ys - middle[1]) * across[1]
    return middle, float(np.ptp(proj) + 1)


def far_end(mask, start):
    """The part's point furthest from its joint along its own axis: where a last bone points."""
    ys, xs = np.where(mask)
    ax = axis_of(mask, start)
    along = (xs - start[0]) * ax[0] + (ys - start[1]) * ax[1]
    i = along.argmax()
    return np.array([float(xs[i]), float(ys[i])])


def thickness(mask):
    """A limb's width: twice the furthest any of its pixels lies from its edge."""
    return float(2 * ndi.distance_transform_edt(mask).max())


def auto_joints(own, labels_b):
    """{bone: (pivot xy, joint width)} found on the map. Raises with the pair that does not touch.

    A pivot is where the bone really turns, which is not always the middle of the border on the map:
    - an elbow turns just inside the cuff (rest_puppet.elbow_of), the point its mirrored round end is made around;
    - a shoulder turns in the ball of the shoulder: half the arm's width down from the top of the upper arm (on the map
      the sleeve lies along the chest, so the border's middle is halfway down the sleeve);
    - the head turns halfway up the neck (HEAD_PIVOT of the head part above the collar), the chest at the waist;
    - a hip, hidden under the tunic, sits THIGH_TO_SHIN shin lengths up the thigh from the knee, along the thigh as
      map-b shows it whole."""
    m = lambda *n: is_part(own, *n)
    pairs = {'head': ('head', ('chest', 'shawl')), 'braid': ('braid', ('head',)),
             'shin_n': ('shin_n', ('thigh_n',)), 'shin_f': ('shin_f', ('thigh_f',)),
             'foot_n': ('foot_n', ('shin_n',)), 'foot_f': ('foot_f', ('shin_f',)),
             'forearm_n': ('forearm_n', ('upperarm_n',)), 'forearm_f': ('forearm_f', ('upperarm_f',))}
    joints = {}
    for bone, (child, parents) in pairs.items():
        found = border(m(child), m(*parents))
        if found is None:
            raise SystemExit(f'no joint for {bone}: {child} does not touch {"/".join(parents)} on the map')
        joints[bone] = found
    for side in 'nf':
        fore = m(f'forearm_{side}')
        start = joints[f'forearm_{side}'][0]
        pivot, half, _, _ = elbow_of(fore, start, far_end(fore, start))
        joints[f'forearm_{side}'] = (pivot, 2 * half)
        upper = m(f'upperarm_{side}')
        down = axis_of(upper, far_end(upper, pivot))       # from the top of the arm towards the elbow
        top = far_end(upper, pivot)
        width = thickness(upper)
        joints[f'upperarm_{side}'] = (top + down * width / 2, width)
        knee, kw = joints[f'shin_{side}']
        shin = np.linalg.norm(joints[f'foot_{side}'][0] - knee)
        whole_thigh = labels_b == rc.MAP_B_PARTS.index(f'thigh_{side}')
        joints[f'thigh_{side}'] = (knee + axis_of(whole_thigh, knee) * shin * THIGH_TO_SHIN, kw)
    # the chest turns at the waist: the middle of the skirt's top rows (its border with the chest runs down the tassels)
    skirt = m('skirt')
    found, k = ndi.label(skirt)   # its largest piece: a stray dot of skirt colour higher up must not say where the waist is
    if k > 1:
        skirt = found == (1 + int(np.argmax(ndi.sum(skirt, found, range(1, k + 1)))))
    ys, xs = np.where(skirt)
    top = ys < ys.min() + WAIST_ROWS
    joints['chest'] = (np.array([xs[top].mean(), ys[top].mean()]), float(np.ptp(xs[top]) + 1))
    high = min(joints['upperarm_n'][0][1], joints['upperarm_f'][0][1])
    for side in 'nf':   # a shoulder hidden under a shawl: up its own arm's line to the other shoulder's height
        pivot, width = joints[f'upperarm_{side}']
        if pivot[1] - high > width / 2:
            elbow = joints[f'forearm_{side}'][0]
            up = (pivot - elbow) / np.linalg.norm(pivot - elbow)
            joints[f'upperarm_{side}'] = (elbow + up * (elbow[1] - high) / -up[1], width)
    collar, nw = joints['head']
    head = m('head')
    up = axis_of(head, collar)
    reach = float(((np.stack(np.where(head)[::-1], 1) - collar) @ up).max())
    joints['head'] = (collar + up * reach * HEAD_PIVOT, nw)
    hips = (joints['thigh_n'][0] + joints['thigh_f'][0]) / 2
    joints['hips'] = (hips, float(np.linalg.norm(joints['thigh_n'][0] - joints['thigh_f'][0])) + joints['thigh_n'][1])
    return joints


def facing_of_feet(own, joints):
    """1 right, -1 left: from each ankle to its toe tip. The two feet must agree."""
    signs = []
    for side in 'nf':
        ankle = joints[f'foot_{side}'][0]
        toe = far_end(is_part(own, f'foot_{side}'), ankle)
        signs.append(int(np.sign(toe[0] - ankle[0])))
    if signs[0] != signs[1] or signs[0] == 0:
        raise SystemExit(f'the feet do not agree which way the figure faces: {signs}')
    return signs[0]


def split_neck(own, joints):
    """The head's pixels below its pivot row turn with the chest: the throat and collar never swing out with the jaw."""
    row = int(round(joints['head'][0][1]))
    neck = is_part(own, 'head')
    neck[:row] = False
    out = own.copy()
    out[neck] = PARTS.index('neck')
    return out


def tip_of(bone, joints, own):
    """Where a bone points: the joint of the bone hanging from it, else the far end of its part."""
    child = {'hips': 'chest', 'chest': 'head', 'upperarm_n': 'forearm_n', 'upperarm_f': 'forearm_f',
             'thigh_n': 'shin_n', 'thigh_f': 'shin_f', 'shin_n': 'foot_n', 'shin_f': 'foot_f'}.get(bone)
    if child and child != 'chest':
        return joints[child][0]
    if bone in ('hips', 'chest'):
        return joints['head'][0]
    part = 'skirt' if bone == 'hips' else bone
    return far_end(is_part(own, part), joints[bone][0])


def belt_band(own):
    """The rows of the rope round the waist (the belt part's rows wider than half its widest), and every column: where
    under-c's belt runs on behind the shawl."""
    belt = is_part(own, 'belt')
    band = np.zeros(own.shape, bool)
    if not belt.any():
        return band
    widths = belt.sum(axis=1)
    rows = np.where(widths > widths.max() / 2)[0]
    band[rows.min():rows.max() + 1] = True
    return band


def disc(shape, centre, r):
    return capsule(shape, centre, centre, r)


def hidden_paint(name, own, keyed, labels_b, joints):
    """(rgba source, mask) of what a part may take from under its neighbours. The caller keeps only pixels a part drawn
    above it covers at rest."""
    shape = own.shape
    a, b = keyed['under-a'], keyed['under-b']
    solid_a, solid_b = a[..., 3] > 127, b[..., 3] > 127
    m = lambda *n: is_part(own, *n)
    near_arm = m('upperarm_n', 'forearm_n')
    if name.startswith('upperarm_'):
        side = name[-1]
        sh, w = joints[name]
        region = capsule(shape, sh, joints[f'forearm_{side}'][0], w / 2 + SLEEVE_MARGIN) | disc(shape, sh, w / 2 * CAP_MARGIN)
        return b, region & solid_b
    if name.startswith('forearm_') or name == 'braid':
        cap = elbow_cap(keyed['rest'], m(name), joints[name][0], tip_of(name, joints, own))
        if name == 'braid':   # and the braid the near arm hides, as under-a shows it
            hidden = near_arm & (a[..., 3] > 127) & capsule(shape, joints['braid'][0], tip_of('braid', joints, own), thickness(m('braid')) / 2 + NEAR_BRAID)
            cap = np.where(hidden[..., None], a, cap)
        return cap, cap[..., 3] > 127
    c = keyed['under-c']
    solid_c = c[..., 3] > 127
    waist = int(round(joints['chest'][0][1]))
    above_waist = np.zeros(shape, bool)
    above_waist[:waist] = True
    braid_zone = capsule(shape, joints['braid'][0], tip_of('braid', joints, own), thickness(m('braid')) / 2 + NEAR_BRAID)
    behind_shawl = m('shawl') & solid_c
    band = belt_band(own)
    if name in ('chest', 'skirt'):
        rows = above_waist if name == 'chest' else ~above_waist
        src = np.where(near_arm[..., None] & solid_a[..., None], a, c)
        body = ndi.binary_dilation(m(name), iterations=BEHIND_ARM)   # under-a paints the tunic wider than she is
        return src, rows & ~band & ((near_arm & solid_a & ~braid_zone & body) | behind_shawl)
    if name == 'belt':
        return c, band & behind_shawl
    if name.startswith('thigh_'):
        return b, (labels_b == rc.MAP_B_PARTS.index(name)) & solid_b
    if name.startswith('shin_') or name.startswith('foot_'):
        side = name[-1]
        joint, w = joints[name]
        legs = np.isin(labels_b, [rc.MAP_B_PARTS.index(f'{p}_{side}') for p in ('thigh', 'shin', 'foot')])
        return b, disc(shape, joint, w / 2 * CAP_MARGIN) & legs & solid_b
    if name == 'neck':
        pivot, w = joints['head']
        cols = np.where(m('neck').any(axis=0))[0]
        within = np.zeros(shape, bool)
        if cols.size:
            within[:, cols.min():cols.max() + 1] = True
        return b, disc(shape, pivot, w * NECK_R) & solid_b & within
    return None, None


def cut(keyed, own, labels_b, joints):
    """[(part, bone, full-canvas rgba)], back to front. At rest they compose to the rest drawing exactly."""
    rest = keyed['rest']
    solid = rest[..., 3] > rc.SOLID * 255
    out = []
    for i, (name, bone) in enumerate(ORDER):
        layer = np.zeros_like(rest)
        mine = own == i
        layer[mine] = rest[mine]
        src, region = hidden_paint(name, own, keyed, labels_b, joints)
        if src is not None:
            covered = solid & np.isin(own, list(range(i + 1, len(ORDER))))   # only under what is drawn above it
            take = region & covered & ~mine
            layer[take] = src[take]
        out.append((name, bone, layer))
    return parent_caps(out, own, joints)


# The layer that holds a parent's round end at each joint.
# None at a shoulder: an upper arm turns at the body's edge, and what it uncovers is the tunic (hidden paint) or air.
PARENT_LAYER = {'chest': 'skirt', 'head': 'neck', 'braid': 'head',
                'forearm_n': 'upperarm_n', 'forearm_f': 'upperarm_f', 'thigh_n': 'skirt', 'thigh_f': 'skirt',
                'shin_n': 'thigh_n', 'shin_f': 'thigh_f', 'foot_n': 'shin_n', 'foot_f': 'shin_f'}


def parent_caps(layers, own, joints):
    """Each parent keeps a round end of the rest drawing's own pixels inside the joint, where it has no paint yet. They
    are the very pixels the child shows there at rest, so the drawing cannot change; bent, the parent's disc stays and the
    child's turns round it, and together they cover the joint at any angle."""
    by_name = {name: i for i, (name, _, _) in enumerate(layers)}
    rest_px = compose(layers)
    out = [(n, b, rgba.copy()) for n, b, rgba in layers]
    for bone, holder in PARENT_LAYER.items():
        if bone not in joints or holder not in by_name:
            continue
        pivot, width = joints[bone]
        moving = [p for p, b in ORDER if b in set(children_of(bone))]
        region = disc(own.shape, pivot, width / 2 * PARENT_CAP) & is_part(own, *moving)
        rgba = out[by_name[holder]][2]
        take = region & (rgba[..., 3] == 0)
        rgba[take] = rest_px[take]
    # the waist is wide: the skirt also keeps a band of the tunic just above it, across the body, so a leaning chest never
    # pulls the tunic off the belt (Moho's lower body painted a little higher, under the upper body)
    if 'chest' not in joints or 'skirt' not in by_name:
        return out
    pivot, _ = joints['chest']
    band = np.zeros(own.shape, bool)
    band[max(0, int(pivot[1]) - WAIST_BAND):int(pivot[1])] = True
    skirt = out[by_name['skirt']][2]
    take = band & is_part(own, 'chest') & (skirt[..., 3] == 0)
    skirt[take] = rest_px[take]
    return out


def compose(layers):
    canvas = np.zeros_like(layers[0][2])
    for _, _, rgba in layers:
        on = rgba[..., 3] > 0
        canvas[on] = rgba[on]
    return canvas


def children_of(bone):
    found = [bone]
    for b, p in PARENT.items():
        if p == bone:
            found += children_of(b)
    return found


HINGES = {'forearm_n', 'forearm_f', 'shin_n', 'shin_f', 'foot_n', 'foot_f'}   # an elbow, a knee, an ankle: any gap shows


def holes_bending(layers, joints, bone, facing):
    """The biggest gap (px) that opens AT a joint while it bends through its limits: pixels within HOLE_REACH joint widths
    of the pivot that were drawing at rest and are see-through bent. Only there: further out, a limb that swings away
    leaves its own place empty, and a limb folded across the body encloses air; neither is a hole."""
    moving = set(children_of(bone))
    pivot, width = joints[bone]
    shape = layers[0][2].shape[:2]
    near = disc(shape, pivot, width * HOLE_REACH)
    still = np.zeros(shape, bool)
    union0 = np.zeros(shape, bool)
    for _, b, rgba in layers:
        solid = rgba[..., 3] > 127
        union0 |= solid
        if b not in moving:
            still |= solid
    worst = 0
    lo, hi = LIMIT.get(bone, [0, 0])
    for deg in range(lo, hi + 1, SWEEP_STEP):
        union = still.copy()
        for _, b, rgba in layers:
            if b in moving:
                img = Image.fromarray(rgba[..., 3]).rotate(-deg * facing, resample=Image.BILINEAR, center=tuple(pivot))
                union |= np.asarray(img) > 127
        opened = union0 & ~union & near
        if bone not in HINGES:   # a ball joint at the body's edge may leave air where the limb was: only a gap inside counts
            opened &= ndi.binary_fill_holes(union)
        if opened.any():
            found, k = ndi.label(opened)
            worst = max(worst, int(ndi.sum(opened, found, range(1, k + 1)).max()))
    return worst


def bone_order():
    """Bones root first, so a parent is placed before what hangs from it."""
    done, todo = [], ['hips']
    while todo:
        b = todo.pop(0)
        done.append(b)
        todo += [c for c, p in PARENT.items() if p == b]
    return done


def posed(layers, joints, pose, facing):
    """The figure in a pose {bone: degrees clockwise on screen, for a figure facing right}, as rgba: each part turned
    with its bone and every bone above it, round each joint where it has been carried to."""
    world = {}
    for bone in bone_order():
        parent = PARENT[bone]
        m = world[parent] if parent else np.eye(3)
        px, py = (m @ [*joints[bone][0], 1])[:2]
        a = np.radians(pose.get(bone, 0) * facing)
        c, s_ = np.cos(a), np.sin(a)
        turn = np.array([[c, -s_, px - c * px + s_ * py], [s_, c, py - s_ * px - c * py], [0, 0, 1]])
        world[bone] = turn @ m
    canvas = Image.new('RGBA', layers[0][2].shape[1::-1], (0, 0, 0, 0))
    for _, bone, rgba in layers:
        inv = np.linalg.inv(world[bone])
        img = Image.fromarray(rgba).transform(canvas.size, Image.AFFINE, tuple(inv[:2].ravel()), resample=Image.BILINEAR)
        canvas.alpha_composite(img)
    return np.asarray(canvas)


def puppet_json(layers, joints, facing, own, size, atlas_url):
    atlas, boxes, placed = pack([(bone, rgba) for _, bone, rgba in layers])
    aw, ah = atlas.shape[1], atlas.shape[0]
    bones = []
    for bone, parent in PARENT.items():
        entry = {'name': bone, 'parent': parent, 'from': [round(float(v), 2) for v in joints[bone][0]],
                 'to': [round(float(v), 2) for v in tip_of(bone, joints, own)]}
        if bone in LIMIT:
            entry['limit'] = LIMIT[bone]
        bones.append(entry)
    quads = [{'bone': bone, 'quad': [[int(x0), int(y0)], [int(x1), int(y0)], [int(x1), int(y1)], [int(x0), int(y1)]],
              'uv': [ax / aw, ay / ah, (ax + x1 - x0) / aw, (ay + y1 - y0) / ah]}
             for (bone, x0, y0, x1, y1), (ax, ay) in zip(boxes, placed)]
    return atlas, {'atlas': atlas_url, 'width': size[1], 'height': size[0], 'facing': facing, 'bones': bones, 'parts': quads}


def run(folder, out_dir, name, atlas_url):
    keyed, labels, labels_b = load(folder)
    own = split_belt(fringe_slivers(owners(labels, labels_b), keyed))
    joints = auto_joints(own, labels_b)
    own = split_neck(own, joints)
    facing = facing_of_feet(own, joints)
    layers = cut(keyed, own, labels_b, joints)
    rest = keyed['rest']
    visible = rest[..., 3] > rc.SOLID * 255
    drawn = compose(layers)
    differ = int(((np.abs(drawn.astype(int) - rest).sum(-1) > 0) & visible).sum())
    holes = {bone: holes_bending(layers, joints, bone, facing) for bone in LIMIT}
    atlas, puppet = puppet_json(layers, joints, facing, own, rest.shape[:2], atlas_url)
    os.makedirs(out_dir, exist_ok=True)
    Image.fromarray(atlas).save(os.path.join(out_dir, f'{name}.png'))
    with open(os.path.join(out_dir, f'{name}.json'), 'w') as f:
        json.dump(puppet, f, indent=1)
    report = {'facing': facing, 'differ_at_rest': differ, 'visible': int(visible.sum()), 'holes': holes,
              'atlas': list(atlas.shape[:2]), 'parts': len(puppet['parts'])}
    with open(os.path.join(out_dir, f'{name}.check.json'), 'w') as f:
        json.dump(report, f, indent=1)
    print(f'{name}: facing {facing}, {len(puppet["parts"])} parts, atlas {atlas.shape[1]}x{atlas.shape[0]}')
    print(f'{"PASS" if differ == 0 else "FAIL"}  at rest {differ} of {int(visible.sum())} visible px differ from the drawing')
    for bone, px in holes.items():
        print(f'{"PASS" if px <= HOLE_PX else "FAIL"}  {bone} bent through {LIMIT[bone]}: biggest gap {px} px')
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('folder')
    ap.add_argument('out_dir')
    ap.add_argument('--name', default='puppet')
    ap.add_argument('--atlas-url', required=True)
    args = ap.parse_args()
    report = run(args.folder, args.out_dir, args.name, args.atlas_url)
    sys.exit(0 if report['differ_at_rest'] == 0 and all(v <= HOLE_PX for v in report['holes'].values()) else 1)


if __name__ == '__main__':
    main()
