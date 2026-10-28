"""Cut whole-figure POSE sheets (round 4, PM option A: each pose painted once, two-pass like the scenes) into sprites.

A sheet is one row of four headless figures (A: stand, walk1-3; B: point, carry, kneel, sit) or four heads (H: the
expressions). Nothing is hand-set: the figures are found as shapes in left-to-right order; the neck is the middle of
the top of each figure (the heads are drawn on their own sheet, so the body ends in a neck stump), the feet are the
middle of its lowest rows; a head hangs from the bottom of its neck and the hat sits at its crown. The sheet's scale
comes from its first, standing figure (feet to neck = NECK_M); heads are scaled to HEAD_M crown to neck.
Edges, dye masks and the fringe check are cut_parts.py's own.

usage: python3 cut_poses.py SHEET.png OUT_DIR --sheet H|A|B   (H first: it gives the skin colour)
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

from cut_parts import WEBP_Q, alpha_of, clean_edges, dye_mask, edge_qa, find_parts, ink_rim, lab_of

SLOTS = {"A": ["stand", "walk1", "walk2", "walk3"], "B": ["point", "carry", "kneel", "sit"],
         "H": ["head_neutral", "head_happy", "head_worried", "head_surprised"]}
BODY_POCKET_PX = 60  # a body painting: paper between the feet, an arm and the dress is background (a head keeps eye whites)
NECK_M = 1.41    # feet to the base of the neck, standing, for a 1.70 m figure
HEAD_M = 0.27    # crown to the base of the neck
COLLAR_FLARE = 1.3  # the outline this much wider than the neck is the collar
NECK_KEEP_PX = 6  # a head keeps this much neck below its narrowest row (it tucks under the body's collar)


def neck_point(mask):
    ys, xs = np.nonzero(mask)
    top = ys < ys.min() + max(4, (ys.max() - ys.min()) * 0.02)
    return np.array([xs[top].mean(), ys.min() + 2.0])


def feet_point(mask):
    ys, xs = np.nonzero(mask)
    low = ys > ys.max() - max(4, (ys.max() - ys.min()) * 0.02)
    return np.array([xs[low].mean(), float(ys.max())])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("out")
    ap.add_argument("--sheet", dest="which", required=True, choices=SLOTS)
    a = ap.parse_args()
    rgb = np.asarray(Image.open(a.sheet).convert("RGB"))
    alpha = alpha_of(rgb, None if a.which == "H" else BODY_POCKET_PX)
    parts = sorted(find_parts(alpha), key=lambda p: p["cx"])
    names = SLOTS[a.which]
    if len(parts) != len(names):  # a merged or split figure shifts every name after it: stop
        raise SystemExit(f"{a.sheet}: {len(parts)} shapes for {len(names)} slots")
    os.makedirs(a.out, exist_ok=True)
    manifest_path = f"{a.out}/../poses.json"  # one manifest per view, next to parts.json
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {"poses": {}, "heads": {}}
    scale = None
    for slot, p in zip(names, parts):
        x0, y0, x1, y1 = p["box"]
        pad = 4
        x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(rgb.shape[1], x1 + pad), min(rgb.shape[0], y1 + pad)
        m = p["mask"][y0:y1, x0:x1]
        al = alpha[y0:y1, x0:x1] * ndimage.binary_dilation(m, iterations=3)
        img = rgb[y0:y1, x0:x1]
        sil = al > 0.5
        img, al = ink_rim(img, al, sil)
        img = clean_edges(img, al)
        Image.fromarray(np.dstack([img, (al * 255).astype(np.uint8)])).save(f"{a.out}/{slot}.webp", quality=WEBP_Q, method=6, exact=True)
        entry = {"w": int(x1 - x0), "h": int(y1 - y0), "edge_fringe": edge_qa(img, al)}
        if a.which == "H":
            ys, xs = np.nonzero(al > 0.5)
            y0h, y1h = ys.min(), ys.max()
            # the neck: going down from the middle, the narrowest row before the outline flares out into the collar
            best, best_w = int(y0h + (y1h - y0h) * 0.5), 1e9
            for y in range(best, int(y1h)):
                row = xs[ys == y]
                if not row.size:
                    continue
                w = np.ptp(row)
                if w < best_w:
                    best, best_w = y, w
                elif w > COLLAR_FLARE * best_w:
                    break
            neck_y = min(best + NECK_KEEP_PX, int(y1h) - 1)
            al[int(neck_y) + 1:] = 0
            Image.fromarray(np.dstack([img, (al * 255).astype(np.uint8)])).save(f"{a.out}/{slot}.webp", quality=WEBP_Q, method=6, exact=True)
            band = (ys >= neck_y - 3) & (ys <= neck_y)
            entry["pivot"] = [round(float(xs[band].mean()), 1), round(float(neck_y), 1)]
            top = ys < y0h + (y1h - y0h) * 0.06
            entry["crown"] = [round(float(xs[top].mean()), 1), round(float(y0h + (neck_y - y0h) * 0.17), 1)]
            entry["m_per_px"] = round(HEAD_M / float(neck_y - y0h), 6)
            manifest["heads"][slot] = entry
            if slot == "head_neutral":  # the skin colour (the middle of the face): the dye masks leave it alone
                h, w = m.shape
                manifest["skin_lab"] = [round(float(v), 1) for v in lab_of(img[int(h * 0.35):int(h * 0.55), int(w * 0.35):int(w * 0.65)].reshape(-1, 3)).mean(0)]
        else:
            neck, feet = neck_point(m), feet_point(m)
            if scale is None:  # the first figure of a sheet stands: its feet-to-neck sets the sheet's scale
                scale = NECK_M / float(feet[1] - neck[1])
            entry.update(neck=[round(float(neck[0]), 1), round(float(neck[1]), 1)],
                         feet=[round(float(feet[0]), 1), round(float(feet[1]), 1)], m_per_px=round(scale, 6))
            skin = np.array(manifest["skin_lab"]) if "skin_lab" in manifest else None
            mask, regions = dye_mask(img, al, skin)
            if regions:
                Image.fromarray(mask).save(f"{a.out}/{slot}_dye.webp", lossless=True, method=6)
                entry["dye"] = regions
            manifest["poses"][slot] = entry
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=1)
    print(a.out, names)


if __name__ == "__main__":
    main()
