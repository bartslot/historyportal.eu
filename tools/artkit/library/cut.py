"""Cut a coloured sheet (objects on white paper) into transparent assets.

    python3 cut.py jobs/nl-prehistory.json [--only sheet ...]

Per sheet and colour variant: _work/<bundle>/<sheet>/cut_<v>/<asset id>.png (RGBA) + cut.json.
Matting is ours, not the model's: paper connected to the border = background; enclosed paper islands
(gaps between branches) are cut; the edge gets a soft alpha and is un-mixed from the paper colour so
no white halo remains.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
import qa  # noqa: E402
from gen import LIB  # noqa: E402

BG_DE = 7.0  # dE76 to paper: background candidate
ISLAND_DE = qa.PAPER_DE
SEAM_PX = 96
MIN_OBJ_FRAC = 0.002  # objects smaller than this share of the sheet are crumbs
PAD = 6


def matte(rgb: np.ndarray, paper: np.ndarray, layer: str) -> np.ndarray:
    """Alpha 0-255: background paper cut, enclosed islands cut, soft un-mixable edge."""
    de = np.linalg.norm(qa.rgb2lab(rgb) - qa.rgb2lab(paper[None, None])[0, 0], axis=-1)
    cand = de < BG_DE
    lab, _ = ndimage.label(cand)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    if layer in ("bg", "strip"):  # a strip: everything below the land silhouette is land
        bg &= ~(np.cumsum(~bg, 0) > 0)
    obj = ~bg
    if layer not in ("bg", "strip"):
        isl, n = ndimage.label((de < ISLAND_DE) & obj)
        if n:
            areas = ndimage.sum(np.ones_like(isl), isl, range(1, n + 1))
            big = np.nonzero(areas >= qa.ISLAND_MIN_PX)[0] + 1
            obj &= ~np.isin(isl, big)
    obj = ndimage.binary_opening(obj, iterations=1) | (obj & (de > 30))  # drop 1px paper whiskers, keep ink
    soft = np.clip((de - 2.0) / 14.0, 0, 1)
    inner = ndimage.binary_erosion(obj, iterations=2)
    ring = ndimage.binary_dilation(obj, iterations=1)
    a = np.where(inner, 1.0, np.where(ring, soft, 0.0))
    return (a * 255).astype(np.uint8)


def unmix(rgb: np.ndarray, alpha: np.ndarray, paper: np.ndarray) -> np.ndarray:
    a = alpha[..., None] / 255.0
    f = (rgb.astype(float) - (1 - a) * paper) / np.maximum(a, 1e-3)
    return np.where(a > 0, np.clip(f, 0, 255), 0).astype(np.uint8)


def seam_tile(rgba: np.ndarray, band: int = SEAM_PX) -> np.ndarray:
    """Make tileable_x: crossfade the last `band` columns into the first ones, drop them."""
    w = rgba.shape[1]
    t = rgba[:, : w - band].astype(float).copy()
    ramp = (np.arange(band) / band)[None, :, None]
    t[:, :band] = rgba[:, w - band:] * (1 - ramp) + rgba[:, :band] * ramp
    return t.astype(np.uint8)


def objects(alpha: np.ndarray, n_items: int) -> tuple[list[tuple[slice, slice, np.ndarray]], str]:
    """Group opaque pixels into n_items objects, reading order (rows top to bottom, then left to right).

    Grows the glue radius until exactly n_items big parts remain; crumbs join the nearest big part.
    """
    h, w = alpha.shape
    m = alpha > 0
    best = None
    for r in (2, 4, 6, 9, 13, 18, 25, 35):
        lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=r) if r else m)
        sizes = ndimage.sum(m, lab, range(1, n + 1))
        big = [i + 1 for i, s in enumerate(sizes) if s >= MIN_OBJ_FRAC * h * w]
        if best is None or abs(len(big) - n_items) < abs(len(best[1]) - n_items):
            best = (lab, big)
        if len(big) <= n_items:
            break
    lab, big = best
    note = "" if len(big) == n_items else f"found {len(big)} objects for {n_items} items"
    seeds = np.where(np.isin(lab, big), lab, 0)
    _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
    owner = np.where(m, seeds[iy, ix], 0)  # every opaque pixel joins its nearest big part
    found = []
    for i in big:
        own = owner == i
        ys, xs = np.nonzero(own)
        sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
        found.append((sl, own[sl]))
    found = sorted(found, key=lambda f: -f[1].sum())[:n_items]
    cy = [(f[0][0].start + f[0][0].stop) / 2 for f in found]
    row_h = h / 2 if len(found) > 4 else h  # specimen sheets have two rows
    found = sorted(zip(cy, found), key=lambda t: (int(t[0] // row_h), t[1][0][1].start))
    return [(sl[0], sl[1], own) for _, (sl, own) in found], note


def cut_sheet(bundle: str, sheet: dict, variant: str) -> dict | None:
    d = LIB / "_work" / bundle / sheet["id"]
    src = d / f"colour_{variant}.png"
    if not src.exists():
        return None
    rgb = np.asarray(Image.open(src).convert("RGB"))
    paper = qa.paper_colour(rgb)
    out = d / f"cut_{variant}"
    out.mkdir(exist_ok=True)
    layer = "strip" if sheet.get("strip") else sheet["layer"]
    res = {"sheet": sheet["id"], "variant": variant, "paper": paper.tolist(),
           "checkerboard": qa.fake_checkerboard(rgb), "assets": [],
           "ink_sheet": round(qa.ink_coverage(np.asarray(Image.open(d / "ink.png").convert("RGB"))), 4)}
    if layer == "sky":
        rgba = seam_tile(np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)]))
        Image.fromarray(rgba).save(out / f"{sheet['items'][0]['id']}.png")
        res["assets"].append(sheet["items"][0]["id"])
    else:
        alpha = matte(rgb, paper, layer)
        clean = unmix(rgb, alpha, paper)
        if layer in ("bg", "strip"):
            rgba = seam_tile(np.dstack([clean, alpha]))
            ys = np.nonzero((rgba[..., 3] > 0).any(1))[0]
            de = np.linalg.norm(qa.rgb2lab(rgba[..., :3]) - qa.rgb2lab(paper[None, None])[0, 0], axis=-1)
            washed = (de >= qa.PAPER_DE).mean(1)
            bottom = len(washed) - int(np.argmax(washed[::-1] > 0.6))  # drop unpainted paper rows
            Image.fromarray(rgba[max(0, ys[0] - PAD):bottom]).save(out / f"{sheet['items'][0]['id']}.png")
            res["assets"].append(sheet["items"][0]["id"])
        else:
            objs, res["note"] = objects(alpha, len(sheet["items"]))
            for item, (sy, sx, own) in zip(sheet["items"], objs):
                a = np.where(own, alpha[sy, sx], 0).astype(np.uint8)
                crop = np.pad(np.dstack([clean[sy, sx], a]), ((PAD, 0), (PAD, PAD), (0, 0)))
                Image.fromarray(crop).save(out / f"{item['id']}.png")
                res["assets"].append(item["id"])
    (out / "cut.json").write_text(json.dumps(res, indent=1))
    print(f"  cut {bundle}/{sheet['id']}/{variant}: {len(res['assets'])} {res.get('note', '')}", flush=True)
    return res


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    job = json.loads(Path(a.job).read_text())
    for s in job["sheets"]:
        if a.only and s["id"] not in a.only:
            continue
        for v in "abcd":
            cut_sheet(job["bundle"], s, v)


if __name__ == "__main__":
    main()
