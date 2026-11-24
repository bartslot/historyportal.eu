#!/usr/bin/env python3
"""Bake a character kit for the browser's Character tab (vault topics/character-creator/character-tab-plan.md, 5).

Every piece (outfit, face, eyes, mouth, hair, beard, headwear, extra, expression) is rendered by kit_render.py on its body
with a KEY palette (each colour kind its own exact colour), then cut out of that render: its flat fill, its ink, its shade
and the shade it casts on what lies under it. The browser restacks the pieces and recolours them by kind (no Python, no
AI when a teacher makes a person); the stage's own shader paints the watercolour (PAINT=flat).

Per body it also writes the rig (rig.json) and a label map (labels.webp): which bone each pixel of the canvas follows,
the nearest torso part outside the body, and which part continues UNDER a part drawn over it (the hidden paint the
browser fills in, so a raised arm opens no hole in the chest).

  python3 kit_bake.py [body ...]     -> public/character-kits/<kit>/v1/{kit.json, <body>/...}

Inputs: the kit folder (kit_parts.K) and kit_presets.py's bodies, outfits and presets. Renders take ~30 s each and run
JOBS at a time.
"""
from __future__ import annotations

import hashlib
import json
import re
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit_presets as P  # noqa: E402
import kit_outfit_svg  # noqa: E402
from img_io import find  # noqa: E402
from kit_parts import ANA, K, MOUTH_ZONE, PATCHES, compose, part as part_of  # noqa: E402

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
KIT_ID = 'babylonia-old-babylonian'
OUT = REPO / 'public/character-kits' / KIT_ID / 'v1'
SCALE = 2                       # render scale: a 1024x1536 sheet is baked at 2048x3072, for a sharp face close-up
JOBS = int(os.environ.get('JOBS', '6'))
LOSSY_Q = 82                    # ink, shade, cast: soft masks; the fill stays lossless (its colours name the kinds)

# colour kinds kit_render paints (its KINDS + iris, brow), each given a key colour R = 10 + 18 i, so the browser can read
# the kind from the red channel alone (layers.js kindOf) and recolour it
# hose (13, the last that fits in red): leggings, a colour of their own that follows the legs (paint.js CLOTH_ON_LEGS)
KINDS = ['skin', 'tunic', 'shawl', 'hair', 'rope', 'tie', 'white', 'grey', 'apron', 'ochre', 'mouth', 'iris', 'brow', 'hose']
KEY = {k: (10 + 18 * i, 250 - 18 * i, 128) for i, k in enumerate(KINDS)}
KIND_DEFAULT = {'white': '#fcfaf4', 'tie': '#b0754f', 'mouth': '#7a3a2c', 'iris': '#6e3c1e'}

# what each body may wear and look like; the first of each list is its default
BODY_KIT = {
    'girl': dict(face='girl', outfit='base-shift',
                 outfits=['base-shift', 'work-tunic-apron', 'long-wrap', 'long-tunic-shawl'],
                 faces=['girl', 'young-woman'],
                 parts={'eyes': [], 'mouth': ['mouths/gentle-smile', 'mouths/pressed', 'mouths/down', 'mouths/oh', 'mouths/ah'],
                        'hair': ['hair/loose', 'hair/braid', 'hair/bun'], 'beard': [],
                        'headwear': ['headwear/headband', 'headwear/shawl-over-head'], 'extra': ['extras/jewellery']}),
    'woman': dict(face='woman-n', outfit='base-shift',
                  outfits=['base-shift', 'work-tunic-apron', 'long-wrap', 'long-tunic-shawl'],
                  faces=['woman-n', 'woman-40-n', 'old-woman-n'],
                  parts={'eyes': ['eyes/woman-round', 'eyes/woman-hooded'], 'mouth': ['mouths/woman-pressed', 'mouths/woman-ah'],
                         'hair': ['hair/woman-bun'], 'beard': [],
                         'headwear': ['headwear/woman-headband', 'headwear/woman-shawl-over-head'], 'extra': ['extras/woman-jewellery']}),
    'man': dict(face='man', outfit='base-kilt',
                outfits=['base-kilt', 'scribe-wrap', 'merchant-tunic', 'soldier'],
                faces=['man'],
                parts={'eyes': ['eyes/man-calm'], 'mouth': [],
                       'hair': ['hair/man-hair-headband'], 'beard': ['hair/man-beard'],
                       'headwear': ['headwear/man-helmet'], 'extra': ['extras/man-seal']}),
}
EXPRESSIONS = ['curious', 'sad', 'angry', 'amazed']    # calm is the person's own face
# a part's slot in the stack, back to front (the head pieces lie over the outfit, the hair over the face)
SLOTS = ['outfit', 'face', 'eyes', 'mouth', 'expression', 'hair', 'beard', 'headwear', 'extra']
LABELS = {'base-shift': 'Plain shift', 'base-kilt': 'Plain kilt', 'work-tunic-apron': 'Work tunic and apron', 'long-wrap': 'Long wrap',
          'long-tunic-shawl': 'Long tunic and shawl', 'scribe-wrap': 'Scribe wrap', 'merchant-tunic': 'Merchant tunic', 'soldier': 'Soldier',
          'girl': 'Girl', 'young-woman': 'Young woman', 'woman-n': 'Woman', 'woman-40-n': 'Woman of forty', 'old-woman-n': 'Old woman',
          'man': 'Man'}

