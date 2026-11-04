/**
 * cutout-dialog.js — double-click a picture: the picture editor. It opens cleaned and on the eraser; a part can be saved as your own asset.
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
 * Bart, 2026-11-05: "has to look and feel like the rest of the app ... not easy to navigate back ... it misses ux logic".
 * So it is a full window like the lesson editor, not a box over it (cutout-markup.js): back arrow top left, undo, redo and
 * Save top right, tools on a rail, options in an inspector. The back arrow and Esc do one thing: with unsaved work they
 * ask (Save, Discard, Keep editing), without it they leave at once. Not a <dialog>: the top layer would hide the app's
 * one tooltip and its one toast.
 *
 * Whatever drew the picture sends an `image-edit:open` window event with { id, title, original, el, from }:
 * ArtworkOverlay for a picture layer, the stage25d engine for a 3D layer, a ground band or the sky (`from` names
 * its bundle and library asset, for the cut-out's real size in metres).
 */
import { mountQuickMask, CLEAN_DEFAULTS } from '../scene/quick-mask.js'
import { mountPanZoom } from './pan-zoom.js'
import { markup, TOOLS, TOLERANCE, SOFTNESS } from './cutout-markup.js'

const ZOOM_STEP = 1.5
const RING_MS = 700           // how long the eraser's size shows after its slider moved

/** The eraser for a picture this big: its starting size and the largest it goes, in picture pixels. */
export function eraserRange (w, h) {
  const long = Math.max(w, h)
  return { size: Math.max(3, Math.min(60, Math.round(long / 30))), max: Math.max(60, Math.round(long / 5)) }
}

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

/** A slider's readout and rail follow its value (range-fill.js does this for a hand on it, not for code). */
const syncSlider = (input, readout) => {
  const min = Number(input.min), max = Number(input.max)
  readout.textContent = input.value
  input.parentElement.style.setProperty('--range-t', String((Number(input.value) - min) / (max - min)))
}

let open = null

