#!/usr/bin/env python3
"""Face switch drawings from ChatGPT edits of one head (vault topics/character-bones/plan.md, 2.1 and 4.1).

ChatGPT edits a head by repainting a box around what it changed and pasting it back, and the box's skin comes back a shade
lighter or darker: a pale patch round a new mouth. So a switch takes from its edit only what really changed (lines, lips,
lids: more than STRONG levels), grown a little and feathered onto the base head. Tone drift inside the box stays the base's.

In:  SHEET_DIR/head-base.png, SHEET_DIR/face/<group>-<option>.png, SHEET_DIR/face/boxes.json ({group: [y0, y1, x0, x1]}).
Out: SHEET_DIR/face/clean/<group>-<option>.png, the base with only that change on it.

usage: rig_face.py SHEET_DIR
"""
import argparse
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

STRONG = 40      # levels (largest channel): a change this big is drawing; smaller is the pasted box's tone
BOX_REACH = 12   # px a change may reach past its group's box (a raised brow, an open jaw)
SPECK = 1        # opening iterations: lone changed pixels are noise, not drawing
GROW = 6         # px the change is grown, so the edit's own soft edge comes along
FEATHER = 3.0    # px of gaussian falloff at the mask's edge


def change_mask(base: np.ndarray, edit: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    """0..1: where the switch shows its edit. Only strong change, only near its box."""
    y0, y1, x0, x1 = box
    near = np.zeros(base.shape[:2], bool)
    near[max(0, y0 - BOX_REACH):y1 + BOX_REACH, max(0, x0 - BOX_REACH):x1 + BOX_REACH] = True
    strong = (np.abs(edit.astype(int) - base.astype(int)).max(-1) > STRONG) & near
    strong = ndi.binary_opening(strong, iterations=SPECK)
    grown = ndi.binary_dilation(strong, iterations=GROW) & near
    return np.clip(ndi.gaussian_filter(grown.astype(float), FEATHER) * 2, 0, 1) * near


def switch_drawing(base: np.ndarray, edit: np.ndarray, box: tuple[int, int, int, int]) -> np.ndarray:
    """The base head with only the edit's real change on it."""
    m = change_mask(base, edit, box)[..., None]
    return (base * (1 - m) + edit * m).round().astype(np.uint8)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('folder')
    folder = ap.parse_args().folder
    base = np.asarray(Image.open(os.path.join(folder, 'head-base.png')).convert('RGB'))
    with open(os.path.join(folder, 'face', 'boxes.json')) as f:
        boxes = {k: tuple(v) for k, v in json.load(f).items()}
    out_dir = os.path.join(folder, 'face', 'clean')
    os.makedirs(out_dir, exist_ok=True)
    for file in sorted(os.listdir(os.path.join(folder, 'face'))):
        group = file.split('-')[0]
        if not file.endswith('.png') or group not in boxes:
            continue
        edit = np.asarray(Image.open(os.path.join(folder, 'face', file)).convert('RGB').resize(base.shape[1::-1], Image.LANCZOS))
        Image.fromarray(switch_drawing(base, edit, boxes[group])).save(os.path.join(out_dir, file))
        print(f'{file}: clean switch written')


if __name__ == '__main__':
    main()
