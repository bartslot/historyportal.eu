/**
 * photo-editor.js — the image editor a double-click on a picture opens.
 *
 * Bart, 2026-11-03: "use what's there already on github. like a clone of photoshop or Canva clone". So this is not an
 * editor of our own: it is Filerobot Image Editor (scaleflex/filerobot-image-editor, MIT) in a full-window layer, with
 * crop, turn, mirror, colour, filters, text and drawing. This file only wraps it:
 *
 *   - whatever drew the picture sends an `image-edit:open` window event with a target (ArtworkOverlay for a picture
 *     layer, the stage25d engine for a 3D layer, ground band or the sky):
 *       { id: 'art_54' | 's25_layer-2' | 's25_band-0' | 's25_sky', title, original, state, edited, el }
 *   - the editor opens on the ORIGINAL picture with the saved design state, so every earlier change stays editable;
 *   - Save sends the finished picture to the editor component (EditsImages::saveEditedImage), which stores it as a new
 *     file and points the layer at it; Back to the original points it back. The original file is never touched.
 *
 * Filerobot and React load only on the first double-click, in their own chunk.
 */
import labels from './photo-editor-labels.json'
import { openMaskView } from './photo-editor-mask.js'

/** The Livewire component that owns the canvas the picture was double-clicked on. */
export function wireFor (el) {
  for (let node = el; node && node.getAttribute; node = node.parentElement) {
    const id = node.getAttribute('wire:id')
    if (id) return window.Livewire?.find(id) ?? null
  }
  return null
}

/** Filerobot's labels in the page's language: the English source, translated by the page (data-photo-editor-labels). */
export function translations (translated = {}) {
  return Object.fromEntries(Object.entries(labels).map(([key, en]) => [key, translated[en] ?? en]))
}

/** The page's own colours (the DaisyUI theme), so the editor looks like part of History Portal. */
function palette () {
  const css = getComputedStyle(document.documentElement)
  const v = (name, fallback) => css.getPropertyValue(name).trim() || fallback
  const base = v('--color-base-100', '#0f172a')
  const panel = v('--color-base-200', '#1e293b')
  const text = v('--color-base-content', '#e2e8f0')
  const accent = v('--color-primary', '#f59e0b')
  return {
    'bg-primary': base, 'bg-secondary': panel, 'bg-stateless': panel, 'bg-active': base,
    'bg-primary-active': panel, 'bg-hover': panel, 'bg-primary-hover': panel,
    'txt-primary': text, 'txt-secondary': text, 'txt-placeholder': text, 'icons-primary': text, 'icons-secondary': text,
    'accent-primary': accent, 'accent-primary-active': accent, 'accent-primary-hover': accent, 'accent-stateless': accent,
    'bg-base-light': panel, 'bg-base-medium': panel, 'bg-primary-light': panel, 'bg-primary-stateless': panel, 'bg-tooltip': panel,
    'borders-primary': panel, 'borders-secondary': panel, 'borders-strong': text, 'borders-item': panel, 'borders-button': panel,
    'borders-base-light': panel, 'borders-base-medium': panel, 'txt-secondary-invert': text, 'light-shadow': 'transparent',
    'active-secondary': panel, 'active-secondary-hover': panel,
  }
}

/**
 * The filters a teacher is offered, in plain words, out of Filerobot's ~45 Instagram names ("Clarendon", "1977").
 * Filerobot's list itself cannot be configured, so the rest are hidden and these relabelled (tameFilters).
 */
export const FILTERS = {
  Original: 'None', 'Black & White': 'Black and white', Sepia: 'Old photo', Moon: 'Soft grey', Slumber: 'Faded',
  Valencia: 'Warm', Kelvin: 'Golden', Hudson: 'Cool', Clarendon: 'Bright', Invert: 'Negative',
}

/** Show only FILTERS, under their own names; re-applied whenever Filerobot redraws the strip. */
export function tameFilters (root, t) {
  for (const item of root.querySelectorAll('.FIE_filters-item')) {
    const label = item.querySelector('.FIE_filters-item-label')
    const name = label?.dataset.filter ?? label?.textContent?.trim()
    if (!label || !name) continue
    label.dataset.filter = name
    const ours = FILTERS[name]
    item.style.display = ours ? '' : 'none'
    if (ours && label.textContent !== t(ours)) label.textContent = t(ours)
  }
}

/**
 * Filerobot saves the chosen filter by name (`filter.filterName || filter.name`) and finds it again by that name. Our
 * minified build renames Konva's functions (Sepia becomes `e`), so a saved Sepia came back as no filter at all. Give
 * every filter function its real name, once, before the editor opens.
 */
export function nameFilters (...groups) {
  for (const group of groups) {
    for (const [name, fn] of Object.entries(group ?? {})) {
      if (typeof fn === 'function' && !fn.filterName) fn.filterName = name
    }
  }
}

