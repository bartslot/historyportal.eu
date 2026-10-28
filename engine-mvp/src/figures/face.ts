// Faces that live (PM 10-28, Bart: "animate our characters' faces ... characters that are moving in the scene").
// The principle (ClaudeAnimationBase), not its look: emotion is a few ink strokes (eyes, brows, mouth) plus tiny emotes,
// and idle life never stops (blink, eye darts, breathing, weight shift, head tilt). Here the strokes are drawn in the
// figure's own History Lines ink over the painted head: a small shader quad whose strokes are analytic (no texture to
// repaint), with a wipe that covers only the DARK painted features (the painted eyes/brows/mouth) in the local skin
// colour, so nothing is doubled and nothing outside the head is touched. The quad rides the head through every
// deformation (lean, tilt, breath), so the eyes stay on the head. Everything is a knob (LIFE) and seeded per figure.
import { Effect, Mesh, ShaderMaterial, Texture, TransformNode, Vector2, Vector3, Vector4, VertexBuffer, VertexData, type Scene } from '@babylonjs/core'
import { GL_NOISE } from '../stage25d/ground-gl'
import { LINE_BY_DEPTH_GLSL, PAPER_GLSL } from '../stage25d/layer'

type P2 = [number, number]
/** px landmarks of a painted head (cut_poses.py find_face): near eye, near brow, far eye, mouth line, face scale s
 *  (1 = 33 px eye to mouth), the local skin colour */
export type FaceMark = { eye: P2; brow: P2; eyeF: P2; mouth: P2; s: number; skin: [number, number, number] }

/** Teacher knobs (every one a slider; the Look panel reads them). Degrees, seconds, px at face scale 1. */
export const LIFE = {
  on: 1,
  blinkMin: 2, blinkMax: 6, blinkMs: 150, doubleBlink: 0.15,
  saccade: 1, saccadeMin: 0.9, saccadeMax: 3.2, saccadePx: 1.6,
  breathAmp: 0.01, breathHz: 0.25,            // +-1 % of the height: a 2 % bob at 0.25 Hz
  shiftMin: 4, shiftMax: 8, shiftDeg: 1.2, shiftM: 0.012,
  tiltMin: 3, tiltMax: 6, tiltDeg: 1.5,
  emoMs: 220,                                  // 150-300: an emotion eases in over this long
  strokePx: 1.7,                               // the face strokes' width in painting px (the figure's own line is ~2)
  emotes: 0,                                   // 0 = off (small ink marks near the head)
  walkCalm: 0.3,                               // share of the weight shift/tilt kept while walking
  talkHz: 6, talkOpen: 3.2,
}

export type EmotionDef = {
  eyeOpen: number; eyeOpenF?: number           // 0 closed .. 1 normal .. 1.4 wide
  brow: [number, number, number, number]      // angle deg (+ inner end up), lift px, length scale, far brow extra lift
  mouth: [number, number, number, number]     // curve px (+ smile), open px, half width px, skew px
  gaze?: [number, number]                      // px offset of the pupils
  lean: number; tilt: number; shoulder: number // body: lean deg (+ forward), head tilt deg (+ chin toward the chest side), shoulder lift m
  emote?: 'sweat' | 'exclaim' | 'question' | 'sparkle'
}

