"""Model output is untrusted: these guards decide what the browser may run. `python3 test_server.py`
(needs the History Portal .env, like server.py)."""
import server as s

assert s.validate({'cmd': 'add'}) == ([], [{'cmd': 'add'}]), 'a non-list of commands is dropped whole'
offered = [{'id': 'lookInk', 'type': 'range', 'min': 0, 'max': 1.5}]
assert s.clean_settings([{'id': ['x'], 'value': 1}, {'id': 'lookInk', 'value': 9}], offered) == [{'id': 'lookInk', 'value': 1.5}]
assert s.clean_settings('junk', None) == []
assert s.may_change(s.MEMBERS['set'], False), 'the set designer owns the stage'
assert not s.may_change(s.MEMBERS['writer'], False), 'the writer changes nothing unless asked directly'
assert s.may_change(s.MEMBERS['writer'], True)
assert not s.may_change(s.MEMBERS['director'], True), 'the director only reviews'
# clay blockout commands: enums, lists and per-command ranges
clean, dropped = s.validate([
    {'cmd': 'place', 'id': 'tasman', 'kit': 'figure', 'rel': 'near', 'of': 'rail', 'gap': 99, 'height': 9},
    {'cmd': 'place', 'id': 'x', 'kit': 'dragon'},
    {'cmd': 'place', 'id': 'y', 'rel': 'inside', 'of': 'rail'},
    {'cmd': 'pose', 'id': 'tasman', 'name': 'spyglass'},
    {'cmd': 'pose', 'id': 'tasman', 'name': 'backflip'},
    {'cmd': 'frame', 'shot': 'three-quarter', 'subjects': ['tasman', 'visscher'], 'horizon': 2},
    {'cmd': 'frame', 'shot': 'wide', 'subjects': 'tasman'},
    {'cmd': 'mode', 'name': 'silhouette'},
    {'cmd': 'undo'},
])
assert [c['cmd'] for c in clean] == ['place', 'pose', 'frame', 'mode', 'undo'], clean
assert clean[0]['gap'] == 5 and clean[0]['height'] == 4, 'gap clamped to 5 m, a piece height to 4 m (not camera degrees)'
assert clean[2]['horizon'] == 0.95 and clean[2]['subjects'] == ['tasman', 'visscher']
assert len(dropped) == 4, dropped
print('server guards ok')

# ---- claude CLI, schemas, skills, JEV: all offline ----
import os
import pathlib
import stat
import tempfile


def strict(sch):
    assert sch['additionalProperties'] is False and set(sch['required']) <= set(sch['properties'])
    for p in sch['properties'].values():
        if p.get('type') == 'object' and 'properties' in p:
            strict(p)
        if p.get('type') == 'array' and p['items'].get('properties'):
            strict(p['items'])


for sch in (s.ROUTER_SCHEMA, s.STAGE_SCHEMA, s.STAGE_SCHEMA_NO_TITLE, s.TALK_SCHEMA, s.TALK_SCHEMA_WRITER):
    strict(sch)
assert 'title' not in s.member_schema(s.MEMBERS['set'], False)['properties']
assert 'title' in s.member_schema(s.MEMBERS['writer'], False)['properties']
assert 'settings' not in s.member_schema(s.MEMBERS['director'], True)['properties']

tmp = pathlib.Path(tempfile.mkdtemp())
(tmp / 'a.md').write_text('---\nname: x\n---\nHouse rule one.\n')
assert s.load_skill(str(tmp / 'a.md')) == 'House rule one.', 'frontmatter is stripped'
assert s.load_skill(str(tmp / 'missing.md')) == '', 'a missing skill file is skipped, never fatal'
packed = s.tasks_and_skills(['do a', 'do b'], [str(tmp / 'a.md'), str(tmp / 'missing.md')])
assert '- do a' in packed and 'Your skill pack (house rules; follow them):' in packed and 'House rule one.' in packed
hist = s.MEMBERS['historian']
assert '- ' + hist['tasks'][0] in s.member_prompt(hist, next(iter(s.CREW['assistants'].values())))
assert '- ' + s.CREW['assistant_tasks'][0] in s.router_prompt(next(iter(s.CREW['assistants'].values())))

assert s.jev_score({'answers': {'sound': {'choice': 'unsound', 'probabilities': {'sound': 0.123, 'unsound': 0.877}}}}) \
    == {'score': 0.12, 'choice': 'unsound'}
assert s.jev_score({'answers': {}}) is None

fake = tmp / 'fakeclaude'   # a claude that fails, then one that answers
fake.write_text('#!/bin/sh\necho "[claude-code:unrecognized_model]" >&2\necho \'{"is_error":true,"result":"boom"}\'\nexit 1\n')
fake.chmod(fake.stat().st_mode | stat.S_IEXEC)
s.CLAUDE_BIN = str(fake)
try:
    s.ask_claude('m', 'sys', 'hi', s.TALK_SCHEMA, 'low')
    raise AssertionError('a failing claude must raise')
except RuntimeError as e:
    assert 'boom' in str(e)
fake.write_text('#!/bin/sh\necho \'{"is_error":false,"result":"{}","structured_output":{"reply":"ok"}}\'\n')
assert s.ask_claude('m', 'sys', 'hi', s.TALK_SCHEMA, 'low') == {'reply': 'ok'}
print('crew offline checks ok')

