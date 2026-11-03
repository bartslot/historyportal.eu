/**
 * photo-editor-mask.js — Quick mask inside the image editor (Bart, 2026-11-03: "we need a quick mask tool that we
 * already have in this setting ... and mask edges too").
 *
 * Not a second masking tool: it mounts the one the layer panel already has (scene/quick-mask.js, Keynote's Instant
 * Alpha: press on a colour and drag, release cuts it out, Alt+press brings it back) over the editor, on the picture
 * as it is edited right now, and adds the edge: Soft edge (feather) and Edge (shrink or grow), both live.
 */
import { mountQuickMask, MAX_FEATHER, MAX_SHIFT } from '../scene/quick-mask.js'

const range = (name, label, min, max) => `
  <label class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
    <span class="w-24 shrink-0">${label}</span>
    <input type="range" min="${min}" max="${max}" step="1" value="0" class="range range-xs range-primary w-40" data-mask-${name}>
    <span class="w-6 text-right text-sm font-medium normal-case text-base-content" data-mask-${name}-value>0</span>
  </label>`

/**
 * Show the mask view over the editor. `src` is the picture to mask (a data URL of the current edit, or a URL);
 * `onSave(dataUrl)` resolves true when stored; `onBack()` returns to the editor. Returns a remover.
 */
export async function openMaskView (root, { src, t, onSave, onBack }) {
  const view = document.createElement('div')
  view.dataset.photoEditorMask = ''
  view.className = 'absolute inset-0 z-[100] flex flex-col bg-base-100'   // over all of Filerobot, its X too
  view.innerHTML = `
    <div class="relative grid min-h-0 flex-1 place-items-center overflow-hidden p-4"
         style="background: repeating-conic-gradient(var(--color-base-300) 0 25%, var(--color-base-200) 0 50%) 0 0 / 20px 20px;">
      <div class="relative max-h-full max-w-full">
        <canvas data-mask-art class="block h-auto max-h-[calc(100vh-10rem)] w-auto max-w-full cursor-crosshair touch-none"></canvas>
        <canvas data-mask-film class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-base-300 px-4 py-3">
      <button type="button" class="btn btn-ghost btn-sm text-sm" data-mask-undo disabled></button>
      <button type="button" class="btn btn-ghost btn-sm text-sm" data-mask-reset></button>
      ${range('feather', t('Soft edge'), 0, MAX_FEATHER)}
      ${range('shift', t('Edge'), -MAX_SHIFT, MAX_SHIFT)}
      <span class="text-sm tabular-nums text-base-content/70" data-mask-tolerance hidden></span>
      <span class="flex-1"></span>
      <button type="button" class="btn btn-ghost btn-sm text-sm" data-mask-back></button>
      <button type="button" class="btn btn-primary btn-sm text-sm" data-mask-save disabled></button>
    </div>`
  const $ = (sel) => view.querySelector(sel)
  $('[data-mask-undo]').textContent = t('Undo')
  $('[data-mask-reset]').textContent = t('Reset')
  $('[data-mask-back]').textContent = t('Back')
  $('[data-mask-save]').textContent = t('Save')
  root.appendChild(view)

  let changed = false
  const edges = { feather: 0, shift: 0 }
  const refresh = (s = {}) => {
    if (s.canUndo !== undefined) $('[data-mask-undo]').disabled = !s.canUndo
    changed = !!s.canUndo || edges.feather !== 0 || edges.shift !== 0
    $('[data-mask-save]').disabled = !changed
    const tol = $('[data-mask-tolerance]')
    tol.hidden = s.tolerance == null
    if (s.tolerance != null) tol.textContent = `${t('Tolerance')} ${s.tolerance}`
  }

  let mask
  try {
    mask = await mountQuickMask($('[data-mask-art]'), $('[data-mask-film]'), src, refresh)
  } catch {
    view.remove()
    throw new Error('mask')
  }

  let frame = 0
  for (const name of ['feather', 'shift']) {
    $(`[data-mask-${name}]`).addEventListener('input', (e) => {
      edges[name] = Number(e.target.value)
      $(`[data-mask-${name}-value]`).textContent = String(edges[name])
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => { mask.setEdges(edges); refresh({ canUndo: !$('[data-mask-undo]').disabled }) })
    })
  }
  $('[data-mask-undo]').addEventListener('click', () => mask.undo())
  $('[data-mask-reset]').addEventListener('click', () => {
    mask.reset()
    for (const name of ['feather', 'shift']) { edges[name] = 0; $(`[data-mask-${name}]`).value = '0'; $(`[data-mask-${name}-value]`).textContent = '0' }
    mask.setEdges(edges)
    refresh({ canUndo: true })
  })
  const remove = () => { cancelAnimationFrame(frame); mask.destroy(); view.remove() }
  $('[data-mask-back]').addEventListener('click', () => { remove(); onBack() })
  $('[data-mask-save]').addEventListener('click', async () => {
    if (!changed) return
    $('[data-mask-save]').disabled = true
    if (await onSave(mask.toDataURL())) remove()
    else $('[data-mask-save]').disabled = false
  })
  return remove
}
