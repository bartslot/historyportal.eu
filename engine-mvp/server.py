"""Scene Engine MVP server: serves the static editor and proxies the AI animator.

POST /assist {prompt, scene} -> {reply, commands[]}
The model only proposes commands from COMMANDS below; anything else is dropped here, so the
browser never runs free-form model output. The API key stays on this side.

Model = the app's "mechanical" role (cheap, low-level work): LLM_ROLE_MECHANICAL in the
History Portal .env, Gemini via its OpenAI-compatible endpoint.
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent
# the worktree lives at <repo>/.claude/worktrees/engine-mvp/engine-mvp; the keys live in <repo>/.env
ENV_FILE = pathlib.Path(os.environ.get('HP_ENV_FILE', HERE.parents[3] / '.env'))
PORT = int(os.environ.get('PORT', '8090'))
MAX_COMMANDS = 40
MAX_PROMPT = 1000


def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env(ENV_FILE)
ROLE = ENV.get('LLM_ROLE_MECHANICAL', 'gemini:gemini-3.5-flash-lite')
MODEL = ROLE.split(':', 1)[1] if ':' in ROLE else 'gemini-3.5-flash-lite'
API_KEY = ENV.get('GEMINI_API_KEY', '')
BASE_URL = ENV.get('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai')
if not API_KEY:
    sys.exit(f'GEMINI_API_KEY missing in {ENV_FILE}')

# name -> {arg: type}; "?" marks optional. Numbers are clamped below.
COMMANDS = {
    'add': {'model': 'str', 'x': 'num', 'z': 'num', 'turn?': 'num'},
    'move': {'id': 'str', 'x': 'num', 'z': 'num', 'at?': 'num'},
    'walk': {'id': 'str', 'x': 'num', 'z': 'num', 'start': 'num', 'end': 'num'},
    'turn': {'id': 'str', 'degrees': 'num', 'at?': 'num'},
    'face': {'id': 'str', 'target': 'str', 'at?': 'num'},
    'scale': {'id': 'str', 'factor': 'num', 'at?': 'num'},
    'clip': {'id': 'str', 'name': 'str'},
    'delete': {'id': 'str'},
    'length': {'seconds': 'num'},
    'sky': {'index': 'num'},
    'camera': {'target': 'str', 'distance?': 'num', 'angle?': 'num', 'height?': 'num'},
    'play': {},
}
RANGES = {'x': (-29, 29), 'z': (-29, 29), 'at': (0, 120), 'start': (0, 120), 'end': (0, 120),
          'degrees': (-720, 720), 'turn': (-360, 360), 'factor': (0.2, 5), 'seconds': (1, 120),
          'index': (0, 20), 'distance': (2, 60), 'angle': (-360, 360), 'height': (5, 85)}

SYSTEM = """You are a low-level animation assistant inside a 3D scene editor for history lessons.
You turn the teacher's request into a short list of commands. You do not chat at length.

World: flat ground from -29 to 29 on x and z, metres, y is up. Camera looks from -z towards +z by default.
Time is in seconds on one timeline. Objects keep their position between keyframes; movement between two
keyframes is eased. Animated models also loop one of their own clips (idle, walk, ...).

Commands (JSON objects, "cmd" plus arguments):
- {"cmd":"add","model":<catalog name>,"x":n,"z":n,"turn":deg?}   new object; refer to it later as "new1", "new2"... in order
- {"cmd":"move","id":s,"x":n,"z":n,"at":t?}        jump there, keyed at time t (default: current time)
- {"cmd":"walk","id":s,"x":n,"z":n,"start":t,"end":t}   travel from where it is at start to x,z, arriving at end; turns to face the way it goes and plays its walk clip if it has one
- {"cmd":"turn","id":s,"degrees":n,"at":t?}        rotate around the vertical axis, positive = counter-clockwise seen from above
- {"cmd":"face","id":s,"target":id,"at":t?}         turn to look at another object
- {"cmd":"scale","id":s,"factor":n,"at":t?}
- {"cmd":"clip","id":s,"name":s}                     loop one of the object's own clips (must be in its clip list)
- {"cmd":"delete","id":s}
- {"cmd":"length","seconds":n}                       timeline length; make it long enough for your keys
- {"cmd":"sky","index":n}                            choose skybox 0-3
- {"cmd":"camera","target":id,"distance":n?,"angle":deg?,"height":deg?}  frame an object; height 5-85 degrees above the ground
- {"cmd":"play"}                                     start playback at the end

Rules: use only ids that exist in the scene or new1.. you add. Use only catalog names given. Keep objects
apart by at least 1.5 m unless asked. Prefer few, clear keyframes. If the request is impossible, return no
commands and say why in "reply".
Answer ONLY with JSON: {"reply": "<one short sentence to the teacher>", "commands": [ ... ]}"""


def validate(commands):
    clean, dropped = [], []
    for c in commands[:MAX_COMMANDS]:
        if not isinstance(c, dict) or c.get('cmd') not in COMMANDS:
            dropped.append(c)
            continue
        spec = COMMANDS[c['cmd']]
        out = {'cmd': c['cmd']}
        ok = True
        for arg, typ in spec.items():
            name, optional = arg.rstrip('?'), arg.endswith('?')
            if name not in c or c[name] is None:
                ok = ok and optional
                continue
            v = c[name]
            if typ == 'num':
                try:
                    v = float(v)
                except (TypeError, ValueError):
                    ok = False
                    continue
                lo, hi = RANGES.get(name, (-1e4, 1e4))
                v = max(lo, min(hi, v))
            else:
                v = str(v)[:80]
            out[name] = v
        (clean if ok else dropped).append(out if ok else c)
    return clean, dropped


def ask_model(prompt, scene):
    body = {
        'model': MODEL,
        'messages': [
            {'role': 'system', 'content': SYSTEM},
            {'role': 'user', 'content': 'Scene:\n' + json.dumps(scene) + '\n\nRequest: ' + prompt},
        ],
        'response_format': {'type': 'json_object'},
        'temperature': 0.2,
    }
    req = urllib.request.Request(BASE_URL + '/chat/completions', data=json.dumps(body).encode(),
                                 headers={'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        content = json.load(r)['choices'][0]['message']['content']
    start, end = content.find('{'), content.rfind('}')
    return json.loads(content[start:end + 1])


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(HERE), **kw)

    def _json(self, status, data):
        raw = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path != '/assist':
            return self._json(404, {'error': 'not found'})
        try:
            length = min(int(self.headers.get('Content-Length', 0)), 200_000)
            data = json.loads(self.rfile.read(length) or b'{}')
            prompt = str(data.get('prompt', ''))[:MAX_PROMPT].strip()
            scene = data.get('scene', {})
            if not prompt:
                return self._json(422, {'error': 'Type what should happen.'})
            answer = ask_model(prompt, scene)
            commands, dropped = validate(answer.get('commands') or [])
            return self._json(200, {'reply': str(answer.get('reply', ''))[:400], 'commands': commands,
                                    'dropped': len(dropped), 'model': MODEL})
        except urllib.error.HTTPError as e:
            detail = e.read()[:300].decode(errors='replace')
            print('model error', e.code, detail, file=sys.stderr)
            return self._json(502, {'error': f'The model service answered {e.code}.'})
        except Exception as e:  # noqa: BLE001 - report every failure to the editor, log the detail
            print('assist failed:', repr(e), file=sys.stderr)
            return self._json(500, {'error': 'The assistant failed: ' + type(e).__name__})


if __name__ == '__main__':
    print(f'Scene Engine MVP on http://127.0.0.1:{PORT}  (assistant model: {MODEL})')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
