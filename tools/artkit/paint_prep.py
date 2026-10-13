"""A painted cutout -> the two inputs of the figure route (comic-look, 2026-10-13).

  python3 paint_prep.py CUTOUT_RGBA.png OUT_PREFIX [--size 2048]
writes OUT_PREFIX_rgba.png  the figure cropped to its alpha, for Hunyuan3D-Omni (shape)
       OUT_PREFIX_paint.png the same picture with the background filled by the figure's own colours, for
                            blender/paint_front.py: the mesh's sides sample those instead of the drawn outline
                            (an 8 px ring of the outline is dropped before the colour spreads outward)
"""
import argparse

import cv2
import numpy as np
from PIL import Image

OUTLINE_PX = 8          # drawn contour width to leave out of the bleed, at 2048 px
INPAINT_SCALE = 0.25    # the fill is smooth, so it is computed on a quarter-size copy


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("cutout")
    ap.add_argument("prefix")
    ap.add_argument("--size", type=int, default=2048)
    a = ap.parse_args()

    im = Image.open(a.cutout).convert("RGBA")
    bbox = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    if not bbox:
        raise SystemExit(f"{a.cutout}: no figure (alpha is empty)")
    im = im.crop(bbox)
    scale = a.size / max(im.size)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    im.save(f"{a.prefix}_rgba.png")

    arr = np.asarray(im)
    rgb, alpha = np.ascontiguousarray(arr[..., :3]), arr[..., 3]
    ring = OUTLINE_PX * 2 + 1
    inner = cv2.erode((alpha > 128).astype(np.uint8), np.ones((ring, ring), np.uint8))
    small = cv2.resize(rgb, None, fx=INPAINT_SCALE, fy=INPAINT_SCALE, interpolation=cv2.INTER_AREA)
    holes = cv2.resize((1 - inner) * 255, (small.shape[1], small.shape[0]), interpolation=cv2.INTER_NEAREST)
    fill = cv2.inpaint(small, holes.astype(np.uint8), 6, cv2.INPAINT_TELEA)
    fill = cv2.resize(fill, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC)
    paint = np.where((alpha > 128)[..., None], rgb, fill)
    Image.fromarray(paint).save(f"{a.prefix}_paint.png")
    print(f"PREP ok {a.prefix}_rgba.png {a.prefix}_paint.png {im.size}")


if __name__ == "__main__":
    main()
