// The open studio page answers the MCP blockout tools (clay-blockout Gate 2). It waits on server.py's long poll
// (/blockout/poll), runs each job on THIS page, the one the teacher sees, and posts the answer (/blockout/result).
// Every job was validated by server.py first; here it only runs. No server (the studio alone): it backs off quietly.
'use strict';

const RETRY_MS = [1000, 2000, 5000, 15000, 30000];   // back-off while server.py is not there

(() => {
  const mvp = window.__mvp;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // one AI request = one step in the undo history (a group of ops), undone as one, or op by op
  async function run(job) {
    const bo = mvp.blockout;
    if (!['apply', 'command', 'frame'].includes(job.op)) return runOne(job);
    bo.begin('AI ' + job.op, 'ai');
    try { return await runOne(job); } finally { bo.end(); }
  }

  async function runOne(job) {
    const bo = mvp.blockout;
    const a = job.args || {};
    switch (job.op) {
      case 'apply': {
        if (a.mode) bo.mode(a.mode);
        const doc = { objects: a.objects.map(bo.specFromCommand), camera: a.camera ? bo.shotFromCommand(a.camera) : undefined };
        const r = await bo.apply(doc);
        return { revision: bo.revision(), readback: r.text, problems: r.problems };
      }
      case 'command': {
        const done = await window.__animator.run(a.commands);
        const r = bo.read();
        return { revision: bo.revision(), done, readback: r.text, problems: r.problems };
      }
      case 'frame': {
        const r = bo.frame(bo.shotFromCommand(a));
        return { revision: bo.revision(), readback: r.text, problems: r.problems };
      }
      case 'read': {
        const r = bo.read();
        return { revision: bo.revision(), readback: r.text, problems: r.problems };
      }
      case 'snapshot': return bo.snapshot({ size: a.size, pass: a.pass });
      case 'kit_list': return bo.kitList();
      default: throw new Error('unknown op ' + job.op);
    }
  }

  async function loop() {
    let fails = 0;
    for (;;) {
      try {
        if (!window.__blockoutLinked) {        // reached server.py at least once (tests wait for this, not a stale status)
          const st = await fetch('/blockout/status', { cache: 'no-store' });
          if (!st.ok) throw new Error('status ' + st.status);
          window.__blockoutLinked = true;
        }
        const res = await fetch('/blockout/poll', { cache: 'no-store' });
        if (res.status === 204) { fails = 0; continue; }
        if (!res.ok) throw new Error('poll ' + res.status);
        fails = 0;
        const job = await res.json();
        // at once: a job handed to a poll whose page had closed is re-sent when no ack comes
        fetch('/blockout/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id }) }).catch(() => {});
        let answer;
        try { answer = { ok: true, result: await run(job) }; } catch (e) { answer = { ok: false, error: e.message }; }
        await fetch('/blockout/result', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: job.id, ...answer }) });
      } catch {
        await sleep(RETRY_MS[Math.min(fails++, RETRY_MS.length - 1)]);
      }
    }
  }

  mvp.scene.executeWhenReady(() => { loop(); });
})();
