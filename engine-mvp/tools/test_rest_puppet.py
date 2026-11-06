#!/usr/bin/env python3
"""Run: python3 engine-mvp/tools/test_rest_puppet.py"""
import numpy as np

from rest_puppet import COLOURS, cut, elbow_cap, elbow_of, facing_of, puppet_of

H, W = 300, 200


def figure():
    """Chest and head in the middle, a sleeve + a skin forearm on each side, legs under; a shoe pointing right."""
    rest, parts_map = np.zeros((H, W, 4), 'uint8'), np.zeros((H, W, 4), 'uint8')

    def paint(x0, y0, x1, y1, colour, part):
        rest[y0:y1, x0:x1] = (*colour, 255)
        parts_map[y0:y1, x0:x1] = (*COLOURS[part], 255)
    paint(80, 20, 120, 50, (200, 150, 120), 'head')
    paint(70, 50, 130, 140, (150, 90, 50), 'chest')
    paint(40, 50, 70, 100, (240, 235, 225), 'arm_n')
    paint(40, 100, 70, 170, (240, 180, 130), 'arm_n')
    paint(130, 50, 160, 100, (240, 235, 225), 'arm_f')
    paint(130, 100, 160, 170, (240, 180, 130), 'arm_f')
    paint(70, 140, 100, 280, (120, 80, 60), 'leg_n')
    paint(100, 140, 130, 280, (120, 80, 60), 'leg_f')
    paint(70, 280, 160, 295, (90, 60, 40), 'leg_f')
    under = rest.copy()
    under[50:140, 70:130] = (250, 245, 235, 255)
    return rest, parts_map, under


JOINTS = [
    {'name': 'chest', 'from': [100, 135], 'to': [100, 55]}, {'name': 'head', 'from': [100, 50], 'to': [100, 20]},
    {'name': 'upperarm_n', 'from': [75, 60], 'to': [55, 110]}, {'name': 'forearm_n', 'from': [55, 110], 'to': [55, 170]},
    {'name': 'upperarm_f', 'from': [125, 60], 'to': [145, 110]}, {'name': 'forearm_f', 'from': [145, 110], 'to': [145, 170]},
]


def compose(parts):
    out = np.zeros((H, W, 4), 'uint8')
    for _, rgba in parts:
        out[rgba[..., 3] > 0] = rgba[rgba[..., 3] > 0]
    return out


def test_at_rest_it_is_the_drawing():
    rest, parts_map, under = figure()
    parts, _, _ = cut(rest, parts_map, under, JOINTS)
    assert (compose(parts)[rest[..., 3] > 0] == rest[rest[..., 3] > 0]).all(), 'a visible pixel changed'


def test_a_sleeve_goes_on_under_the_waistcoat_in_the_hidden_paint():
    rest, parts_map, under = figure()
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['upperarm_n'][70, 75, 3] > 0, 'the sleeve stops at the waistcoat'
    assert tuple(parts['upperarm_n'][70, 75, :3]) == (250, 245, 235), 'not the hidden paint'


def test_legs_reach_up_under_the_hem():
    rest, parts_map, under = figure()
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['hips'][130, 100, 3] > 0, 'nothing behind the hem'


def test_a_forearm_turns_just_inside_the_cuff_with_a_round_cap_that_stays_there():
    rest, _, _ = figure()
    part = np.zeros((H, W), bool)
    part[100:170, 40:70] = True
    pivot, radius, _, _ = elbow_of(part, [55, 110], [55, 170])
    assert 75 < pivot[1] < 100 and abs(pivot[0] - 54.5) < 1, f'elbow at {pivot}'
    assert 12 <= radius <= 16, f'radius {radius}'
    cap = elbow_cap(rest, part, [55, 110], [55, 170])
    ys, _ = np.where(cap[..., 3] > 0)
    assert ys.max() < 103, 'the cap lies under the cuff only'
    assert ys.min() >= pivot[1] - radius - 1, 'the cap pokes out past the elbow'
    assert tuple(cap[int(pivot[1]), 55, :3]) == (240, 180, 130), 'not skin'


def test_a_map_border_off_the_drawn_edge_follows_the_colours():
    rest, parts_map, under = figure()
    parts_map[60:90, 66:70] = (*COLOURS['chest'], 255)     # the map gives the waistcoat a strip of sleeve
    parts_map[100:130, 70:74] = (*COLOURS['arm_n'], 255)   # and the sleeve a strip of waistcoat
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert tuple(parts['chest'][75, 68, :3]) != (240, 235, 225), 'linen stayed on the chest'
    assert parts['upperarm_n'][75, 68, 3] == 255, 'the sleeve has a hole'
    assert parts['chest'][115, 72, 3] == 255, 'the waistcoat has a hole'


