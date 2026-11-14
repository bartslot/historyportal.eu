/**
 * A painted person cut into the stage's puppet (engine-mvp stage25d/types.ts Puppet): one tile per rig part on an atlas,
 * the hidden paint under a part filled in from the part it continues (the chest under the near arm, a leg up under the
 * skirt), the head once more for each expression (Puppet.faces). At rest the parts drawn back to front ARE the picture.
 * Pure: arrays in, arrays and JSON out.
 */

const PAD = 2              // canvas px round a tile, so a bent edge samples its own colour and not the next tile's
const ATLAS_W = 2048

/** For each pixel in `region`, the colour (and shade) of the nearest `source` pixel, walking through the region only. */
export function fillFrom (W, H, region, source, flat, shade, outColour, outShade) {
  const from = new Int32Array(W * H).fill(-1)
  const queue = new Int32Array(W * H)
  let head = 0, tail = 0
  for (let i = 0; i < W * H; i++) {
    if (!source[i]) continue
    const x = i % W
    if ((x > 0 && region[i - 1]) || (x < W - 1 && region[i + 1]) || region[i - W] || region[i + W]) { from[i] = i; queue[tail++] = i }
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % W
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
      if (j < 0 || j >= W * H || !region[j] || from[j] >= 0) continue
      from[j] = from[i]
      queue[tail++] = j
    }
  }
  for (let i = 0; i < W * H; i++) {
    if (!region[i] || from[i] < 0 || source[i]) continue
    const s = from[i] * 4, o = i * 4
    outColour[o] = flat[s]; outColour[o + 1] = flat[s + 1]; outColour[o + 2] = flat[s + 2]; outColour[o + 3] = 255
    outShade[o] = shade[s]; outShade[o + 1] = shade[s + 1]; outShade[o + 2] = shade[s + 2]; outShade[o + 3] = 255
  }
}

/** Boxes packed in rows across a fixed width, tallest first: each gets x, y; the atlas's height is returned. */
export function pack (boxes, width = ATLAS_W) {
  const order = boxes.map((b, i) => i).sort((a, b) => boxes[b].h - boxes[a].h)
  let x = 0, y = 0, row = 0
  const at = []
  for (const i of order) {
    const b = boxes[i]
    if (x + b.w > width) { x = 0; y += row; row = 0 }
    at[i] = { x, y }
    x += b.w
    row = Math.max(row, b.h)
  }
  return { at, height: Math.max(1, y + row) }
}

/**
 * The puppet. `canvas`: { width, height, scale } (the baked canvas, `scale` canvas px per puppet px); `rest`: { colour,
 * flat, shade, label } of the person as saved; `under`: the label map's B channel (the part hidden under each pixel);
 * `faces`: { [expression]: { colour, shade } }, the same person with that expression; `rig`: the body's rig.json.
 * Returns the atlas and its shade atlas (RGBA) and the puppet without its atlas url.
 */