# the body maps' part colours (kit_render PART_HEX) and the rig made from them (rig_parts.py's names, parents, limits)
PART_HEX = {'head': 'FF00FF', 'braid': 'FF8000', 'chest': '00FFFF', 'shawl': 'FFFF00', 'skirt': '808080', 'foot_n': '80FF00', 'foot_f': '0080FF',
            'upperarm_n': 'FF0000', 'forearm_n': '800000', 'upperarm_f': '0000FF', 'forearm_f': '000080', 'shin_n': '008000', 'shin_f': '008080'}
BONE_OF = {'head': 'head', 'braid': 'head', 'chest': 'chest', 'shawl': 'chest', 'skirt': 'hips', 'foot_n': 'foot_n', 'foot_f': 'foot_f',
           'upperarm_n': 'upperarm_n', 'forearm_n': 'forearm_n', 'upperarm_f': 'upperarm_f', 'forearm_f': 'forearm_f',
           'shin_n': 'shin_n', 'shin_f': 'shin_f'}
# draw order of the rig's parts, back to front: far limbs, legs, body, head, near arm (rig_parts.ORDER without the cut-outs
# the kit does not have). The index + 1 is the part's number in labels.webp.
PARTS = ['forearm_f', 'upperarm_f', 'thigh_f', 'foot_f', 'shin_f', 'thigh_n', 'foot_n', 'shin_n', 'hips', 'chest', 'head', 'forearm_n', 'upperarm_n']
# a thigh has no paint of its own (it is under the skirt): its part is the shin carried on up under the skirt, painted by
# the browser from the shin's own colours, so the thigh has a handle and a swung leg shows no cut end
UNDER_FROM = {'thigh_n': 'shin_n', 'thigh_f': 'shin_f'}
PARENT = {'hips': None, 'chest': 'hips', 'head': 'chest', 'upperarm_n': 'chest', 'upperarm_f': 'chest', 'forearm_n': 'upperarm_n',
          'forearm_f': 'upperarm_f', 'thigh_n': 'hips', 'thigh_f': 'hips', 'shin_n': 'thigh_n', 'shin_f': 'thigh_f', 'foot_n': 'shin_n', 'foot_f': 'shin_f'}
# the near upper arm may reach forward across the chest (a 3/4 point); the stage's pose guard keeps it off the face
# (pose-guard.ts armClearOfFace). Past -45 the garment over the shoulder turns up with the arm like a torn flap (tester 11-15)
LIMIT = {'head': [-25, 25], 'chest': [-8, 8], 'upperarm_n': [-45, 25], 'upperarm_f': [-20, 20], 'forearm_n': [-110, 0], 'forearm_f': [-120, 0],
         'thigh_n': [-25, 20], 'thigh_f': [-25, 20], 'shin_n': [0, 120], 'shin_f': [0, 120], 'foot_n': [-30, 20], 'foot_f': [-30, 20]}
BAND_SHARE = {'upperarm_n': 0.5, 'upperarm_f': 0.5, 'forearm_n': 0.5, 'forearm_f': 0.5, 'foot_n': 0.6, 'foot_f': 0.6, 'head': 0.35,
              'shin_n': 0.5, 'shin_f': 0.5}
WAIST_BEND = 30                 # 1x px either side of the waist across which the body bends with a leaning chest (rig_parts)
EDGE_REACH = 8                  # 1x px: a drawn edge this far outside the map still follows the part it borders
KNEE_AT = 0.5                   # of hip to ankle: where the knee is (it lies under the skirt; the shin turns about it)
UNDER_ARM_PX = 40               # 1x px: a torso closed this far reaches under the hanging near arm
UNDER_SHIN_PX = 70              # 1x px: a shin goes on this far up under the skirt, so a swung leg shows no cut end
CAST_REACH = 30                 # 2x px: how far from a piece the shade it casts can fall
CONTOUR_KEEP = 6                # 2x px either side of the head's outline that only the face piece draws (a line's half width)
OWN_LINE = 6                    # 2x px round a part's mask its own contour can lie
OUTFIT_CLOTH = ('tunic', 'shawl', 'rope', 'apron', 'ochre')   # kit_render.OUTFIT_CLOTH: the kinds a garment is painted in
CHIN_AT = 0.70                  # of the head box's height: below it cloth is a garment's (a neckline), never the face
NECKLINE_CLEAR = 8              # 2x px the face piece keeps clear of a garment: a line's width
EDGE_BAND = 6                   # 2x px along a piece's keep edge where cut-off crumbs of ink are looked for
CRUMB_PX = 60                   # 2x px²: a bit of ink smaller than this, wholly in that band, is a crumb
COLLAR_GAP = 8                 # 1x px of the head next to the body that the outfit piece draws (its neckline)


def rgb_hex(h: str) -> list[int]:
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


