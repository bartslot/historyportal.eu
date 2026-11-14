#!/usr/bin/env python3
"""Run: python3 -m pytest engine-mvp/tools/test_img_io.py"""
import numpy as np
from PIL import Image

import img_io


def rgba():
    a = np.zeros((40, 40, 4), np.uint8)
    a[8:32, 8:32] = (200, 120, 60, 255)
    a[8:32, 8] = (200, 120, 60, 128)                    # a soft edge
    return a


def test_a_picture_goes_out_as_webp_whatever_its_name_says(tmp_path):
    out = img_io.save(rgba(), tmp_path / 'atlas.png')
    assert out.name == 'atlas.webp' and out.is_file() and not (tmp_path / 'atlas.png').exists()


def test_lossless_keeps_every_pixel_and_the_app_setting_keeps_the_alpha(tmp_path):
    a = rgba()
    assert (np.asarray(Image.open(img_io.save(a, tmp_path / 'x', lossless=True))) == a).all()
    b = np.asarray(Image.open(img_io.save(a, tmp_path / 'y')).convert('RGBA'))
    assert (b[..., 3] == a[..., 3]).all()               # edges and holes exactly where they were


def test_find_prefers_webp_then_png_then_names_the_missing_file(tmp_path):
    Image.fromarray(rgba()).save(tmp_path / 'rest.png')
    assert img_io.find(tmp_path / 'rest.png').name == 'rest.png'
    img_io.save(rgba(), tmp_path / 'rest.png', lossless=True)
    assert img_io.find(tmp_path / 'rest.png').name == 'rest.webp'
    assert img_io.find(tmp_path / 'map.png') == tmp_path / 'map.png'


def test_the_app_setting_is_the_q70_the_ladder_picked_with_the_alpha_lossless():
    assert img_io.WEBP['quality'] == 70 and img_io.WEBP['alpha_quality'] == 100 and img_io.WEBP['exact']


def test_a_lossy_save_puts_edge_colour_under_the_alpha_and_leaves_the_alpha_alone():
    a = rgba()
    out = img_io.edge_bleed(a, band=2)
    assert (out[..., 3] == a[..., 3]).all()
    assert tuple(out[20, 6, :3]) == (200, 120, 60)      # 2 px outside the edge: the edge's colour
    assert tuple(out[20, 2, :3]) == (0, 0, 0)           # further out: left as it was
