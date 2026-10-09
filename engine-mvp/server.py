"""Scene Engine MVP server: serves the static editor and runs the lesson crew.

POST /crew {message, to?, assistant, history[], scene, settings[], lesson} -> {messages[]}
The teacher (the client) talks to the set assistant, who asks one or two crew members
(src/crew/crew.json); each answers in their own name and may change settings and the scene.
The model only proposes scene commands from COMMANDS and setting values from the list the
browser sent; anything else is dropped here, so the browser never runs free-form model output.
Nothing leaves this machine except through the local `claude` CLI (Bart's subscription) and the JEV grader.

Models: per member in crew.json, run through `claude -p`. CREW_JEV=0 switches the JEV grading off.
"""
import concurrent.futures
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = pathlib.Path(__file__).resolve().parent
# the worktree lives at <repo>/.claude/worktrees/engine-mvp/engine-mvp; the keys live in <repo>/.env
ENV_FILE = pathlib.Path(os.environ.get('HP_ENV_FILE', HERE.parents[3] / '.env'))
PORT = int(os.environ.get('PORT', '8090'))
MAX_COMMANDS = 40
MAX_PROMPT = 1000
MAX_HISTORY = 16
MAX_REPLY = 2000
MAX_BODY = 2_000_000
MAX_ASKS = 2
CREW = json.loads((HERE / 'src' / 'crew' / 'crew.json').read_text())
MAX_BAKE_BYTES = 1_000_000_000          # a published MP4 may be large, but not unbounded
BAKES = HERE / 'bakes'


def load_env(path):
    env = {}
    for line in path.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ROUTER_MODEL, ROUTER_EFFORT = 'claude-sonnet-5-5', 'low'
MEMBER_EFFORT = 'medium'
DIRECTOR = 'director'
CLAUDE_BIN = os.environ.get('CREW_CLAUDE_BIN', 'claude')
CLAUDE_TIMEOUT = 180
JEV_ON = os.environ.get('CREW_JEV', '1') != '0'
JEV_IDS = {'historian', 'writer', 'learning', 'comedian'}   # the members whose answers carry claims
JEV_MIN_SCORE = 0.9                                         # below this the director gives a second opinion
JEV_DIR = HERE.parents[3] / 'tools' / 'artkit' / 'jev'

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
    'door': {'id': 'str', 'open': 'num', 'at?': 'num'},
    'play': {},
}
RANGES = {'x': (-29, 29), 'z': (-29, 29), 'at': (0, 120), 'start': (0, 120), 'end': (0, 120),
          'degrees': (-720, 720), 'turn': (-360, 360), 'factor': (0.2, 5), 'seconds': (1, 120),
          'index': (0, 20), 'distance': (2, 60), 'angle': (-360, 360), 'height': (5, 85)}

SCENE_RULES = """World: flat ground from -29 to 29 on x and z, metres, y is up. Camera looks from -z towards +z by default.
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
- {"cmd":"door","id":s,"open":1|0,"at":t?}            open (1) or close (0) a placed door or gate at time t
- {"cmd":"play"}                                     start playback at the end

Doors and gates only exist on a wall: add them next to a house/town (they snap to the nearest wall) and
only after that building exists. They start closed.
Rules: use only ids that exist in the scene or new1.. you add. Use only catalog names given. Keep objects
apart by at least 1.5 m unless asked. Prefer few, clear keyframes. If something is impossible, use no commands
and say why."""


def validate(commands):
    clean, dropped = [], []
    if not isinstance(commands, list):
        return clean, [commands]
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


def ask_claude(model, system, user, schema, effort):
    """One structured answer from the local claude CLI. No ANTHROPIC_API_KEY in the env, so it
    bills the subscription; no tools, settings or MCP, so it only thinks."""
    cmd = [CLAUDE_BIN, '-p', '--model', model, '--system-prompt', system, '--tools', '',
           '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence',
           '--effort', effort, '--output-format', 'json', '--json-schema', json.dumps(schema)]
    env = {k: v for k, v in os.environ.items() if k != 'ANTHROPIC_API_KEY'}
    with tempfile.TemporaryDirectory() as cwd:
        try:
            r = subprocess.run(cmd, input=user, capture_output=True, text=True, timeout=CLAUDE_TIMEOUT,
                               env=env, cwd=cwd)
        except subprocess.TimeoutExpired:
            raise RuntimeError(f'claude timed out after {CLAUDE_TIMEOUT}s ({model})') from None
    # stderr may hold a harmless "[claude-code:unrecognized_model]" line: only the exit code and JSON count
    try:
        out = json.loads(r.stdout)
    except ValueError:
        raise RuntimeError(f'claude gave no JSON (exit {r.returncode}): {r.stderr.strip()[:200]}') from None
    if r.returncode != 0 or out.get('is_error'):
        raise RuntimeError(f'claude failed (exit {r.returncode}): {str(out.get("result"))[:200]}')
    if isinstance(out.get('structured_output'), dict):
        return out['structured_output']
    return json.loads(out['result'])


