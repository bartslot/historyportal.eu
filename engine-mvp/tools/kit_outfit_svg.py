"""Outfits as SVG kit pieces, cut to the body's own shape (its label map), drawn over its plain base outfit.

Bart 2026-11-24: "Can you ask for this in our 3D character creator with parts?" about the Marco Polo character sheet
(project files higgsfield-test/marco-sheet-preview.jpg): a cream knee tunic laced at the neck, a brown belt, a satchel on
a strap across the chest, leggings and knee boots; for the snow, a long coat lined and trimmed with fur over the same.

Same route as the hair and the helmet (kit_hair_svg.py, kit_helmet_svg.py): each outfit is ONE SVG the browser renders
into fill / shade / cast / ink (resources/js/character/svg-piece.js). An outfit also needs the skin it leaves bare (neck,
hands): kit.json `files.under` names the body's plain outfit, and the browser lays the SVG over it (svg-piece.js
overRaw), so where the SVG paints, the plain outfit's fill and pen line are gone.

How an outfit is built (all in body-canvas px, the label map's own pixels):
  - the body's parts come from its label map (man/labels.webp, red = 1 + index into rig.json parts);
  - sleeves are the arms down to a wrist line, hose the legs, boots the shins below a boot top and the feet closed round
    the toes, so every one of them follows its bone when the rig bends it;
  - the tunic or coat is the chest and a skirt drawn from a few numbers (waist, hem, flare), the arms taken out;
  - belt, strap and satchel lie on top; one outline goes round every visible shape, details (laces, folds, buckle,
    stitching, fur tufts) are short strokes inside.

  python3 engine-mvp/tools/kit_outfit_svg.py      # writes every outfit into the kit and adds it to kit.json
"""
import hashlib
import json
import math
import random
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

KIT = Path(__file__).resolve().parents[2] / 'public/character-kits/babylonia-old-babylonian/v1'
INK = '#191410'
LINE = 6.0                       # px: the outline, as the baked outfits' pen line at canvas scale
DETAIL = 3.6                     # px: folds, laces, stitching

# Per body: where its wrists, boot tops and neck are, in body-canvas px (man/labels.webp is 2048 x 3072).
BODIES = {
    'man': dict(
        under='outfit/base-kilt',
        # wrist: a point on the wrist and the forearm's direction there; the sleeve ends on the line through it
        wrist={'n': ((545, 1530), (-0.10, 1.0)), 'f': ((1455, 1515), (0.24, 1.0))},
        elbow={'n': (627, 1111), 'f': (1318, 1111)},
        boot_top={'n': 2440, 'f': 2425},
        knee={'n': (771, 2050), 'f': (1146, 2050)},
        ankle={'n': 2760, 'f': 2750},
        neck=dict(centre=(985, 598), rx=92, ry=44),      # the round neckline cut into the top of the chest
        front=985,                                        # the front's middle at the waist (three-quarter view)
        waist=1268,
    ),
}

OUTFITS = {
    # Marco Polo, Venice 1271: cream knee tunic laced at the neck, belt, satchel across the chest, hose and knee boots
    'venice-tunic-satchel': dict(body='man', label='Tunic, belt and satchel', period='venice-1271', coat=False, drawing='kit-drawings/marco-tunic-ink.webp',
                                 hem=2232, hem_sag=30, flare=(640, 1372), belt=True, satchel=True, seed=3,
                                 drawn=dict(waist=1236, strap=[(1182, 598), (1075, 942), (812, 1440)], strap_hw=24,
                                            bag=[(640, 1420), (820, 1405), (836, 1430), (836, 1650), (815, 1668), (650, 1672), (632, 1650), (630, 1440)])),     # the ChatGPT drawing's own belt (kit_outfit_ink.py)
    # the same in the snow (the Pamir): a long coat lined and trimmed with fur over it
    'venice-fur-coat': dict(body='man', label='Fur-lined coat', period='venice-1271', coat=True, drawing='kit-drawings/marco-coat-ink.webp',
                            hem=2470, hem_sag=34, flare=(596, 1418), belt=False, satchel=True, seed=5,
                            drawn=dict(hem=2150, belt=True, waist=1236, strap=[(1240, 732), (1122, 930), (985, 1180), (860, 1420)], strap_hw=20,
                                       bag=[(640, 1400), (850, 1385), (866, 1410), (866, 1700), (845, 1718), (650, 1722), (632, 1700), (630, 1420)])),   # its coat ends at the knee, the belt shows
}