export const EMOTIONS: Record<string, EmotionDef> = {
  neutral:    { eyeOpen: 1,    brow: [0, 0, 1, 0],      mouth: [0.8, 0, 7.5, 0],   lean: 0,    tilt: 0,  shoulder: 0 },
  happy:      { eyeOpen: 0.78, brow: [3, 2, 1, 1],      mouth: [3.6, 1.2, 9.5, 0], lean: 0.6,  tilt: 2,  shoulder: 0 },
  worried:    { eyeOpen: 1,    brow: [14, 2.5, 1, 1.5], mouth: [-1.6, 0, 6.5, 0.8], lean: -1,   tilt: -3, shoulder: 0.012, emote: 'sweat' },
  surprised:  { eyeOpen: 1.38, brow: [0, 6, 1, 3],      mouth: [0, 5.5, 4, 0],     lean: -2,   tilt: 0,  shoulder: 0.015, emote: 'exclaim' },
  sad:        { eyeOpen: 0.68, brow: [12, 0, 1, 1],     mouth: [-2.4, 0, 6, 0],    lean: 1.5,  tilt: -4, shoulder: -0.01 },
  angry:      { eyeOpen: 0.8,  brow: [-16, -2, 1.1, -1], mouth: [-1.8, 0, 7, 0],   lean: 2.5,  tilt: 0,  shoulder: 0.01 },
  determined: { eyeOpen: 0.9,  brow: [-9, -1, 1.05, 0], mouth: [-0.4, 0, 7.5, 0],  lean: 2,    tilt: 1,  shoulder: 0.005 },
  thinking:   { eyeOpen: 0.9,  brow: [3, 1, 1, 4],      mouth: [0, 0, 4.5, 2.2],   gaze: [-1.6, -1.9], lean: 0, tilt: 4, shoulder: 0, emote: 'question' },
  scared:     { eyeOpen: 1.32, brow: [18, 5, 1.05, 3],  mouth: [-2.2, 3.2, 6, 0],  lean: -3,   tilt: -2, shoulder: 0.02, emote: 'sweat' },
  proud:      { eyeOpen: 0.8,  brow: [-3, 3, 1, 2],     mouth: [2.6, 0, 8.5, -1],  lean: -1.5, tilt: -3, shoulder: 0.01, emote: 'sparkle' },
  tired:      { eyeOpen: 0.5,  brow: [8, -2, 1, -1],    mouth: [-0.8, 0, 6.5, 0],  lean: 2.5,  tilt: -5, shoulder: -0.012 },
}
export const EMOTION_NAMES = Object.keys(EMOTIONS)

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const smooth = (t: number) => t * t * (3 - 2 * t)
/** ease in-out (cubic): a feeling never starts or stops linearly */
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** small seeded generator: two figures with different seeds never move in sync */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
export const seedOf = (text: string, n = 0) => { let h = 2166136261 ^ n; for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619); return h >>> 0 }

/** the numbers the shader draws */
export type FaceParams = {
  eyeOpen: number; eyeOpenF: number; gaze: P2
  brow: [number, number, number, number]; mouth: [number, number, number, number]
  lean: number; tilt: number; shoulder: number
}
const flat = (e: EmotionDef): number[] => [e.eyeOpen, e.eyeOpenF ?? e.eyeOpen, e.gaze?.[0] ?? 0, e.gaze?.[1] ?? 0, ...e.brow, ...e.mouth, e.lean, e.tilt, e.shoulder]

/** What the body does (the puppet applies it to the painting) */
export type BodyOffsets = { lean: number; tilt: number; shoulder: number; scaleY: number; dx: number }

/** Idle life + the emotion tween, stepped by dt seconds. Deterministic for a seed. */
export class FaceLife {
  readonly rand: () => number
  private t = 0
  private from = flat(EMOTIONS.neutral)
  private to = flat(EMOTIONS.neutral)
  private cur = flat(EMOTIONS.neutral)
  private tweenT = 1
  private tweenMs = 220
  emotion = 'neutral'
  talking = false
  private blinkAt: number; private blinkT = -1; private blinkAgain = false
  private gazeAt: number; private gaze: P2 = [0, 0]; private gazeTo: P2 = [0, 0]
  private shiftAt: number; private shiftFrom = 0; private shiftTo = 0; private shiftT = 1; private shiftXFrom = 0; private shiftXTo = 0
  private tiltAt: number; private tiltFrom = 0; private tiltTo = 0; private tiltT = 1
  private phase: number