# ---------- strict JSON schemas for --json-schema ----------
def _obj(props, required):
    return {'type': 'object', 'properties': props, 'required': required, 'additionalProperties': False}


_REPLY = {'type': 'string'}
ROUTER_SCHEMA = _obj({
    'reply': _REPLY,
    'ask': {'type': 'array', 'items': _obj({'crew': {'type': 'string'}, 'question': {'type': 'string'}},
                                           ['crew', 'question'])},
}, ['reply', 'ask'])
_TITLE = {'type': 'string'}
_SETTINGS = {'type': 'array', 'items': _obj({'id': {'type': 'string'},
                                              'value': {'type': ['number', 'boolean', 'string']}}, ['id', 'value'])}
_COMMANDS = {'type': 'array', 'items': {'type': 'object'}}   # free objects: validate() decides what survives
STAGE_SCHEMA = _obj({'reply': _REPLY, 'settings': _SETTINGS, 'commands': _COMMANDS, 'title': _TITLE},
                    ['reply', 'settings', 'commands'])
STAGE_SCHEMA_NO_TITLE = _obj({k: v for k, v in STAGE_SCHEMA['properties'].items() if k != 'title'},
                             ['reply', 'settings', 'commands'])
TALK_SCHEMA = _obj({'reply': _REPLY}, ['reply'])
TALK_SCHEMA_WRITER = _obj({'reply': _REPLY, 'title': _TITLE}, ['reply'])


def member_schema(m, direct):
    if m.get('reviews_only'):
        return TALK_SCHEMA
    if may_change(m, direct):
        return STAGE_SCHEMA if m['id'] == 'writer' else STAGE_SCHEMA_NO_TITLE
    return TALK_SCHEMA_WRITER if m['id'] == 'writer' else TALK_SCHEMA


# ---------- skill packs: house rules appended to each prompt ----------
_SKILL_CACHE: dict = {}
_FRONTMATTER = re.compile(r'\A---\s*\n.*?\n---\s*\n', re.S)


def load_skill(path):
    """Text of one skill file without its YAML frontmatter; '' (logged once) when it is missing."""
    if path in _SKILL_CACHE:
        return _SKILL_CACHE[path]
    f = pathlib.Path(path.replace('~', str(pathlib.Path.home()), 1) if path.startswith('~') else path)
    if not f.is_absolute():
        f = HERE / f
    try:
        text = _FRONTMATTER.sub('', f.read_text(), count=1).strip()
    except OSError as e:
        print('crew skill missing, skipped:', f, repr(e), file=sys.stderr)
        text = ''
    _SKILL_CACHE[path] = text
    return text


def tasks_and_skills(tasks, skills):
    out = ''
    if tasks:
        out += '\nYour tasks:\n' + '\n'.join('- ' + t for t in tasks)
    texts = [t for t in (load_skill(p) for p in skills or []) if t]
    if texts:
        out += '\n\nYour skill pack (house rules; follow them):\n\n' + '\n\n---\n\n'.join(texts)
    return out


# ---------- the crew ----------
MEMBERS = {m['id']: m for m in CREW['crew']}
for _m in MEMBERS.values():   # read every skill file once, at startup
    for _p in _m.get('skills', []):
        load_skill(_p)
SHARED = """You work in the crew that makes a history lesson in the History Portal studio, a 3D stage where a
teacher builds a narrated, story-driven lesson for their class. The teacher is the CLIENT: their goal, their class,
their final say. A value the client set by hand stays as it is unless the client asks you to change it now.
Say "your class", never "learners" or "users". Short, plain, concrete; no tagline-style sentences, no
greetings, no compliments, no introducing yourself unless asked. Plain text, no markdown (no **, no #,
no bullets with *); at most 120 words.
Never present an invented event as history: say plainly which parts are made up.
ALWAYS write in the language of the client's last message (Dutch in, Dutch out), whatever language the
rest of this prompt or the conversation is in. Talk about THIS lesson only; examples below are about other
lessons and only show the tone: never repeat them."""


