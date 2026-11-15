"""Ana from ChatGPT part sheets with swappable parts (plan 12.6, proof 1). Env: HEAD_SHEET, HAIR_MASK, DROP_BRAID=1,
PAL (json kind -> [r,g,b]), RENDERS (full,closeup,eyes).

  python3 engine-mvp/tools/kit_render.py <dir with flat.png + head-flat.png> <map.png> <out dir>

The one copy (vault topics/character-creator, topics/character-bones/plan.md 10); the bone rig paints flat-sheet
figures with it too (flat_rig_sheet.py, RENDERS=canvas: the whole sheet at CANVAS_SCALE, as <NAME>-canvas.webp). Every output is .webp (img_io.WEBP, alpha lossless); inputs may be .webp or .png.

flat.png       the whole figure, clean flat colour, 1024x1536 (an edit of her rest drawing)
head-flat.png  her head redrawn at 1024x1024 from the crop HEAD_BOX of flat.png (same canvas, so it fits back)
Both are cut with her checked part map and traced; the head part takes its shapes and lines from the head sheet.
Then OUR shading wash + aquarel.paint + pen strokes, for the whole figure and for a close-up window.
"""
from __future__ import annotations

import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree

SRC, OUT = Path(sys.argv[1]), Path(sys.argv[3])
REPO = Path(__file__).resolve().parents[2]   # this repo: aquarel.py and the wash texture (a 4th argument is ignored)
sys.path.insert(0, str(REPO / 'tools/watercolour'))
import aquarel  # noqa: E402
FLAT_PAINT = os.environ.get('PAINT') == 'flat'   # flat colour + ink + a shade mask (<name>-shade.webp): the stage shader colours the shade and washes it
PIECES = FLAT_PAINT and os.environ.get('PIECES') == '1'   # kit_bake.py: <name>-fill/-ink/-shade.webp apart instead of one picture
from img_io import find, save as save_image  # noqa: E402  (renders out as .webp, Bart 11-13)
from thin_pieces import lying_on  # noqa: E402
MAP = find(Path(sys.argv[2]))                     # a part map written as .webp, or an older .png

OUT.mkdir(parents=True, exist_ok=True)
INK = (0x19, 0x14, 0x10)
PAPER = (0xf6, 0xf5, 0xee)
HEAD_BOX = (319, 5, 688, 374)                    # the crop of the figure sheet the head sheet was drawn from
if os.environ.get('HEAD_BOX'):
    HEAD_BOX = tuple(json.loads(os.environ['HEAD_BOX']))       # a posed head: the same crop, moved with the neck
HK = (HEAD_BOX[2] - HEAD_BOX[0]) / 1024          # head sheet px -> figure px
S = dict(width=2.2, startW=90, endW=55, wJitter=35, wobble=2.1, wFreq=1.0, longBoost=60, retrace=15)   # Ink Lab "production"
KIT_PEN = os.environ.get('KIT') == '1'
if KIT_PEN:
    # kit figures (Bart 11-14 "LOOK AT THE LINES OF THE CHIN"): one clean tapered stroke per contour. A retrace laid a
    # second, offset stroke over part of a line (it read as a blobby dash), and a 35 % width jitter swelled lines into blobs
    S.update(wJitter=10, retrace=0)
FIGURE = {'ref': 1024, 'soften': 0, 'warp': 0, 'levels': 5, 'edge': 0.06, 'edge_px': 4,
          'bloom_share': 0.12, 'bloom_light': 0.10, 'bloom_rim': 0.05, 'bloom_scale': 14, 'bloom_soft': 6,
          'reserve_share': 0.0, 'reserve_px': 2, 'sliver_share': 0.02}
OUTFIT_CLOTH = ('tunic', 'shawl', 'rope', 'apron', 'ochre')               # the kinds a garment is painted in
CLOTH_MIN_PX = 600                                                        # 1x px: the least patch of them that is a garment
KINDS = {'skin': (250, 190, 120), 'tunic': (252, 222, 172), 'shawl': (222, 92, 62), 'hair': (112, 50, 20), 'rope': (158, 90, 40),
         'tie': (240, 180, 40), 'white': (252, 252, 250), 'grey': (196, 196, 194),
         'apron': (70, 96, 122), 'ochre': (201, 162, 78), 'mouth': (90, 42, 34)}
names = list(KINDS)
SHADE = {'grey': (0.80, 0.80, 0.84), 'skin': (0.86, 0.79, 0.74), 'tunic': (0.90, 0.87, 0.83), 'shawl': (0.84, 0.80, 0.80), 'hair': (0.78, 0.78, 0.8), 'rope': (0.85, 0.82, 0.8), 'apron': (0.82, 0.82, 0.86), 'ochre': (0.84, 0.80, 0.78)}
PART_HEX = {'head': 'FF00FF', 'braid': 'FF8000', 'chest': '00FFFF', 'shawl': 'FFFF00', 'skirt': '808080', 'foot_n': '80FF00', 'foot_f': '0080FF',
            'upperarm_n': 'FF0000', 'forearm_n': '800000', 'upperarm_f': '0000FF', 'forearm_f': '000080', 'shin_n': '008000', 'shin_f': '008080'}
PARTS = list(PART_HEX)
HEAD = PARTS.index('head')
ARMS = [['upperarm_n', 'forearm_n'], ['upperarm_f', 'forearm_f']]
ORDER = ['braid', 'upperarm_f', 'forearm_f', 'shin_f', 'foot_f', 'shin_n', 'foot_n', 'skirt', 'chest', 'shawl', 'upperarm_n', 'forearm_n', 'head']   # back to front

# self-shade per group: the arms each on their own (they overlap the body), the rest as one body; per part it draws
# the part map's edges (a long skirt crosses the shin parts) as stair-step shade lines
SHADE_GROUPS = ([[PARTS.index(p) for p in g] for g in ARMS] + [[i for i, p in enumerate(PARTS) if not any(p in g for g in ARMS)]]
                if os.environ.get('KIT') == '1' or os.environ.get('SHADE_GROUPS') == 'body' else [[i] for i in range(len(PARTS))])
# SHADE_GROUPS=body: the same grouping without the rest of KIT (the bone rig: a part border is a joint, not an edge)
clamp = lambda v, a, b: max(a, min(b, v))
smooth = lambda t: t * t * (3 - 2 * t)
hexof = lambda c: '#%02x%02x%02x' % tuple(int(v) for v in c)
lab = lambda a: cv2.cvtColor(np.asarray(a, np.uint8).reshape(-1, 1, 3), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)


# ── reading a sheet ─────────────────────────────────────────────────────────────────────────────────────────────
def polylines(sk):
    nb = ndimage.convolve(sk.astype(np.uint8), np.ones((3, 3), np.uint8), mode='constant') - 1
    node = sk & (nb != 2)
    seen = np.zeros_like(sk)
    h, w = sk.shape
    N8 = [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)]
    out = []

    def walk(y, x, py, px):
        ln = [(py, px), (y, x)]
        while True:
            seen[y, x] = True
            if node[y, x]:
                return ln
            nxt = None
            for dy, dx in N8:
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and sk[yy, xx] and (yy, xx) != ln[-2] and (not seen[yy, xx] or node[yy, xx]):
                    nxt = (yy, xx)
                    break
            if nxt is None:
                return ln
            ln.append(nxt)
            y, x = nxt

    for y, x in zip(*np.where(node)):
        seen[y, x] = True
        for dy, dx in N8:
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and sk[yy, xx] and not seen[yy, xx]:
                out.append(walk(yy, xx, y, x))
    for y, x in zip(*np.where(sk & ~seen)):
        if not seen[y, x]:
            seen[y, x] = True
            for dy, dx in N8:
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and sk[yy, xx] and not seen[yy, xx]:
                    out.append(walk(yy, xx, y, x))
                    break
    return [np.array(l, np.float32) for l in out]


