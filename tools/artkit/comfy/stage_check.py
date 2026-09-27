"""Stage checks for the background chain (diagnostics, not a verdict; see PIPELINE.md).

  structure  Blender contours that come back in the illustration within TOL px (recall), and ink that
             appears on surfaces the protected mask says are empty (inventions show up there first).
  depth      ink coverage and ink strength per distance band, from the shot's Blender depth.
  paper      share of near-paper pixels (warm paper counts: high value, low chroma).

usage: python3 stage_check.py <blender_lines.png> <depth.npy> <mask.png> <image.png> [<image.png> ...]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

import depth_lines as dl

SIZE = (960, 540)
TOL = 4                    # px at 960 wide
INK = 110                  # luminance below this = ink (hatching included)
BANDS = [("near", 0, 6), ("mid", 6, 15), ("far", 15, 1e9)]
WALL_RGB = (255, 255, 0)   # mask palette: plain wall = protected empty surface


def lum(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("L").resize(SIZE, Image.LANCZOS), dtype=np.float32)


def check(lines: Path, depth: Path, mask: Path, img: Path) -> dict:
    e = lum(lines) < 128
    rgb = np.asarray(Image.open(img).convert("RGB").resize(SIZE, Image.LANCZOS), dtype=np.float32)
    L = rgb.mean(axis=2)
    ink = L < INK
    near_ink = np.asarray(Image.fromarray((ink * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * TOL + 1))) > 0
    recall = float((e & near_ink).sum() / max(e.sum(), 1))
    m = np.asarray(Image.open(mask).convert("RGB").resize(SIZE, Image.NEAREST))
    wall = np.all(m == WALL_RGB, axis=2)
    # "wall ink": ink on plain wall away from any Blender contour (texture is allowed, objects are not)
    far_from_e = ~(np.asarray(Image.fromarray((e * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * TOL + 1))) > 0)
    wall_ink = float((ink & wall & far_from_e).sum() / max((wall & far_from_e).sum(), 1))
    z = dl.load_depth(depth, SIZE)
    bands = {}
    for name, lo, hi in BANDS:
        b = (z >= lo) & (z < hi)
        if b.sum() < 500:
            continue
        inkb = ink & b
        bands[name] = {"coverage": round(float(inkb.sum() / b.sum()), 4),
                       "strength": round(float(255 - L[inkb].mean()) / 255, 3) if inkb.any() else 0.0}
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    paper = float(((L > 215) & (chroma < 45)).mean())
    return {"image": img.name, "recall": round(recall, 3), "wall_ink": round(wall_ink, 4),
            "paper": round(paper, 3), "bands": bands}


if __name__ == "__main__":
    lines, depth, mask, *imgs = map(Path, sys.argv[1:])
    for i in imgs:
        print(json.dumps(check(lines, depth, mask, i)))
