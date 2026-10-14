"""The blockout channel without a browser: python3 test_blockout_link.py"""
import threading
import time

import blockout_link as bl
import server as s

bl.CALL_WAIT_S = 1
link = bl.Link(s.validate)

# no page: a call says so at once
assert 'no studio page' in link.call('read', {})['error']

# a page that answers: the call gets its answer; the validator's drops travel with it
def page():
    job = link.poll()
    link.result(job['id'], {'ok': True, 'result': {'echo': job}})
link.last_poll = time.monotonic()
t = threading.Thread(target=page)
t.start()
out = link.call('command', {'commands': [{'cmd': 'pose', 'id': 'tasman', 'name': 'spyglass'}, {'cmd': 'pose', 'id': 'x', 'name': 'backflip'}]})
t.join()
assert out['ok'] and out['result']['echo']['args']['commands'] == [{'cmd': 'pose', 'id': 'tasman', 'name': 'spyglass'}], out
assert len(out['dropped']) == 1

# a job whose tool gave up is never run late by a page that polls afterwards
link.last_poll = time.monotonic()
late = link.call('read', {})
assert 'did not answer' in late['error']
bl.POLL_WAIT_S = 0.3
assert link.poll() is None, 'the stale job must be dropped'

# apply objects and the camera go through validate(); garbage is refused before any page sees it
cleaned, dropped = link.clean('apply', {'objects': [{'id': 'a', 'kit': 'figure'}, {'id': 'b', 'kit': 'dragon'}], 'camera': {'shot': 'nope', 'subjects': ['a']}})
assert [o['id'] for o in cleaned['objects']] == ['a'] and cleaned['camera'] is None and len(dropped) == 2
try:
    link.clean('rm -rf', {})
    raise AssertionError('unknown op accepted')
except ValueError:
    pass
# a poll whose page had closed takes a job and never acknowledges it: the job goes to the next poll
bl.POLL_WAIT_S = 2
bl.ACK_WAIT_S = 0.2
bl.CALL_WAIT_S = 3
link2 = bl.Link(s.validate)
link2.last_poll = time.monotonic()
got = {}
def ghost_then_page():
    link2.poll()                                   # the ghost: takes it, never acks
    time.sleep(0.3)
    job = link2.poll()                             # the real page
    link2.ack(job['id'])
    link2.result(job['id'], {'ok': True, 'result': 'from the real page'})
t2 = threading.Thread(target=ghost_then_page)
t2.start()
out2 = link2.call('read', {})
t2.join()
assert out2 == {'ok': True, 'result': 'from the real page'}, out2
print('blockout link ok')