def join(segs):
    """Lines that meet at a junction and run on in the same direction become one line."""
    ends = []
    for l in segs:
        for e in (0, 1):
            tip = l[0] if e == 0 else l[-1]
            back = l[min(len(l) - 1, 8)] if e == 0 else l[max(0, len(l) - 9)]
            v = tip - back
            ends.append((tip, v / (np.linalg.norm(v) or 1)))
    pairs = sorted((float(ends[a][1] @ ends[b][1]), a, b) for a, b in cKDTree([e[0] for e in ends]).query_pairs(4.5) if a // 2 != b // 2)
    link = {}
    for score, a, b in pairs:
        if score < -0.6 and a not in link and b not in link:
            link[a], link[b] = b, a
    used, out = set(), []
    for i in range(len(segs)):
        if i in used:
            continue
        cur, ent, guard = i, 0, 0
        while (2 * cur + ent) in link and guard < len(segs):
            nxt = link[2 * cur + ent]
            cur, ent, guard = nxt // 2, 1 - nxt % 2, guard + 1
            if cur == i:
                break
        chain = []
        while cur not in used:
            used.add(cur)
            chain.append(segs[cur] if ent == 0 else segs[cur][::-1])
            leave = 2 * cur + (1 - ent)
            if leave not in link:
                break
            cur, ent = link[leave] // 2, link[leave] % 2
        out.append(np.concatenate(chain))
    return out


def rejoin(lines, reach, min_len):
    """Broken strokes made whole: two line ends within `reach` px that run on into each other become one line (a contour
    cut by a junction, a jaw cut where its wedge was); then strokes shorter than `min_len` (ticks, specks) go."""
    lines = [(np.asarray(p, np.float32), w) for p, w in lines]
    while True:
        ends = []
        for i, (p, _) in enumerate(lines):
            if len(p) < 2:
                continue
            for e in (0, 1):
                tip = p[0] if e == 0 else p[-1]
                back = p[min(len(p) - 1, 6)] if e == 0 else p[max(0, len(p) - 7)]
                v = tip - back
                ends.append((i, e, tip, v / (np.linalg.norm(v) or 1)))
        if len(ends) < 2:
            break
        tree = cKDTree([t for _, _, t, _ in ends])
        best = None
        for a, b in tree.query_pairs(reach):
            ia, ea, ta, va = ends[a]
            ib, eb, tb, vb = ends[b]
            if ia == ib:
                continue
            gap = tb - ta
            g = gap / (np.linalg.norm(gap) or 1)
            # both run on through the gap: a's end points at b, b's end points back at a
            score = float(va @ g) - float(vb @ g) - float(va @ vb)
            short = min(len(lines[ia][0]), len(lines[ib][0])) < 14      # a fragment's own direction is noise: looser
            if float(va @ vb) < (-0.2 if short else -0.5) and (np.linalg.norm(gap) < 2 or (float(va @ g) > (0.0 if short else 0.3) and float(vb @ g) < (0.0 if short else -0.3))):
                if best is None or score > best[0]:
                    best = (score, ia, ea, ib, eb)
        if best is None:
            break
        _, ia, ea, ib, eb = best
        pa, wa = lines[ia]
        pb, wb = lines[ib]
        pa = pa if ea == 1 else pa[::-1]                  # a runs into the gap
        pb = pb if eb == 0 else pb[::-1]                  # b runs out of it
        merged = (np.concatenate([pa, pb]), (wa * len(pa) + wb * len(pb)) / (len(pa) + len(pb)))
        lines = [l for k, l in enumerate(lines) if k not in (ia, ib)] + [merged]
    length = lambda p: float(np.hypot(*np.diff(p, axis=0).T).sum()) if len(p) > 1 else 0.0
    return [(p, w) for p, w in lines if length(p) >= min_len]


MEET_PX = 8.0                                                            # 1x px: a line end this close to another line runs on to it
MEET_AIM_PX = 8.0                                                        # 1x px of a line's end its direction is read over
MEET_MIN_LEN = 40.0                                                     # 1x px: only long lines (a jaw, a neck), never lashes or hair ticks


def meet(lines, reach, min_len):
    """A long line that stops just short of another long line, pointing at it, runs on to touch it: the skeleton splits a
    T-junction (a jaw meeting the neck, the back of the neck meeting a shoulder) and leaves a gap the paint showed through
    as a little unlined wedge (Bart 11-15). Points are figure px."""
    length = lambda p: float(np.hypot(*np.diff(p, axis=0).T).sum()) if len(p) > 1 else 0.0
    long_ = [i for i, (p, _) in enumerate(lines) if length(p) >= min_len]
    if len(long_) < 2:
        return lines
    pts = np.concatenate([lines[i][0] for i in long_])
    owner = np.concatenate([np.full(len(lines[i][0]), i) for i in long_])
    tree = cKDTree(pts)
    out = list(lines)
    for i in long_:
        p, w = out[i]
        for end in (0, 1):
            run = p if end == 0 else p[::-1]
            tip = run[0]
            gone = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(run, axis=0).T))])
            back = run[min(len(run) - 1, int(np.searchsorted(gone, MEET_AIM_PX)))]   # the way it runs over its last few px
            v = tip - back
            v = v / (np.linalg.norm(v) or 1)
            best = None
            for k in tree.query_ball_point(tip, reach):
                if owner[k] == i:
                    continue
                gap = pts[k] - tip
                d = float(np.linalg.norm(gap))
                if d < 0.5:                                               # already touching
                    best = None
                    break
                if float(v @ gap) / d > 0.5 and (best is None or d < best[0]):
                    best = (d, pts[k])
            if best is not None:
                p = np.concatenate([best[1][None], p]) if end == 0 else np.concatenate([p, best[1][None]])
        out[i] = (p, w)
    return out


def tidy(l):
    if len(l) < 7:
        return l
    k = np.array([1, 2, 3, 4, 3, 2, 1], np.float32) / 16
    pad = np.pad(l, ((3, 3), (0, 0)), mode='edge')
    return np.stack([np.convolve(pad[:, 0], k, 'valid'), np.convolve(pad[:, 1], k, 'valid')], 1)


