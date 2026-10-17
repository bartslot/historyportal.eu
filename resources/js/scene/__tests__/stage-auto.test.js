import { describe, it, expect } from 'vitest'
import { stageAdvance, stageFloorMs, STAGE_FLOOR_MS, STAGE_TAIL_MS, STAGE_CEILING_MS } from '../stage-auto.js'

/**
 * A stage slide that asks nothing of the class (voyage landfall, gallery) moves on by itself
 * once its narration and look time are done. The Tasman gallery used to sit on its last image.
 */
describe('stage slide auto-advance', () => {
  it('waits for the voice, however long it runs, then a breath', () => {
    expect(stageAdvance({ elapsed: 30000, silentAt: null }).done).toBe(false)
    expect(stageAdvance({ elapsed: 30000, silentAt: 30000 }).done).toBe(false)
    expect(stageAdvance({ elapsed: 30000 + STAGE_TAIL_MS, silentAt: 30000 }).done).toBe(true)
  })

  it('keeps a short or silent slide up for the floor', () => {
    expect(stageAdvance({ elapsed: STAGE_FLOOR_MS - 1, silentAt: 0 }).done).toBe(false)
    expect(stageAdvance({ elapsed: STAGE_FLOOR_MS, silentAt: 0 }).done).toBe(true)
  })

  it('never strands the class on a track that never ends', () => {
    expect(stageAdvance({ elapsed: STAGE_CEILING_MS, silentAt: null }).done).toBe(true)
  })

  it('never shows a full bar while the voice is still going', () => {
    expect(stageAdvance({ elapsed: 60000, silentAt: null }).progress).toBeLessThan(1)
    expect(stageAdvance({ elapsed: STAGE_FLOOR_MS, silentAt: 0 }).progress).toBe(1)
  })

  it('a gallery shows every image once; the teacher Duration wins', () => {
    const images = ['a', 'b', 'c'].map((u) => ({ url: u }))
    expect(stageFloorMs({ kind: 'gallery', config: { images } })).toBe(15000)
    expect(stageFloorMs({ kind: 'gallery', config: { images: images.slice(0, 1) } })).toBe(STAGE_FLOOR_MS)
    expect(stageFloorMs({ kind: 'voyage', config: {} })).toBe(STAGE_FLOOR_MS)
    expect(stageFloorMs({ kind: 'gallery', config: { images, estimate_seconds: 90 } })).toBe(90000)
  })
})
