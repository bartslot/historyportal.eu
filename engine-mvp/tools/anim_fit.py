#!/usr/bin/env python3
"""
The fit pass of the animation preset pipeline (anim_director.md): ChatGPT's key poses in, a clip the stage plays out.

    python3 anim_fit.py anim_raw/*.json --out ../../resources/animations/clips

A raw clip (anim_raw/<id>.json, what ChatGPT answered, hand-tuned where it was wrong):
    {"id": "walk", "loop": true, "duration": 1.1, "travel": true,
     "keys": [{"t": 0, "contact": "both", "bones": {"thigh_n": -22, ...}, "lift": 0, "face": "neutral"}, ...]}
  t 0..1 through the clip; contact: which feet stand on the ground then ("n", "f", "both", "none"); lift: body heights
  the body is off the ground (a jump), measured from standing; face: an expression id (optional); rot: degrees the
  whole body tips over about its feet, clockwise on screen facing right (a fall: the joints stay inside their limits,
  the body goes down), with a negative lift to drop it further.

What the fit corrects, on the standard skeleton (Ana's flat rig, facing right), before a key is written:
  - every turn inside what the rigs can do (RIG_LIMIT), knees and elbows by the posing rules (pose-guard.ts,
    ~/.claude/rules/posing.md): a knee never bends backwards, an elbow folds to the front, a raised thigh keeps its knee
    in front of the hip. A wrong turn is mirrored; still wrong, it is dropped.
  - a foot on the ground is flat and does not slide: the hips move (dx) and sink (bob) so the planted ankle stays where
    it landed; a second planted foot is reached by bending its leg (two-bone IK), never by sliding it.
  - a loop ends on the pose it starts with; a clip that does not travel ends where it started.
Out: resources/animations/clips/<id>.json, keys in the stage's own fields ({t, "bone:<name>": deg, dx, bob, rot?, face?}),
dx and bob in body heights (the stage scales them by the figure's height, presets.js / AnimationPresets.php).
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

from rig_parts import LIMIT

# Ana's flat rig (fig-ana-flat-rig-01), picture px, y down, facing right: the standard skeleton every rig shares by name
SKELETON: dict[str, tuple[str | None, tuple[float, float], tuple[float, float]]] = {
    'hips': (None, (507.47, 820.06), (494.0, 302.0)),
    'chest': ('hips', (551.39, 646.86), (494.0, 302.0)),
    'head': ('chest', (494.0, 302.0), (459.0, 33.0)),
    'braid': ('head', (413.55, 209.62), (255.0, 716.0)),
    'upperarm_n': ('chest', (383.53, 399.83), (336.5, 610.38)),
    'upperarm_f': ('chest', (629.06, 399.83), (677.11, 611.97)),
    'forearm_n': ('upperarm_n', (336.5, 610.38), (277.0, 926.0)),
    'forearm_f': ('upperarm_f', (677.11, 611.97), (756.0, 915.0)),
    'thigh_n': ('hips', (411.97, 805.32), (421.99, 1136.24)),
    'thigh_f': ('hips', (602.97, 834.8), (557.27, 1134.53)),
    'shin_n': ('thigh_n', (421.99, 1136.24), (394.5, 1410.75)),
    'shin_f': ('thigh_f', (557.27, 1134.53), (546.0, 1386.93)),
    'foot_n': ('shin_n', (394.5, 1410.75), (499.0, 1508.0)),
    'foot_f': ('shin_f', (546.0, 1386.93), (697.0, 1477.0)),
}
HEIGHT_PX = 1508.0 - 33.0   # head top to sole: one body height
MOVABLE = [b for b in SKELETON if b != 'hips']   # the hips never turn (bones.ts joints)

# How far each bone turns, degrees clockwise on screen from the drawn pose, facing right: the rigs' own limits
# (rig_parts.py LIMIT, which Ana's flat rig and the Character tab's kit bodies carry). The stage clamps every turn to them
# (bones.ts limitBone), so a clip fitted in a wider range would play clamped, its hips sunk for knees that never bend
# (fresh tester 11-15: Ana buried to the hip in pick up). Fitted inside them, what plays is what was fitted.
RIG_LIMIT: dict[str, tuple[float, float]] = {b: (float(lo), float(hi)) for b, (lo, hi) in LIMIT.items()}
STRAIGHT_DEG = 3.0       # pose-guard.ts STRAIGHT_DEG
RAISED_THIGH_DEG = 45.0  # pose-guard.ts RAISED_THIGH_DEG
FORWARD = 1              # the standard skeleton faces right
REACH_TRIES = 24         # rounds of moving the hips towards a foot the legs cannot reach
AIR_CLEAR = 0.04         # body heights both feet stay above the floor in a key that is off the ground
CONTACTS = {'n': ('n',), 'f': ('f',), 'both': ('n', 'f'), 'none': ()}
# the expressions a figure's head can show (Puppet.faces, the Character tab's kits); a raw clip's other words map onto them
FACES = ('calm', 'curious', 'sad', 'angry', 'amazed')
FACE_ALIAS = {'neutral': 'calm', 'smile': 'calm', 'happy': 'calm', 'talk': 'calm', 'think': 'curious',
              'laugh': 'amazed', 'surprised': 'amazed', 'worried': 'sad', 'tired': 'sad', 'proud': 'calm'}

Pt = tuple[float, float]


def range_of(bone: str) -> tuple[float, float]:
    return RIG_LIMIT[bone]


# ── forward kinematics, the same sums as Rigby2D's Pose (a bone's turn adds to its parent's) ────────────────────────

def rot(p: Pt, deg: float) -> Pt:
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return (c * p[0] - s * p[1], s * p[0] + c * p[1])   # y down: positive turns clockwise on screen


def world(bones: dict[str, float]) -> dict[str, tuple[Pt, float]]:
    """Each bone's joint where it stands now, and its total turn, with the hips at rest."""
    out: dict[str, tuple[Pt, float]] = {}
    for name, (parent, start, _) in SKELETON.items():
        if parent is None:
            out[name] = (start, bones.get(name, 0.0))
            continue
        (pat, pturn), pstart = out[parent], SKELETON[parent][1]
        off = rot((start[0] - pstart[0], start[1] - pstart[1]), pturn)
        out[name] = ((pat[0] + off[0], pat[1] + off[1]), pturn + bones.get(name, 0.0))
    return out


