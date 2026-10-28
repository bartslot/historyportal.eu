// The living faces, through the real entry point (createPuppet, warnings captured) and the real cut paintings.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NullEngine, Scene, VertexBuffer } from '@babylonjs/core'
import { afterEach, describe, expect, it } from 'vitest'
import { EMOTIONS, EMOTION_NAMES, FaceLife, FaceRig, LIFE, easeInOut, type FaceMeta } from './face'
import { CHARACTERS, applyFigure, bodyDeform, createPuppet, type Sprite } from './puppet'

const PUBLIC = join(__dirname, '../../public')
const loadSheet = async (url: string) => JSON.parse(readFileSync(join(PUBLIC, url), 'utf8'))
const DEFAULTS = { ...LIFE }
afterEach(() => Object.assign(LIFE, DEFAULTS))

async function make(id = 'boer-vrouw') {
  const warnings: string[] = []
  const scene = new Scene(new NullEngine())
  const p = await createPuppet(scene, id, { loadSheet, warn: (m) => warnings.push(m) })
  return { scene, p, warnings }
}
const faceMeta = () => JSON.parse(readFileSync(join(PUBLIC, 'figures/puppets/boer-vrouw/34/face/face.json'), 'utf8')) as FaceMeta
const sheet = () => JSON.parse(readFileSync(join(PUBLIC, 'figures/puppets/boer-vrouw/34/poses.json'), 'utf8')) as { poses: Record<string, Sprite> }

describe('emotions', () => {
  it('has at least the lesson set plus sad, angry, determined, thinking, scared, proud', () => {
    for (const e of ['neutral', 'happy', 'worried', 'surprised', 'sad', 'angry', 'determined', 'thinking', 'scared', 'proud']) expect(EMOTION_NAMES).toContain(e)
  })
  it('keeps every shape in a drawable range (eyes, brows, mouth, body offsets)', () => {
    for (const [n, e] of Object.entries(EMOTIONS)) {
      expect(e.eyeOpen, n).toBeGreaterThanOrEqual(0.4); expect(e.eyeOpen, n).toBeLessThanOrEqual(1.5)
      expect(Math.abs(e.brow[0]), n).toBeLessThanOrEqual(20)
      expect(e.mouth[2], n).toBeGreaterThan(3); expect(e.mouth[1], n).toBeLessThanOrEqual(6)
      expect(Math.abs(e.lean), n).toBeLessThanOrEqual(3.5); expect(Math.abs(e.tilt), n).toBeLessThanOrEqual(6); expect(Math.abs(e.shoulder), n).toBeLessThanOrEqual(0.03)
    }
  })
  it('eases in over LIFE.emoMs, never linearly', async () => {
    LIFE.on = 0
    const { p } = await make()
    p.setEmotion('surprised', 200)
    const from = p.faceState().params.eyeOpen
    p.advance(0.05) // a quarter of the way in time
    const quarter = p.faceState().params.eyeOpen
    const to = EMOTIONS.surprised.eyeOpen
    expect((quarter - from) / (to - from)).toBeLessThan(0.15) // eased in: 4t^3 = 0.0625, linear would be 0.25
    p.advance(0.3)
    expect(p.faceState().params.eyeOpen).toBeCloseTo(to, 3)
    expect(easeInOut(0.5)).toBeCloseTo(0.5)
  })
  it('the lesson expression drives the emotion (setExpression), and keyframes follow a clock', async () => {
    LIFE.on = 0
    const { p } = await make()
    p.setExpression('worried')
    expect(p.emotion()).toBe('worried')
    let now = 0
    p.setEmotionKeys([{ t: 1, emotion: 'happy' }, { t: 3, emotion: 'sad' }], () => now)
    p.advance(0.01); expect(p.emotion()).toBe('worried')
    now = 1.5; p.advance(0.01); expect(p.emotion()).toBe('happy')
    now = 3.2; p.advance(0.01); expect(p.emotion()).toBe('sad')
  })
})

