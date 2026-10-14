/**
 * Ambient layer motion: the small, endless movement that makes a scene feel alive — clouds that
 * drift, trees that move in the breeze, a boat that bobs, birds that flutter across, and for the
 * web-comic sea (Tasman, 2026-10-13): a swelling sea, a rolling ship, billowing flags, rain,
 * lightning, spray, lantern flicker, rising smoke and oars.
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

// Full period (seconds, at speed 1) of each mode's main movement. Exported (and mutable) so the
// dev tuner reads its values from here instead of restating them; see registerAmbientTuner.
// The motion rules behind the new modes' defaults (motion-design skill):
//   looping ambient = sine ease-in-out, seamless; amplitude 10-20% of the primary motion;
//   fluid (sea) 1.5x, gas (smoke) 2x the base duration, no overshoot; a constant rate (a scroll,
//   falling rain) is the one place linear is physically right; a burst (spray) = ease-out-expo;
//   periods in non-integer ratios + golden-ratio phases so layers never move in step.
export const PERIOD_S = {
  drift: 40, breeze: 6, bob: 5, flutter: 18,
  swell: 8,     // one rise-and-fall of the sea strip; the sideways scroll is AMP.swellScroll x this
  roll: 7,      // a ship's pitch/roll about its waterline
  billow: 1.8,  // a flag or sail ripple
  rain: 0.9,    // one streak tile (270px) falling past (near depth; the far depth takes 1.5x)
  flash: 9,     // mean gap between lightning strikes (random, 0.4x to 1.6x)
  spray: 7,     // one burst per period: the same as roll, so a bow sprays once per pitch
  flicker: 2.4, // a lantern's irregular breath
  rise: 9,      // a smoke puff rising and fading
  oars: 2.4,    // one paddle stroke: slow pull, quicker recovery
}
export const AMBIENT_MODES = ['none', ...Object.keys(PERIOD_S)]

/**
 * How far each new mode moves at amount 1, in its own unit. The CSS below is built from these, so
 * the dev tuner can change one and rebuild the sheet. Small on purpose: ambient is background life.
 */
export const AMP = {
  swellRise: 0.008,   // share of the stage height the sea strip rises and falls
  swellScroll: 7.5,   // the strip scrolls one full width every swellScroll periods (60s at speed 1)
  rollDeg: 1.2,       // degrees either side
  rollLift: 0.004,    // share of the stage height
  plateScale: 0.05,   // a rolling backdrop is scaled up this much x amount, so no edge shows
  billowSkew: 2.5,    // degrees
  billowFill: 0.025,  // the cloth's horizontal breathing
  rainFar: 0.45,      // opacity of the far streaks at amount 1
  rainNear: 0.6,      // opacity of the near streaks per unit of amount over 0.5
  flashPeak: 0.9,     // brightness added at the strike's peak
  sprayRise: 0.025,   // share of the stage height
  sprayGrow: 0.12,
  flickerDip: 0.14,   // how far the light dims
  riseLift: 0.08,     // share of the stage height a puff climbs
  riseGrow: 0.18,
  oarsDeg: 7,
}
const SPEED_RANGE = [0.25, 3]
const AMOUNT_RANGE = [0, 2]
const MODE_CLASSES = [...Object.keys(PERIOD_S).map(m => `amb-${m}`), 'amb-swell-strip']

/**
 * A picture at least this many times wider than it is tall is a sea STRIP: swell scrolls it
 * sideways forever (mirrored copies, clipped to its box). Anything less wide (a ship, a canoe) only
 * rises and falls: scrolling a ship drags a mirrored twin through it and the clip cuts it in half.
 */
export const WIDE_STRIP_RATIO = 2.5

