"""Depth-driven line weight: far = finer, lighter ink (the comic artist's atmospheric line perspective).

Two uses, one function:
  guide  - weight a Blender line render by distance before it goes to the image model (method A)
  adjust - lighten the ink of a finished illustration by distance (method B, opacity first)

Depth is a per-pixel camera distance in metres from Blender (`<shot>_depth.npy`, ray-cast with the shot's
own camera, see tools/artkit/comfy/PIPELINE.md). The mapping uses FIXED house anchors (NEAR_M, FAR_M), not
per-image normalisation, so the same distance always gets the same line weight across shots and frames.

A contour belongs to the nearer surface: at a silhouette the depth jumps, and the edge pixel is sampled
with a min-filter so a foreground wall's outline is not treated as the far street behind it.

usage:
  python3 depth_lines.py guide  <lines.png> <depth.npy> -o out.png [--near 3] [--far 40] [--far-opacity 0.35] [--near-bold 1]
  python3 depth_lines.py adjust <ink.png>   <depth.npy> -o out.png [--near 3] [--far 40] [--far-opacity 0.45]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

NEAR_M, FAR_M = 3.0, 40.0        # house anchors: full weight at or before NEAR_M, finest at FAR_M and beyond
FAR_OPACITY = 0.35               # ink strength left at FAR_M (1.0 = no fading)
THIN = 0.0                       # off: blending with a thinner copy smears far strokes grey (Bart: 'blurry'); fade = lighter only
GAMMA = 1.8                      # >1 keeps the middle ground strong; only real distance fades (study 2026-09-27)
SMOOTH_FRAC = 1 / 480              # depth-weight blur radius as a share of image width
EDGE_PX = 5                      # min-filter window: a contour takes the nearest depth around it
INK_HI, INK_LO = 200, 100        # luminance ramp: >= INK_HI is paper/wash (untouched), <= INK_LO is full ink
INK_THRESHOLD = INK_HI           # (kept for callers that need a hard cut)


def load_depth(path: Path, size: tuple[int, int]) -> np.ndarray:
    """Depth in metres at image size; misses (sky) become +inf -> treated as farthest."""
    z = np.load(path).astype(np.float32)
    z = np.where(np.isfinite(z), z, 1e6)
    img = Image.fromarray(z, mode="F").resize(size, Image.NEAREST)
    return np.asarray(img.filter(ImageFilter.MinFilter(EDGE_PX)), dtype=np.float32)


def far_fraction(z: np.ndarray, near: float = NEAR_M, far: float = FAR_M, gamma: float = GAMMA) -> np.ndarray:
    """0 at `near` (and closer), 1 at `far` (and beyond), log-spaced: 3->6 m matters as much as 20->40 m."""
    t = (np.log(np.clip(z, near, far)) - np.log(near)) / (np.log(far) - np.log(near))
    return t ** gamma


def smooth(t: np.ndarray, width: int) -> np.ndarray:
    """Soften the depth weight: the ray-cast depth is coarser than the illustration and its steps showed as
    little blocks in faded far beams at 100% (study 2026-09-27). Radius scales with the image."""
    r = max(1.0, width * SMOOTH_FRAC)
    t8 = Image.fromarray(np.clip(t * 255 + 0.5, 0, 255).astype(np.uint8))     # 8 bits is plenty for a weight
    return np.asarray(t8.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0


def ink_opacity(t: np.ndarray, far_opacity: float = FAR_OPACITY) -> np.ndarray:
    return 1.0 - (1.0 - far_opacity) * t


def fade_ink(gray: np.ndarray, opacity: np.ndarray) -> np.ndarray:
    """Blend each pixel toward paper white by (1 - opacity). Paper stays paper; only ink changes."""
    return 255.0 - (255.0 - gray) * opacity


def guide(lines: Image.Image, z: np.ndarray, far_opacity: float, near_bold: int, near: float, far: float) -> Image.Image:
    g = lines.convert("L")
    t = far_fraction(z, near, far)
    out = np.asarray(g, dtype=np.float32)
    if near_bold:
        # Near contours get a heavier stroke: take the thickened line only where the stroke is near.
        bold = np.asarray(g.filter(ImageFilter.MinFilter(2 * near_bold + 1)), dtype=np.float32)
        out = np.where(t < 0.25, np.minimum(out, bold), out)
    return Image.fromarray(np.clip(fade_ink(out, ink_opacity(t, far_opacity)), 0, 255).astype(np.uint8))


def adjust(ink: Image.Image, z: np.ndarray, far_opacity: float, near: float, far: float,
           gamma: float = GAMMA, thin: float = THIN) -> Image.Image:
    """Opacity-first adjustment of an illustration's dark marks; colour images are adjusted per channel.
    `thin` (0-1) also narrows far strokes: blend toward a 3x3 max-filtered (1 px thinner) copy by t * thin."""
    img = ink.convert("RGB")
    rgb = np.asarray(img, dtype=np.float32)
    t = smooth(far_fraction(z, near, far, gamma), img.width)
    if thin > 0:
        thinner = np.asarray(img.filter(ImageFilter.MaxFilter(3)), dtype=np.float32)
        w = (t * thin)[..., None]
        rgb = rgb * (1 - w) + thinner * w
    lum = rgb.mean(axis=2)
    # Soft ink weight, not a hard threshold: a hard cut faded marks just under it and left their neighbours,
    # which read as a ghostly double exposure on coloured wood at 100% (study 2026-09-27).
    w_ink = np.clip((INK_HI - lum) / (INK_HI - INK_LO), 0, 1)[..., None]
    paper = np.percentile(rgb.reshape(-1, 3), 97, axis=0)       # fade toward this image's own paper tone
    fade = ((1.0 - ink_opacity(t, far_opacity))[..., None]) * w_ink
    return Image.fromarray(np.clip(rgb + (paper - rgb) * fade, 0, 255).astype(np.uint8))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["guide", "adjust"])
    ap.add_argument("image", type=Path)
    ap.add_argument("depth", type=Path)
    ap.add_argument("-o", "--out", type=Path, required=True)
    ap.add_argument("--near", type=float, default=NEAR_M)
    ap.add_argument("--far", type=float, default=FAR_M)
    ap.add_argument("--far-opacity", type=float, default=FAR_OPACITY)
    ap.add_argument("--near-bold", type=int, default=1, help="guide only: extra stroke radius (px) for near lines")
    ap.add_argument("--gamma", type=float, default=GAMMA, help=">1 keeps the middle ground stronger")
    ap.add_argument("--thin", type=float, default=THIN, help="adjust only: 0-1, narrow far strokes too")
    a = ap.parse_args()
    img = Image.open(a.image)
    z = load_depth(a.depth, img.size)
    res = (guide(img, z, a.far_opacity, a.near_bold, a.near, a.far) if a.mode == "guide"
           else adjust(img, z, a.far_opacity, a.near, a.far, a.gamma, a.thin))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    res.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