def point(bones: dict[str, float], bone: str, p: Pt, w: dict | None = None) -> Pt:
    """A point of the drawing, carried by its bone."""
    (at, turn), start = (w or world(bones))[bone], SKELETON[bone][1]
    off = rot((p[0] - start[0], p[1] - start[1]), turn)
    return (at[0] + off[0], at[1] + off[1])


def joints(bones: dict[str, float], side: str) -> dict[str, Pt]:
    w = world(bones)
    return {
        'hip': w[f'thigh_{side}'][0], 'knee': w[f'shin_{side}'][0], 'ankle': w[f'foot_{side}'][0],
        'toe': point(bones, f'foot_{side}', SKELETON[f'foot_{side}'][2], w),
        'shoulder': w[f'upperarm_{side}'][0], 'elbow': w[f'forearm_{side}'][0],
        'hand': point(bones, f'forearm_{side}', SKELETON[f'forearm_{side}'][2], w),
    }


# ── the posing rules (pose-guard.ts) ─────────────────────────────────────────────────────────────────────────────────

def bend_of(a: Pt, joint: Pt, b: Pt) -> float:
    u, v = (joint[0] - a[0], joint[1] - a[1]), (b[0] - joint[0], b[1] - joint[1])
    return math.degrees(math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]))


def knee_is_right(hip: Pt, knee: Pt, ankle: Pt) -> bool:
    bend = bend_of(hip, knee, ankle)
    return abs(bend) < STRAIGHT_DEG or math.copysign(1, bend) == FORWARD


def elbow_is_right(shoulder: Pt, elbow: Pt, hand: Pt) -> bool:
    bend = bend_of(shoulder, elbow, hand)
    return abs(bend) < STRAIGHT_DEG or math.copysign(1, bend) == -FORWARD


def knee_in_front(hip: Pt, knee: Pt) -> bool:
    from_down = math.degrees(math.atan2(abs(knee[0] - hip[0]), knee[1] - hip[1]))
    return from_down < RAISED_THIGH_DEG or math.copysign(1, knee[0] - hip[0]) == FORWARD


