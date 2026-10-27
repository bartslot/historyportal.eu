#!/usr/bin/env python3
"""Narrate a lesson.json shot by shot with Azure TTS and write the measured lengths back.

  narrate.py LESSON.json... [--dry-run]

- Voice: the app's own mapping (app/Services/Support/NarrationVoice.php, AZURE_BY_LOCALE) for lesson.lang.
  An unmapped language is refused: the app's fallback is an American voice.
- Audio: ~/BartsMedia/historyportal/narration/<lesson id>/<scene id>.mp3, copied from a cache keyed by
  sha256(voice + text) in narration/_cache/, so an unchanged line is never sent to Azure again.
- Writes scene.tts_s (measured seconds), scene.audio ("<lesson id>/<scene id>.mp3", relative to the narration
  root ~/BartsMedia/historyportal/narration/; media never lives in the vault) and lesson.narration back,
  plus narration/<lesson id>/index.json with per-shot loudness QA (max/mean dB, leading/trailing silence).
- Word timings: the REST endpoint returns audio only, so none are stored (the Speech SDK would be needed).
Run AFTER build.py (a rebuild drops tts_s; rerunning narrate is free thanks to the cache), then validate.py --resolve.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable

REPO = Path(__file__).resolve().parents[2]
MAIN_REPO = Path("/Users/bartslot/BartsAutomation/BartsDev/apps/historyportal.eu")
VOICE_PHP = Path("app/Services/Support/NarrationVoice.php")
OUT_ROOT = Path.home() / "BartsMedia" / "historyportal" / "narration"
OUTPUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3"
RETRIES = 4


def azure_voices(repo: Path = REPO) -> dict[str, str]:
    """AZURE_BY_LOCALE from the app, so the tool can never drift from the voice the app plays."""
    php = (repo / VOICE_PHP if (repo / VOICE_PHP).exists() else MAIN_REPO / VOICE_PHP).read_text()
    block = re.search(r"AZURE_BY_LOCALE\s*=\s*\[(.*?)\];", php, re.S)
    if not block:
        sys.exit("narrate: AZURE_BY_LOCALE not found in NarrationVoice.php")
    return dict(re.findall(r"'([a-z]{2})'\s*=>\s*'([^']+)'", block.group(1)))


def credentials() -> tuple[str, str]:
    env = dict(os.environ)
    for path in (REPO / ".env", MAIN_REPO / ".env"):
        if path.exists():
            for line in path.read_text().splitlines():
                if line.startswith("AZURE_SPEECH_") and "=" in line:
                    k, val = line.split("=", 1)
                    env.setdefault(k, val.strip().strip('"'))
    if not env.get("AZURE_SPEECH_KEY") or not env.get("AZURE_SPEECH_REGION"):
        sys.exit("narrate: AZURE_SPEECH_KEY / AZURE_SPEECH_REGION missing")
    return env["AZURE_SPEECH_KEY"], env["AZURE_SPEECH_REGION"]


def ssml(text: str, voice: str) -> str:
    lang = "-".join(voice.split("-")[:2])  # nl-NL-FennaNeural -> nl-NL, as TtsService does
    esc = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&apos;")
    return f'<speak version="1.0" xml:lang="{lang}"><voice name="{voice}"><prosody rate="+0%">{esc}</prosody></voice></speak>'


def azure_synth(text: str, voice: str) -> bytes:
    key, region = credentials()
    req = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml(text, voice).encode(),
        headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": OUTPUT_FORMAT, "User-Agent": "HistoryPortal-lessongen"},
    )
    for attempt in range(RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == RETRIES - 1:
                raise RuntimeError(f"Azure TTS HTTP {e.code}: {e.read()[:300]!r}") from e
            time.sleep(float(e.headers.get("Retry-After") or 2 ** attempt))
    raise AssertionError("unreachable")


def probe(path: Path) -> dict:
    """Length + loudness of an mp3 (ffprobe/ffmpeg): what the checker needs without listening."""
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True, check=True).stdout.strip())
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
                          "volumedetect,silencedetect=noise=-45dB:d=0.25", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    num = lambda pat: float(m.group(1)) if (m := re.search(pat, log)) else None  # noqa: E731
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    lead = ends[0] if starts and starts[0] < 0.05 and ends else 0.0
    trail = dur - starts[-1] if starts and (len(ends) < len(starts) or ends[-1] >= dur - 0.05) else 0.0
    return {"tts_s": round(dur, 2), "max_db": num(r"max_volume: (-?[\d.]+) dB"), "mean_db": num(r"mean_volume: (-?[\d.]+) dB"),
            "lead_silence_s": round(lead, 2), "trail_silence_s": round(trail, 2)}


def text_hash(voice: str, text: str) -> str:
    return hashlib.sha256(f"{voice}\n{text}".encode()).hexdigest()[:20]


def narrate(lesson: dict, out_root: Path = OUT_ROOT, synth: Callable[[str, str], bytes] = azure_synth) -> tuple[dict, dict]:
    """New lesson with tts_s + audio per narrated shot, and a report {sent_chars, cached, sent, index}."""
    voices = azure_voices()
    voice = voices.get(lesson["lang"])
    if not voice:
        sys.exit(f"narrate: no native voice mapped for {lesson['lang']!r} in NarrationVoice.php (refusing the US fallback)")
    lesson = json.loads(json.dumps(lesson))
    cache, out = out_root / "_cache", out_root / lesson["id"]
    cache.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    report = {"voice": voice, "sent_chars": 0, "sent": 0, "cached": 0, "index": {}}
    for sc in lesson["scenes"]:
        text = sc["narration"].strip()
        sc.pop("tts_s", None)
        sc.pop("audio", None)
        if not text:
            continue
        cached = cache / f"{text_hash(voice, text)}.mp3"
        if cached.exists():
            report["cached"] += 1
        else:
            cached.write_bytes(synth(text, voice))
            report["sent"] += 1
            report["sent_chars"] += len(text)
        dest = out / f"{sc['id']}.mp3"
        shutil.copyfile(cached, dest)
        qa = probe(dest)
        sc["tts_s"], sc["audio"] = qa["tts_s"], f"{lesson['id']}/{dest.name}"  # relative to OUT_ROOT
        report["index"][sc["id"]] = {"text_hash": cached.stem, "chars": len(text), **qa}
    for old in out.glob("*.mp3"):  # scene ids shift when a shot is split: drop files no scene points at any more
        if old.stem not in report["index"]:
            old.unlink()
    lesson["narration"] = {"provider": "azure", "voice": voice, "format": OUTPUT_FORMAT, "root": "~/BartsMedia/historyportal/narration"}
    (out / "index.json").write_text(json.dumps({"lesson": lesson["id"], "voice": voice, "shots": report["index"]}, indent=1) + "\n")
    return lesson, report


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("lessons", type=Path, nargs="+")
    ap.add_argument("--dry-run", action="store_true", help="count the characters a run would send, send nothing")
    a = ap.parse_args()
    voices = azure_voices()
    for path in a.lessons:
        lesson = json.loads(path.read_text())
        if a.dry_run:
            voice = voices[lesson["lang"]]
            todo = [s["narration"].strip() for s in lesson["scenes"] if s["narration"].strip()
                    and not (OUT_ROOT / "_cache" / f"{text_hash(voice, s['narration'].strip())}.mp3").exists()]
            print(f"{lesson['id']}: {len(todo)} shots, {sum(map(len, todo))} chars to send ({voice})")
            continue
        lesson, rep = narrate(lesson)
        path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n")
        print(f"{lesson['id']}: sent {rep['sent']} shots / {rep['sent_chars']} chars, cached {rep['cached']} ({rep['voice']})")


if __name__ == "__main__":
    main()
