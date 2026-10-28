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
HEAD_HOLE_PX = 400 # a head hole smaller than this is a catchlight or a highlight, not the outside
HEAD_FRAC = 0.19  # the head lies in the top share of a standing figure
TUFT_BAND = 0.12  # the tuft lies in the bottom share of a figure
TUFT_A = -3       # Lab a* under this is the grass's green
BODY_POCKET_PX = 60  # a body painting: paper between the feet, an arm and the dress is background (a head keeps eye whites)
FULL_M = 1.70    # feet to crown, standing, painted with the head
NECK_M = 1.41    # feet to the base of the neck, standing, for a 1.70 m figure
HEAD_M = 0.27    # crown to the base of the neck
COLLAR_FLARE = 1.3  # the outline this much wider than the neck is the collar
NECK_KEEP_PX = -8  # cut this far below (negative: above) the narrowest neck row: clear of the painted collar line


def strip_tuft(img, al):
    """the painted grass tuft under the feet read as a figurine base (the stage's stain and cast shadow ground the
    figure now): its green goes, and what is left detached from the figure (straw blades) goes with it"""
    solid = al > 0.5
    ys, _ = np.nonzero(solid)
    lab = lab_of(img)
    band = np.zeros_like(solid)
    band[int(ys.max() - (ys.max() - ys.min()) * TUFT_BAND):] = True
    green = band & solid & (lab[..., 1] < TUFT_A) & (lab[..., 2] > 4)
    green = ndimage.binary_dilation(green, iterations=2) & band & (lab[..., 1] < 6)  # their ink edges, never skin
    al = np.where(green, 0, al)
    parts, n = ndimage.label(al > 0.5)
    if n > 1:
        sizes = ndimage.sum(np.ones(al.shape), parts, range(1, n + 1))
        al = np.where(np.isin(parts, 1 + np.nonzero(sizes < sizes.max() * 0.02)[0]), 0, al)
    return al


def find_face(img, al):
    """the face landmarks of a head-on painting, from the paint: the brow+eye is the biggest dark blob enclosed by skin
    in the head's upper half; the mouth is the strongest reddish-dark line below it (found by row response, so a
    nostril is not taken for it). Returns px landmarks in the sprite, the face scale s (1 = 38 px eye to mouth) and the
    local skin colour (for the wipe under the drawn features), or None."""
    H = al.shape[0]
    hh = int(H * HEAD_FRAC)
    rgb, alp = img[:hh], al[:hh] > 0.5
    lab = lab_of(rgb)
    L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
    skin = ndimage.binary_opening(alp & (L > 62) & (A > 5) & (A < 24) & (B > 14) & (B < 36), iterations=1)
    lb, n = ndimage.label(ndimage.binary_closing(skin, iterations=3))
    if not n:
        return None
    face = lb == (int(np.argmax(ndimage.sum(skin, lb, range(1, n + 1)))) + 1)
    hull = ndimage.binary_fill_holes(ndimage.binary_closing(face, iterations=6))
    feat = ndimage.binary_erosion(hull, iterations=4) & ~skin & (L < 62)
    lf, m = ndimage.label(ndimage.binary_dilation(feat, iterations=1))
    blobs = []
    for i in range(1, m + 1):
        ys, xs = np.nonzero(lf == i)
        w, h = int(np.ptp(xs) + 1), int(np.ptp(ys) + 1)
        if 16 <= w <= 32 and 11 <= h <= 24 and L[lf == i].mean() < 46:
            blobs.append((len(ys), float(xs.mean()), float(ys.mean())))
    if not blobs:
        return None
    _, bx, by = max(blobs)
    x0, x1 = int(bx - 4), int(bx + 16)
    best = (0.0, int(by + 38))
    for y in range(int(by + 20), min(int(by + 52), hh - 1)):
        row = lab[y, x0:x1]
        v = float((np.maximum(0, 80 - row[:, 0]) * (row[:, 1] > 14)).sum())
        if v > best[0]:
            best = (v, y)
    my = best[1]
    xs = np.arange(x0, x1)
    resp = np.maximum(0, 80 - lab[my, x0:x1, 0]) * (lab[my, x0:x1, 1] > 14)
    mx = float((xs * resp).sum() / max(resp.sum(), 1e-3))
    eye = (bx + 2, by + 5)
    s = (my - eye[1]) / 33.0  # the eye centre to the mouth line is 33 px at s = 1
    yy, xx = np.mgrid[0:hh, 0:rgb.shape[1]]
    near = skin & ((xx - eye[0]) ** 2 + (yy - eye[1]) ** 2 < (24 * s) ** 2)
    skin_rgb = np.median(rgb[near], axis=0) / 255.0 if near.sum() > 30 else np.array([0.9, 0.78, 0.65])
    r = lambda p: [round(float(p[0]), 1), round(float(p[1]), 1)]
    return {"eye": r(eye), "brow": r((bx - 1, by - 3)), "eyeF": r((bx + 17, by + 7)), "mouth": r((mx, my)),
            "s": round(float(s), 3), "skin": [round(float(v), 3) for v in skin_rgb]}


def fill_head_holes(al):
    """the face has small paper-white spots (an eye's catchlight, a blush highlight): the pocket rule had turned them into
    holes, and the ink edge then outlined them. Holes in the head rows that are small stay paint."""
    hh = int(al.shape[0] * HEAD_FRAC)
    solid = al > 0.5
    holes, n = ndimage.label(~solid[:hh] & ndimage.binary_fill_holes(solid)[:hh])
    if n:
        sizes = ndimage.sum(np.ones(holes.shape), holes, range(1, n + 1))
        al = al.copy()
        al[:hh][np.isin(holes, 1 + np.nonzero(sizes < HEAD_HOLE_PX)[0])] = 1.0
    return al


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
    ap.add_argument("--head-on", action="store_true", help="the figures are painted with their heads (no head swap)")
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
        if a.which != "H":
            al = strip_tuft(img, al)
            if a.head_on:
                al = fill_head_holes(al)
            m = al > 0.5
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
            if scale is None:  # the first figure of a sheet stands: its feet-to-neck (or crown) sets the sheet's scale
                scale = (FULL_M if a.head_on else NECK_M) / float(feet[1] - neck[1])
            entry.update(neck=[round(float(neck[0]), 1), round(float(neck[1]), 1)],
                         feet=[round(float(feet[0]), 1), round(float(feet[1]), 1)], m_per_px=round(scale, 6))
            if a.head_on:
                entry["head_on"] = True
                saved = np.asarray(Image.open(f"{a.out}/{slot}.webp").convert("RGBA"))  # the art the runtime draws
                face = find_face(saved[..., :3], saved[..., 3] / 255.0)
                if face:
                    entry["face"] = face
            skin = np.array(manifest["skin_lab"]) if "skin_lab" in manifest else None
            mask, regions = dye_mask(img, al, skin)
            if regions:
                Image.fromarray(mask).save(f"{a.out}/{slot}_dye.webp", lossless=True, method=6)
                entry["dye"] = regions
            manifest["poses"][slot] = entry
    faces = [e["face"] for e in manifest["poses"].values() if "face" in e]
    if faces:  # one scale per view: the same head is drawn on every pose, a single mis-picked mouth must not shrink it
        s_med = round(float(np.median([f["s"] for f in faces])), 3)
        for f in faces:
            f["s"] = s_med
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=1)
    print(a.out, names)


if __name__ == "__main__":
    main()
