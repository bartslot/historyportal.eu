"""The approved references of a lesson: who is in it, which sheet shows them, and what a scene looks like from above.

Text lives in the repo (resources/art/shots/<lesson>/), pictures on the Mac under the media root
(~/BartsMedia/historyportal, or HP_MEDIA_ROOT). A picture counts only when bart approved it and its bytes still
match the hash taken at that moment: a file that changed since is a different picture.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import board as boards

REPO = Path(__file__).resolve().parents[2]
SHOTS = REPO / 'resources' / 'art' / 'shots'
STYLE = REPO / 'resources' / 'art' / 'style-anchors' / 'history-lines'
MIN_CELL = 700        # px a cell needs to be wide before it can become a keyframe
MAX_NAMED = 3         # named characters in one cell; more and the model swaps their features
PASSES = ('ink', 'colour')

# Ink per kind of picture: the table in the History Lines skill. Black coverage, white share, cross-hatching,
# then what the gate measures: ink share accepted (percent) and the least bare paper (percent). For a sheet these
# are bart's own gate (Nov 26): ink 6 to 8%, white at least 85%.
INK = {
    'sheet': ('6 to 8%', 'at least 85%', 'none', (6, 8), 85),
    'scene': ('10 to 14%', '65 to 75%', 'at most a fifth of the shaded area', (8, 16), 60),
    'bright': ('5 to 8%', '80% or more', 'none', (5, 8), 80),
    'backdrop': ('8 to 12%', '70 to 80%', 'at most a fifth of the shaded area', (6, 14), 65),
}


class Refused(Exception):
    """A gate said no. The message says which one and what would open it."""


def media_root() -> Path:
    return Path(os.environ.get('HP_MEDIA_ROOT', '~/BartsMedia/historyportal')).expanduser()


def sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path: Path) -> dict:
    return json.loads(Path(path).read_text())


def write(path: Path, data: dict) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')


class Lesson:
    def __init__(self, slug: str, shots_dir: Path | None = None, media: Path | None = None, style_dir: Path | None = None):
        self.dir = (shots_dir or SHOTS) / slug
        self.cast_file = self.dir / 'cast.json'
        if not self.cast_file.is_file():
            raise Refused(f'No cast list for "{slug}" ({self.cast_file}).')
        self.cast = read(self.cast_file)
        self.media = (media or media_root()) / self.cast['media']
        self.style_dir = style_dir or STYLE

    def scene(self, name: str) -> dict:
        path = self.dir / 'scenes' / f'{name}.json'
        if not path.is_file():
            raise Refused(f'No scene "{name}" ({path}).')
        return read(path)

    def board(self, scene: dict, board_id: str) -> dict:
        for board in scene.get('boards', []):
            if board['id'] == board_id:
                return board
        raise Refused(f'Scene "{scene["scene"]}" has no board "{board_id}".')

    # ── approved pictures ────────────────────────────────────────────────────────────────────

    def sheet(self, who: str, pass_: str) -> Path:
        """The approved sheet of a character or horse for a pass, or a refusal that says what is missing."""
        if who not in self.cast['characters']:
            raise Refused(f'"{who}" is not in the cast list.')
        entry = (self.cast['characters'][who].get('sheets') or {}).get(pass_) or {}
        return self._approved(entry, self.media, f'{pass_} sheet of {who}')

    def style(self, pass_: str) -> list[Path]:
        """The approved style references of a pass, in attach order."""
        manifest = read(self.style_dir / 'anchors.json')
        entries = [e for e in manifest['files'] if e['pass'] == pass_]
        if not entries:
            raise Refused(f'No History Lines style reference is registered for the {pass_} pass (anchors.json).')
        return [self._approved(e, self.style_dir, f'style reference {e["path"]}') for e in entries]

    @staticmethod
    def _approved(entry: dict, base: Path, what: str) -> Path:
        if not entry.get('path'):
            raise Refused(f'The {what} does not exist yet.')
        if not entry.get('approved'):
            raise Refused(f'The {what} is not approved by bart.')
        path = base / entry['path']
        if not path.is_file():
            raise Refused(f'The {what} is approved but the file is missing: {path}')
        if sha256(path) != entry.get('sha256'):
            raise Refused(f'The {what} changed after bart approved it ({path}). It needs his approval again.')
        return path

    def approve(self, who: str, pass_: str, rel_path: str, by: str, date: str) -> dict:
        """Record bart's approval of a sheet, with the hash of the file as it is now."""
        path = self.media / rel_path
        if not path.is_file():
            raise Refused(f'No such file: {path}')
        entry = {'path': rel_path, 'sha256': sha256(path), 'approved': {'by': by, 'date': date}}
        self.cast['characters'][who].setdefault('sheets', {})[pass_] = entry
        write(self.cast_file, self.cast)
        return entry

    # ── lint ─────────────────────────────────────────────────────────────────────────────────

    def problems(self) -> list[str]:
        """Everything in the cast list and the scenes that breaks a rule, as plain sentences."""
        found: list[str] = []
        people = self.cast['characters']
        owners: dict[str, str] = {}
        for key, person in people.items():
            colour = person.get('signature')
            if colour:
                if colour in owners:
                    found.append(f'{key} and {owners[colour]} share the signature colour "{colour}".')
                owners[colour] = key
            if person.get('horse') and person['horse'] not in people:
                found.append(f'{key} rides "{person["horse"]}", which is not in the cast list.')
            for pass_ in PASSES:
                try:
                    self.sheet(key, pass_)
                except Refused as refusal:
                    found.append(str(refusal))
            if ((person.get('sheets') or {}).get('colour') or {}).get('approved') and not person.get('palette'):
                found.append(f'{key} has an approved colour sheet but no palette sampled from it.')
        horses = [p['horse'] for p in people.values() if p.get('horse')]
        for horse in {h for h in horses if horses.count(h) > 1}:
            found.append(f'More than one rider is on "{horse}"; every rider keeps their own horse.')
        for pass_ in PASSES:
            try:
                self.style(pass_)
            except Refused as refusal:
                found.append(str(refusal))
        for path in sorted((self.dir / 'scenes').glob('*.json')):
            found += [f'{path.stem}: {p}' for p in self.scene_problems(read(path))]
        return found

    def scene_problems(self, scene: dict) -> list[str]:
        found: list[str] = []
        people = self.cast['characters']
        if not scene.get('accuracy'):
            found.append('no historical accuracy check is recorded.')
        layout = scene.get('layout') or {}
        if not layout.get('landmarks'):
            found.append('no layout from above (landmarks, routes, light).')
        elif not layout.get('approved'):
            found.append('the layout is not approved by bart.')
        marks = {m['id'] for m in layout.get('landmarks', [])}
        for board in scene.get('boards', []):
            rows, cols = board['grid']
            if len(board['cells']) != rows * cols:
                found.append(f'board {board["id"]} is {rows}x{cols} but lists {len(board["cells"])} cells.')
            if board.get('kind') not in INK:
                found.append(f'board {board["id"]} needs a kind ({", ".join(INK)}) for its ink percentage.')
            for cell in board['cells']:
                tag = f'board {board["id"]}, shot {cell["shot"]}'
                named = [w for w in cell.get('who', []) if people.get(w, {}).get('kind') == 'person']
                for who in cell.get('who', []):
                    if who not in people:
                        found.append(f'{tag}: "{who}" is not in the cast list.')
                if len(named) > MAX_NAMED:
                    found.append(f'{tag}: {len(named)} named characters; at most {MAX_NAMED} in one picture.')
                if not cell.get('camera'):
                    found.append(f'{tag}: no camera position on the layout.')
                for mark in cell.get('sees', {}):
                    if mark not in marks:
                        found.append(f'{tag}: sees "{mark}", which is not on the layout.')
                    elif cell.get('camera') and mark not in boards.sight(scene, cell):
                        found.append(f'{tag}: says it sees the {mark}, but from that camera it is out of frame. '
                                     'Move the camera or drop the line.')
                for who, at in (cell.get('places') or {}).items():
                    spot = boards.project(cell['camera'], at) if cell.get('camera') else None
                    if not spot or not 0 <= spot['x'] <= 1:
                        found.append(f'{tag}: {who} is placed outside the frame of that camera.')
                if not cell.get('action'):
                    found.append(f'{tag}: no action written.')
                if len(named) > 1 and set(named) - set(cell.get('where') or {}):
                    found.append(f'{tag}: more than one named character, so "where" must say which figure each one is.')
            width = (board.get('size') or [0])[0] / cols
            if 0 < width < MIN_CELL:
                found.append(f'board {board["id"]}: cells would be {round(width)} px wide; a face does not survive that. '
                             'Use fewer cells or one request per shot.')
        return found
