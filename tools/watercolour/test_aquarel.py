"""python3 -m pytest tools/watercolour/test_aquarel.py — the method keeps size and scale, is deterministic, and every step shows."""
import numpy as np

import aquarel


def field() -> np.ndarray:
    y, x = np.mgrid[0:256, 0:256]
    return np.dstack([60 + x * 0.6, 120 + y * 0.4, np.full(x.shape, 70.0)])   # a green-to-ochre ramp


def test_paint_keeps_shape_and_scale_and_is_deterministic():
    a = aquarel.paint(field(), aquarel.RECIPES['terrain'], seed=3)
    b = aquarel.paint(field(), aquarel.RECIPES['terrain'], seed=3)
    assert a.shape == (256, 256, 3) and a.min() >= 0 and a.max() <= 255
    assert np.array_equal(a, b)


def test_wet_edges_darken_and_blooms_lighten():
    f = field()
    pooled, lines = aquarel.wet_edges(f, 6, 0.1, 3, seed=1)
    assert lines.any() and (pooled <= f + 1e-9).all() and (pooled < f - 1e-6).any()
    bloomed = aquarel.blooms(f, 0.2, 0.1, 0.0, 10, seed=2, k=1)
    assert (bloomed > f + 1e-6).any()


def test_reserve_leaves_some_paper_white():
    f = field()
    _, lines = aquarel.wet_edges(f, 6, 0.1, 3, seed=1)
    paper = np.array([252.0, 247.0, 236.0])
    out = aquarel.reserve(f, lines, 0.01, 2, 0.4, seed=5, paper=paper)
    near_white = (np.abs(out - paper).max(axis=-1) < 8).mean()
    assert 0 < near_white < 0.2
