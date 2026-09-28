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
DEFAULT_REF = {"ink": REF_DIR / "ink_study_approved.jpg", "colour": None, "paint": None}
INK_LEAD = ("Image 1 is a clean perspective line drawing of the scene. Image 2 is only a style reference: "
            "copy its drawing style, never its content. ")
# Shaded Blender renders carry real stone, joints, cobbles and wood grain: keep them as linework (the house
# prompt's "faintly suggested" made Qwen draw bare white walls, 2026-09-27).
INK_LEAD_SHADED = ("Image 1 is a rendered 3D scene with real materials. Image 2 is only a style reference: copy its "
                   "drawing style, never its content. Translate every material of image 1 into ink: outline the "
                   "individual stones and their joints, the cobbles, the planks and wood grain, with lighter and "
                   "fewer lines in the distance. Ignore the instruction to keep stone faint; about 60% white. ")
# --light: an open ink drawing that leaves room for colour (Bart's goal image), not a dark engraving.
# The forest render is dark on purpose (deep shadows); Qwen inks darkness as black, so the input's
# shadows are lifted first and the prompt keeps shadow areas as paper (2026-09-27).
INK_LEAD_LIGHT = ("Make it an open, light line drawing like a hand-coloured book illustration: clear outlines, "
                  "the surface textures drawn as lines, and only sparse parallel hatching "
                  "in the shadows. Shadow areas stay mostly white paper; a colour wash will add the depth later. "
                  "At least 80% white, under 8% black, no solid black masses, no dense cross-hatching. ")
LIFT_GAMMA = 0.55   # < 1 brightens the shadows of the render before inking


ABSTRACT_MEDIAN = 7    # px at half resolution: removes bark photo texture and single 3D leaf cards (13 lost the arch)
ABSTRACT_COLOURS = 40


def abstracted(src):
    """An underpainting of src: edge-preserving simplification into flat colour shapes. The paint model
    copies whatever detail it is given; with the photo bark and leaf cards still in, it painted washes
    beside them and one tree carried three textures (Bart, 2026-09-27). Given only shapes and light,
    it paints all the detail itself, in one brush language."""
    from PIL import Image, ImageFilter
    dst = src.with_name(src.stem + "_abstract.png")
    im = Image.open(src).convert("RGB")
    w, h = im.size
    small = im.resize((w // 2, h // 2), Image.LANCZOS).filter(ImageFilter.MedianFilter(ABSTRACT_MEDIAN))
    small = small.quantize(ABSTRACT_COLOURS).convert("RGB")
    small.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.5)).save(dst)
    return dst


def lifted(src):
    """A copy of src with its shadows lifted (gamma), so dark areas read as form, not as black."""
    from PIL import Image
    dst = src.with_name(src.stem + "_lifted.png")
    im = Image.open(src).convert("RGB")
    im.point(lambda v: round(255 * (v / 255) ** LIFT_GAMMA)).save(dst)
    return dst


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


def resolved(cfg):
    """cfg with render.local looked up ONCE. macOS spends ~2 s on every .local (mDNS) lookup and a job
    makes about ten requests: 19 of a job's 32 s went to name lookups, the GPU needs 13 (2026-09-28).
    Resolved per run, not hard-coded: the PC's DHCP address changes."""
    import socket
    try:
        return dict(cfg, host=socket.gethostbyname(cfg["host"]))
    except OSError:
        return cfg      # asleep or unresolvable: ensure_up() wakes it by MAC and retries by name


def run(kind, src, prompt, ref, outdir, mp, seed, ref_mp=0.6, model="qwen"):
    cfg = resolved(cc.load_config(CLIENT_DIR / "comfy.json"))
    wf, nodes = ref_workflow(cfg, ref_mp) if ref else cc.load_workflow(cfg, model)
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
    ap.add_argument("kind", choices=["ink", "colour", "paint"])
    ap.add_argument("src", type=Path)
    ap.add_argument("prompt_file", type=Path, nargs="?")
    ap.add_argument("--ref", type=Path)
    ap.add_argument("--mp", type=float, default=2.0)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--scene", choices=["inland", "harbour", "forest", "sea", "voyage"], default="inland",
                    help="inland drops 'boats' and 'water' from the colour prompt (they get painted in otherwise); "
                         "forest = full local colour like Bart's goal image (his prompt stays restrained for towns)")
    ap.add_argument("--light", action="store_true", help="ink: open linework with room for colour")
    # The render-PC study (PIPELINE.md): klein inks about twice as fast as Qwen and keeps the Blender
    # geometry (contour recall 0.97-1.00 vs 0.73-0.89); on the Tasman sails it was also better. Qwen stays for colour.
    ap.add_argument("--model", choices=["klein4b", "qwen"], default=None,
                    help="default: klein4b for ink without a reference, qwen otherwise")
    ap.add_argument("-o", "--outdir", type=Path, required=True)
    a = ap.parse_args()
    if a.kind == "paint":
        # organic scenes (forests): painted gouache straight from the render, no ink at all. Bart: lines for
        # characters and buildings only; foliage and trees get none, "like Ghibli" (2026-09-27)
        prompt = (a.prompt_file or HERE / "prompts" / "paint_watercolour_forest.txt").read_text()   # our own soft look; gouache read as Ghibli (Bart)
        a.src = abstracted(lifted(a.src))
        a.ref = Path("none")
    elif a.kind == "ink":
        lead = INK_LEAD_SHADED if "_shaded" in a.src.name else INK_LEAD
        prompt = lead + a.prompt_file.read_text()
        if a.light:
            prompt = INK_LEAD_LIGHT + prompt.replace(" about 60% white.", "")
            a.src = lifted(a.src)
    else:
        prompt = COLOUR_GUARD + (COLOUR_LEAD if a.ref else "") + (HERE / "prompts" / {"harbour": "colour_pass.txt", "inland": "colour_pass_inland.txt",
                                                "forest": "colour_pass_forest.txt", "sea": "colour_pass_sea.txt", "voyage": "colour_pass_voyage.txt"}[a.scene]).read_text()
    ref = None if (a.ref and str(a.ref) == "none") else (a.ref or DEFAULT_REF[a.kind])
    if ref is None and a.kind == "ink":
        prompt = prompt.replace(" Image 2 is only a style reference: copy its drawing style, never its content.", "")
    model = a.model or ("klein4b" if a.kind == "ink" and ref is None else "qwen")
    run(a.kind, a.src, prompt, ref, a.outdir, a.mp, a.seed, model=model)


if __name__ == "__main__":
    main()
