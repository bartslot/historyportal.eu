"""Cut stacked ground-band sheets into 6:1 transparent ground_band strips (S1 contract, 2026-10-28).

    python3 cut_bands.py <bundle> <sheet:colour_variant>:<z>,<z>... ...   e.g. nl-prehistory band-a:colour_w:2,6,15,40

Ground = every pixel that is not paper-white and not sky blue. Per band: bottom row = last ground row of the segment,
picture height = width / 6, everything above the skyline transparent. Output _staging/ground_band_<z>m.png (RGBA).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from gen import LIB  # noqa: E402

MIN_SEG = 40  # px of ground rows that make a band


def ground_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(int) for i in range(3))
    paper = (r > 232) & (g > 232) & (b > 232)
    sky = (b > r + 18) & (b > 170) & (g > 150)  # pale watercolour blue
    m = ~paper & ~sky
    return ndimage.binary_opening(m, iterations=2)


def cut(bundle: str, sheet: str, variant: str, zs: list[int]) -> list[Path]:
    src = LIB / "_work" / bundle / sheet / f"{variant}.png"
    rgb = np.asarray(Image.open(src).convert("RGB"))
    h, w = rgb.shape[:2]
    m = ground_mask(rgb)
    rows = np.convolve(m.mean(1) > 0.35, np.ones(5), "same") >= 3
    lab, n = ndimage.label(rows)
    segs = [sl[0] for sl in ndimage.find_objects(lab)]
    segs = [s for s in segs if s.stop - s.start >= MIN_SEG][: len(zs)]
    out_dir = LIB / bundle / "_staging"
    out_dir.mkdir(exist_ok=True)
    outs = []
    ph = round(w / 6)
    for seg, z in zip(segs, zs):
        bottom = seg.stop
        top = bottom - ph
        a = np.zeros((ph, w, 4), np.uint8)
        y0 = max(top, 0)
        a[y0 - top:, :, :3] = rgb[y0:bottom]
        a[y0 - top:, :, 3] = np.where(m[y0:bottom], 255, 0)
        a[..., 3] = ndimage.gaussian_filter(a[..., 3].astype(float), 1.2).clip(0, 255).astype(np.uint8)
        a[a[..., 3] == 0, :3] = 0
        edge = float(np.abs(a[:, 0, :3].astype(int) - a[:, -1, :3].astype(int)).mean())
        sky_top = (seg.start - top) / ph
        f = out_dir / f"ground_band_{z}m.png"
        Image.fromarray(a).save(f)
        print(f"ground_band_{z}m {w}x{ph} skyline {sky_top:.2f} from top, edge diff {edge:.1f}")
        outs.append(f)
    if len(segs) != len(zs):
        print(f"WARNING {sheet}: found {len(segs)} bands for {len(zs)} depths")
    return outs


if __name__ == "__main__":
    for arg in sys.argv[2:]:
        sh, var, zl = arg.split(":")
        cut(sys.argv[1], sh, var, [int(z) for z in zl.split(",")])
