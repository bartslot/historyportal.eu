/**
 * Ambient layer motion: the small, endless movement that makes a scene feel alive — clouds that
 * drift, trees that move in the breeze, a boat that bobs, birds that flutter across.
 *
 * ONE module for both renderers (ParallaxScene in the player, ArtworkOverlay in the editor and
 * voyage playback), so a layer moves the same wherever it is shown.
 *
 * The motion goes on an INNER wrapper that carries nothing else. The layer's own transform
 * (position, scale, rotation, parallax pan, entrance) lives on the element around it, so the two
 * compose instead of overwriting each other. Only transform / translate / rotate animate, so it
 * stays on the compositor.
 *
 * Distances are a share of the STAGE, not of the layer: `trackStage(host)` keeps --amb-sw/--amb-sh
 * (px) on the host, and the keyframes multiply them. A cloud drifts the same distance whatever its
 * size, and the drift follows the stage through a resize or fullscreen.
 */

// Full period (seconds, at speed 1) of each mode's main movement.
const PERIOD_S = { drift: 40, breeze: 6, bob: 5, flutter: 18 }
export const AMBIENT_MODES = ['none', ...Object.keys(PERIOD_S)]
const SPEED_RANGE = [0.25, 3]
const AMOUNT_RANGE = [0, 2]
const MODE_CLASSES = Object.keys(PERIOD_S).map(m => `amb-${m}`)
const GOLDEN = 0.618033988749895
const STYLE_ID = 'amb-styles'

const clamp = (n, [min, max], fallback) => (Number.isFinite(Number(n)) && n !== null && n !== ''
  ? Math.min(max, Math.max(min, Number(n)))
  : fallback)

/**
 * Pure: what motion a layer asks for, or null for none.
 * The phase comes from the asset id (or the index) so neighbouring clouds never move in step.
 *
 * @returns {{mode: string, amount: number, durS: number, delayS: number}|null}
 */
export function ambientSpec (layer, index = 0) {
  const mode = layer?.ambient
  if (!PERIOD_S[mode]) return null
  const speed = clamp(layer.ambient_speed, SPEED_RANGE, 1)
  const amount = clamp(layer.ambient_amount, AMOUNT_RANGE, 1)
  const durS = PERIOD_S[mode] / speed
  const seed = Number.isFinite(Number(layer.asset_id)) && layer.asset_id !== null ? Number(layer.asset_id) : index
  const phase = ((Math.abs(seed) + 1) * GOLDEN) % 1

  return { mode, amount, durS: round(durS), delayS: round(-phase * durS) }
}

const round = (n) => Math.round(n * 1000) / 1000

function prefersReducedMotion () {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Start (or change, or stop) the ambient motion on a layer's inner wrapper. Safe to call again
 * with new values — that is how the editor previews a change without rebuilding the scene.
 *
 * @param {HTMLElement} el     The inner wrapper (never the element carrying the layer transform).
 * @param {object} layer       Layer data: ambient, ambient_speed, ambient_amount, asset_id.
 * @param {number} [index]     Layer index, the phase seed when there is no asset id.
 * @returns {boolean}          Whether the layer is now moving.
 */
export function applyAmbient (el, layer, index = 0) {
  if (!el) return false
  el.classList.remove('amb', ...MODE_CLASSES)
  for (const v of ['--amb-amount', '--amb-dur', '--amb-delay']) el.style.removeProperty(v)

  const spec = ambientSpec(layer, index)
  if (!spec || prefersReducedMotion()) return false

  injectAmbientStyles()
  el.classList.add('amb', `amb-${spec.mode}`)
  el.style.setProperty('--amb-amount', String(spec.amount))
  el.style.setProperty('--amb-dur', `${spec.durS}s`)
  el.style.setProperty('--amb-delay', `${spec.delayS}s`)

  return true
}

/**
 * Keep the stage size on the host as --amb-sw/--amb-sh, so drift distances are a share of the
 * stage. Custom properties only: nothing here makes the host a stacking context, which would trap
 * a layer's blend mode.
 *
 * @returns {ResizeObserver|null} disconnect it when the host goes away
 */
export function trackStage (host) {
  if (!host) return null
  const write = (w, h) => {
    host.style.setProperty('--amb-sw', `${Math.round(w)}px`)
    host.style.setProperty('--amb-sh', `${Math.round(h)}px`)
  }
  const rect = host.getBoundingClientRect()
  if (rect.width) write(rect.width, rect.height)
  if (typeof ResizeObserver !== 'function') return null
  const ro = new ResizeObserver(([entry]) => write(entry.contentRect.width, entry.contentRect.height))
  ro.observe(host)

  return ro
}

// Each keyframe runs from one extreme to the other and back (alternate), on an ease-in-out sine,
// so every half-period is a smooth swing: the duration of a keyframe is HALF the period.
const SW = 'var(--amb-sw, 100vw)'
const SH = 'var(--amb-sh, 100vh)'
const A = 'var(--amb-amount, 1)'
const half = (ratio = 1) => `calc(var(--amb-dur, 6s) * ${ratio / 2})`

const CSS = `
  .amb {
    will-change: transform;
    animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-delay: var(--amb-delay, 0s);
  }
  @keyframes amb-drift-x {
    from { translate: calc(${SW} * -0.025 * ${A}) 0; }
    to   { translate: calc(${SW} * 0.025 * ${A}) 0; }
  }
  @keyframes amb-drift-y {
    from { transform: translateY(calc(${SH} * -0.003 * ${A})); }
    to   { transform: translateY(calc(${SH} * 0.003 * ${A})); }
  }
  .amb-drift { animation-name: amb-drift-x, amb-drift-y; animation-duration: ${half()}, ${half(0.33)}; }

  @keyframes amb-breeze {
    from { transform: skewX(calc(-1.2deg * ${A})) rotate(calc(-0.4deg * ${A})); }
    to   { transform: skewX(calc(1.2deg * ${A})) rotate(calc(0.4deg * ${A})); }
  }
  @keyframes amb-leaf {
    from { rotate: calc(-0.2deg * ${A}); }
    to   { rotate: calc(0.2deg * ${A}); }
  }
  .amb-breeze {
    transform-origin: 50% 100%;
    animation-name: amb-breeze, amb-leaf;
    animation-duration: ${half()}, ${half(1.7 / 6)};
  }

  @keyframes amb-bob {
    from { transform: translateY(calc(${SH} * -0.006 * ${A})) rotate(calc(-0.5deg * ${A})); }
    to   { transform: translateY(calc(${SH} * 0.006 * ${A})) rotate(calc(0.5deg * ${A})); }
  }
  .amb-bob { animation-name: amb-bob; animation-duration: ${half()}; }

  @keyframes amb-flutter-x {
    from { translate: calc(${SW} * -0.04 * ${A}) 0; }
    to   { translate: calc(${SW} * 0.04 * ${A}) 0; }
  }
  .amb-flutter { animation-name: amb-flutter-x, amb-bob; animation-duration: ${half()}, ${half(5 / 18)}; }

  @media (prefers-reduced-motion: reduce) {
    .amb { animation: none !important; }
  }
`

// Checked by DOM presence, not a module flag: tests and SPA navigations wipe the head.
function injectAmbientStyles () {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}
