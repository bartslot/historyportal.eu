// Water on a painted picture, the way an anime studio does gentle water: the painting stays still and small looping
// things go on top of it, only where the teacher painted the water (a grey mask beside the layer, white = water).
//  1. ripple: a soft wobble of the painting inside the mask, stronger toward the viewer (the picture's bottom)
//  2. glints: small hand-drawn highlights that cycle through GLINT_FRAMES frames held on threes (8 a second), each its
//     own phase, so they never pulse together
//  3. twinkles: a few single sparkles popping in and out at uneven times, more where the painting is brightest
// Everything is periodic in the loop length: every wave turns a whole number of times per loop and the noise is sampled
// on a circle in time, so t and t + loop draw the same frame (Bart 11-19). The layer shader (layer.ts) runs WATER_GLSL;
// the functions below are its CPU twin, so the loop maths can be tested.
import type { SceneLayer, WaterSpec } from './types'

export type { WaterSpec }

export const GLINT_FRAMES = 8
/** frames a second: 8 frames held on threes at 24 */
export const GLINT_FPS = 8
export const WATER_LOOP_DEFAULT = 4
/** the ripple's base waves turn this often per second at speed 1 (rounded to whole turns per loop) */
const RIPPLE_HZ = 0.5
/** how long one twinkle lasts, seconds */
export const TWINKLE_S = 0.45
/** the teacher's range of each value (the inspector's sliders, LayerKeys::water) */
export const WATER_RANGE = { amount: [0, 3], speed: [0, 3], glints: [0, 3], loop: [2, 12] } as const

export interface Water { amount: number; speed: number; glints: number; loop: number; mask: string | null }

const clamp = (v: unknown, [lo, hi]: readonly [number, number], d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d

/** The water a layer draws, or null when it has none or it is turned off. */
export function waterOf(layer: Pick<SceneLayer, 'water'> | undefined): Water | null {
  const w = layer?.water
  if (!w || typeof w !== 'object' || w.on === false) return null
  return {
    amount: clamp(w.amount, WATER_RANGE.amount, 1), speed: clamp(w.speed, WATER_RANGE.speed, 1),
    glints: clamp(w.glints, WATER_RANGE.glints, 1), loop: clamp(w.loop, WATER_RANGE.loop, WATER_LOOP_DEFAULT),
    mask: typeof w.mask === 'string' && w.mask ? w.mask : null,
  }
}

/** Whole turns the ripple's base wave makes per loop (0: speed 0 holds it still). */
export const waterCycles = (loop: number, speed: number): number => (speed > 0 ? Math.max(1, Math.round(loop * speed * RIPPLE_HZ)) : 0)
/** The ripple's angular speed (rad/s): a whole number of turns per loop. */
export const waterOmega = (loop: number, speed: number): number => (2 * Math.PI * waterCycles(loop, speed)) / loop
/** Glint frames a second: about GLINT_FPS, nudged so a whole number of cycles fits in the loop. */
export const glintRate = (loop: number): number => (Math.max(1, Math.round((loop * GLINT_FPS) / GLINT_FRAMES)) * GLINT_FRAMES) / loop

/** The loop angle at time t (the shader's `th`): the time folded into the loop first, so floats stay small. */
const loopAngle = (t: number, w: Water): number => waterOmega(w.loop, w.speed) * mod(t, w.loop)
const mod = (a: number, b: number): number => a - b * Math.floor(a / b)
const fract = (v: number): number => v - Math.floor(v)

// the shader's hash and value noise (ground-gl.ts GL_NOISE), on the CPU
export const hash = (x: number, y: number): number => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453)
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

/** WAVE_PX: px per radian of the ripple's waves on a picture PIC_W px wide (every picture is measured as if it were that
 *  wide, so a 4K painting gets the same waves as a small one); flattened (WAVE_FLAT) as water seen from the shore */
const WAVE_PX = 26, WAVE_FLAT = 2.4, PIC_W = 1536
/** glints across the picture's width, and twinkle cells */
const GLINTS_ACROSS = 16, TWINKLES_ACROSS = 14

/**
 * The ripple's offset (uv of the picture) at picture uv (u, v), for a picture of texPx px, where the mask is m (0..1).
 * The CPU twin of WATER_GLSL waterOff: zero outside the mask, periodic in w.loop.
 */
