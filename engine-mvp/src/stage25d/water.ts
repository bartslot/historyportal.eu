// Water on a painted picture, the way an anime studio does gentle water: the painting stays still and small looping
// things go on top of it, only where the teacher painted the water (a grey mask beside the layer, white = water).
//  1. ripple: a soft wobble of the painting inside the mask, stretched sideways, stronger toward the viewer
//  2. glints: hand-drawn highlight cels (broken strokes, short arcs, single dashes, the odd dot) scattered over the whole
//     mask with their own place, size and phase, held on threes (8 a second), small and close together toward the far
//     edge of the water and larger and further apart toward the viewer, more of them where the painting is light
//  3. twinkles: a few single sparkles popping in and out at uneven times, more where the painting is brightest
// Everything is periodic in the loop length: every wave turns a whole number of times per loop and the noise is sampled
// on a circle in time, so t and t + loop draw the same frame (Bart 11-19). The layer shader (layer.ts) runs WATER_GLSL;
// the functions below are its CPU twin, so the loop maths and the glints' layout can be tested.
//
// Perspective: depth d runs 0 at the water's far edge (`top`, the highest row of the mask) to 1 at the picture's bottom.
// Glints sit in bands whose height shrinks GLINT_K-fold e-times toward the far edge; bandY is the band coordinate (1 per
// band), so a band and its cells are evenly spaced in perspective, never in fixed rows of the picture.
import type { SceneLayer, WaterLook, WaterSpec } from './types'

export type { WaterLook, WaterSpec }

export const GLINT_FRAMES = 8
/** the glint cels: rows of the sheet, each its own shape (broken strokes, short arcs, a single dash, a dot) */
export const GLINT_VARIANTS = 4
/** frames a second: 8 frames held on threes at 24 */
export const GLINT_FPS = 8
export const WATER_LOOP_DEFAULT = 4
/** the ripple's base waves turn this often per second at speed 1 (rounded to whole turns per loop) */
const RIPPLE_HZ = 0.5
/** how long one twinkle lasts, seconds */
export const TWINKLE_S = 0.45
/** the teacher's range of each value (the inspector's sliders, LayerKeys::water) */
export const WATER_RANGE = { amount: [0, 3], speed: [0, 3], glints: [0, 3], loop: [2, 12] } as const

/** A look is where the sliders start (amount, speed, glints, loop) plus what no slider shows: how many twinkles, how
 *  big the glints are, how far the ripple is stretched sideways. Anime is the default (Bart 11-19). */
export const WATER_LOOKS: Record<WaterLook, { amount: number; speed: number; glints: number; loop: number; twinkle: number; size: number; stretch: number }> = {
  quiet: { amount: 0.45, speed: 0.6, glints: 0.45, loop: 6, twinkle: 0.12, size: 0.85, stretch: 3 },
  anime: { amount: 0.9, speed: 0.9, glints: 1, loop: 4, twinkle: 0.35, size: 1.1, stretch: 4.5 },
  lively: { amount: 1.6, speed: 1.4, glints: 1.9, loop: 4, twinkle: 1, size: 1.2, stretch: 3.5 },
}
export const WATER_LOOK_DEFAULT: WaterLook = 'anime'

export interface Water { look: WaterLook; amount: number; speed: number; glints: number; loop: number; twinkle: number; size: number; stretch: number; mask: string | null }

