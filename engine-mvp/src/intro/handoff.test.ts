import { describe, expect, it } from 'vitest'
import { direct } from '../director/direct'
import { LESSON } from '../director/fixture'
import type { Library } from '../director/types'
import { schedule } from '../sound/schedule'
import { HANDOFF_AT_S, STAGE_ASPECT, introPlan, paintingLayout } from './handoff'

const LIB: Library = {
  bundle: 'nl-prehistory',
  assets: [
    { id: 'heath-far', layer: 'bg', tags: ['heath'], file: 'heath-far.webp', w: 4000, h: 1000, anchor: [0.5, 1] as [number, number], height_m: 30 },
    { id: 'tree-oak-01', layer: 'fg', tags: ['tree', 'oak'], file: 'tree-oak-01.webp', w: 1400, h: 1800, anchor: [0.5, 1] as [number, number], height_m: 14 },
  ],
}
const scene1 = { ...LESSON.scenes[0], set: { sky: 'sky-morning', layers: [
  { need: 'tree oak', asset: 'tree-oak-01', depth: 'fg' as const, x: 0.15 },
  { need: 'heath', asset: 'heath-far', depth: 'bg' as const, x: 0.5 },
  { need: 'hut', asset: null, depth: 'mid' as const, x: 0.6 },
] } }

describe('intro handoff', () => {
  it('builds the painting from scene 1, far to near, skipping unresolved layers', () => {
    const l = paintingLayout(scene1, LIB, '/library/nl-prehistory/')
    expect(l.map((x) => x.depth)).toEqual(['bg', 'fg'])
    expect(l[1].src).toBe('/library/nl-prehistory/tree-oak-01.webp')
  })

  it('stands each layer on its ground line with its anchor, nearer = bigger', () => {
    const [bg, fg] = paintingLayout(scene1, LIB, '')
    expect(fg.y + fg.h).toBeGreaterThan(bg.y + bg.h) // nearer ground sits lower in the frame
    expect(fg.x + fg.w / 2).toBeCloseTo(0.15, 5) // anchor x on the layer's x
    expect(fg.h / 14).toBeGreaterThan(bg.h / 30) // metres per frame grow with nearness
  })

  it('shares the stage aspect and hands off at the dive', () => {
    const p = introPlan({ ...LESSON, scenes: [scene1, ...LESSON.scenes.slice(1)] }, LIB)
    expect(p.aspect).toBe(STAGE_ASPECT)
    expect(p.handoff_at_s).toBe(HANDOFF_AT_S)
    expect(p.scene_id).toBe('sc01')
  })

  it('pre-rolls scene 1 ambience under the intro (J-cut out of the museum)', () => {
    const ev = schedule(direct(LESSON), 1.2)
    const wind = ev.find((e) => e.kind === 'bed-start' && e.id === 'heath-wind')!
    expect(wind.t).toBe(-1.2)
  })

  it('refuses a lesson without scenes', () => {
    expect(() => introPlan({ ...LESSON, scenes: [] }, LIB)).toThrow()
  })
})
