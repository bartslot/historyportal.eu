#!/usr/bin/env python3
"""
The fit pass of the animation preset pipeline (anim_director.md): ChatGPT's key poses in, a clip the stage plays out.

    python3 anim_fit.py anim_raw/*.json --out ../../resources/animations/clips

A raw clip (anim_raw/<id>.json, what ChatGPT answered, hand-tuned where it was wrong):
    {"id": "walk", "loop": true, "duration": 1.1, "travel": true,
     "keys": [{"t": 0, "contact": "both", "bones": {"thigh_n": -22, ...}, "lift": 0, "face": "neutral"}, ...]}
  t 0..1 through the clip; contact: which feet stand on the ground then ("n", "f", "both", "none"); lift: body heights
  the body is off the ground (a jump), on top of where the feet put it; face: an expression id (optional).

What the fit corrects, on the standard skeleton (Ana's flat rig, facing right), before a key is written:
  - every turn inside what a body can do (HUMAN_RANGE), knees and elbows by the posing rules (pose-guard.ts,
    ~/.claude/rules/posing.md): a knee never bends backwards, an elbow folds to the front, a raised thigh keeps its knee
    in front of the hip. A wrong turn is mirrored; still wrong, it is dropped.
  - a foot on the ground is flat and does not slide: the hips move (dx) and sink (bob) so the planted ankle stays where
    it landed; a second planted foot is reached by bending its leg (two-bone IK), never by sliding it.
  - a loop ends on the pose it starts with; a clip that does not travel ends where it started.
Out: resources/animations/clips/<id>.json, keys in the stage's own fields ({t, "bone:<name>": deg, dx, bob, face?}),
dx and bob in body heights (the stage scales them by the figure's height, presets.js / AnimationPresets.php).
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

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

# degrees clockwise on screen from the drawn pose, facing right (bones.ts JOINT_RANGE, opened to a whole body's reach:
# a rig clamps to its own limits when it plays)
HUMAN_RANGE = {
    'thigh': (-120.0, 45.0), 'shin': (0.0, 150.0), 'foot': (-45.0, 45.0),
    'upperarm': (-190.0, 70.0), 'forearm': (-150.0, 5.0),
    'chest': (-30.0, 45.0), 'head': (-35.0, 35.0), 'braid': (-30.0, 30.0),
}
STRAIGHT_DEG = 3.0       # pose-guard.ts STRAIGHT_DEG
RAISED_THIGH_DEG = 45.0  # pose-guard.ts RAISED_THIGH_DEG
FORWARD = 1              # the standard skeleton faces right
CONTACTS = {'n': ('n',), 'f': ('f',), 'both': ('n', 'f'), 'none': ()}
# the expressions a figure's head can show (Puppet.faces, the Character tab's kits); a raw clip's other words map onto them
FACES = ('calm', 'curious', 'sad', 'angry', 'amazed')
FACE_ALIAS = {'neutral': 'calm', 'smile': 'calm', 'happy': 'calm', 'talk': 'calm', 'think': 'curious',
              'laugh': 'amazed', 'surprised': 'amazed', 'worried': 'sad', 'tired': 'sad', 'proud': 'calm'}

Pt = tuple[float, float]


def range_of(bone: str) -> tuple[float, float]:
    return HUMAN_RANGE[bone.split('_')[0]]


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
    lo, hi = range_of('foot')
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
    best = None
    for sign in (1, -1):
        th = math.radians(base + sign * a)
        knee = (hip[0] + l1 * math.cos(th), hip[1] + l1 * math.sin(th))
        thigh = wrap(math.degrees(th) - angle((knee0[0] - hip[0], knee0[1] - hip[1])))
        shin = wrap(angle((target[0] - knee[0], target[1] - knee[1])) - angle((ankle0[0] - knee0[0], ankle0[1] - knee0[1])) - thigh)
        cand = {**bones, f'thigh_{side}': thigh, f'shin_{side}': shin}
        if knee_ok(cand, side):
            best = cand
            break
    return flat_foot(best or bones, side)


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
        # the other planted foot is reached by bending its leg, at the place it already has (or lands on)
        for s in feet:
            if hips[i] is None:
                continue
            hx, hy = hips[i]
            want = planted.get(s, (joints(poses[i], s)['ankle'][0] + hx, ground[s]))
            if math.dist((joints(poses[i], s)['ankle'][0] + hx, joints(poses[i], s)['ankle'][1] + hy), want) > 0.5:
                poses[i] = reach(poses[i], s, (want[0] - hx, want[1] - hy))
            planted[s] = want
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
        hips[i] = (ha[0] + (hb[0] - ha[0]) * u, ha[1] + (hb[1] - ha[1]) * u)

    dx = [h[0] - hips[0][0] for h in hips]
    dy = [h[1] - hips[0][1] - float(k.get('lift', 0)) * HEIGHT_PX for h, k in zip(hips, keys)]
    # standing still: a clip that does not travel ends where it started (the drift spread over it)
    if raw.get('loop') and not raw.get('travel'):
        dx = [x - dx[-1] * k['t'] for x, k in zip(dx, keys)]
    if raw.get('loop'):
        dy = [y - dy[-1] * k['t'] for y, k in zip(dy, keys)]

    moved = sorted({b for p in poses for b in MOVABLE if abs(p[b]) > 0.05})
    out_keys = []
    for k, p, x, y in zip(keys, poses, dx, dy):
        key = {'t': round(k['t'], 4), **{f'bone:{b}': round(p[b], 1) for b in moved}, 'dx': round(x / HEIGHT_PX, 4), 'bob': round(-y / HEIGHT_PX, 4)}
        face = FACE_ALIAS.get(k.get('face'), k.get('face'))
        if face in FACES:
            key['face'] = face
        out_keys.append(key)
    clip = {'id': raw['id'], 'loop': bool(raw.get('loop')), 'duration': float(raw['duration']),
            'travel': round(dx[-1] / HEIGHT_PX, 4) if raw.get('loop') and raw.get('travel') else 0.0, 'keys': out_keys}
    return clip, {'id': raw['id'], 'notes': notes, 'slide': slide(keys, poses, dx, dy)}


def slide(keys: list[dict], poses: list[dict], dx: list[float], dy: list[float]) -> float:
    """How far (body heights) a foot that stands on the ground at two keys in a row moved between them: should be 0."""
    worst = 0.0
    for i in range(1, len(keys)):
        for s in set(CONTACTS[keys[i - 1].get('contact', 'both')]) & set(CONTACTS[keys[i].get('contact', 'both')]):
            if keys[i - 1].get('lift') or keys[i].get('lift'):
                continue
            a, b = joints(poses[i - 1], s)['ankle'], joints(poses[i], s)['ankle']
            worst = max(worst, math.dist((a[0] + dx[i - 1], a[1] + dy[i - 1]), (b[0] + dx[i], b[1] + dy[i])) / HEIGHT_PX)
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
        print(f"{clip['id']}: {len(clip['keys'])} keys, travel {clip['travel']}, foot slide {report['slide']}")
        for n in report['notes']:
            print(f'  {n}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
