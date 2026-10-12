"""Turn the writers' markdown script into the lesson data: story.json (structure, renderer-neutral) and
text/<lang>.json (every spoken or shown word, keyed by stable ids). Run again after a script revision;
ids stay stable as long as scene ids, panel letters and line order stay.

    python3 convert_script.py <script.md> <lang>
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[2] / 'resources' / 'lessons' / 'tasman'
SPEAKERS = {
    'JONGE MATROOS': 'matroos', 'BOOTSMAN': 'bootsman', 'TASMAN': 'tasman', 'VISSCHER': 'visscher',
    'GILSEMANS': 'gilsemans', 'VAN DIEMEN': 'vandiemen', 'RAADSHEER': 'raadsheer', 'UITKIJK': 'uitkijk',
}
ACTS = {'ACT 1': 1, 'ACT 2': 2, 'ACT 3': 3, 'ACT 4': 4}


def parse(md: str) -> list[dict]:
    scenes, scene, panel, act = [], None, None, 0
    for line in md.splitlines():
        if m := re.match(r'^\*\*(ACT \d)', line):
            act = ACTS[m.group(1)]
        elif m := re.match(r'^## (S\d\d) (.+)$', line):
            scene = {'id': m.group(1), 'act': act, 'title': m.group(2).strip(), 'narrator': '', 'date_ui': '',
                     'panels': []}
            scenes.append(scene)
            panel = None
        elif re.match(r'^## ', line):
            scene = panel = None  # games, slotvraag, tables: handled elsewhere
        elif scene is None:
            continue
        elif m := re.match(r'^NARRATOR: (.+)$', line):
            scene['narrator'] = m.group(1).strip()
        elif m := re.match(r'^\*\*Datum-UI:\*\* (.+)$', line):
            scene['date_ui'] = m.group(1).strip()
        elif m := re.match(r'^### ([A-D])\b', line):
            panel = {'letter': m.group(1), 'staging': '', 'lines': []}
            scene['panels'].append(panel)
        elif panel and (m := re.match(r'^STAGING: (.+)$', line)):
            panel['staging'] = m.group(1).strip()
        elif panel and (m := re.match(r'^- ([A-ZËÄ ]+): (.+)$', line)):
            who = SPEAKERS.get(m.group(1).strip())
            if who is None:
                raise ValueError(f'{scene["id"]}{panel["letter"]}: unknown speaker {m.group(1)!r}')
            panel['lines'].append({'speaker': who, 'text': m.group(2).strip()})
    return scenes


def main() -> None:
    md_path, lang = Path(sys.argv[1]), sys.argv[2]
    scenes = parse(md_path.read_text())
    assets = json.loads((HERE / 'assets.json').read_text())
    story = {'id': 'tasman-1642', 'version': 1, 'source': md_path.name, 'scenes': []}
    text = {'lang': lang, 'title': 'Abel Tasman: De reis naar het onbekende', 'scenes': {}}
    for s in scenes:
        sid = s['id']
        text['scenes'][sid] = {'title': s['title'], 'narrator': s['narrator'], 'date_ui': s['date_ui'], 'lines': {}}
        panels = []
        for p in s['panels']:
            pid = f'{sid}-{p["letter"]}'
            line_ids = []
            for i, ln in enumerate(p['lines'], 1):
                lid = f'{pid}.{i}'
                text['scenes'][sid]['lines'][lid] = ln['text']
                line_ids.append({'id': lid, 'speaker': ln['speaker']})
            a = assets.get(pid, {})
            panels.append({'id': pid, 'staging': p['staging'], 'lines': line_ids,
                           'cast': sorted({ln['speaker'] for ln in line_ids}),
                           'plate': a.get('plate'), 'figures': a.get('figures'), 'ships': a.get('ships', []),
                           'camera': a.get('camera', {'move': 'hold'}), 'entry': a.get('entry', 'cut')})
        story['scenes'].append({'id': sid, 'act': s['act'], 'panels': panels})
    (HERE / 'story.json').write_text(json.dumps(story, ensure_ascii=False, indent=1) + '\n')
    (HERE / 'text' / f'{lang}.json').write_text(json.dumps(text, ensure_ascii=False, indent=1) + '\n')
    n_lines = sum(len(t['lines']) for t in text['scenes'].values())
    print(f'{len(scenes)} scenes, {sum(len(s["panels"]) for s in scenes)} panels, {n_lines} lines')


if __name__ == '__main__':
    main()