/** Filerobot's own type sizes go down to 10px and its number boxes are white: hold them to the house rules. */
const STYLE = `
  [data-photo-editor] :is(label, input, button, .FIE_tab-label, .FIE_filters-item-label, [class*="-option-label"], [class*="-option"] span) { font-size: max(12px, 1em) !important; }
  [data-photo-editor] .FIE_filters-item-label { font-size: 12px !important; }
  [data-photo-editor] .FIE_image-tool-button { display: none !important; }   /* adds pictures from outside the lesson */
  [data-photo-editor] input { background: var(--color-base-200) !important; color: var(--color-base-content) !important; border-color: var(--color-base-300) !important; }
`
function addStyle () {
  if (document.getElementById('photo-editor-style')) return
  const el = document.createElement('style')
  el.id = 'photo-editor-style'
  el.textContent = STYLE
  document.head.appendChild(el)
}

/** The picture's own height in pixels (0 when it does not load), so new text starts at a size that can be read. */
const HEIGHT_WAIT_MS = 4000   // a slow picture never holds the editor back: Filerobot loads it anyway
const heightOf = (src) => new Promise((resolve) => {
  setTimeout(() => resolve(0), HEIGHT_WAIT_MS)
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => resolve(img.naturalHeight || 0)
  img.onerror = () => resolve(0)
  img.src = src
})

const say = (text) => window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: text } }))

/** The full-window layer the editor lives in: a top bar (name, Back to the original, close) over Filerobot. */
function frame (target, t) {
  const root = document.createElement('div')
  root.dataset.photoEditor = target.id
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-label', t('Edit image'))
  root.className = 'fixed inset-0 z-[90] flex flex-col bg-base-100 text-base-content'
  root.innerHTML = `
    <div class="flex items-center gap-2 border-b border-base-300 px-4 py-2">
      <span class="min-w-0 flex-1 truncate text-sm font-semibold" data-photo-editor-title></span>
      <button type="button" class="btn btn-ghost btn-sm gap-1.5 text-sm" data-photo-editor-mask hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m7.848 8.25 1.536.887M7.848 8.25a3 3 0 1 1-5.196-3 3 3 0 0 1 5.196 3Zm1.536.887a2.165 2.165 0 0 1 1.083 1.839c.005.351.054.695.14 1.024M9.384 9.137l2.077 1.199M7.848 15.75l1.536-.887m-1.536.887a3 3 0 1 1-5.196 3 3 3 0 0 1 5.196-3Zm1.536-.887a2.165 2.165 0 0 0 1.083-1.838c.005-.352.054-.695.14-1.025m-1.223 2.863 2.077-1.199m0-3.328a4.323 4.323 0 0 1 2.068-1.379l5.325-1.628a4.5 4.5 0 0 1 2.48-.044l.803.215-7.794 4.5m-2.882-1.664A4.33 4.33 0 0 0 10.607 12m3.736 0 7.794 4.5-.802.215a4.5 4.5 0 0 1-2.48-.043l-5.326-1.629a4.324 4.324 0 0 1-2.068-1.379M14.343 12l-2.882 1.664"/></svg>
        <span data-photo-editor-mask-label></span>
      </button>
      <button type="button" class="btn btn-ghost btn-sm text-sm" data-photo-editor-reset hidden></button>
      <span class="text-sm text-base-content/70" data-photo-editor-busy hidden></span>
    </div>
    <div class="relative min-h-0 flex-1" data-photo-editor-body></div>`
  root.querySelector('[data-photo-editor-title]').textContent = target.title || t('Edit image')
  const reset = root.querySelector('[data-photo-editor-reset]')
  reset.textContent = t('Back to the original')
  reset.hidden = !target.edited
  root.querySelector('[data-photo-editor-mask-label]').textContent = t('Quick mask')
  root.querySelector('[data-photo-editor-busy]').textContent = t('Saving…')
  document.body.appendChild(root)
  return root
}

let open = null

