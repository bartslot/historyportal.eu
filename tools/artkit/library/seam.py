"""Ground tiles that repeat without a mirror: offset-and-repaint.

    python3 seam.py roll <bundle> <sheet> <variant>        # -> seam_in_<v>.png (+ _pad.png to upload to Figma)
    # Figma: Edit with prompt on the padded upload, prompt = PROMPT below, then
    python3 weave.py grab <bundle> <sheet> seamedit_<v> <urls...>
    python3 seam.py merge <bundle> <sheet> <variant> <new_variant>   # -> colour_<new>.png + seam_<new>.json
    python3 seam.py roll2 <bundle> <sheet> <new_variant>   # pass 2: the band's ends met at the wrap; roll by a
    # quarter so those two spots sit inside, Figma repaints them (PROMPT2), grab as seamedit2_<new>, then
    python3 seam.py merge2 <bundle> <sheet> <new_variant>

Rolling the tile by half puts its old edges (the seam) in a cross through the centre and its old interior on the
edges, so the edges wrap by construction. The edit model repaints the whole image, so only a feathered band along
the cross is taken from the edit; everything else stays the original painting. Never mirrored (the checker's
re-check 2026-10-27 found mirror tiles read as Rorschach patterns), never crossfaded (ghosts).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from gen import LIB  # noqa: E402
from weave import pad_ink  # noqa: E402

BAND = 0.14  # share of the tile width repainted along each centre line
FEATHER = 0.025
EDGE_CLAMP = 4  # px  # soft edge of that band, share of the width

PROMPT = (
    "This is a seamless ground texture tile that was cut into four quarters and swapped, so a visible seam runs "
    "as a cross through the exact centre: one vertical line and one horizontal line. Repaint only a narrow band "
    "along that cross so every path, furrow, canal, plant, stone and wash continues across it naturally, as if "
    "the seam was never there, in exactly the same ink line and watercolour style. Keep everything outside that "
    "band exactly as it is. Keep the canvas size and framing: no zoom, no crop, no border, no new objects."
)


PROMPT2 = (
    "This is a ground texture tile with two small seams left: a short break in the texture at about three quarters "
    "of the width and one quarter of the height, and another at about one quarter of the width and three quarters "
    "of the height. Repaint only two small round patches there so the texture continues naturally, in exactly the "
    "same ink line and watercolour style. Keep everything else exactly as it is. Keep the canvas size and framing: "
    "no zoom, no crop, no border, no new objects."
)
SPOT = 0.11  # radius of the pass-2 patches, share of the width


def _dir(bundle: str, sheet: str) -> Path:
    return LIB / "_work" / bundle / sheet


def roll(bundle: str, sheet: str, v: str) -> Path:
    im = np.asarray(Image.open(_dir(bundle, sheet) / f"colour_{v}.png").convert("RGB"))
    h, w = im.shape[:2]
    out = _dir(bundle, sheet) / f"seam_in_{v}.png"
    Image.fromarray(np.roll(im, (h // 2, w // 2), (0, 1))).save(out)
    return pad_ink(out)


def band_mask(h: int, w: int) -> np.ndarray:
    yy, xx = np.mgrid[:h, :w]
    d = np.minimum(np.abs(xx - w / 2) / w, np.abs(yy - h / 2) / h)
    return np.clip((BAND / 2 + FEATHER - d) / (2 * FEATHER), 0, 1)


def merge(bundle: str, sheet: str, v: str, new: str) -> Path:
    d = _dir(bundle, sheet)
    rolled = np.asarray(Image.open(d / f"seam_in_{v}.png").convert("RGB")).astype(float)
    h, w = rolled.shape[:2]
    edit = np.asarray(Image.open(d / f"seamedit_{v}.png").convert("RGB").resize((w, h), Image.LANCZOS)).astype(float)
    edit = _clamp_edges(edit)
    m = band_mask(h, w)[..., None]
    out = (rolled * (1 - m) + edit * m).round().astype(np.uint8)
    Image.fromarray(out).save(d / f"colour_{new}.png")
    (d / f"seam_{new}.json").write_text(json.dumps({"from": v, "band": BAND, "feather": FEATHER}) + "\n")
    return d / f"colour_{new}.png"


def _clamp_edges(edit: np.ndarray) -> np.ndarray:
    e = EDGE_CLAMP  # the edit model leaves a thin white border: repeat the first clean row/column into it
    edit[:e], edit[-e:] = edit[e], edit[-e - 1]
    edit[:, :e], edit[:, -e:] = edit[:, e:e + 1], edit[:, -e - 1:-e]
    return edit


def roll2(bundle: str, sheet: str, v: str) -> Path:
    im = np.asarray(Image.open(_dir(bundle, sheet) / f"colour_{v}.png").convert("RGB"))
    h, w = im.shape[:2]
    out = _dir(bundle, sheet) / f"seam2_in_{v}.png"
    Image.fromarray(np.roll(im, (h // 4, w // 4), (0, 1))).save(out)
    return pad_ink(out)


def spot_mask(h: int, w: int) -> np.ndarray:
    """Where the cross band met the wrap, after a quarter roll: (h/4, 3w/4) and (3h/4, w/4)."""
    yy, xx = np.mgrid[:h, :w]
    m = np.zeros((h, w))
    for cy, cx in ((h / 4, 3 * w / 4), (3 * h / 4, w / 4)):
        d = np.hypot(yy - cy, xx - cx) / w
        m = np.maximum(m, np.clip((SPOT - d) / (2 * FEATHER), 0, 1))
    return m


def merge2(bundle: str, sheet: str, v: str) -> Path:
    d = _dir(bundle, sheet)
    rolled = np.asarray(Image.open(d / f"seam2_in_{v}.png").convert("RGB")).astype(float)
    h, w = rolled.shape[:2]
    edit = _clamp_edges(np.asarray(Image.open(d / f"seamedit2_{v}.png").convert("RGB").resize((w, h), Image.LANCZOS)).astype(float))
    m = spot_mask(h, w)[..., None]
    Image.fromarray((rolled * (1 - m) + edit * m).round().astype(np.uint8)).save(d / f"colour_{v}.png")
    meta = json.loads((d / f"seam_{v}.json").read_text())
    (d / f"seam_{v}.json").write_text(json.dumps({**meta, "pass2": True, "spot": SPOT}) + "\n")
    return d / f"colour_{v}.png"


def wrap_step(rgb: np.ndarray) -> tuple[float, float]:
    """Wrap step / typical step in x and y (1 = the edge is as smooth as the inside)."""
    a = rgb.astype(float)
    tx, ty = np.abs(np.diff(a, axis=1)).mean(), np.abs(np.diff(a, axis=0)).mean()
    return float(np.abs(a[:, 0] - a[:, -1]).mean() / tx), float(np.abs(a[0] - a[-1]).mean() / ty)


def _self_check() -> None:
    rng = np.random.default_rng(0)
    tile = ndimage.gaussian_filter(rng.normal(128, 40, (200, 200, 3)), (6, 6, 0), mode="wrap").clip(0, 255)
    broken = np.roll(tile, (100, 100), (0, 1))  # what roll() makes: interior on the edges
    assert max(wrap_step(broken)) < 1.5, wrap_step(broken)
    m = band_mask(200, 200)
    assert m[100, 100] == 1 and m[0, 0] == 0 and m[100, 0] == 1 and m[30, 30] == 0
    sp = spot_mask(200, 200)  # the band's wrap ends, rolled by a quarter, land on the two spots
    assert sp[50, 150] == 1 and sp[150, 50] == 1 and sp[0, 0] == 0 and sp[100, 100] == 0
    print("seam self-check: ok")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "roll":
        print(roll(*sys.argv[2:5]))
    elif cmd == "merge":
        print(merge(*sys.argv[2:6]))
    elif cmd == "roll2":
        print(roll2(*sys.argv[2:5]))
    elif cmd == "merge2":
        print(merge2(*sys.argv[2:5]))
    elif cmd == "--self-check":
        _self_check()
    else:
        print(__doc__)