def read_sheet(path: Path, blob_r: float, rim: int = 2, solid_rows: tuple | None = None, solid_also=None):
    """A clean flat-colour sheet on green -> what each pixel is (kind), its ink as centre lines + solid spots."""
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    h, w = rgb.shape[:2]
    green = (rgb[..., 1] > 170) & (rgb[..., 0] < 120) & (rgb[..., 2] < 120)
    alpha = ndimage.binary_opening(~green, iterations=1)
    lum = rgb @ np.array([0.3, 0.59, 0.11])
    ink = (lum < 42) & alpha
    # under a line the paint is the solid colour beyond the line's soft rim, never the rim itself (it reads as another colour)
    under = ndimage.binary_dilation(ink, iterations=max(1, rim // 2 + 1))
    idx = ndimage.distance_transform_edt(under | ~alpha, return_distances=False, return_indices=True)
    paint = cv2.medianBlur(rgb[idx[0], idx[1]].astype(np.uint8), 3)
    d = ((lab(paint.reshape(-1, 3))[:, None, :] - lab(np.array([KINDS[n] for n in names]))[None]) ** 2).sum(-1)
    kind = cv2.medianBlur(d.argmin(1).reshape(h, w).astype(np.uint8), 3)
    # a hair-thin strip of another colour along an ink line is the line's soft edge, not paint: it takes its neighbour
    strip = np.zeros((h, w), bool)
    for i, n in enumerate(names):
        if n != 'white':
            strip |= (kind == i) & ~ndimage.binary_opening(kind == i, iterations=rim)
    jj = ndimage.distance_transform_edt(strip, return_distances=False, return_indices=True)
    kind = kind[jj[0], jj[1]]
    speck = np.zeros((h, w), bool)
    min_px = 30 * (rim / 2) ** 2
    for i, n in enumerate(names):
        if n == 'white':
            continue
        lab_, nn = ndimage.label(kind == i)
        if nn:
            sizes = ndimage.sum(kind == i, lab_, range(1, nn + 1))
            speck |= np.isin(lab_, 1 + np.flatnonzero(sizes < min_px))
    jj = ndimage.distance_transform_edt(speck, return_distances=False, return_indices=True)
    kind = kind[jj[0], jj[1]]
    il_, ni_ = ndimage.label(ink)
    paint_near = ndimage.binary_dilation(alpha & ~ink, iterations=1)
    lone = [i + 1 for i, (sz, touch) in enumerate(zip(ndimage.sum(ink, il_, range(1, ni_ + 1)), ndimage.maximum(paint_near, il_, range(1, ni_ + 1)))) if sz < 80 * (rim / 2) ** 2 and not touch]
    stray = np.isin(il_, lone)
    ink &= ~stray
    alpha &= ~stray
    fill_area = ndimage.binary_erosion(alpha, iterations=rim)        # fills end under the contour line, never outside it
    kind[~fill_area] = 255
    colour = {n: tuple(int(v) for v in np.median(rgb[(kind == i) & ~ink], axis=0)) for i, n in enumerate(names) if ((kind == i) & ~ink).sum() > 30}
    dist = ndimage.distance_transform_edt(ink)
    rr = int(blob_r + 3)
    blob = (cv2.dilate((dist > blob_r).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * rr + 1, 2 * rr + 1))) > 0) & ink
    if solid_rows is not None:   # kit sheets: solid ink only where it is shape (eyes, brows); a thick bit of a contour stays
        keep = np.zeros_like(blob)   # in its stroke, never a blob with round ends (Bart 11-14, the chin's dashes)
        keep[solid_rows[0]:solid_rows[1]] = True
        eyes = np.isin(kind, [names.index(n) for n in ('white',) if n in names])
        keep &= ndimage.binary_dilation(eyes, iterations=40) if eyes.any() else False   # round the eyes: lashes, brows
        keep &= ndimage.binary_erosion(alpha, iterations=10)                            # never the head's own contour
        if solid_also is not None:                                                      # and an open mouth: solid ink
            keep |= solid_also
        blob &= keep
    thin = cv2.resize((ink & ~ndimage.binary_erosion(blob, iterations=2)).astype(np.uint8) * 255, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    skel = cv2.ximgproc.thinning((cv2.GaussianBlur(thin, (0, 0), 0.8) > 110).astype(np.uint8) * 255) > 0
    half = ndimage.zoom(dist.astype(np.float32), 2, order=1)
    lines = []
    for l in join([l for l in polylines(skel) if len(l) >= 3]):
        if len(l) < 9:
            continue
        wd = float(np.median(half[l[:, 0].astype(int), l[:, 1].astype(int)])) * 2
        lines.append((tidy(l)[:, ::-1] / 2, wd))                      # (x, y) in sheet px, full width in sheet px
    return dict(rgb=rgb, alpha=alpha, fill_area=fill_area, ink=ink, kind=kind, colour=colour, blob=blob, lines=lines, w=w, h=h)


def cut_lines(lines, keep, smooth=0):
    """Keep the stretches of each line where keep(x, y) holds. `smooth`: points either side a decision is the majority of,
    so a line running along a border is cut once, not into dashes where the border wavers across it."""
    out = []
    for pts, wd in lines:
        ok = keep(pts[:, 0], pts[:, 1])
        if smooth and len(ok) > 2 * smooth:
            ok = ndimage.median_filter(np.asarray(ok, np.uint8), size=2 * smooth + 1, mode='nearest').astype(bool)
        start = None
        for i, v in enumerate(list(ok) + [False]):
            if v and start is None:
                start = i
            elif not v and start is not None:
                if i - start >= 4:
                    out.append((pts[start:i], wd))
                start = None
    return out


F = read_sheet(Path(os.environ.get('FLAT', find(SRC / 'flat.png'))), 3.6, solid_rows=(0, 0) if os.environ.get('KIT') == '1' else None)
NAME = os.environ.get('NAME', 'ana')
W, H = F['w'], F['h']
m = np.asarray(Image.open(MAP).convert('RGB')).astype(np.float32)
pal = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in PART_HEX.values()] + [[0, 0, 0]], np.float32)
raw_part = ((m[:, :, None, :] - pal[None, None]) ** 2).sum(-1).argmin(-1).astype(np.uint8)
core = np.zeros((H, W), bool)
for i in range(len(PARTS)):
    core |= ndimage.binary_erosion(raw_part == i, iterations=3)
j = ndimage.distance_transform_edt(~core, return_distances=False, return_indices=True)
part_all = raw_part[j[0], j[1]]                                       # the nearest part, for every pixel of the canvas
if os.environ.get('KIT') == '1':                                        # kit sheets have no braid: Ana's braid area is head above the chin
    _b = part_all == PARTS.index('braid')
    _up = _b.copy(); _up[int(HEAD_BOX[1] + 560 * HK):] = False
    part_all[_up] = HEAD
    _jb = ndimage.distance_transform_edt(_b, return_distances=False, return_indices=True)
    part_all = np.where(_b & ~_up, part_all[_jb[0], _jb[1]], part_all).astype(np.uint8)
    raw_part = np.where(raw_part == PARTS.index('braid'), part_all, raw_part).astype(np.uint8)
BRAID = PARTS.index('braid')
DROP_BRAID = os.environ.get('DROP_BRAID') == '1'
if DROP_BRAID:
    others = (part_all != BRAID) & F['fill_area']
    inside = ndimage.binary_fill_holes(ndimage.binary_closing(others, iterations=14)) & (part_all == BRAID) & F['fill_area']
    jn = ndimage.distance_transform_edt(~others, return_distances=False, return_indices=True)
    part_all = np.where(inside, part_all[jn[0], jn[1]], part_all)       # behind the braid: the part next to it
    k_other = (F['kind'] != names.index('hair')) & (F['kind'] != 255)
    jk = ndimage.distance_transform_edt(~k_other, return_distances=False, return_indices=True)
    F['kind'] = np.where(inside, F['kind'][jk[0], jk[1]], F['kind'])  # and the cloth it would be
    F['fill_area'] &= ~((part_all == BRAID) & ~inside)
    F['kind'][~F['fill_area']] = 255
    F['blob'] &= ~ndimage.binary_dilation(part_all == BRAID, iterations=2)
part = part_all.copy()
part[~F['fill_area']] = 255

def kp_keep_big(m, min_px):
    lab_, n_ = ndimage.label(m)
    return np.isin(lab_, 1 + np.flatnonzero(ndimage.sum(m, lab_, range(1, n_ + 1)) >= min_px)) if n_ else m


_mouth_early = np.asarray(Image.open(os.environ['MOUTH_MASK']).convert('L')) > 127 if os.environ.get('MOUTH_MASK') else None
Hd = read_sheet(Path(os.environ.get('HEAD_SHEET', find(SRC / 'head-flat.png'))), 6.0, rim=4, solid_rows=(280, 560) if os.environ.get('KIT') == '1' else None,
                solid_also=ndimage.binary_dilation(_mouth_early, iterations=6) if _mouth_early is not None else None)
