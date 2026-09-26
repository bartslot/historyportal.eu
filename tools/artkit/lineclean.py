#!/usr/bin/env python3
"""Clean fal line art into library assets (Pillow only).

  lineclean.py plate  IN OUT                     levels + hollow fills, RGB on white
  lineclean.py cutout IN OUT [--margin 24]       same, outside made transparent, cropped (RGBA)
  lineclean.py slice  IN OUTDIR ROWS COLS [--mode auto|grid] [--inset 0.02]
                                                 one crop per figure -> cell_0.png .. (auto falls
                                                 back to equal cells when the figure count is off)
"""
import argparse
import os
import re
import sys
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageFilter

BLACK_POINT = 40
WHITE_POINT = 215
DARK = 100          # below this a pixel counts as ink
FILL_KERNEL = 9     # a pixel whose whole 9x9 neighbourhood is ink sits inside a solid fill
PAPER = 235         # at or above this a pixel counts as paper for the outside flood fill

# auto slicing: find one ink blob per figure, whatever grid the model actually drew
BLOB_INK = 200      # below this (after levels) a pixel is ink
BLOB_SCALE = 4      # components are found on a 1/4 copy, for speed
BLOB_JOIN = 0.01    # dilation radius as a fraction of sheet width: joins a figure's separate strokes (1.5% merged two Dante poses)
BLOB_MIN = 0.005    # blobs under this fraction of the sheet area are not figures on their own
BLOB_ATTACH = 0.08 # ...but join the nearest figure within this fraction of the sheet width
LINE_ASPECT = 20    # a blob this elongated is a stray border line, not a figure
RULE_LENGTH = 0.3   # a straight ink run longer than this fraction of the sheet is a frame line


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


