"""Region edit: redraw ONE character inside a box with a reference sheet, paste back with a soft edge.
A whole-panel Qwen edit with a character sheet turns every figure into that character (2026-09-29);
limiting the edit to a box leaves everyone else untouched.

usage: python3 patch.py <panel.png> <ref.png> <prompt.txt> --box x0 y0 x1 y1 (fractions) [--scale 2] [--seed 1] -o OUT.png
"""
import argparse
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import passes

PAD = 0.35       # context around the box, as a fraction of the box size: the model needs to see the scene
FEATHER = 0.04   # soft edge of the paste mask, as a fraction of the box's short side


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("panel", type=Path)
    ap.add_argument("ref", type=Path)
    ap.add_argument("prompt_file", type=Path)
    ap.add_argument("--box", type=float, nargs=4, required=True)
    ap.add_argument("--scale", type=float, default=2.0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()

    im = Image.open(a.panel).convert("RGB")
    im = im.resize((round(im.width * a.scale), round(im.height * a.scale)), Image.LANCZOS)
    W, H = im.size
    x0, y0, x1, y1 = a.box[0] * W, a.box[1] * H, a.box[2] * W, a.box[3] * H
    px, py = (x1 - x0) * PAD, (y1 - y0) * PAD
    crop = tuple(round(v) for v in (max(0, x0 - px), max(0, y0 - py), min(W, x1 + px), min(H, y1 + py)))

    tmp = Path(tempfile.mkdtemp())
    src = tmp / f"{a.panel.stem}_crop.png"
    im.crop(crop).save(src)
    edited = passes.run("patch", src, a.prompt_file.read_text(), a.ref, tmp, 1.0, a.seed, ref_mp=1.0)
    size = (crop[2] - crop[0], crop[3] - crop[1])
    patch = Image.open(edited).convert("RGB").resize(size, Image.LANCZOS)

    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rectangle((x0 - crop[0], y0 - crop[1], x1 - crop[0], y1 - crop[1]), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(min(x1 - x0, y1 - y0) * FEATHER))
    im.paste(patch, crop[:2], mask)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    im.save(a.out)
    print("done", a.out.name)


if __name__ == "__main__":
    main()