def guarded(bones: dict[str, float]) -> tuple[dict[str, float], list[str]]:
    """The pose with every limb bending the right way (a wrong turn mirrored, still wrong dropped) and every turn inside
    what a body can do; and what was changed."""
    out = {b: float(bones.get(b, 0.0)) for b in MOVABLE}
    notes: list[str] = []

    def fix(bone: str, ok) -> None:
        if ok(out):
            return
        was = out[bone]
        out[bone] = -was
        if not ok(out):
            out[bone] = 0.0
        notes.append(f'{bone} {was:.0f}->{out[bone]:.0f} (posing rule)')

    for side in 'nf':
        fix(f'thigh_{side}', lambda b, s=side: knee_in_front(*(lambda j: (j['hip'], j['knee']))(joints(b, s))))
        fix(f'shin_{side}', lambda b, s=side: knee_ok(b, s))
        fix(f'forearm_{side}', lambda b, s=side: elbow_ok(b, s))
    for b in MOVABLE:
        lo, hi = range_of(b)
        if not lo <= out[b] <= hi:
            notes.append(f'{b} clamped {out[b]:.0f}->{min(max(out[b], lo), hi):.0f}')
            out[b] = min(max(out[b], lo), hi)
    return out, notes


def limb_bend(bones: dict[str, float], side: str, kind: str) -> float:
    j = joints(bones, side)
    return bend_of(j['hip'], j['knee'], j['ankle']) if kind == 'knee' else bend_of(j['shoulder'], j['elbow'], j['hand'])


def knee_ok(bones: dict[str, float], side: str) -> bool:
    """A knee bends forward of the drawing's own bend (or is straight): the shin swings back."""
    rel = limb_bend(bones, side, 'knee') - limb_bend({}, side, 'knee')
    j = joints(bones, side)
    return knee_is_right(j['hip'], j['knee'], j['ankle']) or abs(rel) < STRAIGHT_DEG or math.copysign(1, rel) == FORWARD


def elbow_ok(bones: dict[str, float], side: str) -> bool:
    """An elbow folds to the front of the body, compared with the drawing's own bend."""
    rel = limb_bend(bones, side, 'elbow') - limb_bend({}, side, 'elbow')
    j = joints(bones, side)
    return elbow_is_right(j['shoulder'], j['elbow'], j['hand']) or abs(rel) < STRAIGHT_DEG or math.copysign(1, rel) == -FORWARD


# ── feet on the ground ───────────────────────────────────────────────────────────────────────────────────────────────

def flat_foot(bones: dict[str, float], side: str) -> dict[str, float]:
    """The foot turned back to the angle it is drawn at, so its sole lies on the floor."""
    lo, hi = range_of(f'foot_{side}')
    return {**bones, f'foot_{side}': min(max(-(bones[f'thigh_{side}'] + bones[f'shin_{side}']), lo), hi)}


def angle(v: Pt) -> float:
    return math.degrees(math.atan2(v[1], v[0]))


def wrap(deg: float) -> float:
    return (deg + 180.0) % 360.0 - 180.0


def reach(bones: dict[str, float], side: str, target: Pt) -> dict[str, float]:
    """Two-bone IK: thigh and shin turned so the ankle lands on `target` (hips at rest), the knee bending the right way."""
    _, hip, knee0 = SKELETON[f'thigh_{side}']
    ankle0 = SKELETON[f'shin_{side}'][2]
    l1, l2 = math.dist(hip, knee0), math.dist(knee0, ankle0)
    d = min(max(math.dist(hip, target), abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3)
    base = angle((target[0] - hip[0], target[1] - hip[1]))
    a = math.degrees(math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))
    clamp = lambda b, v: min(max(v, range_of(b)[0]), range_of(b)[1])   # the rig's limits: a reach past them falls short
    ranked = []
    for sign in (1, -1):
        th = math.radians(base + sign * a)
        knee = (hip[0] + l1 * math.cos(th), hip[1] + l1 * math.sin(th))
        thigh = wrap(math.degrees(th) - angle((knee0[0] - hip[0], knee0[1] - hip[1])))
        shin = wrap(angle((target[0] - knee[0], target[1] - knee[1])) - angle((ankle0[0] - knee0[0], ankle0[1] - knee0[1])) - thigh)
        free = {**bones, f'thigh_{side}': thigh, f'shin_{side}': shin}
        held = {**bones, f'thigh_{side}': clamp(f'thigh_{side}', thigh), f'shin_{side}': clamp(f'shin_{side}', shin)}
        # the knee judged on the bend the IK found (a clamp can hide a backwards knee), then the one that lands nearest
        ranked.append((not knee_ok(free, side), math.dist(joints(held, side)['ankle'], target), sign, held))
    return flat_foot(min(ranked)[3], side)


