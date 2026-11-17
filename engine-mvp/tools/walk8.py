#!/usr/bin/env python3
"""
The walk, drawn the way an animator draws it: 8 drawings a cycle, 4 a step (Richard Williams, The Animator's Survival
Kit: CONTACT, DOWN, PASSING, UP; then the same with the other leg). Pose table and sources: vault
historyportal/topics/animation-presets/walk-8.md (Bart 11-17: "redone by checking how frame to frame animation works
with 8 step walk cycle").

    python3 walk8.py            # writes resources/animations/clips/walk.json and prints the check per drawing

The poses below are the drawings; nothing here bends them. What is solved is only where the body is:
  - bob: the hips sit as low as the feet let them, so the lowest foot stands on the floor and no foot goes through it
    (that is what makes DOWN the lowest drawing and UP the highest: the legs, not a sine wave);
  - dx: the standing ankle keeps its spot from drawing to drawing (the stage's foot lock, foot-lock.ts, holds it between
    them), and across the hand-over the back foot's toe keeps its spot while it pushes off.
Turns are degrees clockwise on screen for a figure facing right (bones.ts limitBone): a thigh swings forward negative,
a knee folds positive, toes come up negative, an upper arm swings forward negative, an elbow folds negative.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

from rig_parts import LIMIT

OUT = Path(__file__).resolve().parents[2] / 'resources/animations/clips/walk.json'
CYCLE_S = 1.0          # one full cycle (two steps) at Normal: 12 frames a step at 24 fps, Williams' "on twelves"

# One leg through the cycle, from its own heel strike: (thigh, knee, foot), the foot as its angle to the floor (0 flat,
# negative toes up). Drawing i of the near leg is LEG[i]; the far leg is half a cycle on, LEG[(i + 4) % 8]. Two drawings
# are placed rather than turned: UP stands on the ball with the heel UP_HEEL off the floor, and the back foot at the
# other leg's CONTACT stands on its toe, one even step behind where it was at UP, heel PUSH_HEEL up (push_off).
LEG = [
    (-18, 2, -16),   # 0 CONTACT  heel strikes in front, leg nearly straight, toes up
    (-25, 36, 0),    # 1 DOWN     the weight lands: knee gives, foot flat over the heel, the body at its lowest
    (-2, 11, 0),     # 2 PASSING  nearly straight under the body, foot flat
    (12, 4, None),   # 3 UP       behind, heel peeling off: the push lifts the body to its highest
    (None, None, None),  # 4      the other heel strikes; this one stands on its toe, knee bending (push_off)
    (-2, 54, 56),    # 5          toe off: the foot leaves the floor, the shin trails, toes hanging
    (-14, 60, 36),   # 6          passing the standing leg: knee forward and folded, toes up to clear the floor
    (-24, 26, -12),  # 7          reaching: the knee opens, the heel goes out in front, toes up
]
UP_HEEL = 30.0         # px the heel is off the floor at UP (the near foot is 126 px heel to toe)
PUSH_HEEL = 95.0       # px the back heel is off the floor at the other leg's CONTACT

# The upper body per drawing, near leg leading at 0. The arms swing against the legs (near leg forward, near arm back)
# and reach their ends one drawing after the legs do (they hang and follow). The elbow folds more on the way forward.
# The near arm swings wider than the far one (no twins). The chest dips forward as the weight lands, the head settles
# one drawing later, the braid (where a rig has one) trails and bounces late.
UPPER = [
    # upperarm_n, forearm_n, upperarm_f, forearm_f, chest, head, braid. Small turns: the kit people are drawn 3/4 front,
    # so an arm turned in the picture's plane swings OUT; a near arm back past +6 tears the robe's sleeve at the
    # shoulder, forward past -13 it crosses the belly (Bart's rule: never across the torso). The elbow folds on the way
    # forward, so the hand comes forward and up rather than out to the side.
    (5, -6, -6, -20, 3.0, -1.0, 6),
    (6, -6, -7, -22, 4.5, -1.0, 4),
    (1, -10, -3, -14, 3.0, 0.5, 5),
    (-6, -16, 3, -8, 2.0, -0.5, 8),
    (-11, -20, 6, -5, 3.0, -1.0, 6),
    (-12, -22, 7, -5, 4.5, -1.0, 4),
    (-5, -15, 2, -10, 3.0, 0.5, 5),
    (3, -8, -4, -16, 2.0, -0.5, 8),
]
ARMS = ('upperarm_n', 'forearm_n', 'upperarm_f', 'forearm_f', 'chest', 'head', 'braid')

# The body the walk is fitted on: the Character tab's girl (kit body, legs drawn straight down, facing right; the man
# and the woman are the same drawing at other proportions). Picture px, y down: parent, joint, end.
SKELETON: dict[str, tuple[str | None, tuple[float, float], tuple[float, float]]] = {
    'hips': (None, (202.0, 603.0), (267.56, 766.19)),
    'chest': ('hips', (267.56, 766.19), (267.0, 293.0)),
    'head': ('chest', (267.0, 293.0), (248.0, 0.0)),
    'upperarm_n': ('chest', (162.0, 331.0), (99.5, 581.06)),
    'upperarm_f': ('chest', (412.0, 351.0), (440.25, 582.0)),
    'forearm_n': ('upperarm_n', (99.5, 581.06), (40.0, 897.0)),
    'forearm_f': ('upperarm_f', (440.25, 582.0), (519.0, 885.0)),
    'thigh_n': ('hips', (167.76, 603.0), (162.75, 992.25)),
    'thigh_f': ('hips', (319.83, 603.0), (314.54, 980.25)),
    'shin_n': ('thigh_n', (162.75, 992.25), (157.75, 1381.49)),
    'shin_f': ('thigh_f', (314.54, 980.25), (309.25, 1357.49)),
    'foot_n': ('shin_n', (157.75, 1381.49), (266.0, 1474.0)),
    'foot_f': ('shin_f', (309.25, 1357.49), (463.0, 1443.0)),
}
HEIGHT_PX = 1474.0     # head top to sole: one body height (the clip's dx and bob are in these)
# her leg (thigh and shin) as a share of her height: presets.js FITTED_LEGS.share, AnimationPresets FITTED_LEGS
LEG_SHARE = (math.dist(*SKELETON['thigh_n'][1:]) + math.dist(*SKELETON['shin_n'][1:])) / HEIGHT_PX
# The sole of each foot: toe from the drawing, the heel under the back of the ankle. Each foot stands on its own floor
# line (the far foot is drawn higher: 3/4 view).
TOE = {s: SKELETON[f'foot_{s}'][2] for s in 'nf'}
HEEL = {'n': (140.0, 1474.0), 'f': (292.0, 1443.0)}
FLOOR = {'n': 1474.0, 'f': 1443.0}
STRAIGHT = 1.0         # degrees: a knee or an elbow this close to straight is straight


def rot(p: tuple[float, float], deg: float) -> tuple[float, float]:
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return (c * p[0] - s * p[1], s * p[0] + c * p[1])   # y down: positive turns clockwise on screen


def world(bones: dict[str, float]) -> dict[str, tuple[tuple[float, float], float]]:
    """Each bone's joint and its total turn, the hips at rest (Rigby2D's Pose: a turn adds to its parent's)."""
    out: dict[str, tuple[tuple[float, float], float]] = {}
    for name, (parent, start, _) in SKELETON.items():
        if parent is None:
            out[name] = (start, 0.0)
            continue
        (at, turn), pstart = out[parent], SKELETON[parent][1]
        off = rot((start[0] - pstart[0], start[1] - pstart[1]), turn)
        out[name] = ((at[0] + off[0], at[1] + off[1]), turn + bones.get(name, 0.0))
    return out