/** Pure: is a w x h picture a wide strip? Unknown sizes (0) are not. */
export const isWideStrip = (w, h) => w > 0 && h > 0 && w / h >= WIDE_STRIP_RATIO
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
  clearAmbient(el)
  el.__ambLayer = layer
  el.__ambIndex = index

  const spec = ambientSpec(layer, index)
  if (!spec || prefersReducedMotion()) return false

  injectAmbientStyles()
  el.classList.add('amb', `amb-${spec.mode}`)
  el.style.setProperty('--amb-amount', String(spec.amount))
  el.style.setProperty('--amb-dur', `${spec.durS}s`)
  el.style.setProperty('--amb-delay', `${spec.delayS}s`)
  if (spec.mode === 'swell') whenWideStrip(el, layer, () => addSwellTwin(el))
  if (spec.mode === 'flash') scheduleFlash(el, spec)

  return true
}

function clearAmbient (el) {
  el.classList.remove('amb', ...MODE_CLASSES)
  for (const v of ['--amb-amount', '--amb-dur', '--amb-delay']) el.style.removeProperty(v)
  for (const twin of el.querySelectorAll(':scope > .amb-twin')) twin.remove()
  if (el.__ambFlash) { clearTimeout(el.__ambFlash); el.__ambFlash = null }
  el.__ambFlashAnim?.cancel?.()
  el.__ambFlashAnim = null
}

/**
 * Run `then` once the layer's picture is known to be a wide strip (a ParallaxScene 'strip' plane
 * always is). The size is the rendered box when laid out, else the file's own; a picture still
 * loading is decided on load.
 */
function whenWideStrip (el, layer, then) {
  const img = el.querySelector(':scope > img')
  if (!img) return
  const decide = () => {
    if (el.__ambLayer !== layer || !el.classList.contains('amb-swell')) return   // changed meanwhile
    const wide = layer?.kind === 'strip'
      || isWideStrip(img.offsetWidth || img.naturalWidth, img.offsetHeight || img.naturalHeight)
    if (!wide) return
    el.classList.add('amb-swell-strip')
    then()
  }
  if (img.complete && img.naturalWidth) decide()
  else img.addEventListener('load', decide, { once: true })
}

/**
 * Swell: the sea strip scrolls sideways forever, so it needs copies right behind it. A painted
 * strip is rarely drawn to tile, so the first copy is MIRRORED: its edge meets the original's same
 * edge and the joint is continuous whatever the art. The second copy is the original again, so
 * after two widths the picture is exactly where it started and the loop never jumps. All three move
 * together (CSS amb-swell-scroll / -mirror / -again), so a strip at least as wide as what it covers
 * never shows an edge.
 */
function addSwellTwin (el) {
  const img = el.querySelector(':scope > img')
  if (!img) return
  for (const kind of ['amb-twin-mirror', 'amb-twin-again']) {
    const twin = img.cloneNode(false)
    twin.classList.add('amb-twin', kind)
    twin.alt = ''
    twin.setAttribute('aria-hidden', 'true')
    // An in-flow picture (the editor overlay) is laid over its original; an absolutely placed one
    // (ParallaxScene) already sits where the original is.
    if (img.style.position !== 'absolute') {
      twin.style.position = 'absolute'
      twin.style.left = '0'
      twin.style.top = '0'
    }
    el.appendChild(twin)
  }
}

/**
 * Pure: seconds until the next lightning strike. Random between 0.4x and 1.6x the period, so the
 * mean is the period and no two storms keep time.
 *
 * @param {number} durS   the mode's period at the layer's speed
 * @param {() => number} [rand]
 */
export function flashGapS (durS, rand = Math.random) {
  return round(durS * (0.4 + 1.2 * rand()))
}

/**
 * Pure: one strike as Web Animations keyframes on `filter`. Two pulses inside 0.7s, none at all
 * under prefers-reduced-motion. The brightness never goes past amount 1's peak: a bigger amount
 * may not mean a harsher flash (photosensitivity), so amount only dims it below 1.
 */
export const FLASH_MS = 700
export function flashKeyframes (amount = 1) {
  const peak = 1 + AMP.flashPeak * Math.min(1, Math.max(0, amount))
  const b = (v) => `brightness(${round(v)})`

  return [
    { filter: b(1), offset: 0 },
    { filter: b(peak), offset: 0.08 },
    { filter: b(1 + (peak - 1) * 0.15), offset: 0.22 },
    { filter: b(1 + (peak - 1) * 0.8), offset: 0.32 },
    { filter: b(1), offset: 1 },
  ]
}