def ink_blobs(img):
    """Connected ink blobs on a dilated 1/BLOB_SCALE mask: (bbox, cx, cy, pixel set) per figure-sized blob."""
    ink = levels(img).point(lambda v: 255 if v < BLOB_INK else 0)
    sw, sh = max(1, img.width // BLOB_SCALE), max(1, img.height // BLOB_SCALE)
    small = drop_rules(ink.resize((sw, sh), Image.BOX).point(lambda v: 255 if v > 0 else 0))
    for _ in range(max(1, round(BLOB_JOIN * sw))):
        small = small.filter(ImageFilter.MaxFilter(3))
    blobs, minor = [], []
    for pixels in components(small.tobytes(), sw, sh):
        xs = [i % sw for i in pixels]
        ys = [i // sw for i in pixels]
        blob = {'bbox': (min(xs), min(ys), max(xs) + 1, max(ys) + 1), 'cx': sum(xs) / len(xs),
                'cy': sum(ys) / len(ys), 'pixels': pixels, 'w': sw}
        if is_line(blob['bbox'], sw, sh):
            continue
        (blobs if len(pixels) >= BLOB_MIN * sw * sh else minor).append(blob)
    return attach(blobs, minor, BLOB_ATTACH * sw)


def attach(blobs, minor, reach):
    """Small pieces (the other birds of a flock, a loose tassel) join the nearest figure within reach."""
    def gap(b, m):
        (x0, y0, x1, y1), (u0, v0, u1, v1) = b['bbox'], m['bbox']
        return max(u0 - x1, x0 - u1, 0) + max(v0 - y1, y0 - v1, 0)

    for m in minor:
        near = min(blobs, key=lambda b: gap(b, m), default=None)
        if near is None or gap(near, m) > reach:
            continue
        near['pixels'] = near['pixels'] + m['pixels']
        near['bbox'] = tuple(f(a, c) for f, a, c in zip((min, min, max, max), near['bbox'], m['bbox']))
    return blobs


def drop_rules(mask):
    """Erase long straight horizontal/vertical ink runs: panel frames and grid lines the model drew anyway."""
    def erase_rows(m):
        w, h = m.size
        data = bytearray(m.tobytes())
        rule = re.compile(rb'\xff{%d,}' % max(2, int(RULE_LENGTH * w)))
        for y in range(h):
            for run in rule.finditer(data, y * w, (y + 1) * w):
                data[run.start():run.end()] = bytes(run.end() - run.start())
        return Image.frombytes('L', m.size, bytes(data))

    rows_clean = erase_rows(mask)
    return erase_rows(rows_clean.transpose(Image.Transpose.TRANSPOSE)).transpose(Image.Transpose.TRANSPOSE)


def components(data, w, h):
    """4-connected components of the non-zero bytes (iterative BFS). Yields a list of flat indices each."""
    seen = bytearray(len(data))
    for start in range(len(data)):
        if not data[start] or seen[start]:
            continue
        seen[start] = 1
        queue, found = deque([start]), []
        while queue:
            i = queue.popleft()
            found.append(i)
            x = i % w
            for j in (i - w, i + w, i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1):
                if 0 <= j < len(data) and data[j] and not seen[j]:
                    seen[j] = 1
                    queue.append(j)
        yield found


def is_line(bbox, w, h):
    bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]
    thin = max(bw, bh) / max(1, min(bw, bh)) > LINE_ASPECT
    border = (bw > 0.9 * w and bh < 0.05 * h) or (bh > 0.9 * h and bw < 0.05 * w)
    return thin or border


def reading_order(blobs, rows, cols):
    """Top band first: sort by centroid y, take the blobs cols at a time, each band left to right."""
    by_y = sorted(blobs, key=lambda b: b['cy'])
    return [b for r in range(rows) for b in sorted(by_y[r * cols:(r + 1) * cols], key=lambda b: b['cx'])]


def blob_crop(img, blob):
    """The blob's box at full resolution; anything outside the blob (a neighbour's stray stroke) is whitened."""
    x0, y0, x1, y1 = blob['bbox']
    w = blob['w']
    mask = Image.new('L', (x1 - x0, y1 - y0), 0)
    for i in blob['pixels']:
        mask.putpixel((i % w - x0, i // w - y0), 255)
    box = tuple(min(v * BLOB_SCALE, lim) for v, lim in zip((x0, y0, x1, y1), (img.width, img.height) * 2))
    crop = img.convert('RGB').crop(box)
    mask = mask.resize(crop.size, Image.NEAREST)
    return Image.composite(crop, Image.new('RGB', crop.size, 'white'), mask)


def slice_sheet(src, outdir, rows, cols, inset, mode='auto'):
    if rows < 1 or cols < 1:
        raise ValueError(f'bad grid {rows}x{cols}')
    if not 0 <= inset < 0.5:
        raise ValueError(f'inset {inset} must be in [0, 0.5)')
    img = Image.open(src)
    img.load()
    os.makedirs(outdir, exist_ok=True)
    if mode == 'auto':
        blobs = ink_blobs(img)
        if len(blobs) == rows * cols:
            for i, blob in enumerate(reading_order(blobs, rows, cols)):
                blob_crop(img, blob).save(os.path.join(outdir, f'cell_{i}.png'), 'PNG')
            return 'auto'
        print(f'lineclean slice: found {len(blobs)} figures for a {rows}x{cols} grid, '
              f'falling back to the equal grid', file=sys.stderr)
    slice_grid(img, outdir, rows, cols, inset)
    return 'grid'


def slice_grid(img, outdir, rows, cols, inset):
    cw, ch = img.width // cols, img.height // rows
    mx, my = round(cw * inset), round(ch * inset)
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
    a.add_argument('--mode', choices=['auto', 'grid'], default='auto')
    args = p.parse_args(argv)

    try:
        if args.cmd == 'plate':
            plate(args.src, args.dst)
        elif args.cmd == 'cutout':
            cutout(args.src, args.dst, max(0, args.margin))
        else:
            slice_sheet(args.src, args.outdir, args.rows, args.cols, args.inset, args.mode)
    except (OSError, ValueError) as e:
        print(f'lineclean {args.cmd}: {e}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
