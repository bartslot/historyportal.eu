"""Pixel cleanup of painted plates with IOPaint (LaMa, open source, local, free): paint out small wrong details
(pipes, cables, plaques) instead of repainting the whole image. Bart (2026-09-28): cheaper than an AI edit pass,
and an edit prompt that NAMES the pipe draws it bigger.
Masks live in cleanup_masks.json per plate: rects [x0,y0,x1,y1], lines [x0,y0,x1,y1,width], in plate pixels (1936x1088).
usage: python3 cleanup.py plate_id [...]   (keeps <id>_before_cleanup.png once)
IOPaint venv: ~/.venvs/artkit-clean (uv venv -p 3.11; uv pip install iopaint)"""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
PANELS = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/Dante/comic/panels")
IOPAINT = Path.home() / ".venvs/artkit-clean/bin/iopaint"
GROW = 6   # px around each mark: LaMa needs a little clean margin


def mask_for(size, spec):
    m = Image.new("L", size, 0); d = ImageDraw.Draw(m)
    for x0, y0, x1, y1 in spec.get("rects", []):
        d.rectangle([x0 - GROW, y0 - GROW, x1 + GROW, y1 + GROW], fill=255)
    for x0, y0, x1, y1, w in spec.get("lines", []):
        d.line([x0, y0, x1, y1], fill=255, width=w + 2 * GROW)
    return m


def clean(pid, spec):
    src = PANELS / (pid + ".png")
    orig = PANELS / (pid + "_before_cleanup.png")
    if not orig.exists():
        shutil.copy(src, orig)
    im = Image.open(orig).convert("RGB")
    with tempfile.TemporaryDirectory() as t:
        t = Path(t)
        im.save(t / "img.png"); mask_for(im.size, spec).save(t / "mask.png")
        r = subprocess.run([str(IOPAINT), "run", "--model=lama", "--device=cpu", f"--image={t/'img.png'}",
                            f"--mask={t/'mask.png'}", f"--output={t/'out'}"], capture_output=True, text=True)
        outs = list((t / "out").glob("*.png"))
        if r.returncode or not outs:
            raise SystemExit("iopaint failed for %s: %s" % (pid, (r.stderr or r.stdout)[-600:]))
        shutil.copy(outs[0], src)
    print("cleaned", pid)


if __name__ == "__main__":
    specs = json.load(open(HERE / "cleanup_masks.json"))
    for pid in sys.argv[1:] or specs:
        clean(pid, specs[pid])
