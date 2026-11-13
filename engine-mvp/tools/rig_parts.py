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
from rest_puppet import capsule, pack

# Back to front. A child that turns under its parent comes first (forearm under the sleeve, foot under the shin, shin
# under the thigh); the skirt covers both thighs; the belt (with its tassels) stays with the hips, over the tunic, so a
# turned chest slides under it; the near arm hangs in front of the body, the far one behind it, and in front of the neck
# and head too: drawn under the collar, a raised near arm seemed to grow out of her throat (fresh tester, 11-13).
ORDER = [
    ('forearm_f', 'forearm_f'), ('upperarm_f', 'upperarm_f'), ('braid', 'braid'),
    ('foot_f', 'foot_f'), ('shin_f', 'shin_f'), ('thigh_f', 'thigh_f'),
    ('foot_n', 'foot_n'), ('shin_n', 'shin_n'), ('thigh_n', 'thigh_n'),
    ('skirt', 'hips'), ('chest', 'chest'), ('belt', 'hips'), ('shawl', 'chest'),
    ('neck', 'chest'), ('head', 'head'), ('forearm_n', 'forearm_n'), ('upperarm_n', 'upperarm_n'),
]
PARTS = [p for p, _ in ORDER]
PARENT = {'hips': None, 'chest': 'hips', 'head': 'chest', 'braid': 'head', 'upperarm_n': 'chest', 'upperarm_f': 'chest',
          'forearm_n': 'upperarm_n', 'forearm_f': 'upperarm_f', 'thigh_n': 'hips', 'thigh_f': 'hips',
          'shin_n': 'thigh_n', 'shin_f': 'thigh_f', 'foot_n': 'shin_n', 'foot_f': 'shin_f'}
# How far each bone turns from the drawing: degrees clockwise on screen for a figure facing right (bones.ts limitBone
# multiplies by facing). Clockwise swings a hanging limb to the left, which is BACK for a figure facing right: a knee
# folds positive, a thigh, an upper arm and an elbow swing forward negative, toes come up negative.
LIMIT = {'head': [-25, 25], 'chest': [-8, 8], 'braid': [-20, 20],
         'upperarm_n': [-120, 25], 'upperarm_f': [-20, 20], 'forearm_n': [-120, 0], 'forearm_f': [-120, 0],
         # a thigh swung further shows the under-tunic's straight hem from under the rigid skirt: the skirt that follows
         # the thigh is phase 3 (smart bones); a walk swings about 18
         'thigh_n': [-25, 20], 'thigh_f': [-25, 20], 'shin_n': [0, 120], 'shin_f': [0, 120],
         'foot_n': [-30, 20], 'foot_f': [-30, 20]}

WAIST_BEND = 30          # px either side of the waist across which the tunic bends with a leaning chest
BAND_SHARE = {'upperarm_n': 0.5, 'upperarm_f': 0.5, 'forearm_n': 0.5, 'forearm_f': 0.5, 'thigh_n': 0.5, 'thigh_f': 0.5,
              'shin_n': 0.5, 'shin_f': 0.5, 'braid': 0.5}   # of the joint's width
ANKLE_BAND = 0.35        # an ankle's band, as a share of the knee's width
ANKLE_WIDTH = 0.75       # an ankle's thickness, as a share of the knee's width
WAIST_REACH = 2000       # px round the waist that its band bends: everything, so the whole hanging end of the shawl
                         # moves as one with the hips (at 300 its tip went with the chest and sheared it: tester)
SHOULDER_REACH = 0.55    # a shoulder's band reaches this share of the arm's width round the joint
REACH_MARGIN = 6         # px past a band's corners that its reach goes
WAIST_BAND = 40          # px of tunic above the waist the skirt keeps under the chest
WAIST_ROWS = 12          # px: the top of the skirt that says where the waist is
THIGH_TO_SHIN = 1.2      # a thigh, hip to knee, is this many shins long (femur to tibia; joint to joint about the same)
JAW_STEP = 3             # px either side of a row over which the head part's narrowing is measured
JAW_MARGIN = 4           # px under the jaw where the head and neck are cut
BRAID_CAP = 0.6          # the braid's round end on the head, as a share of a full one: deep in the hair, so swung it leaves no mark
PARENT_CAP = 0.8         # a parent's round end of the rest drawing's own pixels: this share of half the joint's width,
                         # inside the limb, so no outline of the child is copied into it
