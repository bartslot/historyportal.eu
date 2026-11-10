"""Our own matting for library sheets (library/STYLE.md "Matting"), never the model's alpha.

New sheets are painted on #00FF00 and keyed (tools/artkit/green_key.py). Below: the older sheets on white paper.
paper = median of the sheet border; background = paper-coloured pixels (dE < 7) connected to the border;
enclosed paper islands >= 40 px inside an object are cut too (gaps between branches); the edge gets a soft
alpha from distance-to-paper and is un-mixed from the paper colour, so there is no white halo on dark.
A sheet of isolated objects splits into one asset per object (reading order: rows, then left to right);
anchor = ground contact, x = centre of the opaque pixels in the bottom 2 % rows.
Skies stay whole and opaque; a bg strip only loses the white paper above its land.
"""
import sys
from pathlib import Path

import numpy as np
from scipy import ndimage as ndi

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import green_key
from qa import PAPER_DE, to_lab

ISLAND_PX = 40
EDGE_PX = 3.0           # soft alpha ramp width
JOIN_PX = 10            # parts closer than this belong to one object; 10 matched 28 of 33 approved sheets
MIN_SHARE = 0.002       # smaller blobs are specks, dropped


def border_paper(rgb: np.ndarray) -> np.ndarray:
    b = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    return np.median(b, axis=0)


def _paper_like(rgb: np.ndarray, paper: np.ndarray) -> np.ndarray:
    return np.linalg.norm(to_lab(rgb) - to_lab(paper.reshape(1, 3).astype(np.uint8))[0], axis=-1) < PAPER_DE


def alpha_matte(rgb: np.ndarray, paper: np.ndarray, top_only: bool = False, islands: bool = True) -> np.ndarray:
    """0..1 alpha: background paper out, objects in, soft edge. islands=False keeps paper enclosed by an object."""
    like = _paper_like(rgb, paper)
    lab, _ = ndi.label(like)
    edge = lab[0] if top_only else np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.isin(lab, list(set(np.unique(edge)) - {0}))
    if islands and not top_only:
        sizes = ndi.sum(like, lab, index=np.arange(lab.max() + 1))
        bg |= (sizes[lab] >= ISLAND_PX) & like & ~bg      # enclosed islands of paper
    dist = ndi.distance_transform_edt(~bg)
    return np.clip(dist / EDGE_PX, 0, 1)


def unmix(rgb: np.ndarray, alpha: np.ndarray, paper: np.ndarray) -> np.ndarray:
    """Remove the paper colour that the soft edge mixed in: c = (obs - (1-a) * paper) / a."""
    a = np.maximum(alpha[..., None], 1e-3)
    out = (rgb.astype(np.float64) - (1 - a) * paper) / a
    return np.clip(np.where(alpha[..., None] > 0, out, rgb), 0, 255).astype(np.uint8)


def objects(alpha: np.ndarray) -> list[tuple[tuple[slice, slice], np.ndarray]]:
    """(bounding box, own mask inside it) of each separate object, reading order."""
    solid = alpha > 0.1
    joined = ndi.binary_dilation(solid, iterations=JOIN_PX)
    lab, n = ndi.label(joined)
    found = [tight(b, solid[b] & (lab[b] == i)) for i, b in enumerate(ndi.find_objects(lab), 1)]
    boxes = [(b, m) for b, m in found if m.sum() >= MIN_SHARE * solid.size]
    rows = sorted(boxes, key=lambda bm: bm[0][0].start)
    ordered, line = [], []
    for bm in rows:  # same row when the tops are within half the row's first box height
        b, first = bm[0], line[0][0] if line else None
        if first and b[0].start > first[0].start + (first[0].stop - first[0].start) / 2:
            ordered += sorted(line, key=lambda x: x[0][1].start)
            line = []
        line.append(bm)
    return ordered + sorted(line, key=lambda x: x[0][1].start)


