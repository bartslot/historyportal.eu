"""Paint Blender sprite frames into a character sprite sheet (phase B test).
Each frame: the transparent Blender render is put on white paper, painted with the same character prompt and
seed (passes.py paint), then cut free again with the Blender alpha (dilated) + near-white keying.
usage: python3 sprites.py <sprite_dir> <prompt.txt> [--seed 7]  -> <dir>/painted/<frame>.png + sheet.png + sheet.json"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

PASSES = Path(__file__).resolve().parent.parent / "passes" / "passes.py"
ORDER = ["idle_0", "idle_1", "walk_0", "walk_1", "walk_2", "walk_3", "startled_0", "startled_1", "startled_2"]
ANIMS = {"idle": {"frames": ["idle_0", "idle_1"], "fps": 1.5, "loop": True},
         "walk": {"frames": ["walk_0", "walk_1", "walk_2", "walk_3"], "fps": 6, "loop": True},
         "startled": {"frames": ["startled_0", "startled_1", "startled_2"], "fps": 4, "loop": False}}
DILATE = 13        # px: the painter's outline sits a little outside the 3D silhouette
WHITE = 236        # >= this on all channels, outside the core silhouette = paper


def paint(frame_png, prompt, seed, out_dir):
    rgba = Image.open(frame_png).convert("RGBA")
    paper = Image.new("RGB", rgba.size, (255, 255, 255)); paper.paste(rgba, mask=rgba.split()[3])
    src = out_dir / (frame_png.stem + "_paper.png"); paper.save(src)
    r = subprocess.run([sys.executable, str(PASSES), "paint", str(src), str(prompt), "--seed", str(seed), "-o", str(out_dir)],
                       capture_output=True, text=True)
    line = (r.stdout.strip().splitlines() or [""])[-1]
    if r.returncode or not line:
        raise SystemExit("paint failed: " + r.stderr[-400:])
    painted = Image.open(out_dir / line.split()[1]).convert("RGB").resize(rgba.size, Image.LANCZOS)
    a3d = rgba.split()[3]
    zone = np.asarray(a3d.filter(ImageFilter.MaxFilter(DILATE))) > 16
    px = np.asarray(painted).astype(int)
    paperish = (px.min(axis=2) >= WHITE)
    # only what the painter actually painted: where the mannequin was hidden under the tunic, the paper stayed
    # white and forcing the 3D silhouette left white ghosts. Small holes (eye whites, highlights) are closed.
    alpha = Image.fromarray((zone & ~paperish).astype(np.uint8) * 255)
    alpha = alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.0))
    cut = painted.copy(); cut.putalpha(alpha)
    cut.save(out_dir / (frame_png.stem + ".png"))
    return cut


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("dir", type=Path); ap.add_argument("prompt", type=Path)
    ap.add_argument("--seed", type=int, default=7); a = ap.parse_args()
    out = a.dir / "painted"; out.mkdir(exist_ok=True)
    frames = [paint(a.dir / (f + ".png"), a.prompt, a.seed, out) for f in ORDER]
    # one shared crop for all frames so the feet stay on the same anchor line
    boxes = [f.split()[3].getbbox() for f in frames]
    x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes); x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
    w, h = x1 - x0, y1 - y0
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for k, f in enumerate(frames):
        sheet.paste(f.crop((x0, y0, x1, y1)), (k * w, 0))
    sheet.save(a.dir / "sheet.png")
    pts = json.load(open(a.dir / "points.json"))["frames"]

    def frac(p):   # render pixels -> fraction of the cropped frame
        return [round((p[0] - x0) / w, 4), round((p[1] - y0) / h, 4)]
    per = {f: {"mouth": frac(pts[f]["mouth_px"]), "head_top": frac(pts[f]["head_top_px"]),
               "feet": frac(pts[f]["feet_px"]), "pose": pts[f].get("pose")} for f in ORDER}
    meta = {"frame_w": w, "frame_h": h, "order": ORDER, "anims": ANIMS, "points": per,
            "note": ("points are fractions of one frame (x right, y down), per frame: mouth = where a text balloon's "
                     "tail points (keep the tip >= 20 px from it at 1920 wide), head_top, feet = the ground anchor. "
                     "All frames share one crop, so feet stay on one line.")}
    json.dump(meta, open(a.dir / "sheet.json", "w"), indent=1)
    print("sheet", sheet.size)


if __name__ == "__main__":
    main()
