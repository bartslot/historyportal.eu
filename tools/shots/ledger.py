"""The run ledger of a lesson: every request, every verdict, in one append-only file beside the pictures.

It answers two questions later: what exactly was sent, and how often did we already fail the same way. Two failures
of one kind on one board is the limit; a third try needs a written change of approach, not the same prompt again.
"""
from __future__ import annotations

import json
from pathlib import Path

from registry import Refused

MAX_SAME_FAILURE = 2


def _file(media: Path) -> Path:
    return Path(media) / 'review' / 'shots-ledger.jsonl'


def entries(media: Path) -> list[dict]:
    path = _file(media)
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()] if path.is_file() else []


def add(media: Path, entry: dict) -> None:
    path = _file(media)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a') as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + '\n')


def last(media: Path, board: str, event: str) -> dict | None:
    found = [e for e in entries(media) if e.get('board') == board and e.get('event') == event]
    return found[-1] if found else None


def repeated(media: Path, board: str) -> dict[str, int]:
    """Failure kinds on this board since the approach last changed, with how often each happened."""
    counts: dict[str, int] = {}
    for entry in entries(media):
        if entry.get('board') != board:
            continue
        if entry.get('event') == 'approach-changed':
            counts = {}
        elif entry.get('event') == 'rejected':
            for mode in entry.get('failures', []):
                counts[mode] = counts.get(mode, 0) + 1
    return counts


def may_try_again(media: Path, board: str, changed: str | None) -> None:
    stuck = sorted(mode for mode, n in repeated(media, board).items() if n >= MAX_SAME_FAILURE)
    if not stuck:
        return
    if not changed:
        raise Refused(f'Board {board} already failed {MAX_SAME_FAILURE} times on: {", ".join(stuck)}. '
                      'Stop and change the approach (--changed "what is different now"), or bring it to bart.')
    add(media, {'event': 'approach-changed', 'board': board, 'because': stuck, 'change': changed})


def tally(media: Path) -> dict:
    """Requests sent against cells accepted: the number the plan asks us to watch."""
    log = entries(media)
    return {'requests': sum(e.get('event') == 'request' for e in log),
            'rejected': sum(e.get('event') == 'rejected' for e in log),
            'boards_accepted': sum(e.get('event') == 'colour-approved' for e in log),
            'cells_accepted': sum(e.get('cells', 0) for e in log if e.get('event') == 'colour-approved')}
