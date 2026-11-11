#!/usr/bin/env python3
"""A lesson's cast as library figures, in the one History Lines look (Bart 11-11, the Babylon lesson).

    python3 cast.py jobs/<cast>.json [--only <char> ...] [--stage ink|colour|cut|all]

A cast job: {"bundle": "babylonia-old-babylonian", "era": "...", "characters": [{"char": "ana", "height_m": 1.42,
  "look": "an 11-year-old girl ...", "colours": "undyed wool tunic in pale oatmeal ..."}]}.
Per character ONE sheet = one hand, so the 8 poses match: pass 1 ink (4 x 2 poses on #00FF00), pass 2 a colour EDIT
of that ink (History Lines verbatim prompt + edit lock + the character's colours), then cut_figures.py cuts it into
fig-<char>-<pose>-01.webp (+ -l mirrored) and the entries are merged into the bundle's library.json.
The first character's colour sheet is the style reference for every next one, so the cast is one family.
Work files: ~/BartsMedia/historyportal/library/_work/<bundle>/cast-<char>/.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import prompts
from gen import LIBRARY, TIMEOUT_S, make_image, merge_library

ROOT = Path(__file__).resolve().parents[3]
CUTTER = ROOT / 'engine-mvp' / 'tools' / 'cut_figures.py'
POSES = ['stand', 'walk', 'point', 'kneel', 'carry', 'push', 'dig', 'sit']
# Every pose names its face: with no mood the model grins in all eight (Bart 11-11: "why are they all super happy?
# it's a bit fake"). A story pose sheet is people in a hard season, not a catalogue of smiles.
POSE_WORDS = ('(1) standing still, quiet watchful face, mouth closed, (2) walking in mid stride, tired steady face, '
              '(3) pointing ahead with one arm, alert face, eyes wide, brows raised, (4) kneeling on one knee, careful '
              'concentrating face, looking down, (5) carrying something heavy in both arms, straining face, lips pressed, '
              '(6) pushing forward with both hands, hard effort, jaw set, brows drawn, (7) digging with a short wooden '
              'hoe with a copper blade, frowning in concentration, (8) sitting on the ground, worried thoughtful face, '
              'listening. No smiling, no grins, no teeth showing in any pose: plain, believable faces')

# the History Lines notes (vault topics/history-lines/notes.md), verbatim where they are Bart's words
INK = ('Draw a character pose sheet as a clean black-and-white educational comic illustration: {era} The same person '
       'eight times, {look}, in a grid of 4 columns and 2 rows, {framing}, each pose separate with wide '
       'space around it, nothing touching: {poses}. Each figure turned exactly as its number says (a character turnaround: '
       'front, three-quarter, side, three-quarter back, back); three-quarter means body AND face turned about 45 degrees, '
       'both eyes visible; same '
       'face, same hair, same clothes, same proportions in all eight. Use crisp black contours, controlled hatching and '
       'cross-hatching only in the deepest shadows. Keep broad areas of white inside the clothes. Background: solid flat '
       'pure green #00FF00 everywhere around and between the figures, no ground, no shadows, no props except what a pose '
       'holds. No color on the figures, no grey washes, no text, labels or watermarks. Very low texture; no dots, '
       'speckles, stippling, grain, grunge or blur. Clean broad shapes, sharp drawn contours. Landscape 16:9.')
LOCK = ('Use the attached ink drawing as a locked source. Preserve exact canvas size, framing, positions, scale, pose, '
        'silhouette and every ink mark. Change only color beneath the drawing. Do not crop, outpaint, recompose or add '
        'objects. Keep the solid pure green #00FF00 background exactly as it is.')
COLOUR = ('Color the existing black-and-white comic drawing as a clean educational historical illustration. Preserve all '
          'black linework, hatching and cross-hatching exactly. Apply color only as a second pass beneath the ink. Use a '
          'restrained watercolor-comic treatment with transparent washes, subtle pigment variation and a bright editorial '
          'feel. Black ink must remain dominant. No muddy wash, no antique filter, no glossy rendering, no heavy grunge '
          'and no repainting of linework.')


def pose_keys(char: dict) -> list[str]:
    """A character's own 8 poses from the script (job `poses`: [[key, words], ...], pose 1 a plain stand: the cutter
    scales the sheet from it), else the generic set."""
    return [k for k, _ in char['poses']] if char.get('poses') else POSES


def pose_words(char: dict) -> str:
    if not char.get('poses'):
        return POSE_WORDS
    return ', '.join(f'({i}) {w}' for i, (_, w) in enumerate(char['poses'], 1)) + \
        '. No smiling, no grins, no teeth showing in any pose: plain, believable faces'


def work_dir(job: dict, char: dict) -> Path:
    d = LIBRARY / '_work' / job['bundle'] / f"cast-{char['char']}{job.get('work_suffix', '')}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def ink(job: dict, char: dict, refs: list[str]) -> None:
    era = prompts.ERA.get(job['era'], job['era'])
    make_image(INK.format(era=era, look=char['look'], poses=pose_words(char),
                          framing=job.get('framing', 'full body from head to feet')), str(work_dir(job, char) / 'ink.png'),
               [str(prompts.INK_ANCHOR), *refs], False, TIMEOUT_S)


def colour(job: dict, char: dict, refs: list[str]) -> None:
    w = work_dir(job, char)
    prompt = f"{LOCK}\n\n{COLOUR} The colours of this person: {char['colours']}. Skin: warm light-brown, Near Eastern."
    make_image(prompt, str(w / 'colour.png'), [str(w / 'ink.png'), str(prompts.COLOUR_ANCHOR), *refs], False, TIMEOUT_S)


def cut(job: dict, char: dict) -> None:
    w = work_dir(job, char)
    out = LIBRARY / job['bundle']
    subprocess.run([sys.executable, str(CUTTER), str(w / 'colour.png'), char['char'], str(char['height_m']), str(out), ','.join(pose_keys(char))], check=True)
    entries = json.loads((out / f"_{char['char']}.json").read_text())
    for e in entries:   # the bundle's own era, and what the figure is, for the resolver and the panel
        e['era'] = job.get('era_label', job['era'])
        e['tags'] = [*e['tags'], *char.get('tags', [])]
    merge_library(job['bundle'], entries)
    (out / f"_{char['char']}.json").unlink()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('job', type=Path)
    ap.add_argument('--only', nargs='*')
    ap.add_argument('--stage', default='all', choices=['ink', 'colour', 'cut', 'all'])
    a = ap.parse_args()
    job = json.loads(a.job.read_text())
    style_ref: list[str] = []
    for char in job['characters']:
        if a.only and char['char'] not in a.only:
            if (work_dir(job, char) / 'colour.png').exists() and not style_ref:
                style_ref = [str(work_dir(job, char) / 'colour.png')]
            continue
        try:
            if a.stage in ('ink', 'all'):
                ink(job, char, style_ref)
                print(f"  {char['char']}: ink", flush=True)
            if a.stage in ('colour', 'all'):
                colour(job, char, style_ref)
                print(f"  {char['char']}: colour", flush=True)
            if a.stage in ('cut', 'all'):
                cut(job, char)
                print(f"  {char['char']}: cut into {len(pose_keys(char))} poses (+ mirrored)", flush=True)
        except Exception as e:   # one character failing never stops the cast: it is reported and redone
            print(f"  {char['char']}: FAILED {e}", flush=True)
            continue
        if not style_ref:
            style_ref = [str(work_dir(job, char) / 'colour.png')]


if __name__ == '__main__':
    main()
