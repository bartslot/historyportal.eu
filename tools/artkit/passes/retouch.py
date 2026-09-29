"""Masked retouch with klein: redraw only the white area of a mask, with a character reference and LoRA.
Inpaint Crop crops around the mask, klein redraws it (image 1 = the crop, image 2 = the character), and
Inpaint Stitch puts it back: pixels outside the mask stay as they were (patch.py's box paste left seams).

usage: python3 retouch.py <panel.png> <mask.png | --box x0 y0 x1 y1> <ref.png> <prompt.txt>
                          [--lora tasman_v1.safetensors] [--strength 1.0] [--seed 1] [--steps 4] -o OUT.png
The mask is white where to redraw, black elsewhere, same size as the panel (paint it in ComfyUI's mask
editor or any paint program); --box makes a rectangular one from fractions of the panel.
"""
import argparse
import json
import tempfile
import time
from pathlib import Path

from PIL import Image, ImageDraw

from passes import CLIENT_DIR, cc, resolved


def box_mask(panel, box):
    w, h = Image.open(panel).size
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rectangle((box[0] * w, box[1] * h, box[2] * w, box[3] * h), fill=255)
    path = Path(tempfile.mkdtemp()) / f"{panel.stem}_mask.png"
    mask.convert("RGB").save(path)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("panel", type=Path)
    ap.add_argument("mask", type=Path, nargs="?")
    ap.add_argument("--box", type=float, nargs=4)
    ap.add_argument("--ref", type=Path, required=True)
    ap.add_argument("--prompt", type=Path, required=True)
    ap.add_argument("--lora", default="tasman_v1.safetensors")
    ap.add_argument("--strength", type=float, default=1.0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--steps", type=int, default=4)
    ap.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()
    if not (a.mask or a.box):
        ap.error("give a mask image or --box")
    mask = a.mask or box_mask(a.panel, a.box)

    cfg = resolved(cc.load_config(CLIENT_DIR / "comfy.json"))
    wf, nodes = cc.load_workflow(cfg, "klein4b_retouch")
    values = {"prompt": a.prompt.read_text(), "seed": a.seed, "steps": a.steps,
              "lora": a.lora, "lora_strength": a.strength}
    digest = cc.job_hash(a.panel.read_bytes() + mask.read_bytes() + a.ref.read_bytes(), wf, values)
    cc.ensure_up(cfg)
    t0 = time.monotonic()
    values["image"] = cc.upload(cfg, a.panel, f"{digest[:12]}_src.png")
    values["mask"] = cc.upload(cfg, mask, f"{digest[:12]}_mask.png")
    values["ref"] = cc.upload(cfg, a.ref, f"{digest[:12]}_ref.png")
    images = cc.wait_for(cfg, cc.queue(cfg, cc.patch(wf, nodes, values)))
    a.out.parent.mkdir(parents=True, exist_ok=True)
    a.out.write_bytes(cc.download(cfg, images[0]))
    meta = dict(values, panel=str(a.panel), mask=str(mask), ref=str(a.ref), seconds=round(time.monotonic() - t0, 1))
    a.out.with_suffix(".json").write_text(json.dumps(meta, indent=1))
    print("done", a.out.name, meta["seconds"], "s")


if __name__ == "__main__":
    main()
