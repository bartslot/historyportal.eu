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
MIN_OBJ_FRAC = 0.002  # objects smaller than this share of the sheet are crumbs
PAD = 6
FADE_FRAC = 0.12  # bg strips: bottom share that fades out

LAND_WIN = 0.15
LAND_TOP = 0.3  # ... and paper pockets in the top share of the land (below that line) are sky, not land  # bg strips: the land line is the running median of the land top over this share of the width

GAP_RING_INK = 0.25  # an enclosed paper island is a see-through gap only if ink draws its rim
LEG_ZONE = 0.7  # ... or, on solid sheets, if it sits in the bottom 30 % of its object (between legs, rollers)


def gap_islands(rgb: np.ndarray, de: np.ndarray, obj: np.ndarray, gaps: str,
                keep: np.ndarray | None = None) -> np.ndarray:
    """Enclosed paper islands to cut. gaps='all' (an item made of thin things: reeds, grass, nets, an anchor's
    arms, rigging): every island, except inside `keep` (flag bands). The checker found the rim rule left the sky
    between stalks as opaque cream slabs (re-check 2026-10-27). gaps='cut' (trees, fences, mixed sheets): every
    island whose rim is ink.
    gaps='fill' (animals, stones, props, buildings): only islands in the leg zone; white bodies, flag bands,
    foam and highlights stay opaque (the checker found them punched through, 2026-10-27)."""
    isl, n = ndimage.label((de < ISLAND_DE) & obj)
    cut = np.zeros_like(obj)
    if not n:
        return cut
    ink = qa.ink_coverage_map(rgb)
    comp, _ = ndimage.label(ndimage.binary_closing(obj, iterations=4))
    boxes = ndimage.find_objects(comp)
    for i, sl in enumerate(ndimage.find_objects(isl), start=1):
        m = isl[sl] == i
        if m.sum() < qa.ISLAND_MIN_PX:
            continue
        if gaps == "all":
            if keep is None or not keep[sl][m].any():
                cut[sl] |= m
            continue
        pad = tuple(slice(max(0, s.start - 3), s.stop + 3) for s in sl)
        mm = isl[pad] == i
        ring = ndimage.binary_dilation(mm, iterations=3) & ~mm
        if ink[pad][ring].mean() < GAP_RING_INK:
            continue  # rimmed by colour (a flag band, foam): fill
        if gaps != "cut":
            ys = np.nonzero(m)[0] + sl[0].start
            c = comp[sl][m]
            box = boxes[np.bincount(c[c > 0]).argmax() - 1] if (c > 0).any() else None
            if box is None or (ys.mean() - box[0].start) / max(1, box[0].stop - box[0].start) < LEG_ZONE:
                continue
        cut[sl] |= m
    return cut



def land_line(bg: np.ndarray) -> np.ndarray:
    """Per column, the row where the land starts: the running median of the first non-paper row, so a tree or
    mast that rises above the land does not drag the paper beside it into the land (paper boxes at the frame,
    checker re-check 2026-10-27: hills-dry-01, bg-city-01)."""
    h, w = bg.shape
    first = np.where((~bg).any(0), np.argmax(~bg, 0), h)
    return ndimage.median_filter(first, size=max(3, int(w * LAND_WIN)), mode="nearest")


def matte(rgb: np.ndarray, paper: np.ndarray, layer: str, gaps: str = "fill",
          keep: np.ndarray | None = None) -> np.ndarray:
    """Alpha 0-255: background paper cut, see-through gaps cut (gap_islands), soft un-mixable edge."""
    de = np.linalg.norm(qa.rgb2lab(rgb) - qa.rgb2lab(paper[None, None])[0, 0], axis=-1)
    cand = de < BG_DE
    lab, _ = ndimage.label(cand)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    if layer in ("bg", "strip"):  # a strip: everything below the land line is land
        rows = np.arange(bg.shape[0])[:, None]
        line = land_line(bg)[None, :]
        bg &= rows < line
        upper = rows < line + LAND_TOP * (bg.shape[0] - line)  # sky pockets between crowns, masts, spires
        bg |= gap_islands(rgb, de, ~bg & upper, "all")
    obj = ~bg
    if layer not in ("bg", "strip"):
        obj &= ~gap_islands(rgb, de, obj, gaps, keep)
    obj = ndimage.binary_opening(obj, iterations=1) | (obj & (de > 30))  # drop 1px paper whiskers, keep ink
    soft = np.clip((de - 2.0) / 14.0, 0, 1)
    inner = ndimage.binary_erosion(obj, iterations=2)
    ring = ndimage.binary_dilation(obj, iterations=1)
    a = np.where(inner, 1.0, np.where(ring, soft, 0.0))
    return (a * 255).astype(np.uint8)


