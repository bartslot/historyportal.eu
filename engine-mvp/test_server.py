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
