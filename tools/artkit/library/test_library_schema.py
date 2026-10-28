"""Contract 1 (library.json) schema check. Run: python3 -m pytest tools/artkit/library -q  (or python3 this file).

Validates a fixture plus every real bundle under ~/BartsMedia/historyportal/library/*/library.json,
including that each file exists, has alpha, and matches the declared w/h.
"""
from __future__ import annotations

import json
from pathlib import Path

LIB = Path.home() / "BartsMedia/historyportal/library"
LAYERS = {"sky", "bg", "mid", "fg", "prop", "ground"}
MOTIONS = {"none", "sway", "drift", "ripple", "flicker"}
VERDICTS = {"alike", "close", "different"}


def validate(lib: dict, root: Path | None = None) -> list[str]:
    err = []
    for k, t in (("version", int), ("bundle", str), ("style", str), ("assets", list)):
        if not isinstance(lib.get(k), t):
            err.append(f"top-level {k} missing or not {t.__name__}")
    if lib.get("version") != 1 or lib.get("style") != "history-lines-v1":
        err.append("version must be 1 and style history-lines-v1")
    ids = [a.get("id") for a in lib.get("assets", [])]
    if len(ids) != len(set(ids)):
        err.append("duplicate asset ids")
    for a in lib.get("assets", []):
        p = a.get("id", "?")
        if a.get("layer") not in LAYERS:
            err.append(f"{p}: layer")
        if a.get("motion") not in MOTIONS:
            err.append(f"{p}: motion")
        if not (isinstance(a.get("tags"), list) and a["tags"] and all(isinstance(t, str) for t in a["tags"])):
            err.append(f"{p}: tags")
        if not str(a.get("file", "")).endswith(".webp"):
            err.append(f"{p}: file must be .webp")
        if not all(isinstance(a.get(k), int) and a[k] > 0 for k in ("w", "h")):
            err.append(f"{p}: w/h")
        an = a.get("anchor")
        if not (isinstance(an, list) and len(an) == 2 and all(0 <= v <= 1 for v in an)):
            err.append(f"{p}: anchor")
        if not isinstance(a.get("height_m"), (int, float)) or a["height_m"] < 0:
            err.append(f"{p}: height_m")
        if not isinstance(a.get("tileable_x"), bool):
            err.append(f"{p}: tileable_x")
        q = a.get("qa", {})
        if not (isinstance(q.get("score"), int) and isinstance(q.get("alpha_ok"), bool)
                and isinstance(q.get("ink_coverage"), float) and q.get("ranked_vs_anchor") in VERDICTS):
            err.append(f"{p}: qa")
        if root is not None:
            f = root / a.get("file", "")
            if not f.exists():
                err.append(f"{p}: file missing")
                continue
            from PIL import Image
            im = Image.open(f)
            if im.size != (a.get("w"), a.get("h")):
                err.append(f"{p}: size {im.size} != declared")
            if im.mode != "RGBA" and a.get("layer") not in ("sky", "ground"):  # full-bleed tiles may be opaque
                err.append(f"{p}: no alpha channel")
            if a.get("layer") in ("sky", "ground") or a.get("tileable_x"):
                import sys
                import numpy as np
                sys.path.insert(0, str(Path(__file__).parent))
                import qa
                if qa.mirror_corr(np.asarray(im.convert("RGB"))) > qa.MIRROR_MAX:
                    err.append(f"{p}: mirrored tile (halves are flipped copies)")
    return err


FIXTURE = {
    "version": 1, "bundle": "nl-prehistory", "style": "history-lines-v1",
    "assets": [{
        "id": "tree-oak-01", "layer": "fg", "tags": ["tree", "oak", "forest"], "file": "tree-oak-01.webp",
        "w": 1400, "h": 1800, "anchor": [0.5, 1.0], "height_m": 14, "tileable_x": False, "motion": "sway",
        "qa": {"score": 8, "alpha_ok": True, "ink_coverage": 0.12, "ranked_vs_anchor": "alike"},
    }],
}


def test_fixture_valid() -> None:
    assert validate(FIXTURE) == []


def test_fixture_broken_is_caught() -> None:
    bad = json.loads(json.dumps(FIXTURE))
    bad["assets"][0]["layer"] = "foreground"
    bad["assets"][0]["anchor"] = [0.5, 2]
    assert len(validate(bad)) == 2


def test_real_bundles() -> None:
    for f in sorted(LIB.glob("*/library.json")):
        lib = json.loads(f.read_text())
        assert validate(lib, f.parent) == [], f
        assert lib["bundle"] == f.parent.name


if __name__ == "__main__":
    test_fixture_valid()
    test_fixture_broken_is_caught()
    test_real_bundles()
    print("schema: ok")
