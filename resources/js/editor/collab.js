/**
 * collab.js — several accounts in one lesson's editor (Bart, 2026-11-23: "seeing what the other person is
 * doing, take over scene. only 1 account on 1 scene").
 *
 * Every PING_MS the editor tells the server which scene is on screen (LessonPresenceController). The
 * answer says who else is in the lesson and who holds which scene. From it this module:
 *  - draws the others' initials in the top bar and on the scene they are on in the rail;
 *  - turns the editor read-only, with Take over, when somebody else holds the scene on screen;
 *  - reloads that scene while you watch somebody edit it, and when a job drops a new picture or clip in;
 *  - redraws the rail when somebody adds, deletes or reorders scenes.
 *
 * The server is the lock (GuardsLessonClaims): an edit to a scene somebody else holds comes back as a 409,
 * which this module catches before Livewire's error modal and turns into "<name> took over this scene".
 * State lives in Alpine.store('collab') so the top bar (wire:ignore) and the overlay read the same thing.
 */

/** The part of the lesson on screen, as the server names it. */
export function targetOf (sel) {
  if (!sel) return null
  if (sel.title) return 'title'
  return sel.id ? `scene:${sel.id}` : null
}

export function sceneIdOf (target) {
  return typeof target === 'string' && target.startsWith('scene:') ? Number(target.slice(6)) : null
}

/** The other people in the room, grouped by the scene they are on: { 12: [person, …] }. */
export function othersByScene (people) {
  const out = {}
  for (const p of people ?? []) {
    if (p.me) continue
    const id = sceneIdOf(p.target)
    if (id) (out[id] ??= []).push(p)
  }
  return out
}

/** Livewire calls that change nothing: a commit made only of these is not "my own edit". */
const QUIET_CALLS = new Set(['poll', '$refresh', 'selectScene', 'loadStageScene', 'selectTitle', 'pollRestyle', 'sparkStatus',
  'sparkPending', 'selectInspectorTarget', 'setActiveLayer', 'clearActiveLayer', 'clearActiveText', 'pollWorldStatus'])

export function isOwnEdit (commit) {
  if (!commit) return false
  if (commit.updates && Object.keys(commit.updates).length) return true
  return (commit.calls ?? []).some((c) => !QUIET_CALLS.has(c.method))
}

const OWN_EDIT_WINDOW_MS = 4000

