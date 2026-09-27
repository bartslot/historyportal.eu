"""Place a reusable asset (character/prop) into a finished background at its Blender distance.

The asset master is never modified. At placement it gets:
  scale  - from the shot camera: height_px = focal_px * height_m / distance_m (the hp1 camera file)
  lines  - the same distance -> ink treatment as the background (depth_lines.far_fraction / ink_opacity),
           AFTER the natural thinning that downscaling already gives (a 4 px stroke at 1/4 size is ~1 px)

cutout: the background is removed by flood-filling from the image border (connected paper only), so light
areas inside the figure (a white coif, a shirt) stay opaque. Never "remove every white pixel".

usage:
  python3 asset_place.py cutout <sheet.png> --box x0,y0,x1,y1 -o master.png
  python3 asset_place.py place <background.png> <camera.json> <master.png> --at x,y,z --height 1.72 -o out.png [--no-depth]
      x,y,z in metres (Blender axes: x right, y forward, z up); feet are anchored at (x, y, z)
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

import depth_lines as dl

ATMOS = 0.55          # share of the way to paper colour a figure fades at FAR_M (matches the washed-out far street)
SHADOW_ALPHA = 110
PAPER_TOL = 38          # colour distance to the corner paper colour that still counts as paper
FEATHER_PX = 1


def cutout(sheet: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    crop = sheet.convert("RGB").crop(box)
    w, h = crop.size
    work = crop.copy()
    sentinel = (255, 0, 255)
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        ImageDraw.floodfill(work, seed, sentinel, thresh=PAPER_TOL)
    bg = np.all(np.asarray(work) == sentinel, axis=2)
    alpha = Image.fromarray(((~bg) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(FEATHER_PX))
    out = crop.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getbbox())


def project(cam: dict, p: tuple[float, float, float]) -> tuple[float, float, float]:
    """World point -> (u, v, distance) with the shot's pinhole camera (same model as the depth ray-cast)."""
    from_deg = [math.radians(a) for a in cam["camera_rotation_deg"]]
    cx_, sx_ = math.cos(from_deg[0]), math.sin(from_deg[0])
    cy_, sy_ = math.cos(from_deg[1]), math.sin(from_deg[1])
    cz_, sz_ = math.cos(from_deg[2]), math.sin(from_deg[2])
    # Blender XYZ Euler: R = Rz @ Ry @ Rx
    rx = np.array([[1, 0, 0], [0, cx_, -sx_], [0, sx_, cx_]])
    ry = np.array([[cy_, 0, sy_], [0, 1, 0], [-sy_, 0, cy_]])
    rz = np.array([[cz_, -sz_, 0], [sz_, cz_, 0], [0, 0, 1]])
    R = rz @ ry @ rx
    d = np.array(p) - np.array(cam["camera_location_m"])
    c = R.T @ d                      # camera space: x right, y up, -z forward
    W, H = cam["resolution"]; f = cam["focal_px"]
    u = W / 2 + f * c[0] / -c[2]
    v = H / 2 + cam["shift_y"] * W - f * c[1] / -c[2]
    return u, v, float(np.linalg.norm(d))


def place(bg: Image.Image, cam: dict, master: Image.Image, at: tuple[float, float, float], height_m: float,
          depth_lines: bool = True, shadow: bool = True) -> Image.Image:
    W, _ = cam["resolution"]
    k = bg.width / W                                     # background may be upscaled
    u, v, dist = project(cam, at)
    _, v_head, _ = project(cam, (at[0], at[1], at[2] + height_m))
    h_px = max(1, int(round((v - v_head) * k)))
    fig = master.resize((max(1, round(master.width * h_px / master.height)), h_px), Image.LANCZOS)
    if depth_lines:
        t = float(dl.far_fraction(np.array([dist]))[0])
        rgb = np.asarray(fig.convert("RGB"), dtype=np.float32)
        paper = np.percentile(np.asarray(bg.convert("RGB"), dtype=np.float32).reshape(-1, 3), 97, axis=0)
        lum = rgb.mean(axis=2, keepdims=True)
        w_ink = np.clip((dl.INK_HI - lum) / (dl.INK_HI - dl.INK_LO), 0, 1)
        rgb = rgb + (paper - rgb) * (1.0 - float(dl.ink_opacity(np.array([t]))[0])) * w_ink   # ink: same as the background
        rgb = rgb + (paper - rgb) * ATMOS * t                                                 # colour: atmospheric fade
        fig = Image.merge("RGBA", (*Image.fromarray(rgb.clip(0, 255).astype(np.uint8)).split(), fig.getchannel("A")))
    out = bg.convert("RGBA")
    x0, y0 = int(round(u * k - fig.width / 2)), int(round(v * k - fig.height))
    if shadow:
        out.alpha_composite(contact_shadow(fig.width, h_px), (x0 - fig.width // 4, y0 + fig.height - max(2, h_px // 40)))
    out.alpha_composite(fig, (x0, y0))
    return out.convert("RGB")


def contact_shadow(fig_w: int, h_px: int) -> Image.Image:
    """Soft grey-brown ellipse under the feet, so a placed figure stands instead of floats."""
    w, h = int(fig_w * 1.5), max(4, h_px // 18)
    sh = Image.new("RGBA", (w, h * 3), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((w * 0.1, h, w * 0.9, h * 2), fill=(70, 55, 40, SHADOW_ALPHA))
    return sh.filter(ImageFilter.GaussianBlur(max(1, h // 2)))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cutout"); c.add_argument("sheet", type=Path); c.add_argument("--box", required=True)
    c.add_argument("-o", "--out", type=Path, required=True)
    p = sub.add_parser("place"); p.add_argument("bg", type=Path); p.add_argument("camera", type=Path)
    p.add_argument("master", type=Path); p.add_argument("--at", required=True); p.add_argument("--height", type=float, required=True)
    p.add_argument("--no-depth", action="store_true"); p.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()
    if a.cmd == "cutout":
        res = cutout(Image.open(a.sheet), tuple(int(x) for x in a.box.split(",")))
    else:
        res = place(Image.open(a.bg), json.loads(a.camera.read_text()), Image.open(a.master),
                    tuple(float(x) for x in a.at.split(",")), a.height, not a.no_depth)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    res.save(a.out)
    print(a.out)


if __name__ == "__main__":
    main()
