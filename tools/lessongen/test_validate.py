"""Tests for validate.py. Run: python3 -m pytest tools/lessongen"""
from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

import validate as v

HERE = Path(__file__).resolve().parent
NO_LIBRARY = Path("/nonexistent-library")


@pytest.fixture
def lesson() -> dict:
    return json.loads((HERE / "fixtures" / "minimal.json").read_text())


def errors_of(lesson: dict, **kw) -> list[str]:
    kw.setdefault("library_root", NO_LIBRARY)
    return v.check(lesson, **kw)[0]


def test_fixture_is_valid(lesson):
    assert errors_of(lesson) == []


def test_schema_rejects_unknown_beat(lesson):
    lesson["scenes"][0]["beat"] = "middle"
    assert any(e.startswith("schema:") for e in errors_of(lesson))


def test_shot_too_long(lesson):
    lesson["scenes"][1]["est_s"] = 14
    assert any("sc02: est_s 14" in e for e in errors_of(lesson))


def test_first_interaction_too_late(lesson):
    lesson["scenes"][0]["interaction"] = None
    lesson["scenes"][1]["interaction"] = None
    filler = lesson["scenes"][1]
    lesson["scenes"][1:1] = [dict(copy.deepcopy(filler), id=f"sc{10 + i}") for i in range(30)]
    assert any("first interaction at" in e for e in errors_of(lesson))


def test_long_gap_between_interactions(lesson):
    filler = copy.deepcopy(lesson["scenes"][1])
    filler["interaction"] = None
    lesson["scenes"][2:2] = [dict(copy.deepcopy(filler), id=f"sc{10 + i}") for i in range(30)]
    assert any("without interaction before sc03" in e for e in errors_of(lesson))


def test_fact_ref_must_be_a_source(lesson):
    lesson["scenes"][2]["fact_refs"] = ["s7"]
    assert any("fact_ref 's7'" in e for e in errors_of(lesson))
    lesson["scenes"][2]["fact_refs"] = []
    assert any("sc03: no fact_refs" in e for e in errors_of(lesson))


def test_needs_a_canon_source(lesson):
    lesson["sources"][0]["kind"] = "wikipedia"
    assert "no canon source" in errors_of(lesson)


def test_bloom_mix_rejects_all_recall(lesson):
    lesson["scenes"][0]["interaction"]["bloom"] = 1
    assert any(e.startswith("Bloom mix") for e in errors_of(lesson))


def test_needs_a_power_meter(lesson):
    lesson["scenes"][1]["interaction"] = None
    assert any("power-meter moments" in e for e in errors_of(lesson))


def test_quiz_correct_index_in_range(lesson):
    lesson["scenes"][2]["interaction"]["correct"] = 5
    assert any("correct index 5" in e for e in errors_of(lesson))


@pytest.mark.parametrize("bad", ["Een steen — zwaar.", "Een steen \U0001F600"])
def test_dash_and_emoji_rejected(lesson, bad):
    lesson["scenes"][0]["narration"] = bad
    assert any("dash or emoji" in e for e in errors_of(lesson))


def test_hyphen_in_word_allowed(lesson):
    lesson["scenes"][0]["narration"] = "Een VOC-schip ligt stil."
    assert errors_of(lesson) == []


def test_verbatim_lessonup_overlap(lesson, tmp_path):
    slide = {"plain_text": "Midden op de hei ligt een steen zo groot als een paard."}
    (tmp_path / "42.json").write_text(json.dumps({"slides": [slide]}))
    lesson["blueprint"]["lessonup_ids"] = [42]
    errs = errors_of(lesson, corpus_dir=tmp_path)
    assert any("verbatim LessonUp overlap" in e and "sc01.narration" in e for e in errs)


def test_short_shared_phrase_is_fine(lesson, tmp_path):
    (tmp_path / "42.json").write_text(json.dumps({"slides": [{"plain_text": "op de hei ligt"}]}))
    lesson["blueprint"]["lessonup_ids"] = [42]
    assert errors_of(lesson, corpus_dir=tmp_path) == []


