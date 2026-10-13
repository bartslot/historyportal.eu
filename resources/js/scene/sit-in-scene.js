/**
 * "Blend into the scene": what makes a cut-out (a ship, a canoe, a figure) sit IN the painted
 * backdrop instead of looking pasted onto it (Bart, 2026-10-13, the Tasman screenshot).
 *
 *   waterline       share of the layer's height, from the bottom, under water: the part below a
 *                   gently wavy, drawn edge is hidden (a mask on the picture; the wave drifts)
 *   reflection      a mirrored copy under the waterline, washed toward the water's colour and
 *                   broken into stepped ripple bands that thin out downward (opacity only, no blur)
 *   contact_shadow  a flat, soft-edged patch under the layer's bottom in a darker shade of what is
 *                   beneath it
 *   color_match     the layer's colours washed toward the backdrop around it (a glaze)
 *   foam            white foam where the hull meets the water, drawn the ligne-claire way: flat
 *                   paper-white shapes with broken edges and a few fine cool-grey lines (no blur,
 *                   no glow, no haze). Three parts: a band hugging the hull at the waterline (or
 *                   the bottom edge), a bow wave peeling off the bow (bigger with more amount and
 *                   a faster swing), and a wake of separate patches behind the stern that drift
 *                   back and fade (opacity only). It churns in step with the layer's bob / roll /
 *                   swell. It belongs to the LAYER, so it works on any sea plate; it is tinted a
 *                   touch toward the water under it, so it never glares on a night sea.
 *   speed           how fast the boat is meant to go, 0..1. 0 = at anchor: the hull band only.
 *                   More speed = a bigger bow wave and a longer, stronger wake that reads as
 *                   forward motion. A plain layer value the player may change while it plays:
 *                   ArtworkOverlay.setSpeed(assetId, 0..1) (the power-meter hook) restyles the
 *                   live foam in place, no rebuild, no restarted animation.
 *                   The bow is the picture's right side (how the library's ships are drawn);
 *                   flip_x mirrors the whole layer, foam included, so a flipped ship's bow foam
 *                   follows it.
 *
 * All 0..1, all off by default (app/Services/Support/LayerSitIn.php holds the server side).
 * Everything here is drawn and flat, never photographic: no blur, no depth fade.
 *
 * The colours come from the backdrop itself: the plate is read once into a small canvas (cached
 * per url), and each layer averages the pixels in a band around / under its box.
 */

export const SIT_KEYS = ['waterline', 'reflection', 'contact_shadow', 'color_match', 'foam', 'speed']

/** The keys that draw something; `speed` only shapes the foam. */
const DRAWN_KEYS = SIT_KEYS.filter(k => k !== 'speed')

/** Shown until (or instead of, on a cross-origin plate) a real sample: a neutral dusk grey. */
export const FALLBACK_RGB = [70, 72, 80]

/** Dev-tunable look (window.__tune "Blend into scene"). */
export const SIT = {
  waveAmp: 1.6,        // the waterline's wave, in % of the layer's height
  waveDriftS: 18,      // one wave tile drifting past
  reflectionTint: 0.6, // how far the reflection is washed toward the water's colour
  reflectionBands: 7,  // ripple bands before the reflection has gone
  shadowHeight: 0.1,   // share of the layer's height
  shadowDark: 0.45,    // the patch is the colour beneath x this
  shadowOpacity: 0.85, // at contact_shadow 1
  foamHeight: 0.07,    // share of the layer's height the hull band spans at the bow
  foamTint: 0.14,      // how far paper-white leans toward the water's colour on a bright sea
  foamDusk: 0.4,       // ... and how much further on a dark one (x (1 - its luminance))
  foamChurnPx: 10,     // how far the band's lines shift per half swing
  bowWidth: 0.22,      // the bow wave at foam 1 and speed 1, share of the layer's width
  bowHeight: 0.2,     //   ... and of its height
  wakePatches: 6,      // patches in the wake at full speed (fewer show at lower speed)
  wakeRun: 7,          // how far a patch drifts back at full speed, in its own widths
}

