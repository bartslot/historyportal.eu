"""What code can check on a finished board before anyone looks at it: grid, ink weight, kept ink, fixed colours.

It finds the measurable faults (a cloak that came out brown, an ink pass twice too heavy, a colour pass that redrew
the lines). Faces, anatomy, history and taste stay with the reviewers; a clean report is not an approval.
Each failure has a kind, and the ledger counts kinds: the same kind twice on one board stops the retries.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

import board as boards
import colour
from registry import INK, Lesson

GREY_MAX = 0.5       # percent of grey tone away from the lines an ink pass may have (paper texture, stray specks)
SAME_SHAPE = 0.65    # side-view outline overlap above which two animals may be one animal redrawn
SAME_BUILD = 0.05    # ...when their proportions (length over height) also differ by less than this
INK_KEPT = 0.85       # share of pass 1 ink that must survive pass 2 in place
RESERVED_SHARE = 1.0  # percent of a cell's paint in someone's reserved colour before it is worth a look

# The plan's score sheet for the reviewers (weights add up to 100; 90 passes).
SCORE = {'face': 20, 'hair and costume': 15, 'horse': 15, 'anatomy': 10, 'colour': 15, 'geography': 10,
         'poses and cameras': 5, 'History Lines style': 10}
PASS_MARK = 90
INSTANT_NO = ('wrong character', 'swapped clothing or horse', 'major anatomy fault', 'geography contradiction')


def _cells(rgb: np.ndarray, board: dict) -> list[np.ndarray]:
    rows, cols = board['grid']
    return [rgb[top + 3:bottom - 3, left + 3:right - 3]
            for left, top, right, bottom in boards.cells(rgb.shape[1], rgb.shape[0], rows, cols)]


def ink(board: dict, path: Path) -> dict:
    rgb = colour.load(path)
    rows, cols = board['grid']
    low, high = INK[board['kind']][3]
    failures, notes, measured = [], [], []
    if rows * cols > 1 and not boards.gaps_clean(rgb, rows, cols):
        failures.append('grid')
        notes.append('Something is drawn across a gap between cells, or the grid is not even.')
    values = colour.lab(rgb)
    if float((np.hypot(values[..., 1], values[..., 2]) > 15).mean()) > 0.01:      # more than 1% clearly coloured
        failures.append('ink-has-colour')
        notes.append('The ink pass has colour or a tinted wash in it.')
    for n, cell in enumerate(_cells(rgb, board), 1):
        row = {'cell': n, **colour.coverage(cell), 'grey': colour.grey_shading(cell)}
        measured.append(row)
        failures += _ink_rules(row, board['kind'], f'Cell {n}', notes)
    return {'pass': 'ink', 'file': str(path), 'failures': sorted(set(failures)), 'notes': notes, 'cells': measured}


def _ink_rules(row: dict, kind: str, tag: str, notes: list[str]) -> list[str]:
    """The ink gate on one measured picture or cell: ink share, bare paper, and no grey shading."""
    asked, white, _, (low, high), least_paper = INK[kind]
    failures = []
    if not low <= row['ink'] <= high:
        failures.append('ink-weight')
        notes.append(f'{tag}: {row["ink"]}% ink; the gate is {low} to {high}% (asked {asked}).')
    if row['paper'] < least_paper:
        failures.append('paper')
        notes.append(f'{tag}: {row["paper"]}% bare paper; the gate is at least {least_paper}%.')
    if row['grey'] > GREY_MAX:
        failures.append('grey-shading')
        notes.append(f'{tag}: {row["grey"]}% grey shading away from the lines; ink passes have none (at most {GREY_MAX}%).')
    return failures


def sheet(path: Path, kind: str = 'sheet') -> dict:
    """The ink gate on a single sheet (a character, a horse, a prop): ink, paper, grey, measured on the whole page."""
    row = {**colour.coverage(colour.load(path)), 'grey': colour.grey_shading(colour.load(path))}
    notes: list[str] = []
    return {'file': str(path), **row, 'failures': sorted(set(_ink_rules(row, kind, Path(path).name, notes))), 'notes': notes}


def figures(path: Path) -> list[np.ndarray]:
    """The figures on a sheet, left to right, top to bottom, as filled silhouettes (True inside the outline).
    Figures are split where a full column or row of bare paper runs between them."""
    _, ink, paper = colour.masks(colour.load(path))
    drawn = ~paper

    def runs(line: np.ndarray, gap: int) -> list[tuple[int, int]]:
        out, start, blank = [], None, 0
        for i, used in enumerate(list(line) + [False] * gap):
            if used:
                start, blank = (i if start is None else start), 0
            elif start is not None:
                blank += 1
                if blank >= gap:
                    out.append((start, i - blank + 1)); start, blank = None, 0
        return [r for r in out if r[1] - r[0] > 20]

    shapes = []
    for top, bottom in runs(drawn.any(axis=1), 12):
        band = drawn[top:bottom]
        for left, right in runs(band.any(axis=0), 12):
            shapes.append(_filled(band[:, left:right]))
    return shapes


def _filled(drawn: np.ndarray) -> np.ndarray:
    """The outline filled in: everything the paper outside cannot reach."""
    from PIL import ImageDraw
    image = Image.fromarray(np.pad(drawn, 1).astype(np.uint8) * 255).copy()      # a fresh buffer, or floodfill writes nowhere
    ImageDraw.floodfill(image, (0, 0), 128)
    return (np.asarray(image) != 128)[1:-1, 1:-1]


def look_alike(paths: list[Path], size: int = 96) -> list[dict]:
    """Each pair of sheets compared on their first figure, the standing side view every sheet opens with: how much
    the two outlines overlap once scaled to one box, and how far their proportions (length over height) differ.
    Two animals with the same proportions and largely the same outline read as one animal redrawn, whatever their
    coat. Other views are left out on purpose: different poses would make any two horses look different."""
    def side(path: Path) -> tuple[np.ndarray, float]:
        mask = figures(path)[0]
        ys, xs = np.nonzero(mask)
        crop = mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        box = np.asarray(Image.fromarray(crop.astype(np.uint8) * 255).resize((size, size), Image.BILINEAR)) > 127
        return box, (xs.max() - xs.min() + 1) / (ys.max() - ys.min() + 1)

    views = {Path(p).name: side(p) for p in paths}
    out = []
    names = list(views)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            (x, rx), (y, ry) = views[a], views[b]
            overlap = float((x & y).sum() / max(1, (x | y).sum()))
            build = abs(rx - ry) / max(rx, ry)
            out.append({'a': a, 'b': b, 'overlap': round(overlap, 3), 'build_difference': round(build, 3),
                        'too_similar': overlap > SAME_SHAPE and build < SAME_BUILD})
    return out


def coloured(lesson: Lesson, board: dict, ink_path: Path, path: Path, regions: dict | None = None) -> dict:
    """`regions`: optional boxes per cell and character, {"1": {"maffeo": [x0, y0, x1, y1]}} as fractions of the cell."""
    rgb = colour.load(path)
    rows, cols = board['grid']
    people = lesson.cast['characters']
    failures, notes, measured = [], [], []
    kept = colour.ink_kept(colour.load(ink_path), rgb)
    if kept < INK_KEPT:
        failures.append('ink-redrawn')
        notes.append(f'Only {kept:.0%} of the pass 1 ink is still in place: the colour pass redrew or moved the drawing.')
    if rows * cols > 1 and not boards.gaps_clean(rgb, rows, cols):
        failures.append('grid')
        notes.append('The gaps between cells are no longer clean white.')

    seen: dict[tuple[str, str], list[tuple[int, str]]] = {}
    unscored: set[str] = set()
    for n, (cell, spec) in enumerate(zip(_cells(rgb, board), board['cells']), 1):
        row = {'cell': n, **colour.coverage(cell), 'colours': []}
        named = [w for w in spec.get('who', []) if people[w].get('kind') == 'person']
        for who, person in people.items():
            present = who in spec.get('who', [])
            for part, target in (person.get('palette') or {}).items():
                area = region(cell, (regions or {}).get(str(n), {}).get(who)) if present else cell
                result = colour.find(area, target)
                close = result['delta'] is not None and result['delta'] <= colour.SAME
                if not present:
                    if part in person.get('reserved', []) and close and result['share'] >= RESERVED_SHARE:
                        notes.append(f'Cell {n}: {result["share"]}% of the paint is {person["name"]}\'s {part} colour, '
                                     f'and {person["name"]} is not in this shot. Check nobody else wears it.')
                    continue
                if area is cell and len(named) > 1:
                    unscored.add(f'Cell {n}: more than one named character and no regions marked, so colours here are '
                                 'not scored (the right blue somewhere does not prove it is on the right man).')
                    continue
                row['colours'].append({'who': who, 'part': part, **result})
                if result['found'] is None:
                    if part in person.get('signature_parts', []):
                        failures.append(f'colour-missing:{who}')
                        notes.append(f'Cell {n}: {person["name"]}\'s {part} ({target}) is not in the picture.')
                    continue
                seen.setdefault((who, part), []).append((n, result['found']))
                if not close:
                    failures.append(f'colour-drift:{who}')
                    notes.append(f'Cell {n}: {person["name"]}\'s {part} came out {result["found"]}, fixed colour {target} '
                                 f'(Delta E {result["delta"]}).')
        measured.append(row)
    for (who, part), found in seen.items():
        worst = max((colour.delta(colour.hex_rgb(a), colour.hex_rgb(b)) for _, a in found for _, b in found), default=0)
        if worst > colour.SAME:
            failures.append(f'colour-inconsistent:{who}')
            notes.append(f'{people[who]["name"]}\'s {part} differs between cells: '
                         + ', '.join(f'cell {n} {value}' for n, value in found) + '.')
    return {'pass': 'colour', 'file': str(path), 'ink_kept': round(kept, 3), 'failures': sorted(set(failures)),
            'unscored': len(unscored), 'notes': notes + sorted(unscored), 'cells': measured}


def region(cell: np.ndarray, box) -> np.ndarray:
    if not box:
        return cell
    height, width = cell.shape[:2]
    return cell[round(box[1] * height):round(box[3] * height), round(box[0] * width):round(box[2] * width)]


def overlay(ink_path: Path, path: Path) -> Image.Image:
    """The pass 1 ink in red over the coloured board: where red shows beside a dark line, the drawing moved."""
    base = Image.open(path).convert('RGB')
    marks = colour.lab(np.asarray(Image.open(ink_path).convert('RGB').resize(base.size, Image.LANCZOS), dtype=np.float64))[..., 0] < 50
    out = np.asarray(base, dtype=np.uint8).copy()
    out[marks] = (out[marks] * 0.4 + np.array([230, 30, 30]) * 0.6).astype(np.uint8)
    return Image.fromarray(out)


def review_sheet(lesson: Lesson, board: dict, path: Path, report: dict, regions: dict | None = None) -> Image.Image:
    """Every cell beside the sheets of the people in it, their fixed colours beside what came out, and, where
    regions are marked, each character cut out of every cell at one size, in shot order."""
    image = Image.open(path).convert('RGB')
    rows, cols = board['grid']
    items: list[tuple[str, Path | Image.Image]] = []
    cut = boards.cut(image, rows, cols)
    for who in dict.fromkeys(w for boxes in (regions or {}).values() for w in boxes):
        for n, (cell, _) in enumerate(cut, 1):
            box = (regions or {}).get(str(n), {}).get(who)
            if box:
                items.append((f'{who}, shot {board["cells"][n - 1]["shot"]}', boards.crop(cell, box)))
    for n, ((cell, _), spec) in enumerate(zip(cut, board['cells']), 1):
        items.append((f'Shot {spec["shot"]} (cell {n})', cell))
        for who in spec.get('who', []):
            try:
                items.append((f'{lesson.cast["characters"][who]["name"]}: approved sheet', lesson.sheet(who, 'colour')))
            except Exception:       # a missing sheet is already reported by the registry check
                pass
        colours = next((c['colours'] for c in report.get('cells', []) if c['cell'] == n), [])
        if colours:
            items.append((f'Cell {n}: fixed colour, then what came out',
                          boards.swatches([(f'{c["who"]} {c["part"]}', c['target'], c['found']) for c in colours])))
    return boards.contact_sheet(items, per_row=4)


def score(marks: dict[str, int], instant_no: list[str]) -> dict:
    """The reviewers' marks added up. `marks` gives points per line of SCORE; any instant no rejects whatever the total."""
    unknown = set(marks) - set(SCORE)
    if unknown or any(not 0 <= marks.get(k, 0) <= v for k, v in SCORE.items()):
        raise ValueError(f'Marks must use {list(SCORE)} with at most {list(SCORE.values())} points each.')
    total = sum(marks.get(k, 0) for k in SCORE)
    return {'total': total, 'instant_no': instant_no, 'passes': total >= PASS_MARK and not instant_no}
