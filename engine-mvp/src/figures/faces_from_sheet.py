"""Cut the 8 expression decals from the generated face sheet (Figma generate_image, gpt-image-2.5-sunburst,
4 x 2 cells on white; the sheet lives in ~/BartsMedia/historyportal/topics/autonomous-lessons/s3-figures/faces/).

Each cell: white keyed to alpha, the two pupils found as the darkest blobs, the mouth as the ink below them; then
an affine fit puts the pupils at (30%, 38%) and (70%, 38%) and the mouth at (50%, 80%) of a 512 px square: the
layout the head-bone projector expects (figure.ts FACE). Only alpha is used (the shader inks with its own colour).

Run: python3 -I src/figures/faces_from_sheet.py <sheet.png> public/figures/faces/
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = ["neutral", "happy", "worried", "surprised", "sad", "angry", "proud", "tired"]
OUT = 512
EYE_L, EYE_R, MOUTH = (0.30, 0.38), (0.70, 0.38), (0.50, 0.80)
INK = (43, 36, 32)


def cut(cell: np.ndarray) -> Image.Image:
    grey = cell.mean(axis=2)
    alpha = np.clip((238.0 - grey) / 150.0, 0, 1)
    lab, n = ndimage.label(grey < 90)
    sizes = ndimage.sum(np.ones_like(grey), lab, range(1, n + 1))
    if n < 2:
        raise SystemExit("cell without two pupils")
    pupils = sorted(np.argsort(sizes)[-2:] + 1, key=lambda i: ndimage.center_of_mass(grey < 90, lab, i)[1])
    (ly, lx), (ry, rx) = (ndimage.center_of_mass(grey < 90, lab, i) for i in pupils)
    eye_y = (ly + ry) / 2
    below = alpha.copy()
    below[: int(eye_y + 0.22 * (rx - lx) + 10)] = 0  # skip the lower lids
    ys, xs = np.nonzero(below > 0.3)
    if len(ys) == 0:
        raise SystemExit("cell without a mouth")
    my = ys.mean()
    # source -> target: x by the eye distance, y by the eye-to-mouth distance
    sx = (EYE_R[0] - EYE_L[0]) * OUT / (rx - lx)
    sy = (MOUTH[1] - EYE_L[1]) * OUT / (my - eye_y)
    cx = (lx + rx) / 2
    # PIL affine maps OUTPUT -> INPUT: x_in = (x_out - X0) / sx + cx, y_in = (y_out - Y0) / sy + eye_y
    x0, y0 = 0.5 * OUT, EYE_L[1] * OUT
    a = Image.fromarray((alpha * 255).astype(np.uint8))
    a = a.transform((OUT, OUT), Image.AFFINE, (1 / sx, 0, cx - x0 / sx, 0, 1 / sy, eye_y - y0 / sy), resample=Image.BICUBIC)
    out = Image.new("RGBA", (OUT, OUT), INK + (0,))
    out.putalpha(a)
    return out


def main(sheet: str, out_dir: str) -> None:
    im = np.asarray(Image.open(sheet).convert("RGB")).astype(np.float32)
    h, w = im.shape[:2]
    cw, ch = w // 4, h // 2
    for i, name in enumerate(NAMES):
        r, c = divmod(i, 4)
        cut(im[r * ch:(r + 1) * ch, c * cw:(c + 1) * cw]).save(f"{out_dir.rstrip('/')}/{name}.png")
        print("wrote", name)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
