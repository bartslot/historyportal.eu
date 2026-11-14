"""Thin accessory colour areas (a cord, a strap, a band: the kit's 'cord' and 'band' zones, Ana's belt and its cords)
counted as the area they lie on, for that area's edge shade (kit_render.py, flat paint).

A cord across a tunic cuts a slot in the tunic's colour area that opens into the belt, so it is no hole to fill, and the
edge shade took the slot's far side for an outer edge of the tunic: a full-strength grey band down the cord (fresh tester,
11-14). Counted as tunic, the tunic has no edge there. Found by shape, not by name: a piece is thin when little of it
lies further than `core_px` from its own edge.
"""
import numpy as np
from scipy import ndimage

THIN_CORE = 0.2       # a piece is thin when under this share of it lies further than core_px from its edge (Ana's two
#                       cords are one 24 px colour area: 16 % of it lies over 10 px in, the tassels' round ends)
RING_PX = 3           # px round a piece where the area it lies on is read
HOST_SHARE = 0.7      # that area holds at least this share of the ring: the piece lies ON it (a hanging arm beside the
#                       body, half against the air, does not)
MIN_PX = 20           # smaller specks are left alone


def lying_on(kinds: dict[str, np.ndarray], core_px: float) -> dict[str, np.ndarray]:
    """{kind: mask of the thin pieces of OTHER kinds lying on it}, from {kind: coverage 0..1} on one canvas."""
    solid = {k: v > 0.5 for k, v in kinds.items()}
    extra = {k: np.zeros(v.shape, bool) for k, v in solid.items()}
    for kind, mask in solid.items():
        found, n = ndimage.label(mask)
        if not n:
            continue
        ids = np.arange(1, n + 1)
        size = ndimage.sum(mask, found, ids)
        core = ndimage.sum(ndimage.distance_transform_edt(mask) > core_px, found, ids)
        boxes = ndimage.find_objects(found)
        for i in ids[(size >= MIN_PX) & (core < THIN_CORE * size)]:
            sl = tuple(slice(max(0, s.start - RING_PX - 1), s.stop + RING_PX + 1) for s in boxes[i - 1])
            piece = found[sl] == i
            ring = ndimage.binary_dilation(piece, iterations=RING_PX) & ~piece
            share = {k: (m[sl] & ring).sum() for k, m in solid.items() if k != kind}
            host = max(share, key=share.get, default=None)
            if host and share[host] >= HOST_SHARE * ring.sum():
                extra[host][sl] |= ndimage.binary_dilation(piece)   # and its soft rim
    return extra