  constructor(readonly seed: number) {
    this.rand = mulberry32(seed)
    this.phase = this.rand() * Math.PI * 2
    this.blinkAt = this.range(LIFE.blinkMin, LIFE.blinkMax)
    this.gazeAt = this.range(LIFE.saccadeMin, LIFE.saccadeMax)
    this.shiftAt = this.range(LIFE.shiftMin, LIFE.shiftMax)
    this.tiltAt = this.range(LIFE.tiltMin, LIFE.tiltMax)
  }
  private range(a: number, b: number) { return a + (b - a) * this.rand() }

  setEmotion(name: string, ms = LIFE.emoMs) {
    const e = EMOTIONS[name]
    if (!e || name === this.emotion) return
    this.emotion = name
    this.from = [...this.cur]
    this.to = flat(e)
    this.tweenT = 0
    this.tweenMs = clamp(ms, 1, 2000)
  }

  /** advance dt seconds; walking calms the weight shift and tilt */
  step(dt: number, walking = false): { face: FaceParams; blink: number; body: BodyOffsets; emote: EmotionDef['emote'] } {
    this.t += dt
    if (this.tweenT < 1) this.tweenT = Math.min(1, this.tweenT + (dt * 1000) / this.tweenMs)
    const k = easeInOut(this.tweenT)
    for (let i = 0; i < this.cur.length; i++) this.cur[i] = this.from[i] + (this.to[i] - this.from[i]) * k
    const on = LIFE.on > 0
    // blink: a quick close and open; sometimes twice
    let blink = 0
    if (on) {
      if (this.blinkT < 0 && this.t >= this.blinkAt) this.blinkT = 0
      if (this.blinkT >= 0) {
        this.blinkT += (dt * 1000) / LIFE.blinkMs
        const b = this.blinkT
        blink = b < 0.35 ? smooth(b / 0.35) : b < 1 ? 1 - smooth((b - 0.35) / 0.65) : 0
        if (b >= 1) {
          this.blinkT = -1
          if (!this.blinkAgain && this.rand() < LIFE.doubleBlink) { this.blinkAgain = true; this.blinkAt = this.t + 0.12 }
          else { this.blinkAgain = false; this.blinkAt = this.t + this.range(LIFE.blinkMin, LIFE.blinkMax) }
        }
      }
      // eye darts: the pupils jump to a new spot, then ease there fast
      if (this.t >= this.gazeAt) {
        this.gazeAt = this.t + this.range(LIFE.saccadeMin, LIFE.saccadeMax)
        const r = LIFE.saccadePx * LIFE.saccade
        this.gazeTo = [(this.rand() * 2 - 1) * r, (this.rand() * 2 - 1) * r * 0.5]
      }
      const g = 1 - Math.exp(-dt * 26)
      this.gaze = [this.gaze[0] + (this.gazeTo[0] - this.gaze[0]) * g, this.gaze[1] + (this.gazeTo[1] - this.gaze[1]) * g]
      // weight shift: every few seconds the body settles onto the other leg
      if (this.t >= this.shiftAt) {
        this.shiftAt = this.t + this.range(LIFE.shiftMin, LIFE.shiftMax)
        this.shiftFrom = this.shiftTo; this.shiftXFrom = this.shiftXTo
        const a = (this.rand() * 2 - 1)
        this.shiftTo = a * LIFE.shiftDeg; this.shiftXTo = a * LIFE.shiftM; this.shiftT = 0
      }
      if (this.t >= this.tiltAt) {
        this.tiltAt = this.t + this.range(LIFE.tiltMin, LIFE.tiltMax)
        this.tiltFrom = this.tiltTo; this.tiltTo = (this.rand() * 2 - 1) * LIFE.tiltDeg; this.tiltT = 0
      }
    }
    if (this.shiftT < 1) this.shiftT = Math.min(1, this.shiftT + dt / 0.7)
    if (this.tiltT < 1) this.tiltT = Math.min(1, this.tiltT + dt / 0.5)
    const calm = walking ? LIFE.walkCalm : 1
    const sk = smooth(this.shiftT), tk = smooth(this.tiltT)
    const lifeLean = on ? (this.shiftFrom + (this.shiftTo - this.shiftFrom) * sk) * calm : 0
    const lifeDx = on ? (this.shiftXFrom + (this.shiftXTo - this.shiftXFrom) * sk) * calm : 0
    const lifeTilt = on ? (this.tiltFrom + (this.tiltTo - this.tiltFrom) * tk) * calm : 0
    const c = this.cur
    const e = EMOTIONS[this.emotion]
    let mouthOpen = c[8 + 1]
    if (this.talking) mouthOpen += LIFE.talkOpen * (0.5 + 0.5 * Math.sin(this.t * Math.PI * 2 * LIFE.talkHz + this.phase)) * (0.6 + 0.4 * Math.sin(this.t * 3.1))
    const open = clamp(c[0], 0, 1.5), openF = clamp(c[1], 0, 1.5)
    return {
      face: {
        eyeOpen: open * (1 - blink), eyeOpenF: openF * (1 - blink), gaze: [c[2] + this.gaze[0], c[3] + this.gaze[1]],
        brow: [c[4], c[5], c[6], c[7]], mouth: [c[8], mouthOpen, c[10], c[11]],
        lean: c[12], tilt: c[13], shoulder: c[14],
      },
      blink,
      body: {
        lean: c[12] + lifeLean, tilt: c[13] + lifeTilt, shoulder: c[14],
        scaleY: on ? 1 + LIFE.breathAmp * Math.sin(this.t * Math.PI * 2 * LIFE.breathHz + this.phase) : 1, dx: lifeDx,
      },
      emote: e.emote,
    }
  }
}