def test_missing_corpus_dump_is_an_error(lesson, tmp_path):
    lesson["blueprint"]["lessonup_ids"] = [99]
    assert any("dumps missing for [99]" in e for e in errors_of(lesson, corpus_dir=tmp_path))


def test_unlisted_need_is_an_error(lesson):
    lesson["needed_assets"] = [n for n in lesson["needed_assets"] if n["tags"] != "hunebed"]
    assert any("need 'hunebed'" in e for e in errors_of(lesson))


def _library(tmp_path: Path, assets: list[dict]) -> Path:
    (tmp_path / "nl-prehistory").mkdir()
    (tmp_path / "nl-prehistory" / "library.json").write_text(json.dumps({"assets": assets}))
    return tmp_path


def test_resolve_fills_assets_and_rebuilds_needed(lesson, tmp_path):
    root = _library(tmp_path, [
        {"id": "heath-01", "layer": "bg", "tags": ["heath", "far"], "qa": {"score": 6}},
        {"id": "heath-02", "layer": "bg", "tags": ["heath"], "qa": {"score": 9}},
    ])
    out = v.resolve(lesson, root)
    assert out["scenes"][0]["set"]["layers"][0]["asset"] == "heath-02"
    assert {"tags": "heath", "layer": "bg", "why": "sc01, sc02"} not in out["needed_assets"]
    assert any(n["tags"] == "hunebed" for n in out["needed_assets"])
    assert lesson["scenes"][0]["set"]["layers"][0]["asset"] is None  # input untouched
    assert v.check(out, library_root=root)[0] == []


def test_asset_not_in_library_is_an_error(lesson, tmp_path):
    root = _library(tmp_path, [{"id": "heath-01", "layer": "bg", "tags": ["heath"]}])
    lesson["scenes"][0]["set"]["layers"][0]["asset"] = "oak-99"
    assert any("asset 'oak-99' not in" in e for e in v.check(lesson, library_root=root)[0])


def test_balloon_too_long(lesson):
    lesson["scenes"][0]["balloons"][0]["text"] = "een twee drie vier vijf zes zeven acht negen"
    assert any("balloon longer than 8 words" in e for e in errors_of(lesson))


def test_head_noun_must_match_extra_tags_rank(tmp_path):
    lib = [
        {"id": "field-01", "layer": "bg", "tags": ["field"], "qa": {"score": 9}},
        {"id": "field-02", "layer": "bg", "tags": ["field", "barley"], "qa": {"score": 5}},
        {"id": "barley-01", "layer": "prop", "tags": ["barley"]},
    ]
    assert v.match_asset("field barley ripe", "bg", lib)["id"] == "field-02"
    assert v.match_asset("field", "bg", lib)["id"] == "field-01"
    assert v.match_asset("hut barley", "bg", lib) is None


def test_bang_tag_is_required():
    lib = [{"id": "hills-nl", "layer": "bg", "tags": ["hills", "dry"]},
           {"id": "hills-me", "layer": "bg", "tags": ["hills", "mideast"]}]
    assert v.match_asset("hills dry !mideast", "bg", lib)["id"] == "hills-me"
    assert v.match_asset("hills !egypt", "bg", lib) is None


def test_region_asset_never_serves_a_plain_need():
    lib = [{"id": "field-mesopotamia-cracked", "layer": "bg", "tags": ["field", "mesopotamia"], "qa": {"score": 9}},
           {"id": "hut-natufian", "layer": "mid", "tags": ["hut", "mideast"]}]
    assert v.match_asset("field", "bg", lib) is None
    assert v.match_asset("hut round", "mid", lib) is None
    assert v.match_asset("field !mesopotamia", "bg", lib)["id"] == "field-mesopotamia-cracked"


def test_number_needs_a_real_source(lesson):
    lesson["scenes"][1]["narration"] = "Het grootste hunebed weegt tweehonderdduizend kilo."
    lesson["scenes"][1]["fact_refs"] = ["s9"]
    assert any("sc02: number or year" in e for e in errors_of(lesson))
    lesson["scenes"][1]["fact_refs"] = ["s1", "s9"]
    assert errors_of(lesson) == []


def test_empty_source_url_rejected(lesson):
    lesson["sources"][0]["url"] = ""
    assert any(e.startswith("schema:") for e in errors_of(lesson))