GLAZE = np.array([245, 230, 206])  # STYLE.md cream #f5e6ce: white things get a pale glaze, never bare paper


def glaze_kept_white(rgb: np.ndarray, paper: np.ndarray, alpha: np.ndarray, k: float = 0.55) -> np.ndarray:
    """Paper-white areas that stay inside a shape (wool, flag band, foam, highlights) get a pale cream glaze, so
    they read as painted white and never as a hole or bare paper."""
    de = np.linalg.norm(qa.rgb2lab(rgb) - qa.rgb2lab(paper[None, None])[0, 0], axis=-1)
    inner = ndimage.binary_erosion(alpha > 250, iterations=2)
    m = (de < ISLAND_DE) & inner
    out = rgb.astype(float)
    out[m] = out[m] * (1 - k) + GLAZE * k
    return out.astype(np.uint8)


def unmix(rgb: np.ndarray, alpha: np.ndarray, paper: np.ndarray) -> np.ndarray:
    a = alpha[..., None] / 255.0
    f = (rgb.astype(float) - (1 - a) * paper) / np.maximum(a, 1e-3)
    return np.where(a > 0, np.clip(f, 0, 255), 0).astype(np.uint8)


def fade_bottom(rgba: np.ndarray, frac: float = FADE_FRAC, seed: int = 7) -> np.ndarray:
    """bg strips end in a painted fade, not a straight cut: alpha ramps to 0 over the bottom rows, the ramp's
    start wanders per column (smooth noise) so the edge reads as a wash running out."""
    h, w = rgba.shape[:2]
    n = max(8, int(h * frac))
    rng = np.random.default_rng(seed)
    wobble = ndimage.gaussian_filter1d(rng.normal(0, 1, w), 40, mode="wrap")
    wobble = wobble / (np.abs(wobble).max() + 1e-6) * 0.35 * n
    y = np.arange(h)[:, None] - (h - n + wobble[None, :])
    ramp = np.clip(1 - y / n, 0, 1)
    out = rgba.copy()
    out[..., 3] = (out[..., 3] * ramp).astype(np.uint8)
    out[-2:, :, 3] = 0  # the strip ends in nothing, never a faint line
    return out


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
    return [(sl[0], sl[1], own) for sl, own in reading_order(found)], note


def reading_order(found: list) -> list:
    """Rows = objects whose vertical centres fall inside the row's span; rows top-down, then left-right."""
    rows: list[list] = []
    for f in sorted(found, key=lambda f: f[0][0].stop):  # by ground line
        cy = (f[0][0].start + f[0][0].stop) / 2
        for row in rows:
            top = min(g[0][0].start for g in row)
            bot = max(g[0][0].stop for g in row)
            if top <= cy <= bot:
                row.append(f)
                break
        else:
            rows.append([f])
    rows.sort(key=lambda r: min(g[0][0].start for g in r))
    return [f for r in rows for f in sorted(r, key=lambda g: g[0][1].start)]