// ---- the shaders ----------------------------------------------------------------------------------------------------
const COMMON = `
precision highp float;
varying vec2 vUV;
uniform vec3 grade; uniform float lineFade; uniform float haze; uniform float lineBrown; uniform vec3 hazeTint;
uniform float paper; uniform float grain; uniform float patches; uniform float wash; uniform vec3 washColour;
${GL_NOISE}
${LINE_BY_DEPTH_GLSL}
${PAPER_GLSL}
float cov(float d, float w) { return 1.0 - smoothstep(w - 0.45, w + 0.45, d); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
vec3 gradeOf(vec3 c) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, grade.x) * grade.y;
  return c * vec3(1.0 - 0.07 * grade.z, 1.0 - 0.02 * grade.z, 1.0 + 0.05 * grade.z);
}
`
Effect.ShadersStore.puppetFaceVertexShader = `precision highp float;
attribute vec3 position; attribute vec2 uv; uniform mat4 worldViewProjection; varying vec2 vUV;
void main() { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`
Effect.ShadersStore.puppetEmoteVertexShader = Effect.ShadersStore.puppetFaceVertexShader
Effect.ShadersStore.puppetFaceFragmentShader = `${COMMON}
uniform sampler2D art;
uniform vec2 quadSize; uniform vec2 spriteSize; uniform vec2 spriteOrg;
uniform vec2 eyeN; uniform vec2 eyeF; uniform vec2 browN; uniform vec2 browF; uniform vec2 mouthC;
uniform vec4 eyeP;   // open near, open far, gaze x, gaze y (px)
uniform vec4 browP;  // angle (rad, + inner end up), lift px, length scale, far brow extra lift px
uniform vec4 mouthP; // curve px (+ smile), open px, half width px, skew px
uniform vec3 skin; uniform float stroke; uniform float s;
vec2 suv(vec2 px) { vec2 sp = spriteOrg + px; return vec2(sp.x / spriteSize.x, 1.0 - sp.y / spriteSize.y); }
float lumaOf(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
float darkAt(vec2 px) {
  vec4 t = texture2D(art, suv(px));
  return t.a < 0.5 ? 0.0 : smoothstep(0.17, 0.3, lumaOf(skin) - lumaOf(t.rgb));
}
float darkPooled(vec2 px) {
  float d = darkAt(px);
  d = max(d, darkAt(px + vec2(1.6, 0.0))); d = max(d, darkAt(px - vec2(1.6, 0.0)));
  d = max(d, darkAt(px + vec2(0.0, 1.6))); d = max(d, darkAt(px - vec2(0.0, 1.6)));
  return d;
}
float ell(vec2 p, vec2 c, vec2 r) { return length((p - c) / r); }
// the painted skin around a point: the average of the nearby samples that are not themselves a dark feature, so the
// wipe keeps the local shading (blush, shadow) instead of a flat patch
vec3 localSkin(vec2 p) {
  vec3 acc = vec3(0.0); float ws = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7853982;
    vec2 q = p + vec2(cos(a), sin(a)) * 10.0;
    vec4 t = texture2D(art, suv(q));
    float k = t.a >= 0.5 ? 1.0 - smoothstep(0.1, 0.2, lumaOf(skin) - lumaOf(t.rgb)) : 0.0;
    acc += t.rgb * k; ws += k;
  }
  return ws > 0.5 ? acc / ws : skin;
}
float eyeCov(vec2 p, vec2 c, float rx, float open, vec2 gz, float w) {
  vec2 q = p - c;
  float u = clamp(q.x / rx, -1.0, 1.0), sh = 1.0 - u * u;
  float outside = max(abs(q.x) - rx, 0.0);
  if (open < 0.14) {                        // closed: one lid line, curving down
    return cov(max(abs(q.y - rx * 0.2 * sh) * 0.9, outside), w * 1.3);
  }
  // an almond: a heavy upper lid, a light lower lid (not a ring), the iris a dark disc the lids cut off
  float up = -open * rx * 0.5 * pow(sh, 0.85), lo = open * rx * 0.3 * sh;
  float lidU = cov(max(abs(q.y - up) * 0.9, outside), w * 1.7);
  float lidL = cov(max(abs(q.y - lo) * 0.9, outside * 1.0), w * 0.7) * smoothstep(0.0, 0.25, open);
  float inside = step(up, q.y) * step(q.y, lo) * step(abs(q.x), rx);
  vec2 pc = vec2(clamp(gz.x, -rx * 0.32, rx * 0.32), clamp(gz.y, -1.5, 1.5));
  float iris = cov(length(q - pc - vec2(0.0, -0.05 * rx)) - min(rx * 0.36, open * rx * 0.5), 0.0) * inside;
  return max(max(lidU, lidL), iris);
}
float browCov(vec2 p, vec2 c, float L, float ang, float lift, float w) {
  float sn = sin(ang), cs = cos(ang);
  vec2 outer = c + vec2(-cs * L, sn * L - lift), inner = c + vec2(cs * L, -sn * L - lift);
  vec2 ba = inner - outer;
  float t = clamp(dot(p - outer, ba) / dot(ba, ba), 0.0, 1.0);
  vec2 q = p - vec2(0.0, -0.09 * L * (1.0 - pow(2.0 * t - 1.0, 2.0)));
  return cov(sdSeg(q, outer, inner), w * (0.9 + 0.5 * t));
}
vec2 mouthCov(vec2 p, vec2 c, float hw, float curve, float open, float skew, float w) {
  vec2 q = p - c;
  float ua = clamp(q.x / hw, -1.0, 1.0), shape = 1.0 - ua * ua;
  float yu = curve * shape + skew * ua * 0.6;
  float yl = yu + open * pow(max(shape, 0.0), 0.7);
  float outside = max(abs(q.x) - hw, 0.0);
  float line = cov(max(abs(q.y - yu) * 0.9, outside), w * 1.1);
  float fill = 0.0;
  if (open > 0.4) {
    line = max(line, cov(max(abs(q.y - yl) * 0.9, outside), w * 0.9));
    fill = step(yu, q.y) * step(q.y, yl) * step(abs(q.x), hw);
  }
  return vec2(line, fill);
}
void main() {
  vec2 p = vec2(vUV.x * quadSize.x, (1.0 - vUV.y) * quadSize.y);
  vec4 base = texture2D(art, suv(p));
  float inHead = base.a >= 0.5 ? 1.0 : 0.0;          // nothing leaks into the air around the head
  float w = stroke * s * 0.5;
  float ink = max(eyeCov(p, eyeN, 7.6 * s, eyeP.x, eyeP.zw * s, w), eyeCov(p, eyeF, 3.6 * s, eyeP.y, eyeP.zw * s * 0.6, w * 0.9));
  float L = 11.0 * s * browP.z;
  ink = max(ink, browCov(p, browN, L, browP.x, browP.y * s, w));
  ink = max(ink, browCov(p, browF, L * 0.42, browP.x * 0.6, (browP.y + browP.w) * s, w * 0.9));
  vec2 m = mouthCov(p, mouthC, mouthP.z * s, mouthP.x * s, mouthP.y * s, mouthP.w * s, w);
  ink = max(ink, m.x);
  // the wipe: the painted features (dark pixels inside these ellipses) go to the local skin colour
  float we = max(1.0 - smoothstep(0.8, 1.0, ell(p, (eyeN + browN) * 0.5 + vec2(1.0, 0.0), vec2(17.0, 14.0) * s)),
                 1.0 - smoothstep(0.8, 1.0, ell(p, eyeF + vec2(0.0, -2.0), vec2(9.0, 11.0) * s)));
  float wm = 1.0 - smoothstep(0.8, 1.0, ell(p, mouthC, vec2(14.0, 7.0) * s));
  float wipe = max(we, wm) * darkPooled(p);
  vec3 col = wipe > 0.01 ? localSkin(p) : skin;
  col = mix(col, vec3(0.36, 0.15, 0.14), m.y * 0.9);
  col = mix(col, vec3(0.09, 0.07, 0.06), ink);                       // the stroke is ink
  col = lineByDepth(gradeOf(col), ink, lineFade, haze, lineBrown, hazeTint);
  vec2 gp = vec2((spriteOrg + p).x, spriteSize.y - (spriteOrg + p).y);
  col = paperOn(col, gp, paper, grain, patches, wash, washColour);
  float a = max(wipe, max(ink, m.y)) * inHead;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), a);
}`
// emotes: small ink marks near the head, off by default
Effect.ShadersStore.puppetEmoteFragmentShader = `${COMMON}
uniform float kind; uniform float amount; uniform float stroke;
void main() {
  vec2 p = vUV * vec2(44.0, 44.0); p.y = 44.0 - p.y;
  vec2 c = vec2(22.0, 22.0), q = p - c;
  float w = stroke * 0.5 + 0.35, ink = 0.0, fill = 0.0;
  if (kind < 1.5) {                                   // a sweat drop
    float ring = abs(length(p - vec2(22.0, 28.0)) - 5.5);
    float tail = min(sdSeg(p, vec2(22.0, 12.0), vec2(17.6, 24.0)), sdSeg(p, vec2(22.0, 12.0), vec2(26.4, 24.0)));
    ink = cov(min(ring, tail), w);
    fill = (length(p - vec2(22.0, 28.0)) < 5.5 ? 1.0 : 0.0) * 0.55;
  } else if (kind < 2.5) {                            // !
    ink = max(cov(sdSeg(p, vec2(22.0, 7.0), vec2(22.0, 26.0)), 2.1), cov(length(p - vec2(22.0, 33.0)), 2.6));
  } else if (kind < 3.5) {                            // ?
    float r = length(p - vec2(22.0, 15.0));
    float arc = (p.y < 17.0 || p.x > 22.0) ? abs(r - 7.5) : 99.0;
    ink = max(cov(min(arc, sdSeg(p, vec2(26.0, 21.0), vec2(22.0, 26.0))), 1.9), cov(length(p - vec2(22.0, 33.0)), 2.6));
  } else {                                            // a sparkle
    vec2 a = abs(q);
    float d = (pow(a.x, 0.5) + pow(a.y, 0.5) - 3.1) * 1.4;
    vec2 b = abs(q - vec2(10.0, -9.0));
    float d2 = (pow(b.x, 0.5) + pow(b.y, 0.5) - 1.7) * 0.9;
    ink = max(cov(abs(d), w), cov(abs(d2), w));
    fill = (d < 0.0 ? 1.0 : 0.0) * 0.4;
  }
  vec3 col = mix(vec3(0.97, 0.94, 0.88), vec3(0.75, 0.84, 0.9), kind < 1.5 ? 1.0 : 0.0);   // the mark's own fill (paper, or a blue drop)
  col = mix(col, vec3(0.09, 0.07, 0.06), ink);                                              // then the ink
  col = lineByDepth(gradeOf(col), ink, lineFade, haze, lineBrown, hazeTint);
  float a = max(ink, fill) * amount;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), a);
}`

