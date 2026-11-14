"""WebP out, WebP or PNG in, for the rig and kit tools (Bart 2026-11-13: "please use webp and not the very big .png files").

Every picture a person opens or the app loads is written as .webp with alpha. Two settings:
- WEBP (q30, alpha lossless): the rig atlas and renders. Bart 11-14: "paper grain is not important. aquarel texture is
  ... make it even smaller", then, off the q90..q10 ladder (BartsMedia topics/character-bones/webp-ladder/
  ladder-board.webp): "Q70 is too big. i can barely tell the difference at 30/40 with a human eye so use Q30".
  q20 and below block the brows, ring round the ink and blotch the washes. The alpha stays lossless at every q, so
  edges and holes never move.
  Under the alpha the colour is filled EDGE_BAND px out with the nearest opaque colour: lossy chroma blended the black
  there into the outermost opaque pixel and greyed every cut edge (tester 11-14: saturation -12 there; -2.5 with the
  band, for 106 KB instead of 97).
- LOSSLESS: sheets, maps, masks and parts that a tool reads again (keying, colour names and ink thresholds want the
  exact pixels). Still about 40% smaller than PNG.
`exact` keeps the colour under transparent pixels, so a texture filtered at its edge never darkens.

Inputs may be either: ChatGPT gives PNG, and older folders hold PNG. find() takes the .webp when there is one.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

WEBP = dict(quality=30, alpha_quality=100, method=6, exact=True)
EDGE_BAND = 4             # px of edge colour under the transparent side of every alpha edge (lossy saves only)
LOSSLESS = dict(lossless=True, quality=100, method=6, exact=True)


def save(img, path, lossless: bool = False) -> Path:
    """Save as .webp next to `path` (whatever its suffix); returns where it went."""
    out = Path(path).with_suffix('.webp')
    pic = img if isinstance(img, Image.Image) else Image.fromarray(np.asarray(img))
    if not lossless and pic.mode == 'RGBA':
        pic = Image.fromarray(edge_bleed(np.asarray(pic)))
    pic.save(out, 'WEBP', **(LOSSLESS if lossless else WEBP))
    return out


def edge_bleed(rgba: np.ndarray, band: int = EDGE_BAND) -> np.ndarray:
    """The colour under transparent pixels within `band` px of the figure set to the nearest opaque colour; alpha as it is."""
    opaque = rgba[..., 3] > 0
    if opaque.all() or not opaque.any():
        return rgba
    dist, (iy, ix) = ndimage.distance_transform_edt(~opaque, return_indices=True)
    fill = ~opaque & (dist <= band)
    out = rgba.copy()
    out[..., :3][fill] = rgba[..., :3][iy[fill], ix[fill]]
    return out


def find(path) -> Path:
    """`path` as .webp if that exists, else as .png, else as given (so a missing file is named in the error)."""
    p = Path(path)
    for suffix in ('.webp', '.png'):
        if p.with_suffix(suffix).is_file():
            return p.with_suffix(suffix)
    return p
