#!/usr/bin/env python3
"""Validate a lesson.json (contract 2). The validators decide, not the writer.

  validate.py LESSON.json [--corpus DIR] [--library-root DIR] [--resolve]

Checks: schema, shot length (est_s 6-12), interaction spacing (first <= 180 s, then every <= 180 s),
every scene has fact_refs that resolve to a source, no verbatim overlap with the LessonUp slides used
(6-word n-grams), Bloom mix of the quizzes, at least one power-meter, UI text hygiene (no dashes, no
emoji), set layers resolve against the art library or are listed in needed_assets.
--resolve writes matching library asset ids into the layers and rebuilds needed_assets in place.
Exit 1 on any error.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import jsonschema

HERE = Path(__file__).resolve().parent
SCHEMA = json.loads((HERE / "lesson.schema.json").read_text())
DEFAULT_CORPUS = HERE / ".cache" / "corpus"
DEFAULT_LIBRARY = Path.home() / "BartsMedia" / "historyportal" / "library"

SHOT_MIN_S, SHOT_MAX_S = 6, 12
FIRST_INTERACTION_MAX_S = 180
INTERACTION_GAP_MAX_S = 180
INTERACTION_GAP_MIN_S = 60
NGRAM = 6
RECALL_SHARE_MAX = 0.5
POWER_METERS_MIN, POWER_METERS_MAX = 1, 4
BALLOON_WORDS_MAX = 8

# Em/en dash and the emoji blocks. A plain hyphen inside a word ("VOC-schip") is fine.
BAD_CHARS = re.compile("[–—―\U0001F000-\U0001FAFF☀-➿️]")
WORD = re.compile(r"[a-zà-ÿ0-9']+")


def ui_texts(lesson: dict) -> list[tuple[str, str]]:
    """Every string the class sees or hears (plus teacher-facing why/history), as (where, text)."""
    out: list[tuple[str, str]] = []
    for sc in lesson["scenes"]:
        sid = sc["id"]
        out.append((f"{sid}.narration", sc["narration"]))
        if sc.get("on_screen"):
            out.append((f"{sid}.on_screen", sc["on_screen"]))
        out += [(f"{sid}.balloon", b["text"]) for b in sc["balloons"]]
        it = sc.get("interaction") or {}
        for key in ("question", "explain", "prompt", "payoff", "why", "history"):
            if it.get(key):
                out.append((f"{sid}.{it['type']}.{key}", it[key]))
        for opt in it.get("options", []):
            text = opt if isinstance(opt, str) else f"{opt['text']} {opt['outcome']}"
            out.append((f"{sid}.{it['type']}.option", text))
        out += [(f"{sid}.meter.word", w) for w in it.get("right", []) + it.get("wrong", [])]
    return out


def ngrams(text: str, n: int = NGRAM) -> set[tuple[str, ...]]:
    words = WORD.findall(text.lower())
    return {tuple(words[i:i + n]) for i in range(len(words) - n + 1)}


def corpus_texts(ids: list[int], corpus_dir: Path) -> tuple[list[str], list[int]]:
    texts, missing = [], []
    for lid in ids:
        path = corpus_dir / f"{lid}.json"
        if not path.exists():
            missing.append(lid)
            continue
        for s in json.loads(path.read_text())["slides"]:
            parts = [s.get("plain_text"), s.get("body"), s.get("question"), s.get("title")] + (s.get("answers") or [])
            texts.append(" ".join(p for p in parts if p))
    return texts, missing


def load_library(root: Path, bundle: str) -> list[dict] | None:
    path = root / bundle / "library.json"
    if not path.exists():
        return None
    return json.loads(path.read_text()).get("assets", [])


def split_tags(need: str) -> list[str]:
    return [t for t in re.split(r"[\s,]+", need.strip().lower()) if t]


def match_asset(need: str, depth: str, library: list[dict]) -> dict | None:
    """Best library asset carrying every needed tag (id counts as a tag); same layer preferred."""
    want = set(split_tags(need))
    hits = [a for a in library if want <= set(t.lower() for t in a.get("tags", [])) | {a["id"].lower()}]
    hits.sort(key=lambda a: (a.get("layer") != depth, -(a.get("qa") or {}).get("score", 0)))
    return hits[0] if hits else None


def resolve(lesson: dict, library: list[dict] | None) -> dict:
    """New lesson with asset ids filled from the library and needed_assets rebuilt from the misses."""
    lesson = json.loads(json.dumps(lesson))
    needed: dict[tuple[str, str], list[str]] = {}
    for sc in lesson["scenes"]:
        wants = [(layer, layer["depth"]) for layer in sc["set"]["layers"]] + [({"need": sc["set"]["sky"]}, "sky")]
        for layer, depth in wants:
            hit = match_asset(layer["need"], depth, library or [])
            if "asset" in layer and depth != "sky":
                layer["asset"] = hit["id"] if hit else None
            if not hit:
                needed.setdefault((layer["need"].strip().lower(), depth), []).append(sc["id"])
    lesson["needed_assets"] = [
        {"tags": tags, "layer": depth, "why": ", ".join(dict.fromkeys(ids))} for (tags, depth), ids in needed.items()
    ]
    return lesson


def check(lesson: dict, corpus_dir: Path = DEFAULT_CORPUS, library_root: Path = DEFAULT_LIBRARY) -> tuple[list[str], list[str], dict]:
    errors: list[str] = []
    warnings: list[str] = []
    stats: dict = {}

    schema_errors = sorted(jsonschema.Draft202012Validator(SCHEMA).iter_errors(lesson), key=lambda e: list(e.path))
    if schema_errors:
        return [f"schema: /{'/'.join(map(str, e.path))}: {e.message}" for e in schema_errors[:30]], warnings, stats

    scenes = lesson["scenes"]
    ids = [sc["id"] for sc in scenes]
    if len(set(ids)) != len(ids):
        errors.append("scene ids are not unique")

    # Shot length + timeline (narrated shot time, then interaction play time).
    t = 0.0
    spans: list[tuple[float, float, str, str]] = []  # (start, end, scene id, type)
    for sc in scenes:
        if not SHOT_MIN_S <= sc["est_s"] <= SHOT_MAX_S:
            errors.append(f"{sc['id']}: est_s {sc['est_s']} outside {SHOT_MIN_S}-{SHOT_MAX_S}")
        t += sc["est_s"]
        if sc["interaction"]:
            spans.append((t, t + sc["interaction"]["est_s"], sc["id"], sc["interaction"]["type"]))
            t += sc["interaction"]["est_s"]
    stats["total_s"] = round(t)
    stats["interactions"] = [f"{round(s)}s {sid} {kind}" for s, _, sid, kind in spans]
    if not spans:
        errors.append("no interactions at all")
    else:
        if spans[0][0] > FIRST_INTERACTION_MAX_S:
            errors.append(f"first interaction at {round(spans[0][0])} s ({spans[0][2]}), must be <= {FIRST_INTERACTION_MAX_S}")
        for prev, nxt in zip(spans, spans[1:]):
            gap = nxt[0] - prev[1]
            if gap > INTERACTION_GAP_MAX_S:
                errors.append(f"{round(gap)} s of story without interaction before {nxt[2]} (max {INTERACTION_GAP_MAX_S})")
            elif gap < INTERACTION_GAP_MIN_S:
                warnings.append(f"only {round(gap)} s of story before {nxt[2]}: interactions bunch up")
        if t - spans[-1][1] > INTERACTION_GAP_MAX_S:
            warnings.append(f"{round(t - spans[-1][1])} s of story after the last interaction")

    # Facts.
    source_ids = {s["id"] for s in lesson["sources"]}
    if not any(s["kind"] == "canon" for s in lesson["sources"]):
        errors.append("no canon source")
    for sc in scenes:
        if not sc["fact_refs"]:
            errors.append(f"{sc['id']}: no fact_refs")
        for ref in sc["fact_refs"]:
            if ref not in source_ids:
                errors.append(f"{sc['id']}: fact_ref {ref!r} is not a source id")

    # Interactions: Bloom mix + power meters.
    quizzes = [sc["interaction"] for sc in scenes if (sc["interaction"] or {}).get("type") == "quiz"]
    meters = [sc for sc in scenes if (sc["interaction"] or {}).get("type") == "power-meter"]
    blooms = [q["bloom"] for q in quizzes]
    stats["bloom"] = blooms
    if len(quizzes) < 2:
        errors.append(f"{len(quizzes)} quiz moment(s), need at least 2")
    elif blooms.count(1) / len(blooms) > RECALL_SHARE_MAX or len(set(blooms)) < 2:
        errors.append(f"Bloom mix {blooms}: at most {int(RECALL_SHARE_MAX * 100)}% recall (1) and at least two levels")
    if not POWER_METERS_MIN <= len(meters) <= POWER_METERS_MAX:
        errors.append(f"{len(meters)} power-meter moments, need {POWER_METERS_MIN}-{POWER_METERS_MAX}")
    for q in quizzes:
        n = len(q["options"])
        c = q["correct"]
        if q.get("format", "mc") in ("mc", "true-false") and not (isinstance(c, int) and 0 <= c < n):
            errors.append(f"quiz {q['question'][:40]!r}: correct index {c} not in options")

    # Characters + balloons.
    known_chars = {c["id"] for c in lesson.get("characters", [])}
    for sc in scenes:
        here = {f["char"] for f in sc["figures"]}
        for b in sc["balloons"]:
            if len(b["text"].split()) > BALLOON_WORDS_MAX:
                errors.append(f"{sc['id']}: balloon longer than {BALLOON_WORDS_MAX} words: {b['text']!r}")
            if b["char"] not in here | known_chars:
                warnings.append(f"{sc['id']}: balloon by {b['char']!r} who is not in the scene")
        for f in sc["figures"]:
            if known_chars and f["char"] not in known_chars:
                warnings.append(f"{sc['id']}: figure {f['char']!r} not in characters")

    # UI text hygiene.
    for where, text in ui_texts(lesson):
        if BAD_CHARS.search(text):
            errors.append(f"{where}: dash or emoji in UI text: {text[:60]!r}")

    # Verbatim overlap with LessonUp.
    lu_ids = lesson["blueprint"]["lessonup_ids"]
    texts, missing = corpus_texts(lu_ids, corpus_dir)
    if missing:
        errors.append(f"LessonUp dumps missing for {missing}: run corpus.py dump {' '.join(map(str, missing))} --out {corpus_dir}")
    their = set().union(*(ngrams(x) for x in texts)) if texts else set()
    for where, text in ui_texts(lesson):
        shared = ngrams(text) & their
        if shared:
            errors.append(f"{where}: verbatim LessonUp overlap {' '.join(next(iter(shared)))!r}")

    # Set layers vs the art library.
    library = load_library(library_root, lesson["bundle"])
    stats["library"] = "missing" if library is None else f"{len(library)} assets"
    lib_ids = {a["id"] for a in library or []}
    listed = {(n["tags"].strip().lower(), n["layer"]) for n in lesson["needed_assets"]}
    for sc in scenes:
        for layer in sc["set"]["layers"]:
            if layer["asset"]:
                if library is not None and layer["asset"] not in lib_ids:
                    errors.append(f"{sc['id']}: asset {layer['asset']!r} not in the {lesson['bundle']} library")
                continue
            hit = match_asset(layer["need"], layer["depth"], library or [])
            if not hit and (layer["need"].strip().lower(), layer["depth"]) not in listed:
                errors.append(f"{sc['id']}: need {layer['need']!r} ({layer['depth']}) neither in the library nor in needed_assets")
    return errors, warnings, stats


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("lesson", type=Path)
    ap.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    ap.add_argument("--library-root", type=Path, default=DEFAULT_LIBRARY)
    ap.add_argument("--resolve", action="store_true", help="fill asset ids + rebuild needed_assets, write back")
    a = ap.parse_args()
    lesson = json.loads(a.lesson.read_text())
    if a.resolve:
        lesson = resolve(lesson, load_library(a.library_root, lesson.get("bundle", "")))
        a.lesson.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n")
    errors, warnings, stats = check(lesson, a.corpus, a.library_root)
    print(json.dumps(stats, ensure_ascii=False))
    for w in warnings:
        print(f"warn  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"{a.lesson.name}: {'FAIL' if errors else 'OK'} ({len(errors)} errors, {len(warnings)} warnings)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
