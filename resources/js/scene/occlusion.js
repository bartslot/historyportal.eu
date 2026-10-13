/**
 * A backdrop's depth map, used twice (blend-into-scene step 2):
 *
 *   occlusion          a layer with `occlude` on is hidden where the plate is drawn IN FRONT of it
 *                      (a ship's rail before a figure on deck). A CSS mask on the layer's node,
 *                      built once per layer + position + stage shape, never per frame.
 *   fit to this spot   the height a standing figure should have where its feet are (the editor's
 *                      ghost while dragging, and the "Fit to this spot" button).
 *
 * THE DEPTH MAP: <backdrop>.depth.webp, written once at import by `php artisan art:depth`
 * (Depth Anything V2 Small), 8-bit grayscale at half the plate's size, NEAR = WHITE. Its values
 * are relative inverse depth (disparity): only nearer / farther means something, not metres.
 *
 * THE MAPPING (how a layer gets a depth). A layer stands on the floor at its CONTACT row: its
 * bottom edge, or its waterline when it floats (waterline, share of its height). On a flat floor
 * disparity grows in a straight line with the row below the horizon, so the plate's floor is fitted
 * once as `d = a + k * v` (the median of each row in the lower part of the picture). The layer's
 * depth is that line at its contact row: read from the FLOOR, not from the pixel under its feet,
 * because the pixel under the feet of a figure behind a rail IS the rail.
 *   A plate pixel hides the layer when it is nearer than the layer by more than `margin`.
 *   Below the contact row (its shadow, reflection, foam) the layer lies ON the floor, so there its
 *   depth is the floor's at that row: a shadow is hidden by the rail, never by the deck it lies on.
 *   A plate whose floor cannot be fitted (no slope) falls back to the farthest plate depth along
 *   the contact row: right for a figure whose feet show, wrong for one whose feet are all hidden.
 *
 * THE HORIZON is where that floor line reaches the plate's farthest value (0). Fit to this spot is
 * the painter's rule "a standing grown-up's head is on the horizon": seen from eye height E, a thing
 * H metres tall standing at row v is (v - horizon) x H / E of the picture tall.
 *
 * Flat and drawn: the mask has hard edges (no feather, no blur, no depth fade).
 * Rotation is ignored (ponytail: a small tilt shifts the mask by a pixel or two; rotate the
 * sample grid if a layer is ever turned far while occluding).
 */
import { coverToImage } from './sit-in-scene.js'

/** Dev-tunable (window.__tune "Occlusion"). */
export const OCC = {
  margin: 0.04,     // how much nearer (0..1 of the map's range) a plate pixel must be to hide the layer
  fitFrom: 0.6,     // the rows (share of the plate) the floor line is fitted on: the lower part,
  fitTo: 0.97,      //   where a deck or a beach is
  minSlope: 0.15,   // a flatter "floor" is not a floor (a sea up to the frame, a wall)
  padX: 0.5,        // the mask covers this much more than the layer box on each side,
  padTop: 0.1,      //   above,
  padBottom: 0.6,   //   and below: its shadow, reflection and foam are occluded with it
  eyeM: 1.6,        // the painter's eye height above the floor
  personM: 1.7,     // a standing grown-up, when the picture says nothing about its height
  maxMaskPx: 512,   // the mask's longest side, in depth-map pixels
}

const clamp01 = (n) => Math.min(1, Math.max(0, n))

/** Pure: the depth (0 far .. 1 near) at image fractions u, v (nearest pixel), or null outside. */
export function depthAt (depth, u, v) {
  if (!(u >= 0 && u <= 1 && v >= 0 && v <= 1)) return null
  const x = Math.min(depth.width - 1, Math.floor(u * depth.width))
  const y = Math.min(depth.height - 1, Math.floor(v * depth.height))
  return depth.data[y * depth.width + x] / 255
}

/**
 * Pure: the plate's floor as a line `d = a + k * v` (v = row, 0 top .. 1 bottom), fitted by least
 * squares on each row's median, and the horizon where it reaches 0. Null when there is no floor.
 */
export function groundLine (depth, from = OCC.fitFrom, to = OCC.fitTo) {
  if (!depth?.data || !depth.width || !depth.height) return null
  const { data, width, height } = depth
  const pts = []
  for (let r = Math.floor(from * height); r < Math.min(height, Math.ceil(to * height)); r++) {
    const row = Array.from(data.subarray(r * width, (r + 1) * width)).sort((p, q) => p - q)
    pts.push([(r + 0.5) / height, row[row.length >> 1] / 255])
  }
  if (pts.length < 2) return null
  const n = pts.length
  const mv = pts.reduce((s, [v]) => s + v, 0) / n
  const md = pts.reduce((s, [, d]) => s + d, 0) / n
  const cov = pts.reduce((s, [v, d]) => s + (v - mv) * (d - md), 0)
  const vv = pts.reduce((s, [v]) => s + (v - mv) ** 2, 0)
  const k = vv ? cov / vv : 0
  if (!(k > OCC.minSlope)) return null
  const a = md - k * mv

  return { a, k, horizon: clamp01(-a / k) }
}