const FACE_UNIFORMS = ['worldViewProjection', 'quadSize', 'spriteSize', 'spriteOrg', 'eyeN', 'eyeF', 'browN', 'browF', 'mouthC', 'eyeP', 'browP', 'mouthP', 'skin', 'stroke', 's',
  'grade', 'lineFade', 'haze', 'lineBrown', 'hazeTint', 'paper', 'grain', 'patches', 'wash', 'washColour']
const EMOTE_UNIFORMS = ['worldViewProjection', 'kind', 'amount', 'stroke', 'grade', 'lineFade', 'haze', 'lineBrown', 'hazeTint', 'paper', 'grain', 'patches', 'wash', 'washColour']
const KIND: Record<string, number> = { sweat: 1, exclaim: 2, question: 3, sparkle: 4 }
const DEG = Math.PI / 180

function quad(scene: Scene, name: string, parent: TransformNode): Mesh {
  const mesh = new Mesh(name, scene)
  const vd = new VertexData()
  vd.positions = new Float32Array(12)
  vd.indices = [0, 2, 1, 1, 2, 3]
  vd.uvs = [0, 1, 1, 1, 0, 0, 1, 0]
  vd.applyToMesh(mesh, true)
  mesh.parent = parent
  mesh.isPickable = false
  mesh.alwaysSelectAsActiveMesh = true
  mesh.metadata = { noGBuffer: true }
  return mesh
}
function setCorners(mesh: Mesh, c: P2[], z: number, out = new Float32Array(12)) {
  c.forEach((p, i) => { out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = z })
  mesh.updateVerticesData(VertexBuffer.PositionKind, out)
}

