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
 * Bart, 2026-11-06: "image editor, sprite editor and bone editor (these are in the same page) ... a button that shows the
 * rest of the scene too". So one window with one Save, one undo and one way back, and a tab per mode this picture has:
 * Picture always, Frames for an animation (frames-tab.js). A mode other than Picture is
 * { canUndo, canRedo, undo, redo, dirty, save, discard, key, show, hide, destroy }. Show scene: scene-peek.js.
 *
 * Whatever drew the picture sends an `image-edit:open` window event with { id, title, original, el, from }:
 * ArtworkOverlay for a picture layer, the stage25d engine for a 3D layer, a ground band or the sky (`from` names
 * its bundle and library asset, for the cut-out's real size in metres).
 */
import { mountQuickMask, CLEAN_DEFAULTS } from '../scene/quick-mask.js'
import { fromHex, toHex } from '../scene/paint-brush.js'
import { flashTooltip } from '../tooltip.js'
import { mountPanZoom } from './pan-zoom.js'
import { markup, syncSlider, TOOLS, TOLERANCE, SOFTNESS } from './cutout-markup.js'
import { mountFrames } from './frames-tab.js'
import { mountScenePeek } from './scene-peek.js'

const ZOOM_STEP = 1.5
const RING_MS = 700           // how long the eraser's size shows after its slider moved
const MIN_RING_PX = 6         // smaller than this a ring cannot be seen: the tool's own cursor shows instead

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

/** A data url as a short blob: url. Null stays null. */
const blobUrlOf = (dataUrl) => {
  if (!dataUrl) return null
  const [head, body] = dataUrl.split(',')
  return URL.createObjectURL(new Blob([Uint8Array.from(atob(body), (c) => c.charCodeAt(0))], { type: head.slice(5).split(';')[0] }))
}

const words = () => {
  try { return JSON.parse(document.querySelector('[data-cutout-labels]')?.dataset.cutoutLabels || '{}') } catch { return {} }
}

/** Waits for a Livewire call, or for its request to fail: then Livewire's promise never settles, and its raw error box stays away. */
const called = (run) => new Promise((resolve, reject) => {
  const off = window.Livewire?.hook?.('request', ({ fail }) => {
    fail(({ preventDefault }) => { preventDefault?.(); reject(new Error('request failed')) })
  })
  Promise.resolve().then(run).then(resolve, reject).finally(() => off?.())
})

/** A saved picture in the browser's cache before the editor lifts: the stage behind shows it at once. */
const preload = (url) => (url ? Object.assign(new Image(), { src: url }).decode().catch(() => {}) : null)

const say = (type, message) => window.dispatchEvent(new CustomEvent('toast', { detail: { type, message } }))

/** The biggest picture the server takes in one save, in bytes of its data URL (Cutouts::maxPictureBytes). */
const limitBytes = () => Number(document.querySelector('[data-cutout-limit]')?.dataset.cutoutLimit) || Infinity
const MB = 1024 * 1024
const megabytes = (bytes) => (Math.ceil((bytes / MB) * 10) / 10).toLocaleString(document.documentElement.lang || undefined)

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
  root.className = 'fixed inset-0 z-[9000] flex select-none flex-col outline-none'
  root.style.background = 'var(--color-shell)'
  root.tabIndex = -1
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', target.title || t('Picture'))
  root.dataset.cutout = target.id
  const modes = ['picture', ...(target.frames ? ['frames'] : [])]
  // An already cleaned picture starts at 0: cleaning it again would fade the bottom twice. A sheet of frames or a figure's
  // atlas is no picture to clean as one, and on a sky or a landscape white is paint (clouds), not paper.
  const opensCleaned = modes.length === 1 && !target.edited && !target.plain
  const clean = opensCleaned ? { ...CLEAN_DEFAULTS } : { white: 0, fringe: 0, fade: 0 }
  root.innerHTML = markup(t, clean, modes)
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
  let mode = modes.at(-1)   // an animation opens on its frames
  const others = {}         // the modes other than Picture, once made
  const active = () => others[mode] ?? null
  let peek = null

  open = new Promise((resolve) => {
    const ask = $('[data-cut-ask]')
    const asking = () => !ask.hidden

    const keydown = (e) => onKey(e)
    const keyup = (e) => {
      e.stopPropagation()
      if (e.code === 'Space' && !e.target.matches?.('input[type="checkbox"], button')) { e.preventDefault(); view?.setSpace(false) }
    }
    const close = ({ saved = false, pictureSaved = saved } = {}) => {
      window.removeEventListener('keydown', keydown, true)
      window.removeEventListener('keyup', keyup, true)
      if (!saved) for (const other of Object.values(others)) other.discard()
      for (const other of Object.values(others)) other.destroy()
      peek?.destroy({ saved: pictureSaved })
      view?.destroy()
      mask?.destroy()
      root.remove()
      for (const el of behind) el.inert = false
      cameFrom?.focus?.({ preventScroll: true })
      open = null
      resolve()
    }

    // One way back. With work done it asks; without, it leaves at once
    const pictureWork = () => state.canUndo || slid
    const hasWork = () => pictureWork() || Object.values(others).some((other) => other.dirty())
    /** While the question is up, Tab stays in it. */
    const setAsking = (on) => {
      ask.hidden = !on
      for (const el of root.children) if (el !== ask) el.inert = on
    }
    // A button clicked with the mouse gives the keyboard back: Space plays, it does not press that button again
    root.addEventListener('click', (e) => { if (e.detail > 0 && !asking() && e.target.closest?.('button, label') && !e.target.closest('[data-cut-ask]')) root.focus({ preventScroll: true }) })
    const stay = () => { setAsking(false); root.focus(); others[mode]?.show() }
    const leave = () => {
      if (!hasWork()) { close(); return }
      others[mode]?.hide()   // nothing plays behind the question
      setAsking(true)
      $('[data-cut-ask-save]').focus()
    }

    const refresh = (s = {}) => {
      state = { ...state, ...s }
      $('[data-cut-undo]').disabled = !(active()?.canUndo() ?? state.canUndo)
      $('[data-cut-redo]').disabled = !(active()?.canRedo() ?? state.canRedo)
      peek?.pictureChanged()
    }
    const undo = () => (active() ?? mask)?.undo()
    const redo = () => (active() ?? mask)?.redo()

    // the eraser's size on the picture, round the pointer
    const viewport = $('[data-cut-view]')
    const ring = $('[data-cut-ring]')
    const ringPx = () => {
      if (tool === 'brush') return Number($('[data-cut-size]').value)
      return ['erase', 'restore', 'paint', 'clone'].includes(tool) ? Number($('[data-cut-esize]').value) * (view?.view.z ?? 1) : 0
    }
    const showRing = (x, y) => {
      const px = ringPx()
      ring.hidden = px < MIN_RING_PX || !!view?.panning
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
    onSlide('opacity', (v) => mask?.setPaint({ opacity: v / 100 }))
    // the swatch is the browser's own colour picker; the pipette fills it too
    const colourInput = $('[data-cut-colour]')
    colourInput.addEventListener('input', () => mask?.setPaint({ colour: fromHex(colourInput.value) }))
    const picked = (rgb) => {
      colourInput.value = toHex(rgb)
      mask?.setPaint({ colour: rgb })
      setTool('paint')
    }
    // the clone stamp pressed before it knows where to copy from: its tool says how, instead of painting nothing
    const needSource = () => setTimeout(() => flashTooltip(root.querySelector('[data-cut-tool="clone"]'), t('Option/Alt-click where to copy from first.')))
    let frame = 0
    const live = (name, group, apply) => onSlide(name, (v) => {
      group[name] = v
      slid = true
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(apply)
      peek?.pictureChanged()
    })
    for (const name of ['feather', 'shift']) live(name, edges, () => mask?.setEdges(edges))
    for (const name of ['white', 'fringe', 'fade']) live(name, clean, () => mask?.setClean(clean))
    $('[data-cut-everywhere]').addEventListener('change', (e) => mask?.setEverywhere(e.target.checked))

    $('[data-cut-undo]').addEventListener('click', undo)
    $('[data-cut-redo]').addEventListener('click', redo)
    $('[data-cut-zoom-in]').addEventListener('click', () => view?.zoomBy(ZOOM_STEP))
    $('[data-cut-zoom-out]').addEventListener('click', () => view?.zoomBy(1 / ZOOM_STEP))
    $('[data-cut-fit]').addEventListener('click', () => view?.fit())
    $('[data-cut-original]').hidden = !target.edited
    // Before: hold to see the picture as it came in
    const compare = $('[data-cut-compare]')
    compare.addEventListener('pointerdown', () => mask?.setCompare(true))
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) compare.addEventListener(ev, () => mask?.setCompare(false))

    /** A picture larger than the server takes: said plainly, nothing sent, the work stays. */
    const fits = (dataUrl) => {
      if (dataUrl.length <= limitBytes()) return true
      setAsking(false)
      say('error', t('This picture is too big to save here: :size MB, the most is :max MB.').replace(':size', megabytes(dataUrl.length)).replace(':max', megabytes(limitBytes())))
      return false
    }
    /** Run a save with its button held; says so and stays on failure, so no edit is ever lost. True when it worked. */
    const saving = async (button, run) => {
      button.disabled = true
      try {
        const result = await called(run)
        if (result?.ok === false) throw new Error('refused')
        await preload(result?.url)
        return true
      } catch {
        setAsking(false)
        say('error', t('The picture could not be saved. Try again.'))
        return false
      } finally {
        button.disabled = false
      }
    }
    /** The modes' work, one after the other. False: one failed, the window stays with all of it. */
    const saveOthers = async (button) => {
      for (const other of Object.values(others)) {
        if (other.dirty() && !await saving(button, () => other.save())) return false
      }
      return true
    }
    /** One Save for the whole window: each mode, then the picture when it changed (one that opened cleaned has). The picture last: its save rebuilds the stage from the server's copy. */
    const save = async (button) => {
      const modesChanged = Object.values(others).some((other) => other.dirty())
      if (!await saveOthers(button)) return
      const picture = mask && (pictureWork() || opensCleaned)
      const url = picture ? mask.resultDataURL() : null
      if (url && (!fits(url) || !await saving(button, () => wire.saveEditedImage(target.id, url, {})))) return
      if (!picture && modesChanged) say('success', t('Saved.'))
      close({ saved: true, pictureSaved: !!picture })
    }
    $('[data-cut-save]').addEventListener('click', (e) => save(e.currentTarget))
    $('[data-cut-back]').addEventListener('click', leave)
    $('[data-cut-ask-save]').addEventListener('click', (e) => save(e.currentTarget))
    $('[data-cut-ask-discard]').addEventListener('click', () => close())
    for (const b of root.querySelectorAll('[data-cut-ask-stay]')) b.addEventListener('click', stay)
    ask.addEventListener('pointerdown', (e) => { if (e.target === ask) stay() })
    $('[data-cut-original]').addEventListener('click', async (e) => {
      const button = e.currentTarget
      if (await saveOthers(button) && await saving(button, () => wire.resetEditedImage(target.id))) close({ saved: true })
    })
    $('[data-cut-asset]').addEventListener('click', (e) => {
      const cut = mask?.cutout()
      if (!cut || !fits(cut.dataUrl)) return
      const from = target.from ? { ...target.from, box_h: cut.box.h, height: cut.height } : {}
      // an asset of its own, the picture itself untouched: the editor stays, with the work in it
      saving(e.currentTarget, () => wire.saveCutout(cut.dataUrl, target.title || '', from))
    })

    // The window sees a key first: the panels behind listen there too, and none of this is theirs
    const onKey = (e) => {
      e.stopPropagation()
      const key = e.key.toLowerCase()
      if (e.key === 'Escape') { e.preventDefault(); if (!mask?.cancelPress()) asking() ? stay() : leave(); return }
      if (asking()) return
      if (e.metaKey || e.ctrlKey) {
        if (key === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
        if (key === 'y') { e.preventDefault(); redo() }
        return
      }
      if (active()) { if (active().key(e)) e.preventDefault(); return }
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
    /** The picture and its tools, the first time its tab shows. */
    let pictureAsked = false
    const showPicture = () => {
      if (pictureAsked) return
      pictureAsked = true
      mountQuickMask($('[data-cut-art]'), $('[data-cut-film]'), target.original, refresh, { surface: viewport, onPick: picked, onNeedSource: needSource })
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
          mask.setPaint({ colour: fromHex(colourInput.value), opacity: Number($('[data-cut-opacity]').value) / 100 })
          setTool(tool)
          mask.setClean(clean)   // opens already cleaned: the teacher only nudges
          // reopened after a save: Bring back reaches the picture from before any editing, when it can be found
          if (target.edited) wire.originalOfEdited?.(target.id).then((url) => url && mask.setSource(url)).catch(() => {})
          peek?.pictureChanged()
        })
        .catch(() => {
          say('error', t('This picture cannot be opened here.'))
          if (modes.length === 1) close()
          else { pictureAsked = false; setMode(modes.at(-1)) }
        })
    }

    /** What Save would put on the stage: nothing yet when the picture has no work on it, unless it opened cleaned. */
    const pictureNow = () => (mask && (pictureWork() || opensCleaned) ? mask.resultDataURL() : null)
    /** The other tabs draw the picture as it is now, erased but not saved too. A short url: one tile each would repeat a data url. */
    let workUrl = null
    const showPictureWork = (other) => {
      const picture = pictureNow()
      if (!other || (!picture && !workUrl)) return
      if (workUrl) URL.revokeObjectURL(workUrl)
      workUrl = blobUrlOf(picture)
      other.setPicture(workUrl)
    }

    /** Show one mode: its view, its strip and its panel; the others step back. */
    const setMode = (next) => {
      others[mode]?.hide()
      mode = next
      for (const el of root.querySelectorAll('[data-mode-for]')) el.hidden = el.dataset.modeFor !== next
      for (const input of root.querySelectorAll('[name="cut-mode"]')) input.checked = input.value === next
      if (next === 'picture') showPicture()
      else showPictureWork(others[next])
      others[next]?.show()
      refresh()
    }
    for (const input of root.querySelectorAll('[name="cut-mode"]')) input.addEventListener('change', () => { setMode(input.value); root.focus() })

    if (target.stage) {
      peek = mountScenePeek({
        button: $('[data-cut-scene]'), label: $('[data-cut-scene-label]'), pane: $('[data-cut-scene-pane]'), t, stage: target.stage, stageId: target.stageId,
        picture: pictureNow,
      })
    }
    /** A mode's save reaches the server itself, so a failure can be told and the window can stay. */
    const saveLayer = (patch) => wire.saveStage25dLayer(Number(target.stageId.slice('layer-'.length)), patch, target.stage.sceneId)
    if (target.frames) {
      others.frames = mountFrames({
        view: $('[data-slot-view="frames"]'), strip: $('[data-slot-strip="frames"]'), panel: $('[data-slot-panel="frames"]'),
        t, sheet: target.original, frames: target.frames, stage: target.stage, stageId: target.stageId, saveLayer,
        onChange: () => refresh(), onTime: (seconds) => peek?.setTime(seconds),
      })
    }
    setMode(mode)
  })
  return open
}