const clamp01 = (n) => (Number.isFinite(Number(n)) && n !== null && n !== '' ? Math.min(1, Math.max(0, Number(n))) : 0)
const round = (n, dp = 3) => Math.round(n * 10 ** dp) / 10 ** dp

/**
 * Pure: the four values of a layer, clamped, or null when all are off.
 * @returns {{waterline:number, reflection:number, contact_shadow:number, color_match:number}|null}
 */
export function sitSpec (layer) {
  const spec = Object.fromEntries(SIT_KEYS.map(k => [k, clamp01(layer?.[k])]))
  return DRAWN_KEYS.some(k => spec[k] > 0) ? spec : null
}

/**
 * Pure: a point on the stage (fractions 0..1) to the same point of a backdrop shown object-fit
 * cover, centred. A plate shown whole has the stage's own aspect, which makes this the identity.
 */
export function coverToImage (sx, sy, stageAspect, imageAspect) {
  if (!(stageAspect > 0 && imageAspect > 0)) return [sx, sy]
  if (imageAspect > stageAspect) return [0.5 + (sx - 0.5) * (stageAspect / imageAspect), sy]
  return [sx, 0.5 + (sy - 0.5) * (imageAspect / stageAspect)]
}

const box01 = ({ x0, y0, x1, y1 }) => ({
  x0: Math.max(0, Math.min(1, x0)), y0: Math.max(0, Math.min(1, y0)),
  x1: Math.max(0, Math.min(1, x1)), y1: Math.max(0, Math.min(1, y1)),
})

/**
 * Pure: where to sample, in stage fractions, for a layer box {x, y (top-left), w, h}.
 * `around`: a band round the box (the light the layer stands in). `below`: what is under its
 * bottom, or under its waterline (the water a reflection and a shadow fall on).
 */
export function sampleBoxes ({ x, y, w, h }, waterline = 0) {
  const line = y + h * (1 - waterline)
  return {
    around: box01({ x0: x - w * 0.3, y0: y - h * 0.15, x1: x + w * 1.3, y1: y + h * 1.15 }),
    below: box01({ x0: x + w * 0.1, y0: line, x1: x + w * 0.9, y1: line + h * 0.25 }),
  }
}

/**
 * Pure: the average colour of a box (fractions) of RGBA pixel data, skipping transparent pixels.
 * @returns {number[]|null} [r, g, b] 0..255, or null when the box holds nothing
 */
export function averageRgb (data, width, height, box) {
  const x0 = Math.floor(box.x0 * width); const x1 = Math.max(x0 + 1, Math.ceil(box.x1 * width))
  const y0 = Math.floor(box.y0 * height); const y1 = Math.max(y0 + 1, Math.ceil(box.y1 * height))
  let r = 0; let g = 0; let b = 0; let n = 0
  for (let y = y0; y < Math.min(y1, height); y++) {
    for (let x = x0; x < Math.min(x1, width); x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 8) continue
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
    }
  }
  return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null
}

/**
 * Pure: an feColorMatrix that glazes a picture toward a colour. Each channel is scaled by
 * 1 - a + a x glaze, where the glaze is half the colour's hue at full strength and half the
 * colour itself: a dusk plate both cools and darkens the ship, a sunny one only warms it a little.
 * Amount 0 is the identity.
 */
export function washMatrix (rgb, amount) {
  const a = clamp01(amount)
  const c = rgb.map(v => Math.min(255, Math.max(0, v)) / 255)
  const max = Math.max(...c, 1 / 255)
  const f = c.map(v => round(1 - a + a * (0.5 * v / max + 0.5 * v)))
  return `${f[0]} 0 0 0 0 0 ${f[1]} 0 0 0 0 0 ${f[2]} 0 0 0 0 0 1 0`
}

/** Pure: a colour darkened by k (0..1), as CSS. */
export const shade = (rgb, k) => `rgb(${rgb.map(v => Math.round(v * k)).join(', ')})`

const svgUrl = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

/**
 * Pure: the waterline mask: opaque above a wavy line at `level` (share from the bottom), clear
 * below. One tile holds two uneven waves and starts and ends on the same height, so it repeats
 * sideways without a seam (and can drift).
 */