describe('idle life', () => {
  const run = (seed: number, seconds: number, walking = false) => {
    const l = new FaceLife(seed)
    const blinkStarts: number[] = [], scaleY: number[] = [], leans: number[] = []
    let t = 0, was = 0
    for (let i = 0; i < seconds * 60; i++) {
      const o = l.step(1 / 60, walking); t += 1 / 60
      if (was < 0.2 && o.blink >= 0.2) blinkStarts.push(t)
      was = o.blink; scaleY.push(o.body.scaleY); leans.push(o.body.lean)
    }
    return { blinkStarts, scaleY, leans }
  }
  it('blinks every 2-6 s (a double blink within 0.3 s counts once), eyes fully closed at the peak', () => {
    const { blinkStarts } = run(7, 60)
    const gaps = blinkStarts.slice(1).map((v, i) => v - blinkStarts[i]).filter((g) => g > 0.3)
    expect(gaps.length).toBeGreaterThan(8)
    for (const g of gaps) { expect(g).toBeGreaterThan(1.6); expect(g).toBeLessThan(6.6) }
    const l = new FaceLife(7); let peak = 0
    for (let i = 0; i < 60 * 12; i++) peak = Math.max(peak, l.step(1 / 60).blink)
    expect(peak).toBeGreaterThan(0.95)
  })
  it('breathes about 2 % peak to peak at 0.25 Hz', () => {
    const { scaleY } = run(3, 8)
    const range = Math.max(...scaleY) - Math.min(...scaleY)
    expect(range).toBeGreaterThan(0.017); expect(range).toBeLessThan(0.023)
  })
  it('shifts weight every 4-8 s', () => {
    const { leans } = run(11, 40)
    expect(Math.max(...leans) - Math.min(...leans)).toBeGreaterThan(0.5)
  })
  it('is seeded: the same seed repeats, two figures never move in sync', () => {
    expect(run(5, 20).blinkStarts).toEqual(run(5, 20).blinkStarts)
    expect(run(5, 20).blinkStarts).not.toEqual(run(6, 20).blinkStarts)
  })
  it('walking keeps only a share of the weight shift', () => {
    const still = run(11, 40), walking = run(11, 40, true)
    expect(Math.max(...walking.leans.map(Math.abs))).toBeLessThan(Math.max(...still.leans.map(Math.abs)))
  })
  it('is off when LIFE.on is 0 (no blink, no breath)', () => {
    LIFE.on = 0
    const l = new FaceLife(1); let blink = 0, dy = 0
    for (let i = 0; i < 600; i++) { const o = l.step(1 / 60); blink = Math.max(blink, o.blink); dy = Math.max(dy, Math.abs(o.body.scaleY - 1)) }
    expect(blink).toBe(0); expect(dy).toBe(0)
  })
})

describe('the drawn face on the painted figure (createPuppet)', () => {
  it('two figures of one character get different seeds', async () => {
    const a = await make(), b = await make()
    expect(a.p.faceState().seed).not.toBe(b.p.faceState().seed)
  })
  it('every painting has detected face landmarks that sit on the head (eye above mouth, mouth 28-42 px below the eye at s=1)', () => {
    for (const [slot, sp] of Object.entries(sheet().poses)) {
      const f = (sp as Sprite).face!
      expect(f, slot).toBeTruthy()
      expect(f.mouth[1] - f.eye[1], slot).toBeGreaterThan(28 * f.s * 0.8); expect(f.mouth[1] - f.eye[1], slot).toBeLessThan(42 * f.s * 1.2)
      expect(f.eye[1], slot).toBeLessThan(sp.h * 0.12)
    }
  })
  it('shows the face in 3/4 and hides it cleanly in side (the head-swap path)', async () => {
    const { p, scene } = await make()
    p.setPose('stand'); p.setView('34'); p.advance(0.02)
    expect(scene.getMeshByName('boer-vrouw_face')!.isEnabled()).toBe(true)
    p.setView('side'); p.advance(0.02)
    expect(scene.getMeshByName('boer-vrouw_face')!.isEnabled()).toBe(false)
  })
  it('the eyes stay on the head through a lean and a head tilt (the face quad follows the same deformation)', async () => {
    LIFE.on = 0
    const { p, scene } = await make()
    p.setPose('stand'); p.setView('34')
    const sp = sheet().poses.stand as Sprite, s = sp.m_per_px * (CHARACTERS['boer-vrouw'].height / 1.7) // the puppet's px -> metres
    for (const e of ['thinking', 'angry', 'scared', 'tired']) {
      p.setEmotion(e, 1); p.advance(1)
      const o = p.faceState().body
      const deform = bodyDeform(sp, s, o)
      const want = deform(sp.face!.eye)
      const pos = scene.getMeshByName('boer-vrouw_face')!.getVerticesData(VertexBuffer.PositionKind)!
      const f = sp.face!
      const [x0, y0, x1, y1] = FaceRig.rect(faceMeta()) // stand is the reference painting: the similarity is the identity
      const u = (f.eye[0] - x0) / (x1 - x0), v = (f.eye[1] - y0) / (y1 - y0) // bilinear fraction inside the quad
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t
      const at = (k: number) => [pos[k * 3], pos[k * 3 + 1]]
      const top = [lerp(at(0)[0], at(1)[0], u), lerp(at(0)[1], at(1)[1], u)], bot = [lerp(at(2)[0], at(3)[0], u), lerp(at(2)[1], at(3)[1], u)]
      const got = [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)]
      expect(Math.hypot(got[0] - want[0], got[1] - want[1]), e).toBeLessThan(0.006) // within 6 mm on a 1.7 m figure
    }
  })
  it('emotes stay off by default and show only when LIFE.emotes is on', async () => {
    LIFE.on = 0
    const { p, scene } = await make()
    p.setPose('stand'); p.setEmotion('surprised', 1); p.advance(1)
    expect(scene.getMeshByName('boer-vrouw_emote')!.isEnabled()).toBe(false)
    LIFE.emotes = 1; p.advance(0.5)
    expect(scene.getMeshByName('boer-vrouw_emote')!.isEnabled()).toBe(true)
  })
  it('a mouth cycle runs only while talking', async () => {
    LIFE.on = 0
    const { p } = await make()
    p.setPose('stand'); p.advance(0.5)
    const closed = p.faceState().params.mouth[1]
    p.setTalking(true)
    const opens = Array.from({ length: 30 }, () => { p.advance(1 / 60); return p.faceState().params.mouth[1] })
    expect(Math.max(...opens)).toBeGreaterThan(closed + 1)
    p.setTalking(false); p.advance(1 / 60)
    expect(p.faceState().params.mouth[1]).toBeCloseTo(closed, 1)
  })

  it('the director hook sets pose, expression and placement from a lesson.json figure at shot start', async () => {
    LIFE.on = 0
    const { p } = await make()
    const got = applyFigure(p, { pose: 'point', expression: 'determined', x: 0.4, depth: 'fg', facing: 'left' })
    expect(got).toEqual({ pose: 'point', emotion: 'determined' })
    expect(p.pose).toBe('point')
    expect(applyFigure(p, { pose: 'dig', expression: 'nope', x: 0.4, depth: 'mid', facing: 'right' })).toEqual({ pose: 'stand', emotion: 'neutral' })
  })
})