# ── renders ──────────────────────────────────────────────────────────────────────────────────────────────────────────
def render(body: str, outfit: str, face: str, parts: list[str], work: Path) -> dict[str, np.ndarray]:
    """kit_render.py on the whole canvas with the key palette: fill (RGBA), ink, shade (r) as arrays at 2x."""
    work.mkdir(parents=True, exist_ok=True)
    head, _ = compose(face, parts)
    masks = {n: part_of(n)[1] for n in parts}
    drawn = np.zeros(head.shape[:2], bool)       # what kit_render lays over the head as hair (patches repaint the face)
    for n, m in masks.items():
        if not n.startswith(PATCHES + ('expressions/',)):
            drawn |= m
    Image.fromarray(head.astype(np.uint8)).save(work / 'head.webp', lossless=True)
    Image.fromarray((drawn * 255).astype(np.uint8)).save(work / 'parts-mask.webp', lossless=True)
    mouth = next((p for p in parts if p.startswith('mouths/')), None)
    mouth_mask = str(find(K / f'parts/{mouth}-mask.png')) if mouth else ''
    expr = next((p for p in parts if p.startswith('expressions/')), None)
    if expr:   # an expression's mouth (an open "oh" is solid ink) is a mouth, never the jaw's wedge
        mm = np.zeros(head.shape[:2], bool)
        x0, y0, x1, y1 = MOUTH_ZONE
        mm[y0:y1, x0:x1] = masks[expr][y0:y1, x0:x1]
        Image.fromarray((mm * 255).astype(np.uint8)).save(work / 'mouth-mask.webp', lossless=True)
        mouth_mask = str(work / 'mouth-mask.webp')
    env = dict(os.environ, KIT='1', NAME='p', FLAT=str(P.OUTFITS[body][outfit]), HEAD_SHEET=str(work / 'head.webp'),
               HAIR_MASK=str(work / 'parts-mask.webp'), PAL=json.dumps({k: list(v) for k, v in KEY.items()}),
               HEAD_BOX=json.dumps(P.BODIES[body]['box']), RENDERS='canvas', CANVAS_SCALE=str(SCALE), PAINT='flat', PIECES='1',
               MOUTH_MASK=mouth_mask)
    r = subprocess.run([sys.executable, str(HERE / 'kit_render.py'), str(ANA), str(find(P.BODIES[body]['map'])), str(work)],
                       env=env, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'{body} {outfit} {face} {parts}: kit_render failed\n{r.stderr[-2000:]}')
    read = lambda n: np.asarray(Image.open(work / f'p-canvas-{n}.webp'))
    head_mask = np.any(np.stack(list(masks.values())), 0) if masks else drawn
    return {'fill': read('fill'), 'ink': read('ink')[..., 0], 'shade': read('shade'), 'head_mask': head_mask}


def head_to_canvas(mask: np.ndarray, body: str, shape: tuple[int, int]) -> np.ndarray:
    """A head-sheet mask (1024 square) placed on the 2x canvas at the body's head box."""
    x0, y0, x1, y1 = [v * SCALE for v in P.BODIES[body]['box']]
    out = np.zeros(shape, bool)
    small = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).resize((x1 - x0, y1 - y0), Image.NEAREST)) > 127
    h, w = min(shape[0] - y0, small.shape[0]), min(shape[1] - x0, small.shape[1])
    out[y0:y0 + h, x0:x0 + w] = small[:h, :w]
    return out


# ── the body map, the rig and the labels ─────────────────────────────────────────────────────────────────────────────
def map_parts(body: str) -> tuple[np.ndarray, list[str]]:
    """Each pixel of the 1x canvas: the index of its map part (PART_HEX order), 255 in the air."""
    m = np.asarray(Image.open(find(P.BODIES[body]['map'])).convert('RGB')).astype(np.float32)
    names = list(PART_HEX)
    pal = np.array([rgb_hex(PART_HEX[n]) for n in names] + [[0, 0, 0]], np.float32)
    d = ((m[:, :, None, :] - pal[None, None]) ** 2).sum(-1).argmin(-1).astype(np.uint8)
    d[d == len(names)] = 255
    core = np.zeros(d.shape, bool)
    for i in range(len(names)):
        core |= ndimage.binary_erosion(d == i, iterations=2)
    solid = d != 255
    j = ndimage.distance_transform_edt(~core, return_distances=False, return_indices=True)
    out = np.where(solid, d[j[0], j[1]], 255).astype(np.uint8)     # the map's blended edges take the nearest clean part
    return out, names


def border_mid(a: np.ndarray, b: np.ndarray) -> tuple[list[float], float]:
    """Where two parts meet: the middle of their shared border and its length (the joint's width)."""
    edge = ndimage.binary_dilation(a, iterations=2) & ndimage.binary_dilation(b, iterations=2)
    ys, xs = np.nonzero(edge)
    if not len(xs):
        raise ValueError('the parts do not meet')
    return [float(xs.mean()), float(ys.mean())], float(max(np.ptp(xs), np.ptp(ys)) + 1)


def far_point(mask: np.ndarray, frm: list[float]) -> list[float]:
    ys, xs = np.nonzero(mask)
    i = int(np.argmax((xs - frm[0]) ** 2 + (ys - frm[1]) ** 2))
    return [float(xs[i]), float(ys[i])]


def arm_under_shawl(lab: np.ndarray, names: list[str], bone: dict, arm: str) -> np.ndarray:
    """The upper arm a map paints over with a shawl, given back to the arm. The girl's map is Ana's, who wore a shawl
    over her far shoulder: as chest it held the top of that sleeve still while the arm swung (Bart 11-16, torn sleeve).
    Shawl pixels along the bone, no further from it than the arm's own visible pixels, become the arm."""
    own, shawl = lab == names.index(arm), lab == names.index('shawl')
    if not own.any() or not shawl.any():
        return lab
    a, b = np.array(bone['frm']), np.array(bone['to'])
    ab = b - a
    ys, xs = np.mgrid[0:lab.shape[0], 0:lab.shape[1]]
    t = ((xs - a[0]) * ab[0] + (ys - a[1]) * ab[1]) / (ab @ ab)
    dist = np.abs((xs - a[0]) * ab[1] - (ys - a[1]) * ab[0]) / np.sqrt(ab @ ab)
    reach = np.percentile(dist[own & (t >= 0) & (t <= 1)], 95)
    out = lab.copy()
    out[shawl & (t >= 0) & (t <= 1) & (dist <= reach)] = names.index(arm)
    return out


