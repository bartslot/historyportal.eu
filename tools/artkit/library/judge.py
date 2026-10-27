"""Judge sheets for the ChatGPT style score: 4 coloured sheets per grid (panels A-D), one fresh chat per grid.

    python3 judge.py grids jobs/nl-prehistory.json g <out_dir>    # -> <out_dir>/<bundle>_<n>.jpg + map json
    python3 judge.py score nl-prehistory sky-summer=8 bg-heath=7  # appends to _work/<bundle>/scores.json

Question (fixed, never mentions earlier scores): QUESTION below. A sheet's assets ship at >= 8.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).parent))
from gen import LIB  # noqa: E402

QUESTION = ("The first image (reference.jpg) is the reference. The second image holds four candidates, panels A, B, "
            "C and D. For each panel: score 1-10 how well this matches the History Lines style of the reference; "
            "name the 3 biggest differences.")
CELL = (960, 640)


def grids(job: dict, variant: str, out: Path) -> dict[str, list[str]]:
    bundle, sheets = job["bundle"], [s["id"] for s in job["sheets"]]
    out.mkdir(parents=True, exist_ok=True)
    mapping = {}
    for n in range(0, len(sheets), 4):
        g = Image.new("RGB", (CELL[0] * 2, CELL[1] * 2), "white")
        d = ImageDraw.Draw(g)
        chunk = []
        for i, sid in enumerate(sheets[n:n + 4]):
            f = LIB / "_work" / bundle / sid / f"colour_{variant}.png"
            if not f.exists():
                continue
            x, y = (i % 2) * CELL[0], (i // 2) * CELL[1]
            g.paste(Image.open(f).convert("RGB").resize(CELL), (x, y))
            d.rectangle([x + 8, y + 8, x + 48, y + 48], fill="black")
            d.text((x + 22, y + 20), "ABCD"[i], fill="white")
            chunk.append(sid)
        name = f"{bundle}_{n // 4}.jpg"
        g.save(out / name, quality=86)
        mapping[name] = chunk
    (out / f"{bundle}_map.json").write_text(json.dumps(mapping, indent=1))
    return mapping


def score(bundle: str, pairs: list[str]) -> None:
    f = LIB / "_work" / bundle / "scores.json"
    s = json.loads(f.read_text()) if f.exists() else {}
    for p in pairs:
        sid, v = p.split("=")
        s.setdefault(sid, []).append(float(v))
    f.write_text(json.dumps(s, indent=1))
    print(json.dumps(s))


if __name__ == "__main__":
    if sys.argv[1] == "grids":
        print(json.dumps(grids(json.loads(Path(sys.argv[2]).read_text()), sys.argv[3], Path(sys.argv[4])), indent=1))
    elif sys.argv[1] == "score":
        score(sys.argv[2], sys.argv[3:])
