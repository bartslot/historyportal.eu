"""Cut a foreground layer out of a painted plate with the Blender depth pass: every pixel nearer than SPLIT metres
becomes an opaque cut-out, the rest transparent. Placed above the character sprites, it lets a figure walk out from
behind a street corner, a table or a fern (Bart, 2026-09-28: masks, depth). The plate stays whole underneath.
usage: python3 foreground.py <plate_id> <pack/shot> <split_m> [--feather 1.5]
  -> panels/<plate_id>__fg<split>.png (RGBA, plate size) + a check image with the cut-out tinted"""
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

PACKS = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/Dante/packs")
PANELS = PACKS.parent / "comic" / "panels"
DEPTH_MAX = 200.0   # hp1lib.DEPTH_MAX


def depth_m(path, size):
    """_depth.png is written through the sRGB display transform: decode to linear, then metres."""
    v = np.asarray(Image.open(path)).astype(np.float64) / 65535.0
    lin = np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)
    m = Image.fromarray((lin * DEPTH_MAX).astype(np.float32), mode="F").resize(size, Image.BILINEAR)
    return np.asarray(m)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("plate"); ap.add_argument("shot"); ap.add_argument("split", type=float)
    ap.add_argument("--feather", type=float, default=1.5)
    ap.add_argument("--region", help="x0,y0,x1,y1 in plate pixels: only this occluder (the painter may have moved others)")
    ap.add_argument("--keep-floor", action="store_true", help="by default the floor stays in the plate: feet stand on it")
    a = ap.parse_args()
    plate = Image.open(PANELS / (a.plate + ".png")).convert("RGB")
    d = depth_m(PACKS / (a.shot + "_depth.png"), plate.size)
    near = d < a.split
    if not a.keep_floor:   # the Blender part mask: floor = pure red
        m = np.asarray(Image.open(PACKS / (a.shot + "_mask.png")).convert("RGB").resize(plate.size, Image.NEAREST))
        near &= ~((m[..., 0] > 200) & (m[..., 1] < 60) & (m[..., 2] < 60))
    if a.region:
        x0, y0, x1, y1 = (int(v) for v in a.region.split(","))
        box = np.zeros_like(near); box[y0:y1, x0:x1] = True
        near &= box
    alpha = Image.fromarray((near * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(a.feather))
    fg = plate.copy(); fg.putalpha(alpha)
    out = PANELS / ("%s__fg%g.png" % (a.plate, a.split))
    fg.save(out)
    check = Image.blend(plate, Image.new("RGB", plate.size, (255, 0, 160)), 0.0)
    tint = Image.composite(Image.blend(plate, Image.new("RGB", plate.size, (255, 0, 160)), 0.45), plate, alpha)
    tint.save(out.with_name(out.stem + "_check.jpg"), quality=88)
    print(out, "covers %.1f%%" % (100 * np.asarray(alpha).mean() / 255))


if __name__ == "__main__":
    main()
