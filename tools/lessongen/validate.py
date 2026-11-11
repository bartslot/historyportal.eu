#!/usr/bin/env python3
"""Validate a lesson.json (contract 2). The validators decide, not the writer.

  validate.py LESSON.json... [--corpus DIR] [--library-root DIR] [--resolve]
  validate.py LESSON.json... --totals [--json]   -> {lesson_id: total_s} (the director's parity test calls this)

Checks: schema, timeline from timing.json (narration <= 12 s a shot; est_s
is only the writer's note, still 6-12), every minute figure on the teacher card is rendered from teacher_template, interaction spacing (first <= 180 s, then
every <= 180 s, also after the last), every scene has fact_refs that resolve to a source and a real
source when it says a number or year, branch groups (game block, question + option_a run + option_b run, 1-3 shots
each, effects on known meters, a normal scene where they rejoin; spacing on the LONGEST play, the 10-minute minimum
on the SHORTEST), no verbatim overlap (6-word n-grams) between any prose string and
any cached LessonUp dump, Bloom mix of the quizzes, 1-4 power meters, text hygiene (no dashes, no emoji,
balloons <= 8 words), set layers resolve against the art library or are listed in needed_assets.
--resolve writes matching library asset ids into the layers and rebuilds needed_assets in place.
Exit 1 on any error.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

import jsonschema

HERE = Path(__file__).resolve().parent
SCHEMA = json.loads((HERE / "lesson.schema.json").read_text())
DEFAULT_CORPUS = HERE / ".cache" / "corpus"
DEFAULT_LIBRARY = Path.home() / "BartsMedia" / "historyportal" / "library"

TIMING = json.loads((HERE / "timing.json").read_text())  # shared with the S5 director
SHOT_MIN_S, SHOT_MAX_S = TIMING["shot_min_s"], TIMING["shot_max_s"]
FIRST_INTERACTION_MAX_S = 180
INTERACTION_GAP_MAX_S = 180
INTERACTION_GAP_MIN_S = 60
MIN_TOTAL_S = 600  # a lesson plays at least 10 minutes, on its shortest branch path
OPTION_SHOTS_MAX = 3
NGRAM = 6
RECALL_SHARE_MAX = 0.5
POWER_METERS_MIN, POWER_METERS_MAX = 1, 4
BALLOON_WORDS_MAX = 8
# Region tags (agreed with the art session). An asset carrying one only serves a need that asks for it.
REGIONS = {"mideast", "egypt", "mesopotamia", "batavia", "banda", "ocean", "newzealand", "tasmania", "mauritius"}
# Which regions each art bundle may show. A scene's region tags outside its bundle's set get a warning.
BUNDLE_REGIONS = {
    "nl-prehistory": set(),
    "nl-golden-age": {"batavia", "banda", "ocean", "newzealand", "tasmania", "mauritius"},
    "near-east-neolithic": {"mideast", "egypt", "mesopotamia"},
}
# A narrated number, year or amount is a hard fact: it needs a real (non-ledger) source in the scene.
HARD_FACT = re.compile(
    r"\d|honderd|duizend|miljoen|miljard|\b\w*(?:twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)\b"
    r"|\b(?:der|veer|vijf|zes|zeven|acht|negen)?tien\b|\belf\b|\btwaalf\b", re.I)
# Keys whose values are ids, enums, tags or paths, not prose.
NOT_PROSE = {"id", "url", "need", "asset", "sky", "char", "pose", "depth", "facing", "expression", "beat", "type",
             "kind", "input", "format", "lang", "bundle", "canon_venster", "related_venster", "layer", "tags",
             "fact_refs", "ledger", "level", "camera", "sound", "needed_assets", "lessonup_ids", "key", "icon", "role"}

# Every dash character, a spaced hyphen used as a dash, and the emoji blocks. "VOC-schip" is fine.
BAD_CHARS = re.compile("[\u2010-\u2015\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]|\\s-\\s")
WORD = re.compile(r"[a-zà-ÿ0-9']+")


def half_up(x: float) -> int:
    """timing.json "rounding": "half_up_total": sum raw floats, round ONCE at the end, .5 goes up (never banker's)."""
    return math.floor(x + 0.5)


def shot_s(sc: dict) -> float:
    """Shot time per timing.json: narration (measured tts_s, else words / words_per_s) + breath, floor shot_min_s."""
    n = TIMING["narration"]
    spoken = sc["tts_s"] if sc.get("tts_s") else len(sc["narration"].split()) / n["words_per_s"]
    return max(SHOT_MIN_S, spoken + n["breath_s"]) if sc["narration"].strip() or sc.get("tts_s") else SHOT_MIN_S


def interaction_s(it: dict) -> float:
    """Play time from timing.json, by type.format when that key exists; a team activity plays its own class_action_s."""
    if it.get("format") == "team":
        return it["class_action_s"]
    times = TIMING["interaction_s"]
    return times.get(f"{it['type']}.{it.get('format')}", times[it["type"]])


def total_s(lesson: dict) -> float:
    """Every scene once (both branches): timing.json's model, the director's parity number (--totals)."""
    return sum(scene_s(sc) for sc in lesson["scenes"])


def option_of(sc: dict) -> tuple[int, str] | None:
    b = sc.get("branch")
    return (b["group"], b["role"]) if b and b["role"] != "question" else None


def play(scenes: list[dict], longest: bool) -> list[dict]:
    """The scenes one class sees: per branch group only the longer (or shorter) option run; a tie plays option_a."""
    runs: dict[tuple[int, str], list[dict]] = {}
    for sc in scenes:
        if key := option_of(sc):
            runs.setdefault(key, []).append(sc)
    run_s = {k: sum(map(scene_s, r)) for k, r in runs.items()}
    dropped = set()
    for g in {k[0] for k in runs}:
        a, b = run_s.get((g, "option_a"), 0), run_s.get((g, "option_b"), 0)
        dropped.add((g, "option_b" if (a >= b) == longest else "option_a"))
    return [sc for sc in scenes if option_of(sc) not in dropped]


TYPED_MINUTES = re.compile(r"\d+\s*minuten")
MIN_RANGE = re.compile(r"\{min:(sc\d+)-(sc\d+)\}")


def scene_s(sc: dict) -> float:
    return shot_s(sc) + sc.get("class_action_s", 0) + interaction_play_s(sc)


def scene_interaction(sc: dict) -> dict | None:
    """What plays after the shot: its interaction, or a branch question's choice (timing.json 'choice')."""
    if sc["interaction"]:
        return sc["interaction"]
    return {"type": "choice"} if (sc.get("branch") or {}).get("role") == "question" else None


def interaction_play_s(sc: dict) -> float:
    it = scene_interaction(sc)
    return interaction_s(it) if it else 0


def render_teacher(lesson: dict) -> str:
    """The teacher card from teacher_template: {total_min}, {story_min} and {min:scA-scB} come from timing.json,
    on the longest play (one option per branch group)."""
    ids = [sc["id"] for sc in lesson["scenes"]]
    played = play(lesson["scenes"], longest=True)

    def span(m: re.Match) -> str:
        a, b = ids.index(m.group(1)), ids.index(m.group(2))  # ValueError = a range naming a missing scene
        return str(half_up(sum(scene_s(sc) for sc in played if a <= ids.index(sc["id"]) <= b) / 60))

    text = MIN_RANGE.sub(span, lesson["teacher_template"])
    return (text.replace("{total_min}", str(half_up(sum(map(scene_s, played)) / 60)))
                .replace("{story_min}", str(half_up(sum(shot_s(sc) for sc in played) / 60))))


def check_branches(lesson: dict) -> list[str]:
    """Every group: one question, then 1-3 option_a shots, then 1-3 option_b shots, then a normal scene. The FIRST
    shot of each run carries effects with deltas on the game's meters; no branch scene carries an interaction."""
    scenes = lesson["scenes"]
    branched = [sc for sc in scenes if sc.get("branch")]
    game = lesson.get("game")
    if not branched:
        return ["game block but no branch scenes"] if game else []
    if not game:
        return ["branch scenes but no game block (meters)"]
    errors: list[str] = []
    meters = [m["key"] for m in game["meters"]]
    if len(set(meters)) != len(meters):
        errors.append("game meter keys are not unique")
    seen: set[int] = set()
    i = 0
    while i < len(scenes):
        b = scenes[i].get("branch")
        if not b:
            i += 1
            continue
        g, start = b["group"], scenes[i]["id"]
        j = i
        while j < len(scenes) and (scenes[j].get("branch") or {}).get("group") == g:
            j += 1
        roles = [sc["branch"]["role"] for sc in scenes[i:j]]
        na, nb = roles.count("option_a"), roles.count("option_b")
        if g in seen:
            errors.append(f"{start}: branch group {g} appears twice: a group is one run of scenes")
        seen.add(g)
        if roles != ["question"] + ["option_a"] * na + ["option_b"] * nb:
            errors.append(f"{start}: branch group {g} must be one question, then option_a shots, then option_b shots: {roles}")
        for role, n in (("option_a", na), ("option_b", nb)):
            if not 1 <= n <= OPTION_SHOTS_MAX:
                errors.append(f"{start}: branch group {g} {role} has {n} shots, need 1-{OPTION_SHOTS_MAX}")
        for k, sc in enumerate(scenes[i:j], i):
            if sc["interaction"]:
                errors.append(f"{sc['id']}: a branch scene carries no interaction (the choice is the interaction)")
            if option_of(sc) is None:
                continue
            first = option_of(scenes[k - 1]) != option_of(sc)
            effects = sc["branch"].get("effects")
            if first and not effects:
                errors.append(f"{sc['id']}: first shot of group {g} {sc['branch']['role']} needs effects with deltas")
            if not first and effects:
                errors.append(f"{sc['id']}: effects belong on the first shot of the option run only")
            for key in (effects or {}).get("deltas", {}):
                if key not in meters:
                    errors.append(f"{sc['id']}: delta on unknown meter {key!r} (game meters: {meters})")
        if j == len(scenes):
            errors.append(f"branch group {g} never rejoins: the lesson ends inside option_b")
        elif scenes[j].get("branch"):
            errors.append(f"{scenes[j]['id']}: the scene after group {g} must be a normal scene where both branches rejoin")
        i = j
    return errors


def all_texts(node: object, where: str = "") -> list[tuple[str, str]]:
    """Every prose string anywhere in the lesson (title, teacher, goals, notes, ...), as (where, text)."""
    if isinstance(node, str):
        return [(where, node)]
    if isinstance(node, list):
        return [t for i, x in enumerate(node)
                for t in all_texts(x, f"{where}.{x['id']}" if isinstance(x, dict) and "id" in x else f"{where}[{i}]")]
    if isinstance(node, dict):
        return [t for k, x in node.items() if k not in NOT_PROSE for t in all_texts(x, f"{where}.{k}")]
    return []


def ngrams(text: str, n: int = NGRAM) -> set[tuple[str, ...]]:
    words = WORD.findall(text.lower())
    return {tuple(words[i:i + n]) for i in range(len(words) - n + 1)}


def corpus_texts(ids: list[int], corpus_dir: Path) -> tuple[list[str], list[int]]:
    """Slide texts of every cached dump (not only this blueprint's), plus which blueprint ids are missing."""
    missing = [lid for lid in ids if not (corpus_dir / f"{lid}.json").exists()]
    texts: list[str] = []
    for path in sorted(corpus_dir.glob("*.json")) if corpus_dir.is_dir() else []:
        for s in json.loads(path.read_text())["slides"]:
            parts = [s.get("plain_text"), s.get("body"), s.get("question"), s.get("title")] + (s.get("answers") or [])
            texts.append(" ".join(p for p in parts if p))
    return texts, missing


def load_library(root: Path, bundle: str) -> list[dict] | None:
    path = root / bundle / "library.json"
    if not path.exists():
        return None
    return json.loads(path.read_text()).get("assets", [])


def norm(tag: str) -> str:
    """Lowercase and fold a plural -s, so a need "reed" meets an asset tagged "reeds"."""
    tag = tag.lower()
    if tag in REGIONS:
        return tag
    return tag[:-1] if len(tag) > 3 and tag.endswith("s") and not tag.endswith("ss") else tag


def split_tags(need: str) -> list[str]:
    return [("!" if t.startswith("!") else "") + norm(t.lstrip("!")) for t in re.split(r"[\s,]+", need.strip()) if t]


def match_asset(need: str, depth: str, library: list[dict]) -> dict | None:
    """Best library asset for a need. The first tag is the head noun and must match, as must every tag
    marked "!" (e.g. "hills dry !mideast"); an asset whose FIRST tag is the head noun beats one that only carries it later
    (a birch tagged "heath" is not heath); then every further tag that matches ranks higher, then same layer,
    then QA score. The asset id counts as a tag. Region tags work both ways: an asset tagged with a region
    only serves a need that requires that region, so Drenthe never gets a Mesopotamian field."""
    want = [t.lstrip("!") for t in split_tags(need)]
    required = {want[0]} | {t.lstrip("!") for t in split_tags(need) if t.startswith("!")} if want else set()
    if not want:
        return None

    def tags_of(a: dict) -> set[str]:
        return {norm(t) for t in a.get("tags", [])} | {a["id"].lower()}

    hits = [a for a in library if required <= tags_of(a) and tags_of(a) & REGIONS <= required]
    def is_kind(a: dict) -> bool:  # the asset's first tag says what it IS; later tags say where/what with
        return bool(a.get("tags")) and norm(a["tags"][0]) == want[0]

    hits.sort(key=lambda a: (not is_kind(a), -len(set(want) & tags_of(a)), a.get("layer") != depth,
                             -(a.get("qa") or {}).get("score", 0)))
    return hits[0] if hits else None


def scene_bundle(lesson: dict, sc: dict) -> str:
    """A scene's own bundle (e.g. the Near East scenes of a Dutch lesson) overrides the lesson's."""
    return sc.get("bundle") or lesson["bundle"]


def libraries(lesson: dict, root: Path) -> dict[str, list[dict] | None]:
    return {b: load_library(root, b) for b in {lesson["bundle"]} | {scene_bundle(lesson, sc) for sc in lesson["scenes"]}}


def needed_key(bundle: str, tags: str, layer: str, lesson_bundle: str) -> tuple[str, str, str]:
    return (bundle or lesson_bundle, tags.strip().lower(), layer)


def resolve(lesson: dict, library_root: Path) -> dict:
    """New lesson with asset ids filled from each scene's bundle library and needed_assets rebuilt from the misses."""
    lesson = json.loads(json.dumps(lesson))
    libs = libraries(lesson, library_root)
    needed: dict[tuple[str, str, str], list[str]] = {}
    for sc in lesson["scenes"]:
        bundle = scene_bundle(lesson, sc)
        wants = [(layer, layer["depth"]) for layer in sc["set"]["layers"]] + [({"need": sc["set"]["sky"]}, "sky")]
        for layer, depth in wants:
            hit = match_asset(layer["need"], depth, libs[bundle] or [])
            if "asset" in layer and depth != "sky":
                layer["asset"] = hit["id"] if hit else None
            if not hit:
                needed.setdefault((bundle, layer["need"].strip().lower(), depth), []).append(sc["id"])
    if lesson.get("teacher_template"):  # every minute figure on the card is generated, never typed
        try:
            lesson["teacher"] = render_teacher(lesson)
        except ValueError:
            pass  # check() reports the bad {min:scA-scB} range
    lesson["needed_assets"] = [
        {"tags": tags, "layer": depth, "why": ", ".join(dict.fromkeys(ids)), **({"bundle": b} if b != lesson["bundle"] else {})}
        for (b, tags, depth), ids in needed.items()
    ]
    return lesson


def check(lesson: dict, corpus_dir: Path = DEFAULT_CORPUS, library_root: Path = DEFAULT_LIBRARY,
          min_total_s: float = MIN_TOTAL_S) -> tuple[list[str], list[str], dict]:
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

    errors += check_branches(lesson)
    for sc in scenes:
        if not SHOT_MIN_S <= sc["est_s"] <= SHOT_MAX_S:
            errors.append(f"{sc['id']}: est_s {sc['est_s']} outside {SHOT_MIN_S}-{SHOT_MAX_S}")
        shot = shot_s(sc)
        if shot > SHOT_MAX_S:
            errors.append(f"{sc['id']}: narration takes {shot:.1f} s, max {SHOT_MAX_S}: split the shot")

    # Timeline per timing.json on the longest play: each shot, then its class action, then its interaction.
    t = 0.0
    spans: list[tuple[float, float, str, str]] = []  # (start, end, scene id, type)
    for sc in play(scenes, longest=True):
        t += shot_s(sc) + sc.get("class_action_s", 0)
        if it := scene_interaction(sc):
            spans.append((t, t + interaction_s(it), sc["id"], it["type"]))
            t += interaction_s(it)
    shortest = sum(map(scene_s, play(scenes, longest=False)))
    stats["total_s"] = half_up(total_s(lesson))
    if any(sc.get("branch") for sc in scenes):
        stats["longest_s"], stats["shortest_s"] = half_up(t), half_up(shortest)
    if shortest < min_total_s:
        errors.append(f"the shortest play takes {half_up(shortest)} s, a lesson needs at least {round(min_total_s)} s")
    stats["story_s"] = half_up(sum(shot_s(sc) for sc in scenes))
    stats["class_actions_s"] = sum(sc.get("class_action_s", 0) for sc in scenes)
    if lesson.get("teacher_template"):
        if TYPED_MINUTES.search(lesson["teacher_template"]):
            errors.append("teacher_template types a minute figure: use {total_min}, {story_min} or {min:scA-scB}")
        try:
            if lesson.get("teacher") != render_teacher(lesson):
                errors.append("teacher is stale: run validate.py --resolve to render it from teacher_template")
        except ValueError:
            errors.append("teacher_template names a scene that does not exist in {min:scA-scB}")
    elif TYPED_MINUTES.search(lesson.get("teacher", "")):
        errors.append("teacher card types minutes: move it to teacher_template with {total_min}/{story_min}/{min:scA-scB}")
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
            errors.append(f"{round(t - spans[-1][1])} s of story after the last interaction")

    # Facts.
    source_ids = {s["id"] for s in lesson["sources"]}
    if not any(s["kind"] == "canon" for s in lesson["sources"]):
        errors.append("no canon source")
    real_sources = {s["id"] for s in lesson["sources"] if s["kind"] != "ledger"}
    for sc in scenes:
        said = f"{sc['narration']} {sc.get('on_screen', '')}"
        if HARD_FACT.search(said) and not set(sc["fact_refs"]) & real_sources:
            errors.append(f"{sc['id']}: number or year in the text but no real (non-ledger) source in fact_refs")
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

    # Text hygiene: everything a person reads (class or teacher), sources' notes excepted.
    for where, text in all_texts({k: x for k, x in lesson.items() if k != "sources"}):
        if BAD_CHARS.search(text):
            errors.append(f"{where}: dash or emoji in UI text: {text[:60]!r}")

    # Verbatim overlap with LessonUp.
    lu_ids = lesson["blueprint"]["lessonup_ids"]
    texts, missing = corpus_texts(lu_ids, corpus_dir)
    if missing:
        errors.append(f"LessonUp dumps missing for {missing}: run corpus.py dump {' '.join(map(str, missing))} --out {corpus_dir}")
    their = set().union(*(ngrams(x) for x in texts)) if texts else set()
    for where, text in all_texts(lesson):
        shared = ngrams(text) & their
        if shared:
            errors.append(f"{where}: verbatim LessonUp overlap {' '.join(next(iter(shared)))!r}")

    # Set layers vs the art library.
    libs = libraries(lesson, library_root)
    stats["library"] = {b: "missing" if lib is None else f"{len(lib)} assets" for b, lib in sorted(libs.items())}
    listed = {needed_key(n.get("bundle", ""), n["tags"], n["layer"], lesson["bundle"]) for n in lesson["needed_assets"]}
    for sc in scenes:
        bundle = scene_bundle(lesson, sc)
        library = libs[bundle]
        needs = [layer["need"] for layer in sc["set"]["layers"]] + [sc["set"]["sky"]]
        regions = {t.lstrip("!") for n in needs for t in split_tags(n) if t.startswith("!")} & REGIONS
        if regions - BUNDLE_REGIONS.get(bundle, set()):
            warnings.append(f"{sc['id']}: place {sorted(regions)} is outside bundle {bundle}: set scene.bundle")
        for layer in sc["set"]["layers"]:
            if layer["asset"]:
                if library is not None and layer["asset"] not in {a["id"] for a in library}:
                    errors.append(f"{sc['id']}: asset {layer['asset']!r} not in the {bundle} library")
                continue
            hit = match_asset(layer["need"], layer["depth"], library or [])
            if not hit and needed_key(bundle, layer["need"], layer["depth"], lesson["bundle"]) not in listed:
                errors.append(f"{sc['id']}: need {layer['need']!r} ({layer['depth']}) neither in the library nor in needed_assets")
    return errors, warnings, stats


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("lessons", type=Path, nargs="+")
    ap.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    ap.add_argument("--library-root", type=Path, default=DEFAULT_LIBRARY)
    ap.add_argument("--resolve", action="store_true", help="fill asset ids + rebuild needed_assets, write back")
    ap.add_argument("--totals", action="store_true", help="only print each lesson's total_s (timing.json model)")
    ap.add_argument("--json", action="store_true", help="with --totals: one JSON object {lesson_id: total_s}")
    a = ap.parse_args()
    if a.totals:
        totals = {(lesson := json.loads(p.read_text()))["id"]: half_up(total_s(lesson)) for p in a.lessons}
        print(json.dumps(totals) if a.json else "\n".join(f"{k} {t}" for k, t in totals.items()))
        return
    failed = False
    for path in a.lessons:
        lesson = json.loads(path.read_text())
        if a.resolve:
            lesson = resolve(lesson, a.library_root)
            path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n")
        errors, warnings, stats = check(lesson, a.corpus, a.library_root)
        print(json.dumps(stats, ensure_ascii=False))
        for w in warnings:
            print(f"warn  {w}")
        for e in errors:
            print(f"ERROR {e}")
        print(f"{path.name}: {'FAIL' if errors else 'OK'} ({len(errors)} errors, {len(warnings)} warnings)")
        failed = failed or bool(errors)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
