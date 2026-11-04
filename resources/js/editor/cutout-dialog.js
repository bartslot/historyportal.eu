/**
 * cutout-dialog.js — double-click a picture: it cleans itself, and a part can be saved as your own asset.
 *
 * Bart, 2026-11-04: "when I double click a item, I simply want 2 things mainly. delete clearly white stuff ...
 * automatically adjusting ... removing the white backgrounds ... and remove white spots of edges", plus the hard
 * bottom edge blended into transparency. So the picture opens already cleaned (quick-mask.js cleanUp, CLEAN_DEFAULTS):
 * white holes, white edges, and a soft bottom, each one slider; Apply puts the clean picture on the item (a new
 * file, the original kept: EditsImages::saveEditedImage). The cut-out tools are under Advanced.
 *
 * Bart, 2026-11-04: "I need to make this super simple. when you select a bunch of grass or tree line.. you can then
 * save it as a new asset". No editor of its own: it mounts the quick mask (scene/quick-mask.js) that the layer panel
 * already has, with its smart brush (paint roughly, the selection snaps to the picture's edges) and its colour cut,
 * Soft edge and Edge. Save sends the cut-out to EditsImages::saveCutout, which makes it the teacher's own asset
 * (Assets > My cut-outs, and the 3D library). The picture it was cut from is never touched.
 *
 * Bart, 2026-11-05: "we have no way to erase pixels like that white in the hair". The tools over the picture: Erase and
 * Bring back (a brush with a size and a softness: scene/erase-brush.js), Remove colour (one click, what touches it or
 * Everywhere), Hand, undo and redo, and zoom (the wheel, editor/pan-zoom.js). The picture opens on Erase.
 *
 * Whatever drew the picture sends an `image-edit:open` window event with { id, title, original, el, from }:
 * ArtworkOverlay for a picture layer, the stage25d engine for a 3D layer, a ground band or the sky (`from` names
 * its bundle and library asset, for the cut-out's real size in metres).
 */
import { mountQuickMask, MAX_FEATHER, MAX_SHIFT, CLEAN_DEFAULTS } from '../scene/quick-mask.js'
import { mountPanZoom } from './pan-zoom.js'

const ZOOM_STEP = 1.5
const TOLERANCE = 30          // of a colour's 0..255 distance: paper with its noise, not the skin beside it
const MAX_TOLERANCE = 120
const SOFTNESS = 20           // % of the eraser that fades
const RING_MS = 700           // how long the eraser's size shows after its slider moved

/** The eraser for a picture this big: its starting size and the largest it goes, in picture pixels. */
export function eraserRange (w, h) {
  const long = Math.max(w, h)
  return { size: Math.max(3, Math.min(60, Math.round(long / 30))), max: Math.max(60, Math.round(long / 5)) }
}

