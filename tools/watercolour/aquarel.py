"""aquarel.py — one watercolour method for every painted surface (Bart 11-11: "can you create an algorithm for this or a
method so we can apply this to more surfaces?").

A surface starts as a COLOUR FIELD: a float RGB image (0..255) of what the place is, without any paint in it — the
earth's colours from a satellite photo, the sea's colours from its depth, a terrain picture, a sky. The method lays it
on paper as a watercolourist would, in this order (docs/aquarel-method.md explains each step and how to tune it):

  1. wander     soften the field into washes and let their edges wander, so no border is a straight blur
  2. wet_edges  lay it in a few washes; where one wash meets the next the pigment pools into a darker, wandering line
  3. blooms     here and there water ran back into a drying wash: paler inside, a dark rim
  4. reserve    masking to white: flecks and slivers of bare paper the brush never reached (glints, gaps between washes)
  5. granulate  the painted wash's own passes and grain, re-centred on the field's colour (optional: a painted texture)

A RECIPE is the set of numbers for one kind of surface (RECIPES below); `paint(field, recipe, seed)` runs the steps.

  python3 tools/watercolour/aquarel.py in.webp out.webp --recipe terrain [--seed 7] [--texture painted.webp] [--quality 88]

writes WebP (or AVIF for .avif); a .png name is written as .webp next to it (Bart 11-11: PNG is too heavy).

keeps the picture's alpha, so a cut-out stays cut out. Everything is deterministic for a seed.
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

LUMA = np.array([0.3, 0.59, 0.11])

# Sizes in a recipe are pixels at `ref` px wide; a smaller or larger picture scales them, so a recipe looks the same.
RECIPES: dict[str, dict] = {
    # the lesson map's land: broad washes over a continent (z4 tiles, 4096 px across the world)
    'map-land': {'ref': 4096, 'soften': 0, 'warp': 0, 'levels': 7, 'edge': 0.1, 'edge_px': 5,
                 'bloom_share': 0.16, 'bloom_light': 0.07, 'bloom_rim': 0.09, 'bloom_scale': 18,
                 'reserve_share': 0.004, 'reserve_px': 2, 'sliver_share': 0.18},
    # the lesson map's sea: the same, a little more paper left white (glints) and longer slivers along the depth changes
    'map-sea': {'ref': 4096, 'soften': 0, 'warp': 0, 'levels': 7, 'edge': 0.1, 'edge_px': 5,
                'bloom_share': 0.16, 'bloom_light': 0.07, 'bloom_rim': 0.09, 'bloom_scale': 18,
                'reserve_share': 0.008, 'reserve_px': 2, 'sliver_share': 0.3},
    # a finished, inked picture (a 3D scene's terrain, about 2048 px): never blurred or pushed about (that smears the ink),
    # light pooling, soft blooms, white kept only as a few highlights in its light parts
    'terrain': {'ref': 2048, 'soften': 0, 'warp': 0, 'levels': 6, 'edge': 0.05, 'edge_px': 5,
                'bloom_share': 0.1, 'bloom_light': 0.05, 'bloom_rim': 0.03, 'bloom_scale': 10, 'bloom_soft': 8,
                'reserve_share': 0.0006, 'reserve_px': 4, 'sliver_share': 0.06},
    # a sky picture: the same care for its ink, blooms that read as damp paper, the light parts of the clouds kept white
    'sky': {'ref': 2048, 'soften': 0, 'warp': 0, 'levels': 4, 'edge': 0.04, 'edge_px': 8,
            'bloom_share': 0.14, 'bloom_light': 0.06, 'bloom_rim': 0.02, 'bloom_scale': 8, 'bloom_soft': 14,
            'reserve_share': 0.0008, 'reserve_px': 6, 'sliver_share': 0.03},
}


def periodic_noise(n: int, scale: float, seed: int) -> np.ndarray:
    """Smooth noise in 0..1 that tiles (wraps) on both axes; `scale` = how many features across."""
    rng = np.random.default_rng(seed)
    f = np.fft.fft2(rng.standard_normal((n, n)))
    k = np.sqrt(np.add.outer(np.fft.fftfreq(n) ** 2, np.fft.fftfreq(n) ** 2)) * n
    f *= np.exp(-(k / scale) ** 2)
    r = np.real(np.fft.ifft2(f))
    return (r - r.min()) / (r.max() - r.min())


def noise_at(shape: tuple[int, int], scale: float, seed: int) -> np.ndarray:
    """periodic_noise stretched over a picture of `shape` (h, w)."""
    img = Image.fromarray((periodic_noise(512, scale, seed) * 255).astype(np.uint8)).resize((shape[1], shape[0]), Image.BICUBIC)
    return np.asarray(img, float) / 255


def hue_to_rgb(hue: np.ndarray, chroma: np.ndarray, value: np.ndarray) -> np.ndarray:
    """HSV-style rebuild (0..1): hue in degrees, chroma = max - min, value = max."""
    h = (hue % 360) / 60
    x = chroma * (1 - np.abs(h % 2 - 1))
    z = np.zeros_like(h)
    k = np.floor(h).astype(int) % 6
    rgb = np.stack([np.choose(k, [chroma, x, z, z, x, chroma]), np.choose(k, [x, chroma, chroma, x, z, z]), np.choose(k, [z, z, x, chroma, chroma, x])], -1)
    return np.clip(rgb + (value - chroma)[..., None], 0, 1)


def wander(field: np.ndarray, soften_px: float, warp_px: float, seed: int) -> np.ndarray:
    """1. Washes, not a photo: blurred, and their edges pushed about by noise so a border is a painted edge."""
    if soften_px > 0:
        field = ndimage.gaussian_filter(field, sigma=(soften_px, soften_px, 0), mode='wrap')
    if warp_px <= 0:
        return field
    h, w = field.shape[:2]
    wx = noise_at((h, w), 24, seed) - 0.5
    wy = np.roll(wx, h // 3, axis=0)
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    coords = [(yy + wy * warp_px * 2) % h, (xx + wx * warp_px * 2) % w]
    return np.dstack([ndimage.map_coordinates(field[..., c], coords, order=1, mode='wrap') for c in range(3)])


def wet_edges(field: np.ndarray, levels: int, edge: float, edge_px: float, seed: int) -> tuple[np.ndarray, np.ndarray]:
    """2. The field laid in `levels` washes by lightness; pigment pools at each wash's edge. Returns (field, edge lines)."""
    lum = field @ LUMA
    lum = (lum - lum.min()) / (np.ptp(lum) + 1e-6)
    level = np.floor((lum + (noise_at(lum.shape, 30, seed) - 0.5) * 0.12) * levels)
    lines = (level != np.roll(level, 1, 0)) | (level != np.roll(level, 1, 1))
    pooled = np.exp(-ndimage.distance_transform_edt(~lines) / max(1.0, edge_px))
    return field * (1 - edge * pooled)[..., None], lines