export function rippleAt(u: number, v: number, t: number, w: Water, texPx: readonly [number, number], m: number, calm = false): [number, number] {
  if (m <= 0 || calm || w.amount <= 0) return [0, 0]
  const th = loopAngle(t, w)
  const px = (u * PIC_W) / WAVE_PX, py = ((v * PIC_W * texPx[1]) / texPx[0] / WAVE_PX) * WAVE_FLAT
  const f = 0.5 * Math.sin(px * 0.9 + py * 0.35 - th + 1.0) + 0.35 * Math.sin(-px * 0.6 + py * 0.55 - 2 * th + 2.3) + 0.25 * Math.sin(px * 1.7 - py * 0.2 - 3 * th + 4.1)
  const g = 0.5 * Math.sin(px * 1.1 - py * 0.45 - th + 0.4) + 0.3 * Math.sin(py * 0.7 - 2 * th + 5.0)
  const n1 = vnoise(px * 0.25 + 1.6 * Math.cos(th), py * 0.25 + 1.6 * Math.sin(th)) - 0.5
  const n2 = vnoise(px * 0.6 + 23 + 1.1 * Math.cos(1 - 2 * th), py * 0.6 + 1.1 * Math.sin(1 - 2 * th)) - 0.5
  const near = w.amount * m * (0.3 + 0.7 * v)   // v 0 top (far) .. 1 bottom (near)
  return [near * 0.0035 * (0.6 * f + 1.4 * (n1 + 0.6 * n2)), near * 0.0016 * (0.5 * g + 1.2 * (n2 - 0.4 * n1))]
}

/** A glint's frame (0..GLINT_FRAMES-1) at time t, for its own phase (0..1); calm: held on its own frame. */
export function glintFrame(t: number, phase: number, loop: number, calm = false): number {
  if (calm) return Math.floor(phase * GLINT_FRAMES) % GLINT_FRAMES
  return Math.floor(mod(mod(t, loop) * glintRate(loop) + phase * GLINT_FRAMES, GLINT_FRAMES))
}

/** A twinkle's light (0..1) at time t: it pops at `at` seconds into the loop and is gone TWINKLE_S later. */
export function twinkleAt(t: number, at: number, loop: number): number {
  const dt = mod(mod(t, loop) - at, loop)
  return dt < TWINKLE_S ? Math.sin((Math.PI * dt) / TWINKLE_S) ** 2 : 0
}

/** The phase of the glint in cell (x, y): the shader's hash(id + 17.3). */
export const glintPhase = (x: number, y: number): number => hash(x + 17.3, y + 17.3)

/**
 * The water, in the layer's fragment shader (layer.ts): needs tap(), lum(), hash() and vnoise() and these uniforms.
 * water: 1 when the layer has water, waterAmt the ripple's strength, waterW the ripple's angular speed, waterLoop the loop (s), waterRate the glint
 * frames a second, waterGlints how many glints, waterCalm 1 when someone asked for less motion.
 */