export function waveMask (level, amp = SIT.waveAmp) {
  const yl = round(100 * (1 - clamp01(level)), 2)
  const y = (d) => round(yl + d * amp, 2)
  const path = `M0 0H100V${yl}Q87.5 ${y(1)} 75 ${yl}T50 ${yl}Q37.5 ${y(-0.7)} 25 ${yl}T0 ${yl}Z`
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${path}' fill='#000'/></svg>`)
}

/**
 * Pure: the reflection's mask: horizontal bands, each a step fainter than the one above, with a
 * thin gap under each (the ripple). A stepped fade, never a blur.
 */
export function rippleMask (bands = SIT.reflectionBands) {
  const n = Math.max(1, Math.round(bands))
  const h = 60 / n   // the reflection is gone by 60% of the layer's height
  const rects = Array.from({ length: n }, (_, i) => {
    const op = round(((n - i) / n) ** 1.4, 3)
    const inset = round((i % 2) * 3 + i * 1.5, 1)   // later bands break up: shorter, offset
    return `<rect x='${inset}' y='${round(i * h, 2)}' width='${round(100 - inset * 1.7, 1)}' height='${round(h * 0.78, 2)}' fill-opacity='${op}'/>`
  })
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><g fill='#000'>${rects.join('')}</g></svg>`)
}

/** Pure: a colour mixed toward another by t (0..1). */
export const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))

const PAPER = [250, 249, 244]
const COOL_RIM = [168, 182, 196]

/** Pure: the foam's paper-white fill and its faint cool rim, leaning toward the water under it. */
export function foamColours (below, tint = SIT.foamTint) {
  // The darker the water, the further the white leans into it: at dusk or night foam is a soft
  // off-white of the sea's own hue, never paper glaring on a dark plate.
  const lum = (0.2126 * below[0] + 0.7152 * below[1] + 0.0722 * below[2]) / 255
  const t = Math.min(0.75, tint + SIT.foamDusk * (1 - lum))
  return { fill: mixRgb(PAPER, below, t), rim: mixRgb(COOL_RIM, below, Math.min(0.85, t * 1.5)) }
}

// A fixed jitter (no Math.random): the same layer draws the same foam on every machine.
const jitter = (i) => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1
const rgbCss = (rgb) => `rgb(${rgb.join(',')})`

/**
 * Pure: the hull band's outline as a mask, in a 200 x 20 box (bow on the right): one flat shape
 * with a broken, scalloped edge, thin at the stern and fuller toward the bow.
 */
export function foamShape () {
  // Broken: runs of two to four scallops with open water between them, fuller toward the bow.
  const blobs = []
  let x = 4
  let i = 0
  while (x < 196) {
    const run = 2 + Math.floor(jitter(i + 500) * 3)
    for (let k = 0; k < run && x < 196; k++, i++) {
      const t = x / 196                                   // 0 stern .. 1 bow
      const ry = round(2 + 4 * t * t + jitter(i + 40) * 1.6, 2)
      blobs.push(`<ellipse cx='${round(x, 2)}' cy='${round(10 + (jitter(i + 80) - 0.5) * 2.4, 2)}' rx='${round(3 + jitter(i + 120) * 2.2, 2)}' ry='${ry}'/>`)
      x += 5 + jitter(i) * 3
    }
    x += 5 + jitter(i + 600) * 9                          // a gap of water
  }
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 20' preserveAspectRatio='none'><g fill='#000'>${blobs.join('')}</g></svg>`)
}

