/**
 * fill-behind.js — "Make a layer" lifts a part out of a picture; Fill behind paints the hole it leaves from what is
 * round it, so the new layer can move without a second copy showing underneath (Bart 11-19: "from 1 image, slightly
 * animate the boats"). No AI, in the browser.
 *
 * Real paint, copied from beside the hole (an exemplar fill): painted scenery and water are bands (sky, tree line,
 * field strokes, ripples), so each row of the hole takes the paint of its own row from left and right of the hole,
 * shifted by at least the hole's width (it never repeats the edge) to where the paint round the hole matches best;
 * the two sides meet softly across the middle, the better-matching side taking more. The copy is laid in seamlessly
 * (Poisson style): what it brings is its detail, the light and colour across the hole follow the hole's own edge, so a
 * gradient stays a gradient. Under it, and alone where neither side has paint to give (a hole at the picture's edge
 * or across it): rig.js fillFrom (each hole pixel the nearest pixel round it, the hidden paint under a puppet part)
 * relaxed mostly along the rows, with the edge's grain laid back in. Pure: arrays in, a new array out.
 */
import { fillFrom } from '../character/rig.js'

export const GROW_PX = 3          // the hole reaches this far past the subject: its soft, half-mixed edge goes too
const RELAX_PASSES = 300          // SOR passes: enough for a hole ~300 px wide; ~0.3 ms per 10k hole px each (ponytail: a
                                  // whole-picture selection takes a second or two; a coarse-to-fine pass if that bites)
const OMEGA = 1.9                 // over-relaxation: converges in ~thickness passes instead of thickness squared
const ACROSS = 0.15               // how much a pixel listens to the rows above and below, against its own row (1): a
                                  // painted world is banded (sky, tree line, field, water), so a band runs on through the hole
const RING_PX = 6                 // how far round the hole its grain is sampled
const GRAIN = 1                   // how much of the copied paint (or that grain) goes in (0: a smooth fill)
const MATCH_PX = 6                // how much paint beside the hole a shift is judged on, per row
const SEARCH_PX = 96              // how much further than the hole's width a shift may look for matching paint
const NEAR_BIAS = 0.02            // per px of extra shift: of two alike matches, the nearer paint wins
const MEET = 0.2                  // half the width (share of the row's hole) over which the two sides blend

/** The mask grown by `px` (a square reach), as 0/1. */
export function grow (mask, w, h, px = GROW_PX) {
  let now = Uint8Array.from(mask, (m) => (m ? 1 : 0))
  for (let k = 0; k < px; k++) {
    const next = new Uint8Array(now)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x
        if (now[i]) continue
        if ((x > 0 && now[i - 1]) || (x < w - 1 && now[i + 1]) || (y > 0 && now[i - w]) || (y < h - 1 && now[i + w])) next[i] = 1
      }
    }
    now = next
  }
  return now
}

/** A small seeded random 0..1 (the same picture fills the same way twice). */
const random = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

/**
 * `rgba` (w x h) with the pixels under `mask` (truthy = the subject) painted from their surroundings. The mask is
 * grown by `growPx` first. Transparent surroundings fill transparent: colour is mixed premultiplied, alpha with it.
 * @returns {Uint8ClampedArray} a new picture; `rgba` is left alone
 */
