"""Cut the painting's other ships and boats into flat cards for the 3D world (far away, so flat is fine).

The Depth Anything V2 map is only used as a LAYOUT reference here: objects = pixels nearer than their row's sea/sky
background; each connected blob becomes a card with its uv box and waterline (bottom), so world.js can stand it
on the 3D sea exactly where the painting has it. The hero ship (left) is excluded: it is a real 3D model.

Usage: python3 tools/make_cards.py <painting_3840.jpg> <depth_dav2.png>   -> public/assets/cards/*.webp + cards.json
"""
import json
import sys
from pathlib import Path
import cv2
import numpy as np

OUT = Path(__file__).resolve().parent.parent / "public" / "assets" / "cards"
OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.glob("card_*.webp"):  # this script's own previous output
    old.unlink()
HERO_U = (0.02, 0.33)  # the left ship, replaced by the 3D model
MIN_AREA = 0.0008  # of the image, smaller blobs stay in nothing (sea texture takes over)

img = cv2.imread(sys.argv[1])
H, W = img.shape[:2]
w = 1280
h = round(H * w / W)
depth = cv2.resize(cv2.imread(sys.argv[2], cv2.IMREAD_GRAYSCALE), (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
row = cv2.GaussianBlur(np.percentile(depth, 25, axis=1).reshape(-1, 1), (1, 0), sigmaX=0, sigmaY=6).ravel()
objects = ((depth - row[:, None]) > 0.06).astype(np.uint8)
objects = cv2.morphologyEx(objects, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
# split touching ships: label eroded cores, then give every object pixel the label of its nearest core
core = cv2.erode(objects, np.ones((13, 13), np.uint8))
n, core_labels = cv2.connectedComponents(core, connectivity=8)
_, pix = cv2.distanceTransformWithLabels((core == 0).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
ys, xs = np.nonzero(core)
lut = np.zeros(pix.max() + 1, np.int32)
lut[pix[ys, xs]] = core_labels[ys, xs]
labels = np.where(objects > 0, lut[pix], 0)
stats = np.zeros((n, 5), np.int64)
for i in range(1, n):
    yy, xx = np.nonzero(labels == i)
    if len(xx):
        stats[i] = [xx.min(), yy.min(), xx.max() - xx.min() + 1, yy.max() - yy.min() + 1, len(xx)]

cards = []
for i in range(1, n):
    x, y, bw, bh, area = stats[i]
    if area < MIN_AREA * w * h:
        continue
    u0, u1 = x / w, (x + bw) / w
    if u0 < HERO_U[1] and u1 < HERO_U[1] + 0.05 and bh > 0.35 * h:
        continue  # hero ship
    pad = 6
    x0, y0, x1, y1 = max(0, x - pad), max(0, y - pad), min(w, x + bw + pad), min(h, y + bh + pad)
    mask = (labels[y0:y1, x0:x1] == i).astype(np.uint8) * 255
    s = W / w
    X0, Y0, X1, Y1 = round(x0 * s), round(y0 * s), round(x1 * s), round(y1 * s)
    m = cv2.resize(cv2.dilate(mask, np.ones((3, 3), np.uint8)), (X1 - X0, Y1 - Y0), interpolation=cv2.INTER_LINEAR)
    m = cv2.GaussianBlur(m, (0, 0), 1.5)
    rgba = np.dstack([img[Y0:Y1, X0:X1], m])
    name = f"card_{len(cards):02d}.webp"
    cv2.imwrite(str(OUT / name), rgba, [cv2.IMWRITE_WEBP_QUALITY, 80])
    # waterline: lowest object row in the middle half of the blob (a bowsprit or oar does not count)
    cols = mask[:, mask.shape[1] // 4: 3 * mask.shape[1] // 4]
    rows = np.where(cols.any(axis=1))[0]
    bottom = (y0 + (rows.max() if len(rows) else mask.shape[0])) / h
    cards.append({"file": name, "u0": x0 / w, "u1": x1 / w, "v0": 1 - y1 / h, "v1": 1 - y0 / h, "water": 1 - bottom})

json.dump(cards, open(OUT / "cards.json", "w"), indent=1)
print(len(cards), "cards")
