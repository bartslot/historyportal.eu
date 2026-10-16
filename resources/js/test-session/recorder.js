/**
 * Live test sessions (P1): the opt-in recorder.
 *
 * Loaded only when a page has ?test=CODE or an ongoing session in sessionStorage (see app.js), so a
 * normal visit pays nothing. Flow: consent dialog → POST start → rrweb records the DOM (every
 * input masked, .hp-no-record blocked, .hp-mask text masked) while a compact timeline (clicks,
 * routes, errors, player scenes, viewport, rage/dead clicks) is batched to the server every 5 s
 * and on page hide. A small "Recording" pill with Stop stays on screen.
 *
 * Never records pupils: refused on the pupil race pages here, and refused server-side for a
 * signed-in student (TestSessionControlRequest / TestSessionBatchRequest).
 */
import { record } from 'rrweb'
import { createBatcher } from './batcher.js'
import { createDeadClickWatcher, createRageDetector, isReaction } from './detectors.js'
import { t } from '../i18n.js'
import { pendingCode, store } from './pending.js'

const PUPIL_PATHS = [/^\/race\//]
const TEXT_MAX = 60
const SPOT_CHECK_MS = 2000

const endpoint = (code, action) => `/test-sessions/${encodeURIComponent(code)}/${action}`

/** The current location without the ?test= parameter, for the timeline and the address bar. */
const cleanPath = () => {
  const url = new URL(location.href)
  url.searchParams.delete('test')
  return url.pathname + url.search
}

const stripParam = () => {
  if (!new URLSearchParams(location.search).has('test')) return
  try { history.replaceState(history.state, '', cleanPath() + location.hash) } catch (_) { /* ignore */ }
}

export async function boot () {
  const code = pendingCode()
  if (!code) return
  if (PUPIL_PATHS.some((re) => re.test(location.pathname))) { store.clear(); return }

  if (store.read()?.code !== code && !(await askConsent())) { stripParam(); return }

  let res
  try {
    res = await fetch(endpoint(code, 'start'), { method: 'POST', headers: { Accept: 'application/json' }, credentials: 'same-origin' })
  } catch (_) { return } // offline: try again on the next page load
  if (!res.ok) {
    store.clear()
    stripParam()
    notice(t('This test session has ended or does not exist.'))
    return
  }
  const { elapsed_ms: elapsed } = await res.json()
  store.write({ code, seq: store.read()?.seq ?? 0 })
  stripParam()
  run(code, Date.now() - elapsed)
}

// ── Consent ──────────────────────────────────────────────────────────────────

function askConsent () {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog')
    dialog.className = 'modal hp-no-record'
    dialog.innerHTML = `
      <div class="modal-box max-w-sm border border-base-300 bg-base-200 outline-none" tabindex="-1" autofocus>
        <button type="button" data-close class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"></button>
        <h3 class="text-lg font-semibold"></h3>
        <p class="py-3 text-sm"></p>
        <div class="modal-action">
          <button type="button" data-close class="btn btn-ghost btn-sm" data-no></button>
          <button type="button" class="btn btn-primary btn-sm" data-yes></button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button></button></form>`
    const [x, no] = dialog.querySelectorAll('[data-close]')
    x.setAttribute('aria-label', t('Close'))
    x.textContent = '✕'
    dialog.querySelector('h3').textContent = t('Test session')
    dialog.querySelector('p').textContent = t('This test is recorded: clicks and screen, no typing. Stop at any time.')
    no.textContent = t('Not now')
    dialog.querySelector('[data-yes]').textContent = t('Start recording')

    let answer = false
    dialog.querySelector('[data-yes]').addEventListener('click', () => { answer = true; dialog.close() })
    dialog.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialog.close()))
    // Esc and the backdrop both close the dialog natively; every close that is not "yes" is a no.
    dialog.addEventListener('close', () => { dialog.remove(); resolve(answer) })
    document.body.appendChild(dialog)
    dialog.showModal()
  })
}

function notice (text) {
  const el = document.createElement('div')
  el.className = 'hp-no-record toast toast-top toast-center z-[2147483646]'
  el.innerHTML = '<div class="alert border border-base-300 bg-base-200 text-sm"></div>'
  el.firstChild.textContent = text
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 5000)
}

// ── Recording ────────────────────────────────────────────────────────────────

