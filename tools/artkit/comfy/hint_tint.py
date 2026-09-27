"""Colour hints from the Blender part mask: each part gets its own colour (wood brown, wall cream, water blue...).

The mask is pixel-aligned with the Blender render, and klein keeps the render's geometry, so the hints land on
the right areas of the ink master.

  hint  - pale flat hint colours under the ink: the input for the Qwen colour pass (M1), which is asked to
          keep each area's hue and turn the flat hints into watercolour
  wash  - no AI (M2): a paper-textured, edge-darkened watercolour wash per part, multiplied with the ink

Part colours come from the shot's camera JSON (`mask_palette_rgb`). Blender's view transform shifts them in
the PNG (wood 255,128,0 is written as 255,188,0), so each pixel takes the nearest part in either form.

usage: python3 hint_tint.py hint|wash <ink.png> <mask.png> <camera.json> -o out.png [--palette street]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# Hint colours per part (sRGB). Muted, historical; one table per place family, `default` fills the gaps.
PALETTES = {
    "default": {"floor": (196, 186, 170), "wall": (238, 224, 196), "opening": (150, 120, 95),
                "furniture": (188, 140, 90), "seat": (180, 130, 80), "props": (196, 120, 80),
                "wood": (170, 120, 75), "roof": (180, 95, 70), "plant": (120, 140, 80),
                "sky": (205, 225, 235), "water": (120, 185, 195)},
    "street": {"floor": (190, 182, 168), "wall": (236, 222, 192)},
    "study": {"floor": (200, 150, 95), "wall": (240, 228, 204), "opening": (110, 80, 60)},
}
HINT_STRENGTH = 0.45    # hint = paper + (colour - paper) * strength: pale enough to read as a hint, not paint
WASH_STRENGTH = 0.75
PAPER = np.array([250, 244, 230], np.float32)


def srgb_shift(c: tuple[int, int, int]) -> tuple[int, ...]:
    """What Blender's standard view transform writes for a linear emission colour (0/255 stay put)."""
    def f(v):
        x = v / 255.0
        y = 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
        return int(round(y * 255))
    return tuple(f(v) for v in c)


def part_map(mask: Image.Image, palette_rgb: dict) -> tuple[np.ndarray, list[str]]:
    names = list(palette_rgb)
    refs = []
    for n in names:
        refs.append((n, np.array(palette_rgb[n], np.float32)))
        refs.append((n, np.array(srgb_shift(tuple(palette_rgb[n])), np.float32)))
    m = np.asarray(mask.convert("RGB"), np.float32)
    d = np.stack([np.abs(m - r).sum(axis=2) for _, r in refs])
    idx = d.argmin(axis=0)
    part = np.array([names.index(refs[i][0]) for i in range(len(refs))])[idx]
    return part, names


def colour_field(part: np.ndarray, names: list[str], family: str) -> np.ndarray:
    pal = {**PALETTES["default"], **PALETTES.get(family, {})}
    lut = np.array([pal.get(n, PALETTES["default"]["wall"]) for n in names], np.float32)
    return lut[part]


def paper_noise(shape: tuple[int, int], seed: int = 7) -> np.ndarray:
    """Low-frequency pigment variation, 0.85-1.15, so a wash isn't a flat fill."""
    rng = np.random.default_rng(seed)
    h, w = shape
    n = Image.fromarray((rng.random((h // 16 + 1, w // 16 + 1)) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    n = np.asarray(n.filter(ImageFilter.GaussianBlur(w / 300)), np.float32) / 255.0
    return 0.85 + 0.3 * n


def build(mode: str, ink: Image.Image, mask: Image.Image, cam: dict, family: str) -> Image.Image:
    part, names = part_map(mask.resize(ink.size, Image.NEAREST), cam["mask_palette_rgb"])
    col = colour_field(part, names, family)
    ink_l = np.asarray(ink.convert("L"), np.float32)[..., None] / 255.0
    if mode == "hint":
        tint = PAPER + (col - PAPER) * HINT_STRENGTH
        return Image.fromarray(np.clip(tint * ink_l, 0, 255).astype(np.uint8))
    # wash: soften region borders (bleed), vary pigment, darken where a wash pools at its edge
    soft = np.asarray(Image.fromarray(col.astype(np.uint8)).filter(ImageFilter.GaussianBlur(ink.width / 900)), np.float32)
    k = WASH_STRENGTH * paper_noise(part.shape)[..., None]
    edge = np.asarray(Image.fromarray((part * 20 % 256).astype(np.uint8)).filter(ImageFilter.FIND_EDGES), np.float32)
    pool = np.asarray(Image.fromarray((edge > 0).astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(ink.width / 700)), np.float32)[..., None] / 255.0
    wash = PAPER + (soft - PAPER) * np.clip(k + 0.35 * pool, 0, 1)
    return Image.fromarray(np.clip(wash * ink_l, 0, 255).astype(np.uint8))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["hint", "wash"])
    ap.add_argument("ink", type=Path)
    ap.add_argument("mask", type=Path)
    ap.add_argument("camera", type=Path)
    ap.add_argument("--palette", default="default")
    ap.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()
    out = build(a.mode, Image.open(a.ink), Image.open(a.mask), json.loads(a.camera.read_text()), a.palette)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    out.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
