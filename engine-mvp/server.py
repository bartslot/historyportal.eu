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
import random
import re
import signal
import subprocess
import sys
import tempfile
import threading
import uuid
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
JEV_MIN_SCORE = 0.8                                         # below this the director gives a second opinion
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
    # clay blockout (Gate 1): intent, solved in the page (src/blockout/solve.ts) on the 0.5 m grid
    'place': {'id': 'str', 'kit?': 'str', 'rel?': 'str', 'of?': 'str', 'and?': 'str', 'side?': 'str', 'gap?': 'num',
              'offset_r?': 'num', 'offset_f?': 'num', 'x?': 'num', 'z?': 'num', 'on?': 'str', 'face?': 'str',
              'turn?': 'num', 'height?': 'num', 'pose?': 'str'},
    'pose': {'id': 'str', 'name': 'str'},
    'frame': {'shot': 'str', 'subjects': 'strs', 'lens?': 'num', 'horizon?': 'num', 'az?': 'num', 'align?': 'str'},
    'mode': {'name': 'str'},
    'undo': {},
}
# named choices: a command with any other value is dropped whole
ENUMS = {
    'rel': {'near', 'behind', 'in_front', 'left_of', 'right_of', 'between'},
    'side': {'front', 'back', 'left', 'right'},
    'kit': {'deck', 'rail', 'mast', 'wall', 'barrel', 'crate', 'chest', 'cannon', 'table', 'cart', 'stool', 'figure', 'marker'},
    ('pose', 'name'): {'stand', 'point', 'spyglass'},
    ('place', 'pose'): {'stand', 'point', 'spyglass'},
    'shot': {'wide', 'three-quarter', 'front', 'profile', 'medium', 'close-up', 'over-shoulder', 'low', 'high'},
    ('mode', 'name'): {'clay', 'silhouette', 'off'},
    'align': {'center', 'left-third', 'right-third'},
}
MAX_LIST = 8
RANGES = {'x': (-29, 29), 'z': (-29, 29), 'at': (0, 120), 'start': (0, 120), 'end': (0, 120),
          'degrees': (-720, 720), 'turn': (-360, 360), 'factor': (0.2, 5), 'seconds': (1, 120),
          'index': (0, 20), 'distance': (2, 60), 'angle': (-360, 360), 'height': (5, 85),
          'gap': (0, 5), 'offset_r': (-10, 10), 'offset_f': (-10, 10), 'lens': (12, 200), 'horizon': (0.05, 0.95),
          'az': (-360, 360)}
