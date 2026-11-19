/**
 * cutout-markup.js — what the picture editor looks like: the lesson editor's own shell, built from the same parts. The
 * circular back arrow top left, the actions top right, a tool rail (the inspector's tabs-box, on end), an inspector panel
 * of slider rows (<x-ui.slider-row>'s classes), a hairline and no shadow. Strings come in through t(), from Cutouts::labels.
 */
import { MAX_FEATHER, MAX_SHIFT } from '../scene/quick-mask.js'
import { UI_ICONS, uiIcon } from '../ui/icons.js'

/** The see-through checkers behind a picture. */
const CHECKERS = 'border-color: var(--color-panel-border); background: repeating-conic-gradient(var(--color-base-300) 0 25%, var(--color-base-200) 0 50%) 0 0 / 20px 20px;'

export const TOLERANCE = 30       // of a colour's 0..255 distance: paper with its noise, not the skin beside it
export const MAX_TOLERANCE = 120
export const SOFTNESS = 20        // % of the eraser that fades

/**
 * An icon by its meaning (a file in resources/ui-icons, see ui/icons.js). A string that is no icon's name is drawn as a
 * 24 px outline path, for the few callers that still pass one.
 */
export const icon = (name, size = 'h-5 w-5') => UI_ICONS[name]
  ? uiIcon(name, size)
  : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="${size}" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${name}"/></svg>`

/** The picture editor's icons, key → the icon's name in resources/ui-icons. */
export const ICONS = {
  paint: 'paint',
  pipette: 'pipette',
  clone: 'clone',
  eye: 'show-scene',
  play: 'play',
  pause: 'pause',
  duplicate: 'duplicate',
  trash: 'delete',
  back: 'back',
  close: 'close',
  undo: 'undo',
  redo: 'redo',
  zoomIn: 'zoom-in',
  zoomOut: 'zoom-out',
  erase: 'erase',
  restore: 'restore',
  colour: 'remove-colour',
  brush: 'select-part',
  move: 'move',
}

/** The tools on the rail, in order: [value, label, shortcut]. */
export const TOOLS = [
  ['erase', 'Erase', 'E'],
  ['restore', 'Bring back', 'B'],
  ['paint', 'Paint', 'P'],
  ['pipette', 'Pipette', 'I'],
  ['clone', 'Clone stamp', 'K'],
  ['colour', 'Remove colour', 'W'],
  ['brush', 'Select a part', 'S'],
  ['move', 'Hand', 'H'],
]

/** A slider's readout and rail follow its value (range-fill.js does this for a hand on it, not for code). */
export const syncSlider = (input, readout) => {
  const min = Number(input.min), max = Number(input.max)
  readout.textContent = input.value
  input.parentElement.style.setProperty('--range-t', String((Number(input.value) - min) / (max - min)))
}

/** One <x-ui.slider-row>: label, rail, value. */
export const slider = (name, label, min, max, value, unit = '') => `
  <label class="flex h-8 items-center gap-2">
    <span class="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">${label}</span>
    <span class="range-panel-knob min-w-0 flex-1" style="--range-t: ${(value - min) / (max - min)}">
      <input type="range" min="${min}" max="${max}" step="1" value="${value}" class="range range-panel" aria-label="${label}" data-cut-${name}>
    </span>
    <span class="w-7 text-right text-xs tabular-nums text-panel-value" data-cut-${name}-value>${value}</span><span class="w-4 text-xs text-panel-label">${unit}</span>
  </label>`

export const iconButton = (attr, label, d, key = '') => `
  <button type="button" class="btn btn-ghost btn-sm btn-square" ${attr} data-tooltip="${label}" ${key ? `data-tooltip-key="${key}"` : ''} aria-label="${label}">${icon(d)}</button>`

/** The modes of one editor, in tab order: [value, label]. */
export const MODES = [['character', 'Character'], ['picture', 'Picture'], ['frames', 'Frames']]

