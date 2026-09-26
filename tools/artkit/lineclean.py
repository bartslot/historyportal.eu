#!/usr/bin/env python3
"""Clean fal line art into library assets (Pillow only).

  lineclean.py plate  IN OUT                     levels + hollow fills, RGB on white
  lineclean.py cutout IN OUT [--margin 24]       same, outside made transparent, cropped (RGBA)
  lineclean.py slice  IN OUTDIR ROWS COLS [--inset 0.02]   equal cells -> cell_0.png ..
"""
import argparse
import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

BLACK_POINT = 40
WHITE_POINT = 215
DARK = 100          # below this a pixel counts as ink
FILL_KERNEL = 9     # a pixel whose whole 9x9 neighbourhood is ink sits inside a solid fill
PAPER = 235         # at or above this a pixel counts as paper for the outside flood fill


def levels(img):
    """Grayscale, linear stretch between the black and white points. Keeps antialiasing."""
    span = WHITE_POINT - BLACK_POINT
    lut = [0 if v <= BLACK_POINT else 255 if v >= WHITE_POINT else round((v - BLACK_POINT) * 255 / span)
           for v in range(256)]
    return img.convert('L').point(lut)


def hollow(gray):
    """White out the interior of solid black masses, keeping their outline and every thin line."""
    interior = gray.filter(ImageFilter.MaxFilter(FILL_KERNEL)).point(lambda v: 255 if v < DARK else 0)
    return ImageChops.lighter(gray, interior)


def clean(path):
    return hollow(levels(Image.open(path)))


def plate(src, dst):
    clean(src).convert('RGB').save(dst, 'PNG')


def outside_mask(gray):
    """255 where the pixel is paper connected to the image border, else 0."""
    w, h = gray.size
    paper = gray.point(lambda v: 255 if v >= PAPER else 0)
    # A 1px paper frame joins every border pixel, so one seed floods the whole outside.
    framed = Image.new('L', (w + 2, h + 2), 255)
    framed.paste(paper, (1, 1))
    ImageDraw.floodfill(framed, (0, 0), 128, thresh=0)
    return framed.crop((1, 1, w + 1, h + 1)).point(lambda v: 255 if v == 128 else 0)


def cutout(src, dst, margin):
    gray = clean(src)
    alpha = ImageChops.invert(outside_mask(gray))
    box = alpha.getbbox()
    if box is None:
        raise ValueError('image is blank: nothing inside the outside paper')
    rgba = gray.convert('RGBA')
    rgba.putalpha(alpha)
    left, top, right, bottom = box
    w, h = gray.size
    rgba.crop((max(0, left - margin), max(0, top - margin), min(w, right + margin), min(h, bottom + margin))).save(dst, 'PNG')


def slice_grid(src, outdir, rows, cols, inset):
    if rows < 1 or cols < 1:
        raise ValueError(f'bad grid {rows}x{cols}')
    if not 0 <= inset < 0.5:
        raise ValueError(f'inset {inset} must be in [0, 0.5)')
    img = Image.open(src)
    img.load()
    cw, ch = img.width // cols, img.height // rows
    mx, my = round(cw * inset), round(ch * inset)
    os.makedirs(outdir, exist_ok=True)
    for i in range(rows * cols):
        r, c = divmod(i, cols)
        x, y = c * cw, r * ch
        img.crop((x + mx, y + my, x + cw - mx, y + ch - my)).save(os.path.join(outdir, f'cell_{i}.png'), 'PNG')


def main(argv):
    p = argparse.ArgumentParser(prog='lineclean.py')
    sub = p.add_subparsers(dest='cmd', required=True)
    a = sub.add_parser('plate')
    a.add_argument('src')
    a.add_argument('dst')
    a = sub.add_parser('cutout')
    a.add_argument('src')
    a.add_argument('dst')
    a.add_argument('--margin', type=int, default=24)
    a = sub.add_parser('slice')
    a.add_argument('src')
    a.add_argument('outdir')
    a.add_argument('rows', type=int)
    a.add_argument('cols', type=int)
    a.add_argument('--inset', type=float, default=0.02)
    args = p.parse_args(argv)

    try:
        if args.cmd == 'plate':
            plate(args.src, args.dst)
        elif args.cmd == 'cutout':
            cutout(args.src, args.dst, max(0, args.margin))
        else:
            slice_grid(args.src, args.outdir, args.rows, args.cols, args.inset)
    except (OSError, ValueError) as e:
        print(f'lineclean {args.cmd}: {e}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