def test_white_paper_around_the_head_goes_and_white_inside_it_stays():
    rest, parts_map, under = figure()
    rest[20:50, 78:80] = (255, 255, 255, 255)    # a fleck of old paper on the head's edge
    parts_map[20:50, 78:80] = (*COLOURS['head'], 255)
    rest[46:50, 120:124] = (255, 255, 255, 255)  # below the neck's pivot row it may be the shirt
    parts_map[46:50, 120:124] = (*COLOURS['head'], 255)
    rest[30:33, 95:98] = (255, 255, 255, 255)    # an eye's highlight
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['head'][35, 78, 3] == 0, 'paper stayed'
    assert parts['head'][31, 96, 3] == 255, 'the eye went'


def test_a_finger_cut_off_by_a_line_still_goes_with_the_forearm():
    rest, parts_map, under = figure()
    rest[165:167, 40:70] = (10, 10, 10, 255)     # a drawn line across the hand
    rest[167:190, 40:70] = (240, 180, 130, 255)  # the fingers past it
    parts_map[165:190, 40:70] = (*COLOURS['arm_n'], 255)
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['forearm_n'][180, 55, 3] == 255, 'the finger stayed behind'
    assert parts['upperarm_n'][180, 55, 3] == 0, 'the sleeve carries a finger'


def test_there_is_paint_behind_the_neck_when_the_head_turns():
    rest, parts_map, under = figure()
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['neck'][48, 100, 3] == 255, 'a hole opens where the head was'
    bones = [b for b, _ in cut(rest, parts_map, under, JOINTS)[0]]
    assert bones.index('neck') < bones.index('head'), 'the neck goes behind the head'


def test_the_collar_under_the_turning_point_stays_on_the_chest():
    rest, parts_map, under = figure()
    parts_map[50:60, 95:105] = (*COLOURS['head'], 255)   # the throat, below the head's pivot row
    rest[50:60, 95:105] = (230, 170, 140, 255)
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['head'][55, 100, 3] == 0, 'the head carries the throat with it'
    assert parts['neck'][55, 100, 3] == 255 and tuple(parts['neck'][55, 100, :3]) == (230, 170, 140), 'the throat is gone'


def test_a_scrap_of_sleeve_on_the_chest_goes_with_the_arm_and_the_shirt_front_stays():
    rest, parts_map, under = figure()
    scrap = rest.copy()
    scrap[70:74, 70:74] = (240, 235, 225, 255)            # a scrap of linen on the chest, at the sleeve
    parts = dict(cut(scrap, parts_map, under, JOINTS)[0])
    assert parts['upperarm_n'][72, 72, 3] == 255, 'the scrap stayed on the chest'
    assert parts['chest'][72, 72, 3] == 0
    rest[80:130, 99:102] = (240, 235, 225, 255)           # the shirt front: too far from either sleeve
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['chest'][100, 100, 3] == 255, 'the shirt front left'


def test_the_near_arm_goes_over_the_legs_and_under_the_waistcoat_the_far_arm_behind_them():
    rest, parts_map, under = figure()
    bones = [b for b, _ in cut(rest, parts_map, under, JOINTS)[0]]
    assert bones.index('forearm_f') < bones.index('hips') < bones.index('forearm_n') < bones.index('upperarm_n') < bones.index('chest')


def test_a_stray_speck_on_the_map_joins_the_part_around_it():
    rest, parts_map, under = figure()
    parts_map[250:253, 80:83] = (*COLOURS['head'], 255)    # a speck of head colour on the leg
    parts = dict(cut(rest, parts_map, under, JOINTS)[0])
    assert parts['head'][251, 81, 3] == 0, 'the head reaches down to the leg'
    assert parts['hips'][251, 81, 3] == 255, 'a hole in the leg'


def test_facing_comes_from_the_feet():
    legs = np.zeros((H, W), bool)
    legs[20:280, 70:100] = True
    legs[280:295, 70:160] = True
    assert facing_of(legs) == 1
    assert facing_of(legs[:, ::-1]) == -1


def test_the_puppet_lists_upper_body_bones_only_and_its_uvs_fit():
    rest, parts_map, under = figure()
    parts, facing, elbows = cut(rest, parts_map, under, JOINTS)
    _, puppet = puppet_of(parts, JOINTS, facing, elbows, (H, W), '/a.png')
    names = {b['name'] for b in puppet['bones']}
    assert names == {'hips', 'chest', 'head', 'upperarm_n', 'upperarm_f', 'forearm_n', 'forearm_f'}
    for p in puppet['parts']:
        assert 0 <= p['uv'][0] < p['uv'][2] <= 1 and 0 <= p['uv'][1] < p['uv'][3] <= 1


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_'):
            fn()
            print('ok', name)