function run (code, t0) {
  let stopped = false
  const now = () => Date.now() - t0

  const post = async (body) => {
    const { payload, gzipped } = await packBody(JSON.stringify(body))
    const res = await fetch(endpoint(code, 'batch'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(gzipped ? { 'Content-Encoding': 'gzip' } : {}) },
      credentials: 'same-origin',
      body: payload,
    })
    if (res.status === 410 || res.status === 404) { stop(false); return true } // ended elsewhere: drop
    return res.ok
  }
  const batcher = createBatcher({
    post,
    beacon: (json) => navigator.sendBeacon?.(endpoint(code, 'batch'), new Blob([json], { type: 'application/json' })) ?? false,
    nextSeq: () => {
      const saved = store.read() ?? { code, seq: 0 }
      store.write({ ...saved, seq: saved.seq + 1 })
      return saved.seq
    },
  })
  const log = (type, data, t = now()) => { if (!stopped) batcher.event({ t, type, data }) }

  const stopRrweb = record({
    emit: (e) => { if (!stopped) batcher.rrweb(e) },
    maskAllInputs: true,
    blockClass: 'hp-no-record',
    maskTextClass: 'hp-mask',
    recordCanvas: false,
    collectFonts: false,
    sampling: { mousemove: 100, scroll: 150, media: 800, input: 'last' },
  })

  const rage = createRageDetector()
  const dead = createDeadClickWatcher({ now: () => performance.now(), setTimeout: (fn, ms) => setTimeout(fn, ms), onDead: ({ t, info }) => log('dead_click', info, t) }) // at the click, not when found

  const teardown = [
    stopRrweb,
    watchViewport(log),
    watchRoutes(log, () => dead.reaction()),
    watchHttp(log),
    watchConsole(log),
    on(window, 'hp:player', (e) => log('scene', pick(e.detail, ['event', 'sceneIndex', 'sceneId']))),
  ]

  const observer = new MutationObserver((records) => { if (records.some(isReaction)) dead.reaction() })
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true })
  teardown.push(() => observer.disconnect())

  teardown.push(on(document, 'click', (e) => {
    if (e.target.closest?.('.hp-no-record')) return
    const info = describeClick(e)
    log('click', info)
    const burst = rage({ t: performance.now(), x: e.clientX, y: e.clientY })
    if (burst) log('rage_click', { ...info, count: burst })
    if (!e.target.closest?.('input, textarea, select, label, [contenteditable]')) dead.click({ t: now(), info })
  }, true))

  const hide = () => batcher.flushOnHide()
  teardown.push(on(window, 'pagehide', hide))
  teardown.push(on(document, 'visibilitychange', () => { if (document.visibilityState === 'hidden') hide() }))

  const pill = showPill(() => stop(true))
  teardown.push(() => pill.remove())

  let stopping = false
  async function stop (tellServer) {
    if (stopping) return
    stopping = true
    if (tellServer) {
      log('stop')
      await batcher.flush() // before end: the server refuses batches for an ended session
    }
    stopped = true
    batcher.stop()
    teardown.forEach((fn) => { try { fn() } catch (_) { /* keep tearing down */ } })
    store.clear()
    if (tellServer) fetch(endpoint(code, 'end'), { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(() => {})
  }

  log('route', { path: cleanPath(), title: document.title.slice(0, 80) })
  batcher.start()
}

/**
 * The player animates its DOM many times a second, so a minute of rrweb is ~3 MB of JSON that
 * gzips about 8x. Big batches go compressed (TestSessionBatchRequest unpacks them); small ones and
 * browsers without CompressionStream send plain JSON.
 */
const GZIP_OVER_BYTES = 16_384
async function packBody (json) {
  if (json.length < GZIP_OVER_BYTES || typeof CompressionStream === 'undefined') return { payload: json, gzipped: false }
  try {
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))
    return { payload: await new Response(stream).arrayBuffer(), gzipped: true }
  } catch (_) {
    return { payload: json, gzipped: false }
  }
}

// ── Watchers (each returns its own teardown) ─────────────────────────────────

const on = (target, type, fn, capture = false) => {
  target.addEventListener(type, fn, capture)
  return () => target.removeEventListener(type, fn, capture)
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj?.[k] != null).map((k) => [k, obj[k]]))

const CLICKABLE = 'button, a, input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="option"], [role="checkbox"], [role="radio"], [role="switch"], [role="slider"], [wire\\:click], [x-on\\:click], [\\@click]'

/** What was clicked, as a person would name it. A whole-panel handler is not "the thing". */
function describeClick (e) {
  const isBig = (node) => { const r = node.getBoundingClientRect?.(); return !r || r.width * r.height > innerWidth * innerHeight / 2 }
  const hit = e.target.closest?.(CLICKABLE)
  const el = hit && !isBig(hit) ? hit : e.target
  const masked = el.closest?.('.hp-mask')
  const isField = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
  const text = masked ? '***'
    : isField ? `[${el.type || el.tagName.toLowerCase()}]` // never a value
      : isBig(el) ? '' // a click on the backdrop has no name; x/y say where
        : (el.getAttribute?.('aria-label') || el.innerText || el.getAttribute?.('alt') || el.getAttribute?.('data-tooltip') || '').trim().replace(/\s+/g, ' ').slice(0, TEXT_MAX)
  return {
    text,
    role: el.getAttribute?.('role') || el.tagName?.toLowerCase(),
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
  }
}

function watchViewport (log) {
  const send = () => log('viewport', { w: innerWidth, h: innerHeight, dpr: devicePixelRatio })
  send()
  let timer = null
  return on(window, 'resize', () => { clearTimeout(timer); timer = setTimeout(send, 500) })
}