def rig_of(body: str) -> tuple[dict, np.ndarray]:
    """The body's bones (1x px) and its label map (2x): R the bone part, G the torso part outside, B the part under."""
    lab, names = map_parts(body)
    part = {n: lab == i for i, n in enumerate(names)}
    joints = json.loads((K / 'body/joints.json').read_text())[body]
    neck, hip = [float(v) for v in joints['NECK']], [float(v) for v in joints['HIP']]
    bones: dict[str, dict] = {}
    waist, _ = border_mid(part['chest'] | part['shawl'], part['skirt'])
    top = far_point(part['head'], neck)
    bones['hips'] = dict(frm=hip, to=waist)
    bones['chest'] = dict(frm=waist, to=neck, band=WAIST_BEND, reach=float(np.ptp(np.nonzero(part['skirt'])[1])))
    bones['head'] = dict(frm=neck, to=top, width=float(np.ptp(np.nonzero(part['head'])[1])) * 0.5)
    for s in 'nf':
        sh = [float(v) for v in joints['SHOULDER'][s]]
        elbow, ew = border_mid(part[f'upperarm_{s}'], part[f'forearm_{s}'])
        bones[f'upperarm_{s}'] = dict(frm=sh, to=elbow, width=ew)
        bones[f'forearm_{s}'] = dict(frm=elbow, to=far_point(part[f'forearm_{s}'], elbow), width=ew)
        ankle, aw = border_mid(part[f'shin_{s}'], part[f'foot_{s}'])
        ys, xs = np.nonzero(part[f'shin_{s}'])
        hip_s = [float(xs[ys <= ys.min() + 6].mean()), hip[1]]
        knee = [hip_s[0] + (ankle[0] - hip_s[0]) * KNEE_AT, hip_s[1] + (ankle[1] - hip_s[1]) * KNEE_AT]
        bones[f'thigh_{s}'] = dict(frm=hip_s, to=knee)
        bones[f'shin_{s}'] = dict(frm=knee, to=ankle, width=float(np.ptp(xs[ys <= ys.min() + 6]) + 1))
        bones[f'foot_{s}'] = dict(frm=ankle, to=far_point(part[f'foot_{s}'], ankle), width=aw)
    for s in 'nf':
        lab = arm_under_shawl(lab, names, bones[f'upperarm_{s}'], f'upperarm_{s}')
    toe, ankle = bones['foot_n']['to'], bones['foot_n']['frm']
    facing = 1 if toe[0] >= ankle[0] else -1
    out = []
    for name, parent in PARENT.items():
        b = bones[name]
        entry = {'name': name, 'parent': parent, 'from': [round(v, 2) for v in b['frm']], 'to': [round(v, 2) for v in b['to']]}
        if name in LIMIT:
            entry['limit'] = LIMIT[name]
        if name in BAND_SHARE and b.get('width'):
            entry['band'] = round(b['width'] * BAND_SHARE[name], 1)
            entry['reach'] = round(b['width'] * 1.2, 1)
        if b.get('band'):
            entry['band'], entry['reach'] = round(b['band'], 1), round(b['reach'], 1)
        out.append(entry)
    rig = {'bones': out, 'parts': PARTS, 'underFrom': UNDER_FROM, 'facing': facing, 'size': [int(lab.shape[1]), int(lab.shape[0])]}

    # R: the rig part each pixel of the map follows (0: air)
    bone_part = np.zeros(lab.shape, np.uint8)
    for i, n in enumerate(names):
        bone_part[lab == i] = PARTS.index(BONE_OF[n]) + 1
    solid = bone_part > 0
    # a drawn edge a little outside the map (the render's line is wider than the map's) follows the part it borders
    dist, (jy, jx) = ndimage.distance_transform_edt(~solid, return_indices=True)
    bone_part = np.where(dist <= EDGE_REACH, bone_part[jy, jx], 0).astype(np.uint8)
    solid = bone_part > 0
    # G: outside the body, the nearest torso part (a wide robe stays with the hips and chest, never with a hand)
    torso = np.isin(bone_part, [PARTS.index('hips') + 1, PARTS.index('chest') + 1, PARTS.index('head') + 1])
    j = ndimage.distance_transform_edt(~torso, return_distances=False, return_indices=True)
    near_torso = bone_part[j[0], j[1]]
    # B: the part that goes on UNDER this pixel: the torso under the near arm, a shin up under the skirt
    under = np.zeros(lab.shape, np.uint8)
    body_closed = ndimage.binary_closing(np.isin(bone_part, [PARTS.index(p) + 1 for p in ('hips', 'chest')]),
                                         structure=np.ones((3, 3)), iterations=UNDER_ARM_PX // 2)
    for arm in ('upperarm_n', 'forearm_n'):
        hid = body_closed & (bone_part == PARTS.index(arm) + 1)
        under[hid] = near_torso[hid]
    for s in 'nf':
        shin = bone_part == PARTS.index(f'shin_{s}') + 1
        ys, xs = np.nonzero(shin)
        x0, x1, y0 = xs.min(), xs.max(), ys.min()
        hid = np.zeros(lab.shape, bool)
        hid[max(0, y0 - UNDER_SHIN_PX):y0 + 2, x0:x1 + 1] = True
        hid &= bone_part == PARTS.index('hips') + 1
        under[hid] = PARTS.index(f'thigh_{s}') + 1
    labels = np.dstack([bone_part, np.where(solid, 0, near_torso), under]).astype(np.uint8)
    big = np.asarray(Image.fromarray(labels).resize((labels.shape[1] * SCALE, labels.shape[0] * SCALE), Image.NEAREST))
    return rig, big


# ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
def snap(fill: np.ndarray) -> np.ndarray:
    """Every painted pixel an exact key colour: a blend where two kinds meet takes the nearest pure pixel's kind (a blend
    of two keys reads as a third kind in the browser, a red fringe between skin and hair). Alpha stays as rendered."""
    r, g = fill[..., 0].astype(int), fill[..., 1].astype(int)
    idx = np.clip(np.round((r - 10) / 18), 0, len(KINDS) - 1).astype(int)
    exact = (fill[..., 3] > 0) & (np.abs(r - (10 + 18 * idx)) <= 1) & (np.abs(g - (250 - 18 * idx)) <= 1)
    if not exact.any():
        return fill
    _, (jy, jx) = ndimage.distance_transform_edt(~exact, return_indices=True)
    k = idx[jy, jx]
    out = fill.copy()
    painted = fill[..., 3] > 0
    out[..., 0] = np.where(painted, 10 + 18 * k, 0)
    out[..., 1] = np.where(painted, 250 - 18 * k, 0)
    out[..., 2] = np.where(painted, 128, 0)
    return out


def kind_of(fill: np.ndarray) -> np.ndarray:
    return np.clip(np.round((fill[..., 0].astype(int) - 10) / 18), 0, len(KINDS) - 1).astype(int)


def one_cloth(fill: np.ndarray) -> np.ndarray:
    """A headwear piece in one cloth kind (its most common), its hair kinds and eye white left alone."""
    k = kind_of(fill)
    solid = fill[..., 3] > 0
    keep = np.isin(k, [KINDS.index(n) for n in ('hair', 'grey', 'brow', 'white')])
    cloth = solid & ~keep
    fabric = cloth & np.isin(k, [KINDS.index(n) for n in ('ochre', 'tunic', 'shawl', 'apron', 'rope', 'tie')])
    if not fabric.any():
        return fill
    counts = np.bincount(k[fabric], minlength=len(KINDS))
    # a head cloth is the head-cloth zone (ochre); a band of its own colour (a headband) is the band zone (apron)
    main = KINDS.index('apron') if counts.argmax() == KINDS.index('apron') else KINDS.index('ochre')
    out = fill.copy()
    out[cloth, 0], out[cloth, 1], out[cloth, 2] = 10 + 18 * main, 250 - 18 * main, 128
    return out


def no_white(fill: np.ndarray, keep_near: str | None = None) -> np.ndarray:
    """The 'white' kind painted over by the paint round it (eyes are the face piece's; on a body white is a speck, a nail's
    glint). Each speck takes the kind most of its surround has, never one stray pixel's (a glint on a thumbnail took the
    band colour of an antialiased pixel on the line beside it, Bart 11-15). `keep_near`: white within reach of this kind
    stays (the eye white round an iris)."""
    r = fill[..., 0].astype(int)
    white = (fill[..., 3] > 0) & (r == 10 + 18 * KINDS.index('white'))
    if keep_near:
        white &= ~ndimage.binary_dilation(kind_of(fill) == KINDS.index(keep_near), iterations=40)
    if not white.any():
        return fill
    other = (fill[..., 3] > 127) & (r != 10 + 18 * KINDS.index('white'))
    kinds = kind_of(fill)
    lab, n = ndimage.label(white)
    out = fill.copy()
    for j, sl in enumerate(ndimage.find_objects(lab), 1):
        y0, x0 = max(0, sl[0].start - 4), max(0, sl[1].start - 4)
        win = (slice(y0, sl[0].stop + 4), slice(x0, sl[1].stop + 4))
        me = lab[win] == j
        ring = ndimage.binary_dilation(me, iterations=3) & ~me & other[win]
        if not ring.any():                                                 # nothing painted round it: the nearest paint
            _, (jy, jx) = ndimage.distance_transform_edt(~other, return_indices=True)
            m = lab == j
            out[m, :3] = fill[jy[m], jx[m], :3]
            continue
        k = int(np.bincount(kinds[win][ring], minlength=len(KINDS)).argmax())
        out[win][me, 0], out[win][me, 1], out[win][me, 2] = 10 + 18 * k, 250 - 18 * k, 128
    return out


def kinds_in(fill: np.ndarray, mask: np.ndarray, share: float = 0.0) -> list[str]:
    """The colour kinds a piece shows: at least 1 % of its solid paint, or 400 px (a cord, a band); never under `share`."""
    sel = (fill[..., 3] > 200) & mask
    if not sel.any():
        return []
    idx = np.clip(np.round((fill[..., 0][sel].astype(np.float32) - 10) / 18), 0, len(KINDS) - 1).astype(int)
    counts = np.bincount(idx, minlength=len(KINDS))
    return [KINDS[i] for i in range(len(KINDS)) if counts[i] >= max(share * sel.sum(), min(400, max(60, 0.01 * sel.sum())))]


def neckline_zone(body: str, fills: list[np.ndarray]) -> np.ndarray:
    """Where any of a body's outfits shows cloth under the chin, grown by a line's width (2x canvas): the face piece stays
    out of it, so each outfit's neckline is drawn whole by the outfit piece."""
    x0, y0, x1, y1 = P.BODIES[body]['box']
    chin = int((y0 + CHIN_AT * (y1 - y0)) * SCALE)
    cloth = np.zeros(fills[0].shape[:2], bool)
    for f in fills:
        cloth |= (f[..., 3] > 0) & np.isin(kind_of(f), [KINDS.index(n) for n in OUTFIT_CLOTH])
    cloth = ndimage.binary_opening(cloth, iterations=2)
    cloth[:chin] = False
    return ndimage.binary_dilation(cloth, iterations=NECKLINE_CLEAR)


def edge_clean(ink: np.ndarray, keep: np.ndarray) -> np.ndarray:
    """A piece's ink without the crumbs its cut leaves: where the keep mask (stair-stepped, from the 1x map) runs along a
    stroke that another piece draws whole (the neckline, under the face piece's edge), the cut leaves a row of dots over
    that stroke (Bart 11-15). Small bits of ink in the band along the keep edge go; a line crossing the edge stays."""
    band = keep & ~ndimage.binary_erosion(keep, iterations=EDGE_BAND)
    lab, n = ndimage.label(ink > 96)
    if not n:
        return ink
    idx = np.arange(1, n + 1)
    small = ndimage.sum(np.ones_like(lab), lab, idx) < CRUMB_PX
    inside = ndimage.minimum(band, lab, idx).astype(bool)                 # every pixel of it in the band
    crumbs = ndimage.binary_dilation(np.isin(lab, idx[small & inside]), iterations=2) & band
    out = ink.copy()
    out[crumbs] = 0
    return out


def save_piece(folder: Path, name: str, fill: np.ndarray, ink: np.ndarray, shade: np.ndarray, cast: np.ndarray | None, keep: np.ndarray) -> dict:
    """A piece cropped to what it draws: fill (lossless), ink, shade and its cast shade (lossy), and its box on the canvas."""
    drawn = keep & ((fill[..., 3] > 0) | (ink > 0))
    if cast is not None:
        drawn |= cast > 4
    ys, xs = np.nonzero(drawn)
    if not len(xs):
        raise ValueError(f'{name}: nothing drawn')
    x0, y0, x1, y1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
    crop = lambda a: a[y0:y1, x0:x1]
    k = crop(keep)
    f = snap(crop(fill))
    f[~k] = 0
    if name.split('-', 1)[0] in ('hair', 'headwear'):   # 'white' in hair is the air between a strand and the neck: see-through
        f[f[..., 0] == 10 + 18 * KINDS.index('white')] = 0
    i = np.where(k, crop(ink), 0).astype(np.uint8)
    if name.startswith('face-'):   # the one piece cut along another's stroke (its neckline edge)
        i = edge_clean(i, k)
    s = crop(shade).copy()
    s[~k] = 0
    folder.mkdir(parents=True, exist_ok=True)
    Image.fromarray(f).save(folder / f'{name}.webp', lossless=True, method=6)
    Image.fromarray(np.dstack([i, i, i])).save(folder / f'{name}-ink.webp', quality=LOSSY_Q, method=6)
    Image.fromarray(s).save(folder / f'{name}-shade.webp', quality=LOSSY_Q, method=6)
    files = {'fill': f'{name}.webp', 'ink': f'{name}-ink.webp', 'shade': f'{name}-shade.webp'}
    if cast is not None and (crop(cast) > 4).any():
        c = crop(cast).astype(np.uint8)
        Image.fromarray(np.dstack([c, c, c])).save(folder / f'{name}-cast.webp', quality=LOSSY_Q, method=6)
        files['cast'] = f'{name}-cast.webp'
    return {'box': [x0, y0, x1 - x0, y1 - y0], 'files': files}


def bake_body(body: str, pool: ThreadPoolExecutor, tmp: Path) -> dict:
    kit = BODY_KIT[body]
    face0, outfit0 = kit['face'], kit['outfit']
    jobs: dict[str, tuple] = {'base': (outfit0, face0, [])}
    for o in kit['outfits']:
        jobs[f'outfit/{o}'] = (o, face0, [])
    for f in kit['faces']:
        jobs[f'face/{f}'] = (outfit0, f, [])
    for slot, names in kit['parts'].items():
        for n in names:
            jobs[n] = (outfit0, face0, [n])
    sets = expression_sets(body)
    for (face, eye), by_e in sets.items():   # each face and eyes' own expressions, painted over them (Bart 11-15)
        for pid in by_e.values():
            jobs[pid] = (outfit0, face, ([eye] if eye else []) + [pid])
    futures = {pid: pool.submit(render, body, *args, tmp / body / pid.replace('/', '_')) for pid, args in jobs.items()}
    done = {pid: f.result() for pid, f in futures.items()}
    print(body, len(done), 'renders')

    lab, names = map_parts(body)
    big = lambda m: np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((m.shape[1] * SCALE, m.shape[0] * SCALE), Image.NEAREST)) > 127
    # the head, short of where it meets the body: the neckline and collar are the outfit's own lines, never two pieces' at once
    below = (lab != names.index('head')) & (lab != names.index('braid')) & (lab != 255)
    head_region = big((lab == names.index('head')) & ~ndimage.binary_dilation(below, iterations=COLLAR_GAP))
    # and short of every outfit's cloth under the chin (Bart 11-15): a tunic or wrap whose neckline sits higher than the
    # base body's would otherwise lie under the face piece's skin, its line half covered by a stepped edge
    head_region &= ~neckline_zone(body, [done[f'outfit/{o}']['fill'] for o in kit['outfits']])
    base = done['base']
    shape = base['ink'].shape
    folder = OUT / body
    pieces = []

    def piece(pid: str, slot: str, keep: np.ndarray, with_cast: bool) -> None:
        r = done[pid]
        cast = None
        if with_cast:
            near = ndimage.binary_dilation(keep, iterations=CAST_REACH) & ~keep
            cast = np.where(near, np.clip(r['shade'][..., 0].astype(int) - base['shade'][..., 0].astype(int), 0, 255), 0)
        meta = save_piece(folder, pid.replace('/', '-'), r['fill'], r['ink'], r['shade'], cast, keep)
        name = pid.split('/', 1)[1]
        pieces.append({'id': pid, 'slot': slot, 'label': LABELS.get(name, name.replace('woman-', '').replace('man-', '').replace('-', ' ').capitalize()),
                       'kinds': kinds_in(r['fill'], keep), **meta})

    everything = np.ones(shape, bool)
    # the head's own contour belongs to the face piece only: a patch (eyes, mouth, an expression) stops short of it, so the
    # contour is never drawn twice with two pens' wobble (Bart 11-14: "seams between pieces never show as ink")
    sil = base['fill'][..., 3] > 0
    contour = ndimage.binary_dilation(sil & ~ndimage.binary_erosion(sil, iterations=2), iterations=CONTOUR_KEEP)
    for o in kit['outfits']:
        piece(f'outfit/{o}', 'outfit', everything, False)
    for f in kit['faces']:
        piece(f'face/{f}', 'face', head_region, False)
    for slot, plist in kit['parts'].items():
        for n in plist:
            m = head_to_canvas(done[n]['head_mask'], body, shape)
            ink = done[n]['ink'] > 20
            if slot in ('eyes', 'mouth'):
                keep = ndimage.binary_dilation(m, iterations=2) & ~contour
            else:   # its own contour lies on the mask's edge: a line's width round it, no more (no face lines carried along)
                keep = ndimage.binary_dilation(m, iterations=2) | (ndimage.binary_dilation(m, iterations=OWN_LINE) & ink)
            piece(n, slot, keep, slot in ('hair', 'beard', 'headwear'))
    for pid in [p for by_e in sets.values() for p in by_e.values()]:
        if pid in done:
            m = head_to_canvas(done[pid]['head_mask'], body, shape)
            piece(pid, 'expression', ndimage.binary_dilation(m, iterations=2) & ~contour, False)
    write_rig(body)
    return {'id': body, 'label': body.capitalize(), 'pieces': pieces, 'rig': f'{body}/rig.json',
            'expressions': sets.get((face0, None), {}),
            'expressionSets': {f'{face}/{eye or ""}': by_e for (face, eye), by_e in sets.items()}}


