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
      <button type="button" class="btn btn-ghost btn-sm text-sm" data-photo-editor-reset hidden></button>
      <span class="text-sm text-base-content/70" data-photo-editor-busy hidden></span>
    </div>
    <div class="relative min-h-0 flex-1" data-photo-editor-body></div>`
  root.querySelector('[data-photo-editor-title]').textContent = target.title || t('Edit image')
  const reset = root.querySelector('[data-photo-editor-reset]')
  reset.textContent = t('Back to the original')
  reset.hidden = !target.edited
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
  open = new Promise((resolve) => {
    const close = () => {
      try { editor?.terminate() } catch { /* already gone */ }
      root.remove()
      document.removeEventListener('keydown', onKey, true)
      open = null
      resolve()
    }
    // Esc closes the editor, never the panels behind it (they listen on the window).
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close() } }
    document.addEventListener('keydown', onKey, true)

    root.querySelector('[data-photo-editor-reset]').addEventListener('click', async () => {
      busy(true)
      try { await wire.resetEditedImage(target.id); close() } catch { busy(false); say(t('This picture could not be saved. Try again.')) }
    })

    import('filerobot-image-editor').then(({ default: FilerobotImageEditor }) => {
      const { TABS, TOOLS } = FilerobotImageEditor
      editor = new FilerobotImageEditor(root.querySelector('[data-photo-editor-body]'), {
        source: target.original,
        loadableDesignState: target.state || undefined,
        tabsIds: [TABS.ADJUST, TABS.FINETUNE, TABS.FILTERS, TABS.ANNOTATE],
        defaultTabId: TABS.ADJUST,
        defaultToolId: TOOLS.CROP,
        Rotate: { angle: 90, componentType: 'buttons' },
        Text: { text: '' },
        annotationsCommon: { fill: palette()['accent-primary'] },
        translations: translations(translated),
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