def roster(assistant):
    lines = [f"- {m['id']}: {m['name']}, {m['role']}: {m['mission']}" for m in CREW['crew']]
    return f"- you: {assistant['name']}, set assistant\n" + '\n'.join(lines)


def router_prompt(assistant):
    return f"""{SHARED}

You are {assistant['name']}, the SET ASSISTANT ({assistant['pronoun']}). {assistant['backstory']}
The client talks to you. You do no specialist work and change nothing yourself: you decide which crew
member(s) to ask, and say so in one or two friendly sentences. Never promise a change you are not handing to
someone: anything on the stage (sky, light, time of day, look, objects, town) goes to set. The crew:
{roster(assistant)}

How you decide:
- The client asks for ANY change on the stage (sky, light, time of day, day or night, look, style, objects,
  people, buildings, town): ask set (Jules) for it. Only set and actors can change the stage.
- Nothing known yet about the lesson (no topic, no class age): do not ask anyone. Ask the client what kind of
  lesson or story they want: the topic, the age of their class, a story or a game, and how long.
- A question or request for one specialist: ask that one. Facts and sources: historian. Story, angle, script:
  writer. Age, words, outcomes, quiz: learning. Jokes: comedian. Voices, how lines are said, characters moving:
  actors. The stage, objects, sky, light, look, town: set.
- At most {MAX_ASKS} crew members per turn. The director only when the client asks for a review of the result
  or says the lesson is finished.
- If the client just chats or thanks you, answer yourself and ask no one.
Answer ONLY with JSON: {{"reply": "<what you tell the client>", "ask": [{{"crew": "<id>", "question": "<what you ask them, with the client's context>"}}]}}
"ask" is [] when you ask no one.{tasks_and_skills(CREW.get('assistant_tasks'), [])}"""


STAGE_OWNERS = {'set', 'actors'}
TITLE_RULE = 'The lesson title: "title", only when the lesson is still untitled or the client asks for a new one.'


def may_change(m, direct):
    """Every crew member CAN change every setting; the stage owners always, the others only when the
    client talks to them directly. Enforced here, not left to the prompt."""
    return not m.get('reviews_only') and (m['id'] in STAGE_OWNERS or direct)


def member_prompt(m, assistant, direct=False):
    title = TITLE_RULE if m['id'] == 'writer' else ''
    if m.get('reviews_only'):
        powers = 'You do NOT change anything yourself. Give notes, each to one crew member by name, with one reason.'
        fmt = '{"reply": "<your notes to the client>"}'
    elif not may_change(m, direct):
        powers = f'You do not change the stage or settings: that is for set and actors. {title}'
        fmt = '{"reply": "<to the client, in your own voice>"' + (', "title": "<only to rename the lesson>"}' if title else '}')
    else:
        powers = f"""You can change every studio setting and the stage, like the client can by hand. Change what the
request needs, nothing more. Every change is shown to the client and can be undone.
Settings: the list "settings" below (id, label, type, range or options, current value, hint). Set a value with
{{"id": "<id>", "value": <number | true/false | option value>}}. {title}
The stage, with scene commands:
{SCENE_RULES}"""
        fmt = ('{"reply": "<to the client, in your own voice>", "settings": [ {"id": "<id>", "value": <value>} ], "commands": [ ... ]'
               + (', "title": "<only to rename the lesson>"}' if title else '}'))
    return f"""{SHARED}

You are {m['name']}, the {m['role'].lower()}. {m['backstory']}
Mission: {m['mission']}
You own: {m['owns']}
The set assistant {assistant['name']} brings you the client's request; the client reads your answer directly.
If the client asks about you, answer as yourself, from your backstory, briefly.
{powers}
Answer ONLY with JSON: {fmt}{tasks_and_skills(m.get('tasks'), m.get('skills'))}"""


def clean_settings(proposed, offered):
    """Only ids the browser offered; numbers clamped to their range, options from their list."""
    by_id = {o.get('id'): o for o in offered if isinstance(o, dict) and isinstance(o.get('id'), str)} if isinstance(offered, list) else {}
    out = []
    for p in proposed[:MAX_COMMANDS] if isinstance(proposed, list) else []:
        o = by_id.get(p.get('id')) if isinstance(p, dict) and isinstance(p.get('id'), str) else None
        if not o:
            continue
        v = p.get('value')
        if o.get('type') == 'range':
            try:
                v = max(float(o['min']), min(float(o['max']), float(v)))
            except (TypeError, ValueError, KeyError):
                continue
        elif o.get('type') == 'toggle':
            v = v in (True, 1, '1', 'true', 'on')
        elif o.get('type') == 'select':
            if str(v) not in [str(opt[0]) for opt in o.get('options', [])]:
                continue
            v = str(v)
        else:
            continue
        out.append({'id': o['id'], 'value': v})
    return out


