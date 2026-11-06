"""Checks the style lock against the approved 10-27 sheets (skipped where the media folder is absent)."""
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

import cut
import prompts
import qa

WORK = prompts.MEDIA / 'library/_work/nl-golden-age'
needs_media = pytest.mark.skipif(not WORK.exists(), reason='approved sheets not on this machine')
SHIP_SUBJECT = ("Arranged in two rows of three: (1) a ship's lantern, (2) a brass telescope, (3) a wooden sea chest, "
                "(4) a wooden bucket, (5) an iron ship's anchor, (6) a bronze cannon on a wooden carriage.")


def rgb(p: Path) -> np.ndarray:
    return np.array(Image.open(p).convert('RGB'))


@needs_media
def test_ink_prompt_is_the_approved_prompt_word_for_word():
    approved = (WORK / 'prop-ship/ink.log').read_text().split('\n=====')[0].strip()
    assert prompts.ink_prompt('prop', 'nl-golden-age', SHIP_SUBJECT) == approved


@needs_media
def test_colour_prompt_is_the_approved_prompt_word_for_word():
    approved = (WORK / 'sky-summer/colour_a.log').read_text().split('\n=====')[0].strip()
    assert prompts.colour_prompt('sky', 'nl-golden-age', 'colour_a.png') == approved


@needs_media
def test_approved_prop_sheet_passes_every_gate_and_cuts_into_its_six_objects():
    ink, colour = rgb(WORK / 'prop-ship/ink.png'), rgb(WORK / 'prop-ship/colour_h.png')
    inside = cut.alpha_matte(ink, cut.border_paper(ink), islands=False) > 0.1
    assert qa.ink_ok('prop', qa.ink_coverage(ink, inside))
    assert qa.ink_kept_ok('prop', qa.ink_kept(ink, colour))
    assert qa.palette_de(colour, prompts.palette_hexes('nl-golden-age'), cut.border_paper(colour)) <= qa.PALETTE_GATE
    assert len(cut.cut_sheet(colour, 'prop')) == 6


def test_a_redrawn_sheet_fails_ink_kept():
    ink = np.full((200, 300, 3), 246, np.uint8)
    ink[50:150, 40:44] = 20                       # a post on the left
    redrawn = np.full_like(ink, 246)
    redrawn[50:150, 250:254] = 20                 # the same post, moved right
    assert qa.ink_kept(ink, ink) > 0.99
    assert not qa.ink_kept_ok('prop', qa.ink_kept(ink, redrawn))
    assert qa.ink_kept_ok('sky', 0.0), 'skies are not gated on line position'


def test_cut_separates_objects_keeps_enclosed_holes_out_and_anchors_on_the_floor():
    img = np.full((300, 600, 3), 246, np.uint8)
    img[100:250, 50:200] = (125, 103, 82)         # a crate
    img[150:200, 100:150] = 246                   # a gap you can see through
    img[120:250, 350:450] = (114, 162, 181)       # a barrel, further right
    pieces = cut.cut_sheet(img, 'prop')
    assert len(pieces) == 2 and pieces[0]['box'][0] < pieces[1]['box'][0]
    crate = pieces[0]['rgba']
    assert crate[crate.shape[0] // 2, crate.shape[1] // 2, 3] == 0, 'the hole is cut'
    assert pieces[0]['anchor'][1] == 1.0 and 0.4 < pieces[0]['anchor'][0] < 0.6


def test_ink_bands_reject_too_little_and_engraving_dense():
    assert not qa.ink_ok('prop', 0.10) and qa.ink_ok('prop', 0.30) and not qa.ink_ok('prop', 0.60)
    assert qa.ink_ok('sky', 0.0)


def test_every_era_palette_names_its_colours_in_the_prompt():
    for era in prompts.PALETTE:
        text = prompts.colour_prompt('prop', era)
        assert all(h in text for _, hs in prompts.PALETTE[era] for h in hs)


def _green_sheet() -> np.ndarray:
    img = np.zeros((300, 600, 3), np.uint8); img[..., 1] = 255
    img[100:250, 50:200] = (125, 103, 82)         # a crate
    img[150:200, 100:150] = (0, 255, 0)           # a gap you can see through
    img[120:250, 350:450] = (232, 226, 210)       # pale cloth, the colour white paper cuts ate
    img[120:122, 350:450] = (20, 20, 20)
    img[130:240, 380:420] = (118, 125, 70)        # olive paint
    return img


def test_a_green_sheet_is_keyed_gaps_and_all_and_pale_cloth_and_olive_stay():
    pieces = cut.cut_sheet(_green_sheet(), 'prop')
    assert len(pieces) == 2
    crate, cloth = pieces[0]['rgba'], pieces[1]['rgba']
    assert crate[crate.shape[0] // 2, crate.shape[1] // 2, 3] == 0, 'the gap goes'
    h, w = cloth.shape[:2]
    assert cloth[h // 2, w // 8, 3] > 250 and cloth[h // 2, w // 2, 3] > 250, 'pale cloth and olive stay whole'
    assert pieces[0]['anchor'][1] == 1.0


def test_cut_parts_of_the_sheet_prompt_ask_for_green_except_where_nothing_is_cut():
    assert '#00FF00' in prompts.colour_prompt('prop', 'nl-golden-age') and '#00FF00' in prompts.colour_prompt('bg', 'nl-golden-age')
    assert '#00FF00' not in prompts.colour_prompt('sky', 'nl-golden-age') and '#00FF00' not in prompts.colour_prompt('ground', 'nl-golden-age')
    assert '#00FF00' not in prompts.ink_prompt('prop', 'nl-golden-age', 'a crate')