# the same name, another meaning per command: height of a placed piece is metres, of the camera degrees
RANGES_BY_CMD = {('place', 'height'): (0.3, 4)}

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
Clay blockout (a still shot from kit pieces; positions are solved on a 0.5 m grid, overlaps are refused and
reported with a free spot, never pushed):
- {"cmd":"place","id":s,"kit":k?,"rel":r?,"of":id?,"and":id?,"side":front|back|left|right?,"gap":m?,
   "offset_r":m?,"offset_f":m?,"x":n?,"z":n?,"on":id?,"face":id?,"turn":deg?,"height":m?}
   add or re-place one piece; kit: deck rail mast wall barrel crate chest cannon table cart stool figure marker;
   rel near|behind|in_front|left_of|right_of (in the OTHER piece's own frame) of an id, or between "of" and "and";
   x,z instead of rel = an exact spot; on = stand on that piece; face = turn to look at a piece or marker.
   Every other piece stays where it is (a teacher's hand edits are kept).
- {"cmd":"pose","id":s,"name":stand|point|spyglass}
- {"cmd":"frame","shot":wide|three-quarter|front|profile|medium|close-up|over-shoulder|low|high,
   "subjects":[id...],"lens":mm?,"horizon":0..1?,"az":deg?,"align":center|left-third|right-third?}
   camera from the subjects; horizon = fraction down the frame (default 2/3, the lower third); az = degrees around
   the subjects from their front towards their right; align = where across the frame they sit
- {"cmd":"mode","name":clay|silhouette|off}        grey clay, black storyboard silhouettes, or the normal look
- {"cmd":"undo"}                                    undo the last change (yours or the teacher's)

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
                lo, hi = RANGES_BY_CMD.get((c['cmd'], name), RANGES.get(name, (-1e4, 1e4)))
                v = max(lo, min(hi, v))
            elif typ == 'strs':
                if not isinstance(v, list) or not v:
                    ok = False
                    continue
                v = [str(x)[:80] for x in v[:MAX_LIST]]
            else:
                v = str(v)[:80]
            allowed = ENUMS.get((c['cmd'], name), ENUMS.get(name) if name != 'name' else None)
            if allowed is not None and v not in allowed:
                ok = False
                continue
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
    'ask': {'type': 'array', 'items': _obj({'crew': {'type': 'string'}, 'question': {'type': 'string'},
                                            'ack': {'type': 'string'}}, ['crew', 'question', 'ack'])},
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


def voice_line(who):
    v = who.get('voice')
    return f"\nYour voice (always speak like this, in the client's language): {v}" if v else ''


def ack_examples():
    """Per asked-able member: their voice and sample 'on it' lines, so the router writes a fresh one in their style."""
    out = []
    for m in CREW['crew']:
        ex = ' / '.join(a for lang in ('nl', 'en') for a in (m.get('acks') or {}).get(lang, [])[:2])
        out.append(f"- {m['id']} ({m['name']}): {m.get('voice', '')} e.g. {m['name']} says: {ex}")
    return '\n'.join(out)


def router_prompt(assistant):
    return f"""{SHARED}

You are {assistant['name']}, the SET ASSISTANT ({assistant['pronoun']}). {assistant['backstory']}
The client talks to you. You do no specialist work and change nothing yourself: you decide which crew
member(s) to ask, and say so in one or two friendly sentences. Never promise a change you are not handing to
someone: anything on the stage (sky, light, time of day, look, objects, town) goes to set. The crew:
{roster(assistant)}
{voice_line(assistant)}

The "ack" of each ask is a fresh line in the voice of the member you ask, never a generic one. Their voices:
{ack_examples()}

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
Answer ONLY with JSON: {{"reply": "<what you tell the client>", "ask": [{{"crew": "<id>", "question": "<what you ask them, with the client's context>", "ack": "<that member's one-line 'on it' bubble>"}}]}}
"ack" is written in THAT member's own voice, first person, in the client's language, at most 12 words, and says
what they are about to do (e.g. "Ik zoek de data even op."). "ask" is [] when you ask no one.{tasks_and_skills(CREW.get('assistant_tasks'), [])}"""


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

You are {m['name']}, the {m['role'].lower()}. {m['backstory']}{voice_line(m)}
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


UNTITLED = 'Untitled lesson'
TITLE_WORDS = ('titel', 'title', 'titre', 'titolo', 'naam van de les')


def title_open(data: dict) -> bool:
    """The writer names the lesson once; after that only when the client asks (enforced, not prompted)."""
    lesson = data.get('lesson') if isinstance(data.get('lesson'), dict) else {}
    said = str(data.get('message', '')).lower()
    return str(lesson.get('title', UNTITLED)).strip() in ('', UNTITLED) or any(w in said for w in TITLE_WORDS)


def member_request(m, assistant, question, data, direct):
    """(system prompt, user prompt, schema) for one member's call."""
    # the client's own words travel with the question: a summary loses facts (the class age, for one)
    said = str(data.get('message', ''))[:MAX_PROMPT]
    return (member_prompt(m, assistant, direct),
            context(data) + f"\n\nThe client just said: {said}\nRequest to you: {question[:MAX_PROMPT]}",
            member_schema(m, direct))


def finish_member(m, answer, data, direct):
    """The member's raw structured answer -> the guarded message (title, settings, commands)."""
    msg = {'who': m['id'], 'text': str(answer.get('reply', ''))[:MAX_REPLY]}
    title = str(answer.get('title') or '').strip()[:80]
    if title and m['id'] == 'writer' and title_open(data):
        msg['title'] = title
    if may_change(m, direct):
        commands, dropped = validate(answer.get('commands') or [])
        msg['settings'] = clean_settings(answer.get('settings'), data.get('settings'))
        msg['commands'] = commands
        msg['dropped'] = len(dropped)
    return msg


def grade_member(m, msg, data, assistant, emit=None):
    """JEV grade, and the director's second opinion when unsure. Adds jev/review to msg; emit gets events."""
    if not (JEV_ON and m['id'] in JEV_IDS and msg['text'].strip()):
        return
    grade = jev_grade(m, msg['text'], data)
    if not grade:
        return
    msg['jev'] = grade
    if emit:
        emit({'type': 'jev', 'who': m['id'], **grade})
    if grade['score'] < JEV_MIN_SCORE:
        try:
            msg['review'] = {'who': DIRECTOR, 'text': director_review(msg['text'], m['name'], data, assistant)}
            if emit:
                emit({'type': 'review', 'who': m['id'], 'text': msg['review']['text']})
        except Exception as e:  # noqa: BLE001 - the answer stands without its second opinion
            print('director review failed:', repr(e), file=sys.stderr)


def ask_member(m, assistant, question, data, direct=False):
    system, user, schema = member_request(m, assistant, question, data, direct)
    msg = finish_member(m, ask_claude(m['model'], system, user, schema, MEMBER_EFFORT), data, direct)
    grade_member(m, msg, data, assistant)
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


# ---------- live streaming: POST /crew/stream, POST /crew/stop (docs/crew-stream.md) ----------
class ReplyExtractor:
    """Pulls the value of the "reply" string out of JSON that arrives in arbitrary chunks, and returns
    only the characters that are new. Tolerant: ignores anything before the key, waits on a split escape."""
    _KEY = re.compile(r'"reply"\s*:\s*"')
    _SIMPLE = {'n': '\n', 't': '\t', 'r': '\r', 'b': '\b', 'f': '\f', '/': '/', '"': '"', '\\': '\\'}

    def __init__(self):
        self.buf, self.pos, self.state = '', 0, 'seek'   # seek -> in -> done

    def feed(self, chunk):
        self.buf += chunk
        if self.state == 'seek':
            m = self._KEY.search(self.buf)
            if not m:
                return ''
            self.pos, self.state = m.end(), 'in'
        if self.state != 'in':
            return ''
        out, b = [], self.buf
        while self.pos < len(b):
            c = b[self.pos]
            if c == '"':
                self.state = 'done'
                break
            if c != '\\':
                out.append(c)
                self.pos += 1
                continue
            if self.pos + 1 >= len(b):
                break                                    # split right after the backslash
            e = b[self.pos + 1]
            if e == 'u':
                if self.pos + 6 > len(b):
                    break
                try:
                    cp = int(b[self.pos + 2:self.pos + 6], 16)
                except ValueError:
                    cp = 0xFFFD
                step = 6
                if 0xD800 <= cp < 0xDC00:                # a surrogate pair needs its second half
                    if self.pos + 12 > len(b):
                        break
                    try:
                        lo = int(b[self.pos + 8:self.pos + 12], 16)
                        cp, step = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00), 12
                    except ValueError:
                        cp = 0xFFFD
                out.append(chr(cp) if cp < 0x110000 else '\ufffd')
                self.pos += step
            else:
                out.append(self._SIMPLE.get(e, e))
                self.pos += 2
        return ''.join(out)


class TurnState:
    """One /crew/stream turn: its claude processes, and who the client has stopped."""
    def __init__(self):
        self.lock = threading.Lock()
        self.procs, self.stopped, self.all_stopped = {}, set(), False

    def is_stopped(self, who):
        return self.all_stopped or who in self.stopped

    def register(self, who, proc):
        with self.lock:
            self.procs[who] = proc
            if self.is_stopped(who):
                kill_proc(proc)

    def stop(self, who=None):
        with self.lock:
            if who is None:
                self.all_stopped = True
            else:
                self.stopped.add(who)
            hit = [w for w in self.procs if who in (None, w) and self.procs[w].poll() is None]
            for w in hit:
                kill_proc(self.procs[w])
        return hit


TURNS: dict = {}
TURNS_LOCK = threading.Lock()


def kill_proc(proc):
    try:
        os.killpg(proc.pid, signal.SIGKILL)   # claude runs in its own session: take its children too
    except (ProcessLookupError, PermissionError):
        pass


def stream_claude(m, system, user, schema, effort, who, state, emit):
    """Run one member's claude call, emitting thinking/text events as they arrive.
    Returns the structured answer, or None when the client stopped it."""
    cmd = [CLAUDE_BIN, '-p', '--model', m['model'], '--system-prompt', system, '--tools', '',
           '--setting-sources', '', '--strict-mcp-config', '--no-session-persistence',
           '--effort', effort, '--output-format', 'stream-json', '--verbose', '--include-partial-messages',
           '--thinking-display', 'summarized', '--json-schema', json.dumps(schema)]
    env = {k: v for k, v in os.environ.items() if k != 'ANTHROPIC_API_KEY'}
    with tempfile.TemporaryDirectory() as cwd:
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                text=True, env=env, cwd=cwd, start_new_session=True)
        state.register(who, proc)
        timer = threading.Timer(CLAUDE_TIMEOUT, kill_proc, [proc])
        timer.start()
        try:
            try:
                proc.stdin.write(user)
                proc.stdin.close()
            except BrokenPipeError:
                pass
            ext, streamed, result = ReplyExtractor(), '', None
            for line in proc.stdout:
                try:
                    o = json.loads(line)
                except ValueError:
                    continue
                if o.get('type') == 'result':
                    result = o
                elif o.get('type') == 'stream_event':
                    d = (o.get('event') or {}).get('delta') or {}
                    if d.get('type') == 'thinking_delta' and d.get('thinking'):
                        emit({'type': 'thinking', 'who': who, 'text': d['thinking']})
                    elif d.get('type') in ('input_json_delta', 'text_delta'):
                        new = ext.feed(d.get('partial_json') if d['type'] == 'input_json_delta' else d.get('text', ''))
                        if new:
                            streamed += new
                            emit({'type': 'text', 'who': who, 'text': new})
            proc.wait()
        finally:
            timer.cancel()
            kill_proc(proc)
    if state.is_stopped(who):
        return None
    if result is None or result.get('is_error'):
        raise RuntimeError(f'claude failed (exit {proc.returncode}): {str((result or {}).get("result"))[:200]}')
    answer = result['structured_output'] if isinstance(result.get('structured_output'), dict) else json.loads(result['result'])
    final = str(answer.get('reply', ''))
    if final.startswith(streamed) and len(final) > len(streamed):   # the scanner missed a tail: send it
        emit({'type': 'text', 'who': who, 'text': final[len(streamed):]})
    return answer


def stream_member(m, assistant, question, data, direct, state, emit):
    who = m['id']
    try:
        if state.is_stopped(who):
            return emit({'type': 'stopped', 'who': who})
        emit({'type': 'start', 'who': who})
        system, user, schema = member_request(m, assistant, question, data, direct)
        answer = stream_claude(m, system, user, schema, MEMBER_EFFORT, who, state, emit)
        if answer is None:
            return emit({'type': 'stopped', 'who': who})
        msg = finish_member(m, answer, data, direct)
        grade_member(m, msg, data, assistant, emit)
        if state.is_stopped(who):
            return emit({'type': 'stopped', 'who': who})
        emit({'type': 'message', **msg})
    except Exception as e:  # noqa: BLE001 - one member failing never ends the turn
        print('crew member failed:', who, repr(e), file=sys.stderr)
        emit({'type': 'error', 'who': who, 'error': 'could not answer this time, ask again'})


DUTCH = re.compile(r'\b(de|het|een|en|ik|je|wat|wanneer|waarom|hoe|maak|kun|kan|dit|dat|niet|voor|met|van)\b', re.I)
GERMAN = re.compile(r'\b(der|die|das|und|ich|nicht|wann|warum|wie|ein|eine|mit|von|f\u00fcr|ist)\b', re.I)


def guess_lang(message):
    nl, de = len(DUTCH.findall(message)), len(GERMAN.findall(message))
    return 'de' if de > nl else 'nl' if nl else 'en'


def direct_ack(m, message):
    """One of the member's own 'on it' lines in the client's language (nl/en/de, else en), varied."""
    acks = m.get('acks') or {}
    pool = acks.get(guess_lang(message)) or acks.get('en') or ['On it.']
    return random.choice(pool)


def with_partial(message, to, partial):
    """The interrupted member gets its own draft back with the client's new words."""
    if isinstance(partial, dict) and partial.get('who') == to and str(partial.get('text', '')).strip():
        return (f"You were interrupted by the client. Your draft so far: {str(partial['text'])[:MAX_REPLY]}. "
                f"The client now says: {message}. Continue or change course as they ask.")[:MAX_PROMPT + MAX_REPLY + 200]
    return message


def crew_stream(data, emit, state):
    message = str(data.get('message', ''))[:MAX_PROMPT].strip()
    assistant = CREW['assistants'].get(str(data.get('assistant'))) or next(iter(CREW['assistants'].values()))
    to = data.get('to')
    if isinstance(to, str) and to in MEMBERS:
        emit({'type': 'routed', 'who': to, 'ack': direct_ack(MEMBERS[to], message)})
        question = with_partial(message, to, data.get('partial'))
        return stream_member(MEMBERS[to], assistant, question, data, True, state, emit)
    plan = ask_claude(ROUTER_MODEL, router_prompt(assistant), context(data) + '\n\nClient: ' + message,
                      ROUTER_SCHEMA, ROUTER_EFFORT)
    emit({'type': 'assistant', 'as': assistant['name'], 'text': str(plan.get('reply', ''))[:800]})
    asks = plan.get('ask') if isinstance(plan.get('ask'), list) else []
    asks = [a for a in asks if isinstance(a, dict) and isinstance(a.get('crew'), str) and a['crew'] in MEMBERS][:MAX_ASKS]
    for a in asks:
        emit({'type': 'routed', 'who': a['crew'], 'ack': str(a.get('ack') or direct_ack(MEMBERS[a['crew']], message))[:200]})
    if asks:
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_ASKS) as pool:
            for f in [pool.submit(stream_member, MEMBERS[a['crew']], assistant, str(a.get('question') or message),
                                  data, False, state, emit) for a in asks]:
                f.result()


