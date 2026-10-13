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
    'MATROOS': 'matroos', 'VERTELLER': 'narrator', 'NARRATOR': 'narrator',
}


def parse(md: str) -> list[dict]:
    scenes, scene, panel, act = [], None, None, 0
    for line in md.splitlines():
        if m := re.match(r'^\*\*(ACT \d)', line):
            act = int(m.group(1)[-1])
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
            text, _, bubble = m.group(2).partition(' | ')   # v5: narrator sentence | SPEAKER: balloon
            entry = {'speaker': who, 'text': text.strip()}
            if bubble:
                b = re.match(r'^([A-ZËÄ ]+): (.+)$', bubble.strip())
                if not b or b.group(1).strip() not in SPEAKERS:
                    raise ValueError(f'{scene["id"]}{panel["letter"]}: bad balloon {bubble!r}')
                entry['bubble'] = {'speaker': SPEAKERS[b.group(1).strip()], 'text': b.group(2).strip()}
            panel['lines'].append(entry)
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
                ref = {'id': lid, 'speaker': ln['speaker']}
                if 'bubble' in ln:
                    text['scenes'][sid].setdefault('bubbles', {})[lid] = ln['bubble']['text']
                    ref['bubble'] = ln['bubble']['speaker']
                line_ids.append(ref)
            a = assets.get(pid, {})
            panels.append({'id': pid, 'staging': p['staging'], 'lines': line_ids,
                           'cast': sorted({ln.get('bubble') or ln['speaker'] for ln in line_ids} - {'narrator'}),
                           'plate': a.get('plate'), 'figures': a.get('figures'), 'ships': a.get('ships', []),
                           'camera': a.get('camera', {'move': 'hold'}), 'entry': a.get('entry', 'cut'),
                           **({'mouths': a['mouths']} if a.get('mouths') else {})})
        story['scenes'].append({'id': sid, 'act': s['act'], 'panels': panels})
    # Hand-kept parts (game texts, play order) survive a re-run of the converter.
    for path, doc, key in ((HERE / 'story.json', story, 'sequence'), (HERE / 'text' / f'{lang}.json', text, 'games')):
        if path.exists() and key in (old := json.loads(path.read_text())):
            doc[key] = old[key]
    (HERE / 'story.json').write_text(json.dumps(story, ensure_ascii=False, indent=1) + '\n')
    (HERE / 'text' / f'{lang}.json').write_text(json.dumps(text, ensure_ascii=False, indent=1) + '\n')
    n_lines = sum(len(t['lines']) for t in text['scenes'].values())
    print(f'{len(scenes)} scenes, {sum(len(s["panels"]) for s in scenes)} panels, {n_lines} lines')


if __name__ == '__main__':
    main()
