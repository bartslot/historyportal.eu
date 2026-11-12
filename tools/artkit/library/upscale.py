"""Sharpen a bundle's pictures for the stage: 4x Real-ESRGAN (the engine inside Upscayl.app), colour kept.

    python3 upscale.py <bundle> [--only id ...] [--dry-run]

Why (Bart 11-12, a steppe scene: "backgrounds look very blurry/unsharp"): a ground picture of 1678 px is spread over
the whole floor, so near the camera each pixel is blown up 5 to 10 times; a close-up bust of 400 px fills the frame.
What: grounds, backgrounds, middle strips, props and close-up busts (fig-*-bust-*). Skies stay (soft on purpose),
full figures stay (small on screen). The model's own colour drifts a little, so the result keeps the upscale's
detail and the original's colour (low frequencies from the original, high from the upscale). Alpha is resized on
its own. Long side capped (GPU texture limits, and school bandwidth). Originals go to library/_backup/upscale-<bundle>/,
and library.json gets the new w/h; anchors are fractions, so they hold. A picture already larger than the cap is skipped.
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from gen import LIBRARY

UPSCAYL = Path('/Applications/Upscayl.app/Contents/Resources')
MODEL = 'high-fidelity-4x'   # keeps paper grain and watercolour; digital-art-4x smooths it away
CAP = {'ground': 6144}       # long side in px; everything else 4096
CAP_DEFAULT = 4096
COLOUR_BLUR = 6              # px at the new size: below this the detail is the upscale's, above it the original's colour
QUALITY = 82


def wanted(a: dict) -> bool:
    if a['id'].endswith('-l'):   # a mirrored twin is redrawn from its right-facing picture
        return False
    if a['layer'] == 'figure':
        return '-bust' in a['id']
    return a['layer'] != 'sky'


def colour_kept(orig: Image.Image, up: Image.Image) -> Image.Image:
    base = orig.resize(up.size, Image.BICUBIC)
    f = lambda im: np.asarray(im.filter(ImageFilter.GaussianBlur(COLOUR_BLUR)), dtype=np.float32)
    out = np.asarray(up, dtype=np.float32) - f(up) + f(base)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def upscale(src: Path, cap: int, tmp: Path) -> Image.Image:
    im = Image.open(src).convert('RGBA')
    rgb, alpha = im.convert('RGB'), im.getchannel('A')
    rgb.save(tmp / 'in.png')
    subprocess.run([str(UPSCAYL / 'bin/upscayl-bin'), '-i', str(tmp / 'in.png'), '-o', str(tmp / 'out.png'),
                    '-m', str(UPSCAYL / 'models'), '-n', MODEL, '-s', '4'], check=True, capture_output=True)
    up = colour_kept(rgb, Image.open(tmp / 'out.png').convert('RGB'))
    k = min(1.0, cap / max(up.size))
    size = (round(up.width * k), round(up.height * k))
    out = up.resize(size, Image.LANCZOS).convert('RGBA')
    out.putalpha(alpha.resize(size, Image.LANCZOS))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('bundle')
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    root = LIBRARY / a.bundle
    lib_path = root / 'library.json'
    lib = json.loads(lib_path.read_text())
    assets = lib['assets'] if isinstance(lib, dict) else lib
    backup = LIBRARY / '_backup' / f'upscale-{a.bundle}'
    todo = [x for x in assets if wanted(x) and (not a.only or x['id'] in a.only)]
    with tempfile.TemporaryDirectory() as t:
        for x in todo:
            cap = CAP.get(x['layer'], CAP_DEFAULT)
            if max(x['w'], x['h']) * 1.5 > cap:
                print(f"  {x['id']}: {x['w']}x{x['h']} already near the cap, kept")
                continue
            src = root / x['file']
            if a.dry_run:
                print(f"  {x['id']}: {x['w']}x{x['h']} would be upscaled")
                continue
            backup.mkdir(parents=True, exist_ok=True)
            if not (backup / src.name).exists():
                shutil.copy2(src, backup / src.name)
            im = upscale(backup / src.name, cap, Path(t))
            im.save(src, 'WEBP', quality=QUALITY, method=6)
            for f in (src.with_name(src.stem + '-l.webp'),):   # a figure's mirrored twin
                if f.exists():
                    if not (backup / f.name).exists():
                        shutil.copy2(f, backup / f.name)
                    im.transpose(Image.FLIP_LEFT_RIGHT).save(f, 'WEBP', quality=QUALITY, method=6)
            print(f"  {x['id']}: {x['w']}x{x['h']} -> {im.width}x{im.height}", flush=True)
            for y in assets:
                if y['id'] in (x['id'], x['id'] + '-l'):
                    y['w'], y['h'] = im.width, im.height
            lib_path.write_text(json.dumps(lib, indent=1, ensure_ascii=False))   # after each: a stop loses nothing


if __name__ == '__main__':
    main()
