#!/usr/bin/env python3
"""Run: python3 -m pytest engine-mvp/tools/test_kit_bodies.py"""
import pytest

import kit_parts as kp

GIRL_BOX = (319, 5, 688, 374)
GIRL = {'NECK': [505, 322], 'SHOULDER': {'n': [400, 360], 'f': [650, 380]}, 'HIP': [440, 632]}


def test_a_body_whose_joints_sit_where_a_body_has_them_passes():
    assert kp.joint_problems(GIRL, GIRL_BOX) == []


def test_a_shoulder_measured_mid_arm_is_caught():
    """The girl's far shoulder measured off a map her shawl covers: (664, 488), about 170 px under the neck."""
    bad = dict(GIRL, SHOULDER={'n': [390.5, 363], 'f': [664.2, 488]})
    assert any('shoulder f' in p for p in kp.joint_problems(bad, GIRL_BOX))


def test_shoulders_swapped_onto_one_side_or_inside_the_chest_are_caught():
    assert any('either side' in p for p in kp.joint_problems(dict(GIRL, SHOULDER={'n': [400, 360], 'f': [420, 362]}), GIRL_BOX))
    assert any('shoulder n' in p for p in kp.joint_problems(dict(GIRL, SHOULDER={'n': [490, 330], 'f': [650, 380]}), GIRL_BOX))


def test_a_hip_at_the_armpit_is_caught():
    assert any('hip' in p for p in kp.joint_problems(dict(GIRL, HIP=[440, 322 + 0.52 * 369]), GIRL_BOX))


def test_a_hip_at_the_neck_is_caught():
    assert any('hip' in p for p in kp.joint_problems(dict(GIRL, HIP=[440, 340]), GIRL_BOX))


@pytest.mark.skipif(not (kp.K / 'body/joints.json').is_file(), reason='the kit folder is not on this machine')
@pytest.mark.parametrize('body', ['girl', 'woman', 'man'])
def test_every_body_type_in_the_kit_has_sane_joints(body):
    joints, box = kp.body_joints(body)
    assert len(box) == 4 and set(joints['SHOULDER']) == {'n', 'f'}
