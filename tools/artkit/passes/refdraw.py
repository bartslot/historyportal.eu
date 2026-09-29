"""Ink edit with a reference image (klein4b_ref): image 1 = structure (a panel, or a blank page), image 2 = the
character reference (a period portrait). For character sheets and redrawing a character in existing poses.

usage: python3 refdraw.py <image1.png> <ref.png> <prompt.txt> [--seed 1] [--mp 2] -o OUTDIR
"""
import argparse, json, time
from pathlib import Path

from passes import CLIENT_DIR, cc, resolved


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("ref", type=Path)
    ap.add_argument("prompt_file", type=Path)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--mp", type=float, default=2.0)
    ap.add_argument("-o", "--outdir", type=Path, required=True)
    a = ap.parse_args()

    cfg = resolved(cc.load_config(CLIENT_DIR / "comfy.json"))
    wf, nodes = cc.load_workflow(cfg, "klein4b_ref")
    values = {"prompt": a.prompt_file.read_text(), "seed": a.seed, "megapixels": a.mp, "steps": None}
    digest = cc.job_hash(a.src.read_bytes() + a.ref.read_bytes(), wf, values)
    dst = a.outdir / f"{a.src.stem}__ref__{digest[:8]}.png"
    if dst.exists():
        print("cached", dst.name); return
    cc.ensure_up(cfg)
    t0 = time.monotonic()
    values["image"] = cc.upload(cfg, a.src, f"{digest[:12]}_src{a.src.suffix.lower()}")
    values["ref"] = cc.upload(cfg, a.ref, f"{digest[:12]}_ref{a.ref.suffix.lower()}")
    images = cc.wait_for(cfg, cc.queue(cfg, cc.patch(wf, nodes, values)))
    a.outdir.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(cc.download(cfg, images[0]))
    dst.with_suffix(".json").write_text(json.dumps({"src": str(a.src), "ref": str(a.ref), "seed": a.seed, "mp": a.mp,
                                                    "seconds": round(time.monotonic() - t0, 1)}, indent=1))
    print("done", dst.name, round(time.monotonic() - t0, 1), "s")


if __name__ == "__main__":
    main()