/** Pure: the band's few fine lines, one repeating tile (they shift to churn; the shape stays). */
export function foamLines (rim) {
  const strokes = [
    "M2 7 Q8 5 14 7", "M19 9 Q24 7.5 29 9.5", "M33 6 Q36 5 39 6.5",
  ]
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='12' viewBox='0 0 40 12'><g fill='none' stroke='${rgbCss(rim)}' stroke-width='0.6' stroke-linecap='round' stroke-opacity='0.7'>${strokes.map(d => `<path d='${d}'/>`).join('')}</g></svg>`)
}

/**
 * Pure: the bow wave, in a 60 x 40 box with the hull on the left and the water line at y 34: a
 * flat white crest climbing the stem and peeling forward off it, a smaller lobe peeling to the
 * far side behind it, and three fine lines following the curl.
 */
export function bowWave (fill, rim) {
  const far = "M8 34 C12 24 20 18 30 17 C36 17 40 21 38 26 C42 25 46 28 44 33 Z"
  const near = "M0 36 C4 26 10 15 20 9 C26 5 34 4 40 8 C44 11 43 15 39 15 C45 15 51 19 50 24 "
    + "C55 24 60 29 57 34 C52 37 46 33 42 37 C36 33 30 38 24 35 C16 39 8 35 0 36 Z"
  const lines = ["M14 22 C20 14 28 10 36 10", "M26 25 C32 20 40 19 47 23", "M30 33 C37 30 44 30 51 32"]
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40' preserveAspectRatio='none'>`
    + `<path d='${far}' fill='${rgbCss(mixRgb(fill, rim, 0.25))}'/>`
    + `<path d='${near}' fill='${rgbCss(fill)}'/>`
    + `<g fill='none' stroke='${rgbCss(rim)}' stroke-width='0.7' stroke-linecap='round' stroke-opacity='0.75'>${lines.map(d => `<path d='${d}'/>`).join('')}</g></svg>`)
}

/** Pure: one wake patch: an irregular flat white shape with one fine line along part of its edge. */
export function wakePatch (fill, rim, i = 0) {
  const pts = Array.from({ length: 7 }, (_, k) => {
    const a = (k / 7) * Math.PI * 2
    const r = 0.72 + jitter(i * 11 + k) * 0.28
    return [round(20 + Math.cos(a) * 19 * r, 2), round(8 + Math.sin(a) * 7 * r, 2)]
  })
  const d = `M${pts[0].join(' ')} ` + pts.slice(1).map(([x, y], k) => `Q${round((pts[k][0] + x) / 2 + (jitter(i + k + 60) - 0.5) * 4, 2)} ${round((pts[k][1] + y) / 2, 2)} ${x} ${y}`).join(' ') + ' Z'
  return svgUrl(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 16' preserveAspectRatio='none'><path d='${d}' fill='${rgbCss(fill)}'/>`
    + `<path d='M${pts[4].join(' ')} Q20 15 ${pts[1].join(' ')}' fill='none' stroke='${rgbCss(rim)}' stroke-width='0.7' stroke-opacity='0.7'/></svg>`)
}

/**
 * Pure: how big the bow wave is: more foam and more speed push a bigger wave. At anchor
 * (speed 0) there is none.
 */
export function bowScale (foam, speed) {
  const v = clamp01(speed)
  return v > 0 && foam > 0 ? round((0.5 + 0.5 * clamp01(foam)) * (0.45 + 0.55 * v), 3) : 0
}

/**
 * Pure: where the hull meets the water, across the picture: the first and last opaque column in
 * the rows just above the waterline (fractions 0..1 of the picture's width). The picture's box
 * also holds a bowsprit, flags and oars; the foam belongs at the HULL, not at the box's edge.
 * @returns {number[]|null} [stern, bow], or null when nothing is opaque there
 */
export function hullSpan (pixels, line) {
  if (!pixels) return null
  const { data, width, height } = pixels
  const y1 = Math.min(height - 1, Math.round(line * height) - 1)
  const y0 = Math.max(0, y1 - Math.max(1, Math.round(height * 0.06)))
  let x0 = width; let x1 = -1
  for (let y = y0; y <= y1; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 128) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
    }
  }
  return x1 < 0 ? null : [round(x0 / width), round((x1 + 1) / width)]
}

/** Where the hull is assumed to be until (or if) the picture can be read. */
const HULL_GUESS = [0.06, 0.94]

/** Pure: the hull band's thickness at a speed: a thin lapping line at anchor, full when under way. */
export const bandScale = (speed) => round(0.35 + 0.65 * clamp01(speed), 3)

/**
 * Pure: the wake at a speed: for each patch, how strongly it shows (more patches appear as the
 * boat speeds up, the later ones fainter) and how far it drifts back (in its own widths).
 * @returns {{op: number, run: number}[]}
 */
