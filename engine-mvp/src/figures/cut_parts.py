"""Cut a puppet PARTS SHEET (Figma gpt-image, History Lines template) into parts + automatic landmarks.

The sheet is a fixed grid (see PARTS_PROMPT in README "Puppet figures"): every part on its own, white around it.
Nothing is hand-set: parts are found as connected shapes, given their slot by row and left-to-right order, and
their joints come from the shape itself:
  limb (upper arm, forearm, thigh, shin): the long axis (PCA); a joint sits one half-width in from each end cap
  hand / foot: the top cap (wrist / ankle)
  head: the bottom of the neck, and the crown (a hat's seat);  torso: neck at the top, waist at the narrowest row, hips below it
  skirt: the middle of the waistband;  hat: the middle of the brim (its widest row)
Each part is scaled to its canonical length (metres, for a 1.70 m adult): the image model keeps style, not scale.
Cloth parts get a dye mask: the cloth colours clustered (skin excluded), one region per RGB channel, so the
runtime can re-colour a garment and keep the ink and the wash texture.

usage: python3 cut_parts.py SHEET.png OUT_DIR --kind woman|man|voc --view 34|side|front
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.cluster.vq import kmeans2

ROWS = {  # slot names per row, left to right; a missing part may only be missing at the END of a row
    "woman": [["head_neutral", "head_happy", "head_worried", "head_surprised", "torso", "skirt"],
              ["upper_arm", "forearm", "hand_open", "hand_grip", "hand_point"],
              ["thigh", "shin", "foot", "foot_far"]],
    "man": [["head_neutral", "head_happy", "head_worried", "head_surprised", "torso", "skirt"],
            ["upper_arm", "forearm", "hand_open", "hand_grip", "hand_point", "hat"],
            ["thigh", "shin", "foot", "foot_far"]],
    "voc": [["head_neutral", "head_happy", "head_worried", "head_surprised", "torso", "hat"],
            ["upper_arm", "forearm", "hand_open", "hand_grip", "hand_point"],
            ["thigh", "shin", "foot", "foot_far"]],
}
CROWN = 0.17     # a hat's brim sits this far down the head part (hair top = 0, neck bottom = 1)
OPTIONAL = ("skirt", "hat", "foot_far")  # may be missing at a row's end
# canonical sizes in metres for a 1.70 m adult (scaled by the character's height at runtime)
# (anthropometric proportions: ankle 0.07 + shin + thigh + torso + head above the neck pivot ~0.28 = 1.70)
LENGTH = {"head": 0.30, "torso": 0.51, "upper_arm": 0.31, "forearm": 0.25, "hand": 0.18, "thigh": 0.42,
          "shin": 0.41, "foot": 0.25, "foot_front": 0.10, "skirt": 0.84}
END_KEEP_PX = 3  # a limb keeps this much past its far joint (no hairline gap at a straight joint)
SHOULDER_DOWN = 0.18  # the shoulder joints sit this far from the neck to the waist
WAIST_BAND = (0.5, 0.8)  # the waist is the narrowest row in this band of the torso height
THIGH_CAP = 0.35   # a thigh keeps this share of its top disc (a seated hip must not show a bare disc behind it)
WEBP_Q = 88       # the art; the dye masks are lossless
ANKLE = 0.07     # the ankle joint stands this high above the sole
CLOTH = {  # the slots that are clothing (a dye mask each); bare arms and legs are not
    "woman": ("torso", "skirt", "upper_arm"),
    "man": ("torso", "skirt", "upper_arm", "forearm", "shin", "foot", "foot_far", "hat"),
    "voc": ("torso", "upper_arm", "forearm", "thigh", "shin", "foot", "foot_far", "hat"),
}
WHITE = 236      # paper: brighter than this (min of r,g,b) and connected to the sheet's edge
MERGE_PX = 4     # gaps this small join one part (tassels, stray hairs)
MIN_AREA = 1500  # smaller shapes are specks
DYES = 3         # dye regions per garment (one per mask channel)
CLUSTERS = 8     # colour clusters before same-hue clusters merge into one cloth
L_WEIGHT = 0.35  # lightness counts this much in the clustering: shading is not a new colour
INK_L = 25       # darker than this (Lab L) is ink, the line between colour areas
MIN_AREA_PX = 25 # colour areas smaller than this follow their neighbours
SKIN_AB = 5      # Lab a/b distance under which a colour counts as skin (the neck in a collar)
SAME_AB = 10     # clusters closer than this in a/b and SAME_L in lightness are one cloth (light and shadow)
SAME_L = 25
NEUTRAL_AB = 12   # both colours this grey...
NEUTRAL_L = 40    # ...and this far apart in lightness: black and white are two garments
DARK_CLOTH_PX = 4  # dark areas wider than about twice this are black cloth, not ink
ACCENT_SHARE = 0.03  # an accent colour covers at least this share of the part
SAME_SCALE = {"head_happy": "head_neutral", "head_worried": "head_neutral", "head_surprised": "head_neutral",
              "hand_grip": "hand_open", "hand_point": "hand_open", "foot_far": "foot", "hat": "head_neutral"}


def alpha_of(rgb):
    m = rgb.min(axis=2).astype(float)
    paper = m > WHITE
    lab, _ = ndimage.label(paper)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    soft = np.clip((250 - m) / 22, 0, 1)  # the ink fringe fades into the paper
    return np.where(bg, soft, 1.0)


def find_parts(alpha):
    solid = alpha > 0.5
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=MERGE_PX))
    parts = []
    for i in range(1, n + 1):
        m = (lab == i) & solid
        if m.sum() < MIN_AREA:
            continue
        ys, xs = np.nonzero(m)
        parts.append({"mask": m, "cx": xs.mean(), "cy": ys.mean(), "box": (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)})
    return parts


def rows_of(parts, n_rows=3):
    """split into rows by the biggest gaps between part centres (sorted by y)"""
    ps = sorted(parts, key=lambda p: p["cy"])
    gaps = np.diff([p["cy"] for p in ps])
    cuts = sorted(np.argsort(gaps)[-(n_rows - 1):] + 1)
    out = np.split(np.arange(len(ps)), cuts)
    return [sorted([ps[i] for i in r], key=lambda p: p["cx"]) for r in out]


def caps(mask):
    """long axis of a limb and its two joint pivots: one half-width in from each end"""
    ys, xs = np.nonzero(mask)
    pts = np.stack([xs, ys], 1).astype(float)
    c = pts.mean(0)
    _, _, vt = np.linalg.svd(pts - c, full_matrices=False)
    ax = vt[0] if vt[0][1] > 0 else -vt[0]  # pointing down: proximal end first
    t = (pts - c) @ ax
    side = (pts - c) @ np.array([-ax[1], ax[0]])
    t0, t1 = t.min(), t.max()
    half = lambda band: (side[band].max() - side[band].min()) / 2 if band.any() else 0
    r0 = half(t < t0 + (t1 - t0) * 0.15)
    r1 = half(t > t1 - (t1 - t0) * 0.15)
    return c + ax * (t0 + r0), c + ax * (t1 - r1)


def top_cap(mask):
    ys, xs = np.nonzero(mask)
    y0 = ys.min()
    band = ys < y0 + (ys.max() - y0) * 0.12
    r = (xs[band].max() - xs[band].min()) / 2
    return np.array([xs[band].mean(), y0 + r * 0.8])


def landmarks(slot, mask, view):
    ys, xs = np.nonzero(mask)
    y0, y1 = ys.min(), ys.max()
    kind = slot.split("_")[0] if slot.startswith(("head", "hand")) else slot.replace("_far", "")
    if kind in ("upper_arm", "forearm", "thigh", "shin"):
        a, b = caps(mask)
        return kind, {"pivot": a, "end": b}, np.linalg.norm(b - a)
    if kind == "hand":
        p = top_cap(mask)
        return kind, {"pivot": p}, y1 - p[1]
    if kind == "foot":  # the joint is ANKLE above the sole, under the top cap: the drawn sock or stub overlaps the shin
        size = xs.max() - xs.min()
        kind = "foot_front" if view == "front" else "foot"
        return kind, {"pivot": np.array([top_cap(mask)[0], y1 - ANKLE * size / LENGTH[kind]])}, size
    if kind == "head":
        band = ys > y1 - (y1 - y0) * 0.08
        top = ys < y0 + (y1 - y0) * 0.06
        crown = np.array([xs[top].mean(), y0 + (y1 - y0) * CROWN])  # where a hat's brim sits
        return kind, {"pivot": np.array([xs[band].mean(), y1 - (y1 - y0) * 0.06]), "crown": crown}, y1 - y0
    if kind == "torso":
        top = ys < y0 + (y1 - y0) * 0.06
        neck = np.array([xs[top].mean(), y0 + (y1 - y0) * 0.03])
        widths = np.array([np.ptp(xs[ys == y]) if (ys == y).any() else 1e9 for y in range(y0, y1 + 1)])
        lo, hi = int((y1 - y0) * WAIST_BAND[0]), int((y1 - y0) * WAIST_BAND[1])
        wy = y0 + lo + int(np.argmin(widths[lo:hi]))
        row = xs[ys == wy]
        hip_y = wy + 0.3 * (wy - neck[1])
        cx, half = (row.min() + row.max()) / 2, np.ptp(row) / 2
        shoulder_y = neck[1] + (wy - neck[1]) * SHOULDER_DOWN
        srow = xs[np.abs(ys - shoulder_y) < 3]
        l, r = (srow.min(), srow.max()) if srow.size else (row.min(), row.max())
        # front: the arms hang at the body's sides; turned: the near shoulder half way out, the far one tucked in
        sn, sf = (l + (r - l) * 0.1, r - (r - l) * 0.1) if view == "front" else (neck[0] - (r - l) * 0.28, neck[0] + (r - l) * 0.28)
        return kind, {"pivot": np.array([cx, hip_y]), "neck": neck, "waist": np.array([cx, wy]),
                      "hip_n": np.array([cx - half * 0.35, hip_y]), "hip_f": np.array([cx + half * 0.35, hip_y]),
                      "shoulder_n": np.array([sn, shoulder_y]), "shoulder_f": np.array([sf, shoulder_y])}, hip_y - neck[1]
    if kind == "skirt":
        top = ys < y0 + (y1 - y0) * 0.04
        return kind, {"pivot": np.array([xs[top].mean(), y0])}, y1 - y0
    if kind == "hat":
        widths = [np.ptp(xs[ys == y]) if (ys == y).any() else 0 for y in range(y0, y1 + 1)]
        by = y0 + int(np.argmax(widths))
        return kind, {"pivot": np.array([xs[ys == by].mean(), by])}, None
    raise ValueError(slot)


def joint_ends(img, al, kind, marks):
    """the model paints a pale disc on each limb end; a cut-out joint wants the CHILD's end under the parent:
    the distal disc goes (cut at the joint line), the proximal one is refilled with the limb itself, mirrored
    across the joint line, so a bent elbow shows sleeve, not a disc"""
    if kind not in ("upper_arm", "forearm", "thigh", "shin", "hand"):
        return img, al
    a = marks["pivot"]
    ax = (marks["end"] - a) if "end" in marks else np.array([0.0, 1.0])
    ax = ax / np.linalg.norm(ax)
    h, w = al.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    t = (xx - a[0]) * ax[0] + (yy - a[1]) * ax[1]
    img, al = img.copy(), al.copy()
    if "end" in marks:
        al[t > np.linalg.norm(marks["end"] - a) + END_KEEP_PX] = 0
    if kind == "thigh":
        al[t < -THIGH_CAP * np.linalg.norm(marks["end"] - a) * 0.25] = 0
    above = t < 0  # mirror: the pixel at -t along the axis takes the colour from +t
    mx = np.clip(np.rint(xx - 2 * t * ax[0]), 0, w - 1).astype(int)
    my = np.clip(np.rint(yy - 2 * t * ax[1]), 0, h - 1).astype(int)
    img[above] = img[my[above], mx[above]]
    return img, al


def lab_of(rgb):
    """sRGB 0..255 -> CIE Lab (D65)"""
    c = rgb.astype(float) / 255
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[0.4124, 0.2126, 0.0193], [0.3576, 0.7152, 0.1192], [0.1805, 0.0722, 0.9505]]) / [0.9505, 1, 1.089]
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def dye_mask(rgb, alpha, skin_lab):
    """up to DYES cloth regions, coloured like a colouring book: the areas between the ink lines each get one mean
    colour, and those means are clustered (shading is not a new colour: L counts little). Areas that read as skin
    or paper stay undyed (0); ink takes its nearest area's region, so a dye never leaves a pale edge."""
    lab = lab_of(rgb)
    solid = alpha > 0.5
    dark = solid & (lab[..., 0] < INK_L)
    cloth_dark = ndimage.binary_opening(dark, iterations=DARK_CLOTH_PX)  # black cloth is a blob, a pen line is thin
    ink = dark & ~cloth_dark
    light_areas, n_light = ndimage.label(solid & ~dark)
    dark_areas, n_dark = ndimage.label(cloth_dark)
    areas = np.where(dark_areas > 0, dark_areas + n_light, light_areas)
    n = n_light + n_dark
    if n == 0:
        return np.zeros(rgb.shape, np.uint8), []
    idx = np.arange(1, n + 1)
    size = ndimage.sum(np.ones(areas.shape), areas, idx)
    mean = np.stack([ndimage.mean(lab[..., i], areas, idx) for i in range(3)], 1)
    big = size >= MIN_AREA_PX
    if not big.any():
        return np.zeros(rgb.shape, np.uint8), []
    feat = mean * [L_WEIGHT, 1, 1]
    sample = np.repeat(feat[big], np.maximum(1, (size[big] // 40).astype(int)), 0)
    k = min(CLUSTERS, int(big.sum()))
    cents, _ = kmeans2(sample, k, seed=7, minit="++")
    near = np.argmin(((feat[:, None] - cents[None]) ** 2).sum(-1), 1)
    weight = np.bincount(near, weights=size, minlength=k)
    # each cluster's true colour: its areas' means weighted by size (the k-means centre drifts with the weighting)
    cmean = np.stack([np.bincount(near, weights=size * mean[:, i], minlength=k) / np.maximum(weight, 1) for i in range(3)], 1)
    is_skin = lambda c: skin_lab is not None and c[0] / L_WEIGHT > INK_L and np.hypot(c[1] - skin_lab[1], c[2] - skin_lab[2]) < SKIN_AB
    total = weight.sum()
    # R = the whole garment (every cluster that is not skin), so any cloth can be dyed, white or black;
    # G and B = accents that clearly differ from the garment's main colour (a belt, a collar, a waistcoat)
    cloth = [i for i in np.argsort(-weight) if weight[i] > 0 and not is_skin(cmean[i])]
    if not cloth:
        return np.zeros(rgb.shape, np.uint8), []
    main = cmean[cloth[0]]
    chroma = lambda c: np.hypot(c[1], c[2])
    # another hue, or black against white (a collar on a doublet); a lighter or darker shade is shading, not an accent
    # (against a grey, only a clearly coloured cluster is another garment: a muted brown on black is shading)
    differs = lambda c, q: (abs(c[0] - q[0]) / L_WEIGHT >= NEUTRAL_L
                            if min(chroma(c), chroma(q)) < NEUTRAL_AB and max(chroma(c), chroma(q)) < 2 * NEUTRAL_AB
                            else np.hypot(*(c[1:] - q[1:])) >= SAME_AB)
    accents = []
    for i in cloth[1:]:
        if weight[i] > ACCENT_SHARE * total and differs(cmean[i], main) and all(differs(cmean[i], cmean[j]) for j in accents):
            accents.append(i)
    accents = accents[:DYES - 1]
    region = {i: 0 for i in cloth}
    region.update({i: n + 1 for n, i in enumerate(accents)})
    keep = [main] + [cmean[i] for i in accents]
    # area label -> channel (-1 undyed); an area joins an accent only if it differs from the garment itself
    per_area = np.array([-1] + [region.get(c, -1) if region.get(c, -1) < 1 or differs(f, main) else 0 for c, f in zip(near, feat)])
    lab_px = per_area[areas]
    # ink and specks: the channel of the nearest area
    _, (iy, ix) = ndimage.distance_transform_edt(areas == 0, return_indices=True)
    lab_px = np.where(areas == 0, lab_px[iy, ix], lab_px)
    out = np.zeros(rgb.shape, np.uint8)
    regions = []
    for i in range(len(keep)):  # an accent whose areas all stayed with the garment is dropped
        m = (lab_px == i) & (alpha > 0.02)
        paint = rgb[m & solid & ~ink]
        if not len(paint):
            continue
        out[..., len(regions)] = np.where(m, 255, 0)
        regions.append("#%02x%02x%02x" % tuple(int(v) for v in paint.astype(float).mean(0)))
    out = np.stack([ndimage.gaussian_filter(out[..., i].astype(float), 1.0) for i in range(3)], -1).astype(np.uint8)
    return out, regions


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("out")
    ap.add_argument("--kind", required=True, choices=ROWS)
    ap.add_argument("--view", required=True, choices=("34", "side", "front"))
    a = ap.parse_args()
    rgb = np.asarray(Image.open(a.sheet).convert("RGB"))
    alpha = alpha_of(rgb)
    rows = rows_of(find_parts(alpha))
    os.makedirs(a.out, exist_ok=True)
    manifest, skin = {}, None
    for names, parts in zip(ROWS[a.kind], rows):
        need = len([n for n in names if n not in OPTIONAL])
        if not need <= len(parts) <= len(names):  # a merged or split shape shifts every slot after it: stop
            raise SystemExit(f"{a.sheet} row {names[0]}: {len(parts)} parts for {need}..{len(names)} slots")
        for slot, p in zip(names, parts):
            x0, y0, x1, y1 = p["box"]
            pad = 4
            x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(rgb.shape[1], x1 + pad), min(rgb.shape[0], y1 + pad)
            m = p["mask"][y0:y1, x0:x1]
            al = alpha[y0:y1, x0:x1] * ndimage.binary_dilation(m, iterations=3)
            img = rgb[y0:y1, x0:x1]
            kind, marks, size = landmarks(slot, m, a.view)
            img, al = joint_ends(img, al, kind, marks)
            if slot == "head_neutral":  # the skin colour: the middle of the face
                h, w = m.shape
                skin = lab_of(img[int(h * 0.35):int(h * 0.55), int(w * 0.35):int(w * 0.65)].reshape(-1, 3)).mean(0)
            Image.fromarray(np.dstack([img, (al * 255).astype(np.uint8)])).save(f"{a.out}/{slot}.webp", quality=WEBP_Q, method=6)
            entry = {"w": int(x1 - x0), "h": int(y1 - y0), **{k: [round(float(v[0]), 1), round(float(v[1]), 1)] for k, v in marks.items()}}
            if size:
                entry["m_per_px"] = round(LENGTH[kind] / float(size), 6)
            if slot in CLOTH[a.kind]:
                mask, regions = dye_mask(img, al, skin)
                if regions:
                    Image.fromarray(mask).save(f"{a.out}/{slot}_dye.webp", lossless=True, method=6)
                    entry["dye"] = regions
            manifest[slot] = entry
    for slot, same in SAME_SCALE.items():  # drawn at one scale: a fist must not grow to an open hand's length
        if slot in manifest and same in manifest:
            manifest[slot]["m_per_px"] = manifest[same]["m_per_px"]
    with open(f"{a.out}/parts.json", "w") as f:
        json.dump({"view": a.view, "kind": a.kind, "parts": manifest}, f, indent=1)
    print(a.out, sorted(manifest))


if __name__ == "__main__":
    main()
