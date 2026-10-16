/**
 * Where a Cmd/Ctrl-V in the scene editor goes (Bart, 2026-10-16: paste an image with Cmd-V).
 *
 * Read off the `paste` event's clipboardData, never the async Clipboard API: the event needs no
 * permission prompt. Pure, so it can be tested without a browser.
 *
 *   typing in a field          → 'ignore'   the browser pastes the text, as always
 *   our own object copy        → 'objects'  the editor's object clipboard (window.__duplicateObjects)
 *   an image, picker open      → 'dialog'   uploaded exactly as a file dropped on the picker
 *   an image, no picker        → 'layer'    a new image layer on the selected scene
 *   no image, objects copied   → 'objects'  (a browser whose copy event never reached the clipboard)
 *   anything else              → 'none'     left alone
 */

/** Marks the system clipboard when the editor copies objects, so an older image there loses. */
export const OBJECTS_MARK = 'application/x-history-portal-objects'

const PREFERRED = ['image/png', 'image/jpeg', 'image/webp']

/** The image file on the clipboard, or null. A JPG/PNG/WebP wins over e.g. a TIFF beside it. */
export const imageFileFrom = (clipboardData) => {
  const items = Array.from(clipboardData?.items ?? [])
    .filter((i) => i.kind === 'file' && String(i.type).startsWith('image/'))
  const item = items.find((i) => PREFERRED.includes(i.type)) ?? items[0]
  if (item) return item.getAsFile()

  return Array.from(clipboardData?.files ?? []).find((f) => String(f.type).startsWith('image/')) ?? null
}

/** @returns {{ action: 'ignore'|'objects'|'dialog'|'layer'|'none', file: File|null }} */
export const routePaste = (clipboardData, { typing = false, dialogOpen = false, hasObjects = false } = {}) => {
  if (typing) return { action: 'ignore', file: null }
  if (hasObjects && Array.from(clipboardData?.types ?? []).includes(OBJECTS_MARK)) return { action: 'objects', file: null }

  const file = imageFileFrom(clipboardData)
  if (file) return { action: dialogOpen ? 'dialog' : 'layer', file }

  return { action: hasObjects ? 'objects' : 'none', file: null }
}
