"""A request pack: everything one generation request will contain, frozen in a folder before anything is sent.

The pack holds the attachments (copied and numbered in attach order), the prompt, one picture of all inputs for
bart, and a manifest with the path and sha256 of every attachment. Building a pack sends nothing. It refuses when
a reference is unapproved, changed, or missing, so a picture can never again be made "with the sheet" that the
model never got.

The prompt carries no style words of our own. It names the History Lines skill, the pass and the ink number from
the skill's table, and fills in content only: which attached image is who, the cells, the layout, the fixed
colours sampled from the approved sheets.
"""
from __future__ import annotations

import shutil
from pathlib import Path

import board as boards
import ledger
from registry import INK, Lesson, Refused, read, sha256, write

REFERENCE_MARK = 'styleref-'      # LocalChatGpt: every file marked so = a new picture, all inputs are references
MAX_ATTACHMENTS = 10


def build(lesson: Lesson, scene_name: str, board_id: str, pass_: str, out: Path, ink_board: Path | None = None,
          changed: str | None = None) -> Path:
    scene = lesson.scene(scene_name)
    board = lesson.board(scene, board_id)
    problems = lesson.scene_problems(scene)
    if problems:
        raise Refused('The scene is not ready:\n- ' + '\n- '.join(problems))
    ledger.may_try_again(lesson.media, board_id, changed)

    people = lesson.cast['characters']
    cast = list(dict.fromkeys(w for cell in board['cells'] for w in cell.get('who', [])))

    attachments: list[dict] = []          # {role, label, source}

    def attach(role: str, label: str, source: Path) -> int:
        attachments.append({'role': role, 'label': label, 'source': Path(source)})
        return len(attachments)

    lines: list[str] = []
    if pass_ == 'colour':
        if ink_board is None or not Path(ink_board).is_file():
            raise Refused('The colour pass needs the approved ink board of this same board (--ink).')
        verdict = ledger.last(lesson.media, board_id, 'ink-approved')
        if not verdict or verdict.get('sha256') != sha256(ink_board):
            raise Refused('This ink board is not the one recorded as approved. Approve the ink first (shots.py accept).')
        n = attach('edit', 'the approved ink board', ink_board)
        lines.append(f'Image {n} is the ink board from pass 1. It is the picture to colour; keep every mark of it.')
    for path in lesson.style(pass_):
        n = attach('style', f'History Lines style reference ({pass_})', path)
        lines.append(f'Image {n} is a style reference: take the line and drawing only, never its subject and never its colour.'
                     if pass_ == 'ink' else f'Image {n} is a style reference: take the look only, never its subject.')
    for who in cast:
        person = people[who]
        n = attach('identity', f'{person["name"]}, {pass_} sheet', lesson.sheet(who, pass_))
        copy = 'face, hair, build, clothes and gear' if person.get('kind') == 'person' else 'build, markings, mane, tail and tack'
        lines.append(f'Image {n} is {person["name"]}. Copy {copy} from it exactly'
                     + (', and its exact colours.' if pass_ == 'colour' else '.')
                     + ' It shows who this is, not how to stand: take the pose from the cell text.')
    if len(attachments) > MAX_ATTACHMENTS:
        raise Refused(f'{len(attachments)} attachments; split the board so each request stays at {MAX_ATTACHMENTS} or fewer.')

    out = Path(out)
    if out.exists():
        raise Refused(f'{out} already exists; a pack is never overwritten.')
    (out / 'attachments').mkdir(parents=True)
    manifest_files = []
    all_references = pass_ == 'ink'
    for n, item in enumerate(attachments, 1):
        mark = REFERENCE_MARK if all_references else ('' if item['role'] == 'edit' else REFERENCE_MARK)
        name = f'{n:02d}-{mark}{item["role"]}-{item["source"].name}'
        shutil.copyfile(item['source'], out / 'attachments' / name)
        manifest_files.append({'image': n, 'role': item['role'], 'label': item['label'], 'file': f'attachments/{name}',
                               'source': str(item['source']), 'sha256': sha256(item['source']),
                               'bytes': item['source'].stat().st_size})

    (out / 'prompt.txt').write_text(_prompt(lesson, scene, board, pass_, cast, lines))
    boards.layout_map(scene, board).save(out / 'layout.png')
    labels = [(f'Image {f["image"]}: {f["label"]}\n{Path(f["source"]).name}\nsha256 {f["sha256"][:12]}', out / f['file'])
              for f in manifest_files]
    boards.contact_sheet(labels + [('Layout from above (not sent)', out / 'layout.png')]).save(out / 'inputs.png')
    write(out / 'manifest.json', {
        'lesson': lesson.cast['lesson'], 'scene': scene['scene'], 'board': board_id, 'pass': pass_,
        'kind': board['kind'], 'grid': board['grid'], 'attachments': manifest_files,
        'prompt_sha256': sha256(out / 'prompt.txt'), 'changed_since_last_try': changed,
        'seen_by_bart': None, 'sent': None,
    })
    return out


