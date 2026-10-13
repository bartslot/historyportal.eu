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
 *
 * All 0..1, all off by default (app/Services/Support/LayerSitIn.php holds the server side).
 * Everything here is drawn and flat, never photographic: no blur, no depth fade.
 *
 * The colours come from the backdrop itself: the plate is read once into a small canvas (cached
 * per url), and each layer averages the pixels in a band around / under its box.
 */

export const SIT_KEYS = ['waterline', 'reflection', 'contact_shadow', 'color_match']

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
}

const clamp01 = (n) => (Number.isFinite(Number(n)) && n !== null && n !== '' ? Math.min(1, Math.max(0, Number(n))) : 0)
const round = (n, dp = 3) => Math.round(n * 10 ** dp) / 10 ** dp

/**
 * Pure: the four values of a layer, clamped, or null when all are off.
 * @returns {{waterline:number, reflection:number, contact_shadow:number, color_match:number}|null}
 */
export function sitSpec (layer) {
  const spec = Object.fromEntries(SIT_KEYS.map(k => [k, clamp01(layer?.[k])]))
  return SIT_KEYS.some(k => spec[k] > 0) ? spec : null
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
    .sit-reflection, .sit-shadow { position: absolute; pointer-events: none; }
    @media (prefers-reduced-motion: reduce) { .sit-waterline { animation: none; } }
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
 * @param {{around?: number[], below?: number[]}|null} colours  sampled, or null for the fallback
 * @returns {object|null} the spec drawn
 */
export function renderSitIn (node, body, img, item, colours = null) {
  for (const el of node.querySelectorAll(':scope > .sit-reflection, :scope > .sit-shadow')) el.remove()
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
