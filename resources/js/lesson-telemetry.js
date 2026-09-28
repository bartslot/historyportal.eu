/**
 * lesson-telemetry.js — anonymous player telemetry for the Phase 0 experiment.
 *
 * PRIVACY CONTRACT (mirrors the lesson_telemetry_events migration):
 *  - The session id is a fresh UUID per PAGE LOAD, held in memory only. It is never written
 *    to localStorage/cookies, so there is no cross-session tracking and nothing to clear.
 *  - Events carry playback facts only: event name, scene index/id, playback position, client
 *    time. No names, no accounts, no device data. Do not add any.
 *
 * Delivery is batched (5s interval or 20 events) via fetch, with sendBeacon on pagehide so
 * the exit event survives the tab closing. Telemetry must never break playback: every path
 * swallows its own errors, and a missing lesson code disables the whole module.
 */

const FLUSH_INTERVAL_MS = 5000
const FLUSH_AT = 20
const MAX_QUEUE = 200 // hard cap — a wedged endpoint must not grow memory forever

export function createTelemetry (lessonCode) {
  const disabled = !lessonCode || typeof fetch === 'undefined'
  const sessionUuid = (() => {
    try { return crypto.randomUUID() } catch (_) { return null }
  })()
  if (disabled || !sessionUuid) {
    return { log: () => {}, flush: () => {} } // inert stub — callers never need to check
  }

  const endpoint = `/api/lesson/${encodeURIComponent(lessonCode)}/telemetry`
  let queue = []
  let timer = null

  const payload = () => JSON.stringify({ session_uuid: sessionUuid, events: queue.splice(0, FLUSH_AT * 2) })

  const flush = (useBeacon = false) => {
    if (!queue.length) return
    try {
      const body = payload()
      if (useBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
        return
      }
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    } catch (_) { /* telemetry never breaks playback */ }
  }

  const log = (event, data = {}) => {
    try {
      if (queue.length >= MAX_QUEUE) queue = queue.slice(-FLUSH_AT)
      queue.push({
        event,
        scene_index: Number.isFinite(data.sceneIndex) ? data.sceneIndex : null,
        scene_id: Number.isFinite(data.sceneId) ? data.sceneId : null,
        playback_position: Number.isFinite(data.position) ? Math.round(data.position * 100) / 100 : null,
        client_ts: Date.now(),
      })
      if (queue.length >= FLUSH_AT) flush()
      else if (!timer) timer = setInterval(() => flush(), FLUSH_INTERVAL_MS)
    } catch (_) { /* never throw into the player */ }
  }

  // The exit path: pagehide fires on tab close, navigation and (mobile) app switch.
  window.addEventListener('pagehide', () => flush(true))
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true)
  })

  return { log, flush }
}
