/**
 * A kit piece drawn as ONE SVG instead of four baked pictures, so it can be reshaped in code (kit.json `files.svg`).
 * The SVG has four groups: `.fill` (shapes with `data-kind="ochre"`), `.shade` and `.cast` (masks: where it is dark,
 * where it shades what lies under it; `data-strength` 0..1) and `.ink` (the pen line). Each pass keeps one group and
 * renders it at the piece's box size into the same pixels a baked piece has, so recolour, Save and the rig never know
 * the difference: fill = kind key in red (R = 10 + 18 i), ink / shade / cast = strength in red.
 */

const GROUPS = ['fill', 'shade', 'cast', 'ink']
const keyOf = (i) => 10 + 18 * i

/**
 * The SVG text for one pass: only that group, painted so its pixels mean what a baked layer's mean. Pure (tested).
 *
 * @param {string} text   the piece's SVG
 * @param {'fill'|'shade'|'cast'|'ink'} pass
 * @param {string[]} kinds  the kit's kinds, in order (kit.json `kinds`)
 * @param {[number, number]} size  the piece's box width and height
 * @returns {string|null}  null when the SVG has no such group (a piece that casts nothing)
 */
export function passSvg (text, pass, kinds, size) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.documentElement
  if (svg.nodeName !== 'svg' || doc.querySelector('parsererror')) throw new Error('not an SVG piece')
  svg.setAttribute('width', String(size[0]))
  svg.setAttribute('height', String(size[1]))
  let kept = null
  for (const name of GROUPS) {
    for (const g of [...svg.querySelectorAll(`g.${name}`)]) {
      if (name !== pass) { g.remove(); continue }
      kept = g
    }
  }
  if (!kept) return null
  if (pass === 'fill') {
    for (const el of kept.querySelectorAll('[data-kind]')) {
      const i = kinds.indexOf(el.getAttribute('data-kind'))
      if (i < 0) throw new Error(`unknown kind ${el.getAttribute('data-kind')}`)
      const k = keyOf(i)
      el.setAttribute('fill', `rgb(${k},${k},${k})`)
      el.removeAttribute('opacity')
    }
  } else {
    // a mask: drawn opaque at its strength, so its alpha is the strength (the picture view shows it faint)
    kept.setAttribute('opacity', kept.getAttribute('data-strength') ?? '1')
  }
  return new XMLSerializer().serializeToString(svg)
}

/** Rasterise SVG text to RGBA pixels at w x h. */
async function pixelsOf (text, w, h) {
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('SVG piece did not render'))
      img.src = url
    })
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const g = c.getContext('2d', { willReadFrequently: true })
    g.drawImage(img, 0, 0, w, h)
    return g.getImageData(0, 0, w, h)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** A mask's alpha as a baked layer: strength in red (and green, blue), opaque. */
export function strengthOf ({ data, width, height }) {
  const out = new Uint8ClampedArray(width * height * 4)
  for (let o = 0; o < out.length; o += 4) {
    const a = data[o + 3]
    out[o] = a; out[o + 1] = a; out[o + 2] = a; out[o + 3] = 255
  }
  return new ImageData(out, width, height)
}

/** The fill pass with the kind key back in red at every painted pixel (the canvas un-premultiplies edges slightly off). */
export function keyedFill ({ data, width, height }) {
  const out = new Uint8ClampedArray(data)
  for (let o = 0; o < out.length; o += 4) {
    if (!out[o + 3]) continue
    const k = keyOf(Math.round((out[o] - 10) / 18))
    out[o] = k; out[o + 1] = k; out[o + 2] = k
  }
  return new ImageData(out, width, height)
}

const texts = new Map()   // url -> Promise<string>

/** The four layers of an SVG piece, as baked pieces have them: { fill, ink, shade, cast }. */
export async function svgRaw (url, kinds, box) {
  if (!texts.has(url)) {
    texts.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`SVG piece ${url}: ${r.status}`); return r.text() })
      .catch((e) => { texts.delete(url); throw e }))
  }
  const text = await texts.get(url)
  const [w, h] = [Math.round(box[2]), Math.round(box[3])]
  const empty = () => {   // no ink, no shade: black, opaque, as a baked layer with nothing on it
    const d = new Uint8ClampedArray(w * h * 4)
    for (let o = 3; o < d.length; o += 4) d[o] = 255
    return new ImageData(d, w, h)
  }
  const pass = async (name) => {
    const t = passSvg(text, name, kinds, [w, h])
    return t ? pixelsOf(t, w, h) : null
  }
  const [fill, ink, shade, cast] = await Promise.all(['fill', 'ink', 'shade', 'cast'].map(pass))
  if (!fill) throw new Error(`SVG piece ${url} has no fill`)
  return {
    fill: keyedFill(fill),
    ink: ink ? strengthOf(ink) : empty(),
    shade: shade ? strengthOf(shade) : empty(),
    cast: cast ? strengthOf(cast) : null,
  }
}
