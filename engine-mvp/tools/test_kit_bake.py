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


def test_edge_clean_drops_crumbs_along_the_cut_and_keeps_lines_that_cross_it():
    keep = np.zeros((60, 60), bool)
    keep[:, :40] = True                       # the piece keeps the left 40 columns
    ink = np.zeros((60, 60), np.uint8)
    ink[10:12, 37:39] = 255                   # a crumb in the band along the cut
    ink[30:34, 0:40] = 255                    # a line running into the cut
    ink[50:52, 10:12] = 255                   # a small mark well inside the piece
    out = kb.edge_clean(ink, keep)
    assert out[10:12, 37:39].max() == 0
    assert out[30:34, 0:40].min() == 255
    assert out[50:52, 10:12].min() == 255


def test_no_white_gives_a_glint_the_paint_round_it_not_a_stray_pixels():
    fill = np.zeros((20, 20, 4), np.uint8)
    fill[:, :] = key('skin')
    fill[8:11, 8:11] = key('white')            # a nail's glint
    fill[8, 11] = key('apron')                 # one antialiased pixel of a band beside it
    out = kb.no_white(fill)
    assert {tuple(v) for v in out[8:11, 8:11].reshape(-1, 4).tolist()} == {tuple(key('skin'))}


def test_expression_sets_name_each_face_and_eyes_set(monkeypatch):
    monkeypatch.setattr(kb, 'find_or_none', lambda p: p)          # every patch file there
    sets = kb.expression_sets('woman')
    assert sets[('woman-n', None)]['sad'] == 'expressions/woman-sad'                      # the first face keeps its names
    assert sets[('woman-n', 'eyes/woman-round')]['sad'] == 'expressions/woman-round-sad'
    assert sets[('old-woman-n', None)]['sad'] == 'expressions/old-woman-n-sad'
    assert sets[('old-woman-n', 'eyes/woman-hooded')]['amazed'] == 'expressions/old-woman-n_woman-hooded-amazed'
    assert len(sets) == len(kb.BODY_KIT['woman']['faces']) * (1 + len(kb.BODY_KIT['woman']['parts']['eyes']))


def test_a_shawl_over_the_upper_arm_follows_the_arm_and_the_rest_stays_with_the_chest():
    # Ana's map, which the girl borrows, paints a shawl over her far shoulder: Bart 11-16 saw that sleeve tear off
    names = ['chest', 'shawl', 'upperarm_f']
    lab = np.zeros((10, 10), np.uint8)              # chest everywhere
    lab[6:9, 4:7] = 2                               # the arm shows below the shawl
    lab[1:6, 4:7] = 1                               # the shawl covers the top of the arm ...
    lab[1:3, 0:3] = 1                               # ... and lies on the chest away from it
    bone = {'frm': [5.0, 1.0], 'to': [5.0, 8.0]}
    out = kb.arm_under_shawl(lab, names, bone, 'upperarm_f')
    assert (out[1:6, 4:7] == 2).all()
    assert (out[1:3, 0:3] == 1).all()
