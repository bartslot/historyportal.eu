"""MCP server "clay-blockout": block out a comic shot in the studio page the teacher has open (clay-blockout Gate 2).

Six tools, small schemas. Each one posts ONE op to server.py (/blockout/call), which checks it with its own
validate() (the COMMANDS whitelist) and hands it to the open studio page over a long poll (blockout_link.py).
The page solves positions on its 0.5 m grid, frames the camera and answers with a short text readback:
no screenshot is needed to stage a shot. blockout_snapshot is the exception, for a final look.

    python3 mcp/blockout_mcp.py           (stdio; STUDIO_SERVER defaults to http://127.0.0.1:8090)
Typical shot: kit_list (once, cached) -> blockout_apply -> blockout_command (a fix) -> [blockout_snapshot].
"""
import base64
import functools
import json
import os
import urllib.error
import urllib.request

from mcp.server.fastmcp import FastMCP, Image

STUDIO_SERVER = os.environ.get('STUDIO_SERVER', 'http://127.0.0.1:8090').rstrip('/')
HTTP_TIMEOUT_S = 45          # longer than blockout_link.CALL_WAIT_S: the server answers first

mcp = FastMCP('clay-blockout')


def _call(op: str, args: dict | None = None) -> dict:
    body = json.dumps({'op': op, 'args': args or {}}).encode()
    req = urllib.request.Request(STUDIO_SERVER + '/blockout/call', data=body, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as r:
            return json.loads(r.read())
    except (urllib.error.URLError, TimeoutError) as e:
        return {'ok': False, 'error': f'studio server not reachable at {STUDIO_SERVER}: {e}'}


def _text(answer: dict) -> str:
    """What the model reads: the readback text (or the error), plus anything the validator dropped."""
    if not answer.get('ok'):
        out = 'ERROR: ' + str(answer.get('error'))
    else:
        r = answer.get('result') or {}
        out = f"revision {r.get('revision')}\n"
        if r.get('done'):
            out += 'done: ' + '; '.join(r['done']) + '\n'
        out += r.get('readback', '')
    if answer.get('dropped'):
        out += '\nDROPPED (not valid): ' + json.dumps(answer['dropped'])[:600]
    return out


@mcp.tool()
def blockout_apply(objects: list[dict], camera: dict | None = None, mode: str | None = None) -> str:
    """Replace the shot with these pieces and frame it; returns the composition readback.

    objects: place commands without "cmd", e.g. {"id":"tasman","kit":"figure","pose":"spyglass","rel":"near",
      "of":"rail","side":"front","gap":0.3,"face":"coast"}; x,z for an exact spot; "on":id to stand on a piece.
    camera: a frame command without "cmd", e.g. {"shot":"medium","subjects":["tasman"],"horizon":0.52,"align":"left-third"}.
    mode: clay | silhouette | off. Overlaps are refused and reported with a free spot, never pushed."""
    return _text(_call('apply', {'objects': objects, 'camera': camera, 'mode': mode}))


@mcp.tool()
def blockout_command(commands: list[dict]) -> str:
    """Run COMMANDS on the open shot (place / pose / frame / mode / undo, and the studio's own add/move/turn...);
    every other piece stays where it is, a teacher's hand edits included. Returns what was done + the readback."""
    return _text(_call('command', {'commands': commands}))


@mcp.tool()
def blockout_frame(shot: str, subjects: list[str], lens: float | None = None, horizon: float | None = None,
                   az: float | None = None, align: str | None = None) -> str:
    """Frame a camera preset on the subjects (wide, three-quarter, front, profile, medium, close-up, over-shoulder,
    low, high). horizon: fraction down the frame (default 2/3); az: degrees around them from their front to their
    right; align: center | left-third | right-third. Returns the readback."""
    args = {k: v for k, v in dict(shot=shot, subjects=subjects, lens=lens, horizon=horizon, az=az, align=align).items() if v is not None}
    return _text(_call('frame', args))


@mcp.tool()
def blockout_read() -> str:
    """The composition readback of the open shot: pieces in frame, subjects left to right with their size, eyes
    against the thirds, horizon, and problems (refused, floating, cut, small, hidden)."""
    return _text(_call('read'))


@mcp.tool()
def blockout_snapshot(size: int = 512, pass_: str = 'clay') -> Image:
    """A small picture of the open shot, only when text is not enough: pass_ clay | silhouette | id (a flat colour
    per piece). size: width in pixels, 128-1024."""
    answer = _call('snapshot', {'size': size, 'pass': pass_})
    if not answer.get('ok'):
        raise RuntimeError(_text(answer))       # FastMCP reports it as the tool's error
    data_url = answer['result']['image']
    return Image(data=base64.b64decode(data_url.split(',', 1)[1]), format='png')


@functools.lru_cache(maxsize=1)
def _kit() -> str:
    answer = _call('kit_list')
    if not answer.get('ok'):
        _kit.cache_clear()
    return json.dumps(answer.get('result')) if answer.get('ok') else _text(answer)


@mcp.tool()
def kit_list() -> str:
    """The clay kit (ids, sizes in metres, floor cells, anchors), the poses and the shot presets. Cached."""
    out = _kit()
    if out.startswith('ERROR'):
        _kit.cache_clear()
    return out


if __name__ == '__main__':
    mcp.run()