def context(data):
    hist = [h for h in (data.get('history') if isinstance(data.get('history'), list) else []) if isinstance(h, dict)][-MAX_HISTORY:]
    talk = '\n'.join(f"{str(h.get('who', ''))[:40]}: {str(h.get('text', ''))[:600]}" for h in hist)
    lesson = data.get('lesson', {}) if isinstance(data.get('lesson'), dict) else {}
    return (f"Lesson: {json.dumps(lesson)[:2000]}\nConversation so far:\n{talk or '(none)'}\n"
            f"Settings: {json.dumps(data.get('settings', []))[:12000]}\nStage: {json.dumps(data.get('scene', {}))[:12000]}")


def jev_score(resp):
    """{'score': P(sound), 'choice': ...} out of a JEV response, or None when it has no usable answer."""
    ans = (resp.get('answers') or resp).get('sound')
    if not isinstance(ans, dict):
        return None
    probs = ans.get('probabilities') or {}
    score = probs.get('sound')
    if score is None:   # a bare choice with no probabilities: certain only on the label itself
        score = 1.0 if ans.get('choice') == 'sound' else 0.0
    return {'score': round(float(score), 2), 'choice': ans.get('choice')}


def jev_grade(m, text, data):
    """Grade one answer with the house grader JEV. Never raises: a grader failure never fails the turn."""
    try:
        sys.path.insert(0, str(JEV_DIR))
        import jev
        lesson = data.get('lesson') if isinstance(data.get('lesson'), dict) else {}
        state = {'product': 'History Portal, history lessons for school pupils', 'house_bar': jev.bar(),
                 'lesson': f"{str(lesson.get('title', ''))[:200]}\n{str(data.get('message', ''))[:MAX_PROMPT]}".strip(),
                 'answer_by': f"{m['name']}, {m['role']}", 'answer': text}
        question = {'sound': {'type': 'choice', 'criteria': {
            'sound': 'every historical claim is correct and anything invented is clearly named as invented',
            'unsound': 'a historical claim is wrong, unsupported, or invention is presented as history'},
            'instructions': "Grade this crew member's answer for a history lesson."}}
        return jev_score(jev.ask(state, question))
    except (Exception, SystemExit) as e:  # noqa: BLE001 - jev.py exits on HTTP errors
        print('jev failed:', m['id'], repr(e), file=sys.stderr)
        return None


def director_review(text, who, data, assistant):
    """The app's advisor step: the director's short second opinion on an answer JEV is unsure about."""
    d = MEMBERS[DIRECTOR]
    ask = (f"{context(data)}\n\nThe client just said: {str(data.get('message', ''))[:MAX_PROMPT]}\n"
           f"{who} answered: {text}\n\nOur fact-checker is unsure about the HISTORICAL CLAIMS in this answer. "
           "Judge only those (not the lesson's state, title or style). In at most 60 words, in the client's "
           "language: which claim is wrong or unsure, and the correction. If every claim holds, say so in one "
           "sentence.")
    return str(ask_claude(d['model'], member_prompt(d, assistant), ask, TALK_SCHEMA, 'high').get('reply', ''))[:MAX_REPLY]


def ask_member(m, assistant, question, data, direct=False):
    # the client's own words travel with the question: a summary loses facts (the class age, for one)
    said = str(data.get('message', ''))[:MAX_PROMPT]
    answer = ask_claude(m['model'], member_prompt(m, assistant, direct),
                        context(data) + f"\n\nThe client just said: {said}\nRequest to you: {question[:MAX_PROMPT]}",
                        member_schema(m, direct), MEMBER_EFFORT)
    msg = {'who': m['id'], 'text': str(answer.get('reply', ''))[:MAX_REPLY]}
    title = str(answer.get('title') or '').strip()[:80]
    if title and m['id'] == 'writer':
        msg['title'] = title
    if may_change(m, direct):
        commands, dropped = validate(answer.get('commands') or [])
        msg['settings'] = clean_settings(answer.get('settings'), data.get('settings'))
        msg['commands'] = commands
        msg['dropped'] = len(dropped)
    if JEV_ON and m['id'] in JEV_IDS and msg['text'].strip():
        grade = jev_grade(m, msg['text'], data)
        if grade:
            msg['jev'] = grade
            if grade['score'] < JEV_MIN_SCORE:
                try:
                    msg['review'] = {'who': DIRECTOR, 'text': director_review(msg['text'], m['name'], data, assistant)}
                except Exception as e:  # noqa: BLE001 - the answer stands without its second opinion
                    print('director review failed:', repr(e), file=sys.stderr)
    return msg


