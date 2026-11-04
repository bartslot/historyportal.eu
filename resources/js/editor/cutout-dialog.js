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
 * Whatever drew the picture sends an `image-edit:open` window event with { id, title, original, el, from }:
 * ArtworkOverlay for a picture layer, the stage25d engine for a 3D layer, a ground band or the sky (`from` names
 * its bundle and library asset, for the cut-out's real size in metres).
 */
import { mountQuickMask, MAX_FEATHER, MAX_SHIFT, CLEAN_DEFAULTS } from '../scene/quick-mask.js'

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

/** The dialog's markup, in the page's words (t). */
function markup (t) {
  return `
  <div class="modal-box flex max-h-[94vh] w-[min(94vw,72rem)] max-w-none flex-col gap-3 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-4">
    <div class="flex items-center gap-3">
      <h3 class="min-w-0 flex-1 truncate text-sm font-semibold" data-cut-title></h3>
      <button type="button" class="btn btn-ghost btn-sm btn-square" data-cut-close aria-label="${t('Close')}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="relative grid min-h-0 flex-1 place-items-center overflow-hidden rounded"
         style="background: repeating-conic-gradient(var(--color-base-300) 0 25%, var(--color-base-200) 0 50%) 0 0 / 20px 20px;">
      <div class="relative max-h-full max-w-full" data-cut-stage>
        <canvas data-cut-art class="block h-auto max-h-[52vh] w-auto max-w-full touch-none"></canvas>
        <canvas data-cut-film class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
      </div>
      <span class="loading loading-spinner loading-md absolute" data-cut-loading></span>
    </div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2" data-cut-clean>
      ${slider('white', t('White holes'), 0, 100, CLEAN_DEFAULTS.white)}
      ${slider('fringe', t('White edges'), 0, 10, CLEAN_DEFAULTS.fringe, 'px')}
      ${slider('fade', t('Soft bottom'), 0, 200, CLEAN_DEFAULTS.fade, 'px')}
      <button type="button" class="btn btn-ghost btn-sm" data-cut-compare>${t('Before')}</button>
    </div>
    <details class="rounded-box border border-base-300 px-3 py-2" data-cut-advanced>
      <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-panel-label">${t('Advanced')}</summary>
      <div class="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div class="join" role="group" aria-label="${t('Select')}">
          <button type="button" class="btn btn-sm join-item" data-cut-mode="brush">${t('Brush')}</button>
          <button type="button" class="btn btn-sm join-item" data-cut-mode="colour">${t('Colour')}</button>
        </div>
        <div class="join" role="group" data-cut-brush-only>
          <button type="button" class="btn btn-sm join-item btn-primary" data-cut-erase="0">${t('Add')}</button>
          <button type="button" class="btn btn-sm join-item" data-cut-erase="1">${t('Remove')}</button>
        </div>
        <span data-cut-brush-only>${slider('size', t('Brush size'), 8, 160, 40, 'px')}</span>
        <label class="flex cursor-pointer items-center gap-2 text-sm" data-cut-colour-only hidden>
          <input type="checkbox" class="checkbox checkbox-sm checkbox-primary" data-cut-everywhere>${t('Everywhere')}
        </label>
        ${slider('feather', t('Soft edge'), 0, MAX_FEATHER, 0, 'px')}
        ${slider('shift', t('Edge'), -MAX_SHIFT, MAX_SHIFT, 0, 'px')}
        <span class="text-sm tabular-nums text-base-content/70" data-cut-tolerance hidden></span>
        <button type="button" class="btn btn-outline btn-sm" data-cut-undo disabled>${t('Undo')}</button>
      </div>
    </details>
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="btn btn-ghost btn-sm" data-cut-original hidden>${t('Back to the original')}</button>
      <span class="flex-1"></span>
      <button type="button" class="btn btn-ghost btn-sm" data-cut-cancel>${t('Cancel')}</button>
      <button type="button" class="btn btn-sm" data-cut-asset>${t('Save as asset')}</button>
      <button type="button" class="btn btn-primary btn-sm" data-cut-apply>${t('Apply')}</button>
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button>${t('Close')}</button></form>`
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
  dlg.innerHTML = markup(t)
  document.body.appendChild(dlg)
  const $ = (sel) => dlg.querySelector(sel)
  $('[data-cut-title]').textContent = target.title || t('Cut out')
  dlg.showModal()

  let mask = null
  let state = { canUndo: false, selected: false }
  let mode = 'brush'
  const edges = { feather: 0, shift: 0 }
  const clean = { ...CLEAN_DEFAULTS }

  open = new Promise((resolve) => {
    const close = () => {
      mask?.destroy()
      dlg.close()
      dlg.remove()
      open = null
      resolve()
    }
    dlg.addEventListener('close', () => { if (open) close() })
    // Esc closes this dialog only: the panels behind it listen on the window
    dlg.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation() } })

    const refresh = (s = {}) => {
      state = { ...state, ...s }
      $('[data-cut-undo]').disabled = !state.canUndo
      const tol = $('[data-cut-tolerance]')
      tol.hidden = s.tolerance == null
      if (s.tolerance != null) tol.textContent = `${t('Tolerance')} ${s.tolerance}`
    }
    const setMode = (next) => {
      mode = next
      mask?.setMode(next)
      for (const b of dlg.querySelectorAll('[data-cut-mode]')) {
        const on = b.dataset.cutMode === next
        b.classList.toggle('btn-primary', on)
        b.setAttribute('aria-pressed', on ? 'true' : 'false')
      }
      for (const el of dlg.querySelectorAll('[data-cut-brush-only]')) el.hidden = next !== 'brush'
      $('[data-cut-colour-only]').hidden = next !== 'colour'
    }

    for (const b of dlg.querySelectorAll('[data-cut-mode]')) b.addEventListener('click', () => setMode(b.dataset.cutMode))
    // Add / Remove: what the brush does, without a key to hold (Alt still works)
    for (const b of dlg.querySelectorAll('[data-cut-erase]')) {
      b.addEventListener('click', () => {
        mask?.setErase(b.dataset.cutErase === '1')
        for (const o of dlg.querySelectorAll('[data-cut-erase]')) o.classList.toggle('btn-primary', o === b)
      })
    }
    $('[data-cut-close]').addEventListener('click', close)
    $('[data-cut-cancel]').addEventListener('click', close)
    $('[data-cut-undo]').addEventListener('click', () => mask?.undo())
    $('[data-cut-original]').hidden = !target.edited
    $('[data-cut-everywhere]').addEventListener('change', (e) => mask?.setEverywhere(e.target.checked))
    $('[data-cut-size]').addEventListener('input', (e) => { mask?.setBrushSize(e.target.value); $('[data-cut-size-value]').textContent = e.target.value })
    let frame = 0
    const live = (name, group, apply) => $(`[data-cut-${name}]`).addEventListener('input', (e) => {
      group[name] = Number(e.target.value)
      $(`[data-cut-${name}-value]`).textContent = String(group[name])
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(apply)
    })
    for (const name of ['feather', 'shift']) live(name, edges, () => mask?.setEdges(edges))
    for (const name of ['white', 'fringe', 'fade']) live(name, clean, () => mask?.setClean(clean))
    // Before: hold to see the picture as it came in
    const before = (on) => { if (mask) mask.setClean(on ? { white: 0, fringe: 0, fade: 0 } : clean) }
    const compare = $('[data-cut-compare]')
    compare.addEventListener('pointerdown', () => before(true))
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) compare.addEventListener(ev, () => before(false))

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

    setMode('brush')
    mountQuickMask($('[data-cut-art]'), $('[data-cut-film]'), target.original, refresh)
      .then((m) => {
        mask = m
        $('[data-cut-loading]').remove()
        mask.setMode(mode)
        mask.setBrushSize($('[data-cut-size]').value)
        mask.setClean(clean)   // opens already cleaned: the teacher only nudges
      })
      .catch(() => { close(); say('error', t('This picture cannot be opened here.')) })
  })
  return open
}

/** Listen for double-clicks on pictures (the `image-edit:open` event) once per page. */
export function installCutout () {
  if (window.__cutoutInstalled) return
  window.__cutoutInstalled = true
  window.addEventListener('image-edit:open', (e) => { openCutout(e.detail) })
}