export function fillBehind (rgba, w, h, mask, { growPx = GROW_PX, passes = RELAX_PASSES, grain = GRAIN, seed = 1 } = {}) {
  const n = w * h
  const hole = grow(mask, w, h, growPx)
  const known = Uint8Array.from(hole, (v) => 1 - v)
  // the nearest pixel round the hole, colour and alpha (alpha rides in fillFrom's second picture)
  const alpha = new Uint8ClampedArray(n * 4)
  for (let i = 0; i < n; i++) alpha[i * 4] = rgba[i * 4 + 3]
  const seedColour = new Uint8ClampedArray(n * 4), seedAlpha = new Uint8ClampedArray(n * 4)
  fillFrom(w, h, hole, known, rgba, alpha, seedColour, seedAlpha)

  // premultiplied working copy: the known pixels stay as they are, the hole starts from the nearest fill
  const v = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    const src = hole[i] ? seedColour : rgba
    const a = hole[i] ? (seedColour[i * 4 + 3] ? seedAlpha[i * 4] : 0) : rgba[i * 4 + 3]
    for (let c = 0; c < 3; c++) v[i * 4 + c] = (src[i * 4 + c] * a) / 255
    v[i * 4 + 3] = a
  }
  const cells = []
  for (let i = 0; i < n; i++) if (hole[i]) cells.push(i)
  relax(v, w, h, cells, passes)
  const copied = grain > 0 ? copyBeside(v, rgba, w, h, hole, cells, passes, grain) : new Uint8Array(n)
  if (grain > 0) addGrain(v, rgba, w, h, hole, cells.filter((i) => !copied[i]), grain, random(seed))

  const out = new Uint8ClampedArray(rgba)
  for (const i of cells) {
    const a = v[i * 4 + 3]
    for (let c = 0; c < 3; c++) out[i * 4 + c] = a > 0 ? Math.round((v[i * 4 + c] * 255) / a) : 0
    out[i * 4 + 3] = Math.round(a)
  }
  return out
}

/** Gauss-Seidel with over-relaxation over the hole: each pixel moves towards the weighted mean of its four neighbours. */
function relax (v, w, h, cells, passes) {
  // each cell's neighbours, once: -1 off the picture
  const nb = new Int32Array(cells.length * 4)
  cells.forEach((i, k) => {
    const x = i % w, y = (i - x) / w
    nb.set([x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1], k * 4)
  })
  for (let p = 0; p < passes; p++) {
    for (let k = 0; k < cells.length; k++) {
      const i = cells[k]
      for (let c = 0; c < 4; c++) {
        let sum = 0, weight = 0
        for (let e = 0; e < 4; e++) {
          const j = nb[k * 4 + e]
          const wgt = e < 2 ? 1 : ACROSS   // left, right, then up, down
          if (j >= 0) { sum += wgt * v[j * 4 + c]; weight += wgt }
        }
        v[i * 4 + c] += OMEGA * (sum / weight - v[i * 4 + c])
      }
    }
  }
}

/** The ring round the hole: what each pixel differs from its neighbours' mean (the paper's grain, the brush). */
function addGrain (v, rgba, w, h, hole, cells, amount, rand) {
  const near = grow(hole, w, h, RING_PX)
  const grains = []
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x
      if (!near[i] || hole[i] || hole[i - 1] || hole[i + 1] || hole[i - w] || hole[i + w] || rgba[i * 4 + 3] < 255) continue
      const g = [0, 1, 2].map((c) => rgba[i * 4 + c] - (rgba[(i - 1) * 4 + c] + rgba[(i + 1) * 4 + c] + rgba[(i - w) * 4 + c] + rgba[(i + w) * 4 + c]) / 4)
      grains.push(g)
    }
  }
  if (!grains.length) return
  for (const i of cells) {
    const g = grains[Math.floor(rand() * grains.length)]
    const a = v[i * 4 + 3] / 255
    for (let c = 0; c < 3; c++) v[i * 4 + c] = Math.min(v[i * 4 + 3], Math.max(0, v[i * 4 + c] + g[c] * amount * a))
  }
}

const smoothstep = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k) }

/**
 * The exemplar fill on top of the smooth one in `v` (premultiplied, the hole relaxed): each side's copy, minus the
 * smooth fill of that copy's own edge, added in; the sides blend across each row's hole. Returns 1 where a hole pixel
 * got copied paint.
 */