/** Pure: the floor's depth at row v. */
export const groundAt = (ground, v) => ground.a + ground.k * v

/**
 * Pure: the layer's own depth, standing at row `contactV` across columns u0..u1 (image fractions).
 * The floor line there; without one, the farthest plate value along the middle of the contact row.
 */
export function layerDepth (depth, ground, contactV, u0, u1) {
  if (ground) return groundAt(ground, contactV)
  let far = 1
  const mid0 = u0 + (u1 - u0) * 0.25
  const mid1 = u1 - (u1 - u0) * 0.25
  for (let i = 0; i <= 16; i++) {
    const d = depthAt(depth, mid0 + (mid1 - mid0) * (i / 16), Math.min(1, contactV))
    if (d !== null) far = Math.min(far, d)
  }
  return far
}

/**
 * Pure: the occlusion mask for one layer.
 *
 * @param {{data: Uint8Array|Uint8ClampedArray, width: number, height: number}} depth  one channel
 * @param {{a:number,k:number}|null} ground   groundLine(depth)
 * @param {{u0:number,v0:number,u1:number,v1:number}} box  the layer's box, image fractions
 * @param {{contact?: number, flipX?: boolean, flipY?: boolean}} opts  contact: share of the box from
 *        its top where it touches the floor (1 - waterline)
 * @returns {{width:number, height:number, alpha:Uint8ClampedArray, hidden:number}}  alpha over the
 *          PADDED box in the node's own (unflipped) space; 255 = shown, 0 = hidden
 */
export function occlusionMask (depth, ground, box, { contact = 1, flipX = false, flipY = false } = {}) {
  const bw = box.u1 - box.u0
  const bh = box.v1 - box.v0
  const spanU = (1 + 2 * OCC.padX) * bw
  const spanV = (1 + OCC.padTop + OCC.padBottom) * bh
  const fit = Math.min(1, OCC.maxMaskPx / Math.max(spanU * depth.width, spanV * depth.height, 1))
  const width = Math.max(2, Math.round(spanU * depth.width * fit))
  const height = Math.max(2, Math.round(spanV * depth.height * fit))
  const contactV = box.v0 + contact * bh
  const own = layerDepth(depth, ground, contactV, box.u0, box.u1)
  const alpha = new Uint8ClampedArray(width * height)
  let hidden = 0
  for (let j = 0; j < height; j++) {
    const t = -OCC.padTop + ((j + 0.5) / height) * (1 + OCC.padTop + OCC.padBottom)   // node-local row
    const v = box.v0 + (flipY ? 1 - t : t) * bh
    // On the floor below the contact row, the layer (its shadow) is as near as the floor there.
    const mine = ground && v > contactV ? Math.max(own, groundAt(ground, v)) : own
    for (let i = 0; i < width; i++) {
      const s = -OCC.padX + ((i + 0.5) / width) * (1 + 2 * OCC.padX)
      const d = depthAt(depth, box.u0 + (flipX ? 1 - s : s) * bw, v)
      const shown = d === null || d <= mine + OCC.margin
      alpha[j * width + i] = shown ? 255 : 0
      if (!shown) hidden++
    }
  }
  return { width, height, alpha, hidden }
}

/**
 * Pure: the CSS that lays a mask over the PADDED box on a node the size of the box. Percentages
 * only, so the mask follows the node through a resize without being rebuilt.
 */
export function maskPlacement () {
  const w = (1 + 2 * OCC.padX) * 100
  const h = (1 + OCC.padTop + OCC.padBottom) * 100
  // A background-position p% puts the image's p% point on the box's p% point: centred across,
  // and padTop of the box above it.
  const y = (OCC.padTop / (OCC.padTop + OCC.padBottom)) * 100
  return { size: `${round(w)}% ${round(h)}%`, position: `50% ${round(y)}%` }
}

const round = (n) => Math.round(n * 1000) / 1000

/**
 * Pure: the height (share of the stage) a thing `heightM` metres tall should have with its feet at
 * stage row `footY` (0..1), from the plate's horizon. Null when there is no horizon, or the feet
 * are above it (a figure in the sky has no floor to stand on).
 */