assert s.title_open({'lesson': {'title': 'Untitled lesson'}, 'message': 'hoi'}), 'an untitled lesson gets its name'
assert not s.title_open({'lesson': {'title': 'De Gouden Eeuw'}, 'message': 'maak het dag'}), 'a named lesson keeps it'
assert s.title_open({'lesson': {'title': 'De Gouden Eeuw'}, 'message': 'Bedenk een betere titel'})
print('title rule ok')

# ---- live streaming: extractor, event order, stop (offline, fake claude) ----
import http.client
import json
import threading
import time
from http.server import ThreadingHTTPServer

full = '{"reply": "Hal\\"lo\\nw\\u00e8reld \\ud83d\\ude00 ok", "settings": []}'
want = 'Hal"lo\nwèreld \U0001F600 ok'
for size in (1, 2, 3, 5, 7, 1000):    # every split point, incl. inside \" \n è and the surrogate pair
    ex, got = s.ReplyExtractor(), ''
    for i in range(0, len(full), size):
        got += ex.feed(full[i:i + size])
    assert got == want, (size, got)
assert s.ReplyExtractor().feed('{"other": "x"}') == '', 'no reply key, nothing out'
print('reply extractor ok')

ack = s.MEMBERS['historian']['acks']
assert s.direct_ack(s.MEMBERS['historian'], 'Ruth, wanneer schilderde Rembrandt dit?') in ack['nl']
assert s.direct_ack(s.MEMBERS['historian'], 'When did he paint it?') in ack['en']
assert s.direct_ack(s.MEMBERS['historian'], 'Wann hat er das gemalt und warum?') in ack['de']
assert 'Your voice' in s.member_prompt(s.MEMBERS['historian'], next(iter(s.CREW['assistants'].values())))
print('direct ack ok')

slow = tmp / 'slowclaude'   # stream-json: a thinking delta, split reply deltas, a result; FAKE_SLEEP between lines
slow.write_text('''#!/usr/bin/env python3
import sys, json, time, os
sys.stdin.read()
a = sys.argv
pause = float(os.environ.get('FAKE_SLEEP', '0.3'))
def out(o):
    print(json.dumps(o), flush=True)
def d(delta):
    out({"type": "stream_event", "event": {"type": "content_block_delta", "index": 0, "delta": delta}})
if "stream-json" not in a:
    out({"is_error": False, "result": "{}", "structured_output": {"reply": "Zo.", "ask": [
        {"crew": "historian", "question": "q", "ack": "Ik zoek de data even op."}]}}); sys.exit()
out({"type": "system", "subtype": "init"})
d({"type": "thinking_delta", "thinking": "Hmm, 1642."}); time.sleep(pause)
for p in ['{"reply": "Rem', 'brandt schil', 'derde het in 16', '42."}']:
    d({"type": "input_json_delta", "partial_json": p}); time.sleep(pause)
out({"type": "result", "subtype": "success", "is_error": False, "result": "{}",
     "structured_output": {"reply": "Rembrandt schilderde het in 1642.", "settings": [], "commands": []}})
''')
slow.chmod(slow.stat().st_mode | stat.S_IEXEC)
s.CLAUDE_BIN, s.JEV_ON = str(slow), False
srv = ThreadingHTTPServer(('127.0.0.1', 0), s.Handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
PORT = srv.server_address[1]


def post(path, body):
    c = http.client.HTTPConnection('127.0.0.1', PORT)
    c.request('POST', path, json.dumps(body), {'Content-Type': 'application/json'})
    return c, c.getresponse()


def events(resp):
    for line in resp:
        yield json.loads(line)


body = {'message': 'Ruth, wanneer schilderde Rembrandt dit?', 'to': 'historian', 'settings': []}
c, r = post('/crew/stream', body)
assert r.getheader('Content-Type') == 'application/x-ndjson'
evs = list(events(r))
types = [e['type'] for e in evs]
assert types[:3] == ['turn', 'routed', 'start'] and types[-2:] == ['message', 'done'], types
assert 'thinking' in types and types.count('text') >= 3, types
assert ''.join(e['text'] for e in evs if e['type'] == 'text') == 'Rembrandt schilderde het in 1642.'
assert len({e['turn'] for e in evs}) == 1
print('stream event order ok:', types)

c, r = post('/crew/stream', {**body, 'to': None, 'message': 'Wanneer schilderde Rembrandt dit?'})   # via the router
evs = list(events(r))
types = [e['type'] for e in evs]
assert types[:3] == ['turn', 'assistant', 'routed'] and evs[2]['ack'] == 'Ik zoek de data even op.', types
assert types.index('routed') < types.index('start') and types[-2:] == ['message', 'done'], types
print('routed ack order ok')

os.environ['FAKE_SLEEP'] = '1'   # stop: kill the slow member mid-way, no message may follow
c, r = post('/crew/stream', body)
turn = json.loads(r.readline())['turn']
seen = [json.loads(r.readline())['type'] for _ in range(3)]
c2, r2 = post('/crew/stop', {'turn': turn, 'who': 'historian'})
assert json.loads(r2.read()) == {'stopped': ['historian']}
rest = [e['type'] for e in events(r)]
assert 'stopped' in rest and 'message' not in rest and rest[-1] == 'done', rest
c3, r3 = post('/crew/stop', {'turn': 'nope'})
assert r3.status == 404
srv.shutdown()
print('stop ok:', seen + rest)
