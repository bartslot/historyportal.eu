from anim_fit import fit, guarded, joints, knee_is_right


def walk_raw():
    stride = {'thigh_n': -25, 'shin_n': 5, 'thigh_f': 20, 'shin_f': 10}
    passing = {'thigh_n': 0, 'shin_n': 5, 'thigh_f': -10, 'shin_f': 60}
    other = {'thigh_n': 20, 'shin_n': 10, 'thigh_f': -25, 'shin_f': 5}
    passing_f = {'thigh_n': -10, 'shin_n': 60, 'thigh_f': 0, 'shin_f': 5}
    return {'id': 'walk', 'loop': True, 'duration': 1.0, 'travel': True, 'keys': [
        {'t': 0, 'contact': 'both', 'bones': stride}, {'t': 0.25, 'contact': 'n', 'bones': passing},
        {'t': 0.5, 'contact': 'both', 'bones': other}, {'t': 0.75, 'contact': 'f', 'bones': passing_f},
    ]}


def test_a_knee_bent_backwards_is_mirrored():
    pose, notes = guarded({'shin_n': -40})
    j = joints(pose, 'n')
    assert pose['shin_n'] == 40 and knee_is_right(j['hip'], j['knee'], j['ankle'])
    assert any('posing rule' in n for n in notes)


def test_an_elbow_bent_backwards_is_mirrored():
    pose, _ = guarded({'forearm_f': 60})
    assert pose['forearm_f'] == -60


def test_a_walk_travels_forward_without_sliding_a_planted_foot():
    clip, report = fit(walk_raw())
    assert report['slide'] < 0.005   # what is left is the loop's seam spread over the cycle: under a centimetre on a grown-up
    assert clip['travel'] > 0.15
    assert clip['keys'][-1]['t'] == 1.0


def test_a_loop_ends_on_its_first_pose():
    clip, _ = fit(walk_raw())
    first, last = clip['keys'][0], clip['keys'][-1]
    assert {k: v for k, v in first.items() if k.startswith('bone:')} == {k: v for k, v in last.items() if k.startswith('bone:')}
    assert abs(first['bob'] - last['bob']) < 1e-3


def test_a_squat_sinks_the_hips_and_keeps_both_feet_where_they_stand():
    clip, report = fit({'id': 'squat', 'loop': False, 'duration': 1, 'keys': [
        {'t': 0, 'contact': 'both', 'bones': {}},
        {'t': 1, 'contact': 'both', 'bones': {'thigh_n': -45, 'shin_n': 70, 'thigh_f': -45, 'shin_f': 70}},
    ]})
    assert clip['keys'][-1]['bob'] < -0.03
    assert report['slide'] < 0.002
    assert clip['travel'] == 0.0


def test_a_jump_leaves_the_ground_by_its_lift():
    clip, _ = fit({'id': 'jump', 'loop': False, 'duration': 1, 'keys': [
        {'t': 0, 'contact': 'both', 'bones': {}}, {'t': 0.5, 'contact': 'none', 'lift': 0.2, 'bones': {}},
        {'t': 1, 'contact': 'both', 'bones': {}},
    ]})
    assert abs(clip['keys'][1]['bob'] - 0.2) < 1e-3


def test_a_face_is_one_the_heads_can_show():
    clip, _ = fit({'id': 'x', 'loop': False, 'duration': 1, 'keys': [
        {'t': 0, 'contact': 'both', 'bones': {}, 'face': 'surprised'}, {'t': 1, 'contact': 'both', 'bones': {}, 'face': 'grin'}]})
    assert clip['keys'][0]['face'] == 'amazed' and 'face' not in clip['keys'][1]


def test_a_move_that_starts_sitting_starts_low_and_no_foot_ever_goes_through_the_floor():
    from anim_fit import sinking, HEIGHT_PX
    sit = {'thigh_n': -85, 'shin_n': 85, 'thigh_f': -85, 'shin_f': 85}
    raw = {'id': 'up', 'loop': False, 'duration': 1, 'keys': [
        {'t': 0, 'contact': 'both', 'bones': sit}, {'t': 0.5, 'contact': 'both', 'bones': {**sit, 'foot_n': -45}},
        {'t': 1, 'contact': 'both', 'bones': {}}]}
    clip, _ = fit(raw)
    assert clip['keys'][0]['bob'] < -0.05 and abs(clip['keys'][-1]['bob']) < 1e-3
    for k in clip['keys']:
        pose = {b[5:]: v for b, v in k.items() if b.startswith('bone:')}
        assert sinking(pose, -k['bob'] * HEIGHT_PX) < 0.6


def test_no_turn_goes_past_what_the_rigs_allow():
    from anim_fit import RIG_LIMIT
    clip, _ = fit({'id': 'x', 'loop': False, 'duration': 1, 'keys': [
        {'t': 0, 'contact': 'both', 'bones': {'thigh_n': -100, 'chest': 45, 'upperarm_f': -150}}, {'t': 1, 'contact': 'both', 'bones': {}}]})
    for k in clip['keys']:
        for f, v in k.items():
            if f.startswith('bone:'):
                lo, hi = RIG_LIMIT[f[5:]]
                assert lo - 0.05 <= v <= hi + 0.05, (f, v)


def test_a_walk_never_steps_back():
    import json
    from pathlib import Path
    walk, _ = fit(json.loads(Path('anim_raw/walk.json').read_text()))
    dx = [k['dx'] for k in walk['keys']]
    assert dx == sorted(dx)


def test_a_jump_leaves_the_ground_from_standing_with_both_feet_clear():
    from anim_fit import sinking, HEIGHT_PX, AIR_CLEAR
    crouch = {'thigh_n': -25, 'shin_n': 100, 'thigh_f': -25, 'shin_f': 100}
    clip, _ = fit({'id': 'j', 'loop': False, 'duration': 1, 'keys': [
        {'t': 0, 'contact': 'both', 'bones': crouch}, {'t': 0.5, 'contact': 'none', 'lift': 0.25, 'bones': {}},
        {'t': 1, 'contact': 'both', 'bones': crouch}]})
    air = clip['keys'][1]
    assert abs(air['bob'] - 0.25) < 0.01   # measured from standing, not from the crouches either side
    pose = {b[5:]: v for b, v in air.items() if b.startswith('bone:')}
    assert sinking(pose, -air['bob'] * HEIGHT_PX) <= -AIR_CLEAR * HEIGHT_PX + 0.5


def test_a_fall_tips_the_body_over_and_keeps_every_joint_inside_the_rigs():
    import json
    from pathlib import Path
    from anim_fit import RIG_LIMIT
    clip, _ = fit(json.loads(Path('anim_raw/fall_get_up.json').read_text()))
    assert min(k.get('rot', 0) for k in clip['keys']) < -60 and clip['keys'][-1].get('rot', 0) == 0
    for k in clip['keys']:
        for f, v in k.items():
            if f.startswith('bone:'):
                lo, hi = RIG_LIMIT[f[5:]]
                assert lo - 0.05 <= v <= hi + 0.05