def blooms(field: np.ndarray, share: float, light: float, rim_dark: float, scale: float, seed: int, k: float, soft_px: float = 2) -> np.ndarray:
    """3. Backruns: a share of the paper paler inside, darker on the rim."""
    n = noise_at(field.shape[:2], scale, seed)
    bloom = n > np.quantile(n, 1 - share)
    rim = np.exp(-ndimage.distance_transform_edt(bloom) / max(1.0, 2.5 * k)) * ~bloom
    paper = field.reshape(-1, 3).max(axis=0)
    soft = ndimage.gaussian_filter(bloom.astype(float), soft_px * k)
    out = field + (paper - field) * (light * soft)[..., None]
    return out * (1 - rim_dark * rim)[..., None]


def reserve(field: np.ndarray, lines: np.ndarray, share: float, px: float, sliver_share: float, seed: int, paper: np.ndarray) -> np.ndarray:
    """4. Masking to white: bare paper where the masking fluid was — flecks in clusters (as a brush lays the fluid),
    and slivers along some wash edges where two washes did not quite meet."""
    h, w = field.shape[:2]
    fine = noise_at((h, w), 160, seed)
    clusters = noise_at((h, w), 12, seed + 7) > 0.62                    # the fluid goes on in a few strokes, not evenly
    lum = field @ LUMA
    light = lum > np.quantile(lum, 0.55)                                 # masking keeps the light parts light, never a shadow
    flecks = (fine > np.quantile(fine, 1 - share * 4)) & clusters & light
    flecks = ndimage.binary_dilation(flecks, iterations=max(0, int(round(px / 2))))
    gaps = noise_at((h, w), 40, seed + 11) > (1 - sliver_share)
    slivers = ndimage.binary_dilation(lines & gaps & light, iterations=max(1, int(round(px / 3))))
    white = ndimage.gaussian_filter((flecks | slivers).astype(float), 0.7)
    return field + (paper - field) * np.clip(white, 0, 1)[..., None]


