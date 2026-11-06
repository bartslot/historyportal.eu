/**
 * frames-tab.js — the picture editor's Frames tab: shuffle an animation's frames, repeat them or leave them out, and play it
 * (Bart, 2026-11-06). The list lives on the layer (`play.frames`, stage25d/sprite.ts frameAt reads it): one layer's own order
 * of the sheet's cells. No sheet is packed again, and the library's file stays as it is. Every change shows on the stage at
 * once (setLayerProp), Save stores it (commitLayerProp), and leaving without saving puts back what it opened with.
 */
import Sortable from 'sortablejs'
import { sequenceOf, framesIn, FPS } from '@stage25d/stage25d/sprite'
import { createHistory } from './history.js'
import { icon, ICONS, iconButton, slider, syncSlider } from './cutout-markup.js'

export const MAX_FRAMES = 600   // LayerKeys::PLAY_FRAMES_MAX

/** Frames a..b, held inside the list. */
const span = (list, a, b) => {
  const from = Math.max(0, Math.min(a, b))
  return [from, Math.min(list.length - 1, Math.max(a, b))]
}

/** One frame dragged from one place to another. */
export const moved = (list, from, to) => {
  const rest = list.filter((_, i) => i !== from)
  return [...rest.slice(0, to), list[from], ...rest.slice(to)]
}

/** Frames a..b once more, right after themselves; never past the most a layer may hold. */
export const duplicated = (list, a, b) => {
  const [from, to] = span(list, a, b)
  const copy = list.slice(from, to + 1).slice(0, Math.max(0, MAX_FRAMES - list.length))
  return [...list.slice(0, to + 1), ...copy, ...list.slice(to + 1)]
}

/** Frames a..b gone; an animation always keeps one. */
export const removed = (list, a, b) => {
  const [from, to] = span(list, a, b)
  const rest = [...list.slice(0, from), ...list.slice(to + 1)]
  return rest.length ? rest : list
}

/** A cell of the sheet added after place `at`. */
export const inserted = (list, at, cell) => (list.length >= MAX_FRAMES ? list : [...list.slice(0, at + 1), cell, ...list.slice(at + 1)])

/** What the layer saves: the list only when it is not simply all frames in order, the loop only when it differs from the sheet's. */
export const playOf = (draft, frames) => {
  const all = Array.from({ length: framesIn(frames) }, (_, n) => n)
  const { offset } = frames.play ?? {}
  return {
    speed: draft.speed,
    ...(offset !== undefined ? { offset } : {}),
    ...(JSON.stringify(draft.frames) === JSON.stringify(all) ? {} : { frames: draft.frames }),
    ...(draft.loop === (frames.loop !== false) ? {} : { loop: draft.loop }),
  }
}

/** The CSS that shows one cell of the sheet on a tile. */
export const cellStyle = (frames, cell, sheet) => {
  const { cols = 1, rows = 1 } = frames
  const x = cols > 1 ? ((cell % cols) / (cols - 1)) * 100 : 0
  const y = rows > 1 ? (Math.floor(cell / cols) / (rows - 1)) * 100 : 0
  return `background-image:url('${sheet}');background-size:${cols * 100}% ${rows * 100}%;background-position:${x}% ${y}%;background-repeat:no-repeat;`
}

const secondsOf = (draft, fps) => (draft.speed > 0 ? draft.frames.length / (fps * draft.speed) : 0)

