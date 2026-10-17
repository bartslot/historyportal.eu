/**
 * The editor's stage shows the title screen as the real player in an inert frame (same origin).
 * A click on its title lands in the Format panel's matching field: the series in "title", the
 * episode line in "subtitle" (title-screen-inspector.blade.php listens for title-edit-field).
 *
 * By rectangles, not elementFromPoint: the title's pieces are pointer-events: none in the player.
 */

// A poster layer covering this share of the stage or more is its picture, not its title.
const PICTURE_SHARE = 0.5

const inside = (r, x, y) => r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom

/**
 * Pure (over a document): which title field the frame point (x, y) is on, or null.
 *
 * @returns {'title'|'subtitle'|null}
 */
export function titleFieldAt (doc, x, y) {
  if (!doc) return null
  const hit = (selector) => [...doc.querySelectorAll(selector)].some(el => inside(el.getBoundingClientRect(), x, y))
  if (hit('[data-title-subtitle]')) return 'subtitle'
  if (hit('[data-title-series], [data-title-piece="logo"]')) return 'title'

  const stage = doc.querySelector('[data-poster-stage]')?.getBoundingClientRect()
  const area = stage ? stage.width * stage.height : 0
  const letters = [...doc.querySelectorAll('[data-poster-layer]')].map(el => el.getBoundingClientRect())
    .filter(r => !(area > 0 && r.width * r.height >= PICTURE_SHARE * area))
  return letters.some(r => inside(r, x, y)) ? 'title' : null
}

/**
 * Wire the stage: while `isTitle()` and a press falls on the frame's title, it opens that field and
 * nothing under it sees the press (the scene overlays over the canvas would select a scene object).
 * Caught on the window in the capture phase, before any of them. The frame is drawn at frameW px
 * wide and scaled to the stage.
 */
export function installTitleStagePick (stage, frameW, isTitle) {
  const fieldFor = (e) => {
    if (!isTitle()) return null
    const frame = stage.querySelector('iframe[data-title-frame]')
    const r = frame?.getBoundingClientRect()
    if (!r?.width || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null
    let doc = null
    try { doc = frame.contentDocument } catch { return null }
    const k = r.width / frameW
    return titleFieldAt(doc, (e.clientX - r.left) / k, (e.clientY - r.top) / k)
  }
  for (const type of ['pointerdown', 'mousedown', 'click']) {
    window.addEventListener(type, (e) => {
      const field = fieldFor(e)
      if (!field) return
      e.stopPropagation()
      if (type === 'click') window.dispatchEvent(new CustomEvent('title-edit-field', { detail: field }))
    }, true)
  }
}