export function wakePlan (foam, speed, n = SIT.wakePatches) {
  const v = clamp01(speed)
  const count = Math.max(0, Math.round(n))
  return Array.from({ length: count }, (_, i) => ({
    op: round(clamp01(v * count - i) * (clamp01(foam) > 0 ? 1 : 0) * (1 - i / (count + 2)), 3),
    run: round(1.5 + SIT.wakeRun * v, 2),
  }))
}

// ── The backdrop's pixels, read once per url ───────────────────────────────────────────────
const SAMPLE_W = 96
const pixelCache = new Map()

/**
 * A small copy of the backdrop's pixels, or null when it cannot be read (no url, a plate served
 * without CORS, a test DOM). Cached per url: every layer on the plate shares one read.
 * @returns {Promise<{data: Uint8ClampedArray, width: number, height: number, aspect: number}|null>}
 */
export function backdropPixels (url) {
  if (!url) return Promise.resolve(null)
  if (!pixelCache.has(url)) {
    pixelCache.set(url, new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const aspect = img.naturalWidth / img.naturalHeight
          const width = SAMPLE_W
          const height = Math.max(1, Math.round(SAMPLE_W / aspect))
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(img, 0, 0, width, height)
          resolve({ data: ctx.getImageData(0, 0, width, height).data, width, height, aspect })
        } catch (_) { resolve(null) }   // a tainted canvas: no sample, the fallback colour stays
      }
      img.onerror = () => resolve(null)
      img.src = url
    }))
  }
  return pixelCache.get(url)
}

/** Pure: the colours around / under a layer box, from the backdrop's pixels. */
export function sampleColours (pixels, rect, stageAspect, waterline = 0) {
  if (!pixels) return null
  const toImg = (b) => {
    const [x0, y0] = coverToImage(b.x0, b.y0, stageAspect, pixels.aspect)
    const [x1, y1] = coverToImage(b.x1, b.y1, stageAspect, pixels.aspect)
    return averageRgb(pixels.data, pixels.width, pixels.height, { x0, y0, x1, y1 })
  }
  const { around, below } = sampleBoxes(rect, waterline)
  return { around: toImg(around), below: toImg(below) }
}