const clamp = (v: unknown, [lo, hi]: readonly [number, number], d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d

/** The water a layer draws, or null when it has none or it is turned off. A value the teacher never set is its look's. */
export function waterOf(layer: Pick<SceneLayer, 'water'> | undefined): Water | null {
  const w = layer?.water
  if (!w || typeof w !== 'object' || w.on === false) return null
  const look = w.look && w.look in WATER_LOOKS ? w.look : WATER_LOOK_DEFAULT
  const d = WATER_LOOKS[look]
  return {
    look, amount: clamp(w.amount, WATER_RANGE.amount, d.amount), speed: clamp(w.speed, WATER_RANGE.speed, d.speed),
    glints: clamp(w.glints, WATER_RANGE.glints, d.glints), loop: clamp(w.loop, WATER_RANGE.loop, d.loop),
    twinkle: d.twinkle, size: d.size, stretch: d.stretch,
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

/** Every picture is measured as if it were PIC_W px wide ("npx"), so a 4K painting gets the same water as a small one. */
const PIC_W = 1536
/** the ripple: npx per radian across (times the look's stretch); its bands RIPPLE_NPX tall at the bottom */
const WAVE_PX = 26, RIPPLE_NPX = 30, RIPPLE_PER_BAND = 1.9
/** bands shrink e^GLINT_K-fold from the bottom to the far edge (5x) */
const GLINT_K = Math.log(5)
/** a glint cell at the bottom: GLINT_NPX tall (times the look's size), CELL_ASPECT times as wide */
const GLINT_NPX = 44, CELL_ASPECT = 2.2
/** a glint is SPRITE_W cells wide (times its own length); its cel is SHEET_ASPECT times as wide as high */
const SPRITE_W = 1.3, SHEET_ASPECT = 4
/** glints per cell at glints 1 on the lightest water; dark water gets a sixth of it */
const GLINT_DENSITY = 0.32

const span = (top: number): number => Math.max(1 - top, 0.05)
/** depth 0 at the water's far edge (top) .. 1 at the picture's bottom */
export const depthOf = (v: number, top: number): number => Math.min(1, Math.max(0, (v - top) / span(top)))
/** the band coordinate at depth d, for bands S (uv of v) tall at the bottom */
export const bandY = (d: number, s: number, top: number): number => (span(top) / (s * GLINT_K)) * (Math.exp(GLINT_K) - Math.exp(GLINT_K * (1 - d)))
/** the depth at band coordinate y (bandY's inverse) */
export const bandD = (y: number, s: number, top: number): number => 1 - Math.log(Math.max(Math.exp(GLINT_K) - (y * s * GLINT_K) / span(top), 1e-3)) / GLINT_K
const picH = (texPx: readonly [number, number]): number => (PIC_W * texPx[1]) / texPx[0]

/**
 * The ripple's offset (uv of the picture) at picture uv (u, v), for a picture of texPx px, where the mask is m (0..1) and
 * the water starts at `top`. The CPU twin of WATER_GLSL waterOff: zero outside the mask, periodic in w.loop.
 */
export function rippleAt(u: number, v: number, t: number, w: Water, texPx: readonly [number, number], m: number, calm = false, top = 0): [number, number] {
  if (m <= 0 || calm || w.amount <= 0) return [0, 0]
  const th = loopAngle(t, w)
  const d = depthOf(v, top)
  const px = (u * PIC_W) / (WAVE_PX * w.stretch), py = bandY(d, RIPPLE_NPX / picH(texPx), top) * RIPPLE_PER_BAND
  const f = 0.5 * Math.sin(px * 0.9 + py * 0.35 - th + 1.0) + 0.35 * Math.sin(-px * 0.6 + py * 0.55 - 2 * th + 2.3) + 0.25 * Math.sin(px * 1.7 - py * 0.2 - 3 * th + 4.1)
  const g = 0.5 * Math.sin(px * 1.1 - py * 0.45 - th + 0.4) + 0.3 * Math.sin(py * 0.7 - 2 * th + 5.0)
  const n1 = vnoise(px * 0.25 + 1.6 * Math.cos(th), py * 0.25 + 1.6 * Math.sin(th)) - 0.5
  const n2 = vnoise(px * 0.6 + 23 + 1.1 * Math.cos(1 - 2 * th), py * 0.6 + 1.1 * Math.sin(1 - 2 * th)) - 0.5
  const near = w.amount * m * (0.25 + 0.75 * d)
  return [near * 0.0035 * (0.6 * f + 1.4 * (n1 + 0.6 * n2)), near * 0.0012 * (0.5 * g + 1.2 * (n2 - 0.4 * n1))]
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

/** One glint as the shader places it: its centre (uv), width (uv of u), depth, cel (variant) and phase. */
export interface Glint { u: number; v: number; width: number; d: number; variant: number; phase: number }

/** The cel a glint draws, from its hash: broken strokes most, then short arcs, single dashes, the odd dot. */
const variantOf = (pick: number): number => (pick < 0.45 ? 0 : pick < 0.7 ? 1 : pick < 0.9 ? 2 : 3)

/**
 * Every glint on a picture (the CPU twin of WATER_GLSL glintAt's layout): per band, per cell, with the shader's hashes.
 * lightAt and maskAt read the picture's lightness (0..1) and the mask at a uv.
 */
export function glintsOf(w: Pick<Water, 'glints' | 'size'>, texPx: readonly [number, number], top: number, lightAt: (u: number, v: number) => number, maskAt: (u: number, v: number) => number): Glint[] {
  const s = (GLINT_NPX * w.size) / picH(texPx)
  const out: Glint[] = []
  const bands = Math.ceil(bandY(1, s, top))
  for (let b = 0; b <= bands; b++) {
    const dc = bandD(b + 0.5, s, top)
    if (dc > 1.2) continue
    const h = s * Math.exp(GLINT_K * (Math.min(dc, 1) - 1))
    const vc = top + dc * span(top)
    const cw = (CELL_ASPECT * h * texPx[1]) / texPx[0]
    const xo = hash(b, 7.1) * 13
    for (let i = Math.floor(xo); i <= Math.ceil(1 / cw + xo); i++) {
      const hp = hash(i, b)
      if (hp > w.glints * GLINT_DENSITY * 1.5) continue
      const cx = i + 0.5 + 0.6 * (hash(i + 1.7, b + 1.7) - 0.5)
      const v = vc + 0.7 * (hash(i + 2.9, b + 2.9) - 0.5) * h
      const u = (cx - xo) * cw
      if (u < 0 || u > 1 || maskAt(u, v) < 0.5) continue
      if (hp > w.glints * GLINT_DENSITY * (0.25 + 1.25 * smooth(0.3, 0.8, lightAt(u, v)))) continue
      const len = 0.55 + 0.7 * hash(i + 4.3, b + 4.3)
      out.push({ u, v, width: SPRITE_W * len * cw, d: depthOf(v, top), variant: variantOf(hash(i + 6.1, b + 6.1)), phase: hash(i + 17.3, b + 17.3) })
    }
  }
  return out
}

/** The highest row of a mask (0..1 of its height) that holds water: the far edge of the water. 1 for an empty mask. */
export function maskTop(grey: ArrayLike<number>, w: number, h: number, stride = 1): number {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (grey[(y * w + x) * stride] > 127) return y / h
  return 1
}

/**
 * The water, in the layer's fragment shader (layer.ts): needs tap(), lum(), hash() and vnoise() and these uniforms.
 * water: 1 when the layer has water, waterAmt the ripple's strength, waterW the ripple's angular speed, waterLoop the
 * loop (s), waterRate the glint frames a second, waterGlints how many glints, waterCalm 1 when someone asked for less
 * motion, waterTop the water's far edge (v), waterTwinkle how many twinkles, waterSize the glints' size, waterStretch
 * how far the ripple is stretched sideways.
 */
export const WATER_GLSL = `
  uniform float water, waterAmt, waterW, waterLoop, waterRate, waterGlints, waterCalm, waterTop, waterTwinkle, waterSize, waterStretch;
  uniform sampler2D waterMask;
  uniform sampler2D glintTex;
  #define WAVE_PX ${WAVE_PX.toFixed(1)}
  #define RIPPLE_NPX ${RIPPLE_NPX.toFixed(1)}
  #define RIPPLE_PER_BAND ${RIPPLE_PER_BAND.toFixed(2)}
  #define PIC_W ${PIC_W.toFixed(1)}
  #define GLINT_FRAMES ${GLINT_FRAMES.toFixed(1)}
  #define GLINT_VARIANTS ${GLINT_VARIANTS.toFixed(1)}
  #define GLINT_K ${GLINT_K.toFixed(5)}
  #define GLINT_NPX ${GLINT_NPX.toFixed(1)}
  #define CELL_ASPECT ${CELL_ASPECT.toFixed(2)}
  #define SPRITE_W ${SPRITE_W.toFixed(2)}
  #define SHEET_ASPECT ${SHEET_ASPECT.toFixed(1)}
  #define GLINT_DENSITY ${GLINT_DENSITY.toFixed(3)}
  #define TWINKLES_ACROSS 14.0
  #define TWINKLE_S ${TWINKLE_S.toFixed(2)}
  // the mask is read at the picture's uv and repeats as the picture does (a far strip drawn twice: mirrored)
  float maskAt(vec2 p) { return texture2D(waterMask, vec2(p.x, clamp(p.y, 0.0, 1.0))).r; }
  float waterSpan() { return max(1.0 - waterTop, 0.05); }
  float picH() { return PIC_W * texPx.y / texPx.x; }
  float depthOf(float v) { return clamp((v - waterTop) / waterSpan(), 0.0, 1.0); }
  float bandY(float d, float s) { return waterSpan() / (s * GLINT_K) * (exp(GLINT_K) - exp(GLINT_K * (1.0 - d))); }
  float bandD(float y, float s) { return 1.0 - log(max(exp(GLINT_K) - y * s * GLINT_K / waterSpan(), 0.001)) / GLINT_K; }
  vec2 waterOff(vec2 uv, float th, float m) {
    float d = depthOf(uv.y);
    vec2 p = vec2(uv.x * PIC_W / (WAVE_PX * waterStretch), bandY(d, RIPPLE_NPX / picH()) * RIPPLE_PER_BAND);
    float f = 0.5 * sin(p.x * 0.9 + p.y * 0.35 - th + 1.0) + 0.35 * sin(-p.x * 0.6 + p.y * 0.55 - 2.0 * th + 2.3) + 0.25 * sin(p.x * 1.7 - p.y * 0.2 - 3.0 * th + 4.1);
    float g = 0.5 * sin(p.x * 1.1 - p.y * 0.45 - th + 0.4) + 0.3 * sin(p.y * 0.7 - 2.0 * th + 5.0);
    float n1 = vnoise(p * 0.25 + 1.6 * vec2(cos(th), sin(th))) - 0.5;
    float n2 = vnoise(p * 0.6 + vec2(23.0, 0.0) + 1.1 * vec2(cos(1.0 - 2.0 * th), sin(1.0 - 2.0 * th))) - 0.5;
    float near = waterAmt * m * (0.25 + 0.75 * d);
    return near * vec2(0.0035 * (0.6 * f + 1.4 * (n1 + 0.6 * n2)), 0.0012 * (0.5 * g + 1.2 * (n2 - 0.4 * n1)));
  }
  // the glints: the cells of this band and the bands above and below it, each glint its own place, length, cel and phase
  float glintAt(vec2 uv, float tl) {
    float s = GLINT_NPX * waterSize / picH();
    float b0 = floor(bandY(depthOf(uv.y), s));
    float best = 0.0;
    for (int bj = -1; bj <= 1; bj++) {
      float b = b0 + float(bj);
      if (b < 0.0) continue;
      float dc = bandD(b + 0.5, s);
      if (dc > 1.2) continue;
      float h = s * exp(GLINT_K * (min(dc, 1.0) - 1.0));
      float vc = waterTop + dc * waterSpan();
      float cw = CELL_ASPECT * h * texPx.y / texPx.x;
      float xo = hash(vec2(b, 7.1)) * 13.0;
      float xq = uv.x / cw + xo;
      float i0 = floor(xq);
      for (int ij = -1; ij <= 1; ij++) {
        vec2 id = vec2(i0 + float(ij), b);
        float hp = hash(id);
        if (hp > waterGlints * GLINT_DENSITY * 1.5) continue;
        vec2 c = vec2(id.x + 0.5 + 0.6 * (hash(id + 1.7) - 0.5), vc + 0.7 * (hash(id + 2.9) - 0.5) * h);
        vec2 at = vec2((c.x - xo) * cw, c.y);
        float mc = maskAt(at);
        if (mc < 0.5) continue;
        vec4 under = tap(at);
        float light = under.a > 0.01 ? smoothstep(0.3, 0.8, lum(under.rgb / under.a)) : 0.0;
        if (hp > waterGlints * GLINT_DENSITY * (0.25 + 1.25 * light)) continue;
        float sw = SPRITE_W * (0.55 + 0.7 * hash(id + 4.3));
        vec2 l = vec2((xq - c.x) / sw, (uv.y - c.y) * SHEET_ASPECT / (sw * cw * texPx.x / texPx.y));
        if (hash(id + 5.3) > 0.5) l.x = -l.x;
        if (abs(l.x) > 0.48 || abs(l.y) > 0.48) continue;
        float pick = hash(id + 6.1);
        float variant = pick < 0.45 ? 0.0 : pick < 0.7 ? 1.0 : pick < 0.9 ? 2.0 : 3.0;
        float ph = hash(id + 17.3);
        float fr = waterCalm > 0.5 ? floor(ph * GLINT_FRAMES) : floor(mod(tl * waterRate + ph * GLINT_FRAMES, GLINT_FRAMES));
        float a = texture2D(glintTex, vec2((fr + l.x + 0.5) / GLINT_FRAMES, (variant + l.y + 0.5) / GLINT_VARIANTS)).a;
        best = max(best, a * (0.6 + 0.4 * hash(id + 3.1)) * smoothstep(0.5, 0.8, mc));
      }
    }
    return best;
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
    if (hash(id + 47.0) > waterTwinkle * 0.4 * maskAt(at) * (0.2 + 0.8 * bright)) return 0.0;
    float dt = mod(tl - hash(id + 53.0) * waterLoop, waterLoop);
    float e = dt < TWINKLE_S ? pow(sin(3.14159 * dt / TWINKLE_S), 2.0) : 0.0;
    vec2 d = (f - c) * PIC_W / TWINKLES_ACROSS / mix(3.0, 7.0, depthOf(at.y));
    float star = exp(-3.0 * length(d)) + 0.7 * exp(-abs(d.y) * 9.0 - abs(d.x) * 1.1) + 0.7 * exp(-abs(d.x) * 9.0 - abs(d.y) * 1.1);
    return e * min(1.0, star);
  }`

/** One cel of the glint sheet, FRAME_W x FRAME_H px; the sheet is GLINT_FRAMES across and GLINT_VARIANTS down. */
export const GLINT_FRAME_W = 96, GLINT_FRAME_H = 24

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

/** One stroke of a glint cel: a short arc from x0 to x1 at y, bowed by `bow`, this wide and light. Px of the cel. */
export interface GlintStroke { x0: number; x1: number; y: number; bow: number; width: number; alpha: number }

/**
 * The strokes of cel i (0..GLINT_FRAMES-1) of glint shape `variant`: each gathers, holds and thins away over its 8
 * frames, the way a highlight cel cycles. 0: a broken stroke of three dashes of different lengths that drift apart;
 * 1: one or two short arcs (a small wave's crest); 2: a single dash that grows and shrinks; 3: a dot, then a second.
 * Pure, so it can be swapped for a painted sheet: pass glintSheet a url and these are never drawn.
 */
export function glintStrokes(i: number, variant = 0): GlintStroke[] {
  const k = (i % GLINT_FRAMES) / GLINT_FRAMES                 // 0..1 through the cycle
  const life = Math.sin(Math.PI * (k + 0.5 / GLINT_FRAMES)) ** 0.7   // gathers, holds, thins
  const cx = GLINT_FRAME_W / 2, cy = GLINT_FRAME_H / 2
  // drawn at 1.6 times the width the shapes were laid out at: a far glint is a few px on screen and must still read
  const dash = (x0: number, x1: number, y: number, width: number, alpha: number, bow = -0.6): GlintStroke => ({ x0, x1, y, bow, width: width * 1.6, alpha })
  switch (variant % GLINT_VARIANTS) {
    case 1: {   // short arcs
      const out = [dash(cx - 6 - 9 * life, cx + 4 + 8 * life, cy + 1, 1.1 + 1.2 * life, 0.35 + 0.65 * life, -2.5 - 1.5 * life)]
      if (k >= 0.25 && k < 0.9) out.push(dash(cx + 8, cx + 14 + 8 * life, cy - 3, 0.9 + life, 0.6 * life, -2))
      return out
    }
    case 2: {   // a single dash
      const half = 4 + 15 * life
      return [dash(cx - half, cx + half * 0.8, cy + (k - 0.5), 1.1 + 1.4 * life, 0.4 + 0.6 * life, -0.8)]
    }
    case 3: {   // the odd dot
      const out = [dash(cx - 1, cx + 1 + 2 * life, cy, 1.8 + 1.8 * life, 0.4 + 0.6 * life, 0)]
      if (k >= 0.375 && k < 0.875) out.push(dash(cx + 7, cx + 8.5, cy + 2, 1.6 + life, 0.7 * life, 0))
      return out
    }
    default: {  // a broken stroke
      const len = 0.5 + 0.7 * life, gap = 2.5 + 9 * k
      const a = 20 * len, b = 11 * len, c = 6 * len
      const x0 = cx - (a + b + c + 2 * gap) / 2
      const out = [
        dash(x0, x0 + a, cy + 0.5, 1.2 + 1.3 * life, 0.4 + 0.6 * life),
        dash(x0 + a + gap, x0 + a + gap + b, cy - 0.5 + k, 1.1 + 1.1 * life, 0.35 + 0.6 * life),
        dash(x0 + a + b + 2 * gap, x0 + a + b + c + 2 * gap, cy + 1.5, 1 + 0.8 * life, 0.3 + 0.5 * life),
      ]
      if (k >= 0.5) out.push(dash(x0 - gap - 2, x0 - gap, cy + 2, 1.2, 0.5 * (1 - k), 0))
      return out
    }
  }
}

/** Draw the procedural glint sheet: warm white strokes, soft (a wide faint pass under a thin one), nothing glossy. */
export function drawGlintSheet(pen: GlintPen): void {
  pen.clearRect(0, 0, GLINT_FRAME_W * GLINT_FRAMES, GLINT_FRAME_H * GLINT_VARIANTS)
  pen.lineCap = 'round'
  pen.strokeStyle = 'rgb(255, 246, 224)'
  for (let r = 0; r < GLINT_VARIANTS; r++) {
    for (let i = 0; i < GLINT_FRAMES; i++) {
      const ox = i * GLINT_FRAME_W, oy = r * GLINT_FRAME_H
      for (const s of glintStrokes(i, r)) {
        for (const [wk, ak] of [[2.2, 0.3], [1, 1]] as const) {   // the soft wash, then the line itself
          pen.globalAlpha = s.alpha * ak
          pen.lineWidth = s.width * wk
          pen.beginPath()
          pen.moveTo(ox + s.x0, oy + s.y)
          pen.quadraticCurveTo(ox + (s.x0 + s.x1) / 2, oy + s.y + s.bow, ox + s.x1, oy + s.y)
          pen.stroke()
        }
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
