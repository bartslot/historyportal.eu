#!/usr/bin/env python3
"""Consistent shots: the gates between a script and a finished board, as commands.

    shots.py check   <lesson>                                   what is missing or against the rules
    shots.py approve <lesson> <who> <ink|colour> <file>         record bart's approval of a sheet (hash taken now)
    shots.py palette <lesson> <who>                             sample the fixed colours from the approved colour sheet
    shots.py map     <lesson> <scene> [board] -o map.png        the scene from above
    shots.py pack    <lesson> <scene> <board> <ink|colour>      freeze one request: attachments, prompt, inputs.png
    shots.py seen    <pack>                                     bart saw exactly these inputs, and said yes
    shots.py sent    <pack> --lesson .. --tool .. --model ..    it went out (refused before `seen`)
    shots.py verify  <lesson> <scene> <board> --ink a.png [--colour b.png]   measure the result
    shots.py accept  <lesson> <scene> <board> <ink|colour> <file> --by ..    record an approval
    shots.py reject  <lesson> <board> --failures kind,kind       record a failed try (two of a kind stops the retries)
    shots.py cut     <lesson> <scene> <board> <colour.png>      cut the approved board into keyframes
    shots.py tally   <lesson>                                   requests sent against cells accepted
    shots.py sheet   <file> [<file> ...] [--kind sheet]         ink gate on sheets; with several, checks for look-alikes

None of these makes a picture. See .claude/skills/consistent-shots/SKILL.md for the order they go in.
"""
from __future__ import annotations

import argparse
import datetime
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from PIL import Image  # noqa: E402

import board as boards  # noqa: E402
import colour  # noqa: E402
import ledger  # noqa: E402
import pack as packs  # noqa: E402
import verify  # noqa: E402
from registry import Lesson, Refused, read, sha256, write  # noqa: E402


def today() -> str:
    return datetime.date.today().isoformat()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)

    def command(name: str, *args: str) -> argparse.ArgumentParser:
        p = sub.add_parser(name)
        for arg in args:
            p.add_argument(arg)
        return p

    command('check', 'lesson')
    command('approve', 'lesson', 'who', 'pass_', 'file')
    command('palette', 'lesson', 'who')
    p = command('map', 'lesson', 'scene')
    p.add_argument('board', nargs='?')
    p.add_argument('-o', '--out', required=True)
    p = command('pack', 'lesson', 'scene', 'board', 'pass_')
    p.add_argument('--ink')
    p.add_argument('--out')
    p.add_argument('--changed', help='what is different from the tries that failed')
    p.add_argument('--skill', help="bart's history-lines skill text, for a tool that cannot load skills")
    command('seen', 'pack')
    p = command('sent', 'pack')
    p.add_argument('--lesson', required=True)
    p.add_argument('--tool', required=True)
    p.add_argument('--model', required=True)
    p.add_argument('--request-id', help='the request or conversation id, where the tool shows one')
    p = command('verify', 'lesson', 'scene', 'board')
    p.add_argument('--ink', required=True)
    p.add_argument('--colour')
    p.add_argument('--regions')
    p.add_argument('--out')
    p = command('accept', 'lesson', 'scene', 'board', 'pass_', 'file')
    p.add_argument('--by', required=True, help='who approved, comma separated')
    p.add_argument('--ink', help='the approved ink board (colour pass)')
    p.add_argument('--marks', help='json file with the reviewers\' marks and instant_no list (colour pass)')
    p.add_argument('--regions')
    p = command('reject', 'lesson', 'board')
    p.add_argument('--failures', required=True)
    p.add_argument('--note', default='')
    p = command('cut', 'lesson', 'scene', 'board', 'file')
    p.add_argument('--size', default='1920x1080')
    command('tally', 'lesson')
    p = command('regions', 'file', 'out')
    p.add_argument('colours', nargs='+', help='name=#hex sampled from the sheet, e.g. coat=#A0522D blaze=#FCF9F8')
    p = command('recolour', 'file', 'map')
    p.add_argument('changes', nargs='+', help='name=#hex, the new colour of a region')
    p.add_argument('-o', '--out', required=True)
    p = command('unsky', 'file', 'out')
    p.add_argument('--grid', default='2x2', help='rows x cols of the board (1x1 for one picture)')
    p = sub.add_parser('sheet')
    p.add_argument('files', nargs='+')
    p.add_argument('--kind', default='sheet')

    args = parser.parse_args(argv)
    try:
        return run(args) or 0
    except Refused as refusal:
        print(f'REFUSED: {refusal}', file=sys.stderr)
        return 2