/** Open the picture editor for one picture. Resolves when it closes (saved or not). */
export async function openCutout (target) {
  if (open || !target?.original) return
  const labels = words()
  const t = (en) => labels[en] ?? en
  const wire = wireFor(target.el)
  if (!wire) { say('error', t('This picture cannot be opened here.')); return }

  const cameFrom = document.activeElement
  const root = document.createElement('div')
  root.className = 'fixed inset-0 z-[9000] flex flex-col outline-none'
  root.style.background = 'var(--color-shell)'
  root.tabIndex = -1
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', target.title || t('Picture'))
  root.dataset.cutout = target.id
  // an already cleaned picture starts at 0: cleaning it again would fade the bottom twice
  const clean = target.edited ? { white: 0, fringe: 0, fade: 0 } : { ...CLEAN_DEFAULTS }
  root.innerHTML = markup(t, clean)
  // the app behind takes no keyboard focus while this is up
  const behind = [...document.body.children].filter((el) => !el.inert)
  for (const el of behind) el.inert = true
  document.body.appendChild(root)
  const $ = (sel) => root.querySelector(sel)
  $('[data-cut-title]').textContent = target.title || t('Picture')
  root.focus()

  let mask = null
  let view = null
  let state = { canUndo: false, canRedo: false, selected: false }
  let tool = 'erase'
  let slid = false       // a clean-up or edge slider moved: there is something to lose
  const edges = { feather: 0, shift: 0 }

  open = new Promise((resolve) => {
    const ask = $('[data-cut-ask]')
    const asking = () => !ask.hidden

    const keydown = (e) => onKey(e)
    const keyup = (e) => {
      e.stopPropagation()
      if (e.code === 'Space' && !e.target.matches?.('input[type="checkbox"]')) { e.preventDefault(); view?.setSpace(false) }
    }
    const close = () => {
      window.removeEventListener('keydown', keydown, true)
      window.removeEventListener('keyup', keyup, true)
      view?.destroy()
      mask?.destroy()
      root.remove()
      for (const el of behind) el.inert = false
      cameFrom?.focus?.({ preventScroll: true })
      open = null
      resolve()
    }

    // One way back. With work done it asks; without, it leaves at once
    const hasWork = () => state.canUndo || slid
    const stay = () => { ask.hidden = true; root.focus() }
    const leave = () => {
      if (!hasWork()) { close(); return }
      ask.hidden = false
      $('[data-cut-ask-save]').focus()
    }

    const refresh = (s = {}) => {
      state = { ...state, ...s }
      $('[data-cut-undo]').disabled = !state.canUndo
      $('[data-cut-redo]').disabled = !state.canRedo
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

    const setTool = (next) => {
      tool = next
      if (next !== 'move') mask?.setMode(next)
      view?.setHand(next === 'move')
      for (const input of root.querySelectorAll('[name="cut-tool"]')) input.checked = input.value === next
      for (const el of root.querySelectorAll('[data-cut-for]')) el.hidden = !el.dataset.cutFor.split(' ').includes(next)
      $('[data-cut-tool-name]').textContent = t(TOOLS.find(([value]) => value === next)[1])
      ring.hidden = true
    }
    for (const input of root.querySelectorAll('[name="cut-tool"]')) input.addEventListener('change', () => setTool(input.value))
    // Add / Remove: what the brush does, without a key to hold (Alt still works)
    for (const input of root.querySelectorAll('[data-cut-erase]')) input.addEventListener('change', () => mask?.setErase(input.value === '1'))

    /** A slider: its readout and rail follow, then `apply` with the number. */
    const onSlide = (name, apply) => {
      const input = $(`[data-cut-${name}]`), readout = $(`[data-cut-${name}-value]`)
      input.addEventListener('input', () => { syncSlider(input, readout); apply(Number(input.value)) })
    }
    const setEraserSize = (value) => {
      const input = $('[data-cut-esize]')
      input.value = String(value)
      syncSlider(input, $('[data-cut-esize-value]'))
      mask?.setBrush({ size: Number(input.value) })
      peekRing()
    }
    onSlide('esize', (v) => { mask?.setBrush({ size: v }); peekRing() })
    onSlide('size', (v) => { mask?.setBrushSize(v); peekRing() })
    onSlide('soft', (v) => mask?.setBrush({ softness: v / 100 }))
    onSlide('tol', (v) => mask?.setTolerance(v))
    let frame = 0
    const live = (name, group, apply) => onSlide(name, (v) => {
      group[name] = v
      slid = true
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(apply)
    })
    for (const name of ['feather', 'shift']) live(name, edges, () => mask?.setEdges(edges))
    for (const name of ['white', 'fringe', 'fade']) live(name, clean, () => mask?.setClean(clean))
    $('[data-cut-everywhere]').addEventListener('change', (e) => mask?.setEverywhere(e.target.checked))

    $('[data-cut-undo]').addEventListener('click', () => mask?.undo())
    $('[data-cut-redo]').addEventListener('click', () => mask?.redo())
    $('[data-cut-zoom-in]').addEventListener('click', () => view?.zoomBy(ZOOM_STEP))
    $('[data-cut-zoom-out]').addEventListener('click', () => view?.zoomBy(1 / ZOOM_STEP))
    $('[data-cut-fit]').addEventListener('click', () => view?.fit())
    $('[data-cut-original]').hidden = !target.edited
    // Before: hold to see the picture as it came in
    const compare = $('[data-cut-compare]')
    compare.addEventListener('pointerdown', () => mask?.setCompare(true))
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) compare.addEventListener(ev, () => mask?.setCompare(false))

    /** Run a save with its button held; closes on success, says so and stays on failure. No edit is ever lost. */
    const saving = async (button, run) => {
      button.disabled = true
      try {
        const result = await run()
        if (result?.ok === false) throw new Error('refused')
        close()
      } catch {
        button.disabled = false
        ask.hidden = true
        say('error', t('The picture could not be saved. Try again.'))
      }
    }
    const save = (button) => mask && saving(button, () => wire.saveEditedImage(target.id, mask.resultDataURL(), {}))
    $('[data-cut-save]').addEventListener('click', (e) => save(e.currentTarget))
    $('[data-cut-back]').addEventListener('click', leave)
    $('[data-cut-ask-save]').addEventListener('click', (e) => save(e.currentTarget))
    $('[data-cut-ask-discard]').addEventListener('click', close)
    for (const b of root.querySelectorAll('[data-cut-ask-stay]')) b.addEventListener('click', stay)
    ask.addEventListener('pointerdown', (e) => { if (e.target === ask) stay() })
    $('[data-cut-original]').addEventListener('click', (e) => saving(e.currentTarget, () => wire.resetEditedImage(target.id)))
    $('[data-cut-asset]').addEventListener('click', (e) => {
      const cut = mask?.cutout()
      if (!cut) return
      const from = target.from ? { ...target.from, box_h: cut.box.h, height: cut.height } : {}
      saving(e.currentTarget, () => wire.saveCutout(cut.dataUrl, target.title || '', from))
    })

    // The window sees a key first: the panels behind listen there too, and none of this is theirs
    const onKey = (e) => {
      e.stopPropagation()
      const key = e.key.toLowerCase()
      if (e.key === 'Escape') { e.preventDefault(); asking() ? stay() : leave(); return }
      if (asking()) return
      if (e.metaKey || e.ctrlKey) {
        if (key === 'z') { e.preventDefault(); e.shiftKey ? mask?.redo() : mask?.undo() }
        if (key === 'y') { e.preventDefault(); mask?.redo() }
        return
      }
      if (e.code === 'Space' && !e.target.matches?.('input[type="checkbox"]')) { e.preventDefault(); if (!e.repeat) view?.setSpace(true); ring.hidden = true }
      if (key === '[' || key === ']') {
        const now = Number($('[data-cut-esize]').value)
        const step = Math.max(1, Math.round(now * 0.15))
        setEraserSize(key === '[' ? now - step : now + step)
      }
      if (key === '+' || key === '=') view?.zoomBy(ZOOM_STEP)
      if (key === '-') view?.zoomBy(1 / ZOOM_STEP)
      if (key === '0') view?.fit()
      const shortcut = TOOLS.find(([, , k]) => k.toLowerCase() === key)
      if (shortcut) setTool(shortcut[0])
    }
    window.addEventListener('keydown', keydown, true)
    window.addEventListener('keyup', keyup, true)

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
        // reopened after a save: Bring back reaches the picture from before any editing, when it can be found
        if (target.edited) wire.originalOfEdited?.(target.id).then((url) => url && mask.setSource(url)).catch(() => {})
      })
      .catch(() => { close(); say('error', t('This picture cannot be opened here.')) })
  })
  return open
}