def granulate(field: np.ndarray, texture: np.ndarray, contrast: float = 1.0) -> np.ndarray:
    """5. A painted wash's own passes and grain over the field: its variation, not its colour."""
    grain = texture / texture.reshape(-1, texture.shape[-1]).mean(axis=0)
    return field * (1 + (grain - 1) * contrast)


def paint(field: np.ndarray, recipe: dict, seed: int = 1, texture: np.ndarray | None = None, paper: tuple = (252, 247, 236)) -> np.ndarray:
    """The whole method on a colour field (float RGB 0..255, h x w x 3). Returns the same shape and scale."""
    k = field.shape[1] / recipe['ref']
    out = wander(field.astype(float), recipe['soften'] * k, recipe['warp'] * k, seed)
    out, lines = wet_edges(out, recipe['levels'], recipe['edge'], recipe['edge_px'] * k, seed)
    out = blooms(out, recipe['bloom_share'], recipe['bloom_light'], recipe['bloom_rim'], recipe['bloom_scale'], seed + 1, k, recipe.get('bloom_soft', 2))
    out = reserve(out, lines, recipe['reserve_share'], recipe['reserve_px'] * k, recipe['sliver_share'], seed + 2, np.array(paper, float))
    if texture is not None:
        out = granulate(out, texture)
    return np.clip(out, 0, 255)


def main() -> None:
    ap = argparse.ArgumentParser(description='Paint a picture with the History Portal watercolour method.')
    ap.add_argument('src', type=Path)
    ap.add_argument('out', type=Path)
    ap.add_argument('--recipe', default='terrain', choices=sorted(RECIPES))
    ap.add_argument('--seed', type=int, default=1)
    ap.add_argument('--texture', type=Path, help='a painted wash whose grain is laid over (optional)')
    ap.add_argument('--quality', type=int, default=88, help='WebP quality (AVIF is scaled to match)')
    a = ap.parse_args()
    img = Image.open(a.src).convert('RGBA')
    rgba = np.asarray(img, float)
    tex = None
    if a.texture:
        tex = np.asarray(Image.open(a.texture).convert('RGB').resize(img.size, Image.LANCZOS), float)
    rgb = paint(rgba[..., :3], RECIPES[a.recipe], a.seed, tex)
    out = save(Image.fromarray(np.dstack([rgb, rgba[..., 3]]).astype(np.uint8), 'RGBA'), a.out, a.quality)
    print(f'{out}: {a.recipe}, seed {a.seed}, {out.stat().st_size // 1024} KB')


def save(img: Image.Image, path: Path, quality: int = 88) -> Path:
    """WebP (lossy, alpha kept) or AVIF by the file's extension; anything else, PNG included, becomes .webp."""
    ext = path.suffix.lower()
    if ext not in ('.webp', '.avif'):
        path, ext = path.with_suffix('.webp'), '.webp'
    if ext == '.avif':
        img.save(path, quality=quality - 30)        # AVIF's scale runs lower: 58 looks like WebP 88
    else:
        img.save(path, quality=quality, alpha_quality=90, method=6)
    return path


if __name__ == '__main__':
    main()