def run(args) -> int | None:
    if args.command == 'regions':
        import regions
        palette = dict(c.split('=', 1) for c in args.colours)
        rgb = colour.load(args.file)
        label, names = regions.mark(rgb, palette)
        out = regions.stem(args.out)
        if out == regions.stem(args.file):
            raise Refused('The map would overwrite the sheet; give it its own name, e.g. colour-02.regions')
        legend = regions.save(label, names, rgb, Path(args.file), out)
        for name, row in legend['regions'].items():
            print(f"{name:12} key {row['key']}  now {row['colour']}  {row['share']}%")
        print(f'{out}.png (touch up by hand if needed), {out}.json (legend), {out}.preview.png')
        return 0
    if args.command == 'recolour':
        import regions
        legend = read(Path(regions.stem(args.map) + '.json'))
        masks = regions.read_map(Path(regions.stem(args.map) + '.png'), legend)
        changes = dict(c.split('=', 1) for c in args.changes)
        unknown = set(changes) - set(masks)
        if unknown:
            raise Refused(f'No region called {", ".join(sorted(unknown))}; the map has {", ".join(masks)}.')
        out = regions.recolour(colour.load(args.file), masks, changes)
        Image.fromarray(out.round().clip(0, 255).astype('uint8')).save(args.out)
        print(f'{args.out}: ' + ', '.join(f'{k} -> {v}' for k, v in changes.items()))
        return 0
    if args.command == 'unsky':
        rows, cols = (int(n) for n in args.grid.lower().split('x'))
        out, changed = colour.unsky(colour.load(args.file), rows, cols)
        Image.fromarray(out.round().clip(0, 255).astype('uint8')).save(args.out)
        print(f'{args.out}: sky wash taken back to paper on {changed}% of the picture')
        return 0
    if args.command == 'seen':
        packs.seen(Path(args.pack), today())
        return print('Recorded: bart saw these inputs.')

    if args.command == 'sheet':
        failed = False
        for path in args.files:
            report = verify.sheet(Path(path), args.kind)
            failed |= bool(report['failures'])
            print(f'{Path(path).name}: ink {report["ink"]}%, paper {report["paper"]}%, grey shading {report["grey"]}%'
                  + (' FAIL' if report['failures'] else ' ok'))
            print(''.join(f'  - {n}\n' for n in report['notes']), end='')
        for pair in verify.look_alike([Path(p) for p in args.files]) if len(args.files) > 1 else []:
            failed |= pair['too_similar']
            print(f'{Path(pair["a"]).name} / {Path(pair["b"]).name}: side-view outline overlap {pair["overlap"]}, proportions differ '
                  f'{pair["build_difference"]:.0%}' + (' TOO SIMILAR' if pair['too_similar'] else ' ok'))
        return 1 if failed else 0

    lesson = Lesson(args.lesson)

    if args.command == 'check':
        problems = lesson.problems()
        print('\n'.join(f'- {p}' for p in problems) or 'Nothing missing.')
        return 1 if problems else 0

    if args.command == 'approve':
        if args.pass_ == 'ink':
            report = verify.sheet(lesson.media / args.file)
            if report['failures']:
                raise Refused('This ink sheet fails the gate, so it cannot be approved:\n- ' + '\n- '.join(report['notes']))
        entry = lesson.approve(args.who, args.pass_, args.file, 'bart', today())
        return print(f'Approved {args.pass_} sheet of {args.who}: {entry["sha256"][:12]}')

    if args.command == 'palette':
        person = lesson.cast['characters'][args.who]
        sheet = colour.load(lesson.sheet(args.who, 'colour'))
        palette = {}
        for part, box in (person.get('swatches') or {}).items():
            palette[part] = colour.sample(verify.region(sheet, box))
        if not palette or None in palette.values():
            raise Refused(f'Give {args.who} a "swatches" box per garment in cast.json (fractions of the sheet), each on flat paint.')
        person['palette'] = palette
        write(lesson.cast_file, lesson.cast)
        return print(json.dumps(palette, indent=2))

    if args.command == 'map':
        scene = lesson.scene(args.scene)
        boards.layout_map(scene, lesson.board(scene, args.board) if args.board else None).save(args.out)
        return print(args.out)

    if args.command == 'pack':
        number = sum(e.get('event') == 'request' and e.get('board') == args.board for e in ledger.entries(lesson.media)) + 1
        out = Path(args.out) if args.out else lesson.media / 'review' / 'requests' / f'{args.board}-{args.pass_}-{number:02d}'
        out = packs.build(lesson, args.scene, args.board, args.pass_, out, Path(args.ink) if args.ink else None, args.changed,
                          Path(args.skill).read_text() if args.skill else None)
        return print(f'{out}\nShow bart {out / "inputs.png"} and {out / "prompt.txt"} before anything is sent.')

    if args.command == 'sent':
        packs.sent(Path(args.pack), args.tool, args.model, today(), lesson.media, args.request_id)
        return print('Recorded in the ledger.')

    if args.command == 'reject':
        ledger.add(lesson.media, {'event': 'rejected', 'board': args.board, 'failures': args.failures.split(','),
                                  'note': args.note, 'date': today()})
        left = {k: v for k, v in ledger.repeated(lesson.media, args.board).items() if v >= ledger.MAX_SAME_FAILURE}
        return print(f'Recorded. Stop and change the approach for: {", ".join(left)}' if left else 'Recorded.')

    if args.command == 'tally':
        return print(json.dumps(ledger.tally(lesson.media), indent=2))

    scene = lesson.scene(args.scene)
    board = lesson.board(scene, args.board)

    regions = read(Path(args.regions)) if getattr(args, 'regions', None) else None

    if args.command == 'verify':
        report = verify.ink(board, Path(args.ink))
        target = Path(args.ink)
        if args.colour:
            target = Path(args.colour)
            report = verify.coloured(lesson, board, Path(args.ink), target, regions)
        report['sha256'] = sha256(target)
        out = Path(args.out) if args.out else target.with_suffix('')
        write(Path(f'{out}.report.json'), report)
        if args.colour:
            verify.review_sheet(lesson, board, target, report, regions).save(f'{out}.review.png')
            verify.overlay(Path(args.ink), target).save(f'{out}.overlay.png')
        print('\n'.join(f'- {n}' for n in report['notes']) or 'No measurable fault. The reviewers still look at it.')
        return 1 if report['failures'] or report.get('unscored') else 0

    if args.command == 'accept':
        target = Path(args.file)
        report = verify.ink(board, target) if args.pass_ == 'ink' else verify.coloured(lesson, board, Path(args.ink or ''), target, regions)
        if report['failures']:
            raise Refused('The checks still fail: ' + ', '.join(report['failures']))
        if report.get('unscored'):
            raise Refused('Some cells have two named people and no marked regions, so their colours were never checked. '
                          'Mark every named character in those cells (--regions) before the board is approved.')
        by = args.by.split(',')
        entry = {'event': f'{args.pass_}-approved', 'board': args.board, 'file': str(target), 'sha256': sha256(target),
                 'by': by, 'date': today()}
        if args.pass_ == 'colour':
            if 'bart' not in by:
                raise Refused('A colour board becomes keyframes only on bart\'s word (--by claude,chatgpt,bart).')
            if not args.marks:
                raise Refused('The colour board needs the reviewers\' marks (--marks), filled in before bart saw it.')
            marks = read(Path(args.marks))
            verdict = verify.score(marks['marks'], marks.get('instant_no', []))
            if not verdict['passes']:
                raise Refused(f'The review does not pass: {verdict["total"]}/100, instant no: {verdict["instant_no"] or "none"}.')
            entry.update(score=verdict['total'], cells=len(board['cells']))
        elif len(by) < 2:
            raise Refused('The ink board needs two reviewers (our own check and ChatGPT\'s) before it is coloured.')
        ledger.add(lesson.media, entry)
        return print(f'Recorded: {args.pass_} board approved.')

    if args.command == 'cut':
        target = Path(args.file)
        verdict = ledger.last(lesson.media, args.board, 'colour-approved')
        if not verdict or verdict['sha256'] != sha256(target):
            raise Refused('This is not the colour board bart approved.')
        width, height = (int(v) for v in args.size.split('x'))
        rows, cols = board['grid']
        folder = lesson.media / 'stills' / args.board
        folder.mkdir(parents=True, exist_ok=True)
        crops = []
        for (cell, box), spec in zip(boards.cut(Image.open(target).convert('RGB'), rows, cols, (width, height)), board['cells']):
            name = f'{args.board}-shot-{spec["shot"]:02d}.png'
            cell.save(folder / name)
            crops.append({'shot': spec['shot'], 'file': name, 'box': box, 'from': [box[2] - box[0], box[3] - box[1]], 'to': [width, height]})
        write(folder / 'crops.json', {'board': str(target), 'sha256': verdict['sha256'], 'upscale': 'lanczos', 'crops': crops})
        grown = width / crops[0]['from'][0]
        return print(f'{len(crops)} keyframes in {folder}' + (f'\nEach cell was enlarged {grown:.1f}x: look at the faces at full size '
                                                             'before any of these goes to video.' if grown > 1.5 else ''))
    return None


if __name__ == '__main__':
    raise SystemExit(main())