export const WATER_GLSL = `
  uniform float water, waterAmt, waterW, waterLoop, waterRate, waterGlints, waterCalm;
  uniform sampler2D waterMask;
  uniform sampler2D glintTex;
  #define WAVE_PX ${WAVE_PX.toFixed(1)}
  #define WAVE_FLAT ${WAVE_FLAT.toFixed(2)}
  #define PIC_W ${PIC_W.toFixed(1)}
  #define GLINT_FRAMES ${GLINT_FRAMES.toFixed(1)}
  #define GLINTS_ACROSS ${GLINTS_ACROSS.toFixed(1)}
  #define TWINKLES_ACROSS ${TWINKLES_ACROSS.toFixed(1)}
  #define TWINKLE_S ${TWINKLE_S.toFixed(2)}
  // the mask is read at the picture's uv and repeats as the picture does (a far strip drawn twice: mirrored)
  float maskAt(vec2 p) { return texture2D(waterMask, vec2(p.x, clamp(p.y, 0.0, 1.0))).r; }
  vec2 waterOff(vec2 uv, float th, float m) {
    vec2 p = uv * vec2(PIC_W, PIC_W * texPx.y / texPx.x) / WAVE_PX;
    p.y *= WAVE_FLAT;
    float f = 0.5 * sin(p.x * 0.9 + p.y * 0.35 - th + 1.0) + 0.35 * sin(-p.x * 0.6 + p.y * 0.55 - 2.0 * th + 2.3) + 0.25 * sin(p.x * 1.7 - p.y * 0.2 - 3.0 * th + 4.1);
    float g = 0.5 * sin(p.x * 1.1 - p.y * 0.45 - th + 0.4) + 0.3 * sin(p.y * 0.7 - 2.0 * th + 5.0);
    float n1 = vnoise(p * 0.25 + 1.6 * vec2(cos(th), sin(th))) - 0.5;
    float n2 = vnoise(p * 0.6 + vec2(23.0, 0.0) + 1.1 * vec2(cos(1.0 - 2.0 * th), sin(1.0 - 2.0 * th))) - 0.5;
    float near = waterAmt * m * (0.3 + 0.7 * uv.y);
    return near * vec2(0.0035 * (0.6 * f + 1.4 * (n1 + 0.6 * n2)), 0.0016 * (0.5 * g + 1.2 * (n2 - 0.4 * n1)));
  }
  // a glint: one cel of the sheet in its cell, its own phase and place, only on the water
  float glintAt(vec2 uv, float tl) {
    vec2 cell = vec2(1.0, 0.4 * texPx.x / texPx.y) / GLINTS_ACROSS;   // a cell 2.5 times as wide as high, in uv
    vec2 q = uv / cell;
    vec2 id = floor(q), f = q - id;
    if (hash(id) > waterGlints * 0.4) return 0.0;
    vec2 c = vec2(0.45 + 0.1 * hash(id + 3.1), 0.35 + 0.3 * hash(id + 7.7));
    float mc = maskAt((id + c) * cell);
    if (mc < 0.5) return 0.0;
    vec2 l = (f - c) / vec2(0.92, 0.94) * mix(1.6, 1.0, uv.y);   // the sheet's 96 x 40 frame in a 2.5 : 1 cell
    if (hash(id + 5.3) > 0.5) l.x = -l.x;
    if (abs(l.x) > 0.48 || abs(l.y) > 0.48) return 0.0;
    float ph = hash(id + 17.3);
    float fr = waterCalm > 0.5 ? floor(ph * GLINT_FRAMES) : floor(mod(tl * waterRate + ph * GLINT_FRAMES, GLINT_FRAMES));
    float s = texture2D(glintTex, vec2((fr + l.x + 0.5) / GLINT_FRAMES, l.y + 0.5)).a;
    return s * (0.55 + 0.45 * hash(id + 3.1)) * smoothstep(0.5, 0.8, mc);
  }
  // a twinkle: a small four-point star that pops once a loop at its own time, where the water is brightest
  float twinkleAt(vec2 uv, float tl) {
    vec2 cell = vec2(1.0, texPx.x / texPx.y) / TWINKLES_ACROSS;
    vec2 q = uv / cell;
    vec2 id = floor(q), f = q - id;
    vec2 c = 0.25 + 0.5 * vec2(hash(id + 41.0), hash(id + 43.0));
    vec2 at = (id + c) * cell;
    vec4 under = tap(at);
    float bright = under.a > 0.01 ? smoothstep(0.5, 0.88, lum(under.rgb / under.a)) : 0.0;
    if (hash(id + 47.0) > waterGlints * 0.35 * maskAt(at) * (0.25 + 0.75 * bright)) return 0.0;
    float dt = mod(tl - hash(id + 53.0) * waterLoop, waterLoop);
    float e = dt < TWINKLE_S ? pow(sin(3.14159 * dt / TWINKLE_S), 2.0) : 0.0;
    vec2 d = (f - c) * PIC_W / TWINKLES_ACROSS / mix(4.0, 8.0, uv.y);
    float star = exp(-3.0 * length(d)) + 0.7 * exp(-abs(d.y) * 9.0 - abs(d.x) * 1.1) + 0.7 * exp(-abs(d.x) * 9.0 - abs(d.y) * 1.1);
    return e * min(1.0, star);
  }`

/** One frame of the glint sheet, FRAME_W x FRAME_H px; the sheet is GLINT_FRAMES of them in one row. */
export const GLINT_FRAME_W = 96, GLINT_FRAME_H = 40

/** The drawing calls drawGlintSheet makes (a 2D canvas context has them all). */
export interface GlintPen {
  clearRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  moveTo(x: number, y: number): void
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void
  stroke(): void
  lineWidth: number
  lineCap: CanvasLineCap
  strokeStyle: string | CanvasGradient | CanvasPattern
  globalAlpha: number
}

/** One stroke of a glint frame: a short arc from x0 to x1 at y, bowed by `bow`, this wide and light. Px of the frame. */
export interface GlintStroke { x0: number; x1: number; y: number; bow: number; width: number; alpha: number }

/**
 * The strokes of glint frame i (0..GLINT_FRAMES-1): a highlight that gathers into a short broken stroke, splits into two
 * small ripple arcs, and thins away, the way a highlight cel cycles. Pure, so it can be swapped for a painted sheet:
 * pass glintSheet a url and these are never drawn.
 */