// ── DOM ────────────────────────────────────────────────────────────────────────────────────
const STYLE_ID = 'sit-styles'
function injectStyles () {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes sit-wave { from { mask-position: 0% 0%; } to { mask-position: 100% 0%; } }
    .sit-waterline { mask-size: 50% 100%; mask-repeat: repeat-x; animation: sit-wave var(--sit-drift, 18s) linear infinite; }
    .sit-reflection, .sit-shadow, .sit-foam, .sit-bow, .sit-wake { position: absolute; pointer-events: none; }
    /* The band's lines churn on the layer's own swing (its --amb-dur, inherited from the ambient
       wrapper), eased like the bob it rides on. */
    @keyframes sit-churn {
      from { background-position: 0 0; }
      to   { background-position: var(--sit-churn, 10px) 0; }
    }
    .sit-foam {
      background-repeat: repeat-x; background-size: auto 100%;
      mask-size: 100% 100%; mask-repeat: no-repeat;
      animation: sit-churn calc(var(--amb-dur, 6s) / 2) cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
      animation-delay: var(--amb-delay, 0s);
    }
    /* The bow wave swells and settles with the swing, about the water line. */
    @keyframes sit-bow { from { transform: scale(0.88, 0.8); } to { transform: scale(1.04, 1.06); } }
    .sit-bow {
      background-size: 100% 100%; transform-origin: 0% 85%;
      animation: sit-bow calc(var(--amb-dur, 6s) / 2) cubic-bezier(0.37, 0, 0.63, 1) infinite alternate;
      animation-delay: var(--amb-delay, 0s);
    }
    /* Wake patches are born at the stern and drift back and apart (the V), fading: opacity
       only, never a blur. A drift is a deceleration (ease-out). */
    @keyframes sit-wake {
      0%   { transform: translate(0, 0); opacity: 0; }
      8%, 45% { opacity: var(--sit-wake-op, 0); }
      100% { transform: translate(calc(var(--sit-wake-run, 0) * -100%), calc(var(--sit-wake-side, 1) * var(--sit-wake-run, 0) * 18%)); opacity: 0; }
    }
    .sit-wake {
      background-size: 100% 100%; opacity: 0;
      animation: sit-wake calc(var(--amb-dur, 6s) * 1.4) cubic-bezier(0.16, 1, 0.3, 1) infinite;
    }
    @media (prefers-reduced-motion: reduce) { .sit-waterline, .sit-foam, .sit-bow, .sit-wake { animation: none; } }
  `
  document.head.appendChild(style)
}

/**
 * Draw (or redraw, or remove) a layer's blend-into-scene treatment.
 *
 * @param {HTMLElement} node   the layer's positioned box (the picture's size)
 * @param {HTMLElement} body   the moving wrapper holding the picture (ambient motion)
 * @param {HTMLImageElement} img
 * @param {object} item        the layer: the four keys, url, width
 * @param {{around?: number[], below?: number[], hull?: number[]}|null} colours  sampled (hull: the
 *        picture's [stern, bow] at the waterline, see hullSpan), or null for the fallback
 * @returns {object|null} the spec drawn
 */
export function renderSitIn (node, body, img, item, colours = null) {
  for (const el of node.querySelectorAll(':scope > .sit-reflection, :scope > .sit-shadow, .sit-foam, .sit-bow, .sit-wake')) el.remove()
  img.classList.remove('sit-waterline')
  img.style.removeProperty('mask-image')
  const spec = sitSpec(item)
  if (!spec) return null
  injectStyles()
  const below = colours?.below ?? FALLBACK_RGB
  const line = 1 - spec.waterline   // where the water starts, from the top, as a share

  if (spec.waterline > 0) {
    img.classList.add('sit-waterline')
    img.style.maskImage = waveMask(spec.waterline)
    img.style.setProperty('--sit-drift', `${SIT.waveDriftS}s`)
  }

  if (spec.foam > 0) drawFoam(body, item, spec, line, below, colours)

  if (spec.contact_shadow > 0) {
    const h = SIT.shadowHeight * 100
    const shadow = document.createElement('div')
    shadow.className = 'sit-shadow'
    shadow.setAttribute('aria-hidden', 'true')
    // A flat patch with a soft rim: a watercolour stain, not a blurred drop shadow.
    shadow.style.cssText = `left:8%; width:84%; height:${h}%; top:calc(${round(line * 100, 2)}% - ${h / 2}%);
      background:radial-gradient(closest-side, ${shade(below, SIT.shadowDark)} 68%, transparent 100%);
      opacity:${round(spec.contact_shadow * SIT.shadowOpacity)};`
    node.insertBefore(shadow, node.firstChild)
  }

  if (spec.reflection > 0) {
    const refl = document.createElement('div')
    refl.className = 'sit-reflection'
    refl.setAttribute('aria-hidden', 'true')
    refl.style.cssText = `left:0; top:${round(line * 100, 2)}%; width:100%; height:100%; overflow:hidden;
      opacity:${spec.reflection}; mask-image:${rippleMask()}; mask-size:100% 100%; mask-repeat:no-repeat;`
    const copy = document.createElement('img')
    copy.src = img.src
    copy.alt = ''
    copy.draggable = false
    // Mirrored about the waterline: the row on the line is the reflection's top row.
    copy.style.cssText = `position:absolute; left:0; top:${round(-spec.waterline * 100, 2)}%; height:100%;
      width:${Number.isFinite(item.width) ? '100%' : 'auto'}; transform:scaleY(-1); display:block;`
    copy.style.filter = washFilter(node, `sitfx-r-${item.asset_id}`, below, SIT.reflectionTint)
    refl.appendChild(copy)
    node.insertBefore(refl, body)
  }

  return spec
}

/**
 * The foam: the hull band, the bow wave (right side: the bow) and the wake patches behind the
 * stern. Inside the moving wrapper, so all of it rides the bob / roll / swell with the hull.
 */
function drawFoam (body, item, spec, line, below, colours) {
  const { fill, rim } = foamColours(below)
  const top = round(line * 100, 2)
  const add = (cls, css) => {
    const el = document.createElement('div')
    el.className = cls
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = css
    body.appendChild(el)
    return el
  }
  if (!body.style.position) body.style.position = 'relative'

  // Crisp, never translucent: more foam makes the band fuller, not more opaque.
  const [stern, bow] = (colours?.hull ?? HULL_GUESS).map(v => round(v * 100, 2))
  const h = round(SIT.foamHeight * 100 * (0.6 + 0.4 * spec.foam), 2)
  const band = add('sit-foam', `left:${round(stern - 1, 2)}%; width:${round(bow - stern + 2, 2)}%;
    height:calc(var(--sit-band-k, 1) * ${h}%); top:calc(${top}% - var(--sit-band-k, 1) * ${h / 2}%);
    background-color:${rgbCss(fill)}; background-image:${foamLines(rim)}; mask-image:${foamShape()};`)
  band.style.setProperty('--sit-churn', `${SIT.foamChurnPx}px`)

  // Sized by --sit-bow-k (applyFoamSpeed), so a speed change restyles it in place.
  const bw = SIT.bowWidth * 100
  const bh = SIT.bowHeight * 100
  add('sit-bow', `left:calc(${bow}% - var(--sit-bow-k, 0) * ${round(bw * 0.35, 2)}%); width:calc(var(--sit-bow-k, 0) * ${bw}%);
    height:calc(var(--sit-bow-k, 0) * ${bh}%); top:calc(${top}% - var(--sit-bow-k, 0) * ${round(bh * 0.85, 2)}%);
    background-image:${bowWave(fill, rim)};`)

  // The wake: patches born at the stern, one after another, each drifting back and out to its
  // arm of the V and fading. Staggered over one cycle, so the trail is continuous.
  const n = Math.max(0, Math.round(SIT.wakePatches))
  for (let i = 0; i < n; i++) {
    const w = round(10 - (i % 3) * 1.5, 2)
    const side = i % 2 ? 1 : -1
    const wake = add('sit-wake', `left:${round(stern - w * 0.6, 2)}%; width:${w}%; height:${round(w * 0.4, 2)}%;
      top:calc(${top}% - ${round(w * 0.2, 2)}%); background-image:${wakePatch(fill, rim, i)};
      animation-delay:calc(var(--amb-dur, 6s) * ${round(-1.4 * i / n, 3)});`)
    wake.style.setProperty('--sit-wake-side', String(side))
  }
  applyFoamSpeed(body, spec.foam, spec.speed)
}

/**
 * Set how fast the boat goes on its live foam: the bow wave's size and each wake patch's strength
 * and drift. Custom properties only, so the running animations keep their phase.
 */
export function applyFoamSpeed (body, foam, speed) {
  if (!body) return
  body.style.setProperty('--sit-bow-k', String(bowScale(foam, speed)))
  body.style.setProperty('--sit-band-k', String(bandScale(speed)))
  const plan = wakePlan(foam, speed)
  body.querySelectorAll(':scope > .sit-wake').forEach((el, i) => {
    el.style.setProperty('--sit-wake-op', String(plan[i]?.op ?? 0))
    el.style.setProperty('--sit-wake-run', String(plan[i]?.run ?? 0))
  })
}

/** An SVG colour-matrix filter on the node's own carrier, returned as a CSS filter value. */
function washFilter (host, id, rgb, amount) {
  let svg = host.querySelector(`#${id}`)?.closest('svg')
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.cssText = 'position:absolute; width:0; height:0; pointer-events:none;'
    host.appendChild(svg)
  }
  svg.innerHTML = `<defs><filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${washMatrix(rgb, amount)}"/></filter></defs>`
  return `url(#${id})`
}

/** Bart's dev tuner for the look above; a change redraws through `redraw`. */
let tunerOff = null
export function registerSitTuner (redraw) {
  if (tunerOff || typeof window === 'undefined' || !window.__tune?.register) return
  tunerOff = window.__tune.register('Blend into scene', Object.keys(SIT).map((k) => ({
    key: k, label: k, min: 0, max: Math.max(1, SIT[k] * 3), step: SIT[k] >= 2 ? 0.5 : 0.01,
    value: SIT[k], apply: (v) => { SIT[k] = Number(v); redraw?.() },
  })), { tab: 'Lesson' }) ?? null
}