LINK = None   # the blockout channel (blockout_link.py), made once validate() exists


def blockout_link():
    global LINK
    if LINK is None:
        import blockout_link as bl
        LINK = bl.Link(validate)
    return LINK


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

    def _body(self):
        """The parsed JSON object, or None after answering the error."""
        length = int(self.headers.get('Content-Length', 0))
        if length > MAX_BODY:
            self._json(413, {'error': 'Too much to send at once.'})
            return None
        try:
            data = json.loads(self.rfile.read(length) or b'{}')
        except ValueError:
            data = None
        if not isinstance(data, dict):
            self._json(400, {'error': 'The request was not readable.'})
            return None
        return data

    def do_GET(self):
        if self.path.startswith('/blockout/poll'):          # the open studio page waits here for the next job
            job = blockout_link().poll()
            if job is None:
                self.send_response(204)
                self.end_headers()
                return None
            return self._json(200, job)
        if self.path.startswith('/blockout/status'):
            return self._json(200, {'page': blockout_link().page_connected()})
        return super().do_GET()

    def do_POST(self):
        if self.path in ('/blockout/call', '/blockout/result', '/blockout/ack'):
            data = self._body()
            if data is None:
                return None
            if self.path == '/blockout/ack':                # the page has the job (else it is re-sent)
                return self._json(200, {'acked': blockout_link().ack(data.get('id'))})
            if self.path == '/blockout/call':               # an MCP tool: one op on the open page, its answer back
                return self._json(200, blockout_link().call(str(data.get('op', '')), data.get('args') or {}))
            ok = blockout_link().result(data.get('id'), {k: data.get(k) for k in ('ok', 'result', 'error')})
            return self._json(200 if ok else 410, {'taken': ok})
        if self.path.startswith('/bake'):
            return self._save_bake()
        if self.path == '/crew/stop':
            return self._stop()
        if self.path not in ('/crew', '/crew/stream'):
            return self._json(404, {'error': 'not found'})
        try:
            data = self._body()
            if data is None:
                return
            if not str(data.get('message', '')).strip():
                return self._json(422, {'error': 'Type a message.'})
            if self.path == '/crew/stream':
                return self._stream(data)
            return self._json(200, {'messages': crew_turn(data), 'model': ROUTER_MODEL})
        except Exception as e:  # noqa: BLE001 - report every failure to the editor, log the detail
            print('crew failed:', repr(e), file=sys.stderr)
            return self._json(500, {'error': 'The crew could not answer: ' + type(e).__name__})

    def _stop(self):
        data = self._body()
        if data is None:
            return
        with TURNS_LOCK:
            state = TURNS.get(str(data.get('turn')))
        if not state:
            return self._json(404, {'error': 'unknown turn'})
        who = data.get('who')
        return self._json(200, {'stopped': state.stop(who if isinstance(who, str) else None)})

    def _stream(self, data):
        turn, state, lock = uuid.uuid4().hex[:8], TurnState(), threading.Lock()
        with TURNS_LOCK:
            TURNS[turn] = state
        self.send_response(200)
        self.send_header('Content-Type', 'application/x-ndjson')
        self.end_headers()
        gone = []

        def emit(ev):
            if gone:
                return
            line = (json.dumps({**ev, 'turn': turn}) + '\n').encode()
            with lock:
                try:
                    self.wfile.write(line)
                    self.wfile.flush()
                except OSError:      # the client left: stop paying for answers nobody reads
                    gone.append(1)
                    state.stop()
        try:
            emit({'type': 'turn'})
            crew_stream(data, emit, state)
        except Exception as e:  # noqa: BLE001
            print('crew stream failed:', repr(e), file=sys.stderr)
            emit({'type': 'error', 'error': 'The crew could not answer: ' + type(e).__name__})
        finally:
            emit({'type': 'done'})
            with TURNS_LOCK:
                TURNS.pop(turn, None)
            self.close_connection = True


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
