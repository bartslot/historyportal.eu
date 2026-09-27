"""Finish converted drawings: Upscayl 'digital-art' 2x, then paper to pure white.

Bart converts <pack>/<shot>_lines.png in Figma (Nano Banana 2) and saves the result as
<pack>/converted/<shot>.(jpg|png). This writes <pack>/final/<shot>.png (2x, 5120 px wide).
usage: python3 finish.py <packs_dir> [--force]
"""
import glob, os, subprocess, sys
from PIL import Image
import numpy as np

UPSCAYL = "/Applications/Upscayl.app/Contents/Resources/bin/upscayl-bin"
MODEL = "digital-art-4x"        # Upscayl's "Digital Art" model; -s 2 gives 2x
PAPER = 235                     # pixels this light become pure white (removes paper texture)

root = sys.argv[1]
force = "--force" in sys.argv
done = 0
for src in sorted(glob.glob(os.path.join(root, "*", "converted", "*"))):
    if not src.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        continue
    pack_dir = os.path.dirname(os.path.dirname(src))
    shot = os.path.splitext(os.path.basename(src))[0]
    out = os.path.join(pack_dir, "final", shot + ".png")
    if os.path.exists(out) and not force:
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + ".up.png"
    r = subprocess.run([UPSCAYL, "-i", src, "-o", tmp, "-s", "2", "-m", "../models", "-n", MODEL, "-f", "png"],
                       capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(tmp):
        print("FAILED", src, r.stderr[-300:]); continue
    im = Image.open(tmp).convert("L")
    src_w = Image.open(src).width
    if im.width < src_w * 1.5:  # a real upscale is always bigger; Upscayl can exit 0 with a blank frame
        print("FAILED (not upscaled)", src); os.remove(tmp); continue
    a = np.asarray(im).astype(np.int16)
    a = np.where(a >= PAPER, 255, a).astype(np.uint8)
    Image.fromarray(a).save(out, optimize=True)
    os.remove(tmp)
    done += 1
    print("ok", os.path.relpath(out, root), Image.open(out).size)
print(done, "finished")