def tight(box: tuple[slice, slice], own: np.ndarray) -> tuple[tuple[slice, slice], np.ndarray]:
    """The box shrunk to the object's own paint: the joining margin is not part of it (it floated every piece
    JOIN_PX above its floor line, 2026-11-10). own = the object's solid pixels inside the box."""
    rows, cols = np.where(own.any(axis=1))[0], np.where(own.any(axis=0))[0]
    if not len(rows):
        return box, own
    r0, c0 = box[0].start + rows[0], box[1].start + cols[0]
    b = (slice(r0, box[0].start + rows[-1] + 1), slice(c0, box[1].start + cols[-1] + 1))
    return b, ndi.binary_dilation(own, iterations=2)[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]   # keep the soft rim


def trim_cut_line(piece: np.ndarray, reach: int = 8, dark: float = 90.0) -> np.ndarray:
    """A band's bottom edge is a straight cut, and the model draws that cut as an ink line: drop dark rows at the
    bottom (and dark columns at the ends) so the strip melts into the floor instead of ending on a black rule."""
    def edge(rgba, n):
        k = 0
        while k < n:
            row = rgba[-1 - k]
            on = row[..., 3] > 128
            if not on.any() or row[on, :3].mean() >= dark:
                break
            k += 1
        return k
    bottom = edge(piece, reach)
    piece = piece[:piece.shape[0] - bottom] if bottom else piece
    left = edge(np.flip(piece.transpose(1, 0, 2), 0), reach)     # first columns, read like rows
    right = edge(piece.transpose(1, 0, 2), reach)
    return piece[:, left:piece.shape[1] - right]


def tile_seam(piece: np.ndarray, px: int = 96) -> np.ndarray:
    """Make a strip repeat sideways without a seam: its last `px` columns fade into its first, and are then dropped,
    so the right end of one copy runs on into the left end of the next. Colour and alpha both, the skyline too."""
    w = piece.shape[1]
    px = min(px, w // 4)
    t = np.linspace(0.0, 1.0, px)[None, :, None]
    out = piece[:, :w - px].astype(np.float64)
    out[:, :px] = piece[:, w - px:] * (1 - t) + piece[:, :px] * t
    return np.round(out).astype(np.uint8)


def tile_both(piece: np.ndarray, px: int = 96) -> np.ndarray:
    """A floor tile that repeats both ways: the seam crossfade sideways, then up and down."""
    return tile_seam(tile_seam(piece, px).transpose(1, 0, 2), px).transpose(1, 0, 2)


def anchor(alpha: np.ndarray) -> list[float]:
    solid = alpha > 0.1
    rows = np.where(solid.any(axis=1))[0]
    bot = rows.max()
    foot = solid[max(0, bot - max(2, int(0.02 * alpha.shape[0]))):bot + 1]
    return [round(float(np.where(foot)[1].mean() / alpha.shape[1]), 3), 1.0]


def cut_sheet(rgb: np.ndarray, layer: str) -> list[dict]:
    """[{'rgba': uint8 HxWx4, 'anchor': [x, 1.0]}] one per object (one for sky / bg / ground)."""
    paper = border_paper(rgb)
    if layer in ('sky', 'ground'):
        return [{'rgba': np.dstack([rgb, np.full(rgb.shape[:2], 255, np.uint8)]), 'anchor': [0.5, 1.0], 'paper': paper}]
    if green_key.is_green_sheet(rgb):
        clean, alpha = green_key.key(rgb)
    else:
        alpha = alpha_matte(rgb, paper, top_only=layer == 'bg')
        clean = unmix(rgb, alpha, paper)
    rgba = np.dstack([clean, (alpha * 255).astype(np.uint8)])
    if layer == 'bg':   # the strip from its highest painted row down: the empty sky above it is not part of it
        top = int(np.argmax((alpha > 0.1).any(axis=1)))
        return [{'rgba': rgba[top:], 'anchor': [0.5, 1.0], 'paper': paper}]
    out = []
    for b, own in objects(alpha):
        a = alpha[b] * own
        piece = rgba[b].copy()
        piece[..., 3] = (a * 255).astype(np.uint8)
        if layer in ('band', 'field'):
            piece = trim_cut_line(piece)
            a = piece[..., 3] / 255.0
        out.append({'rgba': piece, 'anchor': anchor(a), 'paper': paper, 'box': (b[1].start, b[0].start, b[1].stop, b[0].stop)})
    return out
