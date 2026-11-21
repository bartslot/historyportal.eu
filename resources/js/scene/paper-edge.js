/**
 * The painted paper edge on a scene's picture (app.css .paper-edge / .paper-page).
 *
 * Shared by the player (lesson-player.js) and the editor (wizard-bridge.js) so the teacher sees
 * the edge the class sees. On by default; a scene turns it off with config.paper_edge = false.
 * Only the picture host is masked: the figures stand in their own overlay, over the edge.
 */

/**
 * @param {object|null|undefined} config  the scene's config
 * @param {boolean} hasPicture            a scene with no picture (flat colour, map) keeps its plain frame
 * @returns {boolean}
 */
export function hasPaperEdge (config, hasPicture) {
  return !!hasPicture && config?.paper_edge !== false
}

/** The edge shapes a scene can pick (config.paper_mask). 'book' is the default, Bart's book mask. */
export const PAPER_MASKS = ['book', 'blot-004', 'blot-005', 'blot-011']

/**
 * How the scene's picture meets the page (Masker tab): the colour it fades into (config.paper_color,
 * null = the paper) and the edge's shape (config.paper_mask, null = the book mask).
 *
 * @param {object|null|undefined} config
 * @returns {{ color: string|null, mask: string|null }}
 */
export function paperLook (config) {
  const c = config?.paper_color
  const m = config?.paper_mask
  return {
    color: typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null,
    mask: PAPER_MASKS.includes(m) && m !== 'book' ? `url('/images/paper/edge-mask-${m}.webp')` : null,
  }
}

/**
 * Mask the picture host and lay a sheet of paper directly under it. The sheet is the host's own
 * sibling at the host's z-index, so it covers whatever sits below (the editor's WebGL canvas, the
 * stage's black) and nothing above.
 *
 * @param {HTMLElement|null} host  the element that holds the picture
 * @param {boolean} on
 * @param {{ color?: string|null, mask?: string|null }} [look]  paperLook(): a colour instead of the paper, another edge
 */
export function applyPaperEdge (host, on, look = {}) {
  if (!host) return
  host.classList.toggle('paper-edge', on)
  // Custom properties, so the comic panels and a Whole image picture inside the host read them too.
  const color = look?.color || null
  for (const [prop, v] of [['--paper-edge-bg', color], ['--paper-edge-mask', look?.mask || null]]) {
    if (v) host.style.setProperty(prop, v)
    else host.style.removeProperty(prop)
  }
  let sheet = host.previousElementSibling
  if (!sheet?.hasAttribute('data-paper-sheet')) {
    if (!on) return
    sheet = document.createElement('div')
    sheet.setAttribute('data-paper-sheet', '')
    sheet.setAttribute('aria-hidden', 'true')
    sheet.className = 'paper-page'
    host.before(sheet)
  }
  // An unpositioned host (the editor's canvas) paints above any positioned sibling at z auto, so
  // its sheet goes to -1: under the canvas, still over its stage's own background.
  const z = getComputedStyle(host).zIndex
  sheet.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:${z === 'auto' ? -1 : z};`
  sheet.style.display = on ? '' : 'none'
  if (color) sheet.style.background = color
}

/**
 * A 'Whole image' picture is smaller than the stage on one side, so the frame's edge never
 * reaches it and it would keep hard straight sides. Give the picture its own painted edge, sized
 * to the box the picture actually fills.
 *
 * ponytail: measured once when shown; a window resized mid-scene keeps the old box until the next scene.
 *
 * @param {HTMLElement} el  a background layer drawing the picture with background-size: contain
 * @param {string} url
 * @param {boolean} on
 */
export function maskContainedPicture (el, url, on) {
  el.classList.remove('paper-edge')
  el.style.removeProperty('mask-size')
  el.style.removeProperty('-webkit-mask-size')
  if (!on || !url) return
  const probe = new Image()
  probe.onload = () => {
    const w = el.clientWidth
    const h = el.clientHeight
    if (!w || !h || !probe.naturalWidth || !probe.naturalHeight) return
    if (!el.style.backgroundImage.includes(url)) return   // the layer moved on to another picture
    const ratio = (probe.naturalWidth / probe.naturalHeight) / (w / h)
    const size = ratio > 1 ? `100% ${100 / ratio}%` : `${100 * ratio}% 100%`
    el.classList.add('paper-edge')
    el.style.setProperty('mask-size', size)
    el.style.setProperty('-webkit-mask-size', size)
  }
  probe.src = url
}
