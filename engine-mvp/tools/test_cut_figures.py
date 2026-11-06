"""Cut-out rules: whole gaps out, no pale halo, and nothing but paper can go."""
import numpy as np
from PIL import Image

from cut_figures import cutout, clean_alpha


def _figure() -> np.ndarray:
    img = np.full((220, 200, 3), 255, np.uint8)
    img[40:180, 40:160] = (150, 100, 60)                       # body
    img[75:125, 75:125] = (0, 0, 0)                            # ink wall of a gap
    img[77:123, 77:123] = (246, 240, 230)                      # pale ring inside it
    img[83:117, 83:117] = (255, 255, 255)
    img[38:182, 38:40] = img[38:182, 160:162] = (0, 0, 0)
    img[38:40, 38:162] = img[180:182, 38:162] = (0, 0, 0)      # outline
    img[35:185, 35:38] = (246, 240, 230)                       # pale halo outside it
    img[50:53, 50:60] = img[56:59, 50:60] = (0, 0, 0)
    img[50:59, 50:53] = img[50:59, 57:60] = (0, 0, 0)
    img[53:56, 53:57] = (255, 255, 255)                        # teeth: small, white, enclosed
    img[20:30, 180:186] = (170, 175, 180)                      # free-falling grey drop
    return img


def _alpha(img):
    return np.array(cutout(img, (0, img.shape[0], 0, img.shape[1]), np.ones(img.shape[:2], bool)))[..., 3] / 255


def test_the_whole_gap_goes_ring_included():
    assert _alpha(_figure())[78:122, 78:122].max() < .1


def test_the_pale_halo_goes_but_body_and_outline_stay():
    a = _alpha(_figure())
    assert a[100, 36] < .1 and a[100, 50] > .9 and a[100, 39] > .5


def test_teeth_and_a_grey_drop_stay():
    a = _alpha(_figure())
    assert a[54, 55] > .5 and a[25, 183] > .5


def test_a_picked_small_gap_goes():
    img = _figure()
    a = np.array(cutout(img, (0, 220, 0, 200), np.ones((220, 200), bool), extra_gaps=[(55, 54)]))[..., 3] / 255
    assert a[54, 55] < .1


def test_a_near_white_shirt_stays_when_the_source_says_it_is_not_a_gap():
    img = np.full((220, 200, 3), 255, np.uint8)
    img[40:180, 40:160] = (150, 100, 60)
    img[38:182, 38:40] = img[38:182, 160:162] = (0, 0, 0)
    img[38:40, 38:162] = img[180:182, 38:162] = (0, 0, 0)
    img[60:160, 60:140] = (0, 0, 0)
    img[62:158, 62:138] = (255, 255, 255)                      # a big paper-white sleeve, inked all round
    box, mine = (0, 220, 0, 200), np.ones((220, 200), bool)
    assert np.array(cutout(img, box, mine, seen_gaps=np.zeros((220, 200), bool)))[100, 100, 3] > 200
    seen = np.zeros((220, 200), bool); seen[90:110, 90:110] = True   # the source's own see-through part goes, its solid part stays
    a = np.array(cutout(img, box, mine, seen_gaps=seen))[..., 3]
    assert a[100, 100] < 25 and a[70, 70] > 200


def test_pale_cloth_with_no_drawn_edge_stays_when_the_source_is_solid_there():
    img = np.full((200, 200, 3), 255, np.uint8)
    img[60:200, 40:160] = (252, 250, 246)                      # a sleeve running off the crop, no outline
    img[60:62, 40:160] = (0, 0, 0)
    seen = np.ones((200, 200), bool); seen[60:200, 40:160] = False
    a = np.array(cutout(img, (0, 200, 0, 200), np.ones((200, 200), bool), seen_gaps=seen))[..., 3]
    assert a[150, 100] > 240 and a[30, 100] == 0


def test_a_green_sheet_is_keyed_and_white_cloth_stays():
    img = np.zeros((220, 200, 3), np.uint8); img[..., 1] = 255
    img[40:180, 40:160] = (250, 248, 240)                      # paper-white shirt
    img[90:110, 90:110] = (0, 255, 0)                          # a gap
    a = np.array(cutout(img, (0, 220, 0, 200), np.ones((220, 200), bool)))[..., 3]
    assert a[60, 60] == 255 and a[100, 100] == 0 and a[10, 10] == 0
