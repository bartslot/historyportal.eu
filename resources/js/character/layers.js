/**
 * The kit's pictures in the browser: loaded once, recoloured once per colour set (paint.js), stacked on canvases with
 * drawImage. A preview draws at screen size; Save draws at the rig's size (1 canvas px per puppet px) and cuts.
 */
import { recolour, shadeLayer, castLayer, partLabels, kindIndex } from './paint.js'
import { bodyOf, paletteOf, pieceOf, stackOf } from './recipe.js'

const loaded = new Map()      // url -> Promise<ImageData>
const painted = new Map()     // piece + colours -> { colour, flat, shade, cast } canvases
const PAINTED_MAX = 80        // recoloured pieces kept; older ones are made again when asked

export const kitUrl = (kitId) => `/character-kits/${kitId}/v1/kit.json`

/** kit.json with its folder, so piece files resolve beside it. */
export async function loadKit (url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`kit ${url}: ${res.status}`)
  const kit = await res.json()
  return { ...kit, base: url.slice(0, url.lastIndexOf('/') + 1) }
}

const canvasOf = (w, h) => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h))
  return c
}

/** A picture's pixels. Nearest sampling never mixes two key colours into a third kind. */
export function imageData (url) {
  if (!loaded.has(url)) {
    loaded.set(url, new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        const c = canvasOf(img.naturalWidth, img.naturalHeight)
        const g = c.getContext('2d', { willReadFrequently: true })
        g.drawImage(img, 0, 0)
        resolve(g.getImageData(0, 0, c.width, c.height))
      }
      img.onerror = () => { loaded.delete(url); reject(new Error(`picture ${url} did not load`)) }
      img.src = url
    }))
  }
  return loaded.get(url)
}

/** The body's rig.json and its label map. */
export async function rigOf (kit, bodyId) {
  const body = kit.bodies.find((b) => b.id === bodyId)
  const key = `${kit.base}${body.rig}`
  if (!loaded.has(key)) {
    loaded.set(key, fetch(key).then((r) => { if (!r.ok) throw new Error(`rig ${key}`); return r.json() }).catch((e) => { loaded.delete(key); throw e }))
  }
  const rig = await loaded.get(key)
  const labels = await imageData(`${kit.base}${bodyId}/${rig.labels}`)
  return { rig, labels }
}

/** One piece's raw pixels: fill (kinds), ink, shade and the shade it casts. */
async function rawOf (kit, body, piece) {
  const at = (f) => `${kit.base}${body.id}/${f}`
  const [fill, ink, shade, cast] = await Promise.all([imageData(at(piece.files.fill)), imageData(at(piece.files.ink)), imageData(at(piece.files.shade)),
    piece.files.cast ? imageData(at(piece.files.cast)) : null])
  return { fill, ink, shade, cast }
}

const put = (data, w, h) => {
  const c = canvasOf(w, h)
  c.getContext('2d').putImageData(new ImageData(data, w, h), 0, 0)
  return c
}

/** A piece in this recipe's colours, as canvases at the baked size. */
async function paintedOf (kit, body, piece, palette) {
  const key = `${body.id}:${piece.id}:${piece.kinds.map((k) => palette[k]?.join(',')).join('|')}:${palette.skin}`
  if (painted.has(key)) return painted.get(key)
  const raw = await rawOf(kit, body, piece)
  const { width: w, height: h } = raw.fill
  const { colour, flat } = recolour(raw.fill, raw.ink, palette, kit.kinds)
  const out = { raw, colour: put(colour, w, h), flat: put(flat, w, h), shade: put(shadeLayer(raw.shade, raw.fill, raw.ink), w, h), cast: raw.cast ? put(castLayer(raw.cast), w, h) : null }
  painted.set(key, out)
  if (painted.size > PAINTED_MAX) painted.delete(painted.keys().next().value)
  return out
}

