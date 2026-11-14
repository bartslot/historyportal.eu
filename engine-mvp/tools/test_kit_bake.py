"""kit_bake.py: blends between key colours never become a third kind; a piece names only the kinds it really shows."""
import numpy as np
import pytest

kb = pytest.importorskip('kit_bake', reason='needs the kit folder (kit_presets reads it on import)')


def key(kind):
    i = kb.KINDS.index(kind)
    return [10 + 18 * i, 250 - 18 * i, 128, 255]


def test_snap_turns_a_blend_into_the_nearest_pure_kind():
    skin, hair = key('skin'), key('hair')
    fill = np.array([[skin, skin, [(skin[0] + hair[0]) // 2, (skin[1] + hair[1]) // 2, 128, 255], hair, hair]], np.uint8)
    out = kb.snap(fill)
    reds = sorted(set(out[0, :, 0].tolist()))
    assert reds == sorted({skin[0], hair[0]}), 'no third kind'
    assert (out[..., 3] == 255).all()


def test_snap_keeps_air_as_air_and_alpha_as_rendered():
    fill = np.array([[key('tunic'), [0, 0, 0, 0], [*key('tunic')[:3], 90]]], np.uint8)
    out = kb.snap(fill)
    assert out[0, 1].tolist() == [0, 0, 0, 0]
    assert out[0, 2, 3] == 90


def test_kinds_in_ignores_a_few_stray_pixels():
    fill = np.zeros((40, 40, 4), np.uint8)
    fill[:, :] = key('tunic')
    fill[0, 0] = key('apron')
    assert kb.kinds_in(fill, np.ones((40, 40), bool)) == ['tunic']