EDGE_LUM = 140           # a line under-a draws in the tunic behind an arm: brown ink, lighter than the outline's black
FRINGE_SOFTEN = 3.0      # px of blur on a sleeve's own colour carried in under the shawl
BLEED_PX = 2             # px of the drawing a part carries past its edge, hidden under the part above
TONE_MIN_PX = 500        # a part needs this many of its own pixels in an under pass too, to tone that pass to it
TONE_GAIN_MAX = 1.5      # how far a channel's spread may be stretched or squeezed to match
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
    for i, name in enumerate(rc.MAP_B_PARTS):   # a leg on map-b is one piece: a loose dot of its colour is not leg
        if name == 'other':
            continue
        found, k = ndi.label(labels_b == i)
        if k > 1:
            main = 1 + int(np.argmax(ndi.sum(labels_b == i, found, range(1, k + 1))))
            labels_b[(labels_b == i) & (found != main)] = rc.MAP_B_PARTS.index('other')
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


CLOTH = ('skirt', 'chest', 'belt', 'shawl')


def stray_pieces(own):
    """A small loose piece of a part (under SPECK_PX, not its main piece) joins the part it mostly touches: a blend dot of
    a foot's colour on the chest would turn with the foot and stretch the foot's box so its handle stands at the chest.
    It stays where it is when it touches nothing (a wisp of hair in the air) and, for cloth, when what it touches is
    cloth: tunic showing between the shawl's fringe strands is tunic. (Moved with the shawl it swung as pale strands;
    left on the skirt it showed as cream patches until the hidden tunic around it was toned to the drawing.)"""
    out = own.copy()
    for i, name in enumerate(PARTS):
        mask = own == i
        if not mask.any():
            continue
        found, k = ndi.label(mask)
        if k < 2:
            continue
        sizes = ndi.sum(mask, found, range(1, k + 1))
        main = 1 + int(np.argmax(sizes))
        for piece_id in np.flatnonzero(sizes < rc.SPECK_PX) + 1:
            if piece_id == main:
                continue
            piece = found == piece_id
            ring = own[ndi.binary_dilation(piece) & ~piece]
            ring = ring[(ring >= 0) & (ring != i)]
            if not ring.size:
                continue
            values, counts = np.unique(ring, return_counts=True)
            neighbour = int(values[counts.argmax()])
            if name in CLOTH and PARTS[neighbour] in CLOTH:
                continue
            if PARTS[neighbour] == 'shawl':   # a sleeve showing between fringe strands is sleeve: it goes with the arm
                continue
            out[piece] = neighbour
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
        pivot = joints[f'forearm_{side}'][0]   # the elbow, where the map splits the arm (Ana's sleeve ends above it)
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
    pivot, jaw, split, cols = neck_band(m('head'), collar)
    joints['head'] = (pivot, nw)
    joints['neck_split'] = (np.array([float(cols[0]), float(split)]), float(cols[1] - cols[0] + 1))   # x: first neck column
    joints['jaw'] = (np.array([float(cols[1]), float(jaw)]), 0.0)                                     # x: last neck column
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