def expression_sets(body: str) -> dict[tuple[str, str | None], dict[str, str]]:
    """Each face x eyes of a body that has painted expressions: {(face, eyes or None): {expression: piece id}}. An emotion
    changes only the brows, lids and mouth, so each chosen face and eye style has its own set (Bart 11-15: "the other
    emotions should also show it"). Patch files: the first face keeps its old names (<body>-<e>, <eyes>-<e>), other
    faces are <face>-<e> and <face>_<eyes>-<e>."""
    kit = BODY_KIT[body]
    out = {}
    for face in kit['faces']:
        for eye in [None] + kit['parts'].get('eyes', []):
            name = eye.split('/', 1)[1] if eye else None
            prefix = (name or body) if face == kit['face'] else (f'{face}_{name}' if name else face)
            by_e = {e: f'expressions/{prefix}-{e}' for e in EXPRESSIONS if find_or_none(K / f'parts/expressions/{prefix}-{e}.png')}
            if by_e:
                out[(face, eye)] = by_e
    return out


def find_or_none(p: Path) -> Path | None:
    """The part file and its mask, or None while either is missing (NO_EXPRESSIONS=1 skips expressions)."""
    if os.environ.get('NO_EXPRESSIONS') == '1':
        return None
    f, m = find(p), find(p.with_name(p.stem + '-mask.png'))
    return f if f.is_file() and m.is_file() else None