def cut_sheet(bundle: str, sheet: dict, variant: str) -> dict | None:
    d = LIB / "_work" / bundle / sheet["id"]
    src = d / f"colour_{variant}.png"
    if not src.exists():
        return None
    rgb = np.asarray(Image.open(src).convert("RGB"))
    layer = "strip" if sheet.get("strip") else sheet["layer"]
    # bg strips and ground strips run to the side and bottom edges: only the top band is paper
    paper = np.median(rgb[:8].reshape(-1, 3), 0) if layer in ("bg", "strip") else qa.paper_colour(rgb)
    out = d / f"cut_{variant}"
    out.mkdir(exist_ok=True)
    res = {"sheet": sheet["id"], "variant": variant, "paper": paper.tolist(),
           "checkerboard": qa.fake_checkerboard(rgb), "assets": [],
           "ink_sheet": round(qa.ink_coverage(np.asarray(Image.open(d / "ink.png").convert("RGB"))), 4)}
    if layer in ("sky", "ground"):
        rgba = np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)])
        # Never mirrored (checker re-check 2026-10-27: butterfly clouds, Rorschach grounds). A sky is one painting
        # wider than the stage; a ground tile repeats only when seam.py repainted its wrap (colour_<v> from merge).
        res["seam"] = "wrap" if layer == "ground" and (d / f"seam_{variant}.json").exists() else "none"
        Image.fromarray(rgba).save(out / f"{sheet['items'][0]['id']}.png")
        res["assets"].append(sheet["items"][0]["id"])
    else:
        alpha = matte(rgb, paper, layer, sheet.get("gaps", "fill"))
        clean = unmix(glaze_kept_white(rgb, paper, alpha), alpha, paper)
        if layer in ("bg", "strip"):
            rgba = np.dstack([clean, alpha])
            ys = np.nonzero((rgba[..., 3] > 0).any(1))[0]
            de = np.linalg.norm(qa.rgb2lab(rgba[..., :3]) - qa.rgb2lab(paper[None, None])[0, 0], axis=-1)
            washed = (de >= qa.PAPER_DE).mean(1)
            bottom = len(washed) - int(np.argmax(washed[::-1] > 0.6))  # drop unpainted paper rows
            rgba = rgba[max(0, ys[0] - PAD):bottom]
            if layer == "bg":  # far land: one painted strip, never crossfaded (no tiling)
                rgba = fade_bottom(rgba)
                res["seam"] = "none"
            else:  # near ground/water strips: one painting, never mirrored or crossfaded
                res["seam"] = "none"
            Image.fromarray(rgba).save(out / f"{sheet['items'][0]['id']}.png")
            res["assets"].append(sheet["items"][0]["id"])
        else:
            objs, res["note"] = objects(alpha, len(sheet["items"]))
            thin = None
            if any(i.get("gaps") == "all" for i in sheet["items"]):
                keep = np.zeros(alpha.shape, bool)
                for x0, y0, x1, y1 in sheet.get("keep", []):  # fractions of the sheet: flag bands etc.
                    h, w = alpha.shape
                    keep[int(y0 * h):int(y1 * h), int(x0 * w):int(x1 * w)] = True
                thin = matte(rgb, paper, layer, "all", keep)
            for item, (sy, sx, own) in zip(sheet["items"], objs):
                src_a = thin if item.get("gaps") == "all" else alpha
                a = np.where(own, src_a[sy, sx], 0).astype(np.uint8)
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
    ap.add_argument("--variants", default="abcd", help="'g' = the Figma pass")
    a = ap.parse_args()
    job = json.loads(Path(a.job).read_text())
    for s in job["sheets"]:
        if a.only and s["id"] not in a.only:
            continue
        for v in a.variants:
            cut_sheet(job["bundle"], s, v)


def _self_check() -> None:
    s = lambda y0, y1, x0: ((slice(y0, y1), slice(x0, x0 + 10)), None)  # noqa: E731
    # longhouse top-left, granary top-right, pen lower-right (the mid-farm layout)
    got = reading_order([s(300, 500, 940), s(0, 230, 0), s(0, 220, 1100)])
    assert [g[0][1].start for g in got] == [0, 1100, 940], got
    # two even rows of three
    got = reading_order([s(500, 900, x) for x in (600, 0, 300)] + [s(0, 400, x) for x in (300, 600, 0)])
    assert [(g[0][0].start, g[0][1].start) for g in got] == [(0, 0), (0, 300), (0, 600), (500, 0), (500, 300), (500, 600)]
    print("cut self-check: ok")


if __name__ == "__main__":
    if sys.argv[1:2] == ["--self-check"]:
        _self_check()
        sys.exit()
    main()
