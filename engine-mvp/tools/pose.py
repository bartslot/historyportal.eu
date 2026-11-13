"""Polish (Bart 2026-11-13): an old woman stands differently. Poses the flat sheets rigidly per part, the way the puppet
will: the upper body leans forward about the back of the waist, the arms hang straight again from the shoulders, the
head tilts forward and down about the neck. Writes posed copies of the figure sheet, the part map, the head sheet and
its hair mask, and the moved head box.

  python3 pose.py <flat.png> <map.png> <head sheet> <hair mask> <out dir> [lean deg] [head deg] [body]

body (girl, woman, man) takes the neck, shoulders, hip and head box of that body type from the kit's body/joints.json
and body/head-boxes.json; without it the standard (girl) body's hand-placed joints below are used.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from img_io import save as save_image  # noqa: E402

FLAT, MAP, HEADS, HMASK, OUT = map(Path, sys.argv[1:6])
LEAN = float(sys.argv[6]) if len(sys.argv) > 6 else 8.0
TILT = float(sys.argv[7]) if len(sys.argv) > 7 else 7.0
OUT.mkdir(parents=True, exist_ok=True)
HEAD_BOX = (319, 5, 688, 374)
HK = (HEAD_BOX[2] - HEAD_BOX[0]) / 1024
PART_HEX = {'head': 'FF00FF', 'braid': 'FF8000', 'chest': '00FFFF', 'shawl': 'FFFF00', 'skirt': '808080', 'foot_n': '80FF00', 'foot_f': '0080FF',
            'upperarm_n': 'FF0000', 'forearm_n': '800000', 'upperarm_f': '0000FF', 'forearm_f': '000080', 'shin_n': '008000', 'shin_f': '008080'}
PARTS = list(PART_HEX)
PAL = np.array([[int(h[i:i + 2], 16) for i in (0, 2, 4)] for h in PART_HEX.values()], np.uint8)
ORDER = ['braid', 'upperarm_f', 'forearm_f', 'shin_f', 'foot_f', 'shin_n', 'foot_n', 'skirt', 'chest', 'shawl', 'upperarm_n', 'forearm_n', 'head']
HIP = (440.0, 632.0)                 # the back of the waist: the back stays joined, the front sinks a little into the skirt
NECK = (505.0, 322.0)
SHOULDER = {'n': (400.0, 360.0), 'f': (650.0, 380.0)}
BODY = sys.argv[8] if len(sys.argv) > 8 else None
if BODY:                             # a body type's own joints and head box (the woman and man bodies are other drawings)
    from kit_parts import body_joints  # noqa: E402
    _joints, HEAD_BOX = body_joints(BODY)
    NECK, HIP = tuple(_joints['NECK']), tuple(_joints['HIP'])
    SHOULDER = {side: tuple(xy) for side, xy in _joints['SHOULDER'].items()}
    HK = (HEAD_BOX[2] - HEAD_BOX[0]) / 1024
GREEN = np.array([0, 255, 0], np.uint8)


def rot(deg, c):
    """2x3 affine: turn by deg about c (screen: + leans the top toward +x, the way she faces)."""
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    # x' = cx + (x-cx)cos - (y-cy)sin ; y' = cy + (x-cx)sin + (y-cy)cos
    return np.array([[ca, -sa, c[0] - ca * c[0] + sa * c[1]], [sa, ca, c[1] - sa * c[0] - ca * c[1]]])


def then(a, b):
    """b after a."""
    A = np.vstack([a, [0, 0, 1]]); B = np.vstack([b, [0, 0, 1]])
    return (B @ A)[:2]


apply = lambda M, p: M @ np.array([p[0], p[1], 1.0])
UPPER = rot(LEAN, HIP)
T = {p: np.array([[1.0, 0, 0], [0, 1.0, 0]]) for p in PARTS}
for p in ('chest', 'shawl', 'braid'):
    T[p] = UPPER
for side in 'nf':
    arm = then(rot(-LEAN * 0.85, SHOULDER[side]), UPPER)            # the arms hang straight again
    T[f'upperarm_{side}'] = arm
    T[f'forearm_{side}'] = arm
T['head'] = then(rot(TILT, NECK), UPPER)

rgb = np.asarray(Image.open(FLAT).convert('RGB'))
H, W = rgb.shape[:2]
green = (rgb[..., 1] > 170) & (rgb[..., 0] < 120) & (rgb[..., 2] < 120)
m = np.asarray(Image.open(MAP).convert('RGB')).astype(np.float32)
pal = np.vstack([PAL, [[0, 0, 0]]]).astype(np.float32)
raw = ((m[:, :, None, :] - pal[None, None]) ** 2).sum(-1).argmin(-1).astype(np.uint8)
core = np.zeros((H, W), bool)
for i in range(len(PARTS)):
    core |= ndimage.binary_erosion(raw == i, iterations=3)
j = ndimage.distance_transform_edt(~core, return_distances=False, return_indices=True)
part = raw[j[0], j[1]]

out_rgb = np.empty_like(rgb); out_rgb[:] = GREEN
out_lab = np.full((H, W), 255, np.uint8)
HANG = ('chest', 'shawl', 'braid')   # what hangs below the waist (shawl tail, belt cords, braid) leans less the lower it hangs
RAMP = 140.0
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def lean_hanging(img, interp):
    """The lean, fading out below the waist: full at the waist, none RAMP px lower (inverse map, small angles)."""
    a = np.radians(LEAN) * np.clip((HIP[1] + RAMP - yy) / RAMP, 0, 1)
    dx, dy = xx - HIP[0], yy - HIP[1]
    sx = HIP[0] + dx * np.cos(a) + dy * np.sin(a)
    sy = HIP[1] - dx * np.sin(a) + dy * np.cos(a)
    return cv2.remap(img, sx.astype(np.float32), sy.astype(np.float32), interp, borderValue=0)


for pn in ORDER:
    i = PARTS.index(pn)
    mk = ((part == i) & ~green).astype(np.uint8)
    if pn in HANG:
        wm = lean_hanging(mk, cv2.INTER_NEAREST) > 0
        wc = lean_hanging(rgb, cv2.INTER_NEAREST)
    else:
        wm = cv2.warpAffine(mk, T[pn], (W, H), flags=cv2.INTER_NEAREST) > 0
        wc = cv2.warpAffine(rgb, T[pn], (W, H), flags=cv2.INTER_NEAREST)
    out_rgb[wm] = wc[wm]
    out_lab[wm] = i
# small gaps the lean opens inside the figure take the colour and part next to them
g = (out_rgb[..., 1] > 170) & (out_rgb[..., 0] < 120) & (out_rgb[..., 2] < 120)
holes = (ndimage.binary_fill_holes(ndimage.binary_closing(~g, iterations=4)) & g)
# where an arm turns back about its shoulder a wedge opens to the outside (not a closed hole): close wider near the shoulders
near_sh = np.zeros((H, W), bool)
for side in 'nf':
    sx, sy = apply(UPPER, SHOULDER[side])
    near_sh |= (xx - sx) ** 2 + (yy - sy - 90) ** 2 < 150 ** 2
wedge = ndimage.binary_fill_holes(ndimage.binary_closing(~g, iterations=14)) & g & near_sh
holes |= wedge
if holes.any():
    ink_ = (out_rgb.astype(np.float32) @ np.array([0.3, 0.59, 0.11])) < 60
    jn = ndimage.distance_transform_edt(ndimage.binary_dilation(g, iterations=2) | ndimage.binary_dilation(ink_, iterations=3), return_distances=False, return_indices=True)    # paint, never a line
    out_rgb[holes] = out_rgb[jn[0], jn[1]][holes]
    jl = ndimage.distance_transform_edt(g, return_distances=False, return_indices=True)
    out_lab[holes] = out_lab[jl[0], jl[1]][holes]
print('filled', int(holes.sum()), 'px of gaps')
# a part's edge pixels the map gave to its neighbour stay behind when the part turns: thin slivers off the body go
g = (out_rgb[..., 1] > 170) & (out_rgb[..., 0] < 120) & (out_rgb[..., 2] < 120)
solid = ndimage.binary_opening(~g, iterations=4)
lab_, n_ = ndimage.label(solid)
if n_:
    sizes = ndimage.sum(solid, lab_, range(1, n_ + 1))
    body = np.isin(lab_, 1 + np.flatnonzero(sizes > 0.02 * sizes.max()))
    stray = ~g & ~ndimage.binary_dilation(body, iterations=5)
    out_rgb[stray] = GREEN
    out_lab[stray] = 255
    print('dropped', int(stray.sum()), 'px of slivers')
# the map: its own colours on black, the figure's parts where they now are
map_out = np.zeros((H, W, 3), np.uint8)
for i in range(len(PARTS)):
    map_out[out_lab == i] = PAL[i]
save_image(out_rgb, OUT / 'flat.webp', lossless=True)               # re-read by kit_render: exact pixels
save_image(map_out, OUT / 'map.webp', lossless=True)

# the head sheet: the same tilt about the neck in its own space; the crop box moves with the neck
neck_after = apply(UPPER, NECK)
shift = neck_after - np.array(NECK)
box = [int(round(HEAD_BOX[0] + shift[0])), int(round(HEAD_BOX[1] + shift[1])), 0, 0]
box[2], box[3] = box[0] + (HEAD_BOX[2] - HEAD_BOX[0]), box[1] + (HEAD_BOX[3] - HEAD_BOX[1])
neck_h = ((NECK[0] - HEAD_BOX[0]) / HK, (NECK[1] - HEAD_BOX[1]) / HK)
Mh = rot(LEAN + TILT, neck_h)
hs = np.asarray(Image.open(HEADS).convert('RGB'))
hs_out = cv2.warpAffine(hs, Mh, (1024, 1024), flags=cv2.INTER_NEAREST, borderValue=(0, 255, 0))
hm = np.asarray(Image.open(HMASK).convert('L'))
hm_out = cv2.warpAffine(hm, Mh, (1024, 1024), flags=cv2.INTER_NEAREST, borderValue=0)
save_image(hs_out, OUT / 'head.webp', lossless=True)
save_image(hm_out, OUT / 'hair-mask.webp', lossless=True)
(OUT / 'box.json').write_text(json.dumps(box))
print('posed: lean', LEAN, 'tilt', TILT, 'head box', box)