/** The pieces a recipe stacks, painted, with their boxes and slots. */
export async function layersOf (kit, recipe, expression = 'calm') {
  const body = bodyOf(kit, recipe)
  const palette = paletteOf(kit, recipe)
  const ids = stackOf(kit, recipe, expression)
  return Promise.all(ids.map(async (id) => {
    const piece = pieceOf(body, id)
    return { id, slot: piece.slot, box: piece.box, ...(await paintedOf(kit, body, piece, palette)) }
  }))
}

/**
 * Draw a stack onto `ctx`: the canvas region `src` [x, y, w, h] (baked px) fills `dst` [x, y, w, h]. `what` is 'colour'
 * (with the shade laid over as a light wash, the preview) or 'colour' | 'flat' | 'shade' alone (Save).
 */
export function drawLayers (ctx, layers, src, dst, what = 'preview') {
  const k = dst[2] / src[2]
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // `op` null keeps the caller's mode: drawEdge cuts with 'destination-out' through here
  const each = (key, op = null) => {
    for (const l of layers) {
      const img = l[key]
      if (!img) continue
      if (op) ctx.globalCompositeOperation = op
      ctx.drawImage(img, dst[0] + (l.box[0] - src[0]) * k, dst[1] + (l.box[1] - src[1]) * k, l.box[2] * k, l.box[3] * k)
    }
  }
  if (what === 'shade') {
    each('shade')
    each('cast', 'lighten')
  } else each(what === 'preview' ? 'colour' : what)
  ctx.restore()
}

/** The slot painted at a baked-canvas point: the top piece with paint or ink there. */
export function slotAt (layers, x, y) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const { box: [bx, by, bw, bh], raw, slot } = layers[i]
    const px = Math.floor(x - bx), py = Math.floor(y - by)
    if (px < 0 || py < 0 || px >= bw || py >= bh) continue
    const o = (py * bw + px) * 4
    if (raw.fill.data[o + 3] > 100 || raw.ink.data[o] > 100) return slot
  }
  return null
}

/** A piece's pixels of one colour kind as a silhouette canvas (made once): the bare skin of an outfit is the body.
 *  `outside`: { labels, part, above } leaves out the pixels the body's label map gives that part (the head), and all
 *  above the line `above` (the neck: a drawn skull reaches past the map). */
function kindSilhouette (layer, kindIndexWanted, kindsCount, outside = null) {
  layer.sil ??= {}
  const key = `${kindIndexWanted}:${outside?.part ?? ''}`
  if (!layer.sil[key]) {
    const { width: w, height: h, data } = layer.raw.fill
    const [bx, by] = layer.box
    const out = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      if (data[i * 4 + 3] <= 100 || kindIndex(data[i * 4], kindsCount) !== kindIndexWanted) continue
      if (outside) {
        const x = bx + (i % w), y = by + Math.floor(i / w)
        const o = (y * outside.labels.width + x) * 4, R = outside.labels.data[o]
        // the part itself, or paint past the map's edge whose nearest part it is (a drawn skull a little larger than the map)
        if (y < (outside.above ?? -1) || R === outside.part || (R === 0 && outside.labels.data[o + 1] === outside.part)) continue
      }
      out[i * 4 + 3] = 255
    }
    layer.sil[key] = put(out, w, h)
  }
  return layer.sil[key]
}

/** An amber edge round the pieces of the slots given, on `ctx` (cleared first), in the same frame as drawLayers.
 *  `kind`: [index, count] to edge only that colour kind of them (the body: an outfit's bare skin). */
