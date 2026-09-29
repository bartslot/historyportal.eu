"""Let a walk-cycle sprite walk through a finished background, cel-animation style.

Timing (research_2026-09-27_1850_ghibli-walk-animation-techniques): 8 drawings per cycle, played ON THREES at
24 fps (a new drawing every 3 frames = 8 drawings/s), one cycle = 1.4 m (two steps of a grown man, ~1.4 m/s).
The background holds; the figure moves along a path in metres (the "fixed camera, cels shift" method).
Each frame reuses asset_place: size from the shot camera, the same distance ink fade as the background, contact
shadow. The position advances per DRAWING, not per frame, like cels on an animation stand.

usage:
  python3 walk_street.py <background.png> <camera.json> <frames_dir> --start x,y --end x,y -o out.webm [--height 1.72]
  frames_dir holds frame_0.png .. frame_7.png (RGBA masters, feet at the bottom edge)
"""
from __future__ import annotations

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

import asset_place as ap

FPS = 24
HOLD = 3                 # on threes
DRAWINGS = 8
CYCLE_M = 1.4
OUT_W = 1920             # lesson display width


def main() -> None:
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("bg", type=Path); a.add_argument("camera", type=Path); a.add_argument("frames", type=Path)
    a.add_argument("--start", required=True); a.add_argument("--end", required=True)
    a.add_argument("--height", type=float, default=1.72)
    a.add_argument("-o", "--out", type=Path, required=True)
    args = a.parse_args()

    cam = json.loads(args.camera.read_text())
    bg = Image.open(args.bg).convert("RGB")
    k = OUT_W / bg.width
    bg = bg.resize((OUT_W, round(bg.height * k) // 2 * 2), Image.LANCZOS)   # even height: H.264 needs it
    masters = [Image.open(args.frames / f"frame_{i}.png").convert("RGBA") for i in range(DRAWINGS)]
    (x0, y0), (x1, y1) = (tuple(float(v) for v in s.split(",")) for s in (args.start, args.end))
    dist = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
    n_draw = max(1, round(dist / (CYCLE_M / DRAWINGS)))

    with tempfile.TemporaryDirectory() as tmp:
        f = 0
        for d in range(n_draw + 1):
            t = d / n_draw
            at = (x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0.0)
            img = ap.place(bg, cam, masters[d % DRAWINGS], at, args.height)
            for _ in range(HOLD):
                img.save(Path(tmp) / f"f{f:05d}.png"); f += 1
        args.out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(Path(tmp) / "f%05d.png"),
                        "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-pix_fmt", "yuv420p", str(args.out)], check=True)
    print(f"{args.out}  {n_draw + 1} drawings, {f} frames, {f / FPS:.1f} s")


if __name__ == "__main__":
    main()