IM_ = names.index('mouth')
MOUTH_MASK = np.asarray(Image.open(os.environ['MOUTH_MASK']).convert('L')) > 127 if os.environ.get('MOUTH_MASK') else np.zeros((1024, 1024), bool)
Hd['kind'] = np.where((Hd['kind'] == IM_) & ~MOUTH_MASK, names.index('hair'), Hd['kind']).astype(np.uint8)
F['kind'] = np.where(F['kind'] == IM_, names.index('hair'), F['kind']).astype(np.uint8)
x0b, y0b, x1b, y1b = HEAD_BOX
head_lab = cv2.resize((part_all[y0b:y1b, x0b:x1b] == HEAD).astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) > 0
if os.environ.get('HAIR_MASK'):
    head_lab |= np.asarray(Image.open(os.environ['HAIR_MASK']).convert('L')) > 127   # the hair part draws wherever it reaches
if DROP_BRAID:
    braid_lab = cv2.resize((raw_part[y0b:y1b, x0b:x1b] == BRAID).astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) > 0
    head_lab |= braid_lab & np.isin(Hd['kind'], [names.index('skin')])   # the nape the braid hid
_added = np.asarray(Image.open(os.environ['HAIR_MASK']).convert('L')) > 127 if os.environ.get('HAIR_MASK') else np.zeros((1024, 1024), bool)
Hd['kind'] = np.where((Hd['kind'] == names.index('apron')) & ~_added, names.index('grey'), Hd['kind']).astype(np.uint8)   # thin grey brows are not slate cloth
if os.environ.get('KIT') == '1':
    added = np.asarray(Image.open(os.environ['HAIR_MASK']).convert('L')) > 127 if os.environ.get('HAIR_MASK') else np.zeros_like(head_lab)
    cloth = np.isin(Hd['kind'], [names.index(n) for n in ('tunic', 'shawl', 'rope', 'apron')])
    cloth = ndimage.binary_opening(cloth, iterations=3) & ~added
    below = np.zeros_like(cloth); below[560:] = True                      # only under the chin
    cloth = ndimage.binary_dilation(cloth & below, iterations=5) & below & ~added & ~np.isin(Hd['kind'], [names.index('skin')])
    head_lab &= ~cloth
    # under the chin the outfit's own cloth shows (Bart 11-15, "a flat step in the neckline"): the head sheet is a bust with
    # a neckline of its own, which a wrap's edge or a necklace's tunic need not follow. Where the body sheet has cloth the
    # head sheet's skin stops; the lines next to cloth there are the body sheet's alone (below, at the line cut)
    # (a garment is a big patch: the body sheet's own red-brown lips, under row 560 on a longer face, are not cloth)
    body_cloth = kp_keep_big(ndimage.binary_opening(np.isin(F['kind'], [names.index(n) for n in OUTFIT_CLOTH]), iterations=2), CLOTH_MIN_PX)
    bcloth_h = cv2.resize(body_cloth[y0b:y1b, x0b:x1b].astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) > 0
    bcloth_h &= below & ~added
    head_lab &= ~bcloth_h
    HEAD_SHEET_CLOTH = cloth | bcloth_h
    unpainted = ~Hd['alpha']; unpainted[:560] = False                     # below the chin the head is only where its sheet has paint:
    head_lab &= ~(unpainted & ~added)                                     # an adult's longer neck comes from the body sheet
    # the top of the neck: where the map's head part narrows
    hw = (part_all == HEAD).sum(1)
    low = np.arange(H) > y0b + 0.5 * (y1b - y0b)
    wide = low & (hw > 0.25 * hw.max())                                   # not the last few rows of a V neckline
    neck_w = hw[wide].min() if wide.any() else 0
    neck_top = int(np.flatnonzero(wide & (hw <= 1.15 * neck_w))[0]) if neck_w else 0
    NECK_BODY = os.environ.get('NECK_BODY') == '1'                       # a head sheet drawn for another body: the body draws the neck
    if NECK_BODY and neck_top:
        nb = np.zeros_like(head_lab); nb[max(0, int((neck_top - y0b) / HK)):] = True
        head_lab &= ~(nb & ~added)
    # the head's own outline where the map shows only background: the map is a redrawn copy, its head edge can run down
    # the middle of the throat line and cut it in pieces (Bart 11-14). Never over another part (a collar would double).
    bg_lab = cv2.resize((raw_part[y0b:y1b, x0b:x1b] == len(PARTS)).astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) > 0
    head_lab |= ndimage.binary_dilation(head_lab, iterations=10) & Hd['ink'] & bg_lab
    fig_head = np.zeros((H, W), bool)
    fig_head[y0b:y1b, x0b:x1b] = cv2.resize(head_lab.astype(np.uint8), (x1b - x0b, y1b - y0b), interpolation=cv2.INTER_NEAREST) > 0
    lost = (part_all == HEAD) & ~fig_head                                 # body pixels the head no longer covers: nearest body part
    # only from the top of the neck down (where the map's head part narrows): above it the body's own skull and jaw stay
    # hidden, even where an adult body's jaw reaches past the head sheet's
    lost[:max(int(y0b + 560 * HK), neck_top)] = False
    jb = ndimage.distance_transform_edt(lost | (part_all == HEAD), return_distances=False, return_indices=True)
    part_all = np.where(lost, part_all[jb[0], jb[1]], part_all).astype(np.uint8)
    # where neither the head (its collar cut away) nor the body draws, inside the figure: the body paint next to it
    drawn_fig = (F['fill_area'] & (part_all != HEAD)) | fig_head
    hb = np.zeros((H, W), bool); hb[y0b:y1b, x0b:x1b] = True
    gap = ndimage.binary_fill_holes(ndimage.binary_closing(drawn_fig, iterations=8)) & ~drawn_fig & hb
    # only a gap that lies between the head and the body; a pocket the closing sealed beside a beard or a bun stays empty
    near_h = ndimage.binary_dilation(fig_head, iterations=3)
    near_b = ndimage.binary_dilation(F['fill_area'] & (part_all != HEAD), iterations=3)
    gl, gn = ndimage.label(gap)
    if gn:
        both = ndimage.maximum(near_h, gl, range(1, gn + 1)).astype(bool) & ndimage.maximum(near_b, gl, range(1, gn + 1)).astype(bool)
        gap = np.isin(gl, 1 + np.flatnonzero(both))
    if gap.any():
        src = F['fill_area'] & (part_all != HEAD) & (F['kind'] != 255)
        jg = ndimage.distance_transform_edt(~src, return_distances=False, return_indices=True)
        F['kind'] = np.where(gap, F['kind'][jg[0], jg[1]], F['kind']).astype(np.uint8)
        part_all = np.where(gap, part_all[jg[0], jg[1]], part_all).astype(np.uint8)
        F['fill_area'] |= gap
        print('filled', int(gap.sum()), 'px between head and body')
    part = part_all.copy(); part[~F['fill_area']] = 255
    if not NECK_BODY:                                                     # (the body's own neck lines stay when it draws the neck)
        F['blob'] &= ~ndimage.binary_dilation(lost, iterations=3)      # the body sheet's own small head left thick lines there
