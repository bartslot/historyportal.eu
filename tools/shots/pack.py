"""A request pack: everything one generation request will contain, frozen in a folder before anything is sent.

The pack holds the attachments (copied and numbered in attach order), the prompt, one picture of all inputs for
bart, and a manifest with the path and sha256 of every attachment. Building a pack sends nothing. It refuses when
a reference is unapproved, changed, or missing, so a picture can never again be made "with the sheet" that the
model never got.

The prompt carries no style words of our own. It names the History Lines skill (or carries bart's skill text
verbatim, for a tool that cannot load skills), the pass and the ink number from the skill's table, and fills in
content only: which attached image is who, who stands where in each cell, the layout, the fixed colours.

Attach order: the picture being worked from first (the blocking guide in ink, the ink board in colour), then the
people and horses, then the colour card, then the style references.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

import board as boards
import ledger
from registry import INK, Lesson, Refused, read, sha256, write

REFERENCE_MARK = 'styleref-'      # LocalChatGpt: every file marked so = a new picture, all inputs are references
MAX_ATTACHMENTS = 12              # the edit API takes 16; fewer keeps every sheet large enough to read


def build(lesson: Lesson, scene_name: str, board_id: str, pass_: str, out: Path, ink_board: Path | None = None,
          changed: str | None = None, skill_text: str | None = None) -> Path:
    scene = lesson.scene(scene_name)
    board = lesson.board(scene, board_id)
    problems = lesson.scene_problems(scene)
    if problems:
        raise Refused('The scene is not ready:\n- ' + '\n- '.join(problems))
    ledger.may_try_again(lesson.media, board_id, changed)
    out = Path(out)
    if out.exists():
        raise Refused(f'{out} already exists; a pack is never overwritten.')

    people = lesson.cast['characters']
    cast = list(dict.fromkeys(w for cell in board['cells'] for w in cell.get('who', [])))
    attachments: list[dict] = []          # {role, label, source: Path | Image}
    lines: list[str] = []
    image_of: dict[str, int] = {}

    def attach(role: str, label: str, source) -> int:
        attachments.append({'role': role, 'label': label, 'source': source})
        return len(attachments)

    if pass_ == 'colour':
        if ink_board is None or not Path(ink_board).is_file():
            raise Refused('The colour pass needs the approved ink board of this same board (--ink).')
        verdict = ledger.last(lesson.media, board_id, 'ink-approved')
        if not verdict or verdict.get('sha256') != sha256(ink_board):
            raise Refused('This ink board is not the one recorded as approved. Approve the ink first (shots.py accept).')
        n = attach('edit', 'the approved ink board', Path(ink_board))
        lines.append(f'Image {n} is the ink board from pass 1. It is the picture to colour; keep every mark of it.')
    else:
        n = attach('blocking', 'blocking guide drawn from the layout', boards.blocking_guide(scene, board))
        lines.append(f'Image {n} is a blocking guide drawn from the layout: one plain view per cell, in cell order. It fixes '
                     'the horizon and where things stand and how large they are in each cell. Take positions and sizes '
                     'from it; never draw its grey shapes as they are.')
    for who in cast:
        person = people[who]
        n = image_of[who] = attach('identity', f'{person["name"]}, {pass_} sheet', lesson.sheet(who, pass_))
        copy = 'face, hair, build, clothes and gear' if person.get('kind') == 'person' else 'build, markings, mane, tail and tack'
        lines.append(f'Image {n} shows {person["name"]} from several sides, all views of one {person.get("kind", "person")}. '
                     f'Match {copy} to it' + (', and take the colours from it.' if pass_ == 'colour' else '.')
                     + ' It shows who this is, not how to stand: the pose comes from the cell.')
    if pass_ == 'colour':
        for who in cast:
            person = people[who]
            missing = set(person.get('signature_parts', [])) - set(person.get('palette') or {})
            if missing:
                raise Refused(f'{person["name"]} has no fixed colours sampled from the approved sheet'
                              + f' for: {", ".join(sorted(missing))}'
                              + f'. Add swatch boxes in cast.json and run `shots.py palette {lesson.cast["lesson"]} {who}`.')
        rows, names = [], []
        for who in cast:
            person = people[who]
            sheet = Image.open(lesson.sheet(who, 'colour')).convert('RGB')
            for part, fixed in (person.get('palette') or {}).items():
                rows.append((boards.crop(sheet, person['swatches'][part]), fixed))
                names.append(f'{person["name"]}\'s {part}')
        if rows:
            n = attach('colours', 'colour card cut from the approved sheets', boards.colour_card(rows))
            lines.append(f'Image {n} is a colour card cut from those sheets, one row per garment, top to bottom: '
                         + '; '.join(f'row {i} {name}' for i, name in enumerate(names, 1))
                         + '. Left is the garment as painted on the sheet, right its flat midtone.')
    for path in lesson.style(pass_):
        n = attach('style', f'History Lines style reference ({pass_})', path)
        lines.append(f'Image {n} is a style reference: take the line and drawing only, never its subject and never its colour.'
                     if pass_ == 'ink' else f'Image {n} is a style reference: take the look only, never its subject.')
    if len(attachments) > MAX_ATTACHMENTS:
        raise Refused(f'{len(attachments)} attachments; split the board so each request stays at {MAX_ATTACHMENTS} or fewer.')

    (out / 'attachments').mkdir(parents=True)
    manifest_files = []
    for n, item in enumerate(attachments, 1):
        made = isinstance(item['source'], Image.Image)
        mark = '' if item['role'] == 'edit' else REFERENCE_MARK
        name = f'{n:02d}-{mark}{item["role"]}' + ('.png' if made else f'-{item["source"].name}')
        if made:
            item['source'].save(out / 'attachments' / name)
        else:
            shutil.copyfile(item['source'], out / 'attachments' / name)
        manifest_files.append({'image': n, 'role': item['role'], 'label': item['label'], 'file': f'attachments/{name}',
                               'source': 'made by code from the scene file and approved sheets' if made else str(item['source']),
                               'sha256': sha256(out / 'attachments' / name),
                               'bytes': (out / 'attachments' / name).stat().st_size})

    (out / 'prompt.txt').write_text(_prompt(lesson, scene, board, pass_, cast, lines, image_of, skill_text))
    boards.layout_map(scene, board).save(out / 'layout.png')
    labels = [(f'Image {f["image"]}: {f["label"]}\n{Path(f["file"]).name[:44]}\nsha256 {f["sha256"][:12]}', out / f['file'])
              for f in manifest_files]
    boards.contact_sheet(labels + [('Layout from above (not sent)', out / 'layout.png')]).save(out / 'inputs.png')
    write(out / 'manifest.json', {
        'lesson': lesson.cast['lesson'], 'scene': scene['scene'], 'board': board_id, 'pass': pass_,
        'kind': board['kind'], 'grid': board['grid'], 'attachments': manifest_files,
        'expected': {str(n): boards.sight(scene, cell) for n, cell in enumerate(board['cells'], 1)},
        'prompt_sha256': sha256(out / 'prompt.txt'), 'changed_since_last_try': changed,
        'seen_by_bart': None, 'sent': None,
    })
    return out


def _prompt(lesson: Lesson, scene: dict, board: dict, pass_: str, cast: list[str], image_lines: list[str],
            image_of: dict[str, int], skill_text: str | None) -> str:
    people = lesson.cast['characters']
    rows, cols = board['grid']
    count = rows * cols
    ink, white, cross, *_ = INK[board['kind']]
    layout = scene['layout']
    marks = {m['id']: m for m in layout['landmarks']}
    text = [f'Use the history-lines skill, pass {"1 (ink)" if pass_ == "ink" else "2 (colour)"} only.']
    if pass_ == 'ink':
        text.append(f'Black ink coverage {ink} of every cell, {white} white paper, cross-hatching: {cross}.')
        if count > 1:
            text.append(f'One 16:9 board: a {rows}x{cols} grid of {count} equal cells separated by a clean 5 px white gap, '
                        'no borders, labels or numbers, nothing crossing a gap. The cells are consecutive shots of one scene, '
                        'read left to right, top to bottom. The same people, animals, clothes, light and weather in every cell; '
                        'only the camera and the action change.')
    else:
        text.append(('Colour the whole board in one go, all cells together, as an edit of the ink board. ' if count > 1
                     else 'Colour it as an edit of the ink drawing. ') + f'The ink stays at {ink}.'
                    + (' Keep the 5 px gaps pure white.' if count > 1 else ''))
    text.append('\nAttached images, in order:\n' + '\n'.join(image_lines))
    text.append(f'\nPlace and time: {scene["place"]}')
    text.append('The scene from above, the same in every cell: '
                + ' '.join(f'{m["label"]}: {m["note"]}.' for m in layout['landmarks'] if m.get('note'))
                + f' Light: {layout["light"]}.')
    text.append('\nWho is who:')
    for who in cast:
        person = people[who]
        text.append(f'- {person["name"]} (image {image_of[who]}): {person["look"]}'
                    + (f' Tell them apart by: {person["tell"]}.' if person.get('tell') else ''))
        if pass_ == 'colour' and person.get('palette'):
            text.append('  Fixed colours from the approved sheet: '
                        + ', '.join(f'{part} {value}' for part, value in person['palette'].items()) + '.')
    text.append('\nCells:')
    for n, cell in enumerate(board['cells'], 1):
        text.append(f'{n}. {cell["camera"]["framing"]}. {cell["action"]}')
        for who in cell.get('who', []):
            where = (cell.get('where') or {}).get(who)
            text.append(f'   - {people[who]["name"]} (image {image_of[who]})' + (f' is {where}.' if where else ' is in this cell.'))
        if not cell.get('who'):
            text.append('   - Nobody from the sheets is in this cell.')
        seen = boards.sight(scene, cell)
        for mark, how in (cell.get('sees') or {}).items():
            spot = seen.get(mark)
            size = (f' About {max(1, round(100 * spot["width"]))}% of the frame wide, centred {round(100 * spot["x"])}% across.'
                    if spot and marks[mark].get('size') and marks[mark].get('in_stills', True) else '')
            text.append(f'   - The {marks[mark]["label"]}: {how}.{size}')
    if skill_text:
        text.append('\nThe history-lines skill, word for word (follow it exactly; the lines above only fill in its brackets):\n'
                    + skill_text.strip())
    return '\n'.join(text) + '\n'


def seen(pack: Path, date: str) -> None:
    """bart looked at inputs.png and said yes to exactly these inputs."""
    manifest = _intact(pack)
    manifest['seen_by_bart'] = {'by': 'bart', 'date': date}
    write(Path(pack) / 'manifest.json', manifest)


def sent(pack: Path, tool: str, model: str, date: str, media: Path, request_id: str | None = None) -> None:
    """Record that this pack went out, unchanged, after bart saw it."""
    manifest = _intact(pack)
    if not manifest.get('seen_by_bart'):
        raise Refused('bart has not seen the exact inputs of this pack (inputs.png). Nothing is sent before that.')
    manifest['sent'] = {'tool': tool, 'model': model, 'date': date, 'request_id': request_id}
    write(Path(pack) / 'manifest.json', manifest)
    ledger.add(media, {'event': 'request', 'board': manifest['board'], 'pass': manifest['pass'], 'pack': str(pack),
                       'tool': tool, 'model': model, 'date': date, 'request_id': request_id,
                       'attachments': [{'file': f['file'], 'sha256': f['sha256']} for f in manifest['attachments']]})


def _intact(pack: Path) -> dict:
    manifest = read(Path(pack) / 'manifest.json')
    for item in manifest['attachments']:
        if sha256(Path(pack) / item['file']) != item['sha256']:
            raise Refused(f'{item["file"]} changed after the pack was built. Build a new pack.')
    if sha256(Path(pack) / 'prompt.txt') != manifest['prompt_sha256']:
        raise Refused('prompt.txt changed after the pack was built. Build a new pack.')
    return manifest