def fit(raw: dict) -> tuple[dict, dict]:
    """A raw clip → (the clip the stage plays, a report of what was corrected)."""
    keys = sorted(raw['keys'], key=lambda k: k['t'])
    if raw.get('loop'):   # a loop ends on its first pose
        keys = [k for k in keys if k['t'] < 1 - 1e-6] + [{**keys[0], 't': 1.0}]
    notes: list[str] = []
    poses = []
    for k in keys:
        pose, why = guarded({b: float(v) for b, v in k.get('bones', {}).items() if b in SKELETON})
        notes += [f"t={k['t']}: {n}" for n in why]
        for side in CONTACTS[k.get('contact', 'both')]:
            pose = flat_foot(pose, side)
        poses.append(pose)

    ground = {s: SKELETON[f'foot_{s}'][1][1] for s in 'nf'}   # a flat foot's ankle stands at its drawn height
    travels = bool(raw.get('travel'))
    hips: list[Pt | None] = [None] * len(keys)
    planted: dict[str, Pt] = {}
    for i, k in enumerate(keys):
        feet = CONTACTS[k.get('contact', 'both')]
        held = [s for s in feet if s in planted]
        if held:   # the hips follow the foot that stays put
            nat = joints(poses[i], held[0])['ankle']
            hips[i] = (planted[held[0]][0] - nat[0], planted[held[0]][1] - nat[1])
        elif feet:   # landing: the hips drop so the foot meets the floor, and stay where they were across
            s = feet[0]
            nat = joints(poses[i], s)['ankle']
            prev = next((h for h in reversed(hips[:i]) if h is not None), (0.0, 0.0))
            hips[i] = (prev[0], ground[s] - nat[1])
        # a foot that stays put is reached by bending its leg, at the place it has; one that lands now lands where its leg
        # reaches, on the floor. A foot the rig's limits cannot reach brings the hips towards it (down, for a landing
        # foot), and the legs bend again. What the feet reach is where they stand from now on.
        if hips[i] is not None and feet:
            landing = {s: joints(poses[i], s)['ankle'][0] for s in feet if s not in planted}
            for n in range(REACH_TRIES):
                hx, hy = hips[i]
                gaps = []
                for s in feet:
                    want = planted[s] if s in planted else (landing[s] + hx, ground[s])
                    poses[i] = reach(poses[i], s, (want[0] - hx, want[1] - hy))
                    got = joints(poses[i], s)['ankle']
                    gap = (want[0] - got[0] - hx, want[1] - got[1] - hy)
                    gaps.append(gap if s in planted else (0.0, gap[1]))
                worst = max(gaps, key=lambda g: math.hypot(*g))
                if math.hypot(*worst) <= 0.5 or n == REACH_TRIES - 1:
                    break   # the last round keeps the hips its legs were bent for
                hips[i] = (hx + worst[0], hy + worst[1])
            hx, hy = hips[i]
            planted.update({s: (joints(poses[i], s)['ankle'][0] + hx, joints(poses[i], s)['ankle'][1] + hy) for s in feet})
        for s in [s for s in planted if s not in feet]:
            del planted[s]

    if raw.get('loop') and hips[-1] is not None:   # the seam: the last pose IS the first, carried on by the foot that stays put
        held = [s for s in CONTACTS[keys[-2].get('contact', 'both')] if s in CONTACTS[keys[-1].get('contact', 'both')]]
        before = poses[-1]
        poses[-1] = dict(poses[0])
        if held:
            nat, was = joints(poses[-1], held[0])['ankle'], joints(before, held[0])['ankle']
            hips[-1] = (hips[-1][0] + was[0] - nat[0], hips[-1][1] + was[1] - nat[1])

    # in the air: across between the keys either side, lifted by `lift`
    grounded = [i for i, h in enumerate(hips) if h is not None] or [0]
    if hips[0] is None:
        hips[0] = (0.0, 0.0)
    for i, h in enumerate(hips):
        if h is not None:
            continue
        a = max([g for g in grounded if g < i], default=0)
        b = min([g for g in grounded if g > i], default=a)
        ha, hb = hips[a] or (0.0, 0.0), hips[b] or hips[a] or (0.0, 0.0)
        u = 0.0 if b == a else (keys[i]['t'] - keys[a]['t']) / (keys[b]['t'] - keys[a]['t'])
        # off the ground the hips are measured from standing, not from the crouches either side: a jump's lift is
        # height above where it stood (PM 11-15: the jump barely left the ground)
        hips[i] = (ha[0] + (hb[0] - ha[0]) * u, 0.0)

    dx = [h[0] - hips[0][0] for h in hips]
    if travels:   # a walk never steps back: a rear foot past what its leg reaches pushes off instead (fresh tester 11-15)
        dx = [max(dx[:i + 1]) for i in range(len(dx))]
    # the hips' height is measured from standing (the layer's own y), not from the first key: a clip that starts
    # sitting starts low
    dy = [h[1] - float(k.get('lift', 0)) * HEIGHT_PX for h, k in zip(hips, keys)]
    # standing still: a clip that does not travel ends where it started (the drift spread over it)
    if raw.get('loop') and not raw.get('travel'):
        dx = [x - dx[-1] * k['t'] for x, k in zip(dx, keys)]
    if raw.get('loop'):
        dy = [y - (dy[-1] - dy[0]) * k['t'] for y, k in zip(dy, keys)]
    # nothing goes through the floor: a foot that cannot lie flat (its turn at the end of its range) lifts the body; a
    # key in the air keeps both feet clear of it. A key that tips the whole body over (`rot`, a fall) turns about the
    # feet, so the drawing's floor no longer applies there.
    def floor(p: dict, y: float, k: dict) -> float:
        if k.get('rot'):   # tipped over, the knees' drop (measured upright) turns with the body: lying down it is gone
            return (y + float(k.get('lift', 0)) * HEIGHT_PX) * math.cos(math.radians(float(k['rot']))) - float(k.get('lift', 0)) * HEIGHT_PX
        clear = AIR_CLEAR * HEIGHT_PX if k.get('contact') == 'none' else 0.0
        return y - max(0.0, sinking(p, y) + clear)
    dy = [floor(p, y, k) for p, y, k in zip(poses, dy, keys)]

    moved = sorted({b for p in poses for b in MOVABLE if abs(p[b]) > 0.05})
    out_keys = []
    for k, p, x, y in zip(keys, poses, dx, dy):
        key = {'t': round(k['t'], 4), **{f'bone:{b}': round(p[b], 1) for b in moved}, 'dx': round(x / HEIGHT_PX, 4), 'bob': round(-y / HEIGHT_PX, 4)}
        if k.get('rot'):
            key['rot'] = round(float(k['rot']), 1)
        key['contact'] = k.get('contact', 'both')   # which feet stand: the slide check holds these still between keys
        face = FACE_ALIAS.get(k.get('face'), k.get('face'))
        if face in FACES:
            key['face'] = face
        out_keys.append(key)
    clip = {'id': raw['id'], 'loop': bool(raw.get('loop')), 'duration': float(raw['duration']),
            'travel': round(dx[-1] / HEIGHT_PX, 4) if raw.get('loop') and raw.get('travel') else 0.0, 'keys': out_keys}
    added = plant(clip)
    if added:
        notes.append(f'{added} keys added so a planted foot stays put between keys as the stage plays it')
    return clip, {'id': raw['id'], 'notes': notes, 'slide': slide(keys, poses, dx, dy), 'between': round(between_slide(clip), 4)}