export function cutPuppet ({ canvas, rest, under, faces = {}, rig }) {
  const { width: W, height: H, scale } = canvas
  const n = W * H
  // one set of buffers for every part, cleared between them (a 2048 x 3072 canvas: 6 M px)
  const own = new Uint8Array(n), hidden = new Uint8Array(n), source = new Uint8Array(n)
  const filledColour = new Uint8ClampedArray(n * 4), filledShade = new Uint8ClampedArray(n * 4)
  const tiles = []
  /** A tile's pixels copied out now: own pixels from `c`/`s`, hidden ones from the fill. */
  const copy = (box, c, s) => {
    const { x0, y0, w, h } = box
    const tc = new Uint8ClampedArray(w * h * 4), ts = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y0 + y) * W + x0 + x, o = (y * w + x) * 4
        const [cc, ss] = own[i] ? [c, s] : hidden[i] && filledColour[i * 4 + 3] ? [filledColour, filledShade] : [null, null]
        if (!cc) continue
        for (let ch = 0; ch < 4; ch++) { tc[o + ch] = cc[i * 4 + ch]; ts[o + ch] = ss[i * 4 + ch] }
      }
    }
    return { tc, ts }
  }
  rig.parts.forEach((name, k) => {
    const id = k + 1
    const sourceId = rig.underFrom?.[name] ? rig.parts.indexOf(rig.underFrom[name]) + 1 : id
    let anyHidden = false, x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1
    for (let i = 0; i < n; i++) {
      own[i] = rest.label[i] === id ? 1 : 0
      hidden[i] = !own[i] && under[i] === id && rest.colour[i * 4 + 3] > 0 ? 1 : 0
      source[i] = rest.label[i] === sourceId ? 1 : 0
      anyHidden ||= hidden[i] === 1
    }
    filledColour.fill(0)
    filledShade.fill(0)
    if (anyHidden) fillFrom(W, H, hidden, source, rest.flat, rest.shade, filledColour, filledShade)
    for (let i = 0; i < n; i++) {
      if (!own[i] && !(hidden[i] && filledColour[i * 4 + 3])) continue
      const x = i % W, y = (i - x) / W
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    }
    if (x1 < 0) return
    const box = { x0: Math.max(0, x0 - PAD), y0: Math.max(0, y0 - PAD) }
    box.w = Math.min(W - 1, x1 + PAD) - box.x0 + 1
    box.h = Math.min(H - 1, y1 + PAD) - box.y0 + 1
    tiles.push({ name, ...box, ...copy(box, rest.colour, rest.shade) })
    if (name === 'head') for (const [face, f] of Object.entries(faces)) tiles.push({ name, face, ...box, ...copy(box, f.colour, f.shade) })
  })
  const { at, height } = pack(tiles.map((t) => ({ w: t.w, h: t.h })))
  const atlas = new Uint8ClampedArray(ATLAS_W * height * 4)
  const shadeAtlas = new Uint8ClampedArray(ATLAS_W * height * 4)
  tiles.forEach((t, k) => {
    for (let y = 0; y < t.h; y++) {
      const o = ((at[k].y + y) * ATLAS_W + at[k].x) * 4
      atlas.set(t.tc.subarray(y * t.w * 4, (y + 1) * t.w * 4), o)
      shadeAtlas.set(t.ts.subarray(y * t.w * 4, (y + 1) * t.w * 4), o)
    }
  })
  // the puppet's frame: the person's own box in puppet px, so it stands on its feet (anchor bottom middle)
  let fx0 = Infinity, fy0 = Infinity, fx1 = -Infinity, fy1 = -Infinity
  for (const t of tiles) { fx0 = Math.min(fx0, t.x0); fy0 = Math.min(fy0, t.y0); fx1 = Math.max(fx1, t.x0 + t.w); fy1 = Math.max(fy1, t.y0 + t.h) }
  const ox = Math.floor(fx0 / scale), oy = Math.floor(fy0 / scale)
  const r2 = (v) => Math.round(v * 100) / 100
  const uvOf = (k) => [at[k].x / ATLAS_W, at[k].y / height, (at[k].x + tiles[k].w) / ATLAS_W, (at[k].y + tiles[k].h) / height].map((v) => Math.round(v * 1e6) / 1e6)
  const parts = []
  const facesUv = {}
  tiles.forEach((t, k) => {
    if (t.face) { facesUv[t.face] = uvOf(k); return }
    const qx0 = r2(t.x0 / scale - ox), qy0 = r2(t.y0 / scale - oy), qx1 = r2((t.x0 + t.w) / scale - ox), qy1 = r2((t.y0 + t.h) / scale - oy)
    parts.push({ bone: t.name, quad: [[qx0, qy0], [qx1, qy0], [qx1, qy1], [qx0, qy1]], uv: uvOf(k) })
  })
  const shift = ([x, y]) => [r2(x - ox), r2(y - oy)]
  const puppet = {
    width: Math.ceil(fx1 / scale) - ox,
    height: Math.ceil(fy1 / scale) - oy,
    facing: rig.facing,
    paint: 'flat',
    bones: rig.bones.map((b) => ({ ...b, from: shift(b.from), ...(b.to ? { to: shift(b.to) } : {}) })),
    parts,
    ...(Object.keys(facesUv).length ? { faces: facesUv } : {}),
  }
  return { atlas: { data: atlas, width: ATLAS_W, height }, shade: { data: shadeAtlas, width: ATLAS_W, height }, puppet }
}
