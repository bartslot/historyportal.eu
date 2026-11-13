#!/usr/bin/env python3
"""Run: python3 -m pytest engine-mvp/tools/test_flat_rig_sheet.py"""
import numpy as np
import pytest
from PIL import Image

import flat_rig_sheet as fr

H, W = 300, 200
GREEN = (0, 255, 0)
INK = (25, 20, 16)
SKIN, TUNIC, SHAWL, ROPE = (250, 190, 120), (252, 222, 172), (222, 92, 62), (158, 90, 40)


def sheet(path, shawl=True, skirt_to=240, belt=False):
    """A flat figure: a tunic box with a contour, a red shawl stripe over it, legs of skin below the hem."""
    a = np.zeros((H, W, 3), np.uint8)
    a[:] = GREEN
    a[230:290, 80:120] = SKIN               # legs
    a[60:skirt_to, 50:150] = TUNIC
    if shawl:
        a[60:skirt_to, 95:125] = SHAWL
    if belt:
        a[150:158, 50:150] = ROPE
    a[20:60, 80:120] = SKIN                 # head
    fig = ~np.all(a == GREEN, -1)
    rim = fig & ~np.pad(fig, 2)[4:, 2:-2] | fig & ~np.pad(fig, 2)[:-4, 2:-2] | fig & ~np.pad(fig, 2)[2:-2, 4:] | fig & ~np.pad(fig, 2)[2:-2, :-4]
    a[rim] = INK
    Image.fromarray(a).save(path)
    return path




def test_an_under_sheet_counts_only_where_it_shows_what_the_flat_sheet_hides(tmp_path):
    flat = fr.rgb_of(sheet(tmp_path / 'flat.png'))
    under = fr.rgb_of(sheet(tmp_path / 'under.png', shawl=False))
    region = fr.shown(under, flat)
    assert region[150, 110]                             # the tunic under the shawl
    assert not region[150, 65] and not region[40, 100]  # plain tunic and the head are the flat sheet's own


def test_a_line_width_of_difference_is_not_something_hidden(tmp_path):
    flat = fr.rgb_of(sheet(tmp_path / 'flat.png'))
    under = fr.rgb_of(sheet(tmp_path / 'under.png', skirt_to=243))   # the hem drawn 3 px lower
    assert not fr.shown(under, flat).any()


def test_outside_what_it_shows_an_under_sheet_is_the_flat_sheet_itself(tmp_path):
    flat_path = sheet(tmp_path / 'flat.png')
    under_path = sheet(tmp_path / 'under.png', shawl=False, skirt_to=200)        # no shawl, a shorter tunic
    out, region = fr.under_sheet(under_path, flat_path)
    flat_rgb = np.asarray(Image.open(flat_path).convert('RGB'))
    assert (out[~region] == flat_rgb[~region]).all()
    assert tuple(out[150, 110]) == TUNIC                              # under the shawl: the under sheet's tunic
    assert region[215, 65] and tuple(out[215, 65]) == GREEN                       # below its hem: nothing


def test_what_an_under_sheet_shows_takes_the_part_beside_it_on_its_map():
    m = np.zeros((10, 10, 3), np.uint8)
    m[:, :5] = (0, 255, 255)
    m[:, 5:] = (255, 255, 0)
    region = np.zeros((10, 10), bool)
    region[:, 5:7] = True
    out = fr.regions_map(m, region)
    assert (out[:, 5] == (0, 255, 255)).all() and (out[:, 6:] == (255, 255, 0)).all()   # each from its nearest side


def test_a_painted_picture_comes_to_size_over_green_without_a_green_rim():
    rgba = np.zeros((40, 40, 4), np.float32)
    rgba[10:30, 10:30] = (200, 100, 50, 255)
    out = fr.on_green(rgba, (20, 20)).astype(int)
    assert tuple(out[10, 10]) == (200, 100, 50) and tuple(out[1, 1]) == GREEN
    edge = out[4:16, 4]                                  # the anti-aliased edge: figure colour fading to green, never darker
    assert (edge[:, 1] >= 100).all()


def test_a_flat_line_right_beside_what_an_under_sheet_shows_goes_too(tmp_path):
    flat_path = sheet(tmp_path / 'flat.png')
    flat = np.asarray(Image.open(flat_path)).copy()
    flat[150:152, 85:94] = INK                          # a stub of line on plain tunic, just left of the shawl
    Image.fromarray(flat).save(flat_path)
    out, region = fr.under_sheet(sheet(tmp_path / 'under.png', shawl=False), flat_path)
    assert region[150, 88] and tuple(out[150, 88]) == TUNIC


def test_an_under_pass_head_sheet_takes_the_under_sheet_only_where_it_differs():
    head = np.full((64, 64, 3), 200, np.float32)
    under = np.zeros((1536, 1024, 3), np.float32)
    under[:] = (10, 20, 30)
    region = np.zeros((1536, 1024), bool)
    x0, y0, x1, y1 = fr.HEAD_BOX
    region[y1 - 40:y1, x0:x1] = True                    # the throat, at the bottom of the head box
    out = fr.under_head(head, under, region)
    assert tuple(out[2, 2]) == (200, 200, 200)          # the face: the head sheet's own
    assert tuple(out[-2, 30]) == (10, 20, 30)           # the throat: the under sheet's


def test_a_missing_sheet_stops_the_build_by_name(tmp_path):
    with pytest.raises(SystemExit, match='under-b-flat.png'):
        fr.build(tmp_path, tmp_path, tmp_path / 'out')
