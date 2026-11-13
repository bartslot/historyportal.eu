#!/usr/bin/env python3
"""Run: python3 engine-mvp/tools/test_rig_check.py  (also collected by pytest)

Each check has a test that makes it fail, so a check that cannot fail is found (fresh review, 2026-11-13)."""
import json
import os
import tempfile

import numpy as np
from PIL import Image

import rig_check as rc
from rig_face import switch_drawing

H, W = 240, 160
GREEN = (0, 255, 0)
SKIN = (230, 180, 140)


def rest():
    """A figure on green: head with an ink outline on top, chest, two shins with feet."""
    img = np.full((H, W, 3), GREEN, np.uint8)
    img[10:50, 60:100] = (200, 150, 120)       # head
    img[10:13, 60:100] = (20, 20, 20)          # ink along the head's top
    img[50:140, 50:110] = (220, 200, 170)      # chest
    img[140:220, 55:75] = SKIN                 # near shin
    img[140:220, 85:105] = SKIN                # far shin
    img[220:232, 55:85] = SKIN                 # near foot
    img[220:232, 85:115] = SKIN                # far foot
    return img


def part_map():
    m = np.zeros((H, W, 3), np.uint8)
    for (y0, y1, x0, x1), part in [((10, 50, 60, 100), 'head'), ((50, 140, 50, 110), 'chest'), ((140, 220, 55, 75), 'shin_n'),
                                   ((140, 220, 85, 105), 'shin_f'), ((220, 232, 55, 85), 'foot_n'), ((220, 232, 85, 115), 'foot_f')]:
        m[y0:y1, x0:x1] = rc.PALETTE[part]
    return m


def save(folder, name, arr):
    Image.fromarray(arr).save(os.path.join(folder, name))


def line(report, starts):
    """The pass of the one line whose text starts with `starts`."""
    found = [l['pass'] for l in report['lines'] if l['check'].startswith(starts)]
    assert len(found) == 1, (starts, [l['check'] for l in report['lines']])
    return found[0]


def sheet(d, **over):
    """A toy sheet in d; `over` replaces a picture by name (None leaves it out)."""
    pictures = {'rest.png': rest(), 'map.png': part_map(), 'under-a.png': rest(), 'under-b.png': rest()}
    pictures.update({k.replace('_', '-') + '.png': v for k, v in over.items()})
    for name, arr in pictures.items():
        if arr is not None:
            save(d, name, arr)


def test_a_map_on_the_drawing_passes_its_lines():
    with tempfile.TemporaryDirectory() as d:
        sheet(d)
        r = rc.run(d)
        assert line(r, 'map: drawn px') and line(r, 'map: paint further') and line(r, 'map off-colour') and line(r, 'map parts whole')


def test_a_part_the_map_left_out_fails():
    with tempfile.TemporaryDirectory() as d:
        m = part_map()
        m[140:220, 85:105] = 0                 # the far shin is missing from the map
        sheet(d, map=m)
        assert not line(rc.run(d), 'map: drawn px')


def test_map_paint_on_the_air_fails():
    with tempfile.TemporaryDirectory() as d:
        m = part_map()
        m[150:200, 120:160] = rc.PALETTE['upperarm_n']   # an arm painted where nothing is drawn
        sheet(d, map=m)
        assert not line(rc.run(d), 'map: paint further')


def test_dots_of_a_part_are_specks():
    labels = np.full((80, 80), 1)
    labels[5:75, 5:40] = 0
    for y in range(10, 70, 8):                 # 4x4 dots of the part inside another part
        labels[y:y + 4, 55:59] = 0
    sp = rc.specks(labels, ['sleeve', 'shawl'])
    assert sp['sleeve']['speck'] > 0 and sp['sleeve']['slivers'] == 0


def test_a_sliver_between_fringe_strands_is_not_a_speck():
    labels = np.full((60, 60), 1)
    labels[10:50, 10:40] = 0                   # the part
    labels[10:50, 45:47] = 0                   # a 2 px wide, 40 px long sliver of it between strands
    sp = rc.specks(labels, ['sleeve', 'shawl'])
    assert sp['sleeve']['speck'] == 0 and sp['sleeve']['slivers'] == 1


def test_the_map_rim_takes_the_nearest_part():
    labels = np.full((20, 20), -1)
    labels[2:18, 2:10] = 0
    labels[2:18, 10:18] = 1
    labels[2:18, 2] = 1                        # a blend on the rim reads as the wrong part
    clean = rc.clean_labels(labels, labels >= 0)
    assert (clean[2:18, 2] == 0).all()


def test_an_edit_that_moved_is_found_and_put_back():
    with tempfile.TemporaryDirectory() as d:
        sheet(d, under_a=np.roll(rest(), 3, axis=1))
        r = rc.run(d)
        e = r['edits']['under-a.png']
        assert e['shift'] == [0, -3] and e['corrected'] and e['region_iou'] > 0.99
        assert line(r, 'under-a.png shift')


def test_an_edit_moved_past_the_search_fails():
    with tempfile.TemporaryDirectory() as d:
        sheet(d, under_a=np.roll(rest(), 9, axis=1))
        assert not line(rc.run(d), 'under-a.png shift')


