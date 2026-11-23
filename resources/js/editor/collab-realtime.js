/**
 * collab-realtime.js — the live layer on top of collab.js, through our Cloudflare relay (cloudflare/realtime)
 * with Laravel Echo. Loaded only when the page says the relay is configured (LessonCollaboration::editorConfig).
 *
 * Two things, nothing more:
 *  - a nudge: somebody arrived, moved, took a scene over or left (LessonRoomChanged), so ping now instead of
 *    within three seconds. The ping stays the truth; a lost nudge costs one ping interval.
 *  - cursors: each editor whispers where its pointer is over the stage, at most CURSOR_HZ times a second,
 *    and draws the others who are on the same scene.
 */
import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

const CURSOR_HZ = 10
const CURSOR_IDLE_MS = 5000

/** Pointer position as a share of the stage box, or null when it is outside. */
export function stagePoint (clientX, clientY, rect) {
  if (!rect || rect.width <= 0 || rect.height <= 0) return null
  const x = (clientX - rect.left) / rect.width
  const y = (clientY - rect.top) / rect.height
  if (x < 0 || x > 1 || y < 0 || y > 1) return null
  return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 }
}

const stageBox = () => document.querySelector('[data-scene-frame]')?.parentElement ?? null

export function connectRealtime ({ config, collab, myTarget }) {
  const rt = config.realtime
  window.Pusher = Pusher
  const echo = new Echo({
    broadcaster: 'reverb',
    key: rt.key,
    wsHost: rt.host,
    wsPort: rt.port,
    wssPort: rt.port,
    forceTLS: rt.tls,
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: { headers: { 'X-CSRF-TOKEN': config.csrf } },
  })

  const nudge = () => collab.pingNow()
  const channel = echo.join(rt.channel)
    .here(nudge).joining(nudge).leaving(nudge)
    .listen('.room.changed', nudge)

  // ── Cursors ────────────────────────────────────────────────────────────────────────────────────────
  const cursors = new Map()   // user id → { el, timer }

  const removeCursor = (id) => {
    const c = cursors.get(id)
    if (!c) return
    clearTimeout(c.timer)
    c.el.remove()
    cursors.delete(id)
  }

  const drawCursor = (data, meta) => {
    const id = String(meta?.user_id ?? data?.id ?? '')
    if (!id || id === String(rt.me?.id)) return
    const box = stageBox()
    if (!box || data.t !== myTarget()) return removeCursor(id)

    let c = cursors.get(id)
    if (!c) {
      const el = document.createElement('div')
      el.className = 'collab-cursor'
      el.dataset.collabCursor = id
      el.innerHTML = '<span class="collab-cursor-dot"></span><span class="collab-cursor-name"></span>'
      c = { el, timer: 0 }
      cursors.set(id, c)
    }
    if (c.el.parentElement !== box) box.appendChild(c.el)
    c.el.style.setProperty('--collab-color', data.color ?? '')
    c.el.querySelector('.collab-cursor-name').textContent = data.name ?? ''
    c.el.style.left = `${data.x * 100}%`
    c.el.style.top = `${data.y * 100}%`
    clearTimeout(c.timer)
    c.timer = setTimeout(() => removeCursor(id), CURSOR_IDLE_MS)
  }

  channel.listenForWhisper('cursor', drawCursor)
  channel.leaving?.((member) => removeCursor(String(member?.id ?? '')))

  let lastSent = 0
  let pending = null
  const send = () => {
    pending = null
    lastSent = Date.now()
    channel.whisper('cursor', { ...pointer, t: myTarget(), id: rt.me?.id, name: rt.me?.name, color: rt.me?.color })
  }
  let pointer = null
  const onMove = (e) => {
    const p = stagePoint(e.clientX, e.clientY, stageBox()?.getBoundingClientRect())
    if (!p) return
    pointer = p
    const wait = 1000 / CURSOR_HZ - (Date.now() - lastSent)
    if (wait <= 0) send()
    else if (!pending) pending = setTimeout(send, wait)
  }
  window.addEventListener('pointermove', onMove, { passive: true })

  return {
    socketId: () => echo.socketId(),
    clearCursors: () => [...cursors.keys()].forEach(removeCursor),
  }
}