def test_too_much_narration_for_one_shot(lesson):
    lesson["scenes"][1]["narration"] = " ".join(["woord"] * 30)  # 30 / 2.4 + 0.6 = 13.1 s
    assert any("sc02: narration takes 13.1 s" in e for e in errors_of(lesson))


def test_timeline_follows_timing_json(lesson):
    # sc01: 12 words -> 5.6 s -> floor 6, class action 30, quiz 40; sc02 + sc03: 9 words -> floor 6; meter 60, quiz 40
    lesson["scenes"][0]["class_action_s"] = 30
    stats = v.check(lesson, library_root=NO_LIBRARY)[2]
    assert stats["interactions"] == ["36s sc01 quiz", "82s sc02 power-meter", "148s sc03 quiz"]
    assert stats["total_s"] == 188 and stats["class_actions_s"] == 30


def test_measured_tts_overrides_the_estimate(lesson):
    lesson["scenes"][0]["tts_s"] = 10.4
    assert v.shot_s(lesson["scenes"][0]) == pytest.approx(11.0)
    lesson["scenes"][0]["tts_s"] = 12.0
    assert any("sc01: narration takes 12.6 s" in e for e in errors_of(lesson))


def test_overlap_checked_in_every_string_and_every_dump(lesson, tmp_path):
    (tmp_path / "7.json").write_text(json.dumps({"slides": [{"plain_text": "de boeren bouwden grote graven van stenen"}]}))
    lesson["teacher"] = "Uitleg: de boeren bouwden grote graven van stenen in Drenthe."
    errs = errors_of(lesson, corpus_dir=tmp_path)  # 7 is not in blueprint.lessonup_ids
    assert any(".teacher: verbatim LessonUp overlap" in e for e in errs)


@pytest.mark.parametrize("bad", ["Een steen - zwaar.", "Een steen ‐ zwaar."])
def test_spaced_hyphen_and_unicode_hyphen_rejected_in_title(lesson, bad):
    lesson["title"] = bad
    assert any(".title: dash or emoji" in e for e in errors_of(lesson))


def test_long_tail_after_last_interaction(lesson):
    filler = copy.deepcopy(lesson["scenes"][2])
    filler["interaction"] = None
    lesson["scenes"] += [dict(copy.deepcopy(filler), id=f"sc{10 + i}") for i in range(35)]
    assert any("after the last interaction" in e for e in errors_of(lesson))


@pytest.mark.parametrize("said", ["Er waren er zeventig.", "Nog tweeënvijftig staan er.", "Het duurde veertien dagen."])
def test_number_words_need_a_real_source(lesson, said):
    lesson["scenes"][1]["narration"] = said
    lesson["scenes"][1]["fact_refs"] = ["s9"]
    assert any("sc02: number or year" in e for e in errors_of(lesson))


def test_ordinary_words_are_not_numbers(lesson):
    lesson["scenes"][1]["narration"] = "Dat is lastig en krachtig werk, zelf doen."
    lesson["scenes"][1]["fact_refs"] = ["s9"]
    assert errors_of(lesson) == []


def test_scene_bundle_overrides_lesson_bundle(lesson, tmp_path):
    root = _library(tmp_path, [{"id": "heath-01", "layer": "bg", "tags": ["heath"]}])
    (root / "near-east-neolithic").mkdir()
    (root / "near-east-neolithic" / "library.json").write_text(json.dumps({"assets": [
        {"id": "hill-dry-me", "layer": "bg", "tags": ["hill", "dry", "mideast"]}]}))
    sc = lesson["scenes"][0]
    sc["set"]["layers"] = [{"need": "hill dry !mideast", "asset": None, "depth": "bg", "x": 0.5, "scale": 1}]
    errs, warns, _ = v.check(lesson, library_root=root)
    assert any("outside bundle nl-prehistory" in w for w in warns)
    sc["bundle"] = "near-east-neolithic"
    out = v.resolve(lesson, root)
    assert out["scenes"][0]["set"]["layers"][0]["asset"] == "hill-dry-me"
    errs, warns, _ = v.check(out, library_root=root)
    assert errs == [] and not any("outside bundle" in w for w in warns)