def test_an_edit_that_lost_a_line_fails():
    with tempfile.TemporaryDirectory() as d:
        edit = rest()
        edit[10:13, 60:100] = (200, 150, 120)  # the head's top outline painted over
        sheet(d, under_a=edit)
        assert not line(rc.run(d), 'under-a.png lines kept')


def test_an_edit_of_another_size_fails_without_crashing():
    with tempfile.TemporaryDirectory() as d:
        sheet(d, under_b=np.full((H // 2, W // 2, 3), GREEN, np.uint8))
        assert not line(rc.run(d), "under-b.png has the drawing's size")


def test_a_missing_picture_fails():
    with tempfile.TemporaryDirectory() as d:
        sheet(d, under_a=None)
        r = rc.run(d)
        assert not line(r, 'under-a.png is there') and not r['pass']


def test_a_face_switch_keeps_only_its_change():
    base = np.full((100, 100, 3), (220, 170, 130), np.uint8)
    edit = base.copy()
    edit[40:60, 20:80] = (230, 182, 142)       # the pasted box: a shade lighter, not drawing
    edit[48:52, 30:70] = (40, 20, 10)          # the new mouth line
    out = switch_drawing(base, edit, (45, 55, 25, 75))
    assert (out[50, 50] == (40, 20, 10)).all(), 'the line came along'
    assert (out[42, 22] == base[42, 22]).all(), 'the pasted tone stayed out'


def face_sheet(d, edit, box):
    base = np.full((200, 200, 3), (220, 170, 130), np.uint8)
    sheet(d)
    save(d, 'head-base.png', base)
    os.makedirs(os.path.join(d, 'face'))
    save(d, os.path.join('face', 'brows-up.png'), edit(base.copy()))
    with open(os.path.join(d, 'face', 'boxes.json'), 'w') as f:
        json.dump({'brows': box}, f)
    return rc.run(d)


def test_a_thin_brow_line_cut_by_its_box_fails():
    def raised(img):
        img[60:63, 60:140] = (30, 20, 10)       # a 3 px brow line, partly above its box
        img[30:63, 98:101] = (30, 20, 10)
        return img
    r = face_sheet(tempfile.mkdtemp(), raised, [55, 80, 50, 150])
    assert not line(r, 'face brows-up.png: changed px at the box edge (at a 1024 head)')


def test_a_face_edit_that_redrew_elsewhere_fails():
    def elsewhere(img):
        img[60:63, 60:140] = (30, 20, 10)       # the brow, in its box
        img[150:170, 40:160] = (30, 20, 10)     # and a mouth it was not asked for
        return img
    r = face_sheet(tempfile.mkdtemp(), elsewhere, [50, 80, 50, 150])
    assert not line(r, 'face brows-up.png: share of its change outside')


def test_a_face_box_at_the_picture_edge_is_not_an_edge_fail():
    def raised(img):
        img[20:24, 60:140] = (30, 20, 10)
        return img
    r = face_sheet(tempfile.mkdtemp(), raised, [0, 60, 0, 200])
    assert line(r, 'face brows-up.png: changed px at the box edge (at a 1024 head)')


def test_an_island_inside_one_other_part_joins_it():
    labels = np.full((60, 60), 1)              # the shawl
    labels[:, :20] = 0                         # the sleeve
    labels[30:33, 40:50] = 0                   # a scrap of sleeve between fringe strands
    out = rc.absorb_islands(labels)
    assert (out[30:33, 40:50] == 1).all() and (out[:, :20] == 0).all()


def test_fine_lines_moved_a_fraction_of_a_pixel_are_not_change():
    base = np.full((60, 60, 3), (220, 170, 130), np.uint8)
    base[:, 30] = (20, 10, 5)                  # a fine hair line
    edit = np.roll(base, 1, axis=1)            # re-rendered one pixel over
    edit[10:14, 5:25] = (20, 10, 5)            # and one new stroke
    real = rc.real_change(base, edit)
    assert not real[:, 28:33].any() and real[10:14, 8:22].all()


def test_a_small_smear_inside_a_part_is_repaired():
    labels = np.full((60, 60), 2)              # the chest
    labels[20:26, 20:26] = 5                   # a 36 px blob of arm colour smeared into it
    out = rc.absorb_islands(labels)
    assert (out == 2).all()


def test_a_big_patch_of_the_wrong_colour_is_not_repaired():
    labels = np.full((60, 60), 0)              # the head
    labels[20:35, 20:35] = 2                   # a 225 px patch of chest colour inside it
    out = rc.absorb_islands(labels)
    assert (out[20:35, 20:35] == 2).all()


def test_a_part_in_two_pieces_needs_a_sign_off():
    with tempfile.TemporaryDirectory() as d:
        m = part_map()
        m[178:182, 55:75] = 0                  # the near shin cut in two, right across
        r_img = rest()
        r_img[178:182, 55:75] = GREEN
        sheet(d, rest=r_img, map=m, under_a=r_img, under_b=r_img)
        assert not line(rc.run(d), 'map parts in several big pieces')
        with open(os.path.join(d, 'map-pieces.json'), 'w') as f:
            json.dump({'map': {'shin_n': 2}}, f)
        assert line(rc.run(d), 'map parts in several big pieces')


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn()
            print('ok', name)