# Ready-made people in these outfits (kit.json presets; kit_bake.py keeps them through a re-bake). Marco keeps one
# colour for life, his cream linen (the character sheet); white is Beatrice's alone.
PRESETS = {
    'marco-polo': dict(role='Marco Polo', body='man', face='man', outfit='venice-tunic-satchel', parts=['hair/man-wavy-jaw'],
                       skin='s2', hair_colour='brown', height_m=1.66,
                       zones={'garment': 'raw-linen', 'cord': 'dark-wool-brown', 'hose': 'camel-brown'}),
    'marco-polo-snow': dict(role='Marco Polo in the snow', body='man', face='man', outfit='venice-fur-coat', parts=['hair/man-wavy-jaw'],
                            skin='s2', hair_colour='brown', height_m=1.66,
                            zones={'garment': 'raw-linen', 'cord': 'dark-wool-brown', 'head-cloth': 'undyed-wool', 'hose': 'camel-brown'}),
}


def preset_entries(kit_id: str) -> list[dict]:
    return [{'id': pid, 'label': p['role'], 'recipe': {'kit': kit_id, 'kitVersion': 1, 'view': 'front34', **p, 'facing': 1}}
            for pid, p in PRESETS.items()]


# --- masks ------------------------------------------------------------------------------------------------------------

def labels_of(body: str) -> tuple[np.ndarray, list[str]]:
    rig = json.loads((KIT / body / 'rig.json').read_text())
    lab = np.asarray(Image.open(KIT / body / rig['labels']).convert('RGB'))[..., 0]
    return lab, rig['parts']


def part(lab, parts, *names) -> np.ndarray:
    return np.isin(lab, [parts.index(n) + 1 for n in names])


def poly(shape, pts) -> np.ndarray:
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.round(np.array(pts)).astype(np.int32)], 1)
    return m.astype(bool)


def side(shape, point, direction, keep_before=True) -> np.ndarray:
    """The half of the canvas before (or after) the line through `point` square to `direction`."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.array(direction, float) / math.hypot(*direction)
    t = (xx - point[0]) * d[0] + (yy - point[1]) * d[1]
    return t < 0 if keep_before else t >= 0


def tidy(m: np.ndarray, r: int = 3) -> np.ndarray:
    """Close pinholes and round off single-pixel steps, so an outline reads as one drawn line."""
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, k)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)
    return m.astype(bool)


def closed(m: np.ndarray, r: int) -> np.ndarray:
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    return cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, k).astype(bool)


def chaikin(pts, rounds=2):
    for _ in range(rounds):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            out += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = out
    return pts


def outline(m: np.ndarray, min_area=60) -> str:
    """The mask's outlines (holes too) as one SVG path, smoothed."""
    cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    d = []
    for c in cs:
        if cv2.contourArea(c) < min_area:
            continue
        c = cv2.approxPolyDP(c, 1.6, True)[:, 0, :].astype(float)
        if len(c) < 3:
            continue
        pts = chaikin([tuple(p) for p in c])
        d.append('M ' + ' L '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z')
    return ' '.join(d)


def path(pts, close=False) -> str:
    return 'M ' + ' L '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + (' Z' if close else '')


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def edge_x(m: np.ndarray, y: int, left=True) -> int:
    xs = np.flatnonzero(m[y])
    return int(xs.min() if left else xs.max())


def wavy(a, b, amp, n, rnd):
    """A line from a to b with a little hand wobble."""
    pts = []
    for i in range(n + 1):
        t = i / n
        x, y = lerp(a, b, t)
        nx, ny = -(b[1] - a[1]), b[0] - a[0]
        ln = math.hypot(nx, ny) or 1
        o = amp * math.sin(t * math.pi) * rnd.uniform(0.6, 1.0)
        pts.append((x + nx / ln * o, y + ny / ln * o))
    return pts


def fur_edge(m: np.ndarray, rnd, tuft=11) -> str:
    """Fur: the outline of `m` with small round tufts along it (one wide-stroked path the ink keeps outside)."""
    cs, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in cs:
        if cv2.contourArea(c) < 200:
            continue
        pts = c[:, 0, :]
        step = max(1, int(tuft * 1.6))
        for i in range(0, len(pts), step):
            x, y = pts[i]
            r = tuft * rnd.uniform(0.7, 1.1)
            out.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}"/>')
    return ''.join(out)