export function mountFrames ({ view, strip, panel, t, sheet, frames, stage, stageId, onChange = () => {}, onTime = () => {} }) {
  const fps = frames.fps ?? FPS
  const opened = { frames: sequenceOf(frames, frames.play), speed: frames.play?.speed ?? 1, loop: frames.play?.loop ?? frames.loop !== false }
  const history = createHistory(opened)
  let picked = [0, 0]
  let playing = false
  let raf = 0
  let startedAt = 0
  let tile = null        // the frame the playhead is on while it plays
  let image = null
  const ratio = `${frames.w || 1} / ${frames.h || 1}`

  view.innerHTML = `<canvas class="block h-full w-full object-contain p-4" data-fr-show></canvas>`
  strip.innerHTML = `
    <div class="flex items-center gap-2 pb-1">
      <button type="button" class="btn btn-primary btn-sm btn-square" data-fr-play data-tooltip="${t('Play')}" data-tooltip-key="Space" aria-label="${t('Play')}">${icon(ICONS.play)}</button>
      <span class="text-xs tabular-nums text-panel-value" data-fr-where></span>
      <span class="text-xs tabular-nums text-panel-label" data-fr-length></span>
      <span class="flex-1"></span>
      ${iconButton('data-fr-duplicate', t('Duplicate'), ICONS.duplicate, 'D')}
      ${iconButton('data-fr-delete', t('Delete'), ICONS.trash, 'Del')}
    </div>
    <div class="flex gap-1 overflow-x-auto rounded-lg border p-1" style="border-color: var(--color-panel-border); background: var(--color-panel);" data-fr-list></div>`
  panel.innerHTML = `
    <div class="flex flex-col gap-1">
      <h3 class="pb-1 text-sm font-semibold text-panel-value">${t('Frames')}</h3>
      ${slider('fr-speed', t('Speed'), 0, 300, Math.round(opened.speed * 100), '%')}
      <label class="flex cursor-pointer items-center gap-2 py-1 text-sm text-panel-value">
        <input type="checkbox" class="checkbox checkbox-sm" data-fr-loop>${t('Loop')}
      </label>
    </div>
    <div class="flex min-h-0 flex-col gap-1 border-t pt-3" style="border-color: var(--color-panel-border);">
      <h3 class="pb-1 text-sm font-semibold text-panel-value">${t('Add a frame')}</h3>
      <div class="grid max-h-72 grid-cols-6 gap-1 overflow-y-auto" data-fr-cells></div>
    </div>
    <span class="flex-1"></span>
    <div class="flex flex-col gap-2 border-t pt-3" style="border-color: var(--color-panel-border);">
      <button type="button" class="btn btn-sm" data-fr-all>${t('All frames in order')}</button>
    </div>`
  const $ = (root, sel) => root.querySelector(sel)
  const list = $(strip, '[data-fr-list]')
  const show = $(view, '[data-fr-show]')
  const ctx = show.getContext?.('2d') ?? null

  /** The big picture: one cell of the sheet. */
  const paint = (cell) => {
    if (!ctx || !image) return
    const { cols = 1, rows = 1 } = frames
    const w = image.naturalWidth / cols, h = image.naturalHeight / rows
    if (show.width !== Math.round(w) || show.height !== Math.round(h)) { show.width = Math.round(w); show.height = Math.round(h) }
    ctx.clearRect(0, 0, show.width, show.height)
    ctx.drawImage(image, (cell % cols) * w, Math.floor(cell / cols) * h, w, h, 0, 0, show.width, show.height)
  }

  const draft = () => history.now
  const paintPicked = () => paint(draft().frames[Math.min(picked[0], draft().frames.length - 1)])

  const renderTiles = () => {
    list.innerHTML = draft().frames.map((cell, i) => `
      <button type="button" class="flex shrink-0 flex-col items-center gap-0.5 rounded border p-0.5 outline-none focus-visible:border-primary" data-frame="${i}" aria-label="${t('Frame :n of :total').replace(':n', i + 1).replace(':total', draft().frames.length)}">
        <span class="block h-16 rounded-sm" style="aspect-ratio:${ratio};${cellStyle(frames, cell, sheet)}"></span>
        <span class="text-xs tabular-nums text-panel-label">${i + 1}</span>
      </button>`).join('')
  }

  const renderPicked = () => {
    const [a, b] = picked
    const n = draft().frames.length
    for (const el of list.children) {
      const i = Number(el.dataset.frame)
      const on = i >= Math.min(a, b) && i <= Math.max(a, b)
      el.setAttribute('aria-pressed', String(on))
      el.style.borderColor = on ? 'var(--color-primary)' : 'transparent'
      el.style.background = i === tile ? 'var(--color-base-300)' : ''
    }
    $(strip, '[data-fr-where]').textContent = t('Frame :n of :total').replace(':n', (tile ?? a) + 1).replace(':total', n)
    $(strip, '[data-fr-length]').textContent = `${secondsOf(draft(), fps).toFixed(1)} s`
    $(strip, '[data-fr-delete]').disabled = Math.abs(a - b) + 1 >= n
    $(strip, '[data-fr-duplicate]').disabled = n >= MAX_FRAMES
    $(panel, '[data-fr-all]').disabled = JSON.stringify(draft().frames) === JSON.stringify(Array.from({ length: framesIn(frames) }, (_, c) => c))
  }

  const renderValues = () => {
    const speed = $(panel, '[data-cut-fr-speed]')
    speed.value = String(Math.round(draft().speed * 100))
    syncSlider(speed, $(panel, '[data-cut-fr-speed-value]'))
    $(panel, '[data-fr-loop]').checked = draft().loop
  }

  /** The stage shows this draft at once; nothing is saved yet. */
  const toStage = () => stage.setLayerProp?.(stageId, 'play', playOf(draft(), frames))

  const hold = () => {
    const last = draft().frames.length - 1
    picked = [Math.min(picked[0], last), Math.min(picked[1], last)]
  }
  const refreshAll = () => {
    hold()
    renderTiles()
    renderPicked()
    renderValues()
    if (!playing) paintPicked()
    toStage()
    onChange()
  }
  const change = (patch, nextPicked = picked) => {
    if (history.push({ ...draft(), ...patch })) { picked = nextPicked; refreshAll() }
  }

  const reveal = (i) => list.children[i]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  const pick = (i, extend = false) => {
    const n = draft().frames.length
    const at = Math.max(0, Math.min(n - 1, i))
    picked = extend ? [picked[0], at] : [at, at]
    renderPicked()
    if (!playing) paintPicked()
    reveal(at)
  }

  const stop = () => {
    if (!playing) return
    playing = false
    cancelAnimationFrame(raf)
    tile = null
    const button = $(strip, '[data-fr-play]')
    button.innerHTML = icon(ICONS.play)
    button.setAttribute('aria-label', t('Play'))
    button.dataset.tooltip = t('Play')
    onTime(null)
    renderPicked()
    paintPicked()
  }
  const tick = (now) => {
    if (!playing) return
    const seconds = (now - startedAt) / 1000
    const { frames: seq, speed, loop } = draft()
    const n = Math.floor(seconds * fps * speed + 1e-6)
    if (!loop && n >= seq.length) { stop(); return }
    const at = loop ? n % seq.length : Math.min(seq.length - 1, n)
    if (at !== tile) {
      tile = at
      paint(seq[at])
      renderPicked()
      reveal(at)
    }
    onTime(seconds)
    raf = requestAnimationFrame(tick)
  }
  const play = () => {
    if (playing) { stop(); return }
    playing = true
    startedAt = performance.now()
    const button = $(strip, '[data-fr-play]')
    button.innerHTML = icon(ICONS.pause)
    button.setAttribute('aria-label', t('Pause'))
    button.dataset.tooltip = t('Pause')
    raf = requestAnimationFrame(tick)
  }

  const duplicate = () => {
    const [a, b] = [Math.min(...picked), Math.max(...picked)]
    const next = duplicated(draft().frames, a, b)
    change({ frames: next }, [b + 1, Math.min(next.length - 1, b + 1 + b - a)])
  }
  const remove = () => {
    const [a, b] = [Math.min(...picked), Math.max(...picked)]
    change({ frames: removed(draft().frames, a, b) }, [a, a])
  }
  const shift = (by) => {
    const [a, b] = [Math.min(...picked), Math.max(...picked)]
    const next = a + by
    if (a !== b || next < 0 || next >= draft().frames.length) return
    change({ frames: moved(draft().frames, a, next) }, [next, next])
  }

  // the wiring
  list.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-frame]')
    if (el) pick(Number(el.dataset.frame), e.shiftKey)
  })
  const sortable = Sortable.create(list, {
    animation: 120,
    direction: 'horizontal',
    forceFallback: true,   // the browser's own drag ghost is a screenshot of the wrong size
    onEnd: ({ oldIndex, newIndex }) => {
      if (oldIndex === newIndex) return
      change({ frames: moved(draft().frames, oldIndex, newIndex) }, [newIndex, newIndex])
    },
  })
  $(strip, '[data-fr-play]').addEventListener('click', play)
  $(strip, '[data-fr-duplicate]').addEventListener('click', duplicate)
  $(strip, '[data-fr-delete]').addEventListener('click', remove)
  $(panel, '[data-fr-all]').addEventListener('click', () => change({ frames: Array.from({ length: framesIn(frames) }, (_, c) => c) }, [0, 0]))
  $(panel, '[data-fr-loop]').addEventListener('change', (e) => change({ loop: e.target.checked }))
  const speed = $(panel, '[data-cut-fr-speed]')
  let sliding = false
  speed.addEventListener('input', () => {
    syncSlider(speed, $(panel, '[data-cut-fr-speed-value]'))
    const value = Number(speed.value) / 100
    // one slide is one undo
    if (!sliding) { sliding = true; history.push({ ...draft(), speed: value }) } else history.replace({ ...draft(), speed: value })
    renderPicked()
    toStage()
    onChange()
  })
  speed.addEventListener('change', () => { sliding = false })
  const cells = $(panel, '[data-fr-cells]')
  cells.innerHTML = Array.from({ length: framesIn(frames) }, (_, cell) => `
    <button type="button" class="rounded-sm border border-transparent hover:border-primary focus-visible:border-primary" data-cell="${cell}" aria-label="${t('Add a frame')} ${cell + 1}" style="aspect-ratio:${ratio};${cellStyle(frames, cell, sheet)}"></button>`).join('')
  cells.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-cell]')
    if (!el) return
    const at = Math.max(...picked)
    change({ frames: inserted(draft().frames, at, Number(el.dataset.cell)) }, [at + 1, at + 1])
  })

  const img = new Image()
  img.onload = () => { image = img; paintPicked() }
  img.src = sheet

  renderTiles()
  renderPicked()
  renderValues()

  return {
    canUndo: () => history.canUndo,
    canRedo: () => history.canRedo,
    undo: () => { if (history.undo()) refreshAll() },
    redo: () => { if (history.redo()) refreshAll() },
    dirty: () => history.dirty,
    save: () => stage.commitLayerProp?.(stageId, 'play', playOf(draft(), frames)),
    discard: () => { if (history.dirty) stage.setLayerProp?.(stageId, 'play', frames.play ?? undefined) },
    show: () => { paintPicked() },
    hide: stop,
    destroy: () => { stop(); sortable.destroy() },
    /** A key while this tab shows. True: it was for this tab. */
    key: (e) => {
      if (e.target.matches?.('input[type="range"]') && ['ArrowLeft', 'ArrowRight'].includes(e.key)) return false
      const key = e.key.toLowerCase()
      if (e.code === 'Space' && !e.target.matches?.('input[type="checkbox"], button')) { if (!e.repeat) play(); return true }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const by = e.key === 'ArrowLeft' ? -1 : 1
        if (e.altKey) shift(by)
        else pick(picked[1] + by, e.shiftKey)
        return true
      }
      if (key === 'd') { duplicate(); return true }
      if (e.key === 'Delete' || e.key === 'Backspace') { remove(); return true }
      if (e.key === 'Home') { pick(0); return true }
      if (e.key === 'End') { pick(draft().frames.length - 1); return true }
      return false
    },
  }
}
