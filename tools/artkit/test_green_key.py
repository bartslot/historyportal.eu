"""The #00FF00 key: the background goes, spill goes, paint stays."""
import numpy as np

import green_key


def _sheet() -> np.ndarray:
    img = np.zeros((60, 60, 3), np.uint8); img[..., 1] = 255
    img[20:40, 20:40] = (120, 90, 60)
    img[20:40, 19] = (120, 180, 60)      # a green fringe on the edge
    return img


def test_a_green_border_is_a_green_sheet_and_white_is_not():
    assert green_key.is_green_sheet(_sheet())
    assert not green_key.is_green_sheet(np.full((60, 60, 3), 250, np.uint8))


def test_background_goes_and_the_subject_stays():
    _, a = green_key.key(_sheet())
    assert a[5, 5] == 0 and a[30, 30] == 1


def test_the_green_fringe_loses_its_green():
    clean, _ = green_key.key(_sheet())
    assert clean[30, 19, 1] <= 120


def test_a_big_patch_of_olive_paint_stays_olive():
    img = _sheet(); img[25:35, 25:35] = (118, 125, 70)
    clean, a = green_key.key(img)
    assert a[30, 30] == 1 and tuple(clean[30, 30]) == (118, 125, 70)


def test_a_small_green_pocket_takes_the_colour_around_it():
    img = _sheet(); img[29:31, 29:31] = (120, 150, 60)
    clean, a = green_key.key(img)
    assert a[30, 30] == 1 and tuple(clean[30, 30]) == (120, 90, 60)


def test_a_half_keyed_pixel_keeps_its_see_through_and_loses_its_green():
    img = _sheet(); img[30, 19] = (120, 230, 60)
    clean, a = green_key.key(img)
    assert 0 < a[30, 19] < 1 and clean[30, 19, 1] <= 120


def test_a_thin_dark_line_with_green_in_it_stays_a_line():
    img = _sheet(); img[20:40, 30] = (20, 50, 20)
    clean, a = green_key.key(img)
    assert tuple(clean[30, 30]) == (20, 20, 20) and a[30, 30] == 1
