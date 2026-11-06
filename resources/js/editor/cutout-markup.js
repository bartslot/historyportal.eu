/**
 * cutout-markup.js — what the picture editor looks like: the lesson editor's own shell, built from the same parts. The
 * circular back arrow top left, the actions top right, a tool rail (the inspector's tabs-box, on end), an inspector panel
 * of slider rows (<x-ui.slider-row>'s classes), a hairline and no shadow. Strings come in through t(), from Cutouts::labels.
 */
import { MAX_FEATHER, MAX_SHIFT } from '../scene/quick-mask.js'

/** The see-through checkers behind a picture. */
const CHECKERS = 'border-color: var(--color-panel-border); background: repeating-conic-gradient(var(--color-base-300) 0 25%, var(--color-base-200) 0 50%) 0 0 / 20px 20px;'

export const TOLERANCE = 30       // of a colour's 0..255 distance: paper with its noise, not the skin beside it
export const MAX_TOLERANCE = 120
export const SOFTNESS = 20        // % of the eraser that fades

export const icon = (d, size = 'h-5 w-5') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="${size}" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="${d}"/></svg>`

// Heroicons outline; Heroicons has no eraser, so that one is drawn on the same grid and stroke
export const ICONS = {
  eye: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  play: 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z',
  pause: 'M15.75 5.25v13.5m-7.5-13.5v13.5',
  duplicate: 'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75',
  trash: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
  back: 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18',
  close: 'M6 18 18 6M6 6l12 12',
  undo: 'M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3',
  redo: 'm15 15 6-6m0 0-6-6m6 6H9a6 6 0 0 0 0 12h3',
  zoomIn: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6',
  zoomOut: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6',
  erase: 'm9 19.5-4.4-4.4a1.5 1.5 0 0 1 0-2.1l8.5-8.5a1.5 1.5 0 0 1 2.1 0l4.8 4.8a1.5 1.5 0 0 1 0 2.1L11 19.5H9Zm0 0h11M8.5 9l6.5 6.5',
  restore: 'M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42',
  colour: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
  brush: 'm7.848 8.25 1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3Zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3Zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664',
  move: 'M10.05 4.575a1.575 1.575 0 1 0-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 0 1 3.15 0v1.5m-3.15 0 .075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 0 1 3.15 0V15M6.9 7.575a1.575 1.575 0 1 0-3.15 0v8.175a6.75 6.75 0 0 0 6.75 6.75h2.018a5.25 5.25 0 0 0 3.712-1.538l1.732-1.732a5.25 5.25 0 0 0 1.538-3.712l.003-2.024a.668.668 0 0 1 .198-.471 1.575 1.575 0 1 0-2.228-2.228 3.818 3.818 0 0 0-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0 1 16.35 15m.002 0h-.002',
}

/** The tools on the rail, in order: [value, label, shortcut]. */
export const TOOLS = [
  ['erase', 'Erase', 'E'],
  ['restore', 'Bring back', 'B'],
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
  <label class="flex items-center gap-2 py-1">
    <span class="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">${label}</span>
    <span class="range-panel-knob min-w-0 flex-1" style="--range-t: ${(value - min) / (max - min)}">
      <input type="range" min="${min}" max="${max}" step="1" value="${value}" class="range range-panel" aria-label="${label}" data-cut-${name}>
    </span>
    <span class="w-7 text-right text-xs tabular-nums text-panel-value" data-cut-${name}-value>${value}</span><span class="w-4 text-xs text-panel-label">${unit}</span>
  </label>`

export const iconButton = (attr, label, d, key = '') => `
  <button type="button" class="btn btn-ghost btn-sm btn-square" ${attr} data-tooltip="${label}" ${key ? `data-tooltip-key="${key}"` : ''} aria-label="${label}">${icon(d)}</button>`

/** The modes of one editor, in tab order: [value, label]. */
export const MODES = [['picture', 'Picture'], ['frames', 'Frames'], ['bones', 'Bones']]

/** The whole editor, in the page's words (t), with the clean-up at these strengths. Tabs show when it has more than one mode. */
export function markup (t, clean, modes = ['picture']) {
  const extra = modes.filter((m) => m !== 'picture')
  return `
  <header class="relative flex h-14 shrink-0 items-center gap-2 pl-14 pr-3">
    <button type="button" class="btn btn-circle btn-sm absolute left-3 top-3 border-0 bg-transparent shadow-none hover:bg-white/10"
            data-cut-back data-tooltip="${t('Back to the scene')}" data-tooltip-key="Esc" aria-label="${t('Back to the scene')}">${icon(ICONS.back)}</button>
    <h2 class="min-w-0 flex-1 truncate text-sm font-semibold text-panel-value" data-cut-title></h2>
    ${extra.length ? `<div class="tabs tabs-box tabs-sm absolute left-1/2 top-2 -translate-x-1/2" role="radiogroup" aria-label="${t('Picture')}">
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
        <label class="tab px-0" style="flex: none; height: 2.5rem;" data-cut-tool="${value}" data-tooltip="${t(label)}" data-tooltip-key="${key}" data-tooltip-placement="bottom">
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
      <div class="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full" style="border: 1px solid #fff; outline: 1px solid #000;" data-cut-ring hidden></div>
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
        <div data-cut-for="erase restore">
          ${slider('esize', t('Size'), 1, 60, 12, 'px')}
          ${slider('soft', t('Softness'), 0, 100, SOFTNESS, '%')}
        </div>
        <div data-cut-for="colour" hidden>
          ${slider('tol', t('Tolerance'), 1, MAX_TOLERANCE, TOLERANCE)}
          <label class="flex cursor-pointer items-center gap-2 py-1 text-sm text-panel-value">
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
