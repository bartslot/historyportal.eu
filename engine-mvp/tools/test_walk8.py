"""walk8.py: the drawings stay drawings an animator would sign off (python3 -m pytest test_walk8.py)."""
from walk8 import build, pose, problems, sole, drop, FLOOR


def test_every_drawing_bends_the_right_way_inside_the_rigs():
    assert [problems(pose(i)) for i in range(8)] == [[]] * 8


def test_no_foot_goes_through_the_floor_and_one_always_stands_on_it():
    for i in range(8):
        p, d = pose(i), drop(pose(i))
        lows = [FLOOR[s] - max(sole(p, s)['heel'][1], sole(p, s)['toe'][1]) - d for s in 'nf']
        assert min(lows) > -0.01 and min(lows) < 0.01, i


def test_down_is_the_lowest_drawing_and_up_rises_above_passing():
    bob = [k['bob'] for k in build()[0]['keys'][:8]]
    for step in (0, 4):
        contact, down, passing, up = bob[step:step + 4]
        assert down < contact < passing <= up + 0.005


def test_the_body_moves_on_at_an_even_pace_and_the_loop_closes():
    clip = build()[0]
    dx = [k['dx'] for k in clip['keys']]
    steps = [b - a for a, b in zip(dx, dx[1:])]
    assert max(steps) - min(steps) < 0.01   # body heights: no drawing rushes or drags
    assert all(s > 0 for s in steps)
    bones = lambda k: {f: v for f, v in k.items() if f.startswith('bone:')}
    assert bones(clip['keys'][0]) == bones(clip['keys'][8])