Hd['kind'][~head_lab] = 255
Hd['blob'] &= head_lab
at = lambda arr, x, y: arr[np.clip(y.astype(int), 0, arr.shape[0] - 1), np.clip(x.astype(int), 0, arr.shape[1] - 1)]
CHIN = np.zeros((H, W), bool)                                            # figure px: where the jaw's wedge was, washed softly
if os.environ.get('KIT') == '1':
    # the sheets draw the shadow under the jaw as one solid black wedge (Bart 11-14: "the hard shadow underneath the chin
    # is not correct"): it becomes a jaw line of the sheet's usual width, and a soft skin wash where the wedge was
    d_ink = ndimage.distance_transform_edt(Hd['ink'])
    core = d_ink > 9                                                      # an outline is ~6 px half-width; the wedge 13-16
    core[:600] = False                                                    # (brows are as thick: only below the nose)
    core &= ~ndimage.binary_dilation(MOUTH_MASK, iterations=4)
    wedge = ndimage.binary_dilation(core, iterations=12) & Hd['ink']
    wedge[:600] = False
    wedge = kp_keep_big(wedge, 1500)                                      # not the small spots where two lines meet
    if wedge.sum() > 300:
        Hd['blob'] &= ~wedge
        zone = ndimage.binary_dilation(wedge, iterations=1)
        Hd['lines'] = cut_lines(Hd['lines'], lambda x, y: ~at(zone, x, y))       # the wedge's own rims
        sk = cv2.ximgproc.thinning(wedge.astype(np.uint8) * 255) > 0
        near_w = ndimage.binary_dilation(wedge, iterations=15)                 # as wide as the lines it joins (the jaw tapers into it)
        joined = [w_ for pts_, w_ in Hd['lines'] if at(near_w, pts_[[0, -1], 0], pts_[[0, -1], 1]).any()]
        wd_ = float(np.median(joined or [w_ for _, w_ in Hd['lines']]))
        Hd['lines'] += [(tidy(l)[:, ::-1], wd_) for l in join([l for l in polylines(sk) if len(l) >= 3]) if len(l) >= 9]
        CHIN[y0b:y1b, x0b:x1b] = cv2.resize(wedge.astype(np.uint8), (x1b - x0b, y1b - y0b), interpolation=cv2.INTER_NEAREST) > 0
        print('jaw wedge', int(wedge.sum()), 'px -> line + wash')
if os.environ.get('KIT') == '1':
    # one jaw: the jaw line cut at the wedge and the wedge's own line become one stroke; no ticks left where lines met
    Hd['lines'] = rejoin(Hd['lines'], 18, 12)
    F['lines'] = rejoin(F['lines'], 12, 9)
at = lambda arr, x, y: arr[np.clip(y.astype(int), 0, arr.shape[0] - 1), np.clip(x.astype(int), 0, arr.shape[1] - 1)]
BORDER_SMOOTH = 12 if os.environ.get('KIT') == '1' else 0
LINE_R = 4                                                               # 1x px: a line this close to cloth is that cloth's edge
head_keep = head_lab
NEAR_CLOTH = np.zeros((H, W), bool)
if os.environ.get('KIT') == '1':
    # an edge of cloth under the chin is drawn by the body sheet only: the head sheet's own bust neckline (it runs off the
    # sheet's bottom edge, a flat run there) never, the body sheet's neckline or wrap edge always, even inside the map's head
    near_h = ndimage.binary_dilation(HEAD_SHEET_CLOTH, iterations=int(round(LINE_R / HK)))
    near_h[-int(round(3 * LINE_R / HK)):] = True                          # and at its bottom edge, where that neckline runs off
    # a neckline lies inside the figure; the neck's own outline against the air stays the head's, wherever it runs to
    near_h &= ~ndimage.binary_dilation(~Hd['alpha'], iterations=int(round(LINE_R / HK)))
    # and only where the body sheet paints, well inside its outline (it draws that edge itself): next to cloth the body sheet
    # leaves as air (the girl's head sheet has a shawl on the shoulder) the head's line is the outline
    _paint = cv2.resize(F['alpha'][y0b:y1b, x0b:x1b].astype(np.uint8), (1024, 1024), interpolation=cv2.INTER_NEAREST) > 0
    near_h &= ndimage.binary_erosion(_paint, iterations=int(round(LINE_R / HK)), border_value=1)   # (the body goes on past the crop)
    head_keep = head_lab & ~(near_h & ~_added)
    _bc = body_cloth.copy(); _bc[:int(y0b + 560 * HK)] = False
    NEAR_CLOTH = ndimage.binary_dilation(_bc, iterations=LINE_R)
head_lines = [(pts * HK + (x0b, y0b), wd * HK) for pts, wd in cut_lines(Hd['lines'], lambda x, y: at(head_keep, x, y), BORDER_SMOOTH)]
others_core = np.zeros((H, W), bool)
for i in range(len(PARTS)):
    if i != BRAID:
        others_core |= ndimage.binary_erosion(raw_part == i, iterations=2)
