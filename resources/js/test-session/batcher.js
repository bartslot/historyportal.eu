/**
 * The test-session batcher: timeline events and rrweb events queue here and go to the server
 * every 5 seconds, early when the rrweb queue gets big, and as a sendBeacon when the page hides.
 *
 * Transport is injected (`post`, `beacon`) so the tests can run it without a network. A failed
 * post puts its events back at the front of the queue, so a dropped request delays data instead of
 * losing it; the queue is capped so a dead endpoint cannot grow memory forever.
 */

export const FLUSH_INTERVAL_MS = 5000
/** Flush early past this many rrweb events (a full snapshot is one event, but mutations add up). */
export const RRWEB_FLUSH_AT = 400
/** A sendBeacon body is limited to ~64 KB by browsers; above this the exit flush uses fetch. */
export const BEACON_MAX_BYTES = 60_000
const MAX_EVENTS = 2000
const MAX_RRWEB = 20_000

/**
 * @param {{
 *   post: (body: object) => Promise<boolean>,
 *   beacon: (json: string) => boolean,
 *   nextSeq: () => number,
 *   intervalMs?: number,
 *   setInterval?: typeof setInterval,
 *   clearInterval?: typeof clearInterval,
 * }} opts
 */
export function createBatcher (opts) {
  const every = opts.setInterval ?? setInterval
  const stopEvery = opts.clearInterval ?? clearInterval
  let events = []
  let rrweb = []
  let current = null // the post in flight
  let timer = null

  const take = () => {
    const body = { events, rrweb: rrweb.length ? { seq: opts.nextSeq(), events: rrweb } : null }
    events = []
    rrweb = []
    return body
  }

  const putBack = (body) => {
    events = body.events.concat(events).slice(-MAX_EVENTS)
    if (body.rrweb) rrweb = body.rrweb.events.concat(rrweb).slice(-MAX_RRWEB)
  }

  /** Sends what is queued; waits for (then follows) a post already in flight. */
  const flush = () => {
    if (current) return current.then(flush)
    if (!events.length && !rrweb.length) return Promise.resolve()
    const body = take()
    current = (async () => {
      try {
        if (!(await opts.post(body))) putBack(body)
      } catch (_) {
        putBack(body)
      }
    })().finally(() => { current = null })
    return current
  }

  /** The exit path: synchronous, no retry (the page is going away). */
  const flushOnHide = () => {
    if (!events.length && !rrweb.length) return
    const body = take()
    const json = JSON.stringify(body)
    if (json.length <= BEACON_MAX_BYTES && opts.beacon(json)) return
    // ponytail: a big exit batch (a fresh full snapshot) goes by plain fetch, which a closing tab
    // may cancel. Losing the last few seconds of DOM is acceptable; the timeline events are small.
    try { opts.post(body).catch(() => {}) } catch (_) { /* the page is closing */ }
  }

  return {
    event (e) {
      events.push(e)
      if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS)
    },
    rrweb (e) {
      rrweb.push(e)
      if (rrweb.length >= RRWEB_FLUSH_AT) flush()
    },
    start () {
      if (!timer) timer = every(flush, opts.intervalMs ?? FLUSH_INTERVAL_MS)
    },
    stop () {
      if (timer) stopEvery(timer)
      timer = null
    },
    flush,
    flushOnHide,
    /** For the tests. */
    pending: () => ({ events: events.length, rrweb: rrweb.length }),
  }
}