# ── as the stage plays it: a planted foot stays put between keys too ─────────────────────────────────────────────────
# The stage runs every field along its own keys (layout.ts keyedAt, ease 'smooth': monotone Hermite, one slope per key,
# at rest at the ends). The root and the leg angles bend differently between two keys, so a foot planted at both slides
# a little in between (fresh tester 11-15: 2-4 cm). plant() plays the clip the same way and adds a key, its root solved
# from the planted foot, wherever that foot would slide more than SLIDE_TOL.

SLIDE_TOL = 0.002        # body heights a planted foot may slide between keys (0.34 cm on a grown-up)
PLANT_SAMPLES = 24       # looks between two keys
PLANT_MAX_KEYS = 80      # at most this many added to one clip
FEET = {'n': ('n',), 'f': ('f',), 'both': ('n', 'f'), 'none': ()}


def key_slope(prev, at, after) -> float:
    """layout.ts keySlope: the one slope at a key, 0 at an end or a turn, at most 3x the gentler run beside it."""
    if prev is None or after is None or at[0] <= prev[0] or after[0] <= at[0]:
        return 0.0
    left, right = (at[1] - prev[1]) / (at[0] - prev[0]), (after[1] - at[1]) / (after[0] - at[0])
    if left == 0 or right == 0 or (left > 0) != (right > 0):
        return 0.0
    mean = (after[1] - prev[1]) / (after[0] - prev[0])
    return math.copysign(min(abs(mean), 3 * min(abs(left), abs(right))), mean)