export function fitHeight (ground, footY, stageAspect, imageAspect, heightM = OCC.personM) {
  if (!ground || !(heightM > 0)) return null
  const [, v] = coverToImage(0.5, footY, stageAspect, imageAspect)
  if (!(v > ground.horizon)) return null
  const hImage = (v - ground.horizon) * heightM / OCC.eyeM
  // An image taller than the stage is cropped top and bottom: a share of it is more of the stage.
  const shown = stageAspect > 0 && imageAspect > 0 && imageAspect < stageAspect ? imageAspect / stageAspect : 1
  return hImage / shown
}

/** Pure: a layer box on the stage (fractions, centre x/y, size w/h) as image fractions. */
export function stageBoxToImage ({ x, y, w, h }, stageAspect, imageAspect) {
  const [u0, v0] = coverToImage(x - w / 2, y - h / 2, stageAspect, imageAspect)
  const [u1, v1] = coverToImage(x + w / 2, y + h / 2, stageAspect, imageAspect)
  return { u0, v0, u1, v1 }
}

// ── The depth map, read once per url ───────────────────────────────────────────────────────
const depthCache = new Map()

/**
 * The depth map as one channel plus its floor line, or null when there is none or it cannot be
 * read (no url, a map served without CORS, a test DOM). Cached per url.
 * @returns {Promise<{data: Uint8Array, width: number, height: number, aspect: number, ground: object|null}|null>}
 */
export function loadDepth (url) {
  if (!url) return Promise.resolve(null)
  if (!depthCache.has(url)) {
    depthCache.set(url, new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const { naturalWidth: width, naturalHeight: height } = img
          const canvas = document.createElement('canvas')
          canvas.width = width; canvas.height = height
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(img, 0, 0)
          const rgba = ctx.getImageData(0, 0, width, height).data
          const data = new Uint8Array(width * height)
          for (let p = 0; p < data.length; p++) data[p] = rgba[p * 4]
          const map = { data, width, height, aspect: width / height }
          resolve({ ...map, ground: groundLine(map) })
        } catch (_) { resolve(null) }
      }
      img.onerror = () => resolve(null)
      img.src = url
    }))
  }
  return depthCache.get(url)
}

/** The mask as a data URL (canvas -> PNG), white = shown. */
function maskUrl ({ width, height, alpha }) {
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(width, height)
  for (let p = 0; p < alpha.length; p++) {
    img.data[p * 4] = img.data[p * 4 + 1] = img.data[p * 4 + 2] = 255
    img.data[p * 4 + 3] = alpha[p]
  }
  ctx.putImageData(img, 0, 0)
  return canvas.toDataURL('image/png')
}

/** Take a layer's occlusion mask off. */
export function clearOcclusion (node) {
  if (!node) return
  for (const p of ['mask-image', '-webkit-mask-image', 'mask-size', '-webkit-mask-size', 'mask-position', '-webkit-mask-position', 'mask-repeat', '-webkit-mask-repeat']) {
    node.style.removeProperty(p)
  }
  delete node.dataset.occluded
}

/**
 * Put (or take off) a layer's occlusion mask on its node. The node holds the picture AND its
 * blend-into-scene parts (the waterline mask is on the picture inside it, so the two multiply).
 * Cached on the item by everything the mask depends on, so a repaint with nothing moved is free.
 *
 * @param {HTMLElement} node
 * @param {object} item     the layer (occlude, flip_x, flip_y, waterline)
 * @param {{x:number,y:number,w:number,h:number}} rect  the layer box on the stage, fractions, centre
 * @param {number} stageAspect
 * @param {object|null} depth  loadDepth()
 */
export function applyOcclusion (node, item, rect, stageAspect, depth) {
  if (!node || !item?.occlude || !depth || !(rect.w > 0 && rect.h > 0)) { clearOcclusion(node); return null }
  const contact = 1 - clamp01(Number(item.waterline) || 0)
  const key = [depth.width, depth.height, rect.x, rect.y, rect.w, rect.h, stageAspect, contact, !!item.flip_x, !!item.flip_y, OCC.margin]
    .map(n => (typeof n === 'number' ? round(n) : n)).join('|')
  if (item.__occKey !== key) {
    const box = stageBoxToImage(rect, stageAspect, depth.aspect)
    const mask = occlusionMask(depth, depth.ground, box, { contact, flipX: !!item.flip_x, flipY: !!item.flip_y })
    item.__occKey = key
    item.__occUrl = mask.hidden ? maskUrl(mask) : null   // nothing in front of it: no mask at all
  }
  if (!item.__occUrl) { clearOcclusion(node); return null }
  const { size, position } = maskPlacement()
  for (const pre of ['', '-webkit-']) {
    node.style.setProperty(`${pre}mask-image`, `url("${item.__occUrl}")`)
    node.style.setProperty(`${pre}mask-size`, size)
    node.style.setProperty(`${pre}mask-position`, position)
    node.style.setProperty(`${pre}mask-repeat`, 'no-repeat')
  }
  node.dataset.occluded = ''
  return item.__occUrl
}