const outline = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`

/** The Livewire component that owns the canvas the picture was double-clicked on. */
export function wireFor (el) {
  for (let node = el; node && node.getAttribute; node = node.parentElement) {
    const id = node.getAttribute('wire:id')
    if (id) return window.Livewire?.find(id) ?? null
  }
  return null
}

const words = () => {
  try { return JSON.parse(document.querySelector('[data-cutout-labels]')?.dataset.cutoutLabels || '{}') } catch { return {} }
}

const say = (type, message) => window.dispatchEvent(new CustomEvent('toast', { detail: { type, message } }))

const slider = (name, label, min, max, value, unit = '') => `
  <label class="flex items-center gap-2">
    <span class="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">${label}</span>
    <input type="range" min="${min}" max="${max}" step="1" value="${value}" class="range range-xs range-primary w-36" data-cut-${name}>
    <span class="w-8 text-right text-sm tabular-nums" data-cut-${name}-value>${value}</span><span class="text-xs text-panel-label">${unit}</span>
  </label>`

/** A slider for the tool row: the row stays one line, so the picture does not jump when the tool changes. */
const toolSlider = (name, label, min, max, value, unit = '') => `
  <label class="flex items-center gap-2">
    <span class="text-xs font-semibold uppercase tracking-wide text-panel-label">${label}</span>
    <input type="range" min="${min}" max="${max}" step="1" value="${value}" class="range range-xs range-primary w-24" data-cut-${name}>
    <span class="w-7 text-right text-sm tabular-nums" data-cut-${name}-value>${value}</span><span class="text-xs text-panel-label">${unit}</span>
  </label>`

/** The dialog's markup, in the page's words (t). */
function markup (t, clean = CLEAN_DEFAULTS) {
  return `
  <div class="modal-box flex h-[94vh] max-h-[94vh] w-[min(94vw,72rem)] max-w-none flex-col gap-3 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-4">
    <div class="flex items-center gap-3">
      <h3 class="min-w-0 flex-1 truncate text-sm font-semibold" data-cut-title></h3>
      <button type="button" class="btn btn-ghost btn-sm btn-square" data-cut-close aria-label="${t('Close')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2" data-cut-tools>
      <div class="join" role="group" aria-label="${t('Tools')}">
        <button type="button" class="btn btn-sm join-item" data-cut-tool="erase">${t('Erase')}</button>
        <button type="button" class="btn btn-sm join-item" data-cut-tool="restore">${t('Bring back')}</button>
        <button type="button" class="btn btn-sm join-item" data-cut-tool="colour">${t('Remove colour')}</button>
        <button type="button" class="btn btn-sm join-item" data-cut-tool="move">${t('Hand')}</button>
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2" data-cut-for="erase restore">
        ${toolSlider('esize', t('Size'), 1, 60, 12, 'px')}
        ${toolSlider('soft', t('Softness'), 0, 100, SOFTNESS, '%')}
      </div>
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2" data-cut-for="colour" hidden>
        ${toolSlider('tol', t('Tolerance'), 1, MAX_TOLERANCE, TOLERANCE)}
        <label class="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" data-cut-everywhere>${t('Everywhere')}
        </label>
      </div>
      <span class="flex-1"></span>
      <div class="flex items-center gap-1">
        <button type="button" class="btn btn-ghost btn-sm btn-square" data-cut-undo disabled title="${t('Undo')}" aria-label="${t('Undo')}">${outline('M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3')}</button>
        <button type="button" class="btn btn-ghost btn-sm btn-square" data-cut-redo disabled title="${t('Redo')}" aria-label="${t('Redo')}">${outline('m15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3')}</button>
        <button type="button" class="btn btn-ghost btn-sm btn-square" data-cut-zoom-out title="${t('Zoom out')}" aria-label="${t('Zoom out')}">${outline('m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6')}</button>
        <button type="button" class="btn btn-ghost btn-sm w-16 tabular-nums" data-cut-fit title="${t('Fit')}" aria-label="${t('Fit')}">100%</button>
        <button type="button" class="btn btn-ghost btn-sm btn-square" data-cut-zoom-in title="${t('Zoom in')}" aria-label="${t('Zoom in')}">${outline('m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6')}</button>
      </div>
    </div>
    <div class="relative min-h-48 flex-1 touch-none overflow-hidden rounded" data-cut-view
         style="background: repeating-conic-gradient(var(--color-base-300) 0 25%, var(--color-base-200) 0 50%) 0 0 / 20px 20px;">
      <div class="absolute left-0 top-0 origin-top-left" data-cut-stage>
        <canvas data-cut-art class="block h-full w-full"></canvas>
        <canvas data-cut-film class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
      </div>
      <div class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style="border: 1px solid #fff; outline: 1px solid #000;" data-cut-ring hidden></div>
      <span class="loading loading-spinner loading-md absolute left-1/2 top-1/2" data-cut-loading></span>
    </div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2" data-cut-clean>
      ${slider('white', t('White holes'), 0, 100, clean.white)}
      ${slider('fringe', t('White edges'), 0, 10, clean.fringe, 'px')}
      ${slider('fade', t('Soft bottom'), 0, 200, clean.fade, 'px')}
      <button type="button" class="btn btn-ghost btn-sm" data-cut-compare>${t('Before')}</button>
    </div>
    <details class="rounded-box border border-base-300 px-3 py-2" data-cut-advanced>
      <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-panel-label">${t('Advanced')}</summary>
      <div class="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
        <button type="button" class="btn btn-sm" data-cut-tool="brush">${t('Select a part')}</button>
        <div class="join" role="group" data-cut-brush-only>
          <button type="button" class="btn btn-sm join-item btn-primary" data-cut-erase="0">${t('Add')}</button>
          <button type="button" class="btn btn-sm join-item" data-cut-erase="1">${t('Remove')}</button>
        </div>
        <span data-cut-brush-only>${slider('size', t('Brush size'), 8, 160, 40, 'px')}</span>
        ${slider('feather', t('Soft edge'), 0, MAX_FEATHER, 0, 'px')}
        ${slider('shift', t('Edge'), -MAX_SHIFT, MAX_SHIFT, 0, 'px')}
      </div>
    </details>
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn btn-ghost btn-sm" data-cut-original hidden>${t('Back to the original')}</button>
      <span class="flex-1"></span>
      <button type="button" class="btn btn-ghost btn-sm" data-cut-cancel>${t('Cancel')}</button>
      <button type="button" class="btn btn-sm" data-cut-asset>${t('Save as asset')}</button>
      <button type="button" class="btn btn-primary btn-sm" data-cut-apply>${t('Apply')}</button>
    </div>
  </div>`
}

let open = null

/** Open Uitknippen for one picture. Resolves when the dialog closes (saved or not). */
export async function openCutout (target) {
  if (open || !target?.original) return
  const labels = words()
  const t = (en) => labels[en] ?? en
  const wire = wireFor(target.el)
  if (!wire) { say('error', t('This picture cannot be opened here.')); return }

  const dlg = document.createElement('dialog')
  dlg.className = 'modal'
  dlg.dataset.cutout = target.id
  // an already cleaned picture starts at 0: cleaning it again would fade the bottom twice
  const clean = target.edited ? { white: 0, fringe: 0, fade: 0 } : { ...CLEAN_DEFAULTS }
  dlg.innerHTML = markup(t, clean)
  document.body.appendChild(dlg)
  const $ = (sel) => dlg.querySelector(sel)
  $('[data-cut-title]').textContent = target.title || t('Cut out')
  dlg.showModal()

  let mask = null
  let view = null
  let state = { canUndo: false, canRedo: false, selected: false }
  let tool = 'erase'
  let slid = false       // a clean-up or edge slider moved: there is something to lose
  const edges = { feather: 0, shift: 0 }

  open = new Promise((resolve) => {
    const close = () => {
      view?.destroy()
      mask?.destroy()
      dlg.close()
      dlg.remove()
      open = null
      resolve()
    }
    dlg.addEventListener('close', () => { if (open) close() })

    // Leaving with work done takes a second press: one slip beside the picture never throws a retouch away
    let leaving = false
    const cancelButton = $('[data-cut-cancel]')
    const stayed = () => {
      leaving = false
      cancelButton.textContent = t('Cancel')
      cancelButton.classList.remove('btn-error')
    }
    const leave = () => {
      if (leaving || !(state.canUndo || slid)) { close(); return }
      leaving = true
      cancelButton.textContent = t('Discard changes')
      cancelButton.classList.add('btn-error')
    }
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); leave() })

    const refresh = (s = {}) => {
      state = { ...state, ...s }
      $('[data-cut-undo]').disabled = !state.canUndo
      $('[data-cut-redo]').disabled = !state.canRedo
    }
    const setTool = (next) => {
      tool = next
      if (next !== 'move') mask?.setMode(next)
      view?.setHand(next === 'move')
      for (const b of dlg.querySelectorAll('[data-cut-tool]')) {
        const on = b.dataset.cutTool === next
        b.classList.toggle('btn-primary', on)
        b.setAttribute('aria-pressed', on ? 'true' : 'false')
      }
      for (const el of dlg.querySelectorAll('[data-cut-for]')) el.hidden = !el.dataset.cutFor.split(' ').includes(next)
      for (const el of dlg.querySelectorAll('[data-cut-brush-only]')) el.hidden = next !== 'brush'
      ring.hidden = true
    }

    // the eraser's size on the picture, round the pointer
    const viewport = $('[data-cut-view]')
    const ring = $('[data-cut-ring]')
    const ringPx = () => {
      if (tool === 'brush') return Number($('[data-cut-size]').value)
      return tool === 'erase' || tool === 'restore' ? Number($('[data-cut-esize]').value) * (view?.view.z ?? 1) : 0
    }
    const showRing = (x, y) => {
      const px = ringPx()
      ring.hidden = !px || !!view?.panning
      if (ring.hidden) return
      ring.style.width = ring.style.height = `${px}px`
      ring.style.left = `${x}px`
      ring.style.top = `${y}px`
    }
    let pointer = null
    viewport.addEventListener('pointermove', (e) => {
      const r = viewport.getBoundingClientRect()
      pointer = [e.clientX - r.left, e.clientY - r.top]
      showRing(...pointer)
    })
    viewport.addEventListener('pointerdown', stayed)
    viewport.addEventListener('pointerleave', () => { pointer = null; ring.hidden = true })
    viewport.addEventListener('wheel', () => { if (pointer) requestAnimationFrame(() => showRing(...pointer)) }, { passive: true })
    let ringTimer = 0
    /** A size slider moved: show the new size in the middle of the picture for a moment. */
    const peekRing = () => {
      const r = viewport.getBoundingClientRect()
      showRing(r.width / 2, r.height / 2)
      clearTimeout(ringTimer)
      ringTimer = setTimeout(() => { if (!pointer) ring.hidden = true }, RING_MS)
    }

    for (const b of dlg.querySelectorAll('[data-cut-tool]')) b.addEventListener('click', () => setTool(b.dataset.cutTool))
    // Add / Remove: what the brush does, without a key to hold (Alt still works)
    for (const b of dlg.querySelectorAll('[data-cut-erase]')) {
      b.addEventListener('click', () => {
        mask?.setErase(b.dataset.cutErase === '1')
        for (const o of dlg.querySelectorAll('[data-cut-erase]')) o.classList.toggle('btn-primary', o === b)
      })
    }
    $('[data-cut-close]').addEventListener('click', leave)
    cancelButton.addEventListener('click', leave)
    $('[data-cut-undo]').addEventListener('click', () => mask?.undo())
    $('[data-cut-redo]').addEventListener('click', () => mask?.redo())
    $('[data-cut-zoom-in]').addEventListener('click', () => view?.zoomBy(ZOOM_STEP))
    $('[data-cut-zoom-out]').addEventListener('click', () => view?.zoomBy(1 / ZOOM_STEP))
    $('[data-cut-fit]').addEventListener('click', () => view?.fit())
    $('[data-cut-original]').hidden = !target.edited
    $('[data-cut-everywhere]').addEventListener('change', (e) => mask?.setEverywhere(e.target.checked))
    $('[data-cut-size]').addEventListener('input', (e) => { mask?.setBrushSize(e.target.value); $('[data-cut-size-value]').textContent = e.target.value; peekRing() })
    const setEraserSize = (value) => {
      const input = $('[data-cut-esize]')
      input.value = String(value)
      $('[data-cut-esize-value]').textContent = input.value
      mask?.setBrush({ size: Number(input.value) })
      peekRing()
    }
    $('[data-cut-esize]').addEventListener('input', (e) => setEraserSize(e.target.value))
    $('[data-cut-soft]').addEventListener('input', (e) => { mask?.setBrush({ softness: Number(e.target.value) / 100 }); $('[data-cut-soft-value]').textContent = e.target.value })
    $('[data-cut-tol]').addEventListener('input', (e) => { mask?.setTolerance(e.target.value); $('[data-cut-tol-value]').textContent = e.target.value })
    let frame = 0
    const live = (name, group, apply) => $(`[data-cut-${name}]`).addEventListener('input', (e) => {
      group[name] = Number(e.target.value)
      slid = true
      $(`[data-cut-${name}-value]`).textContent = String(group[name])
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(apply)
    })
    for (const name of ['feather', 'shift']) live(name, edges, () => mask?.setEdges(edges))
    for (const name of ['white', 'fringe', 'fade']) live(name, clean, () => mask?.setClean(clean))
    // Before: hold to see the picture as it came in
    const compare = $('[data-cut-compare]')
    compare.addEventListener('pointerdown', () => mask?.setCompare(true))
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) compare.addEventListener(ev, () => mask?.setCompare(false))

    // Esc closes this dialog only and Cmd+Z undoes in here only: the panels behind it listen on the window
    const typing = (e) => e.target.matches?.('input[type="checkbox"]')
    dlg.addEventListener('keydown', (e) => {
      e.stopPropagation()
      const key = e.key.toLowerCase()
      if (e.metaKey || e.ctrlKey) {
        if (key === 'z') { e.preventDefault(); e.shiftKey ? mask?.redo() : mask?.undo() }
        if (key === 'y') { e.preventDefault(); mask?.redo() }
        return
      }
      if (e.code === 'Space' && !typing(e)) { e.preventDefault(); if (!e.repeat) view?.setSpace(true); ring.hidden = true }
      if (key === '[' || key === ']') {
        const now = Number($('[data-cut-esize]').value)
        const step = Math.max(1, Math.round(now * 0.15))
        setEraserSize(key === '[' ? now - step : now + step)
      }
      if (key === '+' || key === '=') view?.zoomBy(ZOOM_STEP)
      if (key === '-') view?.zoomBy(1 / ZOOM_STEP)
      if (key === '0') view?.fit()
    })
    // a focused button would answer Space with a click when it comes up
    dlg.addEventListener('keyup', (e) => { if (e.code === 'Space' && !typing(e)) { e.preventDefault(); view?.setSpace(false) } })

    /** Run a save with the buttons held, a toast on failure; closes on success. */
    const saving = async (button, run) => {
      button.disabled = true
      try {
        const result = await run()
        if (result?.ok === false) throw new Error('refused')
        close()
      } catch {
        button.disabled = false
        say('error', t('The picture could not be saved. Try again.'))
      }
    }
    $('[data-cut-apply]').addEventListener('click', () => mask && saving($('[data-cut-apply]'),
      () => wire.saveEditedImage(target.id, mask.resultDataURL(), {})))
    $('[data-cut-original]').addEventListener('click', () => saving($('[data-cut-original]'),
      () => wire.resetEditedImage(target.id)))
    $('[data-cut-asset]').addEventListener('click', () => {
      const cut = mask?.cutout()
      if (!cut) return
      const from = target.from ? { ...target.from, box_h: cut.box.h, height: cut.height } : {}
      saving($('[data-cut-asset]'), () => wire.saveCutout(cut.dataUrl, target.title || '', from))
    })

    setTool('erase')
    mountQuickMask($('[data-cut-art]'), $('[data-cut-film]'), target.original, refresh, { surface: viewport })
      .then((m) => {
        mask = m
        $('[data-cut-loading]').remove()
        const { w, h } = mask.size
        const stage = $('[data-cut-stage]')
        stage.style.width = `${w}px`
        stage.style.height = `${h}px`
        view = mountPanZoom(viewport, stage, w, h, (v) => { $('[data-cut-fit]').textContent = `${Math.round(v.z * 100)}%` })
        const { size, max } = eraserRange(w, h)
        $('[data-cut-esize]').max = String(max)
        setEraserSize(size)
        ring.hidden = true
        mask.setBrush({ softness: SOFTNESS / 100 })
        mask.setTolerance(TOLERANCE)
        mask.setEverywhere($('[data-cut-everywhere]').checked)
        mask.setBrushSize($('[data-cut-size]').value)
        setTool(tool)
        mask.setClean(clean)   // opens already cleaned: the teacher only nudges
      })
      .catch(() => { close(); say('error', t('This picture cannot be opened here.')) })
  })
  return open
}
