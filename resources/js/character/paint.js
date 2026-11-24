/**
 * Painting a person from baked pieces (kit_bake.py): each piece's fill carries its colour KIND in the red channel (key
 * colour R = 10 + 18 i), its ink and shade beside it. These functions work on plain pixel arrays (tested); layers.js puts
 * them on canvases.
 */

export const INK = [25, 20, 16]

/** The kind index a key colour's red channel names. */
export const kindIndex = (r, count) => Math.max(0, Math.min(count - 1, Math.round((r - 10) / 18)))

/**
 * A piece recoloured: `colour` is fill in the palette's colours with the ink over it, `flat` the fill alone (the rig
 * paints hidden parts from it). Straight alpha, RGBA, the piece's own size.
 */
export function recolour (fill, ink, palette, kinds) {
  const n = fill.width * fill.height
  const colour = new Uint8ClampedArray(n * 4)
  const flat = new Uint8ClampedArray(n * 4)
  const table = kinds.map((k) => palette[k] ?? [200, 190, 170])
  for (let i = 0; i < n; i++) {
    const o = i * 4
    const a = fill.data[o + 3] / 255
    const c = a > 0 ? table[kindIndex(fill.data[o], kinds.length)] : INK
    const k = ink ? ink.data[o] / 255 : 0
    flat[o] = c[0]; flat[o + 1] = c[1]; flat[o + 2] = c[2]; flat[o + 3] = fill.data[o + 3]
    const al = a + k * (1 - a)
    if (al <= 0) continue
    // ink over the fill: premultiplied mix, back to straight alpha
    for (let ch = 0; ch < 3; ch++) colour[o + ch] = Math.round((INK[ch] * k + c[ch] * a * (1 - k)) / al)
    colour[o + 3] = Math.round(al * 255)
  }
  return { colour, flat }
}

/** A piece's shade as a layer that replaces the shade under it where the piece paints (its fill's alpha). */
export function shadeLayer (shade, fill, ink) {
  const n = fill.width * fill.height
  const out = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    out[o] = shade.data[o]; out[o + 1] = shade.data[o + 1]; out[o + 2] = shade.data[o + 2]
    out[o + 3] = Math.max(fill.data[o + 3], ink ? ink.data[o] : 0)
  }
  return out
}

/**
 * The shade's red (how much shade) softened in place: a box blur twice over, `r` px, through the paint only (the air
 * neither darkens nor lightens it). A hard-edged band of shade along an outline glazed into a dark stripe beside the
 * line, and where an arm meets the shoulder or the shawl the robe it read as a seam (Bart 11-24). G and B (eyes, face)
 * stay as they are.
 */
export function softShade (data, w, h, r) {
  if (r < 1) return data
  const n = w * h
  let v = new Float32Array(n), a = new Float32Array(n)
  for (let i = 0; i < n; i++) { a[i] = data[i * 4 + 3] > 0 ? 1 : 0; v[i] = a[i] ? data[i * 4] : 0 }
  const pass = (src, horizontal) => {
    const out = new Float32Array(n)
    const len = horizontal ? w : h, lines = horizontal ? h : w
    for (let l = 0; l < lines; l++) {
      const at = (k) => (horizontal ? l * w + k : k * w + l)
      let sum = 0
      for (let k = -r; k <= r; k++) if (k >= 0 && k < len) sum += src[at(k)]
      for (let k = 0; k < len; k++) {
        out[at(k)] = sum
        const add = k + r + 1, drop = k - r
        if (add < len) sum += src[at(add)]
        if (drop >= 0) sum -= src[at(drop)]
      }
    }
    return out
  }
  for (let t = 0; t < 2; t++) {
    v = pass(pass(v, true), false)
    a = pass(pass(a, true), false)
  }
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] > 0 && a[i] > 0) data[i * 4] = Math.round(v[i] / a[i])
  return data
}

/** The shade a piece casts on what lies under it, as red only (drawn with 'lighten': the eyes and face channels stay). */
export function castLayer (cast) {
  const n = cast.width * cast.height
  const out = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) {
    const c = cast.data[i * 4]
    if (c > 4) { out[i * 4] = c; out[i * 4 + 3] = 255 }
  }
  return out
}