braid_zone = ndimage.binary_dilation(raw_part == BRAID, iterations=8) & ~others_core
body_lines = cut_lines(F['lines'], lambda x, y: ((at(part_all, x, y) != HEAD) | at(NEAR_CLOTH, x, y)) & ~(DROP_BRAID & at(braid_zone, x, y)), BORDER_SMOOTH // 2)
if DROP_BRAID:
    F['blob'] &= ~braid_zone
if os.environ.get('KIT') == '1':   # what the head/body cut left of a line near the border is a dot: join it on, or drop it
    body_lines = rejoin(body_lines, 6, 8)
    head_lines = rejoin(head_lines, 4, 4)
lines = body_lines + head_lines
if os.environ.get('KIT') == '1':
    lines = meet(lines, MEET_PX, MEET_MIN_LEN)
names = names + ['iris', 'brow']
IH, IG, II, IB = names.index('hair'), names.index('grey'), names.index('iris'), names.index('brow')
hair_head = np.asarray(Image.open(os.environ['HAIR_MASK']).convert('L')) > 127 if os.environ.get('HAIR_MASK') else head_lab
for sheet, hair_here in ((F, part_all == BRAID), (Hd, hair_head)):
    k = sheet['kind']
    sheet['kind'] = np.where((k == IH) & ~hair_here, II, np.where((k == IG) & ~hair_here, IB, k)).astype(np.uint8)
med = lambda sh, i, d: tuple(int(v) for v in np.median(sh['rgb'][(sh['kind'] == i) & ~sh['ink']], axis=0)) if ((sh['kind'] == i) & ~sh['ink']).sum() > 30 else d
F['blob'] &= part_all != HEAD
colour_of = dict(F['colour'])
colour_of['white'] = (252, 250, 244)
colour_of['tie'] = (0xb0, 0x75, 0x4f)
for k_, v_ in KINDS.items():
    colour_of.setdefault(k_, v_)                                 # the sheet made her hair ties yellow: red ochre from the 12
colour_of.setdefault('grey', Hd['colour'].get('grey', (196, 196, 194)))
colour_of['iris'] = med(Hd, II, (110, 60, 30))
colour_of['brow'] = med(Hd, IB, (150, 150, 150))
colour_of.update({k: tuple(v) for k, v in json.loads(os.environ.get('PAL', '{}')).items()})
print('figure kinds', {n: hexof(c) for n, c in F['colour'].items()}, '| head kinds', {n: hexof(c) for n, c in Hd['colour'].items()})
print(len(body_lines), 'body lines,', len(head_lines), 'head lines')


def potrace(mask, turd=4):
    pbm = OUT / '_m.pbm'
    Image.fromarray((~mask).astype(np.uint8) * 255).convert('1').save(pbm)
    svg = subprocess.run(['potrace', '-s', '-t', str(turd), '-a', '1.1', '-O', '0.3', '-o', '-', str(pbm)], capture_output=True, text=True, check=True).stdout
    pbm.unlink()
    g = re.search(r'(<g transform.*?</g>)', svg, re.S)
    return re.sub(r'fill="[^"]*"', '', g.group(1)) if g and '<path' in g.group(1) else ''


grow = lambda mk, n=2: ndimage.binary_dilation(mk, iterations=n)
HEAD_T = f'translate({x0b} {y0b}) scale({HK:.6f})'
_cache = {}


def shapes():
    """Every part's flat shapes, traced once: [(part, kind, svg group, in head space?)]."""
    if 'shapes' not in _cache:
        out = []
        for pn in ORDER:
            pi = PARTS.index(pn)
            for ki, kn in enumerate(names):
                mk = (Hd['kind'] == ki) if pn == 'head' else ((part == pi) & (F['kind'] == ki))
                if mk.sum() > 12:
                    out.append((pn, kn, potrace(grow(mk, 3 if pn == 'head' else 2), 6 if pn == 'head' else 4), pn == 'head'))
        _cache['shapes'] = out
        _cache['blob_f'] = potrace(F['blob'], 2)
        _cache['blob_h'] = potrace(Hd['blob'], 4)
    return _cache['shapes']


def svg_text(palette, box, fills=True, with_lines=True, only_kind=None, blobs_only=False):
    x0, y0, x1, y1 = box
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}" width="{x1 - x0}" height="{y1 - y0}">']
    sh = shapes()
    if fills and not blobs_only:
        for pn in ORDER:
            out.append(f'<g id="{pn}"' + (f' transform="{HEAD_T}"' if pn == 'head' else '') + '>')
            for p, kn, g, _ in sh:
                if p == pn and (only_kind is None or kn == only_kind):
                    out.append(f'<g data-kind="{kn}" fill="{hexof(palette[kn])}">{g}</g>')
            out.append('</g>')
    if with_lines or blobs_only:
        out.append(f'<g id="ink-solid" fill="{hexof(INK)}">{_cache["blob_f"]}<g transform="{HEAD_T}">{_cache["blob_h"]}</g></g>')
    if with_lines and not blobs_only:
        out.append(f'<g id="ink-lines" fill="none" stroke="{hexof(INK)}" stroke-linecap="round" stroke-linejoin="round">')
        for pts, wd in lines:
            out.append('<path d="M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts[::2]) + f'" stroke-width="{wd:.2f}"/>')
        out.append('</g>')
    return '\n'.join(out) + '\n</svg>'


(OUT / f'{NAME}-parts.svg').write_text(svg_text(colour_of, (0, 0, W, H)))
print('ana-parts.svg', (OUT / f'{NAME}-parts.svg').stat().st_size // 1024, 'KB')


OWN_SIDE_PX = 2.5                                                         # 1x px either side of a drawn line that is re-read
SLIVER_PX = 60                                                            # 1x px²: a patch smaller than this along a line may go
SPECK_PX = 4                                                              # 1x px²: a patch this small is a stray antialiased speck
SLIVER_SHARE = 0.3                                                        # of its edge on another paint (not ink): a sliver


def kinds_of(fill: np.ndarray, keys: np.ndarray) -> np.ndarray:
    """Each pixel's kind: 0 air, 1 + the nearest key colour (worked out once per distinct colour)."""
    rgb = fill[..., :3].astype(np.int64)
    packed = (rgb[..., 0] << 16) | (rgb[..., 1] << 8) | rgb[..., 2]
    uniq, inv = np.unique(packed, return_inverse=True)
    cols = np.stack([uniq >> 16, (uniq >> 8) & 255, uniq & 255], 1).astype(np.float32)
    near = 1 + ((cols[:, None] - keys[None]) ** 2).sum(-1).argmin(1)
    return np.where(fill[..., 3] > 127, near[inv.reshape(packed.shape)], 0)


def walk_in(val: np.ndarray, todo: np.ndarray, steps: int) -> np.ndarray:
    """The -1 pixels of `todo` take a 4-neighbour's value, ring by ring, never from ink (-2) or another unknown."""
    for _ in range(steps):
        open_ = todo & (val == -1)
        if not open_.any():
            break
        got = np.full(val.shape, -1)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb = np.roll(val, (dy, dx), (0, 1))
            got = np.where((got == -1) & (nb >= 0), nb, got)
        val = np.where(open_ & (got >= 0), got, val)
    return val


def own_side(fill: np.ndarray, cover: np.ndarray, scale: float, keys: list, keep: list) -> np.ndarray:
    """Every fill pixel next to a drawn line takes the paint (or the air) of its own side of that line (Bart 11-15, "a thin
    skin rim outside the contours"). Each kind's shape is grown under the sheet's line, and the pen redraws that line
    slimmer (tapered, jittered), so a grown shape showed past it: skin outside the outer contour, one cloth across a seam.
    Near the line a pixel takes the value of the nearest pixel beyond its reach on the same side (a walk that never
    crosses ink); a pixel with no such neighbour (a cord between two lines) keeps its paint. Then a small patch of one
    paint left along a line, edged mostly by another paint rather than ink (a wider sliver), goes to its neighbours; a
    shape the ink rings all round (a bead) stays. Round the `keep` kinds (the eyes and the mouth: drawn shapes, a lower
    lid has no line to walk round) nothing changes."""
    key = np.array(keys, np.float32)
    ink = cover > 0.5
    reach = max(1, int(round(OWN_SIDE_PX * scale)))
    kind = kinds_of(fill, key)
    shape_px = np.isin(kind, [k + 1 for k in keep])
    guard = ndimage.binary_dilation(shape_px, iterations=2 * reach)
    band = ~ink & ndimage.binary_dilation(ink, iterations=reach) & ~guard
    val = np.where(ink, -2, np.where(band, -1, kind))                     # -2 ink, -1 not known yet
    # a stray speck of a kind (an antialiased pixel the trace kept) is no paint to walk from: it would spread over the band
    specks = np.zeros(band.shape, bool)
    for k in np.unique(val[val > 0]):
        lab_, n_ = ndimage.label(val == k)
        if n_:
            idx = np.arange(1, n_ + 1)
            tiny = ndimage.sum(np.ones_like(lab_), lab_, idx) < SPECK_PX * scale * scale
            specks |= np.isin(lab_, idx[tiny])
    specks &= ~guard
    val = np.where(specks, -1, val)
    val = walk_in(val, band | specks, reach + 3)
    # slivers: small patches of a kind touching the band, edged more by another paint than by ink
    lined = ndimage.binary_dilation(band, iterations=1)
    gone = np.zeros(val.shape, bool)
    for k in np.unique(val[band & (val > 0)]):
        lab_, n_ = ndimage.label(val == k)
        if not n_:
            continue
        idx = np.arange(1, n_ + 1)
        small = (ndimage.sum(np.ones_like(lab_), lab_, idx) < SLIVER_PX * scale * scale) & ndimage.maximum(lined, lab_, idx).astype(bool)
        if not small.any():
            continue
        ring = ndimage.grey_dilation(lab_, size=3) * (lab_ == 0)          # an edge pixel names the patch beside it
        other = np.bincount(ring[(val >= 0) & (val != k)], minlength=n_ + 1)[1:]
        inked = np.bincount(ring[val == -2], minlength=n_ + 1)[1:]
        sliver = small & (other > SLIVER_SHARE * (other + inked))
        gone |= np.isin(lab_, idx[sliver]) & ~guard
    if gone.any():                                                         # each takes the paint most of its surround has
        glab, _ = ndimage.label(gone)
        for j, sl in enumerate(ndimage.find_objects(glab), 1):
            win = (slice(max(0, sl[0].start - 3), sl[0].stop + 3), slice(max(0, sl[1].start - 3), sl[1].stop + 3))
            me = glab[win] == j
            ring = ndimage.binary_dilation(me, iterations=2) & ~me & (val[win] >= 0) & ~gone[win]
            if ring.any():
                val[win][me] = np.bincount(val[win][ring]).argmax()
    fix = (band | gone | specks) & (val >= 0)
    lut = np.concatenate([np.zeros((1, 3), np.float32), key])
    out = fill.copy()
    out[..., :3] = np.where(fix[..., None], lut[np.clip(val, 0, None)], fill[..., :3])
    out[..., 3] = np.where(fix, np.where(val > 0, 255, 0), fill[..., 3])
    return out


# ── render a window of the figure at a scale ────────────────────────────────────────────────────────────────────
def render(box, scale, palette, seed=7, name=None, lossless=False):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    RW, RH = int(round(w * scale)), int(round(h * scale))
    up = lambda mk: cv2.resize(mk[y0:y1, x0:x1].astype(np.float32), (RW, RH), interpolation=cv2.INTER_LINEAR)
    shift = lambda mk, dx, dy: ndimage.shift(mk, (dy * scale, dx * scale), order=1, mode='constant')

    def rsvg(text):
        (OUT / '_t.svg').write_text(text)
        subprocess.run(['rsvg-convert', '-w', str(RW), '-h', str(RH), '-o', str(OUT / '_t.png'), str(OUT / '_t.svg')], check=True)
        a = np.asarray(Image.open(OUT / '_t.png').convert('RGBA')).astype(np.float32)
        (OUT / '_t.svg').unlink(); (OUT / '_t.png').unlink()
        return a

    feat = lambda n: max(3.0, n * w / 1024)                           # noise features across the picture, kept at figure size
    edge_noise = aquarel.noise_at((RH, RW), feat(40), 5) - 0.5
    kind_up = {n: rsvg(svg_text(palette, box, with_lines=False, only_kind=n))[..., 3] / 255 for n in names}
    disc = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * int(r) + 1, 2 * int(r) + 1))
    big = {n: cv2.morphologyEx(kind_up[n], cv2.MORPH_OPEN, disc(7 * scale)) for n in names}   # without brows, wisps, eyes
    CASTERS = {'skin': ['hair', 'tunic', 'shawl'], 'tunic': ['shawl', 'skin', 'hair', 'rope'], 'shawl': ['skin', 'hair'], 'hair': [], 'rope': [], 'apron': ['skin', 'rope'], 'ochre': []}
    # flat paint: a thin piece (a cord, a strap) counts as the area it lies on for that area's edge shade (thin_pieces.py)
    lies = lying_on(kind_up, 10 * scale) if FLAT_PAINT else {}
    shades = {}
    for kn, dpx in (('skin', 12), ('tunic', 18), ('shawl', 15), ('hair', 12), ('rope', 4), ('apron', 15), ('ochre', 12)):
        total = np.zeros((RH, RW), np.float32)
        for grp in SHADE_GROUPS:
            mk = up(np.isin(part_all, grp)) * (np.maximum(kind_up[kn], lies[kn]) if kn in lies else kind_up[kn])
            if mk.sum() >= 50:
                mk = np.maximum(mk, ndimage.binary_fill_holes(mk > 0.5).astype(np.float32))   # an eye is not a hole in the face
                total = np.maximum(total, np.clip(mk - shift(mk, dpx, -dpx * 0.35), 0, 1))
        over = np.zeros((RH, RW), np.float32)
        for c in CASTERS[kn]:
            over = np.maximum(over, big[c])
        cast = shift(over, -4, 14 if kn == 'skin' else 10) * kind_up[kn] * (1 - over)
        s = ndimage.gaussian_filter(total, 2.2 * scale) + edge_noise * 0.45
        # a cast shadow (a beard on the neck, a shawl on the tunic) is a soft wash blended out, never a hard band (Bart 11-13,
        # 11-14 "the hard shadow underneath the chin is not correct"); the self-shade along a part's own edge stays crisp
        soft = ndimage.gaussian_filter(cast, 4 * scale) + edge_noise * 0.15
        shades[kn] = np.maximum(np.clip((s - 0.42) * 6, 0, 1), np.clip(soft * 1.4, 0, 0.8)) * kind_up[kn]
        if kn == 'skin' and CHIN.any():   # under the jaw: a soft wash, blended out, never a hard edge
            soft = ndimage.gaussian_filter(shift(up(CHIN), 0, 3), 4 * scale) + edge_noise * 0.15
            shades[kn] = np.maximum(shades[kn], np.clip(soft * 1.6, 0, 0.85) * kind_up[kn])
    f = rsvg(svg_text(palette, box, with_lines=False))
    sil = f[..., 3] / 255
    if FLAT_PAINT:   # the stage shader colours the shade and adds the watercolour (plan 11): flat colour + ink + a shade mask
        painted = f[..., :3] * sil[..., None] + np.array(palette['tunic'], np.float32) * (1 - sil[..., None])
        shade_amount = np.max(np.stack(list(shades.values())), 0)
        eyes_up = np.clip(ndimage.gaussian_filter(ndimage.maximum_filter(kind_up['white'], max(1, int(1.5 * scale))), 0.5 * scale), 0, 1)
        face_up = np.clip(ndimage.gaussian_filter(up(part_all == HEAD) * kind_up['skin'], 1.5 * scale), 0, 1)
    else:
        field = f[..., :3] * sil[..., None] + np.array(palette['tunic'], np.float32) * (1 - sil[..., None])
        flat = field.copy()
        for kn, sm in shades.items():
            field = field * (1 - sm[..., None]) + np.array(palette[kn], np.float32) * np.array(SHADE[kn], np.float32) * sm[..., None]
        wash = Image.open(REPO / 'resources/map-chart/wash-land-1.webp').convert('L')
        wash = np.asarray(wash.resize((max(8, int(wash.width * scale / 2)), max(8, int(wash.height * scale / 2))), Image.LANCZOS)).astype(np.float32)
        wash = np.concatenate([np.concatenate([wash, wash[:, ::-1]], 1), np.concatenate([wash[::-1], wash[::-1, ::-1]], 1)], 0)
        g = np.tile(wash, (RH // wash.shape[0] + 1, RW // wash.shape[1] + 1))[:RH, :RW]
        g = 1 + (g / g.mean() - 1) * 0.6
        tex = np.stack([g ** 0.8, g, g ** 1.3], -1) * 128
        recipe = dict(FIGURE, ref=w, bloom_scale=feat(FIGURE['bloom_scale']))
        painted = aquarel.paint(field, recipe, seed=seed, texture=tex, paper=(252, 247, 236))
        # pigment pools where one wash meets the next (aquarel step 2), never in the middle of one flat colour: its bands can
        # fall inside a flat fill and draw stray contour lines there, so pooling is kept only near a real change of colour
        calm = aquarel.paint(field, dict(recipe, edge=0), seed=seed, texture=tex, paper=(252, 247, 236))
        meet = np.abs(np.diff(field, axis=0, prepend=field[:1])).sum(-1) + np.abs(np.diff(field, axis=1, prepend=field[:, :1])).sum(-1)
        near = ndimage.gaussian_filter(ndimage.maximum_filter((meet > 6).astype(np.float32), int(7 * scale)), 2 * scale)
        near = np.clip(near * 2, 0, 1)[..., None]
        painted = painted * near + calm * (1 - near)
        # no blooms on the face: a round pale bloom on a cheek reads as rouge
        nob = aquarel.paint(field, dict(recipe, edge=0, bloom_share=0), seed=seed, texture=tex, paper=(252, 247, 236))
        fc = np.clip(ndimage.gaussian_filter(up(part_all == HEAD) * kind_up['skin'], 1.5 * scale), 0, 1)[..., None]
        painted = painted * (1 - fc) + nob * fc
        # the eyes stay drawn, not washed: white, iris and glint keep their flat colour
        eyes = kind_up['white']
        crisp = np.clip(ndimage.gaussian_filter(ndimage.maximum_filter(eyes, max(1, int(1.5 * scale))), 0.5 * scale), 0, 1)[..., None] * (shades['skin'] < 2)[..., None]
        painted = painted * (1 - crisp) + flat * crisp

    # the pen (InkDrawEngine._makeStroke / _ribbon)
    rs = [11]

    def rand():
        rs[0] = (rs[0] * 1664525 + 1013904223) % 4294967296
        return rs[0] / 4294967296

    def make_stroke(raw, wobble, width, sw, ew, jit, DP):
        ph = [rand() * 6.283 for _ in range(6)]
        noise = lambda u: (math.sin(u * 1.7 + ph[0]) + .5 * math.sin(u * 3.3 + ph[1]) + .25 * math.sin(u * 6.1 + ph[2])) / 1.75
        nW = lambda u: (math.sin(u * 2.3 + ph[3]) + .5 * math.sin(u * 4.7 + ph[4])) / 1.5
        pts, cl, n = [], 0.0, len(raw)
        for i in range(n):
            P, A, B = raw[i], raw[max(0, i - 1)], raw[min(n - 1, i + 1)]
            nx, ny = -(B[1] - A[1]), B[0] - A[0]
            nl = math.hypot(nx, ny) or 1
            nx, ny = nx / nl, ny / nl
            if i:
                cl += math.hypot(P[0] - raw[i - 1][0], P[1] - raw[i - 1][1])
            t = i / ((n - 1) or 1)
            off = wobble * noise(cl * 0.02 * S['wFreq'] / DP)
            wd = width * (sw + (ew - sw) * smooth(t)) * (1 + jit * nW(cl * 0.03 / DP))
            pts.append((P[0] + nx * off, P[1] + ny * off, max(0.2, wd)))
        return pts, cl

    inkmask = np.zeros((RH, RW), np.float32)

    def ribbon(pts, a):
        n = len(pts)
        left, right = [], []
        for i in range(n):
            P, A, B = pts[i], pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
            nx, ny = -(B[1] - A[1]), B[0] - A[0]
            nl = math.hypot(nx, ny) or 1
            nx, ny = nx / nl, ny / nl
            left.append((P[0] + nx * P[2] / 2, P[1] + ny * P[2] / 2))
            right.append((P[0] - nx * P[2] / 2, P[1] - ny * P[2] / 2))
        poly = np.array(left + right[::-1], np.float32)
        a0 = np.maximum(np.floor(poly.min(0)).astype(int) - 8, 0)
        a1 = np.minimum(np.ceil(poly.max(0)).astype(int) + 8, (RW, RH))
        if (a1 <= a0).any():
            return
        tile = np.zeros((a1[1] - a0[1], a1[0] - a0[0]), np.uint8)
        cv2.fillPoly(tile, [np.round((poly - a0) * 256).astype(np.int32)], 255, cv2.LINE_AA, 8)
        for P in (pts[0], pts[-1]):
            cv2.circle(tile, (int(round((P[0] - a0[0]) * 256)), int(round((P[1] - a0[1]) * 256))), int(round(P[2] / 2 * 256)), 255, -1, cv2.LINE_AA, 8)
        roi = inkmask[a0[1]:a1[1], a0[0]:a1[0]]
        roi[:] = 1 - (1 - roi) * (1 - a * tile / 255)

    step = 1536 * scale / 1100
    avg = np.mean([np.hypot(*np.diff(p, axis=0).T).sum() for p, _ in lines]) * scale
    for pts_, wd_ in lines:                                            # every line, so the pen's chances fall the same in any window
        if KIT_PEN:   # the pen's chances seeded by the line itself: the same line draws the same in every render, so two
            rs[0] = int(abs(hash(tuple(np.round(pts_[[0, -1]]).astype(int).ravel().tolist()))) % 4294967296)   # pieces meet without a step
        xy = (pts_ - (x0, y0)) * scale
        dd = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(xy, axis=0).T))])
        s = np.arange(0, dd[-1] + step / 2, step)
        raw = np.stack([np.interp(s, dd, xy[:, 0]), np.interp(s, dd, xy[:, 1])], 1)
        if len(raw) < 2:
            continue
        width = clamp(wd_, 1.0, 4.2) * scale
        DP = width / S['width']
        lenFac = clamp((dd[-1] / avg) ** ((S['longBoost'] / 100) * 0.55), 0.55, 2.6)
        short = dd[-1] < 45 * scale
        wob = 0 if short else 0.35 * S['wobble'] * DP / lenFac ** 0.9
        sw, ew = (1.0, 0.85) if short else (S['startW'] / 100, S['endW'] / 100)
        p, cl = make_stroke(raw, wob, S['width'] * DP, sw, ew, S['wJitter'] / 100, DP)
        inside = xy[:, 0].max() > -20 and xy[:, 0].min() < RW + 20 and xy[:, 1].max() > -20 and xy[:, 1].min() < RH + 20
        if inside:
            ribbon(p, 0.94)
        if rand() < S['retrace'] / 100 and cl > 40 * DP and len(raw) > 8:
            a = int(len(raw) * rand() * 0.3)
            b = min(len(raw) - 1, a + math.ceil(len(raw) * (0.4 + rand() * 0.5)))
            if b - a > 3:
                p2, _ = make_stroke(raw[a:b + 1], wob * 1.15, S['width'] * DP * 0.8, sw, ew, S['wJitter'] / 100, DP)
                if inside:
                    ribbon(p2, 0.72)
    blobs = rsvg(svg_text(palette, box, blobs_only=True))[..., 3] / 255
    cover = np.clip(1 - (1 - inkmask) * (1 - 0.96 * blobs), 0, 1)
    img = painted * (1 - cover[..., None]) + np.array(INK, np.float32) * cover[..., None]
    a = np.clip(np.maximum(sil, cover), 0, 1)
    on_paper = lambda im, al: (im * al[..., None] + np.array(PAPER, np.float32) * (1 - al[..., None])).clip(0, 255).astype(np.uint8)
    if name and PIECES:   # the character creator's bake (kit_bake.py): fill, ink and shade apart, so the browser restacks them
        if KIT_PEN:
            f = own_side(f, cover, scale, [palette[n] for n in names], [names.index(n) for n in ('white', 'iris', 'mouth')])
        save_image(f.clip(0, 255).astype(np.uint8), OUT / f'{name}-fill.webp', lossless=True)
        save_image((cover * 255).clip(0, 255).astype(np.uint8), OUT / f'{name}-ink.webp', lossless=True)
        mask = np.dstack([shade_amount * (1 - cover), eyes_up, face_up])
        save_image((mask * 255).clip(0, 255).astype(np.uint8), OUT / f'{name}-shade.webp', lossless=True)
    elif name:
        save_image(np.dstack([img, a * 255]).clip(0, 255).astype(np.uint8), OUT / f'{name}.webp', lossless=lossless)
        if FLAT_PAINT:   # the shade mask (layer.ts AQUAREL): r how much shade (the shader's pigment colours it; none under
            # the ink), g the eyes (drawn, never washed), b the face (no blooms: a pale round bloom on a cheek reads as rouge)
            mask = np.dstack([shade_amount * (1 - cover), eyes_up, face_up])
            save_image((mask * 255).clip(0, 255).astype(np.uint8), OUT / f'{name}-shade.webp', lossless=True)
        if not lossless:   # a lossless render is a tool's input (the rig's canvas), not a picture to look at
            save_image(on_paper(img, a), OUT / f'{name}-on-paper.webp')
    return on_paper(img, a)


RENDERS = os.environ.get('RENDERS', 'full,closeup').split(',')
if 'full' in RENDERS:
    full = render((200, 0, 830, 1536), 2, colour_of, name=f'{NAME}-full')
    save_image(Image.fromarray(full).resize((full.shape[1] * 900 // full.shape[0], 900), Image.LANCZOS), OUT / f'{NAME}-full-stage-size.webp')
if 'closeup' in RENDERS:
    render((300, 15, 700, 400), 4, colour_of, name=f'{NAME}-closeup')
if 'eyes' in RENDERS:
    render((470, 120, 640, 215), 8, colour_of, name=f'{NAME}-eyes')
if 'canvas' in RENDERS:                                                    # the whole sheet, on its own canvas
    render((0, 0, W, H), float(os.environ.get('CANVAS_SCALE', '2')), colour_of, name=f'{NAME}-canvas', lossless=True)
for f in OUT.glob('_*'):
    f.unlink()
print('done', OUT)