/** The drawn face on one painted figure: a quad (and an emote quad) that follow the head's deformation. */
export class FaceRig {
  readonly face: Mesh; readonly emote: Mesh
  private fm: ShaderMaterial; private em: ShaderMaterial
  private emoteAmount = 0; private emoteName: EmotionDef['emote'] = undefined; private emoteWant = false
  constructor(scene: Scene, readonly name: string, parent: TransformNode) {
    this.face = quad(scene, `${name}_face`, parent)
    this.emote = quad(scene, `${name}_emote`, parent)
    this.fm = new ShaderMaterial(`${name}_face`, scene, 'puppetFace', { attributes: ['position', 'uv'], samplers: ['art'], uniforms: FACE_UNIFORMS, needAlphaBlending: true })
    this.em = new ShaderMaterial(`${name}_emote`, scene, 'puppetEmote', { attributes: ['position', 'uv'], samplers: [], uniforms: EMOTE_UNIFORMS, needAlphaBlending: true })
    for (const [m, mat] of [[this.face, this.fm], [this.emote, this.em]] as const) {
      mat.backFaceCulling = false
      mat.disableDepthWrite = true
      mat.setVector3('grade', new Vector3(1, 1, 0)).setFloat('lineFade', 0).setFloat('haze', 0).setFloat('lineBrown', 0).setVector3('hazeTint', new Vector3(1, 1, 1))
      mat.setFloat('paper', 0).setFloat('grain', 0).setFloat('patches', 0).setFloat('wash', 0).setVector3('washColour', new Vector3(1, 1, 1))
      m.material = mat
    }
    this.emote.setEnabled(false)
    this.face.setEnabled(false)
  }
  /** the visible emote's opacity eases in and out (the puppet calls step each frame) */
  setEmote(name: EmotionDef['emote'], want: boolean, dt: number) {
    this.emoteName = name ?? this.emoteName
    this.emoteWant = want && !!name
    this.emoteAmount = clamp(this.emoteAmount + (this.emoteWant ? dt / 0.18 : -dt / 0.25), 0, 1)
    this.emote.setEnabled(this.emoteAmount > 0.01 && !!this.emoteName)
    if (this.emoteName) this.em.setFloat('kind', KIND[this.emoteName]).setFloat('amount', easeInOut(this.emoteAmount)).setFloat('stroke', LIFE.strokePx)
  }
  /** place and draw: `world` maps a painting px to figure metres through the current deformation */
  place(mark: FaceMark, tex: Texture, sprite: { w: number; h: number }, p: FaceParams, world: (px: P2) => P2, z: number) {
    const s = mark.s
    const x0 = mark.eye[0] - 26 * s, x1 = mark.eye[0] + 34 * s, y0 = mark.eye[1] - 26 * s, y1 = mark.mouth[1] + 14 * s
    setCorners(this.face, [world([x0, y0]), world([x1, y0]), world([x0, y1]), world([x1, y1])], z)
    // emote: beside the head, up and to the nose side
    const ex = mark.eye[0] + 36 * s, ey = mark.eye[1] - 44 * s
    setCorners(this.emote, [world([ex - 22, ey - 22]), world([ex + 22, ey - 22]), world([ex - 22, ey + 22]), world([ex + 22, ey + 22])], z)
    const m = this.fm
    const rel = (q: P2): Vector2 => new Vector2(q[0] - x0, q[1] - y0)
    m.setTexture('art', tex)
    m.setVector2('quadSize', new Vector2(x1 - x0, y1 - y0)).setVector2('spriteSize', new Vector2(sprite.w, sprite.h)).setVector2('spriteOrg', new Vector2(x0, y0))
    m.setVector2('eyeN', rel(mark.eye)).setVector2('eyeF', rel(mark.eyeF)).setVector2('browN', rel(mark.brow)).setVector2('browF', rel([mark.brow[0] + 18 * s, mark.brow[1] + 3 * s])).setVector2('mouthC', rel(mark.mouth))
    m.setVector4('eyeP', new Vector4(p.eyeOpen, p.eyeOpenF, p.gaze[0], p.gaze[1]))
    m.setVector4('browP', new Vector4(p.brow[0] * DEG, p.brow[1], p.brow[2], p.brow[3]))
    m.setVector4('mouthP', new Vector4(p.mouth[0], p.mouth[1], p.mouth[2], p.mouth[3]))
    m.setVector3('skin', new Vector3(...mark.skin)).setFloat('stroke', LIFE.strokePx).setFloat('s', s)
    this.face.setEnabled(true)
  }
  emoteState() { return { name: this.emoteName, amount: this.emoteAmount, want: this.emoteWant } }
  hide() { this.face.setEnabled(false); this.emote.setEnabled(false) }
  dispose() { this.face.dispose(false, true); this.emote.dispose(false, true) }
}
