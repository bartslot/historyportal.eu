// A flat figure's colour regions and its shade field (plan 11, layer.ts AQUAREL), worked out once per figure on the CPU
// from its drawing put back together (rest). Pure functions on straight RGBA.
//
//   flatRegions: every line px and its soft rim take the colour of the fill beside them, dark thicker than a line stays a
//                fill (hair, an iris), a region smaller than MIN_REGION_PX takes the colour round it (eyes, specks): what
//                is left is big flat colour areas meeting each other and the air.
//   shadeField:  per px, how far it lies inside its region (px) and which way is inward. Regions thinner than THIN_PX
//                (the hanging cords, a hem band) merge into what is round them first, so they cast no shade. The shader
//                shades a px by how much its nearest edge faces away from the sun, fading smoothly with the distance:
//                no taps, no hard end, no stair steps (a row of taps answered yes or no and drew bands, fresh tester 11-14).

/** A line's core: this dark (inkOf in the shader is full at 0.2). A shawl's red is 0.49: lightness alone is no line. */
const LINE_CORE_LUM = 0.3
/** A line's soft rim: this much darker than its lightest neighbour (a rim fades from the line into the fill). */
const LINE_RIM_STEP = 0.15
/** Half the widest line, px: dark that is thicker (hair, an iris) is a fill, not a line (hair left unpainted otherwise). */
const LINE_HALF_PX = 3
/** Rings of filling a px from a filled neighbour: lines and small regions are at most this many px across. */
const FILL_RINGS = 24
/** A colour region smaller than this many px (an eye's white, an iris, a speck) takes the colour round it: a face is one
 *  region, so its features cast no shade (they striped the face and turned the eyes blue, fresh tester 11-14). */
export const MIN_REGION_PX = 900
/** Two neighbouring px are one region when their colours differ by no more than this (sum over r, g, b, 0..255). */
const SAME_REGION = 36
/** A region no thicker than this (its widest inside point this far from its edge, times two) casts no shade. */
export const THIN_PX = 18
/** The shade field's distance scale: px per unit of the red channel (0..1), so 64 px fit. */
export const FIELD_PX = 64