export function drawEdge (ctx, layers, slots, src, dst, colour = '#f59e0b', width = 3, kind = null, outside = null) {
  const { width: W, height: H } = ctx.canvas
  ctx.clearRect(0, 0, W, H)
  const picked = layers.filter((l) => slots.includes(l.slot))
  if (!picked.length) return
  const sil = canvasOf(W, H)
  const g = sil.getContext('2d')
  if (kind) {
    const k = dst[2] / src[2]
    for (const l of picked) g.drawImage(kindSilhouette(l, kind[0], kind[1], outside), dst[0] + (l.box[0] - src[0]) * k, dst[1] + (l.box[1] - src[1]) * k, l.box[2] * k, l.box[3] * k)
    // only what shows: hair hanging over a shoulder takes its part out
    const above = layers.slice(layers.indexOf(picked.at(-1)) + 1).filter((l) => l.slot !== 'face')
    g.globalCompositeOperation = 'destination-out'
    drawLayers(g, above, src, dst, 'colour')
    g.globalCompositeOperation = 'source-over'
  } else drawLayers(g, picked, src, dst, 'colour')
  g.globalCompositeOperation = 'source-in'
  g.fillStyle = colour
  g.fillRect(0, 0, W, H)
  ctx.save()
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2
    ctx.drawImage(sil, Math.cos(t) * width, Math.sin(t) * width)
  }
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(sil, 0, 0)
  ctx.restore()
}

/** The figure's box on the baked canvas, from what its pieces cover. */
export function figureBox (layers, pad = 24) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const { box: [x, y, w, h] } of layers) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w); y1 = Math.max(y1, y + h) }
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad]
}

/**
 * Everything Save needs, at `scale` of the baked canvas (0.5: one px per puppet px): the person's colour, flat fill and
 * shade as pixels, which rig part each pixel follows, and the part hidden under each.
 */
export async function savePixels (kit, recipe, rig, labelsImg, scale = 1 / rig.scale) {
  const layers = await layersOf(kit, recipe)
  const W = Math.round(rig.canvas[0] * scale), H = Math.round(rig.canvas[1] * scale)
  const src = [0, 0, rig.canvas[0], rig.canvas[1]], dst = [0, 0, W, H]
  const grab = (what) => {
    const c = canvasOf(W, H)
    const g = c.getContext('2d', { willReadFrequently: true })
    drawLayers(g, layers, src, dst, what)
    return g.getImageData(0, 0, W, H).data
  }
  // the label map and each piece's own pixels at this size, nearest: a key colour never blends into another kind
  const nearest = (img, w, h) => {
    const c = canvasOf(w, h)
    const g = c.getContext('2d', { willReadFrequently: true })
    g.imageSmoothingEnabled = false
    g.drawImage(put(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0, w, h)
    return g.getImageData(0, 0, w, h)
  }
  const labels = nearest(labelsImg, W, H)
  const small = layers.map((l) => {
    const bw = Math.max(1, Math.round(l.box[2] * scale)), bh = Math.max(1, Math.round(l.box[3] * scale))
    return { slot: l.slot, box: [Math.round(l.box[0] * scale), Math.round(l.box[1] * scale), bw, bh], fill: nearest(l.raw.fill, bw, bh), ink: nearest(l.raw.ink, bw, bh) }
  })
  const label = partLabels(small, labels, rig, kit.kinds)
  const under = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) under[i] = labels.data[i * 4 + 2]
  return { width: W, height: H, colour: grab('colour'), flat: grab('flat'), shade: grab('shade'), label, under }
}

/** The same person with an expression, only round the head (the rest is the person as saved): for Puppet.faces. */
export async function facePixels (kit, recipe, expression, rig, region, scale = 1 / rig.scale) {
  const layers = await layersOf(kit, recipe, expression)
  const [x, y, w, h] = region
  const grab = (what) => {
    const c = canvasOf(w, h)
    const g = c.getContext('2d', { willReadFrequently: true })
    drawLayers(g, layers, [x / scale, y / scale, w / scale, h / scale], [0, 0, w, h], what)
    return g.getImageData(0, 0, w, h).data
  }
  return { x0: x, y0: y, w, h, colour: grab('colour'), shade: grab('shade') }
}

/** Pixels as a WebP data url; a lossy atlas a little smaller each step until it fits under `max` characters. */
export function webpUrl ({ data, width, height }, qualities = [0.86, 0.78, 0.7], max = Infinity) {
  const c = put(data, width, height)
  let url = ''
  for (const q of qualities) if ((url = c.toDataURL('image/webp', q)).length <= max) break
  return url
}
