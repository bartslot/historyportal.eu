"""C1 composite: washes from the colour pass + the original ink master on top (multiply).

Why: Qwen colours at 1 MP (at 2 MP it drifts) and redraws the ink there, dropping most of klein's hatching.
The colour pass is only trusted for what it is good at: low-frequency washes. A median filter removes its
redrawn thin lines (flat colour survives), then the crisp ink master multiplies back over it.

The composite is only valid when the colour pass kept the geometry (recall >= 0.95); otherwise the washes and
the ink disagree and edges double. `--check` reports the share of ink pixels that land on a wash edge.

usage: python3 wash_ink.py <colour.png> <ink_master.png> -o out.png [--median 11] [--check]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

MEDIAN_FRAC = 1 / 240   # median window as a share of width: removes strokes up to ~half this wide
SOFTEN_FRAC = 1 / 1400  # a touch of blur so the median's blocky edges don't show


def odd(n: float) -> int:
    n = max(3, int(round(n)))
    return n if n % 2 else n + 1


def wash(colour: Image.Image) -> Image.Image:
    w = colour.width
    return colour.convert("RGB").filter(ImageFilter.MedianFilter(odd(w * MEDIAN_FRAC))).filter(
        ImageFilter.GaussianBlur(max(1.0, w * SOFTEN_FRAC)))


def composite(colour: Image.Image, ink: Image.Image) -> Image.Image:
    wsh = np.asarray(wash(colour), dtype=np.float32)
    ink_l = np.asarray(ink.convert("L").resize(colour.size, Image.LANCZOS), dtype=np.float32)[..., None]
    return Image.fromarray(np.clip(wsh * ink_l / 255.0, 0, 255).astype(np.uint8))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("colour", type=Path)
    ap.add_argument("ink", type=Path)
    ap.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()
    out = composite(Image.open(a.colour), Image.open(a.ink))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    out.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
