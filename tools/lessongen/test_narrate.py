"""narrate.py without the network: a fake synth makes a real tone mp3 with ffmpeg."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

import narrate as n

HERE = Path(__file__).resolve().parent


def fake_synth(calls: list):
    def synth(text: str, voice: str) -> bytes:
        calls.append(text)
        secs = max(1.0, len(text.split()) / 2.4)
        return subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"sine=frequency=220:duration={secs}",
                               "-f", "mp3", "-"], capture_output=True, check=True).stdout
    return synth


def test_voice_comes_from_the_app_mapping():
    voices = n.azure_voices()
    assert voices["nl"] == "nl-NL-FennaNeural"
    assert not any(v.startswith("en-US") for v in voices.values())


def test_narrate_writes_lengths_and_never_resends_a_line(tmp_path):
    lesson = json.loads((HERE / "fixtures" / "minimal.json").read_text())
    calls: list = []
    out, rep = n.narrate(lesson, tmp_path, fake_synth(calls))
    assert rep["sent"] == 3 and rep["sent_chars"] == sum(len(s["narration"]) for s in lesson["scenes"])
    sc = out["scenes"][0]
    assert sc["audio"] == "fixture-minimal/sc01.mp3" and 4.5 < sc["tts_s"] < 5.5  # 12 words / 2.4
    assert out["narration"]["voice"] == "nl-NL-FennaNeural"
    out2, rep2 = n.narrate(out, tmp_path, fake_synth(calls))
    assert rep2["sent"] == 0 and rep2["cached"] == 3 and len(calls) == 3
    assert json.loads((tmp_path / "fixture-minimal" / "index.json").read_text())["shots"]["sc01"]["max_db"] is not None


def test_stale_scene_files_are_removed(tmp_path):
    lesson = json.loads((HERE / "fixtures" / "minimal.json").read_text())
    (tmp_path / "fixture-minimal").mkdir()
    (tmp_path / "fixture-minimal" / "sc99.mp3").write_bytes(b"old")
    n.narrate(lesson, tmp_path, fake_synth([]))
    assert not (tmp_path / "fixture-minimal" / "sc99.mp3").exists()


def test_unmapped_language_is_refused_not_a_crash():
    import pytest
    with pytest.raises(SystemExit, match="no native voice mapped for 'xx'"):
        n.voice_for({"lang": "xx"})
