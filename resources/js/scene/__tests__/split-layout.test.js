import { describe, it, expect } from 'vitest'
import { normalizeSplit, sceneMode, splitLayout, splitStrokes, focusPosition, NARROW_PX } from '../split-layout.js'
import { panelForLine, inkPath } from '../SplitStage.js'

describe('normalizeSplit', () => {
  it('reads a stored split and clamps the position to 25-75 %', () => {
    expect(normalizeSplit({ dir: 'v', at: 0.6 })).toEqual({ dir: 'v', at: 0.6 })
    expect(normalizeSplit({ dir: 'h', at: 0.1 })).toEqual({ dir: 'h', at: 0.25 })
    expect(normalizeSplit({ dir: 'h', at: 0.99 })).toEqual({ dir: 'h', at: 0.75 })
  })

  it('defaults an unknown direction to stacked and a missing position to half', () => {
    expect(normalizeSplit({ dir: 'diagonal' })).toEqual({ dir: 'h', at: 0.5 })
  })

  it('is no split at all without the key', () => {
    expect(normalizeSplit(null)).toBeNull()
    expect(normalizeSplit(undefined)).toBeNull()
    expect(normalizeSplit('h')).toBeNull()
  })
})

describe('sceneMode: the retired view modes read as standard', () => {
  it.each([
    [{ slideshow_mode: 'parallax', parallax: true }],
    [{ slideshow_mode: 'drawing' }],
    [{ slideshow_mode: 'standard' }],
    [{}],
    [null],
  ])('%j is standard', (config) => {
    expect(sceneMode(config)).toBe('standard')
  })

  it('a split is a split, whatever an old mode key still says', () => {
    expect(sceneMode({ slideshow_mode: 'drawing', split: { dir: 'v', at: 0.5 } })).toBe('split')
  })
})

describe('splitStrokes: gutter and ink scale with the stage', () => {
  it('is 10 px gutter and 2 px ink at 1920', () => {
    expect(splitStrokes(1920)).toEqual({ gutter: 10, ink: 2 })
  })

  it('halves at 960', () => {
    expect(splitStrokes(960)).toEqual({ gutter: 5, ink: 1 })
  })

  it('never goes under a visible minimum on a phone', () => {
    const s = splitStrokes(375)
    expect(s.gutter).toBe(2)
    expect(s.ink).toBe(1)
  })
})

describe('splitLayout', () => {
  it('stacks a horizontal split: full width, gutter between, outer edges bleed', () => {
    const lay = splitLayout({ dir: 'h', at: 0.5 }, 1920, 1080)
    expect(lay.dir).toBe('h')
    expect(lay.panels[0]).toEqual({ x: 0, y: 0, w: 1920, h: 535 })
    expect(lay.panels[1]).toEqual({ x: 0, y: 545, w: 1920, h: 535 })
    expect(lay.panels[1].y - (lay.panels[0].y + lay.panels[0].h)).toBe(10)
  })

  it('puts a vertical split side by side at its position', () => {
    const lay = splitLayout({ dir: 'v', at: 0.25 }, 1920, 1080)
    expect(lay.dir).toBe('v')
    expect(lay.panels[0]).toEqual({ x: 0, y: 0, w: 475, h: 1080 })
    expect(lay.panels[1]).toEqual({ x: 485, y: 0, w: 1435, h: 1080 })
  })

  it('stacks a vertical split on a narrow stage, so neither panel is a sliver', () => {
    const lay = splitLayout({ dir: 'v', at: 0.5 }, 375, 812)
    expect(lay.dir).toBe('h')
    expect(lay.panels[0].w).toBe(375)
    expect(lay.panels[1].w).toBe(375)
    expect(splitLayout({ dir: 'v', at: 0.5 }, NARROW_PX, 400).dir).toBe('v')
  })

  it('keeps a horizontal split stacked on a phone held upright', () => {
    const lay = splitLayout({ dir: 'h', at: 0.5 }, 375, 812)
    expect(lay.dir).toBe('h')
    expect(lay.panels[0].h + lay.gutter + lay.panels[1].h).toBeCloseTo(812)
  })

  it('has no layout without a split or a stage', () => {
    expect(splitLayout(null, 1920, 1080)).toBeNull()
    expect(splitLayout({ dir: 'h' }, 0, 1080)).toBeNull()
  })
})

describe('focusPosition', () => {
  it('is the middle by default and clamps', () => {
    expect(focusPosition(null)).toBe('50% 50%')
    expect(focusPosition({ x: 20, y: 140 })).toBe('20% 100%')
  })
})

describe('panelForLine: a balloon goes to the panel holding its speaker', () => {
  const panels = [[{ asset_id: 1 }], [{ asset_id: 2 }, { asset_id: 3 }]]

  it('finds the speaker', () => {
    expect(panelForLine({ figure: { asset_id: 3 } }, panels)).toBe(1)
    expect(panelForLine({ figure: { asset_id: 1 } }, panels)).toBe(0)
  })

  it('sends off-frame and unknown speakers to the first panel', () => {
    expect(panelForLine({ figure: null }, panels)).toBe(0)
    expect(panelForLine({ figure: { asset_id: 99 } }, panels)).toBe(0)
  })
})

describe('inkPath', () => {
  it('starts and ends exactly on the edge and stays near it', () => {
    const d = inkPath(0, 5, 280, 5, 2, 7)
    expect(d.startsWith('M 0.00 5.00')).toBe(true)
    expect(d.endsWith('280.00 5.00')).toBe(true)
    const ys = [...d.matchAll(/[\d.]+ ([\d.]+)/g)].map(m => Number(m[1]))
    expect(Math.max(...ys.map(y => Math.abs(y - 5)))).toBeLessThanOrEqual(2 * 0.22)
  })

  it('is the same line every time for the same seed', () => {
    expect(inkPath(0, 0, 500, 0, 2, 3)).toBe(inkPath(0, 0, 500, 0, 2, 3))
  })
})