/** Head-canvas slots: everything they paint turns with the head. */
export const HEAD_SLOTS = new Set(['face', 'eyes', 'mouth', 'expression', 'hair', 'beard', 'headwear'])
const CLOTH_ON_LEGS = new Set(['tunic', 'shawl', 'apron', 'rope', 'ochre'])

/**
 * Which rig part each canvas pixel follows (1 + index into rig.parts, 0: nothing), from the pieces drawn back to front.
 * `layers`: [{ slot, box: [x, y, w, h], fill, ink }]; `labels`: the body's label map (R part, G torso outside the body).
 */
export function partLabels (layers, labels, rig, kinds) {
  const W = labels.width, H = labels.height
  const out = new Uint8Array(W * H)
  const idx = (name) => rig.parts.indexOf(name) + 1
  const head = idx('head'), hips = idx('hips')
  const legs = new Set(rig.parts.filter((p) => /^(thigh|shin|foot)_/.test(p)).map(idx))
  for (const { slot, box: [bx, by, bw, bh], fill, ink } of layers) {
    const onHead = HEAD_SLOTS.has(slot)
    for (let y = 0; y < bh; y++) {
      const cy = by + y
      if (cy < 0 || cy >= H) continue
      for (let x = 0; x < bw; x++) {
        const cx = bx + x
        if (cx < 0 || cx >= W) continue
        const p = (y * bw + x) * 4
        const a = fill.data[p + 3], k = ink ? ink.data[p] : 0
        if (a < 128 && k < 128) continue
        const c = cy * W + cx
        if (onHead) { out[c] = head; continue }
        const own = labels.data[c * 4]
        if (own) {
          const cloth = a >= 128 && CLOTH_ON_LEGS.has(kinds[kindIndex(fill.data[p], kinds.length)])
          out[c] = cloth && legs.has(own) ? hips : own
        } else out[c] = labels.data[c * 4 + 1] || hips
      }
    }
  }
  return out
}

/** A head cloth that covers the crown (Bart 11-16: the braid's hair showed above and behind the shawl). */
export const isHood = (pieceId) => /shawl-over-head$/.test(pieceId)

/** Where a hood leaves the head, as a share of its box from the top: below it the cloth hangs and the hair (a braid) is free. */
export const HOOD_LINE = 0.43

/**
 * The hair a hood covers, as 1s over the hair piece's own pixels: above the line where the cloth leaves the head, whatever
 * lies above the cloth in its column (in front of the cloth: above its front end) or behind it in its row. Kit sheets face
 * right, so behind is left. Boxes are [x, y, w, h] on the baked canvas; `cloth` carries fill and ink.
 */
export function hoodMask (hairBox, cloth, clothBox) {
  const [hx, hy, hw, hh] = hairBox, [cx, cy, cw, ch] = clothBox
  const line = cy + ch * HOOD_LINE
  const top = new Map(), left = new Map()
  let front = -Infinity
  for (let y = 0; y < ch && cy + y < line; y++) {
    for (let x = 0; x < cw; x++) {
      const p = (y * cw + x) * 4
      if (cloth.fill.data[p + 3] < 128 && cloth.ink.data[p] < 128) continue
      const X = cx + x, Y = cy + y
      if (!top.has(X) || Y < top.get(X)) top.set(X, Y)
      if (!left.has(Y) || X < left.get(Y)) left.set(Y, X)
      if (X > front) front = X
    }
  }
  const out = new Uint8Array(hw * hh)
  for (let y = 0; y < hh; y++) {
    const Y = hy + y
    if (Y >= line) break
    for (let x = 0; x < hw; x++) {
      const X = hx + x
      const over = top.get(X) ?? (X > front ? top.get(front) : undefined)
      if ((over !== undefined && Y < over) || X < (left.get(Y) ?? Infinity)) out[y * hw + x] = 1
    }
  }
  return out
}