def test_needed_assets_carry_the_scene_bundle(lesson):
    lesson["scenes"][2]["bundle"] = "near-east-neolithic"
    out = v.resolve(lesson, NO_LIBRARY)
    assert {"tags": "hunebed", "layer": "mid", "why": "sc03", "bundle": "near-east-neolithic"} in out["needed_assets"]
    assert v.check(out, library_root=NO_LIBRARY)[0] == []
    assert v.check(lesson, library_root=NO_LIBRARY)[0] != []  # the old, bundle-less wish list no longer covers sc03


def test_asset_kind_beats_habitat_tag():
    lib = [{"id": "tree-birch-01", "layer": "fg", "tags": ["tree", "birch", "heath"]},
           {"id": "bg-heath-01", "layer": "bg", "tags": ["heath", "open"]}]
    assert v.match_asset("heath", "fg", lib)["id"] == "bg-heath-01"
    assert v.match_asset("birch", "fg", lib)["id"] == "tree-birch-01"


def test_plural_tags_meet_singular_needs():
    lib = [{"id": "reeds-01", "layer": "fg", "tags": ["reeds", "water"]}, {"id": "moss-01", "layer": "fg", "tags": ["moss"]}]
    assert v.match_asset("reed", "fg", lib)["id"] == "reeds-01"
    assert v.match_asset("moss", "fg", lib)["id"] == "moss-01"


def test_region_names_are_not_singularised():
    lib = [{"id": "bay-mu", "layer": "bg", "tags": ["coast", "mauritius"]}]
    assert v.match_asset("coast !mauritius", "bg", lib)["id"] == "bay-mu"
    assert v.match_asset("coast", "bg", lib) is None


def test_play_time_by_format():
    assert v.interaction_s({"type": "quiz", "format": "open"}) == 120
    assert v.interaction_s({"type": "quiz", "format": "mc"}) == 40
    assert v.interaction_s({"type": "choice", "format": "vote"}) == 60
    assert v.interaction_s({"type": "choice"}) == 30
    assert v.interaction_s({"type": "choice", "format": "team", "class_action_s": 150}) == 150


def test_team_format_requires_its_class_action_time(lesson):
    lesson["scenes"][0]["interaction"]["format"] = "team"
    assert any(e.startswith("schema:") for e in errors_of(lesson))
    lesson["scenes"][0]["interaction"]["class_action_s"] = 120
    assert errors_of(lesson) == []


def test_resolve_renders_every_minute_on_the_card(lesson):
    lesson["teacher_template"] = "Duur: {total_min} minuten, verhaal {story_min} minuten, kort: {min:sc02-sc03} minuten."
    out = v.resolve(lesson, NO_LIBRARY)
    assert out["teacher"] == "Duur: 3 minuten, verhaal 0 minuten, kort: 2 minuten."  # sc02+sc03 = 6+60+6+40 s
    assert errors_of(out) == []
    out["teacher"] = "Duur: 9 minuten."
    assert any("teacher is stale" in e for e in errors_of(out))


def test_typed_minutes_are_rejected(lesson):
    lesson["teacher"] = "Duur: ongeveer 3 minuten."
    assert any("teacher card types minutes" in e for e in errors_of(lesson))
    lesson["teacher_template"] = "Duur: 3 minuten."
    assert any("teacher_template types a minute figure" in e for e in errors_of(v.resolve(lesson, NO_LIBRARY)))


def test_range_must_name_real_scenes(lesson):
    lesson["teacher_template"] = "Kort: {min:sc02-sc99} minuten."
    lesson["teacher"] = ""
    assert any("names a scene that does not exist" in e for e in errors_of(lesson))


def test_totals_json_cli(lesson, tmp_path):
    import subprocess
    import sys
    path = tmp_path / "l.json"
    path.write_text(json.dumps(lesson))
    out = subprocess.run([sys.executable, str(HERE / "validate.py"), str(path), "--totals", "--json"],
                         capture_output=True, text=True, check=True).stdout
    assert json.loads(out) == {"fixture-minimal": round(v.total_s(lesson))}