const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
const lumAt = (d: Uint8ClampedArray, i: number) => (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255

/** Erode (keep where the whole (2r+1) square is set) or dilate (set where any of it is) a mask, separably. */
function squareFilter(mask: Uint8Array, width: number, height: number, r: number, erode: boolean): Uint8Array {
  const pass = (src: Uint8Array, along: 'x' | 'y') => {
    const out = new Uint8Array(src.length)
    const [n, m] = along === 'x' ? [width, height] : [height, width]
    const at = (line: number, k: number) => (along === 'x' ? line * width + k : k * width + line)
    const sum = new Int32Array(n + 1)
    for (let line = 0; line < m; line++) {
      for (let k = 0; k < n; k++) sum[k + 1] = sum[k] + src[at(line, k)]
      for (let k = 0; k < n; k++) {
        const a = Math.max(0, k - r), b = Math.min(n, k + r + 1), set = sum[b] - sum[a]
        out[at(line, k)] = erode ? (set === b - a && b - a === 2 * r + 1 ? 1 : 0) : (set > 0 ? 1 : 0)
      }
    }
    return out
  }
  return pass(pass(mask, 'x'), 'y')
}

/** Fill every px of `hole` from a neighbour outside it, ring by ring from the hole's rim (the nearest colour wins), at most
 *  FILL_RINGS deep. Only the hole is visited (a pass over the whole drawing per ring took half a second a figure). */
function fillFrom(out: Uint8ClampedArray, hole: Uint8Array, width: number, height: number): void {
  const n = width * height
  const depth = new Int16Array(n).fill(-1)
  const queue = new Int32Array(n)
  let head = 0, tail = 0
  const near = (i: number, visit: (j: number) => void) => {
    const x = i % width
    if (x + 1 < width) visit(i + 1)
    if (x > 0) visit(i - 1)
    if (i + width < n) visit(i + width)
    if (i >= width) visit(i - width)
  }
  for (let i = 0; i < n; i++) {
    if (hole[i] || out[i * 4 + 3] < 128) continue
    let rim = false
    near(i, (j) => { if (hole[j]) rim = true })
    if (rim) { depth[i] = 0; queue[tail++] = i }
  }
  while (head < tail) {
    const j = queue[head++]
    if (depth[j] >= FILL_RINGS) continue
    near(j, (i) => {
      if (!hole[i] || depth[i] >= 0) return
      out[i * 4] = out[j * 4]; out[i * 4 + 1] = out[j * 4 + 1]; out[i * 4 + 2] = out[j * 4 + 2]
      depth[i] = depth[j] + 1
      hole[i] = 0
      queue[tail++] = i
    })
  }
}

/** Colour regions: a label per px (0 = air), flooded over neighbours whose colours differ by at most SAME_REGION. */
function labelRegions(rgba: Uint8ClampedArray, width: number, height: number): { label: Int32Array; sizes: number[] } {
  const n = width * height
  const label = new Int32Array(n), stack = new Int32Array(n)
  const sizes = [0]
  for (let i0 = 0; i0 < n; i0++) {
    if (label[i0] || rgba[i0 * 4 + 3] < 128) continue
    const id = sizes.length
    let top = 0, size = 0
    stack[top++] = i0; label[i0] = id
    while (top) {
      const i = stack[--top]
      size++
      const x = i % width, y = (i / width) | 0
      for (const [dx, dy] of N4) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
        const j = yy * width + xx
        if (label[j] || rgba[j * 4 + 3] < 128) continue
        if (Math.abs(rgba[i * 4] - rgba[j * 4]) + Math.abs(rgba[i * 4 + 1] - rgba[j * 4 + 1]) + Math.abs(rgba[i * 4 + 2] - rgba[j * 4 + 2]) > SAME_REGION) continue
        label[j] = id
        stack[top++] = j
      }
    }
    sizes.push(size)
  }
  return { label, sizes }
}

/**
 * The colour regions of a drawing (straight RGBA): every line px and its soft rim take the colour of the fill beside it,
 * dark that is thicker than a line stays a fill, and a region smaller than MIN_REGION_PX takes the colour round it.
 */
export function flatRegions(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src)
  const n = width * height
  const dark = new Uint8Array(n)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (src[i * 4 + 3] < 128) continue
      const l = lumAt(src, i)
      let lightest = l
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
        const xx = x + dx, yy = y + dy
        if (xx >= 0 && yy >= 0 && xx < width && yy < height && src[(yy * width + xx) * 4 + 3] >= 128) lightest = Math.max(lightest, lumAt(src, yy * width + xx))
      }
      if (l < LINE_CORE_LUM || lightest - l > LINE_RIM_STEP) dark[i] = 1
    }
  }
  // dark thicker than a line (an opening by LINE_HALF_PX survives) is a fill: hair, an iris
  const thick = squareFilter(squareFilter(dark, width, height, LINE_HALF_PX, true), width, height, LINE_HALF_PX + 1, false)
  const line = new Uint8Array(n)
  for (let i = 0; i < n; i++) line[i] = dark[i] && !thick[i] ? 1 : 0
  fillFrom(out, line, width, height)
  const { label, sizes } = labelRegions(out, width, height)
  const small = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (label[i] && sizes[label[i]] < MIN_REGION_PX) small[i] = 1
  fillFrom(out, small, width, height)
  return out
}