function copyBeside (v, rgba, w, h, hole, cells, passes, amount) {
  const n = w * h
  const pre = new Float32Array(n * 4)   // the picture premultiplied, the hole as relaxed
  for (let i = 0; i < n; i++) {
    if (hole[i]) { pre.set(v.subarray(i * 4, i * 4 + 4), i * 4); continue }
    const a = rgba[i * 4 + 3]
    for (let c = 0; c < 3; c++) pre[i * 4 + c] = (rgba[i * 4 + c] * a) / 255
    pre[i * 4 + 3] = a
  }
  const runs = holeRuns(hole, w, h)
  const width = Math.max(0, ...runs.map((r) => r.b - r.a + 1))
  const left = bestShift(pre, hole, w, runs, width, -1)
  const right = bestShift(pre, hole, w, runs, width, 1)
  const sides = [left, right].map((side) => side && { ...side, detail: detailOf(pre, hole, w, h, cells, passes, side.d) })
  const meet = left && right ? 0.5 + 0.3 * (left.cost - right.cost) / Math.max(1, left.cost + right.cost) : 0.5
  const copied = new Uint8Array(n)
  for (const { y, a, b } of runs) {
    for (let x = a; x <= b; x++) {
      const i = y * w + x
      const [dl, dr] = sides.map((side) => (side?.detail.has[i] ? side.detail.at.subarray(i * 4, i * 4 + 4) : null))
      const t = (x - a + 0.5) / (b - a + 1)
      const wl = dl && dr ? 1 - smoothstep(meet - MEET, meet + MEET, t) : dl ? 1 : 0
      if (!dl && !dr) continue
      copied[i] = 1
      for (let c = 0; c < 4; c++) v[i * 4 + c] += amount * (wl * (dl?.[c] ?? 0) + (1 - wl) * (dr?.[c] ?? 0))
      v[i * 4 + 3] = Math.min(255, Math.max(0, v[i * 4 + 3]))
      for (let c = 0; c < 3; c++) v[i * 4 + c] = Math.min(v[i * 4 + 3], Math.max(0, v[i * 4 + c]))
    }
  }
  return copied
}

/** The hole row by row: each unbroken stretch { y, a, b } (first and last x). */
function holeRuns (hole, w, h) {
  const runs = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!hole[y * w + x]) continue
      const a = x
      while (x + 1 < w && hole[y * w + x + 1]) x++
      runs.push({ y, a, b: x })
    }
  }
  return runs
}

/**
 * The shift (`dir` -1: paint from the left, 1: from the right) of at least `width` px whose paint just beside it looks
 * most like the paint just beside the hole, row by row. Null when that side has no paint to give.
 */
function bestShift (pre, hole, w, runs, width, dir) {
  if (!runs.length) return null
  let best = null
  for (let d = width; d <= width + SEARCH_PX; d++) {
    let sum = 0, count = 0, rows = 0
    for (const { y, a, b } of runs) {
      const edge = dir < 0 ? a : b
      const src = edge + dir * d
      if (src < 0 || src >= w || hole[y * w + src]) continue
      rows++
      for (let k = 1; k <= MATCH_PX; k++) {
        const p = edge + dir * k, q = p + dir * d
        if (p < 0 || p >= w || q < 0 || q >= w || hole[y * w + p] || hole[y * w + q]) continue
        for (let c = 0; c < 4; c++) sum += Math.abs(pre[(y * w + p) * 4 + c] - pre[(y * w + q) * 4 + c])
        count++
      }
    }
    if (rows < runs.length / 2) continue
    const cost = (count ? sum / count : 0) + NEAR_BIAS * (d - width)
    if (!best || cost < best.cost) best = { d: dir * d, cost }
  }
  return best
}

/**
 * The detail one side's copy brings, per hole pixel (premultiplied RGBA in `at`; `has` 0 where its source is no paint):
 * the picture shifted by `d`, minus the smooth fill of that shifted picture's own edge round the hole.
 */
function detailOf (pre, hole, w, h, cells, passes, d) {
  const shifted = new Float32Array(pre)
  const has = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, sx = x - d
      if (sx < 0 || sx >= w || hole[y * w + sx]) continue
      shifted.set(pre.subarray((y * w + sx) * 4, (y * w + sx) * 4 + 4), i * 4)
      has[i] = 1
    }
  }
  const smooth = new Float32Array(shifted)
  relax(smooth, w, h, cells, passes)
  for (let k = 0; k < shifted.length; k++) shifted[k] -= smooth[k]
  return { has, at: shifted }
}
