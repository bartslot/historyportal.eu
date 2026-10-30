"""MCP server "lesson-crew": talk to the History Portal lesson crew from any Claude session.

One implementation: this calls the running crew server (server.py) over HTTP.
"""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from mcp.server.fastmcp import FastMCP

CREW_URL = os.environ.get('CREW_URL', 'http://127.0.0.1:8091/crew')
CREW_JSON = Path(__file__).resolve().parent.parent / 'src' / 'crew' / 'crew.json'
HTTP_TIMEOUT_S = 300  # the director (opus) plus JEV grading is slow

mcp = FastMCP('lesson-crew')
_history: list[dict] = []  # per-process chat memory so successive calls continue the chat


def _crew() -> dict:
    return json.loads(CREW_JSON.read_text())


@mcp.tool()
def list_crew() -> dict:
    """List the lesson crew (id, name, role, model, tasks, backstory) and the set assistants."""
    d = _crew()
    members = [{k: m.get(k) for k in ('id', 'name', 'role', 'model', 'tasks', 'backstory')}
               for m in d['crew']]
    return {'crew': members, 'assistants': d['assistants']}


@mcp.tool()
def ask_crew(message: str, to: str | None = None, assistant: str = 'sofie',
             history: list[dict] = [], lesson_title: str = 'Untitled lesson') -> dict:
    """Ask the lesson crew. `to` = a crew member id (see list_crew) or None to go through the
    set assistant, who brings in specialists. The conversation continues across calls unless
    `history` is passed. NOTE: `settings` and `commands` in the answer are PROPOSALS; outside
    the studio nobody applies them."""
    ids = {m['id'] for m in _crew()['crew']}
    if to is not None and to not in ids:
        raise ValueError(f'unknown crew member {to!r}; use one of {sorted(ids)}')
    hist = history or _history
    body = {'message': message, 'to': to, 'assistant': assistant, 'history': hist,
            'lesson': {'title': lesson_title}}
    req = urllib.request.Request(CREW_URL, json.dumps(body).encode(),
                                 {'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f'crew server error {e.code}: {e.read().decode()[:300]}') from e
    except (urllib.error.URLError, ConnectionError) as e:
        raise RuntimeError(f'Crew server not reachable at {CREW_URL} ({e}). Start it: '
                           '`PORT=8091 python3 server.py` in engine-mvp, or the crew-api '
                           'launch config.') from e
    msgs = data.get('messages', [])
    if not history:  # keep the chat going; shape matches what the studio sends
        _history.append({'who': 'client', 'text': message})
        _history.extend({'who': m.get('who'), 'text': m.get('text', '')} for m in msgs)
    return {'messages': msgs}


@mcp.tool()
def reset_crew_chat() -> str:
    """Forget the automatic conversation history."""
    _history.clear()
    return 'cleared'


if __name__ == '__main__':
    mcp.run()