/**
 * WCAG 2.3.1 (three flashes a second) across the WHOLE stage, not per layer: two lightning layers
 * striking together would double it. One strike (two pulses) per FLASH_MIN_GAP_MS for all flash
 * layers; a layer whose turn comes too soon skips that strike and waits for its next gap.
 */
export const FLASH_MIN_GAP_MS = 1000
let lastStrikeAt = -Infinity

/** Pure gate: may a strike start at `now`? Records it when it may. */
export function claimFlash (now = Date.now()) {
  if (now - lastStrikeAt < FLASH_MIN_GAP_MS) return false
  lastStrikeAt = now

  return true
}

/** Tests only: forget the last strike. */
export const resetFlashClock = () => { lastStrikeAt = -Infinity }

function scheduleFlash (el, spec) {
  el.__ambFlash = setTimeout(() => {
    if (!el.isConnected) { el.__ambFlash = null; return }
    if (claimFlash()) {
      // Exit easing: the light snaps on and dies away; it never fades IN.
      el.__ambFlashAnim = el.animate(flashKeyframes(spec.amount), { duration: FLASH_MS, easing: 'cubic-bezier(0.333, 0, 0.667, 0)' })
    }
    scheduleFlash(el, spec)
  }, flashGapS(spec.durS) * 1000)
}