export function createCollab ({ wire, config, state = null, fetchImpl = (...a) => fetch(...a), now = () => Date.now() }) {
  const s = state ?? { people: [], holder: null, mine: true, target: null, notice: '', started: false }

  let timer = 0
  let stopped = false
  let inFlight = false
  let last = { rail: null, version: null, media: null, target: null, mine: true }
  let lastOwnEdit = 0
  let noticeTimer = 0

  const t = (key, name = '') => (config.labels?.[key] ?? key).replace(':name', name)

  const say = (text) => {
    s.notice = text
    clearTimeout(noticeTimer)
    noticeTimer = setTimeout(() => { s.notice = '' }, 6000)
  }

  const post = (url, body) => fetchImpl(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': config.csrf, 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify(body),
  })

  /** Show what is on screen again: the holder's latest edits, or a picture a job just delivered. */
  const reloadScreen = (target) => {
    const id = sceneIdOf(target)
    if (id) wire?.selectScene?.(id)
    else if (target === 'title') wire?.selectTitle?.()
  }

  const apply = (room) => {
    const target = room.target ?? null
    const sameTarget = target === last.target
    s.people = room.people ?? []
    s.holder = room.holder ?? null
    s.mine = room.mine !== false
    s.target = target

    // Lost it while on it: somebody pressed Take over.
    if (sameTarget && last.mine && !s.mine && s.holder) say(t('took_over', s.holder.name))

    // Watching somebody else work: follow their edits.
    if (sameTarget && !s.mine && last.version !== null && room.scene_version !== last.version) reloadScreen(target)

    // Holding it, and the picture or clip changed without me: a job or the video pipeline wrote it.
    if (sameTarget && s.mine && last.media !== null && room.media !== last.media) {
      if (now() - lastOwnEdit > OWN_EDIT_WINDOW_MS) {
        reloadScreen(target)
        say(t('new_media'))
      }
    }

    if (last.rail !== null && room.rail !== last.rail) window.Livewire?.dispatchTo?.('wizard.scene-rail', 'rail-refresh')

    last = { rail: room.rail, version: room.scene_version, media: room.media, target, mine: s.mine }
    paintRail()
  }

  /** Initials on the rail thumb of every scene somebody else is on. Redrawn after each ping and morph. */
  const paintRail = () => {
    document.querySelectorAll('[data-collab-chips]').forEach((el) => el.remove())
    const byScene = othersByScene(s.people)
    for (const [id, people] of Object.entries(byScene)) {
      const block = document.querySelector(`[data-scene-block="${id}"]`)
      if (!block) continue
      const chips = document.createElement('div')
      chips.dataset.collabChips = ''
      chips.className = 'collab-chips'
      for (const p of people) {
        const chip = document.createElement('span')
        chip.className = 'collab-chip'
        chip.style.setProperty('--collab-color', p.color)
        chip.textContent = p.initials
        chip.title = p.name
        chips.appendChild(chip)
      }
      block.appendChild(chips)
    }
  }

  const ping = async () => {
    if (stopped || inFlight) return
    inFlight = true
    try {
      const res = await post(config.pingUrl, { target: targetOf(window.__railSel) })
      if (res.status === 401 || res.status === 403 || res.status === 419) { stop(); return }
      if (res.ok) apply(await res.json())
    } catch { /* offline for a moment: the next ping tries again */ } finally {
      inFlight = false
    }
  }

  const takeOver = async () => {
    const target = targetOf(window.__railSel)
    if (!target) return
    const res = await post(config.takeOverUrl, { target })
    if (!res.ok) return
    const room = await res.json()
    last.target = null   // a fresh start on this scene: no "took over" notice for what I just did
    apply(room)
    reloadScreen(target)
  }

  const onSelected = () => { clearTimeout(timer); ping().finally(schedule) }
  const schedule = () => { if (!stopped) timer = setTimeout(() => ping().finally(schedule), config.intervalMs) }

  const leave = () => {
    if (stopped || !navigator.sendBeacon) return
    const body = new FormData()
    body.append('_token', config.csrf)
    navigator.sendBeacon(config.leaveUrl, body)
  }

  function stop () {
    stopped = true
    clearTimeout(timer)
  }

  const hookLivewire = () => {
    const lw = window.Livewire
    if (!lw?.hook) return
    lw.hook('commit', ({ commit, succeed }) => {
      if (isOwnEdit(commit)) succeed(() => { lastOwnEdit = now(); requestAnimationFrame(paintRail) })
      else succeed(() => requestAnimationFrame(paintRail))
    })
    lw.hook('request', ({ fail }) => {
      fail(({ status, content, preventDefault }) => {
        if (status !== 409) return
        let body = null
        try { body = JSON.parse(content) } catch { return }
        if (body?.collab !== 'claim-taken') return
        preventDefault()
        say(t('took_over', body.holder || t('someone')))
        onSelected()
      })
    })
  }

  const start = () => {
    if (s.started) return
    s.started = true
    hookLivewire()
    window.addEventListener('rail-selected', onSelected)
    window.addEventListener('pagehide', leave)
    onSelected()
  }

  return { state: s, start, stop, ping, takeOver, apply, paintRail }
}

/** Alpine entry: x-init="window.startLessonCollab($wire, config)" in the editor (<x-editor.collab-overlay>). */
export function startLessonCollab (wire, config) {
  if (window.__lessonCollab) return window.__lessonCollab
  // The store is the reactive copy: write through it, or the top bar and the overlay never hear of a change.
  let state = null
  if (window.Alpine?.store) {
    window.Alpine.store('collab', { people: [], holder: null, mine: true, target: null, notice: '', started: false })
    state = window.Alpine.store('collab')
  }
  const collab = createCollab({ wire, config, state })
  window.__lessonCollab = collab
  collab.start()
  return collab
}
