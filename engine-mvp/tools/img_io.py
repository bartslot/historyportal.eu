"""WebP out, WebP or PNG in, for the rig and kit tools (Bart 2026-11-13: "please use webp and not the very big .png files").

Every picture a person opens or the app loads is written as .webp with alpha. Two settings:
- WEBP (q90, alpha lossless): the rig atlas and renders. Measured on Ana's atlas: 169 KB against 1,029 KB as PNG, alpha
  identical, edges and ink the same by eye at 4x. The fine paper grain in the washes is mostly smoothed away up close
  (q95 keeps hardly more, at 230 KB; only lossless keeps it, at 594 KB); at stage size it is hard to see.
- LOSSLESS: sheets, maps, masks and parts that a tool reads again (keying, colour names and ink thresholds want the
  exact pixels). Still about 40% smaller than PNG.
`exact` keeps the colour under transparent pixels, so a texture filtered at its edge never darkens.

Inputs may be either: ChatGPT gives PNG, and older folders hold PNG. find() takes the .webp when there is one.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

WEBP = dict(quality=90, method=6, exact=True)
LOSSLESS = dict(lossless=True, quality=100, method=6, exact=True)


def save(img, path, lossless: bool = False) -> Path:
    """Save as .webp next to `path` (whatever its suffix); returns where it went."""
    out = Path(path).with_suffix('.webp')
    pic = img if isinstance(img, Image.Image) else Image.fromarray(np.asarray(img))
    pic.save(out, 'WEBP', **(LOSSLESS if lossless else WEBP))
    return out


def find(path) -> Path:
    """`path` as .webp if that exists, else as .png, else as given (so a missing file is named in the error)."""
    p = Path(path)
    for suffix in ('.webp', '.png'):
        if p.with_suffix(suffix).is_file():
            return p.with_suffix(suffix)
    return p