def _prompt(lesson: Lesson, scene: dict, board: dict, pass_: str, cast: list[str], image_lines: list[str]) -> str:
    people = lesson.cast['characters']
    rows, cols = board['grid']
    ink, white, cross, _ = INK[board['kind']]
    layout = scene['layout']
    text = [f'Use the history-lines skill, pass {"1 (ink)" if pass_ == "ink" else "2 (colour)"} only.']
    if pass_ == 'ink':
        text.append(f'Black ink coverage {ink} of every cell, {white} white paper, cross-hatching: {cross}.')
        text.append(f'One 16:9 board: a {rows}x{cols} grid of {rows * cols} equal cells separated by a clean 5 px white gap, '
                    'no borders, labels or numbers, nothing crossing a gap. The cells are consecutive shots of one scene, '
                    'read left to right, top to bottom. The same people, animals, clothes, light and weather in every cell; '
                    'only the camera and the action change.')
    else:
        text.append(f'Colour the whole board in one go, all cells together, as an edit of the ink board. The ink stays at {ink}. '
                    'Keep the 5 px gaps pure white.')
    text.append('\nBefore you draw, answer in text: one line per attached image saying what you see in it. '
                'If an image is missing or unreadable, say so and stop without drawing.')
    text.append('\nAttached images, in order:\n' + '\n'.join(image_lines))
    text.append(f'\nPlace and time: {scene["place"]}')
    text.append('The scene from above, the same in every cell: '
                + ' '.join(f'{m["label"]}: {m["note"]}.' for m in layout['landmarks'] if m.get('note'))
                + f' Light: {layout["light"]}.')
    text.append('\nWho is who:')
    for who in cast:
        person = people[who]
        text.append(f'- {person["name"]}: {person["look"]}')
        if pass_ == 'colour' and person.get('palette'):
            text.append('  Fixed colours from the approved sheet: '
                        + ', '.join(f'{part} {value}' for part, value in person['palette'].items()) + '.')
    text.append('\nCells:')
    for n, cell in enumerate(board['cells'], 1):
        names = ', '.join(people[w]['name'] for w in cell.get('who', [])) or 'nobody named'
        sees = ' '.join(f'The {mark}: {how}.' for mark, how in cell.get('sees', {}).items())
        text.append(f'{n}. {cell["camera"]["framing"]}. {cell["action"]} In it: {names}. {sees}'.rstrip())
    return '\n'.join(text) + '\n'


def seen(pack: Path, by: str, date: str) -> None:
    """bart looked at inputs.png and said yes to exactly these inputs."""
    manifest = _intact(pack)
    manifest['seen_by_bart'] = {'by': by, 'date': date}
    write(Path(pack) / 'manifest.json', manifest)


def sent(pack: Path, tool: str, model: str, date: str, media: Path, echo: str | None = None) -> None:
    """Record that this pack went out, unchanged, after bart saw it. `echo` is the model's own list of what it received."""
    manifest = _intact(pack)
    if not manifest.get('seen_by_bart'):
        raise Refused('bart has not seen the exact inputs of this pack (inputs.png). Nothing is sent before that.')
    count = len(manifest['attachments'])
    if echo is not None and sum(1 for line in echo.splitlines() if line.strip()) < count:
        raise Refused(f'The model described fewer than {count} images: a reference did not arrive. Do not use the result.')
    manifest['sent'] = {'tool': tool, 'model': model, 'date': date, 'echo': echo}
    write(Path(pack) / 'manifest.json', manifest)
    ledger.add(media, {'event': 'request', 'board': manifest['board'], 'pass': manifest['pass'], 'pack': str(pack),
                       'tool': tool, 'model': model, 'date': date,
                       'attachments': [{'file': f['file'], 'sha256': f['sha256']} for f in manifest['attachments']]})


def _intact(pack: Path) -> dict:
    manifest = read(Path(pack) / 'manifest.json')
    for item in manifest['attachments']:
        if sha256(Path(pack) / item['file']) != item['sha256']:
            raise Refused(f'{item["file"]} changed after the pack was built. Build a new pack.')
    if sha256(Path(pack) / 'prompt.txt') != manifest['prompt_sha256']:
        raise Refused('prompt.txt changed after the pack was built. Build a new pack.')
    return manifest
