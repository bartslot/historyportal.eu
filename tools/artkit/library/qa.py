"""Gates that keep every library sheet in the history-lines-v1 look (library/STYLE.md). Pure numpy, no model.

- ink coverage: share of pixels with L* < 40. The prompt asks Bart's "10 to 14%" of the whole drawing; the gate
  measures what that gave on the 54 approved sheets (11-04): inside the objects' silhouettes 22-38 % (prop, fg,
  mid), whole sheet 2.4-5.8 % (bg strips) and 4-11 % (grounds); skies exempt. Bands are those plus a margin:
  below = "too much of nothing" (Bart 10-20), above = engraving-dense;
- palette: mean dE76 of the washed pixels (not ink, not paper) to the nearest era colour; approved art 6-11, gate 16;
- ink kept: correlation of the blurred line maps of the ink sheet and the colour sheet (are the lines still in
  the same places). Pixel-exact matching is useless here: approved sheets kept 0.25-0.88 of their exact ink
  pixels. Approved object sheets correlate 0.51-0.83, a held redraw 0.47: gate 0.50 for prop/fg/mid. Skies, bg
  strips and grounds are not gated (their washes are as dark as the ink); the judge decides those.
"""
import numpy as np

INK_L = 40.0
INK_BAND = {'sky': None, 'bg': (0.015, 0.08), 'ground': (0.03, 0.14), 'band': (0.04, 0.35), 'cloud': (0.02, 0.25)}   # band: open water is mostly wash
INK_BAND_DEFAULT = (0.18, 0.42)   # inside the silhouettes
PALETTE_GATE = 16.0
INK_KEPT_GATE = 0.50
INK_KEPT_LAYERS = ('prop', 'fg', 'mid')
LINE_SIGMA = 4
PAPER_DE = 7.0


def to_lab(rgb: np.ndarray) -> np.ndarray:
    """sRGB uint8 (..., 3) -> CIE L*a*b* (D65)."""
    c = rgb.astype(np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def hex_lab(hexes: list[str]) -> np.ndarray:
    rgb = np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in hexes], dtype=np.uint8)
    return to_lab(rgb)


def ink_mask(rgb: np.ndarray) -> np.ndarray:
    return to_lab(rgb)[..., 0] < INK_L


def ink_coverage(rgb: np.ndarray, inside: np.ndarray | None = None) -> float:
    ink = ink_mask(rgb)
    if inside is not None:
        return float(ink[inside].mean()) if inside.any() else 0.0
    return float(ink.mean())


def paper_mask(rgb: np.ndarray, paper: np.ndarray) -> np.ndarray:
    return np.linalg.norm(to_lab(rgb) - to_lab(paper.reshape(1, 3).astype(np.uint8))[0], axis=-1) < PAPER_DE


def palette_de(rgb: np.ndarray, hexes: list[str], paper: np.ndarray) -> float:
    """Mean distance of the washed pixels to the nearest palette colour (lower = closer to the era palette)."""
    lab = to_lab(rgb)
    washed = (lab[..., 0] >= INK_L) & ~paper_mask(rgb, paper)
    px = lab[washed]
    if not len(px):
        return 0.0
    px = px[:: max(1, len(px) // 200_000)]
    d = np.linalg.norm(px[:, None, :] - hex_lab(hexes)[None, :, :], axis=-1).min(axis=1)
    return float(d.mean())


def ink_kept(ink_rgb: np.ndarray, colour_rgb: np.ndarray) -> float:
    """Correlation of the blurred line maps: 1 = same drawing, near 0 = redrawn."""
    from scipy import ndimage as ndi
    if ink_rgb.shape != colour_rgb.shape:
        from PIL import Image
        colour_rgb = np.array(Image.fromarray(colour_rgb).resize(ink_rgb.shape[1::-1], Image.LANCZOS))
    a = ndi.gaussian_filter(ink_mask(ink_rgb).astype(float), LINE_SIGMA)
    b = ndi.gaussian_filter((to_lab(colour_rgb)[..., 0] < INK_L + 15).astype(float), LINE_SIGMA)
    a, b = a - a.mean(), b - b.mean()
    den = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / den) if den else 0.0


def ink_kept_ok(layer: str, kept: float) -> bool:
    return layer not in INK_KEPT_LAYERS or kept >= INK_KEPT_GATE


def ink_band(layer: str) -> tuple[float, float] | None:
    return INK_BAND.get(layer, INK_BAND_DEFAULT)


def ink_ok(layer: str, coverage: float) -> bool:
    band = ink_band(layer)
    return band is None or band[0] <= coverage <= band[1]