/** The whole editor, in the page's words (t), with the clean-up at these strengths. Tabs show when it has more than one mode. */
export function markup (t, clean, modes = ['picture']) {
  const extra = modes.filter((m) => m !== 'picture')
  return `
  <header class="relative flex h-14 shrink-0 items-center gap-2 pl-14 pr-3">
    <button type="button" class="btn btn-circle btn-sm absolute left-3 top-3 border-0 bg-transparent shadow-none hover:bg-white/10"
            data-cut-back data-tooltip="${t('Back to the scene')}" data-tooltip-key="Esc" aria-label="${t('Back to the scene')}">${icon(ICONS.back)}</button>
    <h2 class="min-w-0 flex-1 truncate text-sm font-semibold text-panel-value" data-cut-title></h2>
    ${modes.length > 1 ? `<div class="tabs tabs-box tabs-sm absolute left-1/2 top-2 -translate-x-1/2" role="radiogroup" aria-label="${t('Picture')}">
      ${MODES.filter(([value]) => modes.includes(value)).map(([value, label]) => `<input type="radio" name="cut-mode" value="${value}" class="tab" aria-label="${t(label)}">`).join('')}
    </div>` : ''}
    <button type="button" class="btn btn-ghost btn-sm mr-1" data-cut-scene aria-pressed="false" hidden>${icon(ICONS.eye)}<span data-cut-scene-label>${t('Show scene')}</span></button>
    ${iconButton('data-cut-undo disabled', t('Undo'), ICONS.undo, 'Cmd Z')}
    ${iconButton('data-cut-redo disabled', t('Redo'), ICONS.redo, 'Shift Cmd Z')}
    <button type="button" class="btn btn-primary btn-sm ml-1" data-cut-save>${t('Save')}</button>
  </header>
  <div class="flex min-h-0 flex-1 gap-2 px-2 pb-2">
    <div class="flex w-12 shrink-0 flex-col justify-between gap-2" data-mode-for="picture">
      <div class="tabs tabs-box flex-col" role="radiogroup" aria-label="${t('Tools')}">
        ${TOOLS.map(([value, label, key]) => `
        <label class="tab px-0" style="flex: none; height: 2.75rem;" data-cut-tool="${value}" data-tooltip="${t(label)}" data-tooltip-key="${key}" data-tooltip-placement="bottom">
          <input type="radio" name="cut-tool" value="${value}" class="sr-only" aria-label="${t(label)}">${icon(ICONS[value])}
        </label>`).join('')}
      </div>
      <div class="mb-10 flex flex-col items-center gap-1">
        ${iconButton('data-cut-zoom-in', t('Zoom in'), ICONS.zoomIn, '+')}
        <button type="button" class="btn btn-ghost btn-sm w-full px-0 text-xs tabular-nums" data-cut-fit data-tooltip="${t('Fit')}" data-tooltip-key="0" aria-label="${t('Fit')}">100%</button>
        ${iconButton('data-cut-zoom-out', t('Zoom out'), ICONS.zoomOut, '-')}
      </div>
    </div>
    <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
    <div class="flex min-h-0 min-w-0 flex-1 gap-2">
    <div class="relative min-h-0 min-w-0 flex-1 touch-none overflow-hidden rounded-lg border" data-cut-view data-mode-for="picture"
         style="${CHECKERS}">
      <div class="absolute left-0 top-0 origin-top-left" data-cut-stage>
        <canvas data-cut-art class="block h-full w-full"></canvas>
        <canvas data-cut-film class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
      </div>
      <div class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full" style="border: 1px solid #fff; outline: 1px solid #000;" data-cut-ring hidden><canvas class="block h-full w-full" data-cut-ring-preview hidden></canvas></div>
      <div class="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2" data-cut-source hidden><svg viewBox="0 0 16 16" class="size-4 overflow-visible"><path d="M8 0v16M0 8h16" stroke="#000" stroke-width="3"/><path d="M8 0v16M0 8h16" stroke="#fff" stroke-width="1.25"/></svg></div>
      <span class="loading loading-spinner loading-md absolute left-1/2 top-1/2" data-cut-loading></span>
    </div>
    ${extra.map((m) => `<div class="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border" data-mode-for="${m}" data-slot-view="${m}" style="${CHECKERS}" hidden></div>`).join('')}
    <div class="min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border" style="border-color: var(--color-panel-border); background: var(--color-shell);" data-cut-scene-pane hidden>
      <canvas class="block h-full w-full object-contain"></canvas>
    </div>
    </div>
    ${extra.map((m) => `<div data-mode-for="${m}" data-slot-strip="${m}" hidden></div>`).join('')}
    </div>
    <aside class="flex w-80 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border p-3" style="border-color: var(--color-panel-border); background: var(--color-panel);">
      ${extra.map((m) => `<div class="flex flex-1 flex-col gap-3" data-mode-for="${m}" data-slot-panel="${m}" hidden></div>`).join('')}
      <div class="flex flex-1 flex-col gap-3" data-mode-for="picture">
      <div class="flex flex-col gap-1">
        <h3 class="pb-1 text-sm font-semibold text-panel-value" data-cut-tool-name></h3>
        <div data-cut-for="paint" hidden>
          <label class="flex h-8 items-center gap-2">
            <span class="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">${t('Colour')}</span>
            <input type="color" value="#0f172a" class="h-8 w-14 cursor-pointer rounded border bg-transparent p-0.5" style="border-color: var(--color-panel-border);" aria-label="${t('Colour')}" data-cut-colour>
          </label>
        </div>
        <div data-cut-for="erase restore paint clone">
          ${slider('esize', t('Size'), 1, 60, 12, 'px')}
          ${slider('soft', t('Softness'), 0, 100, SOFTNESS, '%')}
        </div>
        <div data-cut-for="paint clone" hidden>
          ${slider('opacity', t('Opacity'), 1, 100, 100, '%')}
        </div>
        <p class="text-xs text-panel-hint" data-cut-for="clone" hidden>${t('Option/Alt-click where to copy from, then paint.')}</p>
        <p class="text-xs text-panel-hint" data-cut-for="pipette" hidden>${t('Click a colour in the picture to paint with it.')}</p>
        <p class="text-xs text-panel-hint" data-cut-for="colour" hidden>${t('Press on a colour and drag to take more of it.')}</p>
        <div data-cut-for="colour" hidden>
          ${slider('tol', t('Tolerance'), 1, MAX_TOLERANCE, TOLERANCE)}
          <label class="flex h-8 cursor-pointer items-center gap-2 text-sm text-panel-value">
            <input type="checkbox" class="checkbox checkbox-sm" data-cut-everywhere>${t('Everywhere')}
          </label>
        </div>
        <div data-cut-for="brush" hidden>
          <div class="tabs tabs-box tabs-sm mb-1" role="radiogroup" aria-label="${t('Select a part')}">
            <input type="radio" name="cut-erase" value="0" class="tab" aria-label="${t('Add')}" data-cut-erase checked>
            <input type="radio" name="cut-erase" value="1" class="tab" aria-label="${t('Remove')}" data-cut-erase>
          </div>
          ${slider('size', t('Brush size'), 8, 160, 40, 'px')}
          ${slider('feather', t('Soft edge'), 0, MAX_FEATHER, 0, 'px')}
          ${slider('shift', t('Edge'), -MAX_SHIFT, MAX_SHIFT, 0, 'px')}
        </div>
      </div>
      <div class="flex flex-col gap-1 border-t pt-3" style="border-color: var(--color-panel-border);" data-cut-clean>
        <h3 class="pb-1 text-sm font-semibold text-panel-value">${t('Clean up')}</h3>
        ${slider('white', t('White holes'), 0, 100, clean.white)}
        ${slider('fringe', t('White edges'), 0, 10, clean.fringe, 'px')}
        ${slider('fade', t('Soft bottom'), 0, 200, clean.fade, 'px')}
        <button type="button" class="btn btn-sm mt-1" data-cut-compare>${t('Before')}</button>
      </div>
      <span class="flex-1"></span>
      <div class="flex flex-col gap-2 border-t pt-3" style="border-color: var(--color-panel-border);">
        <div class="flex flex-col gap-1" data-cut-layer-box hidden>
          <button type="button" class="btn btn-sm" data-cut-layer disabled data-tooltip="${t('The part you selected becomes a layer of its own, in the same place.')}">${t('Make a layer')}</button>
          <label class="flex min-h-8 cursor-pointer items-center justify-between gap-2 text-sm text-panel-value" data-tooltip="${t('Paints the spot it leaves from what is round it. The original picture is kept.')}">
            <span>${t('Fill behind')}</span>
            <input type="checkbox" class="toggle toggle-sm" data-cut-fill checked>
          </label>
        </div>
        <button type="button" class="btn btn-sm" data-cut-asset>${t('Save as asset')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-cut-original hidden>${t('Back to the original')}</button>
      </div>
      </div>
    </aside>
  </div>
  <div class="modal modal-open" role="alertdialog" aria-modal="true" aria-labelledby="cut-ask-title" data-cut-ask hidden>
    <div class="modal-box hp-modals max-w-md border" style="border-color: var(--color-panel-border);">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-panel-value" id="cut-ask-title">${t('Save your changes?')}</h2>
        <button type="button" class="btn btn-ghost btn-sm btn-circle text-panel-hint" data-cut-ask-stay aria-label="${t('Close')}">${icon(ICONS.close)}</button>
      </div>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" data-cut-ask-stay>${t('Keep editing')}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-cut-ask-discard>${t('Discard')}</button>
        <button type="button" class="btn btn-primary btn-sm" data-cut-ask-save>${t('Save')}</button>
      </div>
    </div>
  </div>`
}