def played(clip: dict, field: str, t: float) -> float:
    """A field at t (0..1) as the stage plays the clip's keys (a loop's neighbours come from the cycles either side)."""
    keys = clip['keys']
    pts = [(k['t'], float(k.get(field, 0.0))) for k in keys]
    if clip['loop']:
        shift = clip['travel'] if field == 'dx' else 0.0
        pts = [(keys[-2]['t'] - 1, float(keys[-2].get(field, 0.0)) - shift)] + pts + [(keys[1]['t'] + 1, float(keys[1].get(field, 0.0)) + shift)]
    i = next((n for n, p in enumerate(pts) if p[0] > t), len(pts) - 1)
    i = max(1, i)
    a, b = pts[i - 1], pts[i]
    prev, nxt = (pts[i - 2] if i >= 2 else None), (pts[i + 1] if i + 1 < len(pts) else None)
    h = b[0] - a[0]
    k = 0.0 if h <= 0 else (t - a[0]) / h
    ma, mb = key_slope(prev, a, b) * h, key_slope(a, b, nxt) * h
    k2, k3 = k * k, k * k * k
    return (2 * k3 - 3 * k2 + 1) * a[1] + (k3 - 2 * k2 + k) * ma + (-2 * k3 + 3 * k2) * b[1] + (k3 - k2) * mb


def pose_at(clip: dict, t: float) -> dict[str, float]:
    return {b: played(clip, f'bone:{b}', t) for b in MOVABLE if f'bone:{b}' in clip['keys'][0]}


def foot_on_floor(clip: dict, key: dict, side: str) -> Pt:
    """Where a key's ankle stands on the floor (its root moved by dx and bob), px."""
    pose = {b[5:]: v for b, v in key.items() if b.startswith('bone:')}
    a = joints(pose, side)['ankle']
    return (a[0] + key['dx'] * HEIGHT_PX, a[1] - key['bob'] * HEIGHT_PX)


def planted_runs(clip: dict):
    """(i, feet): two keys in a row with these feet standing at both, and no tipping over."""
    keys = clip['keys']
    for i in range(len(keys) - 1):
        a, b = keys[i], keys[i + 1]
        if a.get('rot') or b.get('rot'):
            continue
        feet = [s for s in FEET[a.get('contact', 'both')] if s in FEET[b.get('contact', 'both')]]
        if feet:
            yield i, feet


def spot_between(clip: dict, i: int, side: str, t: float) -> Pt:
    """Where a foot standing at keys i and i+1 belongs at t: on the straight line between its two spots (a heel can lift)."""
    a, b = clip['keys'][i], clip['keys'][i + 1]
    pa, pb = foot_on_floor(clip, a, side), foot_on_floor(clip, b, side)
    u = (t - a['t']) / (b['t'] - a['t'])
    return (pa[0] + (pb[0] - pa[0]) * u, pa[1] + (pb[1] - pa[1]) * u)


def worst_between(clip: dict):
    """The worst sideways slide (px) of a planted foot between two keys as the stage plays them: (px, i, t, side)."""
    worst = (0.0, -1, 0.0, 'n')
    for i, feet in planted_runs(clip):
        a, b = clip['keys'][i], clip['keys'][i + 1]
        for n in range(1, PLANT_SAMPLES):
            t = a['t'] + (b['t'] - a['t']) * n / PLANT_SAMPLES
            pose, x = pose_at(clip, t), played(clip, 'dx', t) * HEIGHT_PX
            for side in feet:
                d = abs(joints(pose, side)['ankle'][0] + x - spot_between(clip, i, side, t)[0])
                if d > worst[0]:
                    worst = (d, i, t, side)
    return worst


