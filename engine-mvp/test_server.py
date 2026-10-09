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
