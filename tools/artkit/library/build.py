"""Pick the winning variant per sheet, run the gates, write <bundle>/library.json + webp, contact sheets, plate.

    python3 build.py jobs/nl-prehistory.json

Winner per sheet = the variant the style gate ranked higher (_work/<bundle>/rank.jsonl), else 'a'.
An asset ships only if it passes every pixel gate (qa.check); failures are listed in qa_report.json.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
import qa  # noqa: E402
from gen import LIB  # noqa: E402

VERDICT_SCORE = {"alike": 8, "close": 6, "different": 4}  # style-gate verdict -> qa.score
PAPER = (246, 245, 238)
DARK = (34, 38, 46)


def winners(bundle: str) -> dict[str, tuple[str, str]]:
    """sheet id -> (variant, verdict) from the ranking log; later rounds override earlier ones."""
    out: dict[str, tuple[str, str]] = {}
    log = LIB / "_work" / bundle / "rank.jsonl"
    if not log.exists():
        return out
    for line in log.read_text().splitlines():
        r = json.loads(line)
        if "ranking" not in r:
            continue
        seen = set()
        for lab in r["ranking"]:  # best first; first variant seen per sheet wins
            path = Path(r["labels"][lab])
            sheet, variant = path.parent.name, path.stem.split("_")[-1]
            if sheet not in seen:
                seen.add(sheet)
                out[sheet] = (variant, r.get("verdict", {}).get(lab, "close"))
    return out


def judge_scores(bundle: str) -> dict[str, int]:
    """sheet id -> style score 1-10 from the judge (ChatGPT), _work/<bundle>/scores.json; lowest score counts."""
    f = LIB / "_work" / bundle / "scores.json"
    return {k: min(v) if isinstance(v, list) else v for k, v in json.loads(f.read_text()).items()} if f.exists() else {}


SHIP_SCORE = 8  # judge score an asset needs to go into `assets`; lower ones are listed under `held`


def contract_verdict(score: float | None, verdict: str) -> str:
    """Contract 1 enum: alike | close | different."""
    if score is None:
        return verdict if verdict in ("alike", "close", "different") else "close"
    return "alike" if score >= SHIP_SCORE else "close" if score >= 6 else "different"


def judged_variant(judged: dict, sid: str, variants: str) -> tuple[str | None, float | None]:
    """Best judged variant of a sheet: key 'sheet:variant', a bare 'sheet' key is the first variant."""
    best = (None, None)
    for v in variants:
        sc = judged.get(f"{sid}:{v}", judged.get(sid) if v == variants[0] else None)
        if sc is not None and (best[1] is None or sc >= best[1]):  # tie: the later (fixed) variant
            best = (v, sc)
    return best


def build(job: dict, variants: str = "abcd") -> dict:
    bundle = job["bundle"]
    dst = LIB / bundle
    dst.mkdir(parents=True, exist_ok=True)
    win = winners(bundle)
    judged = judge_scores(bundle)
    assets, report, held = [], [], []
    for s in job["sheets"]:
        jv, jscore = judged_variant(judged, s["id"], variants)
        variant, verdict = (jv, "judged") if jv else win.get(s["id"], (variants[0], "unranked"))
        order = [variant] + [v for v in variants if v != variant]
        for item in s["items"]:
            if item.get("reject"):  # judged by eye: wrong period or wrong subject; stays out of the library
                report.append({"id": item["id"], "pass": False, "reject": item["reject"]})
                continue
            chosen = None
            for v in order:
                d = LIB / "_work" / bundle / s["id"] / f"cut_{v}"
                f = d / f"{item['id']}.png"
                if not f.exists():
                    continue
                meta = json.loads((d / "cut.json").read_text())
                paper = np.array(meta["paper"])
                tile = meta.get("seam") == "mirror"  # crossfaded seams ghost; only mirrored tiles repeat
                qa_layer = "bg" if s.get("strip") else s["layer"]  # strips are judged like bg strips
                r = qa.check(Image.open(f), qa_layer, bundle, tileable=tile, paper=paper, gaps=s.get("gaps", "fill"),
                             fades=s["layer"] == "bg" and not s.get("strip"))
                r["ink_sheet"] = meta["ink_sheet"]  # Bart's whole-image rule, on the pass-1 sheet
                r["checkerboard"] = r["checkerboard"] or meta["checkerboard"]
                r["pass"] = r["pass"] and meta["ink_sheet"] <= qa.INK_HARD[1] and not meta["checkerboard"]
                report.append({"id": item["id"], "variant": v, **r})
                if r["pass"]:
                    chosen = (f, v, r)
                    break
            if not chosen:
                continue
            f, v, r = chosen
            vscore = judged.get(f"{s['id']}:{v}", judged.get(s["id"]) if v == variants[0] else None)
            if jscore is not None and (vscore is None or vscore < SHIP_SCORE):  # judged sheet: only >= 8 ships
                held.append({"id": item["id"], "sheet": s["id"], "variant": v, "score": vscore})
                continue
            Image.open(f).save(dst / f"{item['id']}.webp", quality=92, method=6)
            vd = verdict if v == variant else "close"
            assets.append({
                "id": item["id"], "layer": s["layer"], "tags": item["tags"], "file": f"{item['id']}.webp",
                "w": r["w"], "h": r["h"], "anchor": r["anchor"] if s["layer"] not in ("sky", "ground") else [0.5, 1.0],
                "height_m": item["height_m"], "tileable_x": tile,
                **({"tileable_y": True} if s["layer"] == "ground" else {}),
                "motion": item["motion"],
                "era": item.get("era") or s.get("era") or job["era"],
                "qa": {"score": int(vscore) if jscore is not None else VERDICT_SCORE.get(vd, 6),  # contract: int
                       "alpha_ok": r["alpha_ok"], "ink_coverage": r["ink_coverage"],
                       "ranked_vs_anchor": contract_verdict(vscore if jscore is not None else None, vd),
                       "ink_style_ok": r["ink_style_ok"],
                       "palette_de": r["palette_de"], "sheet": s["id"], "variant": v},
            })
    lib = {"version": 1, "bundle": bundle, "style": "history-lines-v1", "assets": assets, "held": held}
    (dst / "library.json").write_text(json.dumps(lib, indent=1))
    (dst / "qa_report.json").write_text(json.dumps(report, indent=1))
    n_items = sum(len(s["items"]) for s in job["sheets"])
    print(f"{bundle}: {len(assets)}/{n_items} assets shipped")
    return lib


def contact(lib: dict, bg: tuple[int, int, int], name: str, cell: int = 300, cols: int = 8) -> Path:
    a = lib["assets"]
    rows = (len(a) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 24)), bg)
    d = ImageDraw.Draw(sheet)
    fg = (40, 40, 40) if sum(bg) > 380 else (220, 220, 220)
    for i, x in enumerate(a):
        im = Image.open(LIB / lib["bundle"] / x["file"]).convert("RGBA")
        im.thumbnail((cell - 12, cell - 12))
        cx, cy = (i % cols) * cell, (i // cols) * (cell + 24)
        sheet.paste(im, (cx + (cell - im.width) // 2, cy + cell - 6 - im.height), im)
        d.text((cx + 6, cy + cell + 4), f"{x['id']} {x['qa']['ink_coverage']:.2f}", fill=fg)
    out = LIB / lib["bundle"] / f"contact_{name}.jpg"
    sheet.save(out, quality=88)
    return out


def place(canvas: Image.Image, im: Image.Image, x: float, base: float, height: float, anchor_x: float = 0.5):
    """Paste im scaled to `height` px with its anchor at (x * W, base * H)."""
    s = height / im.height
    im = im.resize((max(1, int(im.width * s)), max(1, int(height))), Image.LANCZOS)
    W, H = canvas.size
    canvas.alpha_composite(im, (int(x * W - anchor_x * im.width), int(base * H - im.height)))


def plate(lib: dict, recipe: list[dict], size: tuple[int, int] = (1920, 1080)) -> Path:
    """Stack sky + bg + mid + fg + props per recipe [{id, x, base, h}] (fractions of the canvas)."""
    by = {a["id"]: a for a in lib["assets"]}
    c = Image.new("RGBA", size, PAPER + (255,))
    for r in recipe:
        a = by.get(r["id"])
        if not a:
            continue
        im = Image.open(LIB / lib["bundle"] / a["file"]).convert("RGBA")
        if r.get("fill"):  # sky: cover the canvas
            s = max(size[0] / im.width, size[1] * r["fill"] / im.height)
            im = im.resize((int(im.width * s) + 1, int(im.height * s) + 1), Image.LANCZOS)
            c.alpha_composite(im.crop((0, 0, size[0], min(im.height, size[1]))), (0, 0))
            continue
        if r.get("tile"):  # bg strip: tile across at the given height
            s = r["h"] * size[1] / im.height
            im = im.resize((int(im.width * s), int(r["h"] * size[1])), Image.LANCZOS)
            for x0 in range(0, size[0], im.width):
                c.alpha_composite(im, (x0, int(r["base"] * size[1] - im.height)))
            continue
        place(c, im, r["x"], r["base"], r["h"] * size[1], a["anchor"][0])
    out = LIB / lib["bundle"] / "plate.png"
    c.convert("RGB").save(out)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("--variants", default="abcd", help="'g' = the Figma pass")
    a = ap.parse_args()
    job = json.loads(Path(a.job).read_text())
    lib = build(job, a.variants)
    print(contact(lib, PAPER, "paper"), contact(lib, DARK, "dark"))
    if job.get("plate"):
        print(plate(lib, job["plate"]))


if __name__ == "__main__":
    main()
