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
    prev_stop = 0
    for seg, z in zip(segs, zs):
        bottom = seg.stop
        top = bottom - ph
        lo = max(top, prev_stop + 2)  # never reach into the band above (its ground is not this band's sky)
        prev_stop = bottom
        a = np.zeros((ph, w, 4), np.uint8)
        a[lo - top:, :, :3] = rgb[lo:bottom]
        mm = np.zeros((ph, w), bool)
        mm[lo - top:] = m[lo:bottom]
        # keep only ground that is connected to the band's bottom row: loose marks above the skyline are not ground
        lab2, _ = ndimage.label(mm)
        keep = np.unique(lab2[-1][lab2[-1] > 0])
        mm = np.isin(lab2, keep)
        mm[: ph // 5 + 1] = False  # contract: the top fifth is sky; the tips of the tallest blades are clipped there
        first0 = np.where(mm.any(0), mm.argmax(0), ph)
        if (np.percentile(first0, 95) - np.percentile(first0, 5)) / ph < 0.18:  # flat skyline: carve rolling hills
            x = np.arange(w) / w * 2 * np.pi
            hill = (np.sin(2 * x + 0.7) + 0.6 * np.sin(3 * x + 2.1) + 0.35 * np.sin(5 * x + 4.0)) / 1.95  # periodic in x
            curve = np.percentile(first0, 5) + (hill * 0.5 + 0.5) * 0.34 * ph
            mm &= np.arange(ph)[:, None] >= curve[None, :]
        a[..., 3] = np.where(mm, 255, 0)
        a[..., 3] = ndimage.gaussian_filter(a[..., 3].astype(float), 1.0).clip(0, 255).astype(np.uint8)
        a[a[..., 3] == 0, :3] = 0
        edge = float(np.abs(a[:, 0, :3].astype(int) - a[:, -1, :3].astype(int)).mean())
        opaque = a[..., 3] > 127
        first = np.where(opaque.any(0), opaque.argmax(0), ph)
        top20 = float((~opaque[: ph // 5]).all(0).mean())
        spread = float((np.percentile(first, 95) - np.percentile(first, 5)) / ph)
        f = out_dir / f"ground_band_{z}m.png"
        Image.fromarray(a).save(f)
        print(f"ground_band_{z}m {w}x{ph} skyline mean {first.mean() / ph:.2f} spread {spread:.2f} top20_clear {top20:.3f} edge diff {edge:.1f}")
        mg = Image.new("RGBA", (w, ph), (255, 0, 255, 255)); mg.alpha_composite(Image.fromarray(a))
        mg.convert("RGB").save(out_dir / f"_magenta_{z}m.jpg", quality=85)
        outs.append(f)
    if len(segs) != len(zs):
        print(f"WARNING {sheet}: found {len(segs)} bands for {len(zs)} depths")
    return outs


if __name__ == "__main__":
    for arg in sys.argv[2:]:
        sh, var, zl = arg.split(":")
        cut(sys.argv[1], sh, var, [int(z) for z in zl.split(",")])
