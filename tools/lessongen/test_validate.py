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
    out = v.resolve(lesson, v.load_library(root, "nl-prehistory"))
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