# --- one outfit -------------------------------------------------------------------------------------------------------

def outfit_svg(oid: str, o: dict, kit: dict, masks_only: bool = False):
    b = BODIES[o['body']]
    rnd = random.Random(o['seed'])
    lab, parts = labels_of(o['body'])
    H, W = lab.shape
    under = next(p for bd in kit['bodies'] if bd['id'] == o['body'] for p in bd['pieces'] if p['id'] == b['under'])
    ox, oy, bw, bh = under['box']

    arm = {s: part(lab, parts, f'upperarm_{s}', f'forearm_{s}') for s in 'nf'}
    arms = arm['n'] | arm['f']
    leg = {s: part(lab, parts, f'thigh_{s}', f'shin_{s}', f'foot_{s}') for s in 'nf'}
    chest = part(lab, parts, 'chest')
    hips = part(lab, parts, 'hips')

    # sleeves: the arm down to the wrist line
    sleeve = {s: tidy(arm[s] & side((H, W), *b['wrist'][s])) for s in 'nf'}

    # the body garment: chest + a skirt from the waist to the hem, flared, its hem sagging toward the front
    wy = o.get('waist', b['waist'])
    wl, wr = edge_x(chest | hips, wy, True), edge_x(chest | hips, wy, False)
    hl, hr = o['flare']
    hem = o['hem']
    hem_pts = [(hr, hem - 14)] + [(x, hem + o['hem_sag'] * math.sin(math.pi * (x - hl) / (hr - hl)) ** 0.8)
                                  for x in np.linspace(hr, hl, 24)] + [(hl, hem - 18)]
    skirt = poly((H, W), [(wl + 4, wy - 40), (wr - 4, wy - 40)] + hem_pts)
    body = chest | hips & (np.mgrid[0:H, 0:W][0] < wy + 60) | skirt
    nk = b['neck']
    yy, xx = np.mgrid[0:H, 0:W]
    neckline = ((xx - nk['centre'][0]) / nk['rx']) ** 2 + ((yy - nk['centre'][1]) / nk['ry']) ** 2 < 1
    body &= ~neckline
    body = tidy(body & ~arms, 4)

    # hose: the legs below the garment; boots: the shin below the boot top and the foot, closed round the toes
    legs_all = leg['n'] | leg['f']
    boot = {}
    for s in 'nf':
        foot = part(lab, parts, f'foot_{s}')
        shin = part(lab, parts, f'shin_{s}') & (yy > b['boot_top'][s])
        boot[s] = tidy(closed(foot | shin, 16) & (closed(leg[s], 16)) | foot | shin, 3)
    boots = boot['n'] | boot['f']
    hose = {s: tidy(leg[s] & ~boots & ~body, 3) for s in 'nf'}

    # belt, strap, satchel
    over = []      # (name, kind, mask) drawn over the garment, back to front
    if o['belt']:
        band = poly((H, W), [(wl - 10, wy - 26), (b['front'], wy - 8), (wr + 10, wy - 30),
                             (wr + 10, wy + 18), (b['front'], wy + 38), (wl - 10, wy + 22)])
        over.append(('belt', 'rope', band & body))
    if o['satchel']:
        pts = o.get('strap', [(1172, 606), (792, 1440)])      # far shoulder -> near hip
        strap = np.zeros((H, W), np.uint8)
        cv2.polylines(strap, [np.round(np.array(pts)).astype(np.int32)], False, 1, thickness=2 * o.get('strap_hw', 21))
        strap = strap.astype(bool)
        over.append(('strap', 'rope', strap & (body | chest) & ~arms & (yy > 596)))
        bag = o.get('bag', [(706, 1436), (884, 1420), (898, 1440), (904, 1640), (886, 1662), (720, 1672), (702, 1652), (698, 1458)])
        over.append(('satchel', 'rope', poly((H, W), chaikin(bag, 2)) & ~arms))

    # the coat's fur: collar and front edge, hem band, cuffs
    fur = None
    if o['coat']:
        front = b['front'] + 26
        collar = poly((H, W), chaikin([(842, 560), (900, 620), (960, 660), (front - 30, 700), (front + 40, 700),
                                       (1060, 650), (1150, 600), (1210, 630), (1120, 720), (front + 50, 800),
                                       (front + 52, 1000), (front - 14, 1000), (front - 20, 800), (900, 700), (812, 610)], 2))
        strip = poly((H, W), [(front - 22, 980), (front + 36, 980), (front + 54, hem + 60), (front - 16, hem + 60)])
        hemband = body & (yy > hem - 72 + o['hem_sag'] * np.clip(np.sin(np.pi * (xx - hl) / (hr - hl)), 0, 1) ** 0.8)
        cuffs = np.zeros((H, W), bool)
        for s in 'nf':
            p, d = b['wrist'][s]
            cuffs |= sleeve[s] & ~side((H, W), (p[0] - d[0] * 64, p[1] - d[1] * 64), d)
        fur = tidy(((collar | strip) & (body | chest)) | hemband | cuffs, 3)
        fur &= ~neckline | collar

    # the visible part of every shape, back to front (what lies on top takes its pixels)
    stack = [(f'hose-{s}', 'hose', hose[s]) for s in 'nf'] + [(f'boot-{s}', 'tie', boot[s]) for s in 'nf']
    stack += [('garment', 'tunic', body)]
    if fur is not None:
        stack += [('fur', 'ochre', fur & body)]
    stack += over
    stack += [(f'sleeve-{s}', 'tunic', sleeve[s]) for s in 'nf']
    if fur is not None:
        stack += [('fur-cuffs', 'ochre', fur & arms)]
    if masks_only:      # the shapes alone, back to front (kit_outfit_ink.py colours a drawing by them)
        return stack
    vis = []
    for i, (name, kind, m) in enumerate(stack):
        top = np.zeros((H, W), bool)
        for _, _, m2 in stack[i + 1:]:
            top |= m2
        vis.append((name, kind, m & ~top))

    # fills: each whole shape, back to front, so a smoothed corner never opens a gap onto the plain outfit under it;
    # lines: round what shows of each shape
    fills = ''.join(f'<path data-kind="{kind}" fill="#c8b48c" d="{outline(m)}" fill-rule="evenodd"/>'
                    for name, kind, m in stack if m.any())
    # a limb's line lies inside it (a line half outside would stay behind on the body when the rig bends the limb)
    LIMBS = ('sleeve', 'hose', 'boot')
    lines = [outline(m) for name, kind, m in vis if m.any() and not name.startswith('fur') and name.split('-')[0] not in LIMBS]
    limb_lines = {k: outline(m) for k, m in ((k, np.logical_or.reduce([m for n, _, m in vis if n.split('-')[0] == k])) for k in LIMBS) if m.any()}
    shows = {}      # what shows of each kind of shape: details are drawn only there
    for name, kind, m in vis:
        key = name.split('-')[0]
        shows[key] = shows.get(key, np.zeros((H, W), bool)) | m

    # details
    marks = {'garment': [], 'sleeve': [], 'hose': [], 'boot': [], 'satchel': [], 'belt': []}
    shade = []
    # sleeve cuffs and elbow folds
    for s in 'nf':
        p, d = b['wrist'][s]
        q = (p[0] - d[0] * 40, p[1] - d[1] * 40)
        if not o['coat']:
            row = sleeve[s][int(q[1])]
            if row.any():
                xl, xr = np.flatnonzero(row).min(), np.flatnonzero(row).max()
                marks['sleeve'].append(path(wavy((xl + 3, q[1] + (xl - q[0]) * -d[0] / d[1]), (xr - 3, q[1] + (xr - q[0]) * -d[0] / d[1]), 4, 6, rnd)))
                for t in (0.3, 0.55, 0.8):
                    x = xl + (xr - xl) * t
                    marks['sleeve'].append(path([(x, q[1] + 6), (x + rnd.uniform(-3, 3), q[1] + 30)]))
        ex, ey = b['elbow'][s]
        for k in range(2):
            y = ey + 30 + 34 * k
            row = sleeve[s][int(y)]
            if row.any():
                xl, xr = np.flatnonzero(row).min(), np.flatnonzero(row).max()
                a = (xl + (xr - xl) * (0.15 if s == 'n' else 0.45), y)
                marks['sleeve'].append(path(wavy(a, (a[0] + (xr - xl) * 0.4, y + 14), 5, 5, rnd)))
        # the sleeve's inner side in shade
        shade.append(f'<path d="{outline(sleeve[s] & ~side((H, W), (ex, ey - 400), (1 if s == "n" else -1, 0.0)))}"/>')
    # skirt folds from the waist down
    for i, t in enumerate([0.12, 0.3, 0.5, 0.68, 0.86]):
        top = (wl + (wr - wl) * t, wy + 60)
        bot = (hl + (hr - hl) * (t + rnd.uniform(-0.04, 0.04)), hem + o['hem_sag'] * math.sin(math.pi * t) - 30)
        if o['coat'] and abs(top[0] - b['front']) < 70:
            continue
        a = lerp(top, bot, 0.35 if i % 2 else 0.1)
        marks['garment'].append(path(wavy(a, bot, 9, 8, rnd)))
        shade.append(path(wavy(lerp(a, bot, 0.1), bot, 9, 8, rnd)).replace('M', 'M', 1))
    # gathers above and below the belt
    if o['belt']:
        for x in np.linspace(wl + 30, wr - 30, 7):
            marks['garment'].append(path([(x, wy - 60), (x + rnd.uniform(-4, 4), wy - 32)]))
            marks['garment'].append(path([(x + 8, wy + 36), (x + rnd.uniform(-6, 6), wy + 92)]))
        bx = b['front'] + 30
        marks['belt'].append(f'M {bx - 20},{wy - 16} L {bx + 22},{wy - 14} L {bx + 22},{wy + 30} L {bx - 20},{wy + 28} Z')
        marks['belt'].append(f'M {bx},{wy - 14} L {bx + 2},{wy + 28}')
        shade.append(path([(wl, wy + 30), (b['front'], wy + 50), (wr, wy + 26)]))
    # laced slit at the neck
    if not o['coat']:
        cx, top = nk['centre'][0] + 4, nk['centre'][1] + nk['ry'] - 4
        marks['garment'].append(path([(cx, top), (cx + 4, top + 128)]))
        for k in range(4):
            y = top + 16 + 26 * k
            marks['garment'].append(path([(cx - 18, y), (cx + 22, y + 20)]))
            marks['garment'].append(path([(cx + 22, y), (cx - 18, y + 20)]))
        marks['garment'].append(path([(cx + 2, top + 2), (cx - 22, top + 40), (cx - 16, top + 62)]))      # the lace's loose end
    # satchel: flap, buckle, stitching
    stitch = []
    if o['satchel']:
        marks['satchel'].append(path(chaikin([(704, 1530), (790, 1552), (900, 1528)], 2)))
        marks['satchel'].append('M 790,1552 L 794,1600 M 776,1586 L 812,1584 L 814,1614 L 778,1616 Z')
        stitch.append(path([(716, 1450), (884, 1436), (888, 1516)]))
        stitch.append(path([(714, 1578), (716, 1650), (886, 1644), (888, 1574)]))
        shade.append(path([(704, 1556), (790, 1574), (902, 1552), (904, 1600), (704, 1600)], True))
    # hose: wrinkles at the knee and above the boot
    for s in 'nf':
        if o['coat']:
            break
        kx, ky = b['knee'][s]
        for k in range(2):
            marks['hose'].append(path(wavy((kx - 40, ky + 230 + 26 * k), (kx + 30, ky + 240 + 26 * k), 6, 5, rnd)))
        bt = b['boot_top'][s]
        row = boot[s][bt + 4]
        if row.any():
            xl, xr = np.flatnonzero(row).min(), np.flatnonzero(row).max()
            for k in range(2):
                marks['hose'].append(path(wavy((xl + 10, bt - 30 - 22 * k), (xr - 12, bt - 26 - 22 * k), 5, 5, rnd)))
    # boots: the cuff turned down, creases at the ankle, the sole
    for s in 'nf':
        bt = b['boot_top'][s]
        row = boot[s][bt + 60]
        if row.any():
            xl, xr = np.flatnonzero(row).min(), np.flatnonzero(row).max()
            marks['boot'].append(path(wavy((xl + 2, bt + 58), (xr - 2, bt + 64), 6, 6, rnd)))
        # the sole: the boot's own bottom edge again, a little inside, from the heel to the toe
        cols = np.flatnonzero(boot[s][b['ankle'][s]:].any(0))
        if len(cols):
            bottom = [(x, b['ankle'][s] + np.flatnonzero(boot[s][b['ankle'][s]:, x]).max() - 15) for x in range(cols.min() + 22, cols.max() - 18, 8)]
            marks['boot'].append(path(bottom))
        ay = b['ankle'][s]
        row = boot[s][ay]
        if row.any():
            xl, xr = np.flatnonzero(row).min(), np.flatnonzero(row).max()
            for k in range(3):
                x = xl + (xr - xl) * (0.3 + 0.2 * k)
                marks['boot'].append(path(wavy((x, ay - 20), (x + 26, ay + 16), 4, 4, rnd)))
    # coat: fur tufts inside the fur
    tufts = []
    if fur is not None:
        fy, fx = np.nonzero(fur[::18, ::18])
        for y, x in zip(fy * 18, fx * 18):
            if rnd.random() < 0.55:
                a = rnd.uniform(0, math.pi)
                r = rnd.uniform(7, 12)
                tufts.append(f'M {x:.0f},{y:.0f} q {r * math.cos(a):.1f},{r * math.sin(a) - 6:.1f} {2 * r * math.cos(a):.1f},{2 * r * math.sin(a):.1f}')
        fur_ink = fur_edge(fur, rnd, 10)
    # under the arms and down the far side: soft shade on the garment
    for s, dx in (('n', 1), ('f', -1)):
        ex, ey = b['elbow'][s]
        shade.append(path([(ex + dx * 60, ey - 300), (ex + dx * 110, ey - 280), (ex + dx * 120, ey + 200), (ex + dx * 50, ey + 260)], True))

    fill_paths = fills
    shade_paths = ''.join(s if s.startswith('<') else f'<path d="{s}"/>' for s in shade if s)
    vis_all = np.zeros((H, W), bool)
    for _, _, m in vis:
        vis_all |= m
    inside = outline(vis_all)
    furs = ''
    if fur is not None:
        furs = f'''
    <g stroke-width="{LINE}" mask="url(#fur-out)">{fur_ink}</g>
    <g stroke-width="2.6" mask="url(#fur-in)"><path d="{' '.join(tufts)}"/></g>'''
    kinds = sorted({k for _, k, m in vis if m.any()} | set(under['kinds']), key=kit['kinds'].index)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{ox} {oy} {bw} {bh}" width="{bw}" height="{bh}" data-box="{ox} {oy} {bw} {bh}">
  <!-- Made by engine-mvp/tools/kit_outfit_svg.py ({oid}): change the numbers there, not here. -->
  <defs>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <mask id="inside" maskUnits="userSpaceOnUse" x="{ox}" y="{oy}" width="{bw}" height="{bh}"><path d="{inside}" fill="#fff" fill-rule="evenodd"/></mask>
{''.join(f'<mask id="on-{k}" maskUnits="userSpaceOnUse" x="{ox}" y="{oy}" width="{bw}" height="{bh}"><path d="{outline(m)}" fill="#fff" fill-rule="evenodd"/></mask>' for k, m in shows.items() if (k in marks and marks[k]) or k in limb_lines)}
    <mask id="fur-in" maskUnits="userSpaceOnUse" x="{ox}" y="{oy}" width="{bw}" height="{bh}"><path d="{outline(fur) if fur is not None else ''}" fill="#fff"/></mask>
    <mask id="fur-out" maskUnits="userSpaceOnUse" x="{ox}" y="{oy}" width="{bw}" height="{bh}"><rect x="{ox}" y="{oy}" width="{bw}" height="{bh}" fill="#fff"/><path d="{outline(fur) if fur is not None else ''}" fill="#000"/></mask>
  </defs>
  <g class="fill">{fill_paths}</g>
  <g class="shade" data-strength="0.45" fill="#000" stroke="#000" stroke-width="22" filter="url(#soft)" mask="url(#inside)">{shade_paths}</g>
  <g class="ink" fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">
    <path stroke-width="{LINE}" d="{' '.join(lines)}"/>
    {''.join(f'<path stroke-width="{LINE * 1.7}" mask="url(#on-{k})" d="{d}"/>' for k, d in limb_lines.items())}
    <g stroke-width="{DETAIL}">{''.join(f'<path mask="url(#on-{k})" d="{' '.join(v)}"/>' for k, v in marks.items() if v and k in shows)}</g>
    <g stroke-width="2.4" stroke-dasharray="7 9"><path d="{' '.join(stitch)}"/></g>{furs}
  </g>