/** Re-apply every live layer: after the tuner changes a period. */
export function reapplyAmbient (root = document) {
  for (const el of root.querySelectorAll('.amb')) applyAmbient(el, el.__ambLayer, el.__ambIndex)
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

const buildCss = () => `
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

  /* swell: the wrapper rises and falls; the picture, its mirror and itself again scroll two widths,
     linearly (one width per swellScroll periods) */
  @keyframes amb-swell {
    from { transform: translateY(calc(${SH} * -${AMP.swellRise} * ${A})); }
    to   { transform: translateY(calc(${SH} * ${AMP.swellRise} * ${A})); }
  }
  .amb-swell { animation-name: amb-swell; animation-duration: ${half()}; }
  .amb-swell-strip { overflow: hidden; }
  @keyframes amb-swell-scroll { from { translate: 0 0; } to { translate: calc(-200% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-mirror { from { translate: calc(100% * var(--amb-scale, 1)) 0; } to { translate: calc(-100% * var(--amb-scale, 1)) 0; } }
  @keyframes amb-swell-again { from { translate: calc(200% * var(--amb-scale, 1)) 0; } to { translate: 0 0; } }
  .amb-swell-strip > img {
    animation: amb-swell-scroll calc(var(--amb-dur, 8s) * ${AMP.swellScroll * 2}) linear infinite;
    animation-delay: var(--amb-delay, 0s);
  }
  .amb-swell-strip > img.amb-twin-mirror { animation-name: amb-swell-mirror; scale: -1 1; }
  .amb-swell-strip > img.amb-twin-again { animation-name: amb-swell-again; }

  /* roll: pitch about the waterline; a full plate rolls about its middle, scaled past its edges */
  @keyframes amb-roll {
    from { transform: translateY(calc(${SH} * -${AMP.rollLift} * ${A})) rotate(calc(-${AMP.rollDeg}deg * ${A})); }
    to   { transform: translateY(calc(${SH} * ${AMP.rollLift} * ${A})) rotate(calc(${AMP.rollDeg}deg * ${A})); }
  }
  .amb-roll { animation-name: amb-roll; animation-duration: ${half()}; transform-origin: 50% 100%; }
  .amb-roll[data-amb-plate] { transform-origin: 50% 50% !important; scale: calc(1 + ${AMP.plateScale} * ${A}); }

  /* billow: cloth ripples away from its hoist (the left edge) */
  @keyframes amb-billow {
    from { transform: skewY(calc(-${AMP.billowSkew}deg * ${A})); }
    to   { transform: skewY(calc(${AMP.billowSkew}deg * ${A})); }
  }
  @keyframes amb-billow-fill {
    from { scale: calc(1 - ${AMP.billowFill} * ${A}) 1; }
    to   { scale: 1 1; }
  }
  .amb-billow {
    animation-name: amb-billow, amb-billow-fill;
    animation-duration: ${half()}, ${half(0.62)};
    transform-origin: 0% 50% !important;
  }

  /* rain: two depths of slanted streaks drawn here, falling at a constant rate (linear is the
     physics). The far streaks show from any amount; the near ones join past amount 0.5. */
  /* Only these two lay something out over their box (the swell's copies, the rain's streaks), so
     only they are positioned. An inline position (ParallaxScene's absolute wrapper) still wins. */
  .amb-swell, .amb-rain { position: relative; }
  .amb-rain { overflow: hidden; }   /* the streaks stay inside their layer */
  .amb-rain::before, .amb-rain::after {
    content: ''; position: absolute; pointer-events: none;
    background-image: ${RAIN_TILE};
    animation-timing-function: linear; animation-iteration-count: infinite;
  }
  .amb-rain::before {
    inset: -${RAIN.h * RAIN.far}px -${RAIN.w * RAIN.far}px 0 0;
    background-size: ${RAIN.w * RAIN.far}px ${RAIN.h * RAIN.far}px;
    opacity: calc(min(1, ${A}) * ${AMP.rainFar});
    animation-name: amb-rain-far; animation-duration: calc(var(--amb-dur, 0.9s) * 1.5);
  }
  .amb-rain::after {
    inset: -${RAIN.h}px -${RAIN.w}px 0 0;
    background-size: ${RAIN.w}px ${RAIN.h}px;
    opacity: calc(max(0, ${A} - 0.5) * ${AMP.rainNear});
    animation-name: amb-rain-near; animation-duration: var(--amb-dur, 0.9s);
  }
  @keyframes amb-rain-far { from { transform: translate(0, 0); } to { transform: translate(-${RAIN.w * RAIN.far}px, ${RAIN.h * RAIN.far}px); } }
  @keyframes amb-rain-near { from { transform: translate(0, 0); } to { transform: translate(-${RAIN.w}px, ${RAIN.h}px); } }

  /* flash: played from JS at random gaps; the class only marks the layer */
  .amb-flash { animation: none; }

  /* spray: a burst, then nothing for the rest of the period */
  @keyframes amb-spray {
    0%   { opacity: 0; transform: translateY(0) scale(calc(1 - ${AMP.sprayGrow} * ${A})); }
    6%   { opacity: 1; }
    22%  { opacity: 0.9; transform: translateY(calc(${SH} * -${AMP.sprayRise} * ${A})) scale(calc(1 + ${AMP.sprayGrow} * 0.5 * ${A})); }
    40%, 100% { opacity: 0; transform: translateY(calc(${SH} * -${AMP.sprayRise} * 1.2 * ${A})) scale(calc(1 + ${AMP.sprayGrow} * ${A})); }
  }
  .amb-spray {
    animation-name: amb-spray; animation-duration: var(--amb-dur, 7s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* flicker: irregular dips in a light's opacity */
  @keyframes amb-flicker {
    0%, 52%, 100% { opacity: 1; }
    13% { opacity: calc(1 - ${AMP.flickerDip} * 0.6 * ${A}); }
    21% { opacity: calc(1 - ${AMP.flickerDip} * 0.2 * ${A}); }
    38% { opacity: calc(1 - ${AMP.flickerDip} * ${A}); }
    67% { opacity: calc(1 - ${AMP.flickerDip} * 0.4 * ${A}); }
    81% { opacity: calc(1 - ${AMP.flickerDip} * 0.8 * ${A}); }
  }
  .amb-flicker { animation-name: amb-flicker; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal; }

  /* rise: a smoke puff climbs, grows and thins out; gas decelerates and never overshoots */
  @keyframes amb-rise {
    0%   { opacity: 0; transform: translateY(0) scale(1); }
    20%  { opacity: 1; }
    60%  { opacity: 0.8; }
    100% { opacity: 0; transform: translateY(calc(${SH} * -${AMP.riseLift} * ${A})) scale(calc(1 + ${AMP.riseGrow} * ${A})); }
  }
  .amb-rise {
    animation-name: amb-rise; animation-duration: var(--amb-dur, 9s); animation-direction: normal;
    animation-timing-function: cubic-bezier(0.333, 1, 0.667, 1);
  }

  /* oars: a slow pull, a quicker recovery, about the grip */
  @keyframes amb-oars {
    0%, 100% { transform: rotate(calc(-${AMP.oarsDeg}deg * ${A})); }
    60%      { transform: rotate(calc(${AMP.oarsDeg}deg * ${A})); }
  }
  .amb-oars {
    animation-name: amb-oars; animation-duration: var(--amb-dur, 2.4s); animation-direction: normal;
    transform-origin: 50% 15% !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .amb, .amb::before, .amb::after, .amb > img { animation: none !important; }
  }
`

// Drawn, not vector-clean (it sits in a watercolour/pencil plate): pencil grey, thin, each stroke
// its own length, weight, opacity and a hair of bow, scattered irregularly. Every stroke stays
// clear of the tile edges, so the tile repeats without a cut streak.
const RAIN = { w: 90, h: 270, far: 0.6 }
const RAIN_STROKES = [
  // [x, y, length, width, opacity, bow]
  [22, 14, 24, 0.7, 0.55, 0.8], [61, 38, 15, 0.5, 0.35, -0.5], [80, 77, 28, 0.8, 0.6, 0.6],
  [41, 96, 12, 0.5, 0.3, 0.3], [17, 131, 21, 0.6, 0.5, -0.7], [70, 150, 18, 0.7, 0.42, 0.4],
  [50, 189, 26, 0.6, 0.52, -0.4], [30, 214, 14, 0.5, 0.33, 0.6], [77, 229, 20, 0.7, 0.46, -0.3],
]
const RAIN_TILE = (() => {
  const slope = -RAIN.w / RAIN.h                 // the fall direction (-w, +h)
  const stroke = ([x, y, len, w, op, bow]) => {
    const x2 = round(x + slope * len)
    const cx = round((x + x2) / 2 + bow)
    return `<path d='M${x} ${y} Q${cx} ${y + len / 2} ${x2} ${y + len}' stroke-width='${w}' stroke-opacity='${op}'/>`
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${RAIN.w}' height='${RAIN.h}'>`
    + "<g fill='none' stroke='rgb(198,202,206)' stroke-linecap='round'>"
    + RAIN_STROKES.map(stroke).join('') + '</g></svg>'

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})()

// Checked by DOM presence, not a module flag: tests and SPA navigations wipe the head.
function injectAmbientStyles () {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = buildCss()
  document.head.appendChild(style)
  registerAmbientTuner()
}

/**
 * Bart's dev tuner: every period and amplitude above, READ from PERIOD_S / AMP (never restated).
 * A period change re-applies the live layers; an amplitude change rebuilds the sheet.
 */
let tunerOff = null
function registerAmbientTuner () {
  if (tunerOff || typeof window === 'undefined' || !window.__tune?.register) return
  const restyle = () => {
    const el = document.getElementById(STYLE_ID)
    if (el) el.textContent = buildCss()
  }
  tunerOff = window.__tune.register('World motion', [
    ...Object.keys(PERIOD_S).map((m) => ({
      key: `period_${m}`, label: `${m} period (s)`, min: 0.2, max: Math.max(60, PERIOD_S[m] * 3), step: 0.1,
      value: PERIOD_S[m], apply: (v) => { PERIOD_S[m] = Number(v); reapplyAmbient() },
    })),
    ...Object.keys(AMP).map((k) => ({
      key: k, label: k, min: 0, max: Math.max(0.1, AMP[k] * 4), step: AMP[k] >= 1 ? 0.1 : 0.001,
      value: AMP[k], apply: (v) => { AMP[k] = Number(v); restyle() },
    })),
  ], { tab: 'Lesson' }) ?? null
}
