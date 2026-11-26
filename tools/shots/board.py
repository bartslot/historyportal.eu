"""Boards: the grid a scene's shots are drawn on together, the layout map from above, and the contact sheets.

All of it is drawn or cut by code. Nothing here asks a model for a picture.
"""
from __future__ import annotations

import math
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from colour import lab

FONT = ImageFont.load_default(18)
GAP = 5               # px of white between cells, as the History Lines grid mode asks


def _text(draw, at, text, fill) -> None:
    plain = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()      # the built-in font has no accents
    draw.text(at, plain, fill=fill, font=FONT)


def cells(width: int, height: int, rows: int, cols: int, gap: int = GAP) -> list[tuple[int, int, int, int]]:
    """Cell boxes (left, top, right, bottom), row by row, for a board with a white gap between cells."""
    cw, ch = (width - gap * (cols - 1)) / cols, (height - gap * (rows - 1)) / rows
    return [(round(c * (cw + gap)), round(r * (ch + gap)), round(c * (cw + gap) + cw), round(r * (ch + gap) + ch))
            for r in range(rows) for c in range(cols)]


def gaps_clean(rgb: np.ndarray, rows: int, cols: int, gap: int = GAP) -> bool:
    """The middle line of every gap is white paper: nothing was drawn across it."""
    height, width = rgb.shape[:2]
    lines = [rgb[:, round(c * width / cols)] for c in range(1, cols)] + [rgb[round(r * height / rows)] for r in range(1, rows)]
    return all(float((lab(line)[..., 0] > 85).mean()) >= 0.995 for line in lines)


def cut(image: Image.Image, rows: int, cols: int, size: tuple[int, int] | None = None, inset: int = 3) -> list[tuple[Image.Image, list[int]]]:
    """The board cut into its cells, a few pixels inside each edge. Lanczos only when a size is asked: no model upscale."""
    out = []
    for left, top, right, bottom in cells(image.width, image.height, rows, cols):
        box = [left + inset, top + inset, right - inset, bottom - inset]
        cell = image.crop(box)
        out.append((cell.resize(size, Image.LANCZOS) if size else cell, box))
    return out


def layout_map(scene: dict, board: dict | None = None, width: int = 1600) -> Image.Image:
    """The scene from above: landmarks at their true distance, who goes where, the light, and each shot's camera."""
    layout = scene['layout']
    world_w, world_h = layout['size']
    pad, scale = 90, (width - 180) / world_w
    image = Image.new('RGB', (width, round(world_h * scale) + 2 * pad), 'white')
    draw = ImageDraw.Draw(image)

    def at(point) -> tuple[float, float]:
        return pad + point[0] * scale, pad + (world_h - point[1]) * scale      # y runs north, so up on the page

    draw.rectangle([pad, pad, width - pad, image.height - pad], outline='#999999')
    _text(draw, (pad, 30), f'{scene.get("title", scene["scene"])}: layout from above, {world_w} x {world_h} m. '
                         f'Light: {layout.get("light", "not set")}', fill='black')
    for mark in layout['landmarks']:
        x, y = at(mark['at'])
        r = max(6, mark.get('size', 0) * scale / 2)
        draw.rectangle([x - r, y - r, x + r, y + r], outline='black', width=2)
        _text(draw, (x - r, y + r + 6), mark['label'], fill='black')
    for route in layout.get('routes', []):
        points = [at(p) for p in route['points']]
        draw.line(points, fill='#B4502D', width=3)
        _arrow(draw, points[-2], points[-1], '#B4502D')
        _text(draw, (points[0][0] + 6, points[0][1] - 28), route.get('label', ', '.join(route.get('who', []))), fill='#B4502D')
    for cell in (board or {}).get('cells', []):
        camera = cell.get('camera')
        if not camera:
            continue
        x, y = at(camera['at'])
        draw.ellipse([x - 7, y - 7, x + 7, y + 7], fill='#2D5FA0')
        _text(draw, (x + 10, y + 6), f'shot {cell["shot"]}', fill='#2D5FA0')
        _arrow(draw, (x, y), _toward((x, y), at(camera['looks_at']), 60), '#2D5FA0')
    return image


def _toward(start, end, length):
    dx, dy = end[0] - start[0], end[1] - start[1]
    d = math.hypot(dx, dy) or 1
    return start[0] + dx / d * length, start[1] + dy / d * length


def _arrow(draw, start, end, fill) -> None:
    draw.line([start, end], fill=fill, width=2)
    angle = math.atan2(end[1] - start[1], end[0] - start[0])
    for turn in (2.6, -2.6):
        draw.line([end, (end[0] + 12 * math.cos(angle + turn), end[1] + 12 * math.sin(angle + turn))], fill=fill, width=2)


def contact_sheet(items: list[tuple[str, Path | Image.Image]], thumb: int = 420, per_row: int = 4) -> Image.Image:
    """Pictures side by side with a label under each: what goes into a request, or a shot beside its sheet."""
    rows = math.ceil(len(items) / per_row)
    sheet = Image.new('RGB', (per_row * (thumb + 20) + 20, rows * (thumb + 60) + 20), 'white')
    draw = ImageDraw.Draw(sheet)
    for i, (label, source) in enumerate(items):
        picture = (source if isinstance(source, Image.Image) else Image.open(source)).convert('RGB')
        picture.thumbnail((thumb, thumb), Image.LANCZOS)
        x, y = 20 + (i % per_row) * (thumb + 20), 20 + (i // per_row) * (thumb + 60)
        sheet.paste(picture, (x, y))
        draw.rectangle([x, y, x + picture.width - 1, y + picture.height - 1], outline='#BBBBBB')
        for n, line in enumerate(label.split('\n')[:3]):
            _text(draw, (x, y + thumb + 2 + 19 * n), line, fill='black')
    return sheet


def swatches(rows: list[tuple[str, str, str | None]], cell: int = 60) -> Image.Image:
    """Fixed colour beside the colour that came out, one row per garment."""
    image = Image.new('RGB', (cell * 2 + 620, max(1, len(rows)) * (cell + 8) + 8), 'white')
    draw = ImageDraw.Draw(image)
    for i, (label, target, found) in enumerate(rows):
        y = 8 + i * (cell + 8)
        draw.rectangle([8, y, 8 + cell, y + cell], fill=target, outline='black')
        if found:
            draw.rectangle([8 + cell, y, 8 + 2 * cell, y + cell], fill=found, outline='black')
        _text(draw, (24 + 2 * cell, y + cell // 2 - 10), f'{label}: fixed {target}, came out {found or "not found"}', fill='black')
    return image
