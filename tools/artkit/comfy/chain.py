"""The background chain (study 2026-09-27, see PIPELINE.md):

  Blender lines  --klein4b ink-->  ink master  --qwen colour (1 MP)-->  colour master  --Upscayl std 2x-->
      clean: --depth fade--> final        rich (C1): --washes x ink master--> --depth fade--> final_rich

Each stage keeps its outputs; a stage only reruns when its own inputs change (the client caches by hash).
Ink seeds are ranked automatically by the structure check (recall of Blender contours, no ink on empty walls);
colour seeds are all kept for a human pick: no metric here knows Bart's taste.

usage:
  python3 chain.py <shot_dir>/<shot> --family street|study [--ink-seeds 3] [--colour-seeds 3] -o OUTDIR
  (<shot> is the path stem of the Blender outputs: <shot>_lines.png, _mask.png, _camera.json, _depth.npy)
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

import comfy_client as cc
import depth_lines as dl
import stage_check as sc
import wash_ink as wi

HERE = Path(__file__).resolve().parent
PROMPTS = HERE / "prompts" / "house"
UPSCAYL = "/opt/upscayl/bin/upscayl-bin"
UPSCAYL_MODEL = "upscayl-standard-4x"   # digital-art-4x re-hardens faded far lines and flattens washes
UPSCAYL_SCALE = 2
LINE_FADE = False  # Bart 2026-09-27: no smooth per-pixel fade (reads as fake fog); depth = per-object planes, TODO
COLOUR_MP = 1.0   # Qwen-Image-Edit drifts (zoom/shift, recall 0.61-0.79) at 2 MP; at 1 MP recall 0.98-0.99


def ink_prompt(family: str) -> str:
    return (PROMPTS / f"ink_{family}_C.txt").read_text().strip()


def colour_prompt(family: str) -> str:
    return (PROMPTS / f"colour_{family}.txt").read_text().strip()


def upscale(src: Path, dst: Path) -> Path:
    if dst.exists():
        return dst
    remote_in, remote_out = f"/tmp/chain_{src.name}", f"/tmp/chain_up_{src.name}"
    subprocess.run(["scp", "-q", str(src), f"render:{remote_in}"], check=True)
    subprocess.run(["ssh", "render", f"{UPSCAYL} -i {remote_in} -o {remote_out} -m /opt/upscayl/models "
                    f"-n {UPSCAYL_MODEL} -s {UPSCAYL_SCALE} >/dev/null 2>&1"], check=True)
    subprocess.run(["scp", "-q", f"render:{remote_out}", str(dst)], check=True)
    return dst


def run(shot: Path, family: str, out: Path, ink_seeds: int, colour_seeds: int, mp: float = 2.0) -> dict:
    cfg = cc.load_config(HERE / "comfy.json")
    lines, mask, depth = (Path(f"{shot}_{k}") for k in ("lines.png", "mask.png", "depth.npy"))
    report = {"shot": shot.name, "family": family, "ink": [], "colour": []}

    inks = []
    for s in range(1, ink_seeds + 1):
        p = cc.run_one(cfg, "klein4b", lines, out / "ink", ink_prompt(family), s, mp, None)
        m = sc.check(lines, depth, mask, p)
        inks.append((m["recall"] - 5 * m["wall_ink"], p, m))
        report["ink"].append({"seed": s, "file": p.name, **{k: m[k] for k in ("recall", "wall_ink", "paper")}})
    inks.sort(key=lambda x: x[0], reverse=True)
    ink_master = inks[0][1]
    report["ink_pick"] = ink_master.name

    for s in range(1, colour_seeds + 1):
        col = cc.run_one(cfg, "qwen", ink_master, out / "colour", colour_prompt(family), s, COLOUR_MP, None)
        up = upscale(col, out / "upscaled" / col.name)
        final = out / "final" / col.name            # "clean": Qwen's own (redrawn, lighter) ink
        rich = out / "final_rich" / col.name        # "rich" (C1): Qwen washes x the klein ink master
        if not final.exists():
            final.parent.mkdir(parents=True, exist_ok=True)
            src = dl.Image.open(up)
            (dl.adjust(src, dl.load_depth(depth, src.size), dl.FAR_OPACITY, dl.NEAR_M, dl.FAR_M)
             if LINE_FADE else src.convert("RGB")).save(final)
        if not rich.exists():
            # Layers kept apart so nothing gets blurred: the black-and-white ink is enlarged by Upscayl (sharp) and
            # faded by distance (lighter, same width); the washes only get an aerial fade toward paper.
            rich.parent.mkdir(parents=True, exist_ok=True)
            ink_up = dl.Image.open(upscale(ink_master, out / "upscaled" / ink_master.name))
            if LINE_FADE:   # lighten the black-and-white ink layer only; washes untouched
                ink_up = dl.adjust(ink_up, dl.load_depth(depth, ink_up.size), dl.FAR_OPACITY, dl.NEAR_M, dl.FAR_M)
            wi.composite(dl.Image.open(up), ink_up).save(rich)
        report["colour"].append({"seed": s, "colour_master": col.name, "final": str(final), "final_rich": str(rich)})
    (out / f"{shot.name}_chain.json").write_text(json.dumps(report, indent=2) + "\n")
    return report


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("shot", type=Path)
    ap.add_argument("--family", required=True, choices=["street", "study"])
    ap.add_argument("--ink-seeds", type=int, default=3)
    ap.add_argument("--colour-seeds", type=int, default=3)
    ap.add_argument("-o", "--out", type=Path, required=True)
    a = ap.parse_args()
    (a.out / "upscaled").mkdir(parents=True, exist_ok=True)
    print(json.dumps(run(a.shot, a.family, a.out, a.ink_seeds, a.colour_seeds), indent=2))


if __name__ == "__main__":
    main()