export function glintStrokes(i: number): GlintStroke[] {
  const k = (i % GLINT_FRAMES) / GLINT_FRAMES                 // 0..1 through the cycle
  const life = Math.sin(Math.PI * k) ** 0.7                   // gathers, holds, thins
  const cx = GLINT_FRAME_W / 2, cy = GLINT_FRAME_H / 2
  const len = 24 + 50 * life
  const split = 3 + 18 * k                                    // the stroke breaks apart as it ages
  const out: GlintStroke[] = [
    { x0: cx - len / 2 - split / 2, x1: cx - split / 2, y: cy + 2 * k, bow: -1 - 1.5 * life, width: 1.4 + 1.6 * life, alpha: 0.4 + 0.6 * life },
    { x0: cx + split / 2, x1: cx + len / 2 + split / 2, y: cy + 1 - k, bow: -1 - life, width: 1.2 + 1.3 * life, alpha: 0.35 + 0.55 * life },
  ]
  if (k > 0.2 && k < 0.85) out.push({ x0: cx - len * 0.2, x1: cx + len * 0.15, y: cy - 6 + 3 * k, bow: -2.5, width: 1 + life, alpha: 0.5 * life })
  if (k > 0.5) out.push({ x0: cx - len * 0.55 - split, x1: cx - len * 0.4 - split, y: cy + 6, bow: -0.5, width: 1.2, alpha: 0.45 * (1 - k) })
  return out
}

/** Draw the procedural glint sheet: warm white strokes, soft (a wide faint pass under a thin one), nothing glossy. */
export function drawGlintSheet(pen: GlintPen): void {
  pen.clearRect(0, 0, GLINT_FRAME_W * GLINT_FRAMES, GLINT_FRAME_H)
  pen.lineCap = 'round'
  pen.strokeStyle = 'rgb(255, 246, 224)'
  for (let i = 0; i < GLINT_FRAMES; i++) {
    const ox = i * GLINT_FRAME_W
    for (const s of glintStrokes(i)) {
      for (const [wk, ak] of [[2.2, 0.3], [1, 1]] as const) {   // the soft wash, then the line itself
        pen.globalAlpha = s.alpha * ak
        pen.lineWidth = s.width * wk
        pen.beginPath()
        pen.moveTo(ox + s.x0, s.y)
        pen.quadraticCurveTo(ox + (s.x0 + s.x1) / 2, s.y + s.bow, ox + s.x1, s.y)
        pen.stroke()
      }
    }
  }
  pen.globalAlpha = 1
}

/**
 * A first guess at the water in a picture (straight RGBA, w x h): blue-ish, calm (little texture), in the lower part and
 * joined to the picture's bottom.
 * Returns a grey mask (0..255) of the same size, softened, for the teacher to correct with the brush.
 */
export function guessWaterMask(data: Uint8ClampedArray | Uint8Array, w: number, h: number): Uint8ClampedArray {
  const lumAt = (i: number) => (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255
  const score = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    const lower = smooth(0.25, 0.5, y / h)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] < 128 || lower === 0) continue
      const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255, l = lumAt(i)
      const blue = smooth(0.0, 0.08, b - r) * smooth(-0.12, 0.0, b - g + 0.06) * smooth(0.2, 0.35, l)
      const nb = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => {
        const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy))
        return lumAt((yy * w + xx) * 4)
      })
      const rough = Math.abs(l - (nb[0] + nb[1] + nb[2] + nb[3]) / 4)
      score[y * w + x] = blue * lower * (0.55 + 0.45 * smooth(0.12, 0.03, rough))
    }
  }
  const soft = boxBlur(boxBlur(score, w, h, 3), w, h, 3)
  // water reaches the bottom of a painting: keep only what joins the lowest rows (a blue roof up in the town is no water)
  const keep = new Uint8Array(w * h), todo: number[] = []
  for (let y = Math.floor(h * 0.85); y < h; y++) for (let x = 0; x < w; x++) if (soft[y * w + x] > 0.22) { keep[y * w + x] = 1; todo.push(y * w + x) }
  while (todo.length) {
    const i = todo.pop()!, x = i % w, y = (i - x) / w
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (j >= 0 && !keep[j] && soft[j] > 0.22) { keep[j] = 1; todo.push(j) }
    }
  }
  const out = new Uint8ClampedArray(w * h)
  for (let i = 0; i < out.length; i++) out[i] = keep[i] ? Math.round(255 * smooth(0.22, 0.42, soft[i])) : 0
  return out
}

function smooth(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; n++ } }
    tmp[y * w + x] = s / n
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++ } }
    out[y * w + x] = s / n
  }
  return out
}