def neck_band(head, collar):
    """(pivot, jaw row, split row, (first, last) neck column) from the head part's row widths. The jaw is where the
    rows narrow most sharply, from the face to the neck (Ana: 123 to 98 px across rows 266-272); looked for between the
    middle of the head and the collar, whose V-neck tapers the part too. The head turns halfway down the neck, and the
    head and neck are cut just under the jaw: cut at the pivot, the bottom of the chin stayed with the neck and a turned
    head showed two chins (Bart, 11-13)."""
    widths = head.sum(axis=1).astype(float)
    rows = np.where(widths > 0)[0]
    top, bottom = int(rows.min()), min(int(rows.max()), int(collar[1]))
    span = np.arange((top + bottom) // 2, bottom - JAW_STEP * 3)
    drop = widths[span - JAW_STEP] - widths[span + JAW_STEP]
    jaw = int(span[np.argmax(drop)]) + JAW_STEP
    split = jaw + JAW_MARGIN
    neck_rows = np.arange(split, max(split + 1, bottom - JAW_STEP * 2))
    narrowest = int(neck_rows[np.argmin(widths[neck_rows])])
    xs = np.where(head[narrowest])[0]
    pivot = np.array([(xs.min() + xs.max()) / 2, (split + bottom) / 2])
    return pivot, jaw, split, (int(xs.min()), int(xs.max()))


def split_neck(own, joints):
    """The head's pixels under the jaw turn with the chest: the throat and collar never swing out with the head."""
    row = int(round(joints['neck_split'][0][1]))
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


def mirror_cap(rgba, part, pivot, width):
    """A round end for a part with nothing painted under its joint (an elbow under a short sleeve, the braid's root):
    the part mirrored back across its joint, kept within a disc of the joint's width round the pivot. It turns under
    the parent with the part, so a bend shows skin, not a hole."""
    out = np.zeros_like(rgba)
    if not part.any():
        return out
    into = axis_of(part, pivot)   # from the joint into the part
    ys, xs = np.mgrid[:part.shape[0], :part.shape[1]]
    s = (xs - pivot[0]) * into[0] + (ys - pivot[1]) * into[1]
    behind = (s < 0) & (np.hypot(xs - pivot[0], ys - pivot[1]) <= width / 2 * CAP_MARGIN)
    mx = np.rint(xs - 2 * s * into[0]).astype(int).clip(0, part.shape[1] - 1)
    my = np.rint(ys - 2 * s * into[1]).astype(int).clip(0, part.shape[0] - 1)
    take = behind & part[my, mx]
    out[take] = rgba[my[take], mx[take]]
    return out


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
    if (name.startswith(('forearm_', 'shin_', 'foot_')) or name == 'braid') and band_of(name, joints):
        return None, None   # a joint that bends (smart bones) needs no rigid round end: it showed through as a ring
    if name.startswith('forearm_') or name == 'braid':
        cap = mirror_cap(keyed['rest'], m(name), *joints[name])
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
    if name == 'neck':   # the throat under-b shows, under the jaw only: under-b's chin would stay as a second chin
        pivot, w = joints['head']
        jaw = int(joints['jaw'][0][1])
        within = np.zeros(shape, bool)
        within[jaw + JAW_MARGIN // 2:, int(joints['neck_split'][0][0]):int(joints['jaw'][0][0]) + 1] = True
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
            layer[take] = tone_matched(src, keyed['rest'], mine, take)
            if name.startswith('upperarm_'):
                layer = own_colour_under_fringe(layer, take & is_part(own, 'shawl'), mine)
            if name in ('chest', 'skirt'):
                layer = without_drawn_edges(layer, take & is_part(own, 'upperarm_n', 'forearm_n'))
        # a 2 px bleed of the drawing past the part's edge, under the parts above: at a part's edge the stage samples
        # the atlas half a pixel into its empty margin, and a hairline showed along every join of a bending joint
        # (the part's OWN edge colour carried outward: copying the drawing there put the shawl's fringe into the sleeve
        # and the dress, which showed as a pale band of tassels when they moved apart: fresh tester, 11-13)
        above = solid & np.isin(own, list(range(i + 1, len(ORDER))))
        bleed = ndi.binary_dilation(mine, iterations=BLEED_PX) & ~mine & above & (layer[..., 3] == 0)
        if bleed.any() and mine.any():
            iy, ix = ndi.distance_transform_edt(~mine, return_distances=False, return_indices=True)
            layer[bleed] = rest[iy[bleed], ix[bleed]]
        out.append((name, bone, layer))
    return parent_caps(out, own, joints)


# The layer that holds a parent's round end at each joint.
# None at a shoulder: an upper arm turns at the body's edge, and what it uncovers is the tunic (hidden paint) or air.
# The braid's is half size, deep in the hair: full size, its root's pixels stayed on the shoulder as a dark mark when it
# swung (fresh tester, 11-13).
# None at an elbow or the neck: the copied disc lies above the child, and stayed as a pale bump under a folded elbow
# and as a second chin under a turned head (Bart, 11-13); the child's own round end, under the parent, covers those.
PARENT_LAYER = {'chest': 'skirt', 'braid': 'head', 'thigh_n': 'skirt', 'thigh_f': 'skirt',
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
        region = disc(own.shape, pivot, width / 2 * PARENT_CAP * (BRAID_CAP if bone == 'braid' else 1)) & is_part(own, *moving)
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


def own_colour_under_fringe(layer, area, mine):
    """A sleeve's hidden paint under the shawl, made of the sleeve's own colour: each pixel the nearest of the
    sleeve's own plain cloth (never its outline's ink, which made a brown smear), softened. Under-b's sleeve there, next to the sleeve's own pieces between the strands, made a pattern
    of the fringe that went up with a raised arm (fresh tester, 11-13)."""
    plain = mine & (layer[..., :3].astype(float) @ np.array([0.299, 0.587, 0.114]) > EDGE_LUM)   # cloth, not its ink
    if not area.any() or not plain.any():
        return layer
    out = layer.copy()
    iy, ix = ndi.distance_transform_edt(~plain, return_distances=False, return_indices=True)
    filled = layer[iy, ix].astype(float)
    soft = np.dstack([ndi.gaussian_filter(filled[..., c], FRINGE_SOFTEN) for c in range(3)])
    out[area, :3] = soft[area].clip(0, 255).astype(np.uint8)
    out[area, 3] = 255
    return out


def tone_matched(src, rest, mine, take):
    """The hidden paint for `take`, toned to the part's own drawing. ChatGPT paints its under passes a shade lighter
    (Ana's under-b re-inked the sleeves lighter), and where hidden paint meets the drawing that shows as pale patches in
    the shape of the fringe (fresh tester, 11-13). Each channel's mean and spread on the part's own pixels, where the
    under pass has paint too, are matched to the drawing's."""
    out = src[take].astype(float)
    both = mine & (src[..., 3] > 127)
    if both.sum() >= TONE_MIN_PX:
        a, b = src[both][:, :3].astype(float), rest[both][:, :3].astype(float)
        gain = np.clip(b.std(0) / np.maximum(a.std(0), 1e-3), 1 / TONE_GAIN_MAX, TONE_GAIN_MAX)
        out[:, :3] = (out[:, :3] - a.mean(0)) * gain + b.mean(0)
    return out.clip(0, 255).astype(np.uint8)


def without_drawn_edges(layer, area):
    """The tunic under-a paints behind an arm, without the armhole edge it draws there: that line stood as a strip
    under a raised arm (fresh tester, 11-13). Each ink pixel takes the colour of the nearest unlined pixel of the area."""
    ink = area & (layer[..., :3].astype(float) @ np.array([0.299, 0.587, 0.114]) < EDGE_LUM)
    plain = area & ~ink
    if not ink.any() or not plain.any():
        return layer
    out = layer.copy()
    iy, ix = ndi.distance_transform_edt(~plain, return_distances=False, return_indices=True)
    out[ink] = layer[iy[ink], ix[ink]]
    return out


def round_ends(own, joints):
    """A thigh ends round at the knee and a shin at the ankle, as Moho's cut-outs do: the parent's pixels near the joint
    outside a disc of the joint's width go to the child, which is drawn under it, so at rest nothing changes. A square
    end showed as a cut corner behind a bent knee (fresh tester, 11-13)."""
    out = own.copy()
    ys, xs = np.mgrid[:own.shape[0], :own.shape[1]]
    for parent, child in (('thigh_n', 'shin_n'), ('thigh_f', 'shin_f'), ('shin_n', 'foot_n'), ('shin_f', 'foot_f')):
        if child not in joints:
            continue
        pivot, width = joints[child]
        child_mask = is_part(own, child)
        if not child_mask.any():
            continue
        towards = axis_of(child_mask, pivot)   # from the joint into the child
        along = (xs - pivot[0]) * towards[0] + (ys - pivot[1]) * towards[1]
        far = np.hypot(xs - pivot[0], ys - pivot[1]) > width / 2
        out[is_part(own, parent) & (along > -width / 2) & far] = PARTS.index(child)
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


def band_of(bone, joints):
    """px either side of a joint across which the parts bend (engine smart-bones.ts), or None for rigid parts. The neck
    bends from the cut under the jaw down past the pivot, so the face stays rigid; a limb's joint over half its width."""
    if bone == 'head':
        return float(joints['head'][0][1] - joints['neck_split'][0][1])
    if bone == 'chest':
        return WAIST_BEND
    if bone.startswith('foot_'):   # the map's foot/shin border is short; the ankle is about as thick as a third of the knee
        return joints[f'shin_{bone[-1]}'][1] * ANKLE_BAND
    if bone in BAND_SHARE:
        return joints[bone][1] * BAND_SHARE[bone]
    return None


def reach_of(bone, joints, band):
    """px round a joint that its band bends: the joint's cross-section and the band's corners. A shoulder keeps to
    about half the arm's width, so the tunic round the armhole bends with a raised arm and the shawl does not."""
    if bone == 'chest':   # the shawl hangs far below the waist: it bends there with a lean instead of swinging rigidly
        return WAIST_REACH
    width = float(joints['neck_split'][1]) if bone == 'head' else joints[bone][1]
    if bone.startswith('foot_'):
        width = joints[f'shin_{bone[-1]}'][1] * ANKLE_WIDTH
    if bone.startswith('upperarm_'):
        # (the shawl blended with the far arm kinked into a zigzag: its band keeps to the arm too. The shawl that drapes
        # over a raised far arm needs a drawing of it there; until then that arm swings 20 degrees, a walk's swing)
        return width * SHOULDER_REACH
    return float(np.hypot(width / 2, band)) + REACH_MARGIN


def puppet_json(layers, joints, facing, own, size, atlas_url):
    atlas, boxes, placed = pack([(bone, rgba) for _, bone, rgba in layers])
    aw, ah = atlas.shape[1], atlas.shape[0]
    bones = []
    for bone, parent in PARENT.items():
        entry = {'name': bone, 'parent': parent, 'from': [round(float(v), 2) for v in joints[bone][0]],
                 'to': [round(float(v), 2) for v in tip_of(bone, joints, own)]}
        if bone in LIMIT:
            entry['limit'] = LIMIT[bone]
        band = band_of(bone, joints)
        if band:
            entry['band'] = round(band, 1)
            entry['reach'] = round(reach_of(bone, joints, band), 1)
        bones.append(entry)
    quads = [{'bone': bone, 'quad': [[int(x0), int(y0)], [int(x1), int(y0)], [int(x1), int(y1)], [int(x0), int(y1)]],
              'uv': [ax / aw, ay / ah, (ax + x1 - x0) / aw, (ay + y1 - y0) / ah]}
             for (bone, x0, y0, x1, y1), (ax, ay) in zip(boxes, placed)]
    return atlas, {'atlas': atlas_url, 'width': size[1], 'height': size[0], 'facing': facing, 'bones': bones, 'parts': quads}


def run(folder, out_dir, name, atlas_url):
    keyed, labels, labels_b = load(folder)
    own = stray_pieces(split_belt(fringe_slivers(owners(labels, labels_b), keyed)))
    joints = auto_joints(own, labels_b)
    own = split_neck(round_ends(own, joints), joints)
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
              'bands': {b: band_of(b, joints) for b in LIMIT},
              'atlas': list(atlas.shape[:2]), 'parts': len(puppet['parts'])}
    with open(os.path.join(out_dir, f'{name}.check.json'), 'w') as f:
        json.dump(report, f, indent=1)
    print(f'{name}: facing {facing}, {len(puppet["parts"])} parts, atlas {atlas.shape[1]}x{atlas.shape[0]}')
    print(f'{"PASS" if differ == 0 else "FAIL"}  at rest {differ} of {int(visible.sum())} visible px differ from the drawing')
    for bone, px in holes.items():
        if band_of(bone, joints):   # the engine bends these parts across the joint (smart bones): a rigid sweep says little
            print(f'INFO  {bone} bends across a {band_of(bone, joints):.0f} px band; turned rigidly its gap would be {px} px')
        else:
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
    rigid = {b: v for b, v in report['holes'].items() if not report['bands'].get(b)}
    sys.exit(0 if report['differ_at_rest'] == 0 and all(v <= HOLE_PX for v in rigid.values()) else 1)


if __name__ == '__main__':
    main()