</svg>
'''
    return svg, [ox, oy, bw, bh], kinds


def main() -> None:
    kit_path = KIT / 'kit.json'
    kit = json.loads(kit_path.read_text())
    for oid, o in OUTFITS.items():
        if 'drawing' in o:      # drawn by ChatGPT: kit_outfit_ink.py makes that piece; the shapes here only colour it
            continue
        svg, box, kinds = outfit_svg(oid, o, kit)
        out = KIT / o['body'] / f'outfit-{oid}.svg'
        out.write_text(svg)
        body = next(b for b in kit['bodies'] if b['id'] == o['body'])
        pid = f'outfit/{oid}'
        entry = {'id': pid, 'slot': 'outfit', 'label': o['label'], 'period': o['period'], 'kinds': kinds, 'box': box,
                 'files': {'svg': f'{out.name}?v={hashlib.sha256(svg.encode()).hexdigest()[:10]}', 'under': BODIES[o['body']]['under']}}
        at = next((i for i, p in enumerate(body['pieces']) if p['id'] == pid), None)
        if at is None:
            after = max(i for i, p in enumerate(body['pieces']) if p['slot'] == 'outfit')
            body['pieces'].insert(after + 1, entry)
        else:
            body['pieces'][at] = {**body['pieces'][at], **entry}
        print(out, box, kinds, len(svg) // 1024, 'KB')
    ids = set(PRESETS)
    kit['presets'] = [p for p in kit['presets'] if p['id'] not in ids] + preset_entries(kit['id'])
    kit_path.write_text(json.dumps(kit, indent=1))


if __name__ == '__main__':
    main()