def svg_pieces(body: str, pieces: list[dict]) -> None:
    """A piece with an SVG beside the baked files (<body>/<piece>.svg, e.g. kit_helmet_svg.py) is drawn from that SVG in
    the browser (resources/js/character/svg-piece.js): a re-bake keeps it, with the box the SVG names."""
    for pc in pieces:
        src = OUT / body / (pc['id'].replace('/', '-') + '.svg')
        if not src.exists():
            continue
        text = src.read_text()
        box = re.search(r'data-box="([\d. ]+)"', text)
        # the SVG is cached for a month: its URL carries its content, so a changed shape reaches every browser
        pc['files'] = {'svg': f'{src.name}?v={hashlib.sha256(text.encode()).hexdigest()[:10]}'}
        pc['box'] = [int(float(v)) for v in box.group(1).split()]


def presets() -> list[dict]:
    out = []
    for pid, p in P.PRESETS.items():
        parts = list(p['parts'])
        recipe = {'kit': KIT_ID, 'kitVersion': 1, 'view': 'front34', 'role': p['role'], 'body': p['body'], 'face': p['face'],
                  'outfit': p['outfit'], 'parts': parts, 'eyes': p.get('eyes'), 'mouth': p.get('mouth'), 'skin': p['skin'],
                  'hair_colour': p['hair_colour'], 'height_m': p['height_m'], 'zones': p['zones'], 'facing': 1}
        out.append({'id': pid, 'label': p['role'], 'recipe': {k: v for k, v in recipe.items() if v is not None}})
    return out + kit_outfit_svg.preset_entries(KIT_ID)      # the people in SVG outfits (Marco Polo)