def point(bones: dict[str, float], bone: str, p: tuple[float, float], w: dict) -> tuple[float, float]:
    (at, turn), start = w[bone], SKELETON[bone][1]
    off = rot((p[0] - start[0], p[1] - start[1]), turn)
    return (at[0] + off[0], at[1] + off[1])


def bend(w: dict, bones: dict, upper: str, lower: str, end: str) -> float:
    """The cross product of the upper and lower limb in world space (posing.md): > 0 when the lower one swings back."""
    a, b = w[upper][0], w[lower][0]
    c = point(bones, lower, SKELETON[lower][2], w)
    u, v = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
    return math.degrees(math.asin((u[0] * v[1] - u[1] * v[0]) / (math.hypot(*u) * math.hypot(*v))))


def leg(side: str, phase: int) -> dict[str, float]:
    """One leg's turns in this phase of its cycle."""
    if phase == 4:
        return push_off(side)
    thigh, knee, floor_deg = LEG[phase]
    if floor_deg is None:   # UP: the same heel height on both feet, however long each is drawn
        floor_deg = heel_up(side, UP_HEEL)
    return {f'thigh_{side}': thigh, f'shin_{side}': knee, f'foot_{side}': round(floor_deg - thigh - knee, 1)}


def pose(i: int) -> dict[str, float]:
    return leg('n', i % 8) | leg('f', (i + 4) % 8) | dict(zip(ARMS, UPPER[i % 8]))


def heel_up(side: str, px: float) -> float:
    """The foot's angle to the floor that lifts its heel px while the toe stays down."""
    return math.degrees(math.asin(px / math.dist(HEEL[side], TOE[side])))


