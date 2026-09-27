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

MEDIAN_FRAC = 1 / 320   # median window as a share of width: removes strokes up to ~half this wide
ATMOS = 0.45            # washes this far toward paper at FAR_M


def odd(n: float) -> int:
    n = max(3, int(round(n)))
    return n if n % 2 else n + 1


def wash(colour: Image.Image) -> Image.Image:
    """Median only: removes the colour pass's own thin lines, keeps colour edges where they are (no bleed)."""
    return colour.convert("RGB").filter(ImageFilter.MedianFilter(odd(colour.width * MEDIAN_FRAC)))


def composite(colour: Image.Image, ink: Image.Image, far: np.ndarray | None = None, atmos: float = ATMOS) -> Image.Image:
    """Output at the INK's size (the ink carries the detail; washes are soft anyway, so they are the ones resized).
    `far` (0 near .. 1 far, ink-sized) fades the washes toward paper for aerial perspective: a blend, never a blur.
    Fade the ink itself separately (depth_lines.adjust on the black-and-white ink) so lines get lighter, not softer."""
    wsh = np.asarray(wash(colour).resize(ink.size, Image.BICUBIC), dtype=np.float32)
    if far is not None:
        paper = np.percentile(wsh.reshape(-1, 3), 97, axis=0)
        wsh = wsh + (paper - wsh) * (atmos * far)[..., None]
    ink_l = np.asarray(ink.convert("L"), dtype=np.float32)[..., None]
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