def between_slide(clip: dict) -> float:
    return worst_between(clip)[0] / HEIGHT_PX


def feet_on_spots(pose: dict, hips: Pt, spots: dict) -> tuple[dict, Pt]:
    """The pose and the hips (px from rest) with every foot in `spots` reached by its leg, the hips moved towards a foot
    the legs cannot reach (the fit's own loop at keys)."""
    for n in range(REACH_TRIES):
        gaps = []
        for side, want in spots.items():
            pose = reach(pose, side, (want[0] - hips[0], want[1] - hips[1]))
            got = joints(pose, side)['ankle']
            gaps.append((want[0] - got[0] - hips[0], want[1] - got[1] - hips[1]))
        worst = max(gaps, key=lambda g: math.hypot(*g))
        if math.hypot(*worst) <= 0.5 or n == REACH_TRIES - 1:
            break
        hips = (hips[0] + worst[0], hips[1] + worst[1])
    return pose, hips


def plant(clip: dict) -> int:
    """Keys added where a planted foot would slide between keys: the pose as the stage plays it there, the root and the
    standing legs solved so each standing foot is on its spot. Returns how many."""
    added = 0
    while added < PLANT_MAX_KEYS:
        px, i, t, side = worst_between(clip)
        if px <= SLIDE_TOL * HEIGHT_PX:
            break
        a, b = clip['keys'][i], clip['keys'][i + 1]
        feet = [s for s in FEET[a.get('contact', 'both')] if s in FEET[b.get('contact', 'both')]]
        pose = {**{m: 0.0 for m in MOVABLE}, **pose_at(clip, t)}
        hips = (played(clip, 'dx', t) * HEIGHT_PX, -played(clip, 'bob', t) * HEIGHT_PX)
        pose, hips = feet_on_spots(pose, hips, {s: spot_between(clip, i, s, t) for s in feet})
        hips = (hips[0], hips[1] - max(0.0, sinking(pose, hips[1])))   # nothing through the floor here either: a heel lifts
        moved = [f[5:] for f in a if f.startswith('bone:')]
        key = {'t': round(t, 4), **{f'bone:{m}': round(pose.get(m, 0.0), 1) for m in moved}, 'dx': round(hips[0] / HEIGHT_PX, 4),
               'bob': round(-hips[1] / HEIGHT_PX, 4), 'contact': 'both' if len(feet) == 2 else feet[0]}
        clip['keys'] = sorted(clip['keys'] + [key], key=lambda k: k['t'])
        added += 1
    return added


def sinking(pose: dict[str, float], dy: float) -> float:
    """How far (px) the lowest point of either foot, heel or toe, stands below where it touches the floor when standing."""
    worst = -math.inf
    for side in 'nf':
        j, rest = joints(pose, side), joints({}, side)
        worst = max(worst, j['ankle'][1] + dy - rest['ankle'][1], j['toe'][1] + dy - rest['toe'][1])
    return worst


def slide(keys: list[dict], poses: list[dict], dx: list[float], dy: list[float]) -> float:
    """How far (body heights) a foot that stands on the ground at two keys in a row slid along it between them: should be
    0. Up and down does not count: a heel lifts when a crouch asks more of the foot than the rigs allow (sinking)."""
    worst = 0.0
    for i in range(1, len(keys)):
        for s in set(CONTACTS[keys[i - 1].get('contact', 'both')]) & set(CONTACTS[keys[i].get('contact', 'both')]):
            if keys[i - 1].get('lift') or keys[i].get('lift'):
                continue
            a, b = joints(poses[i - 1], s)['ankle'], joints(poses[i], s)['ankle']
            worst = max(worst, abs((a[0] + dx[i - 1]) - (b[0] + dx[i])) / HEIGHT_PX)
    return round(worst, 4)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('raw', nargs='+', type=Path)
    ap.add_argument('--out', type=Path, required=True)
    args = ap.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    for path in args.raw:
        clip, report = fit(json.loads(path.read_text()))
        (args.out / f"{clip['id']}.json").write_text(json.dumps(clip, indent=1) + '\n')
        print(f"{clip['id']}: {len(clip['keys'])} keys, travel {clip['travel']}, foot slide {report['slide']}, between keys {report['between']}")
        for n in report['notes']:
            print(f'  {n}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
