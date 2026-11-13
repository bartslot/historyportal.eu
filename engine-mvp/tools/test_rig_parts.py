#!/usr/bin/env python3
"""Run: python3 engine-mvp/tools/test_rig_parts.py  (also collected by pytest)"""
import numpy as np
import pytest

import rig_check as rc
import rig_parts as rp

H, W = 200, 160


def own_with(**boxes):
    """An owner map: each part a box (y0, y1, x0, x1)."""
    own = np.full((H, W), -1)
    for part, (y0, y1, x0, x1) in boxes.items():
        own[y0:y1, x0:x1] = rp.PARTS.index(part)
    return own


def feet(toe_dx):
    """Two shins with a foot each, the feet reaching toe_dx px past the ankle (negative: to the left)."""
    boxes = {'shin_n': (100, 160, 40, 56), 'shin_f': (100, 160, 90, 106)}
    for part, x in (('foot_n', 40), ('foot_f', 90)):
        x0, x1 = (x, x + 16 + toe_dx) if toe_dx > 0 else (x + toe_dx, x + 16)
        boxes[part] = (160, 172, x0, x1)
    own = own_with(**boxes)
    joints = {'foot_n': (np.array([48.0, 160.0]), 16.0), 'foot_f': (np.array([98.0, 160.0]), 16.0)}
    return own, joints


def test_the_figure_faces_where_its_toes_point():
    assert rp.facing_of_feet(*feet(30)) == 1
    assert rp.facing_of_feet(*feet(-30)) == -1


def test_feet_that_disagree_stop_the_cut():
    own, joints = feet(30)
    own[160:172, :] = np.where(own[160:172, :] == rp.PARTS.index('foot_f'), -1, own[160:172, :])
    own[160:172, 60:106] = np.where(np.arange(60, 106) < 98, rp.PARTS.index('foot_f'), -1)   # the far foot points left
    with pytest.raises(SystemExit):
        rp.facing_of_feet(own, joints)


def test_the_shin_above_the_knee_is_thigh():
    labels = np.full((H, W), -1)
    labels[100:160, 40:56] = rc.MAP_PARTS.index('shin_n')       # the map's shin starts at the hem
    labels_b = np.full((H, W), -1)
    labels_b[60:120, 40:56] = rc.MAP_B_PARTS.index('thigh_n')   # map-b's knee is at row 120
    own = rp.owners(labels, labels_b)
    assert (own[100:120, 40:56] == rp.PARTS.index('thigh_n')).all()
    assert (own[120:160, 40:56] == rp.PARTS.index('shin_n')).all()


def test_the_chest_below_the_shawl_is_the_belt():
    own = own_with(chest=(20, 60, 40, 120), shawl=(60, 70, 40, 120))
    own[70:80, 40:120] = rp.PARTS.index('chest')               # the belt, cut off from the chest by the shawl
    out = rp.split_belt(own)
    assert (out[70:80, 40:120] == rp.PARTS.index('belt')).all() and (out[20:60, 40:120] == rp.PARTS.index('chest')).all()


def limb():
    """A thigh over a shin, both 20 px wide, the knee at (80, 100); layers back to front: shin, thigh."""
    rgba = lambda y0, y1: np.pad(np.full((y1 - y0, 20, 4), (200, 150, 120, 255), np.uint8), ((y0, H - y1), (70, W - 90), (0, 0)))
    own = own_with(thigh_n=(40, 100, 70, 90), shin_n=(100, 170, 70, 90))
    joints = {'shin_n': (np.array([80.0, 100.0]), 20.0)}
    return [('shin_n', 'shin_n', rgba(100, 170)), ('thigh_n', 'thigh_n', rgba(40, 100))], own, joints


def test_a_folded_knee_opens_a_hole_without_the_parents_round_end():
    layers, own, joints = limb()
    assert rp.holes_bending(layers, joints, 'shin_n', 1) > rp.HOLE_PX


def test_the_parents_round_end_closes_it_and_leaves_rest_alone():
    layers, own, joints = limb()
    capped = rp.parent_caps(layers, own, joints)
    assert rp.holes_bending(capped, joints, 'shin_n', 1) <= rp.HOLE_PX
    assert (rp.compose(capped) == rp.compose(layers)).all(), 'at rest it is still the drawing'


def test_a_posed_shin_folds_round_its_knee():
    layers, own, joints = limb()
    everything = {b: (np.array([80.0, 100.0]), 20.0) for b in rp.PARENT}
    everything.update(joints)
    img = rp.posed(layers, everything, {'shin_n': 90}, 1)    # clockwise 90: the foot end swings to the left (back)
    assert img[90:110, 10:40, 3].max() > 0 and img[130:170, 70:90, 3].max() == 0


def test_a_stray_dot_of_a_foot_on_the_chest_joins_the_chest():
    own = own_with(chest=(20, 80, 40, 120), foot_f=(160, 172, 90, 120))
    own[40:44, 60:64] = rp.PARTS.index('foot_f')               # a blend dot of the foot's colour on the chest
    out = rp.stray_pieces(own)
    assert (out[40:44, 60:64] == rp.PARTS.index('chest')).all() and (out[160:172, 90:120] == rp.PARTS.index('foot_f')).all()


def test_cloth_keeps_its_pieces():
    own = own_with(skirt=(100, 160, 40, 120), shawl=(60, 100, 40, 120))
    own[70:74, 60:64] = rp.PARTS.index('skirt')                # tunic showing between fringe strands
    assert (rp.stray_pieces(own)[70:74, 60:64] == rp.PARTS.index('skirt')).all()


def test_a_wisp_of_hair_in_the_air_stays_with_the_head():
    own = own_with(head=(20, 60, 60, 100), chest=(60, 120, 40, 120))
    own[10:13, 110:114] = rp.PARTS.index('head')               # a loose wisp, touching nothing
    assert (rp.stray_pieces(own)[10:13, 110:114] == rp.PARTS.index('head')).all()


def test_a_dot_of_skirt_colour_on_the_head_joins_the_head():
    own = own_with(head=(20, 60, 60, 100), skirt=(120, 180, 40, 120))
    own[30:33, 70:73] = rp.PARTS.index('skirt')
    assert (rp.stray_pieces(own)[30:33, 70:73] == rp.PARTS.index('head')).all()


if __name__ == '__main__':
    import sys
    sys.exit(pytest.main([__file__, '-q']))