describe('the painted face parts', () => {
  it('has a painted state for every emotion, a blink (half, closed) and the talking mouths', () => {
    const m = faceMeta()
    for (const e of EMOTION_NAMES) { expect(m.eyes.states, e).toContain(e); expect(m.mouth.states, e).toContain(e) }
    for (const st of ['half', 'closed']) expect(m.eyes.states).toContain(st)
    for (const st of ['talk_a', 'talk_ah', 'talk_wide']) expect(m.mouth.states).toContain(st)
  })
  it('changes the painted face behind a blink (half, closed = the swap, half, open), never a mix, mouth cut on the swap frame', () => {
    LIFE.on = 0
    const l = new FaceLife(7)
    l.setEmotion('sad', 200)
    const seen: string[] = [], mouths: string[] = []
    for (let i = 0; i < 20; i++) { const p = l.step(0.01).paint; expect(p.eyes[2]).toBe(0); expect(p.mouth[2]).toBe(0); seen.push(p.eyes[0]); mouths.push(p.mouth[0]) }
    expect(seen[0]).toBe('neutral'); expect(seen).toContain('half'); expect(seen).toContain('closed'); expect(seen[seen.length - 1]).toBe('sad')
    expect(seen.indexOf('closed')).toBeGreaterThan(seen.indexOf('half'))
    expect(mouths[0]).toBe('neutral'); expect(mouths[mouths.length - 1]).toBe('sad')
    const cut = mouths.indexOf('sad'); expect(seen[cut]).toBe('closed') // the mouth changes while the lids are shut
    expect(l.step(0.5).paint.eyes[0]).toBe('sad')
  })
  it('a plain blink runs open, half, closed and back', () => {
    LIFE.blinkMin = LIFE.blinkMax = 0.1; LIFE.blinkMs = 400; LIFE.doubleBlink = 0
    const l = new FaceLife(3)
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) seen.add(l.step(0.01).paint.eyes[0])
    expect(seen.has('half')).toBe(true); expect(seen.has('closed')).toBe(true)
  })
  it('walks the mouth through painted open states only while talking', () => {
    LIFE.on = 0
    const l = new FaceLife(5)
    expect(l.step(0.1).paint.mouth).toEqual(['neutral', 'neutral', 0])
    l.talking = true
    const used = new Set<string>()
    for (let i = 0; i < 120; i++) { const m = l.step(1 / 60).paint.mouth; used.add(m[0]) }
    expect([...used].some((n) => n.startsWith('talk_'))).toBe(true)
  })
})

