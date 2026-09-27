"""Local ink and colour passes on the render PC (ComfyUI, Qwen-Image-Edit-2511), with a style reference.

image1 = structure (Blender line render, or the ink result), image2 = style reference (look only, never
content). Reuses the render-PC client (upload/queue/wait/download) from the render-pc worktree.

usage:
  python3 passes.py ink    <shot_lines.png> <prompt.txt> [--ref REF] [--mp 2] [--seed 1] -o OUTDIR
  python3 passes.py colour <ink.png>                     [--ref REF] [--mp 2] [--seed 1] -o OUTDIR
"""
import argparse, copy, json, sys, time
from pathlib import Path

CLIENT_DIR = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal-render-pc/tools/artkit/comfy")
sys.path.insert(0, str(CLIENT_DIR))
import comfy_client as cc  # noqa: E402

HERE = Path(__file__).resolve().parent
REF_DIR = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu/lesson_assets/_reference")
# colour: no reference by default. Qwen-Image-Edit treats image2 as content: the goal image's elephants and
# raft were pasted into Dante's study (2026-09-27). The palette comes from Bart's colour prompt instead.
DEFAULT_REF = {"ink": REF_DIR / "ink_study_approved.jpg", "colour": None}
INK_LEAD = ("Image 1 is a clean perspective line drawing of the scene. Image 2 is only a style reference: "
            "copy its drawing style, never its content. ")
# Bart's colour prompt names boats and water; without this guard Qwen painted a harbour with ships into
# the closed shutters of Dante's study (2026-09-27).
COLOUR_GUARD = ("Colour only what is already drawn. Add nothing: no new objects, no views through windows, "
                "no water, boats or people unless they are drawn. Closed shutters stay closed. ")
COLOUR_LEAD = ("Image 2 is only a colour reference: take its palette and wash treatment, never its content "
               "or composition. ")


def ref_workflow(cfg, ref_mp):
    """qwen_edit_api.json + a second image input wired into both text encoders."""
    wf, nodes = cc.load_workflow(cfg, "qwen")
    wf = copy.deepcopy(wf)
    wf["21"] = {"class_type": "LoadImage", "inputs": {"image": "ref.png"}}
    wf["22"] = {"class_type": "ImageScaleToTotalPixels",
                "inputs": {"image": ["21", 0], "upscale_method": "lanczos", "megapixels": ref_mp, "resolution_steps": 16}}
    for n in ("9", "10"):
        wf[n]["inputs"]["image2"] = ["22", 0]
    return wf, dict(nodes, ref="21.image")


def run(kind, src, prompt, ref, outdir, mp, seed, ref_mp=0.6):
    cfg = cc.load_config(CLIENT_DIR / "comfy.json")
    wf, nodes = ref_workflow(cfg, ref_mp) if ref else cc.load_workflow(cfg, "qwen")
    values = {"prompt": prompt, "seed": seed, "megapixels": mp, "steps": None}
    digest = cc.job_hash(src.read_bytes() + (ref.read_bytes() if ref else b""), wf, values)
    dst = outdir / f"{src.stem.replace('_lines', '')}__{kind}__{digest[:8]}.png"
    if dst.exists():
        print("cached", dst.name); return dst
    cc.ensure_up(cfg)
    t0 = time.monotonic()
    values["image"] = cc.upload(cfg, src, f"{digest[:12]}_src{src.suffix.lower()}")
    if ref:
        values["ref"] = cc.upload(cfg, ref, f"{digest[:12]}_ref{ref.suffix.lower()}")
    images = cc.wait_for(cfg, cc.queue(cfg, cc.patch(wf, nodes, values)))
    outdir.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(cc.download(cfg, images[0]))
    meta = {"kind": kind, "source": str(src), "ref": str(ref) if ref else None, "mp": mp, "seed": seed,
            "seconds": round(time.monotonic() - t0, 1), "prompt": prompt}
    dst.with_suffix(".json").write_text(json.dumps(meta, indent=1))
    print("done", dst.name, meta["seconds"], "s")
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kind", choices=["ink", "colour"])
    ap.add_argument("src", type=Path)
    ap.add_argument("prompt_file", type=Path, nargs="?")
    ap.add_argument("--ref", type=Path)
    ap.add_argument("--mp", type=float, default=2.0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("-o", "--outdir", type=Path, required=True)
    a = ap.parse_args()
    if a.kind == "ink":
        prompt = INK_LEAD + a.prompt_file.read_text()
    else:
        prompt = COLOUR_GUARD + (COLOUR_LEAD if a.ref else "") + (HERE / "prompts" / "colour_pass.txt").read_text()
    run(a.kind, a.src, prompt, a.ref or DEFAULT_REF[a.kind], a.outdir, a.mp, a.seed)


if __name__ == "__main__":
    main()
