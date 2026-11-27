"""Region maps for a coloured sheet, so a character or horse becomes a programmable entity (bart, 2026-11-27).

`mark` splits a coloured History Lines sheet into named regions (coat, mane, markings, tack...) and saves:
  <out>.png   one flat key colour per region (ink lines black, background white): the bitmap to edit by hand
  <out>.json  the legend: each region's key colour, its painted colour now, its share, and the source sha256
`recolour` then changes one or more regions to a new colour by code, keeping the watercolour texture and the ink.

Plain arithmetic only, nothing generated. The ink lines are the borders: a shape closed by ink that is mostly
one colour takes over small blobs of another colour; paper-white inside the figure is the white markings (blaze, socks).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

import colour

KEYS = ['#E6194B', '#3CB44B', '#4363D8', '#F58231', '#911EB4', '#42D4F4', '#F032E6', '#BFEF45',
        '#FABED4', '#469990', '#DCBEFF', '#9A6324', '#800000', '#AAFFC3', '#808000', '#000075']
LINE, BACKGROUND = 'line', 'background'
BLOB = 0.0002   # of the picture: about 300 px on a 16:9 sheet


def _shift(mask: np.ndarray) -> np.ndarray:
    out = mask.copy()
    out[1:] |= mask[:-1]
    out[:-1] |= mask[1:]
    out[:, 1:] |= mask[:, :-1]
    out[:, :-1] |= mask[:, 1:]
    return out


def components(allowed: np.ndarray) -> np.ndarray:
    """Label 4-connected components of `allowed` (0 = not allowed), by min-label propagation, without scipy."""
    h, w = allowed.shape
    big = h * w + 1
    label = np.where(allowed, np.arange(1, h * w + 1).reshape(h, w), big)
    while True:
        new = label.copy()
        new[1:] = np.minimum(new[1:], label[:-1])
        new[:-1] = np.minimum(new[:-1], label[1:])
        new[:, 1:] = np.minimum(new[:, 1:], label[:, :-1])
        new[:, :-1] = np.minimum(new[:, :-1], label[:, 1:])
        new = np.where(allowed, new, big)
        for _ in range(4):   # pointer jumping: take the label of the pixel your label points at
            flat = new.ravel()
            new = np.where(allowed, flat[np.minimum(new, h * w) - 1], big)
        if (new == label).all():
            break
        label = new
    label = np.where(allowed, label, 0)
    _, dense = np.unique(label, return_inverse=True)
    return dense.reshape(h, w)


def mark(rgb: np.ndarray, palette: dict[str, str], close: int = 2) -> tuple[np.ndarray, list[str]]:
    """Label every pixel: 0 background, 1 line, 2.. the palette names in order. `palette` maps a region name to a
    colour sampled from the sheet; a name whose colour is paper-white takes the white inside the figure."""
    values, ink, paper = colour.masks(rgb)
    names = [BACKGROUND, LINE] + list(palette)
    closed = ink.copy()
    for _ in range(close):
        closed = _shift(closed)
    outside = colour._grow(np.pad(np.zeros((rgb.shape[0] - 2, rgb.shape[1] - 2), bool), 1, constant_values=True),
                           paper & ~closed)
    for _ in range(close + 1):     # give back the paper the closing took from the edge of the background
        outside |= _shift(outside) & paper & ~ink
    figure = ~outside & ~ink
    targets = colour.lab(np.array([colour.hex_rgb(v) for v in palette.values()]))
    distance = np.linalg.norm(values[..., None, :] - targets[None, None], axis=-1)
    label = np.where(figure, 2 + distance.argmin(axis=-1), 0)
    label[ink] = 1
    shapes = components(figure & ~closed)
    counts = np.zeros((shapes.max() + 1, len(names)), dtype=np.int64)
    np.add.at(counts, (shapes[figure], label[figure]), 1)
    # A small blob of one colour (a bloom or a stray touch of paint) joins the main colour of the shape closed by
    # ink around it. Real regions (a mane, a sock, a blaze) are far bigger than a blob.
    best = counts.argmax(axis=1)
    smallest = max(4, int(BLOB * label.size))
    for k in range(2, len(names)):
        blobs = components(figure & (label == k))
        sizes = np.bincount(blobs.ravel())
        small = figure & (label == k) & (sizes[blobs] < smallest) & (shapes > 0)
        label[small] = best[shapes[small]]
    return label, names


def save(label: np.ndarray, names: list[str], rgb: np.ndarray, source: Path, out: Path) -> dict:
    keys = {BACKGROUND: '#FFFFFF', LINE: '#000000'} | {n: KEYS[i % len(KEYS)] for i, n in enumerate(names[2:])}
    picture = np.zeros(rgb.shape, dtype=np.uint8)
    legend = {'source': str(source), 'sha256': __import__('registry').sha256(source), 'regions': {}}
    for i, name in enumerate(names):
        where = label == i
        picture[where] = colour.hex_rgb(keys[name]).astype(np.uint8)
        legend['regions'][name] = {'key': keys[name], 'share': round(100 * float(where.mean()), 2),
                                   'colour': colour.rgb_hex(np.median(rgb[where], axis=0)) if where.any() else None}
    Image.fromarray(picture).save(f'{out}.png')
    Path(f'{out}.json').write_text(json.dumps(legend, indent=2) + '\n')
    preview = np.concatenate([rgb.astype(np.uint8), (0.5 * picture + 0.5 * rgb).astype(np.uint8)], axis=1)
    Image.fromarray(preview).save(f'{out}.preview.png')
    return legend


def stem(path) -> str:
    """A map is named by its stem: x.regions -> x.regions.png, x.regions.json, x.regions.preview.png."""
    text = str(path)
    for end in ('.preview.png', '.png', '.json'):
        if text.endswith(end):
            return text[:-len(end)]
    return text


def read_map(png: Path, legend: dict) -> dict[str, np.ndarray]:
    """The region masks from a key bitmap, which may have been touched up by hand (nearest key colour wins)."""
    picture = np.asarray(Image.open(png).convert('RGB'), dtype=np.float64)
    names = list(legend['regions'])
    keys = np.array([colour.hex_rgb(legend['regions'][n]['key']) for n in names])
    nearest = np.linalg.norm(picture[..., None, :] - keys[None, None], axis=-1).argmin(axis=-1)
    return {n: nearest == i for i, n in enumerate(names)}


def recolour(rgb: np.ndarray, masks: dict[str, np.ndarray], changes: dict[str, str]) -> np.ndarray:
    """Move each named region's paint to a new colour: the region's median shifts to the target in Lab, so washes,
    blooms and the ink lines inside it keep their variation. Ink pixels are never touched."""
    values, ink, _ = colour.masks(rgb)
    out = values.copy()
    for name, target in changes.items():
        where = masks[name] & ~ink
        if not where.any():
            continue
        now = np.median(values[where], axis=0)
        out[where] += colour.lab(colour.hex_rgb(target)) - now
    result = colour.unlab(out)
    untouched = ~np.any([masks[n] for n in changes], axis=0) | ink
    result[untouched] = rgb[untouched]
    return result
