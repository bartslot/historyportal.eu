"""Anything that needs transparency is painted on solid #00FF00 and keyed out (Bart 2026-11-05). One key for every cutter.

The ink pass stays on white paper: it is a drawing to colour, never cut. The colour pass asks for GREEN_BACKGROUND.
key() removes the background and the green spill. Sheets painted on white before this rule still go through their old cut.
"""
import numpy as np
from scipy import ndimage as ndi

GREEN_BACKGROUND = ('Put the subject on a solid, flat, pure #00FF00 green background that fills every part of the picture '
                    'around it, including every gap between arms and body, hair strands, branches and leaves: no shadow on '
                    'it, no gradient, no texture, no paper, no white border around the subject, and no green anywhere in '
                    'the subject itself. Paint olive and sap greens as muted natural colours, never pure green.')
KEY_EDGE, KEY_FULL = 40, 140   # how much greener than red and blue: the key's edge begins, and is all background
TINT, TINT_REACH = 6, 3        # green leading by this much, too faint to key: figure mixed with background; px painted over
TINT_PAINT_PX = 40             # a green-leaning pocket this big, away from the background, is paint
INK_LUM = 90                   # darker than this is a drawn line
SOLID = 0.5                    # this opaque counts as painted
GREEN_SHEET = 60               # the border's median this close to #00FF00: a green sheet


def is_green_sheet(rgb: np.ndarray) -> bool:
    b = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(float)
    return bool(np.linalg.norm(np.median(b, axis=0) - (0, 255, 0)) < GREEN_SHEET)


def _clean_around(c: np.ndarray, clean: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(mean colour, count) of the clean pixels among each pixel's 8 neighbours."""
    kernel = np.array([[1, 1, 1], [1, 0, 1], [1, 1, 1]])
    count = ndi.convolve(clean.astype(np.float64), kernel, mode='constant')
    total = np.dstack([ndi.convolve(c[..., i] * clean, kernel, mode='constant') for i in range(3)])
    return total / np.maximum(count[..., None], 1), count


def key(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(clean uint8 rgb, alpha 0..1). Same numbers and logic as FitEditedPicture::paintOverTint and chatgpt_mcp.key_green:
    a pixel part figure, part green keeps the key's see-through but takes its colour from the clean pixels around it,
    because taking the green off alone leaves olive and yellow. What has no clean neighbour only gets its green capped."""
    c = rgb.astype(np.float64)
    top = np.maximum(c[..., 0], c[..., 2])
    spill = c[..., 1] - top
    alpha = 1 - np.clip((spill - KEY_EDGE) / (KEY_FULL - KEY_EDGE), 0, 1)
    c[..., 1] = np.where(spill > KEY_EDGE, top, c[..., 1])
    faint = (alpha >= 1) & (spill >= TINT)
    pockets, n = ndi.label(faint)
    if n:   # a big pocket away from the background is painted leaf, not fringe; the band next to the background always is
        sizes = ndi.sum(faint, pockets, np.arange(1, n + 1))
        faint &= np.isin(pockets, np.flatnonzero(sizes < TINT_PAINT_PX) + 1) | (ndi.distance_transform_edt(alpha >= 1) <= TINT_REACH)
    tinted = (alpha > 0) & ((alpha < 1) | faint)
    ink = c @ np.array([0.299, 0.587, 0.114]) < INK_LUM   # a dark line keeps its place: repainted, thin lines vanish into the leaf
    line = tinted & ink
    c[..., 1] = np.where(line, np.minimum(c[..., 1], np.maximum(c[..., 0], c[..., 2])), c[..., 1])
    tinted &= ~ink
    for _ in range(TINT_REACH):
        mean, count = _clean_around(c, ~tinted & (alpha >= SOLID))
        paint = tinted & (count > 0)
        if not paint.any():
            break
        c[paint] = mean[paint]
        c[..., 1] = np.where(paint, np.minimum(c[..., 1], np.maximum(c[..., 0], c[..., 2])), c[..., 1])
        tinted &= ~paint
    c[..., 1] = np.where(tinted, np.minimum(c[..., 1], np.maximum(c[..., 0], c[..., 2])), c[..., 1])
    return c.round().astype(np.uint8), alpha
