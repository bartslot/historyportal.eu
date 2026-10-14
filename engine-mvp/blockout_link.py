"""The live channel between the MCP blockout tools and the studio page the teacher has open (clay-blockout Gate 2).

    MCP tool --POST /blockout/call--> server.py --(job)--> the open page, which waits on GET /blockout/poll
                                      server.py <--POST /blockout/ack---- the page, the moment it has the job
                                      server.py <--POST /blockout/result-- the page (readback text, a snapshot)

A long poll, not a WebSocket: server.py is the standard library's ThreadingHTTPServer, and a waiting GET hands a job
to the page the moment it is queued (push latency, no second protocol, no dependency). Every op is checked by
server.py's own validate() (the COMMANDS whitelist): this module has no rules of its own.
"""
import itertools
import queue
import threading
import time

POLL_WAIT_S = 25            # a page's poll waits this long for a job, then asks again
CALL_WAIT_S = 30            # a tool waits this long for the page's answer
PAGE_GONE_S = POLL_WAIT_S + 10   # no poll for this long: no page is listening
OPS = {'apply', 'command', 'frame', 'read', 'snapshot', 'kit_list'}
SNAPSHOT_SIZES = (128, 1024)
PASSES = {'clay', 'silhouette', 'id'}
ACK_WAIT_S = 2              # a job handed to a poll but not acknowledged by now goes back in the queue (its page is gone)


class Link:
    def __init__(self, validate):
        self.validate = validate          # server.py's: the one whitelist for model output
        self.jobs = queue.Queue()
        self.waiting = {}                 # job id -> [event, answer]
        self.ids = itertools.count(1)
        self.last_poll = 0.0
        self.lock = threading.Lock()
        self.handed = {}                  # job id -> (job, when): given to a poll, not yet acknowledged by its page

    def page_connected(self):
        return time.monotonic() - self.last_poll < PAGE_GONE_S

    # ---------- the MCP side ----------
    def clean(self, op, args):
        """(job args, what was dropped) or raise ValueError. Objects and the camera go through validate()."""
        if op not in OPS:
            raise ValueError(f'unknown op {op!r}; one of {sorted(OPS)}')
        args = args if isinstance(args, dict) else {}
        if op == 'apply':
            objects = args.get('objects') or []
            if not isinstance(objects, list) or not objects:
                raise ValueError('apply needs "objects": a list of place commands')
            ok, dropped = self.validate([{**o, 'cmd': 'place'} for o in objects if isinstance(o, dict)])
            out = {'objects': ok}
            if args.get('camera') is not None:
                cam, bad = self.validate([{**args['camera'], 'cmd': 'frame'}] if isinstance(args['camera'], dict) else [args['camera']])
                out['camera'] = cam[0] if cam else None
                dropped += bad
            if args.get('mode') is not None:
                mode, bad = self.validate([{'cmd': 'mode', 'name': args['mode']}])
                out['mode'] = mode[0]['name'] if mode else None
                dropped += bad
            return out, dropped
        if op == 'command':
            ok, dropped = self.validate(args.get('commands') or [])
            if not ok:
                raise ValueError('no valid command in the list: ' + repr(dropped)[:300])
            return {'commands': ok}, dropped
        if op == 'frame':
            ok, dropped = self.validate([{**args, 'cmd': 'frame'}])
            if not ok:
                raise ValueError('not a valid frame: ' + repr(dropped)[:300])
            return ok[0], dropped
        if op == 'snapshot':
            size = int(args.get('size') or 512)
            size = max(SNAPSHOT_SIZES[0], min(SNAPSHOT_SIZES[1], size))
            pas = args.get('pass') or 'clay'
            if pas not in PASSES:
                raise ValueError(f'pass must be one of {sorted(PASSES)}')
            return {'size': size, 'pass': pas}, []
        return {}, []

    def call(self, op, args):
        """Run one op on the open page and wait for its answer: {'ok', 'result' | 'error', 'dropped'}."""
        try:
            clean, dropped = self.clean(op, args)
        except ValueError as e:
            return {'ok': False, 'error': str(e)}
        if not self.page_connected():
            return {'ok': False, 'error': 'no studio page is open (open the studio; it connects by itself)'}
        job_id = next(self.ids)
        done = threading.Event()
        with self.lock:
            self.waiting[job_id] = [done, None]
        self.jobs.put({'id': job_id, 'op': op, 'args': clean})
        if not done.wait(CALL_WAIT_S):
            with self.lock:
                self.waiting.pop(job_id, None)
            return {'ok': False, 'error': f'the studio page did not answer within {CALL_WAIT_S} s'}
        with self.lock:
            answer = self.waiting.pop(job_id)[1]
        answer = dict(answer or {'ok': False, 'error': 'empty answer'})
        if dropped:
            answer['dropped'] = dropped
        return answer

    # ---------- the page side ----------
    def poll(self):
        """The next job for the page, or None after POLL_WAIT_S. A job whose tool gave up is dropped, never run late."""
        self.last_poll = time.monotonic()
        deadline = self.last_poll + POLL_WAIT_S
        self.requeue_unacked()
        try:
            while True:
                left = deadline - time.monotonic()
                if left <= 0:
                    return None
                try:
                    job = self.jobs.get(timeout=left)
                except queue.Empty:
                    return None
                with self.lock:
                    if job['id'] in self.waiting:
                        self.handed[job['id']] = (job, time.monotonic())
                        return job
        finally:
            self.last_poll = time.monotonic()

    def ack(self, job_id):
        """The page has the job: a long poll whose browser had closed never acknowledges, and its job is re-sent."""
        with self.lock:
            return self.handed.pop(job_id, None) is not None

    def requeue_unacked(self):
        now = time.monotonic()
        with self.lock:
            stale = [jid for jid, (_, t) in self.handed.items() if now - t > ACK_WAIT_S]
            for jid in stale:
                job, _ = self.handed.pop(jid)
                if jid in self.waiting:
                    self.jobs.put(job)

    def result(self, job_id, answer):
        with self.lock:
            slot = self.waiting.get(job_id)
            if not slot:
                return False                  # the tool gave up already
            slot[1] = answer
            slot[0].set()
        return True
