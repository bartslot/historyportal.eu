"""Close-up plates cut from a converted wide/medium shot, so perspective and drawing style match.

A crop of a shot is exactly what a longer lens sees from the same camera position. The head
position comes from the source shot's camera file (Blender), so the crop lands on the character.
usage: python3 plates.py <packs_dir> [--source-kind final|lines]
"""
import json, math, os, subprocess, sys
from PIL import Image
import numpy as np

UPSCAYL = os.environ.get("UPSCAYL", "/Applications/Upscayl.app/Contents/Resources/bin/upscayl-bin")   # render PC: /opt/upscayl/bin/upscayl-bin
# plate: (pack, source shot, character, zoom, where the head sits: 'left'|'centre'|'right' third)
PLATES = [
    ("study", "st01_wide_front", "dante_seated", 3.0, "centre", "st04_cu_dante"),
    ("study", "st02_profile", "dante_seated", 2.0, "right", "st05_mcu_dante"),
    ("street", "sr03_ots_dante", "beatrice", 2.5, "right", "sr04_cu_beatrice"),
    ("street", "sr01_wide_street", "dante", 3.0, "left", "sr05_cu_dante"),
    ("street", "sr02_notice_wall", "guido", 2.5, "left", "sr06_cu_guido"),
    ("priors", "pr01_wide_room", "prior_speaker", 2.2, "centre", "pr03_ms_speaker"),
    ("priors", "pr01_wide_room", "dante", 2.6, "right", "pr04_cu_dante"),
    ("priors", "pr01_wide_room", "prior_speaker", 1.8, "left", "pr05_two_shot"),
]


def project(cam, p):
    """World point → pixel in the source shot (camera looks along its local -Z, yaw/pitch from the file)."""
    rx, ry, rz = (math.radians(a) for a in cam["camera_rotation_deg"])
    # camera basis for rotation_euler XYZ
    def rot(v):
        x, y, z = v
        y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
        x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)
        x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)
        return x, y, z
    right, up, back = rot((1, 0, 0)), rot((0, 1, 0)), rot((0, 0, 1))
    d = [p[i] - cam["camera_location_m"][i] for i in range(3)]
    xc = sum(d[i] * right[i] for i in range(3)); yc = sum(d[i] * up[i] for i in range(3)); zc = -sum(d[i] * back[i] for i in range(3))
    W, H = cam["resolution"]; f = cam["focal_px"]
    return W / 2 + f * xc / zc, H / 2 - f * yc / zc + cam["shift_y"] * W    # shift_y < 0 lifts the horizon


def main():
    root = sys.argv[1]
    kind = sys.argv[sys.argv.index("--source-kind") + 1] if "--source-kind" in sys.argv else "final"
    for pack, src, who, zoom, third, out in PLATES:
        cam = json.load(open(os.path.join(root, pack, src + "_camera.json")))
        fig = cam["figures"].get(who)
        path = os.path.join(root, pack, "final", src + ".png") if kind == "final" else os.path.join(root, pack, src + "_lines.png")
        if not fig or not os.path.exists(path):
            print("skip", out, "(no source yet)" if fig else "(figure %s not in %s)" % (who, src)); continue
        im = Image.open(path).convert("L")
        sx = im.width / cam["resolution"][0]
        hx, hy = project(cam, fig["head_m"])
        hx, hy = hx * sx, hy * sx
        cw, ch = im.width / zoom, im.height / zoom
        fx = {"left": 1 / 3, "centre": 0.5, "right": 2 / 3}[third]
        x0 = min(max(hx - cw * fx, 0), im.width - cw)
        y0 = min(max(hy - ch * 0.38, 0), im.height - ch)       # eyes a bit above the middle
        crop = im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch)))
        dst = os.path.join(root, pack, "final" if kind == "final" else "preview", out + ".png")
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        tmp = dst + ".src.png"; crop.save(tmp)
        scale = "4" if zoom > 2 else "2"
        r = subprocess.run([UPSCAYL, "-i", tmp, "-o", dst, "-s", scale, "-m", "../models", "-n", "digital-art-4x", "-f", "png"], capture_output=True)
        os.remove(tmp)
        if r.returncode or not os.path.exists(dst):
            print("FAILED", out); continue
        a = np.asarray(Image.open(dst).convert("L").resize((2560, 1440), Image.LANCZOS))
        Image.fromarray(np.where(a >= 235, 255, a).astype("uint8")).save(dst)
        print("ok", pack, out, "from", src, "head px", int(hx), int(hy))


main()
