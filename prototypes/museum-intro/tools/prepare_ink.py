"""Hand-drawn ink tiles (ChatGPT line passes, black ink on white) -> 1024 px greyscale webp for the shaders.
The generated squares are only nearly seamless: each is levelled (paper pure white, ink black), then made periodic
by handing over to its half-offset copy inside a thin band at the seams.
Usage: python3 tools/prepare_ink.py <src_dir> <out_dir> name1 name2 ...   (name:raw = a whole drawing, not a tile)"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SIZE = 1024
BAND = 0.06  # fraction of the tile at each seam that is repaired


def seamless(a):
    h, w = a.shape
    rolled = np.roll(np.roll(a, w // 2, axis=1), h // 2, axis=0)
    yy, xx = np.mgrid[0:h, 0:w]
    dx = np.minimum(xx, w - 1 - xx) / w
    dy = np.minimum(yy, h - 1 - yy) / h
    # at the border take the half-offset copy (its seam sits in the middle), fading to the tile inside the band;
    # each side is lifted towards paper rather than averaged, so lines thin out instead of doubling as grey ghosts
    wgt = np.clip(1 - np.minimum(dx, dy) / BAND, 0, 1)
    return np.clip(np.minimum(a + wgt, rolled + (1 - wgt)), 0, 1)


def level(a):
    lo, hi = np.percentile(a, 1), np.percentile(a, 60)  # most of the tile is paper
    return np.clip((a - lo) / max(1e-3, hi - lo), 0, 1)


src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for arg in sys.argv[3:]:
    name, _, flag = arg.partition(':')
    im = Image.open(src / f'{name}.png').convert('L').resize((SIZE, SIZE), Image.LANCZOS)
    a = level(np.asarray(im, dtype=np.float32) / 255)
    if flag != 'raw':
        a = seamless(a)
    Image.fromarray((a * 255).astype(np.uint8)).save(out / f'{name}.webp', quality=88)
    print(out / f'{name}.webp', f'ink {(a < 0.5).mean():.1%}')