function watchRoutes (log, reacted) {
  let last = cleanPath()
  const check = () => {
    reacted()
    const path = cleanPath()
    if (path === last) return
    last = path
    log('route', { path, title: document.title.slice(0, 80) })
  }
  const { pushState, replaceState } = history
  history.pushState = function (...args) { const r = pushState.apply(this, args); check(); return r }
  history.replaceState = function (...args) { const r = replaceState.apply(this, args); check(); return r }
  const offs = [on(window, 'popstate', check), on(document, 'livewire:navigated', check)]
  return () => {
    history.pushState = pushState
    history.replaceState = replaceState
    offs.forEach((off) => off())
  }
}

const ownCall = (url) => String(url).includes('/test-sessions/')
const pathOf = (url) => { try { return new URL(url, location.href).pathname } catch (_) { return String(url).slice(0, 120) } }

function watchHttp (log) {
  const realFetch = window.fetch
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url
    const method = (init?.method || input?.method || 'GET').toUpperCase()
    try {
      const res = await realFetch.call(this, input, init)
      if (!res.ok && !ownCall(url)) log('http_error', { status: res.status, method, url: pathOf(url) })
      return res
    } catch (err) {
      if (!ownCall(url) && err?.name !== 'AbortError') log('http_error', { status: 0, method, url: pathOf(url) })
      throw err
    }
  }

  const { open } = XMLHttpRequest.prototype
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.addEventListener('loadend', () => {
      if ((this.status >= 400 || this.status === 0) && !ownCall(url)) log('http_error', { status: this.status, method: String(method).toUpperCase(), url: pathOf(url) })
    })
    return open.call(this, method, url, ...rest)
  }

  // A picture, script or stylesheet that failed to load: no status, but the tester saw it break.
  const off = on(window, 'error', (e) => {
    const el = e.target
    if (el && el !== window && /^(IMG|SCRIPT|LINK|VIDEO|AUDIO|SOURCE)$/.test(el.tagName)) {
      log('http_error', { status: 'load', method: 'GET', url: pathOf(el.currentSrc || el.src || el.href) })
    }
  }, true)

  return () => {
    window.fetch = realFetch
    XMLHttpRequest.prototype.open = open
    off()
  }
}

function watchConsole (log) {
  const real = console.error
  const send = (message) => log('console_error', { message: String(message).replace(/\s+/g, ' ').slice(0, 200) })
  console.error = function (...args) {
    send(args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : safeJson(a))).join(' '))
    return real.apply(this, args)
  }
  const offs = [
    on(window, 'error', (e) => { if (e.target === window || !e.target?.tagName) send(e.message || e.error?.message) }),
    on(window, 'unhandledrejection', (e) => send(`Unhandled: ${e.reason?.message ?? e.reason}`)),
  ]
  return () => { console.error = real; offs.forEach((off) => off()) }
}

const safeJson = (v) => { try { return JSON.stringify(v) } catch (_) { return String(v) } }

// ── The "Recording" pill ─────────────────────────────────────────────────────

/**
 * Where the pill may sit, in order. It moves to the first spot with no control under it (checked
 * every 2 s, since the player's deck and panels come and go), so it never covers a button.
 */
const SPOTS = [
  { top: '8px', left: '50%', transform: 'translateX(-50%)' },
  { top: '50%', left: '8px', transform: 'translateY(-50%)' },
  { top: '50%', right: '8px', transform: 'translateY(-50%)' },
  { bottom: '8px', right: '8px' },
]
const CONTROL = 'button, a, input, select, textarea, [role="button"], [role="tab"], [role="slider"], [wire\\:click], [x-on\\:click], [\\@click]'

function showPill (onStop) {
  const pill = document.createElement('div')
  pill.className = 'hp-no-record flex items-center gap-2 rounded-full border border-base-300 bg-base-200 py-1 pl-3 pr-1 text-xs text-base-content'
  pill.setAttribute('role', 'status')
  Object.assign(pill.style, { position: 'fixed', zIndex: '2147483646' })
  // Heroicons outline "stop".
  pill.innerHTML = '<span class="status status-error" aria-hidden="true"></span><span></span>'
    + '<button type="button" class="btn btn-ghost btn-xs btn-circle"><svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" /></svg></button>'
  pill.children[1].textContent = t('Recording')
  const stop = pill.querySelector('button')
  stop.setAttribute('aria-label', t('Stop recording'))
  stop.setAttribute('data-tooltip', t('Stop recording'))
  stop.addEventListener('click', onStop)
  document.body.appendChild(pill)

  const covers = () => {
    const r = pill.getBoundingClientRect()
    const points = [[r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2], [r.left + r.width / 2, r.top + r.height / 2]]
    return points.some(([x, y]) => document.elementsFromPoint(x, y).some((el) => !pill.contains(el) && el.closest(CONTROL)))
  }
  const place = () => {
    for (const spot of SPOTS) {
      pill.style.top = pill.style.bottom = pill.style.left = pill.style.right = pill.style.transform = ''
      Object.assign(pill.style, spot)
      if (!covers()) return
    }
    Object.assign(pill.style, SPOTS[0])
  }
  place()
  const timer = setInterval(place, SPOT_CHECK_MS)
  const off = on(window, 'resize', place)
  return { remove () { clearInterval(timer); off(); pill.remove() } }
}
