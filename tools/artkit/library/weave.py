"""Weave (Figma, GPT Image 2.5) side of the generator. The MCP call itself is made by the agent; this
script builds the exact request and stores what comes back, so every call carries the same refs.

    python3 weave.py req jobs/nl-prehistory.json fg-trees ink          # -> JSON input for weave_run_model
    python3 weave.py req jobs/nl-prehistory.json fg-trees colour <ink_url>
    python3 weave.py fetch jobs/nl-prehistory.json fg-trees colour_w <url> [credits]

Files land where gen.py puts them (_work/<bundle>/<sheet>/<name>.png), so cut.py + build.py work unchanged.
Transparent outputs are flattened onto paper white (our matting then cuts paper + enclosed islands).
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import prompts  # noqa: E402
from gen import LIB, template  # noqa: E402

MODEL_ID = "2db90e64-51dd-45b2-870a-66d19a81118e"  # Weave "GPT Image 2.5"
REFS = LIB / "_work/weave/refs.json"  # uploaded once: name -> url
REF_ORDER = ["wc_caesar", "wc_constantinople", "wc_castle", "wc_crusade",
             "ink_caesar", "ink_constantinople", "ink_castle", "ink_crusade", "texture_tasman"]
LEDGER = LIB / "LEDGER.md"
PAPER = (255, 255, 255)
SIZE = {"sky": "landscape_16_9", "bg": "landscape_16_9", "strip": "landscape_16_9"}


def sheet_of(job: dict, sid: str) -> dict:
    return next(s for s in job["sheets"] if s["id"] == sid)


def request(job: dict, sid: str, stage: str, ink_url: str | None = None) -> dict:
    s = sheet_of(job, sid)
    t = template(s)
    refs = json.loads(REFS.read_text())
    images = [refs[k] for k in REF_ORDER]
    if stage == "ink":
        prompt = prompts.weave_ink_prompt(t, s["subject"])
    else:
        prompt = prompts.weave_colour_prompt(t, job["bundle"])
        images = [ink_url] + images
    bg = "opaque" if stage == "ink" or s["layer"] in ("sky", "bg") or s.get("strip") else "transparent"
    return {"id": MODEL_ID, "input": {
        "prompt": prompt, "images": images, "model": "Sunburst", "quality": "high",
        "background": bg, "output_format": "png", "image_size": SIZE.get(t, "landscape_4_3") if stage == "ink" else "auto"}}


def fetch(job: dict, sid: str, name: str, url: str, credits: str = "?") -> Path:
    d = LIB / "_work" / job["bundle"] / sid
    d.mkdir(parents=True, exist_ok=True)
    raw = d / f"{name}_raw.png"
    subprocess.run(["curl", "-sfL", "-o", str(raw), url], check=True)
    im = Image.open(raw).convert("RGBA")
    flat = Image.new("RGBA", im.size, PAPER + (255,))
    flat.alpha_composite(im)
    out = d / f"{name}.png"
    flat.convert("RGB").save(out)
    (d / f"{name}.url").write_text(url + "\n")
    if not LEDGER.exists():
        LEDGER.write_text("# Weave cost ledger (GPT Image 2.5, team OnlyAds.app)\n\n"
                          "| when | bundle | sheet | output | credits |\n|---|---|---|---|---|\n")
    with LEDGER.open("a") as f:
        f.write(f"| {datetime.now():%Y-%m-%d %H:%M} | {job['bundle']} | {sid} | {name} | {credits} |\n")
    print(out, im.size)
    return out


def main() -> None:
    cmd, jobf, sid, stage = sys.argv[1:5]
    job = json.loads(Path(jobf).read_text())
    if cmd == "req":
        print(json.dumps(request(job, sid, stage, sys.argv[5] if len(sys.argv) > 5 else None)))
    elif cmd == "fetch":
        fetch(job, sid, stage, sys.argv[5], sys.argv[6] if len(sys.argv) > 6 else "?")


if __name__ == "__main__":
    main()
