/**
 * territory-morph.js — one territory shape flowing into the next when the map's year changes.
 *
 * Bart, 2026-11-24: "make sure that when animating a year to next or previous year - of a territory in the timeline -
 * morphs to the new vector so you can see it expanding. Make this a switch. (always on)".
 *
 * Two outlines of one empire seldom match point for point (a coast gained, an island lost), so the shapes are not
 * tweened vertex by vertex. Each is turned into a signed distance field on a coarse screen grid (negative inside), the
 * two fields are blended, and the outline is read back where the blend crosses zero (marching squares). That handles
 * land joining and splitting, and a territory that did not exist yet grows out from its middle.
 */

const INF = 1e20

/** Felzenszwalb's 1D squared distance transform of `f` (length n), into `d`. */
function edt1d (f, n, d, v, z) {
  let k = 0
  v[0] = 0; z[0] = -INF; z[1] = INF
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]) }
    k++; v[k] = q; z[k] = s; z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

/** Distance (in cells) from each cell to the nearest cell where `on(i)` holds. */
export function distanceTo (on, w, h) {
  const g = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) g[i] = on(i) ? 0 : INF
  const n = Math.max(w, h)
  const f = new Float64Array(n); const d = new Float64Array(n); const v = new Int32Array(n); const z = new Float64Array(n + 1)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = g[y * w + x]
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) g[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = g[y * w + x]
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x])
  }
  return g
}

/**
 * A mask (1 inside) as a signed distance field: negative inside, positive outside, in cells. An empty mask is far
 * outside everywhere (`far`), so a shape blended with nothing shrinks to, or grows from, its own middle.
 */
export function signedField (mask, w, h, far = Math.max(w, h)) {
  let any = false
  for (let i = 0; i < mask.length; i++) if (mask[i]) { any = true; break }
  if (!any) return new Float64Array(w * h).fill(far)
  const out = distanceTo((i) => mask[i] === 1, w, h)
  const inn = distanceTo((i) => mask[i] !== 1, w, h)
  const s = new Float64Array(w * h)
  for (let i = 0; i < w * h; i++) s[i] = out[i] - inn[i]
  return s
}

/** The two fields blended: `t` 0 is the first shape, 1 the second. */
export const blendFields = (a, b, t) => {
  const s = new Float64Array(a.length)
  for (let i = 0; i < a.length; i++) s[i] = a[i] * (1 - t) + b[i] * t
  return s
}

/**
 * Where a field crosses zero, as closed loops of [x, y] in cells (marching squares, joined end to end). The grid's
 * rim counts as outside, so every loop closes.
 */
export function zeroContours (field, w, h) {
  const val = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 1 : field[y * w + x])
  // An edge point, keyed by the edge it sits on, so neighbouring cells land on the very same point.
  const pt = (x0, y0, x1, y1) => {
    const a = val(x0, y0); const b = val(x1, y1)
    const t = a === b ? 0.5 : a / (a - b)
    return { key: `${x0},${y0},${x1},${y1}`, p: [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] }
  }
  const next = new Map()   // edge key -> { to: edge key, p }
  const points = new Map()
  const link = (e1, e2) => { points.set(e1.key, e1.p); points.set(e2.key, e2.p); next.set(e1.key, e2.key) }
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = val(x, y) < 0; const tr = val(x + 1, y) < 0; const br = val(x + 1, y + 1) < 0; const bl = val(x, y + 1) < 0
      const c = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0)
      if (c === 0 || c === 15) continue
      const T = () => pt(x, y, x + 1, y); const R = () => pt(x + 1, y, x + 1, y + 1)
      const B = () => pt(x, y + 1, x + 1, y + 1); const L = () => pt(x, y, x, y + 1)
      // Oriented with the inside on the right: each edge key has one successor, so loops join without searching.
      switch (c) {
        case 1: link(L(), B()); break
        case 2: link(B(), R()); break
        case 3: link(L(), R()); break
        case 4: link(R(), T()); break
        case 5: link(L(), T()); link(R(), B()); break
        case 6: link(B(), T()); break
        case 7: link(L(), T()); break
        case 8: link(T(), L()); break
        case 9: link(T(), B()); break
        case 10: link(T(), R()); link(B(), L()); break
        case 11: link(T(), R()); break
        case 12: link(R(), L()); break
        case 13: link(R(), B()); break
        case 14: link(B(), L()); break
      }
    }
  }
  const loops = []
  const seen = new Set()
  for (const start of next.keys()) {
    if (seen.has(start)) continue
    const loop = []
    let k = start
    while (k && !seen.has(k)) { seen.add(k); loop.push(points.get(k)); k = next.get(k) }
    if (loop.length >= 3) { loop.push(loop[0]); loops.push(loop) }
  }
  return loops
}

/** How far a morph has come, eased, at `now` (ms), for one that began at `start` and lasts `duration`. */
export const morphProgress = (now, start, duration) => {
  const t = Math.min(1, Math.max(0, (now - start) / Math.max(1, duration)))
  return t * t * (3 - 2 * t)
}