def write_rig(body: str) -> None:
    rig, labels = rig_of(body)
    folder = OUT / body
    folder.mkdir(parents=True, exist_ok=True)
    Image.fromarray(labels).save(folder / 'labels.webp', lossless=True, method=6)
    rig.update(labels='labels.webp', canvas=[labels.shape[1], labels.shape[0]], scale=SCALE,
               headBox=[v * SCALE for v in P.BODIES[body]['box']], face=BODY_KIT[body]['face'], outfit=BODY_KIT[body]['outfit'])
    (folder / 'rig.json').write_text(json.dumps(rig, indent=1))


def main() -> None:
    if sys.argv[1:2] == ['--snap']:         # snap the baked fills to exact keys and recount kinds (no renders)
        kit = json.loads((OUT / 'kit.json').read_text())
        for b in kit['bodies']:
            for pc in b['pieces']:
                if 'fill' not in pc['files']:   # an SVG piece: nothing baked to snap
                    continue
                path = OUT / b['id'] / pc['files']['fill']
                f = snap(np.asarray(Image.open(path).convert('RGBA')))
                if pc['slot'] == 'outfit':   # eye-white on a body is a nail glint or a collar speck: the colour beside it
                    f = no_white(f)
                if pc['slot'] == 'face':     # and on a face only in the eyes
                    f = no_white(f, keep_near='iris')
                if pc['slot'] == 'headwear':   # one cloth: its painted gradient fell between kinds and read as patchwork
                    f = one_cloth(f)
                Image.fromarray(f).save(path, lossless=True, method=6)
                own = f[..., 3] > 0
                if pc['slot'] in ('hair', 'beard', 'headwear', 'extra'):   # what the piece adds, not the skin rim round it
                    own &= ~np.isin(np.clip(np.round((f[..., 0].astype(int) - 10) / 18), 0, len(KINDS) - 1), [KINDS.index('skin')])
                pc['kinds'] = kinds_in(f, own, 0.004 if pc['slot'] == 'outfit' else 0.0)
        (OUT / 'kit.json').write_text(json.dumps(kit, indent=1))
        return
    if sys.argv[1:2] == ['--rig']:          # the rigs only (fast): python3 kit_bake.py --rig [body ...]
        for b in sys.argv[2:] or list(BODY_KIT):
            write_rig(b)
        return
    bodies = sys.argv[1:] or list(BODY_KIT)
    OUT.mkdir(parents=True, exist_ok=True)
    kit_path = OUT / 'kit.json'
    old = json.loads(kit_path.read_text()) if kit_path.exists() else {}
    with tempfile.TemporaryDirectory() as t, ThreadPoolExecutor(JOBS) as pool:
        made = {b: bake_body(b, pool, Path(t)) for b in bodies}
    kept = {b['id']: b for b in old.get('bodies', []) if b['id'] not in made}
    for b, made_body in made.items():
        svg_pieces(b, made_body['pieces'])
        # pieces that are only an SVG (kit_hair_svg.py, kit_outfit_svg.py) are not baked here: keep them as they were
        baked = {pc['id'] for pc in made_body['pieces']}
        was = next((ob for ob in old.get('bodies', []) if ob['id'] == b), {'pieces': []})
        made_body['pieces'] += [pc for pc in was['pieces'] if 'svg' in pc['files'] and pc['id'] not in baked]
    kit = {
        'id': KIT_ID, 'version': 1, 'view': 'front34', 'paper': '#f6f5ee', 'ink': '#191410',
        'kinds': KINDS, 'kindDefaults': KIND_DEFAULT,
        'zoneKinds': P.ZONE_KIND,
        'swatches': [{'id': k, 'hex': v} for k, v in P.TWELVE.items()],
        'skins': [{'id': k, 'hex': v} for k, v in P.SKIN.items()],
        'hairColours': [{'id': k, 'hex': v} for k, v in P.HAIR.items()],
        'slots': SLOTS,
        'bodies': [made.get(b) or kept[b] for b in BODY_KIT if b in made or b in kept],
        'presets': presets(),
    }
    kit_path.write_text(json.dumps(kit, indent=1))
    print('kit.json', kit_path.stat().st_size // 1024, 'KB')


if __name__ == '__main__':
    main()
