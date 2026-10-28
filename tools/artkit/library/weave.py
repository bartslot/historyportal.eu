"""Weave (Figma, GPT Image 2.5) side of the generator. The MCP call itself is made by the agent; this
script builds the exact request and stores what comes back, so every call carries the same refs.

    python3 weave.py req jobs/nl-prehistory.json fg-trees ink          # -> JSON input for weave_run_model
    python3 weave.py req jobs/nl-prehistory.json fg-trees colour <ink_url>
    python3 weave.py fetch jobs/nl-prehistory.json fg-trees colour_w <url> [credits]
    python3 weave.py align <ink.png> <colour.png>   # undo the edit's zoom/shift before qa.py kept
    python3 weave.py inkover <ink.png> <colour.png> <out.png>   # the locked ink multiplied back over the colour

Files land where gen.py puts them (_work/<bundle>/<sheet>/<name>.png), so cut.py + build.py work unchanged.
Transparent outputs are flattened onto paper white (our matting then cuts paper + enclosed islands).
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
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
PAD_FRAC = 0.08  # white added on every side of an ink before the Figma edit (it zooms ~8 % and crops)
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


def grab(bundle: str, sid: str, name: str, urls: list[str], unpad: bool = True) -> Path | None:
    """Figma download_assets gives the edited fill plus a thumbnail: keep the widest image."""
    d = LIB / "_work" / bundle / sid
    best, best_chroma = None, -1.0
    for i, u in enumerate(urls):
        f = d / f"_raw{i}.png"
        subprocess.run(["curl", "-sfL", "-o", str(f), u], check=True)
        im = Image.open(f)
        if im.width < 1000:
            continue
        chroma = float(np.asarray(im.convert("HSV"))[..., 1].mean())  # the ink is grey, the edit is coloured
        if chroma > best_chroma:
            best, best_chroma = im.convert("RGBA"), chroma
    for f in d.glob("_raw*.png"):
        f.unlink()
    if best is None:
        print(sid, "no full-size image")
        return None
    flat = Image.new("RGBA", best.size, PAPER + (255,))
    flat.alpha_composite(best)
    if unpad:  # the ink went in with PAD_FRAC white on every side: crop it back to the ink's own framing
        w, h = flat.size
        m = PAD_FRAC / (1 + 2 * PAD_FRAC)
        flat = flat.crop((round(w * m), round(h * m), round(w * (1 - m)), round(h * (1 - m)))).resize((w, h), Image.LANCZOS)
    out = d / f"{name}.png"
    flat.convert("RGB").save(out)
    with LEDGER.open("a") as f:
        f.write(f"| {datetime.now():%Y-%m-%d %H:%M} | {bundle} | {sid} | {name} (Figma edit, GPT Image 2.5 Sunburst, 9 refs) | figma-ai |\n")
    print(sid, "ok", best.size)
    return out


def pad_ink(src: Path) -> Path:
    im = Image.open(src).convert("RGB")
    px, py = round(im.width * PAD_FRAC), round(im.height * PAD_FRAC)
    out = Image.new("RGB", (im.width + 2 * px, im.height + 2 * py), PAPER)
    out.paste(im, (px, py))
    dst = src.with_name(src.stem + "_pad.png")
    out.save(dst)
    return dst


def align_to_ink(ink: Path, colour: Path) -> tuple[float, int, int]:
    """Undo the edit's own zoom/shift: fit the colour's dark lines onto the ink's (scale 0.80-1.10, shift +-16 px at
    768 px wide), then rewrite the colour at that fit, new margins in paper white. Returns (scale, dx, dy) at full size."""
    from scipy import ndimage
    w0 = 768
    def lines(p: Path) -> np.ndarray:
        im = Image.open(p).convert("L")
        return np.asarray(im.resize((w0, round(w0 * im.height / im.width)))) < 70
    a, b = lines(ink), lines(colour)
    a_n = max(a.sum(), 1)
    def fit(s: float, dx: int, dy: int) -> float:
        h, w = a.shape
        z = ndimage.zoom(b.astype(np.uint8), s, order=0).astype(bool)
        out = np.zeros_like(a)
        zy, zx = (z.shape[0] - h) // 2 - dy, (z.shape[1] - w) // 2 - dx
        ys, xs = max(0, -zy), max(0, -zx)
        src = z[max(0, zy):max(0, zy) + h - ys, max(0, zx):max(0, zx) + w - xs]
        out[ys:ys + src.shape[0], xs:xs + src.shape[1]] = src
        return (ndimage.binary_dilation(out, iterations=2) & a).sum() / a_n
    best = max((fit(s, 0, 0), s) for s in np.arange(0.80, 1.101, 0.01))[1]
    k, s, dx, dy = max((fit(s, dx, dy), s, dx, dy) for s in (best - 0.005, best, best + 0.005)
                       for dx in range(-16, 17, 2) for dy in range(-16, 17, 2))
    im, iw = Image.open(colour).convert("RGB"), Image.open(ink).size
    f = iw[0] / w0
    z = im.resize((round(iw[0] * s), round(iw[1] * s)), Image.LANCZOS)
    out = Image.new("RGB", iw, PAPER)
    out.paste(z, ((iw[0] - z.width) // 2 + round(dx * f), (iw[1] - z.height) // 2 + round(dy * f)))
    out.save(colour)
    return float(s), round(dx * f), round(dy * f)


def ink_over(ink: Path, colour: Path, out: Path) -> Path:
    """The locked ink multiplied back over its (aligned) colour edit, the way ink sits on top of watercolour. The edit's own
    dark lines that are not the ink's (redrawn or shifted contours) are first filled with the wash around them."""
    from scipy import ndimage
    c = np.asarray(Image.open(colour).convert("RGB")).astype(float)
    k = np.asarray(Image.open(ink).convert("L").resize((c.shape[1], c.shape[0]), Image.LANCZOS)).astype(float) / 255
    stray = (c.mean(2) < 110) & ~ndimage.binary_dilation(k < 0.45, iterations=2)
    stray = ndimage.binary_dilation(stray, iterations=1)
    wash = np.stack([ndimage.median_filter(c[..., i], size=9) for i in range(3)], -1)
    c = np.where(stray[..., None], np.maximum(wash, c), c)
    k = np.where(k < 0.3, k, np.sqrt(k))  # line cores stay black, their grey fringe lightens (per-asset ink cap)
    Image.fromarray(np.clip(c * k[..., None], 0, 255).astype(np.uint8)).save(out)
    return out


def main() -> None:
    if sys.argv[1] == "pad":  # pad <ink.png>...
        for f in sys.argv[2:]:
            print(pad_ink(Path(f)))
        return
    if sys.argv[1] == "align":  # align <ink.png> <colour.png>  (rewrites the colour in place)
        print(align_to_ink(Path(sys.argv[2]), Path(sys.argv[3])))
        return
    if sys.argv[1] == "inkover":  # inkover <ink.png> <colour.png> <out.png>
        print(ink_over(Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4])))
        return
    if sys.argv[1] == "grab":  # grab <bundle> <sheet> <name> <url>...
        grab(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:])
        return
    cmd, jobf, sid, stage = sys.argv[1:5]
    job = json.loads(Path(jobf).read_text())
    if cmd == "req":
        print(json.dumps(request(job, sid, stage, sys.argv[5] if len(sys.argv) > 5 else None)))
    elif cmd == "fetch":
        fetch(job, sid, stage, sys.argv[5], sys.argv[6] if len(sys.argv) > 6 else "?")


if __name__ == "__main__":
    main()
