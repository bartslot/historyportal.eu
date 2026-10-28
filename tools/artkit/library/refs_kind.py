"""Same-kind references and the refs' colour numbers (PM 2026-10-28: judge a sheet against its own kind; drop
"restrained" from the colour prompt and give the edit model the refs' measured saturation and contrast).

    python3 refs_kind.py crops                 # -> library/refs_by_kind/<kind>.jpg
    python3 refs_kind.py stats <png>...        # colour numbers of any image (refs: no args)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import qa  # noqa: E402
from gen import LIB, MEDIA  # noqa: E402

REFS = MEDIA / "topics/verbree-book-sample/pass2-watercolour"
OUT = LIB / "refs_by_kind"
CROPS = {  # kind -> [(ref, (x0, y0, x1, y1)) in the 1920x1080 refs]
    "landscape": [("crusade", (1200, 180, 1560, 600)), ("constantinople", (0, 60, 960, 240))],
    "plants": [("castle", (0, 640, 240, 880)), ("castle", (560, 760, 1240, 900)),
               ("constantinople", (1440, 290, 1900, 560)), ("crusade", (1250, 420, 1540, 620))],
    "animals_props": [("crusade", (300, 250, 1300, 1080)), ("castle", (1300, 660, 1700, 860))],
    "figures": [("caesar", (0, 150, 1920, 1080))],
    "buildings": [("constantinople", (400, 200, 1500, 760)), ("castle", (100, 60, 1500, 700))],
    "ground": [("crusade", (0, 780, 1920, 1080)), ("castle", (0, 820, 1920, 1020))],
    "sky": [("castle", (1000, 0, 1920, 600)), ("crusade", (0, 0, 1920, 200))],
}
KIND_OF_LAYER = {"bg": "landscape", "sky": "sky", "ground": "ground", "mid": "buildings", "fg": "plants",
                 "prop": "animals_props"}


def grid(parts: list, cols: int = 2, pad: int = 16) -> Image.Image:
    ims = [Image.open(REFS / f"{n}_r2.png").convert("RGB").crop(b) for n, b in parts]
    rows = [ims[i:i + cols] for i in range(0, len(ims), cols)]
    w = max(sum(i.width for i in r) + pad * (len(r) + 1) for r in rows)
    h = sum(max(i.height for i in r) for r in rows) + pad * (len(rows) + 1)
    c = Image.new("RGB", (w, h), "white")
    y = pad
    for r in rows:
        x = pad
        for i in r:
            c.paste(i, (x, y))
            x += i.width + pad
        y += max(i.height for i in r) + pad
    return c


def stats(rgb: np.ndarray) -> dict:
    """Washed pixels only (not ink L*<40, not paper): chroma, saturation, value spread, dark-wash share."""
    lab = qa.rgb2lab(rgb.reshape(-1, 3).astype(float)).reshape(-1, 3)
    L, C = lab[:, 0], np.hypot(lab[:, 1], lab[:, 2])
    washed = (L >= qa.INK_L) & ~((L > 93) & (C < 6))
    hsv = np.asarray(Image.fromarray(rgb).convert("HSV")).reshape(-1, 3).astype(float)
    Lw = L[washed]
    return {"chroma_mean": round(float(C[washed].mean()), 1), "chroma_p90": round(float(np.percentile(C[washed], 90)), 1),
            "sat_mean": round(float(hsv[washed, 1].mean() / 255), 3),
            "L_p5": round(float(np.percentile(Lw, 5)), 1), "L_p95": round(float(np.percentile(Lw, 95)), 1),
            "dark_wash": round(float(((Lw >= qa.INK_L) & (Lw < 60)).mean()), 3),
            "ink": round(float((L < qa.INK_L).mean()), 3), "paper": round(float((~washed & (L >= qa.INK_L)).mean()), 3)}


if __name__ == "__main__":
    if sys.argv[1] == "crops":
        OUT.mkdir(parents=True, exist_ok=True)
        for k, parts in CROPS.items():
            grid(parts).save(OUT / f"{k}.jpg", quality=90)
            print(OUT / f"{k}.jpg")
    elif sys.argv[1] == "stats":
        files = [Path(p) for p in sys.argv[2:]] or sorted(REFS.glob("*_r2.png"))[:4]
        for f in files:
            print(f.parent.name + "/" + f.name, json.dumps(stats(np.asarray(Image.open(f).convert("RGB")))))