/** Squared euclidean distance to the nearest set px, exact (Felzenszwalb and Huttenlocher), separable: O(n). */
export function distanceSquared(seed: Uint8Array, width: number, height: number): Float32Array {
  const INF = 1e12
  const d = new Float32Array(width * height)
  for (let i = 0; i < d.length; i++) d[i] = seed[i] ? 0 : INF
  const line = (get: (k: number) => number, set: (k: number, v: number) => void, n: number) => {
    const f = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1)
    for (let k = 0; k < n; k++) f[k] = get(k)
    let j = 0
    v[0] = 0; z[0] = -Infinity; z[1] = Infinity
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[j]] + v[j] * v[j])) / (2 * q - 2 * v[j])
      while (s <= z[j]) { j--; s = ((f[q] + q * q) - (f[v[j]] + v[j] * v[j])) / (2 * q - 2 * v[j]) }
      j++; v[j] = q; z[j] = s; z[j + 1] = Infinity
    }
    j = 0
    for (let q = 0; q < n; q++) { while (z[j + 1] < q) j++; set(q, (q - v[j]) * (q - v[j]) + f[v[j]]) }
  }
  for (let y = 0; y < height; y++) line((k) => d[y * width + k], (k, val) => { d[y * width + k] = val }, width)
  for (let x = 0; x < width; x++) line((k) => d[k * width + x], (k, val) => { d[k * width + x] = val }, height)
  return d
}

/** Per px: its region's edge (a 4-neighbour of another region, or of the air). */
function edgesOf(label: Int32Array, width: number, height: number): Uint8Array {
  const edge = new Uint8Array(label.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!label[i]) continue
      for (const [dx, dy] of N4) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= width || yy >= height || label[yy * width + xx] !== label[i]) { edge[i] = 1; break }
      }
    }
  }
  return edge
}

/**
 * The shade field of a regions picture (flatRegions output), as straight RGBA bytes for a texture: r = distance to the
 * px's region edge / FIELD_PX, g and b = the unit direction into the region (x, y; 0.5 + v / 2), a = the region's alpha.
 * Regions thinner than THIN_PX are merged into what is round them first, so they cast no shade.
 */
export function shadeField(regions: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const n = width * height
  // thin regions take the colour round them, for this field only
  const merged = new Uint8ClampedArray(regions)
  const first = labelRegions(merged, width, height)
  const inside = distanceSquared(edgesOf(first.label, width, height), width, height)
  const thickest = new Float32Array(first.sizes.length)
  for (let i = 0; i < n; i++) if (first.label[i]) thickest[first.label[i]] = Math.max(thickest[first.label[i]], inside[i])
  const thin = new Uint8Array(n)
  for (let i = 0; i < n; i++) if (first.label[i] && Math.sqrt(thickest[first.label[i]]) * 2 < THIN_PX) thin[i] = 1
  fillFrom(merged, thin, width, height)
  const { label } = labelRegions(merged, width, height)
  const d = distanceSquared(edgesOf(label, width, height), width, height)
  const out = new Uint8ClampedArray(n * 4)
  const at = (x: number, y: number) => Math.sqrt(d[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))])
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!label[i]) continue
      const dist = Math.sqrt(d[i])
      // the distance grows inward; over 3 px each way, so the grid's steps do not wobble the direction (it striped a
      // turned arm, where the sun lies along the part and every small wobble flips the shade on and off)
      let gx = at(x + 3, y) - at(x - 3, y) + 0.5 * (at(x + 3, y + 3) - at(x - 3, y + 3) + at(x + 3, y - 3) - at(x - 3, y - 3))
      let gy = at(x, y + 3) - at(x, y - 3) + 0.5 * (at(x + 3, y + 3) - at(x + 3, y - 3) + at(x - 3, y + 3) - at(x - 3, y - 3))
      const g = Math.hypot(gx, gy)
      if (g > 1e-6) { gx /= g; gy /= g } else { gx = 0; gy = 0 }
      out[i * 4] = Math.min(255, Math.round((dist / FIELD_PX) * 255))
      out[i * 4 + 1] = Math.round((0.5 + gx / 2) * 255)
      out[i * 4 + 2] = Math.round((0.5 + gy / 2) * 255)
      out[i * 4 + 3] = regions[i * 4 + 3]
    }
  }
  return out
}
