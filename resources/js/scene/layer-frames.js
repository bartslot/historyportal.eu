/**
 * A layer drawn from a sprite sheet: `frames: { url, count, columns, play, fps }` (LayerFrames on the
 * server). The sheet is a grid of cells the size of the layer's own picture, left to right, top to
 * bottom. `play`:
 *   - 'wind': the frame follows a value 0..1 the player sets (the power meter's wind: sails slack
 *     at 0, billowing at 1); between two cells the next one fades in, so a rising level swells
 *     the cloth instead of stepping it.
 *   - 'loop': the cells play round at `fps` (one row only: a CSS steps() animation, no timers).
 *   - 'off': the layer's own picture, as if it had no sheet.
 *
 * The layer's <img> stays: it sizes the node, and the waterline, reflection, foam and colour match
 * are built from it (sit-in-scene.js). The frames sit over it and copy its mask, filter and opacity
 * (syncFrames); the img is hidden only once the sheet has loaded, so nothing ever shows blank.
 */
const PLAYS = ['wind', 'loop', 'off']
const COUNT_MAX = 64
const FPS = [1, 24]

const clamp = (n, min, max, fallback) => (Number.isFinite(Number(n)) && n !== null && n !== '' ? Math.min(max, Math.max(min, Number(n))) : fallback)

/** Pure: the sheet as the renderer reads it, or null when there is none to play. */
export function readFrames (raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.url !== 'string' || !raw.url) return null
  const count = Math.round(clamp(raw.count, 1, COUNT_MAX, 1))
  const columns = Math.round(clamp(raw.columns, 1, count, count))
  const play = PLAYS.includes(raw.play) ? raw.play : 'wind'
  if (count < 2 || play === 'off') return null
  return { url: raw.url, count, columns, rows: Math.ceil(count / columns), play: play === 'loop' && columns < count ? 'wind' : play, fps: clamp(raw.fps, FPS[0], FPS[1], 8) }
}

/** Pure: a cell's background-position, in %, for a sheet of `columns` x `rows`. */
export function cellPosition (index, { columns, rows }) {
  const col = index % columns
  const row = Math.floor(index / columns)
  const pct = (i, n) => (n > 1 ? (i / (n - 1)) * 100 : 0)
  return `${round(pct(col, columns))}% ${round(pct(row, rows))}%`
}

/** Pure: a level 0..1 as the two cells to show and how much of the upper one. */
export function framesAt (level, count) {
  const f = clamp(level, 0, 1, 0) * (count - 1)
  const lower = Math.floor(f + 1e-9)
  return { lower, upper: Math.min(count - 1, lower + 1), mix: round(f - lower, 3) }
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d
const STYLE_ID = 'layer-frames-styles'

function injectStyles () {
  if (document.getElementById(STYLE_ID)) return
  const s = document.createElement('style')
  s.id = STYLE_ID
  // A constant frame rate is the one place a stepped, linear timing is right (a flip book).
  s.textContent = `.art-frame { position:absolute; inset:0; pointer-events:none; background-repeat:no-repeat; }
    @keyframes art-frames-loop { from { background-position-x: 0%; } to { background-position-x: 100%; } }
    .art-frames-loop { animation: art-frames-loop var(--frames-dur) steps(var(--frames-n), jump-none) infinite; }
    @media (prefers-reduced-motion: reduce) { .art-frames-loop { animation: none; } }`
  document.head.appendChild(s)
}

/** Put the sheet over the layer's picture in `body` (the .art-ambient wrapper). Returns the spec. */
export function mountFrames (body, img, raw) {
  body.querySelector(':scope > .art-frames')?.remove()
  img.style.removeProperty('visibility')
  const spec = readFrames(raw)
  body.__frames = spec
  if (!spec) return null
  injectStyles()
  body.style.position = 'relative'
  // One box over the picture: it carries the picture's mask, filter and opacity (syncFrames).
  const box = document.createElement('div')
  box.className = 'art-frames'
  box.setAttribute('aria-hidden', 'true')
  box.style.cssText = 'position:absolute; inset:0; pointer-events:none;'
  for (let i = 0; i < (spec.play === 'loop' ? 1 : 2); i++) {
    const cell = document.createElement('div')
    cell.className = 'art-frame'
    cell.style.backgroundImage = `url("${encodeURI(spec.url)}")`
    cell.style.backgroundSize = `${spec.columns * 100}% ${spec.rows * 100}%`
    if (spec.play === 'loop') {
      cell.classList.add('art-frames-loop')
      cell.style.setProperty('--frames-n', String(spec.count))
      cell.style.setProperty('--frames-dur', `${round(spec.count / spec.fps, 3)}s`)
    }
    box.appendChild(cell)
  }
  img.after(box)
  showFrame(body, 0)
  syncFrames(body, img)
  // Hide the picture under the sheet only once the sheet is there.
  const probe = new Image()
  probe.onload = () => { if (body.__frames === spec) img.style.visibility = 'hidden' }
  probe.src = spec.url
  return spec
}

/** Show the sheet at a level 0..1 ('wind' sheets only). */
export function showFrame (body, level) {
  const spec = body?.__frames
  if (!spec || spec.play !== 'wind') return
  const [a, b] = body.querySelectorAll(':scope > .art-frames > .art-frame')
  if (!a || !b) return
  const { lower, upper, mix } = framesAt(level, spec.count)
  a.style.backgroundPosition = cellPosition(lower, spec)
  b.style.backgroundPosition = cellPosition(upper, spec)
  b.style.opacity = String(mix)
}

/** The frames wear what the picture wears: its waterline mask, colour filter and opacity. */
export function syncFrames (body, img) {
  const box = body?.querySelector(':scope > .art-frames')
  if (!box || !img) return
  box.classList.toggle('sit-waterline', img.classList.contains('sit-waterline'))
  for (const prop of ['mask-image', 'filter', 'opacity', '--sit-drift']) {
    const v = img.style.getPropertyValue(prop)
    if (v) box.style.setProperty(prop, v)
    else box.style.removeProperty(prop)
  }
}
