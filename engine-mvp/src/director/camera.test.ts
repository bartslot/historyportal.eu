// Camera work you can see (Bart, 2026-11-12: "Why no camera work?"): the writer's move wins, a hold is still, and
// every other move still travels far enough to read on a classroom board after the speaker and bust holds.
import { describe, expect, it } from 'vitest'
import { FG_CLEARANCE, MIN_LENS_DEG, MIN_TRAVEL_M, PLAIN_MOVES, makeCamera, nearestZ, travels, type ShotScale } from './camera'
import { BUST_CAM, BUST_FIT, bustFit, frameEdges } from './speaker'
import { direct } from './direct'
import { LESSON, LIBRARY } from './fixture'
import type { Beat, Camera, Lesson, MoveKind, Scene } from './types'

const shots = (s: Scene) => [s.camera, ...(s.camera_more ?? [])].filter(Boolean) as Camera[]
const ask = (asks: Record<string, unknown>): Lesson => ({ ...LESSON, scenes: LESSON.scenes.map((s) => (s.id in asks ? { ...s, camera: asks[s.id] as Camera } : s)) })

// a speaker at fg (figures.ts puts the speaker there), drawn 1.7 m, with a mid layer behind
const standing = (beat: Beat): Scene => ({
  id: 's', beat, narration: 'x', camera: null, sound: null,
  set: { layers: [{ need: 'hut', depth: 'mid', x: 0.6 }, { need: 'char:opa pose:stand', depth: 'fg', x: 0.4, figure: 'opa' }] },
  figures: [{ char: 'opa', pose: 'stand', depth: 'fg', x: 0.4, h_m: 1.7 }],
})
// a comic close-up: a bust on the near plane, sized from the house camera
const BUST_H = 0.53
const bust = (beat: Beat): Scene => ({
  id: 'b', beat, narration: 'x', camera: null, sound: null,
  set: { layers: [{ need: 'hut', depth: 'mid', x: 0.6 }, { need: 'char:opa pose:bust', depth: 'near', x: 0.47, figure: 'opa' }] },
  figures: [{ char: 'opa', pose: 'bust', depth: 'near', x: 0.47, h_m: BUST_H }],
})

describe("the writer's move wins", () => {
  it('a scene that asks for a move gets it on its first shot, track meaning truck, and a re-run keeps it', () => {
    const d = direct(ask({ sc03: { move: 'tilt' }, sc04: { move: 'track' } }), LIBRARY)
    const [s3, s4] = [d.scenes[2], d.scenes[3]]
    expect(s3.camera).toMatchObject({ move: 'tilt', asked: true })
    expect(s4.camera).toMatchObject({ move: 'truck', asked: true })
    const again = direct(d, LIBRARY)
    expect(again.scenes[2].camera).toEqual(s3.camera)
    expect(again.scenes[3].camera).toEqual(s4.camera)
  })

  it('without an ask the director picks, and marks nothing as asked', () => {
    const d = direct(LESSON, LIBRARY)
    expect(d.scenes[2].camera!.asked).toBeUndefined()
  })

  it('a hold is a still camera: every shot of the scene, from == to', () => {
    const d = direct(ask({ sc04: { move: 'hold' } }), LIBRARY)
    for (const c of shots(d.scenes[3])) {
      expect(c.move).toBe('hold')
      expect(c.to).toEqual(c.from)
    }
  })

  it('never the same move three scenes in a row, unless the writer asked for it', () => {
    const d = direct(ask({ sc03: { move: 'push' } }), LIBRARY)
    expect(shots(d.scenes[1]).at(-1)!.move).not.toBe('push')
    expect(d.scenes[3].camera!.move).not.toBe('push')
    const asked = direct(ask({ sc02: { move: 'push' }, sc03: { move: 'push' }, sc04: { move: 'push' } }), LIBRARY)
    expect(asked.scenes.slice(1, 4).map((s) => s.camera!.move)).toEqual(['push', 'push', 'push'])
  })
})

describe('every move reads on the board', () => {
  const MOVES: MoveKind[] = [...PLAIN_MOVES, 'through']
  const BEATS: Beat[] = ['setup', 'cause', 'climax', 'recap']
  const reads = (c: Camera) =>
    Math.abs(c.to.z - c.from.z) >= MIN_TRAVEL_M || Math.abs(c.to.x - c.from.x) >= MIN_TRAVEL_M || Math.abs(c.to.fov - c.from.fov) >= MIN_LENS_DEG

  for (const scale of ['medium', 'wide'] as ShotScale[]) {
    it(`a ${scale} shot of a standing speaker: travel, and never through the foreground except the native move`, () => {
      for (const beat of BEATS) for (const move of MOVES) {
        const scene = standing(beat)
        const c = makeCamera(scene, move, 0, 8, { scale })
        expect(reads(c), `${beat} ${move} ${JSON.stringify([c.from, c.to])}`).toBe(true)
        if (move !== 'through') expect(Math.max(c.from.z, c.to.z)).toBeLessThanOrEqual(nearestZ(scene) - FG_CLEARANCE + 1e-9)
      }
    })
  }

  it('a bust close-up travels on the lens; the chest edge never shows and the head stays in frame', () => {
    const sized = bustFit(BUST_H, 3.5, BUST_FIT.close)
    const headTop = sized.y + BUST_H * sized.scale
    for (const beat of BEATS) for (const move of MOVES) {
      const c = makeCamera(bust(beat), move, 0, 8, { scale: 'close' })
      expect(travels(c), `${beat} ${move}`).toBe(true)
      for (const p of [c.from, c.to]) {
        expect(frameEdges(3.5, p).bottom).toBeGreaterThanOrEqual(frameEdges(3.5, BUST_CAM).bottom - 1e-9)
        expect(frameEdges(3.5, p).top).toBeGreaterThan(headTop)
      }
    }
  })

  it('a still bust shot sits on the pose the bust was sized from', () => {
    const c = makeCamera(bust('turn'), 'hold', 0, 6, { scale: 'close' })
    expect(c.from).toEqual(c.to)
    expect(c.from).toMatchObject({ x: BUST_CAM.x, y: BUST_CAM.y, z: BUST_CAM.z, fov: BUST_CAM.fov })
  })

  it('every shot of a directed lesson reads, except a hold', () => {
    const d = direct(ask({ sc05: { move: 'hold' } }), LIBRARY)
    for (const c of d.scenes.flatMap(shots)) if (c.move !== 'hold') expect(reads(c), `${c.move}`).toBe(true)
  })
})