def push_off(side: str) -> dict[str, float]:
    """The back leg at the other leg's CONTACT: its toe one even step behind where it stood at UP, on the floor, the
    heel PUSH_HEEL up; thigh and knee reach the ankle (two-bone IK, knee bending forward)."""
    other = 'f' if side == 'n' else 'n'
    stance = [leg(side, k) for k in range(4)]
    ankle = lambda p: world(p)[f'foot_{side}'][0]
    step = (ankle(stance[0])[0] - ankle(stance[3])[0]) / 3   # the stance ankle's travel per drawing, CONTACT to UP
    front = leg(other, 0)
    hips = FLOOR[other] - sole(front, other)['heel'][1]   # down: the front heel on its floor
    toe = (sole(stance[3], side)['toe'][0] - step, FLOOR[side] - hips)
    deg = heel_up(side, PUSH_HEEL)
    rest_ankle = SKELETON[f'foot_{side}'][1]
    off = rot((TOE[side][0] - rest_ankle[0], TOE[side][1] - rest_ankle[1]), deg)
    target = (toe[0] - off[0], toe[1] - off[1])
    hip, knee0, ankle0 = SKELETON[f'thigh_{side}'][1], SKELETON[f'shin_{side}'][1], rest_ankle
    l1, l2 = math.dist(hip, knee0), math.dist(knee0, ankle0)
    d = min(math.dist(hip, target), l1 + l2 - 1e-6)
    to_target = math.atan2(target[1] - hip[1], target[0] - hip[0])
    spread = math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))
    knee_at = (hip[0] + l1 * math.cos(to_target - spread), hip[1] + l1 * math.sin(to_target - spread))   # knee forward
    angle = lambda a, b: math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))
    thigh = angle(hip, knee_at) - angle(hip, knee0)
    shin = angle(knee_at, target) - angle(knee0, ankle0) - thigh
    return {f'thigh_{side}': round(thigh, 1), f'shin_{side}': round(shin, 1), f'foot_{side}': round(deg - thigh - shin, 1)}


def sole(p: dict[str, float], side: str) -> dict[str, tuple[float, float]]:
    w = world(p)
    return {'heel': point(p, f'foot_{side}', HEEL[side], w), 'toe': point(p, f'foot_{side}', TOE[side], w),
            'ankle': w[f'foot_{side}'][0]}


def drop(p: dict[str, float]) -> float:
    """px the hips go down (y down: positive) so the lowest point of either foot stands on its floor."""
    return min(FLOOR[s] - max(sole(p, s)['heel'][1], sole(p, s)['toe'][1]) for s in 'nf')


def problems(p: dict[str, float]) -> list[str]:
    w = world(p)
    bad = [f'{b} {p[b]} outside {LIMIT[b]}' for b in p if b in LIMIT and not LIMIT[b][0] <= p[b] <= LIMIT[b][1]]
    bad += [f'knee {s} bends backwards' for s in 'nf' if bend(w, p, f'thigh_{s}', f'shin_{s}', 'ankle') < -STRAIGHT]
    bad += [f'elbow {s} bends backwards' for s in 'nf' if bend(w, p, f'upperarm_{s}', f'forearm_{s}', 'hand') > STRAIGHT]
    return bad


def build() -> tuple[dict, list[str]]:
    poses = [pose(i) for i in range(9)]
    dy = [drop(p) for p in poses]
    # which point keeps its spot from drawing i-1 to i: the standing ankle, or the pushing toe across the hand-over
    hold = {1: ('n', 'ankle'), 2: ('n', 'ankle'), 3: ('n', 'ankle'), 4: ('n', 'toe'),
            5: ('f', 'ankle'), 6: ('f', 'ankle'), 7: ('f', 'ankle'), 8: ('f', 'toe')}
    dx = [0.0]
    for i in range(1, 9):
        side, part = hold[i]
        dx.append(dx[-1] + sole(poses[i - 1], side)[part][0] - sole(poses[i], side)[part][0])
    report = []
    for i, p in enumerate(poses[:8]):
        feet = {s: {k: round(FLOOR[s] - (v[1] + dy[i]), 1) for k, v in sole(p, s).items() if k != 'ankle'} for s in 'nf'}
        report.append(f'{i} {["CONTACT", "DOWN", "PASSING", "UP"][i % 4]:8s} hips {-dy[i] / HEIGHT_PX * 100:+.2f}%  '
                      f'dx {dx[i] / HEIGHT_PX:.4f}  above floor {feet}  {"; ".join(problems(p)) or "ok"}')
    keys = []
    for i, p in enumerate(poses):
        keys.append({'t': round(i / 8, 4), **{f'bone:{b}': float(v) for b, v in sorted(p.items())},
                     'dx': round(dx[i] / HEIGHT_PX, 4), 'bob': round(-dy[i] / HEIGHT_PX, 4),
                     'contact': 'n' if i % 8 < 4 else 'f'})
    clip = {'id': 'walk', 'loop': True, 'duration': CYCLE_S, 'travel': round(dx[8] / HEIGHT_PX, 4), 'keys': keys}
    return clip, report


def main() -> int:
    clip, report = build()
    print('\n'.join(report))
    print(f"travel {clip['travel']} body heights a cycle, fitted on legs {LEG_SHARE:.4f} of the height")
    if any(not line.endswith('ok') for line in report):
        return 1
    OUT.write_text(json.dumps(clip, indent=1) + '\n')
    print(f'wrote {OUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