def _safe_member(a, assistant, message, data):
    try:  # one member failing never loses the assistant's reply or the others' answers
        return ask_member(MEMBERS[a['crew']], assistant, str(a.get('question') or message), data)
    except Exception as e:  # noqa: BLE001 - reported to the client in the chat, detail logged
        print('crew member failed:', a['crew'], repr(e), file=sys.stderr)
        return {'who': a['crew'], 'text': '(could not answer this time, ask again)'}


def crew_turn(data):
    message = str(data.get('message', ''))[:MAX_PROMPT].strip()
    assistant = CREW['assistants'].get(str(data.get('assistant'))) or next(iter(CREW['assistants'].values()))
    to = data.get('to')
    if isinstance(to, str) and to in MEMBERS:   # the client talks to one crew member directly
        return [ask_member(MEMBERS[to], assistant, message, data, direct=True)]
    plan = ask_claude(ROUTER_MODEL, router_prompt(assistant), context(data) + '\n\nClient: ' + message,
                      ROUTER_SCHEMA, ROUTER_EFFORT)
    out = [{'who': 'assistant', 'text': str(plan.get('reply', ''))[:800]}]
    asks = plan.get('ask') if isinstance(plan.get('ask'), list) else []
    asks = [a for a in asks if isinstance(a, dict) and isinstance(a.get('crew'), str) and a['crew'] in MEMBERS][:MAX_ASKS]
    if asks:   # parallel; map keeps the order of the asks
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_ASKS) as pool:
            out += list(pool.map(lambda a: _safe_member(a, assistant, message, data), asks))
    return out


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(HERE), **kw)

    def end_headers(self):
        # the editor changes often: never let the browser run a stale script
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def _json(self, status, data):
        raw = json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path.startswith('/bake'):
            return self._save_bake()
        if self.path != '/crew':
            return self._json(404, {'error': 'not found'})
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length > MAX_BODY:
                return self._json(413, {'error': 'Too much to send at once.'})
            try:
                data = json.loads(self.rfile.read(length) or b'{}')
            except ValueError:
                return self._json(400, {'error': 'The request was not readable.'})
            if not isinstance(data, dict) or not str(data.get('message', '')).strip():
                return self._json(422, {'error': 'Type a message.'})
            return self._json(200, {'messages': crew_turn(data), 'model': ROUTER_MODEL})
        except Exception as e:  # noqa: BLE001 - report every failure to the editor, log the detail
            print('crew failed:', repr(e), file=sys.stderr)
            return self._json(500, {'error': 'The crew could not answer: ' + type(e).__name__})


def safe_name(raw):
    """Only a plain file name ending in .mp4: no folders, no tricks."""
    name = pathlib.PurePosixPath(urllib.parse.unquote(raw)).name
    name = ''.join(c for c in name if c.isalnum() or c in '-_.')
    return name if name.endswith('.mp4') and len(name) > 4 else None


def _save_bake(self):
    query = urllib.parse.urlparse(self.path).query
    name = safe_name(urllib.parse.parse_qs(query).get('name', [''])[0])
    length = int(self.headers.get('Content-Length', 0))
    if not name:
        return self._json(422, {'error': 'name must be a plain .mp4 file name'})
    if not 0 < length <= MAX_BAKE_BYTES:
        return self._json(413, {'error': 'video missing or too large'})
    BAKES.mkdir(exist_ok=True)
    with open(BAKES / name, 'wb') as f:
        remaining = length
        while remaining:
            chunk = self.rfile.read(min(remaining, 1 << 20))
            if not chunk:
                break
            f.write(chunk)
            remaining -= len(chunk)
    print(f'published {name} ({length / 1e6:.1f} MB)')
    return self._json(200, {'url': 'bakes/' + name})


Handler._save_bake = _save_bake

if __name__ == '__main__':
    print(f'Scene Engine MVP on http://127.0.0.1:{PORT}  (crew models: router {ROUTER_MODEL}, '
          + ', '.join(f"{i} {m['model']}" for i, m in MEMBERS.items()) + ')')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
