"""QA gates for history-lines-v1 library assets.

    python3 qa.py --self-check                    # synthetic tests of every gate
    python3 qa.py rank <ref.png> <cand.png>...    # style gate: neutral side-by-side ranking via codex

Gates (numbers calibrated on the approved Verbree inks/watercolours, see STYLE.md):
  alpha     real alpha, no white halo on the edge, no fake checkerboard, no enclosed paper islands
  ink       black coverage (L*<40) inside the object, target 10-14 %, hard band 7-20 %
  palette   mean Lab dE76 of washed pixels to the nearest era palette colour
  size      min size / aspect per layer type
  ground    the asset touches its ground line (fg/mid/prop), sky/bg exempt
  seam      tileable_x: left and right edge columns match
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
import prompts  # noqa: E402

INK_L = 40.0  # L* below this = ink (approved inks: 11.5-13 % of pixels)
INK_TARGET = (0.10, 0.14)
INK_HARD = (0.07, 0.20)
PAPER_DE = 4.0  # dE76 to paper colour = untouched paper
ISLAND_MIN_PX = 40
HALO_MAX = 0.06
PALETTE_DE_MAX = 16.0
GROUND_MIN = 0.03  # contact width / asset width
SEAM_MAX = 12.0  # mean abs RGB diff between first and last column
SIZE = {  # min w, min h, min aspect, max aspect
    "sky": (1400, 600, 1.3, 9.0),
    "bg": (1400, 300, 1.8, 12.0),
    "mid": (250, 200, 0.2, 6.0),
    "fg": (120, 200, 0.1, 6.0),
    "prop": (80, 60, 0.1, 8.0),
}
NEUTRALS = ["#1b1a18", "#f6f5ee", "#d2cfc9", "#8e8474", "#b19f86"]  # ink, paper, greys from the anchors


def palette_hex(bundle: str) -> list[str]:
    return re.findall(r"#[0-9a-f]{6}", prompts.PALETTE[bundle]) + NEUTRALS


def rgb2lab(rgb: np.ndarray) -> np.ndarray:
    c = rgb.astype(np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def hex2rgb(h: str) -> list[int]:
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def split(img: Image.Image) -> tuple[np.ndarray, np.ndarray]:
    a = np.asarray(img.convert("RGBA"))
    return a[..., :3], a[..., 3]


def ink_coverage(rgb: np.ndarray, mask: np.ndarray | None = None) -> float:
    ink = rgb2lab(rgb)[..., 0] < INK_L
    return float(ink[mask].mean() if mask is not None else ink.mean())


def paper_colour(rgb: np.ndarray, band: int = 8) -> np.ndarray:
    b = np.concatenate([rgb[:band].reshape(-1, 3), rgb[-band:].reshape(-1, 3),
                        rgb[:, :band].reshape(-1, 3), rgb[:, -band:].reshape(-1, 3)])
    return np.median(b, 0)


def fake_checkerboard(rgb: np.ndarray, band: int = 24) -> bool:
    """A drawn transparency grid: the border is two flat light greys in near-equal parts."""
    b = np.concatenate([rgb[:band].reshape(-1, 3), rgb[-band:].reshape(-1, 3)]).astype(int)
    grey = b.max(1) - b.min(1) < 8
    v = b.mean(1)[grey]
    if len(v) < 0.8 * len(b):
        return False
    hi, lo = (v > 240).mean(), ((v > 180) & (v < 225)).mean()
    return hi > 0.2 and lo > 0.2


def edge_band(alpha: np.ndarray) -> np.ndarray:
    m = alpha > 0
    return m & ~ndimage.binary_erosion(m, iterations=2)


def halo_fraction(rgb: np.ndarray, alpha: np.ndarray, paper: np.ndarray | None = None) -> float:
    """Share of the visible edge band that is still paper colour (shows as a white rim on dark)."""
    e = edge_band(alpha) & (alpha > 128)
    if not e.any():
        return 0.0
    paper = np.array([250, 250, 246]) if paper is None else paper
    de = np.linalg.norm(rgb2lab(rgb[e]) - rgb2lab(paper[None])[0], axis=-1)
    return float((de < PAPER_DE).mean())


def paper_islands(rgb: np.ndarray, alpha: np.ndarray, paper: np.ndarray) -> list[int]:
    """Areas (px) of enclosed paper-coloured regions inside the opaque shape."""
    de = np.linalg.norm(rgb2lab(rgb) - rgb2lab(paper[None, None])[0, 0], axis=-1)
    lab, n = ndimage.label((de < PAPER_DE) & (alpha > 128))
    if not n:
        return []
    areas = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    return [int(a) for a in areas if a >= ISLAND_MIN_PX]


def palette_de(rgb: np.ndarray, alpha: np.ndarray, bundle: str) -> float:
    lab = rgb2lab(rgb[alpha > 128])
    wash = lab[(lab[:, 0] > INK_L + 10) & (lab[:, 0] < 97)]
    if len(wash) == 0:
        return 0.0
    wash = wash[:: max(1, len(wash) // 20000)]
    pal = rgb2lab(np.array([hex2rgb(h) for h in palette_hex(bundle)], np.uint8)[None])[0]
    return float(np.linalg.norm(wash[:, None] - pal[None], axis=-1).min(1).mean())


def ground_contact(alpha: np.ndarray) -> tuple[float, float]:
    """(contact width / width, anchor x 0-1) from the bottom 2 % of rows."""
    h, w = alpha.shape
    rows = alpha[int(h * 0.98):] > 128
    cols = rows.any(0)
    if not cols.any():
        return 0.0, 0.5
    return float(cols.mean()), float(np.nonzero(cols)[0].mean() / w)


def seam_diff(rgb: np.ndarray, alpha: np.ndarray) -> float:
    a = np.concatenate([rgb, alpha[..., None]], -1).astype(float)
    return float(np.abs(a[:, 0] - a[:, -1]).mean())


def check(img: Image.Image, layer: str, bundle: str, ink_rgb: np.ndarray | None = None,
          tileable: bool = False, paper: np.ndarray | None = None) -> dict:
    """All pixel gates for one asset. ink_rgb = same crop of the pass-1 ink, if available."""
    rgb, alpha = split(img)
    h, w = alpha.shape
    paper = np.array([250, 250, 246]) if paper is None else paper
    opaque = alpha > 128
    r: dict = {"layer": layer, "w": w, "h": h}
    r["has_alpha"] = bool((alpha < 10).any()) or layer == "sky"
    r["checkerboard"] = fake_checkerboard(rgb)
    r["halo"] = round(halo_fraction(rgb, alpha, paper), 4) if layer != "sky" else 0.0
    r["islands"] = len(paper_islands(rgb, alpha, paper)) if layer not in ("sky", "bg") else 0
    r["alpha_ok"] = r["has_alpha"] and not r["checkerboard"] and r["halo"] <= HALO_MAX and r["islands"] == 0
    src = ink_rgb if ink_rgb is not None else rgb
    r["ink_coverage"] = round(ink_coverage(src, opaque), 4)
    r["ink_ok"] = layer == "sky" or INK_HARD[0] <= r["ink_coverage"] <= INK_HARD[1]
    r["ink_in_target"] = INK_TARGET[0] <= r["ink_coverage"] <= INK_TARGET[1]
    r["palette_de"] = round(palette_de(rgb, alpha, bundle), 2)
    r["palette_ok"] = r["palette_de"] <= PALETTE_DE_MAX
    mw, mh, lo, hi = SIZE[layer]
    r["size_ok"] = w >= mw and h >= mh and lo <= w / h <= hi
    contact, ax = ground_contact(alpha)
    r["anchor"] = [round(ax, 3), 1.0]
    r["ground_ok"] = layer in ("sky", "bg") or contact >= GROUND_MIN
    r["seam"] = round(seam_diff(rgb, alpha), 2)
    r["seam_ok"] = not tileable or r["seam"] <= SEAM_MAX
    r["pass"] = all(r[k] for k in ("alpha_ok", "ink_ok", "palette_ok", "size_ok", "ground_ok", "seam_ok"))
    return r


# ---- style gate --------------------------------------------------------------------------------

def rank(ref: Path, cands: list[Path], log: Path | None = None) -> dict:
    """Neutral side-by-side ranking of up to 4 candidates vs the reference. Same question every round."""
    from gen import CODEX
    with tempfile.TemporaryDirectory() as d:
        cmd = [CODEX, "exec", "--skip-git-repo-check", "-s", "read-only", "-C", d, "-i", str(ref)]
        for c in cands:
            cmd += ["-i", str(c)]
        out = subprocess.run(cmd, input=prompts.rank_prompt(len(cands)), text=True,
                             capture_output=True, timeout=600).stdout
    m = re.findall(r"\{.*\"ranking\".*\}", out)
    res = json.loads(m[-1]) if m else {"error": out[-500:]}
    res["labels"] = {chr(65 + i): str(c) for i, c in enumerate(cands)}
    if log:
        with log.open("a") as f:
            f.write(json.dumps({"ref": str(ref), **res}) + "\n")
    return res


# ---- self-check --------------------------------------------------------------------------------

def self_check() -> None:
    paper = np.array([250, 250, 246])
    yy, xx = np.mgrid[:400, :300]
    disc = (xx - 150) ** 2 + (yy - 200) ** 2 < 140 ** 2
    disc[395:] |= (abs(xx[395:] - 150) < 30)  # trunk touching the bottom
    rgb = np.zeros((400, 300, 3), np.uint8) + np.array([141, 154, 91], np.uint8)  # olive wash
    rgb[::8] = 20  # hatching rows: 1/8 = 12.5 % ink
    alpha = np.where(disc, 255, 0).astype(np.uint8)
    good = Image.fromarray(np.dstack([rgb, alpha]))
    r = check(good, "fg", "nl-prehistory", paper=paper)
    assert r["alpha_ok"] and r["ink_ok"] and r["ink_in_target"] and r["ground_ok"], r
    assert r["palette_ok"], r

    island = rgb.copy()
    island[180:220, 130:170] = paper  # enclosed paper hole
    r = check(Image.fromarray(np.dstack([island, alpha])), "fg", "nl-prehistory", paper=paper)
    assert r["islands"] == 1 and not r["alpha_ok"], r

    halo = rgb.copy()
    halo[edge_band(alpha)] = paper
    assert check(Image.fromarray(np.dstack([halo, alpha])), "fg", "nl-prehistory", paper=paper)["halo"] > 0.5

    checker = ((xx // 16 + yy // 16) % 2)[..., None] * np.array([51, 51, 51]) + 204
    assert fake_checkerboard(checker.astype(np.uint8))
    assert not fake_checkerboard(np.full((400, 300, 3), 250, np.uint8))

    floating = alpha.copy()
    floating[340:] = 0
    assert not check(Image.fromarray(np.dstack([rgb, floating])), "fg", "nl-prehistory")["ground_ok"]

    red = np.zeros_like(rgb) + np.array([230, 20, 200], np.uint8)
    assert not check(Image.fromarray(np.dstack([red, alpha])), "fg", "nl-prehistory")["palette_ok"]

    black = rgb.copy()
    black[:] = 15
    assert not check(Image.fromarray(np.dstack([black, alpha])), "fg", "nl-prehistory")["ink_ok"]

    strip = np.dstack([rgb[:, :1] .repeat(300, 1), np.full((400, 300), 255, np.uint8)])
    assert seam_diff(strip[..., :3], strip[..., 3]) == 0.0
    print("qa self-check: ok")


if __name__ == "__main__":
    if sys.argv[1:2] == ["--self-check"]:
        self_check()
    elif sys.argv[1:2] == ["rank"]:
        print(json.dumps(rank(Path(sys.argv[2]), [Path(p) for p in sys.argv[3:]]), indent=1))
    else:
        print(__doc__)