/** Open the editor for one picture. Resolves when it is closed (saved, reset or not). */
export async function openPhotoEditor (target) {
  if (open || !target?.original) return
  const wire = wireFor(target.el)
  const translated = (() => { try { return JSON.parse(document.querySelector('[data-photo-editor-labels]')?.dataset.photoEditorLabels || '{}') } catch { return {} } })()
  const t = (en) => translated[en] ?? en
  if (!wire) { say(t('This picture cannot be opened in the editor.')); return }

  const root = frame(target, t)
  const busy = (on) => { root.querySelector('[data-photo-editor-busy]').hidden = !on; root.style.pointerEvents = on ? 'none' : '' }
  let editor = null
  let tame = null
  let unmask = null
  open = new Promise((resolve) => {
    const close = () => {
      unmask?.()
      tame?.disconnect()
      try { editor?.terminate() } catch { /* already gone */ }
      root.remove()
      document.removeEventListener('keydown', onKey, true)
      open = null
      resolve()
    }
    // Esc does what the editor's own X does (it asks first when there are unsaved changes), and never reaches the
    // panels behind it (they listen on the window).
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      const back = root.querySelector('[data-photo-editor-mask] [data-mask-back]')
      if (back) { back.click(); return }   // in the mask: Esc goes back to the editor
      const x = root.querySelector('.FIE_topbar-close-button')
      if (x) x.click(); else close()
    }
    document.addEventListener('keydown', onKey, true)

    root.querySelector('[data-photo-editor-reset]').addEventListener('click', async () => {
      busy(true)
      try { await wire.resetEditedImage(target.id); close() } catch { busy(false); say(t('This picture could not be saved. Try again.')) }
    })

    addStyle()
    Promise.all([
      import('filerobot-image-editor'),
      import('konva'),
      import('react-filerobot-image-editor/lib/custom/filters'),
      heightOf(target.original),
    ]).then(([{ default: FilerobotImageEditor }, { default: Konva }, custom, height]) => {
      nameFilters(Konva.Filters, custom)
      const { TABS, TOOLS } = FilerobotImageEditor
      const body = root.querySelector('[data-photo-editor-body]')
      tame = new MutationObserver(() => tameFilters(body, t))
      tame.observe(body, { childList: true, subtree: true })
      editor = new FilerobotImageEditor(body, {
        source: target.original,
        loadableDesignState: target.state || undefined,
        tabsIds: [TABS.ADJUST, TABS.FINETUNE, TABS.FILTERS, TABS.ANNOTATE],
        defaultTabId: TABS.ADJUST,
        defaultToolId: TOOLS.CROP,
        Rotate: { angle: 90, componentType: 'buttons' },
        // new text a sixteenth of the picture tall (Filerobot's 14 px is a speck on a 1200 px painting), saying "Text"
        // in the teacher's language rather than "Lorem ipsum". Never empty: Filerobot drops an empty text box on blur.
        Text: { text: t('Text'), fontSize: Math.max(24, Math.round(height / 16)) },
        annotationsCommon: { fill: palette()['accent-primary'] },
        // the pencil draws in the accent at a width that reads on the picture (Filerobot's default: 1 px black)
        Pen: { stroke: palette()['accent-primary'], strokeWidth: Math.max(4, Math.round(height / 150)) },
        translations: translations(translated),
        useBackendTranslations: false,   // never fetch words from Scaleflex's server: ours are in translations
        theme: { palette: palette(), typography: { fontFamily: 'inherit' } },
        defaultSavedImageType: 'webp',
        defaultSavedImageQuality: 0.9,
        savingPixelRatio: 1,
        previewPixelRatio: window.devicePixelRatio || 1,
        closeAfterSave: false,
        avoidChangesNotSavedAlertOnLeave: true,
        // false: no "save as" dialog, straight to onSave
        onBeforeSave: () => false,
        onSave: async (image, state) => {
          busy(true)
          try {
            const result = await wire.saveEditedImage(target.id, image.imageBase64, state ?? {})
            if (!result?.ok) throw new Error('refused')
            close()
          } catch {
            busy(false)
            say(t('This picture could not be saved. Try again.'))
          }
        },
        onClose: close,
      })
      editor.render()

      // Quick mask: on the picture as it is edited now. A mask is baked into the saved file (the editor's own state
      // cannot hold it), so a later edit starts from that masked file (EditsImages keeps edit_base).
      const maskButton = root.querySelector('[data-photo-editor-mask]')
      maskButton.hidden = false
      maskButton.addEventListener('click', async () => {
        if (unmask) return
        const now = editor.getCurrentImgData({}, false, true)?.imageData?.imageBase64 || target.original
        maskButton.disabled = true
        try {
          unmask = await openMaskView(body, {
            src: now,
            t,
            onBack: () => { unmask = null; maskButton.disabled = false },
            onSave: async (dataUrl) => {
              busy(true)
              try {
                const result = await wire.saveEditedImage(target.id, dataUrl, {})
                if (!result?.ok) throw new Error('refused')
                unmask = null
                close()
                return true
              } catch {
                busy(false)
                say(t('This picture could not be saved. Try again.'))
                return false
              }
            },
          })
        } catch {
          maskButton.disabled = false
          say(t('This picture cannot be opened in the editor.'))
        }
      })
    }).catch(() => { close(); say(t('This picture cannot be opened in the editor.')) })
  })
  return open
}

/** Listen for double-clicks on pictures (the `image-edit:open` event) once per page. */
export function installPhotoEditor () {
  if (window.__photoEditorInstalled) return
  window.__photoEditorInstalled = true
  window.addEventListener('image-edit:open', (e) => { openPhotoEditor(e.detail) })
}
