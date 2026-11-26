"""Colour and ink measurements on a picture: plain arithmetic, nothing generated.

Everything works on float RGB arrays (H, W, 3) in 0..255 and CIE Lab (D65). Distances are Delta E 1976: crude,
and good enough to tell a red cloak from a brown one.
"""
from __future__ import annotations

import numpy as np
from PIL import Image

INK_L = 35.0          # darker than this is ink
PAPER_L = 88.0        # lighter than this and nearly grey is bare paper
PAPER_CHROMA = 8.0
NEAR = 25.0           # a pixel within this Delta E of a palette colour belongs to that garment
SAME = 12.0           # two colours closer than this read as the same colour

_M = np.array([[0.4124564, 0.3575761, 0.1804375],
               [0.2126729, 0.7151522, 0.0721750],
               [0.0193339, 0.1191920, 0.9503041]])
_WHITE = np.array([0.95047, 1.0, 1.08883])


def load(path) -> np.ndarray:
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)


def hex_rgb(value: str) -> np.ndarray:
    value = value.lstrip('#')
    return np.array([int(value[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


def rgb_hex(rgb) -> str:
    return '#' + ''.join(f'{int(round(float(c))):02X}' for c in rgb)


def lab(rgb: np.ndarray) -> np.ndarray:
    c = np.asarray(rgb, dtype=np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    xyz = (c @ _M.T) / _WHITE
    f = np.where(xyz > 216 / 24389, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def unlab(values: np.ndarray) -> np.ndarray:
    fy = (values[..., 0] + 16) / 116
    f = np.stack([fy + values[..., 1] / 500, fy, fy - values[..., 2] / 200], axis=-1)
    xyz = np.where(f ** 3 > 216 / 24389, f ** 3, (116 * f - 16) * 27 / 24389) * _WHITE
    c = np.clip(xyz @ np.linalg.inv(_M).T, 0, 1)
    return np.where(c > 0.0031308, 1.055 * c ** (1 / 2.4) - 0.055, 12.92 * c) * 255.0


def delta(a, b) -> float:
    return float(np.linalg.norm(lab(np.asarray(a)) - lab(np.asarray(b))))


def masks(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(Lab, ink mask, paper mask) of a picture."""
    values = lab(rgb)
    chroma = np.hypot(values[..., 1], values[..., 2])
    return values, values[..., 0] < INK_L, (values[..., 0] > PAPER_L) & (chroma < PAPER_CHROMA)


def coverage(rgb: np.ndarray) -> dict[str, float]:
    """Share of the picture that is ink and that is bare paper, in percent."""
    _, ink, paper = masks(rgb)
    return {'ink': round(100 * float(ink.mean()), 1), 'paper': round(100 * float(paper.mean()), 1)}


def grey_shading(rgb: np.ndarray) -> float:
    """Percent of the picture that is grey tone away from any line: wash, smudge or soft shading. The soft edge of
    an ink line (anti-aliasing) does not count; only grey more than two pixels from ink does."""
    values, ink, _ = masks(rgb)
    chroma = np.hypot(values[..., 1], values[..., 2])
    grey = (values[..., 0] >= 40) & (values[..., 0] <= 85) & (chroma < PAPER_CHROMA)
    near = ink.copy()
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            near |= np.roll(np.roll(ink, dy, 0), dx, 1)
    return round(100 * float((grey & ~near).mean()), 2)


def find(rgb: np.ndarray, target_hex: str) -> dict:
    """How the paint nearest `target_hex` reads in this picture: its median colour, how far off, how much there is."""
    values, ink, paper = masks(rgb)
    paint = ~ink & ~paper
    target = lab(hex_rgb(target_hex))
    near = paint & (np.linalg.norm(values - target, axis=-1) < NEAR)
    share = 100 * float(near.sum()) / max(1, int(paint.sum()))
    if near.sum() < 20:
        return {'target': target_hex, 'found': None, 'delta': None, 'share': round(share, 2)}
    median = np.median(values[near], axis=0)
    return {'target': target_hex, 'found': rgb_hex(unlab(median)), 'delta': round(float(np.linalg.norm(median - target)), 1),
            'share': round(share, 2)}


def is_paper(value: str) -> bool:
    """A colour that reads as bare paper: a white garment on a white sheet."""
    return bool(masks(hex_rgb(value)[None, None])[2].item())


def sample(rgb: np.ndarray) -> str | None:
    """The main paint colour in a swatch box cut from an approved sheet (ink and paper left out). A box that is mostly
    paper-white is a white garment: its colour is the white itself, not the grey of its shadow folds."""
    values, ink, paper = masks(rgb)
    if paper.sum() > 2 * (~ink & ~paper).sum():
        return rgb_hex(unlab(np.median(values[paper], axis=0)))
    paint = values[~ink & ~paper]
    if len(paint) < 20:
        return None
    middle = np.median(paint, axis=0)
    core = paint[np.linalg.norm(paint - middle, axis=-1) < NEAR]
    return rgb_hex(unlab(np.median(core if len(core) else paint, axis=0)))


def ink_kept(ink_rgb: np.ndarray, colour_rgb: np.ndarray, width: int = 512) -> float:
    """Share of the pass 1 ink that is still ink, in the same place, after pass 2 (1.0 = every mark kept)."""
    def dark(rgb: np.ndarray) -> np.ndarray:
        h = max(1, round(width * rgb.shape[0] / rgb.shape[1]))
        small = np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize((width, h), Image.LANCZOS), dtype=np.float64)
        return lab(small)[..., 0] < 50
    a, b = dark(ink_rgb), dark(colour_rgb)
    if a.shape != b.shape:
        return 0.0
    grown = b.copy()
    for dy in (-2, -1, 0, 1, 2):          # a mark may move a pixel or two; more than that is a redraw
        for dx in (-2, -1, 0, 1, 2):
            grown |= np.roll(np.roll(b, dy, 0), dx, 1)
    return float((a & grown).sum()) / max(1, int(a.sum()))

