import { describe, it, expect } from 'vitest'
import { normalizeSplit, sceneMode, splitLayout, splitStrokes, focusPosition, panFocus, wheelZoom, normalizeFocus, LAYOUTS, paneCount, moveDivider, stepDivider, MIN_SHARE } from '../split-layout.js'
import { panelForLine, inkPath } from '../SplitStage.js'

describe('normalizeSplit', () => {
  it('reads every layout and clamps its dividers', () => {
    expect(normalizeSplit({ layout: 'cols3', at: [0.3, 0.7] })).toEqual({ layout: 'cols3', at: [0.3, 0.7] })
    expect(normalizeSplit({ layout: 'grid4', at: [0.05, 0.99] })).toEqual({ layout: 'grid4', at: [MIN_SHARE, 1 - MIN_SHARE] })
  })

  // The first split stored { dir, at }: a scene made then renders exactly as it did.
  it('reads the old horizontal / vertical split as two rows / two columns', () => {
    expect(normalizeSplit({ dir: 'h', at: 0.4 })).toEqual({ layout: 'rows2', at: [0.4] })
    expect(normalizeSplit({ dir: 'v', at: 0.61 })).toEqual({ layout: 'cols2', at: [0.61] })
  })

  it('fills missing dividers with the layout default', () => {
    expect(normalizeSplit({ layout: 'rows3' })).toEqual({ layout: 'rows3', at: [0.333, 0.667] })
    expect(normalizeSplit({ layout: 'nonsense' })).toEqual({ layout: 'rows2', at: [0.5] })
  })

  it('never lets two dividers along one axis cross or crowd', () => {
    expect(normalizeSplit({ layout: 'rows3', at: [0.7, 0.6] })).toEqual({ layout: 'rows3', at: [0.6, 0.8] })
  })

  it('is no split at all without the key', () => {
    expect(normalizeSplit(null)).toBeNull()
    expect(normalizeSplit(undefined)).toBeNull()
    expect(normalizeSplit('h')).toBeNull()
  })

  it('knows how many panels each layout has', () => {
    expect(Object.fromEntries(Object.keys(LAYOUTS).map(k => [k, paneCount({ layout: k })]))).toEqual({
      rows2: 2, cols2: 2, diag: 2, l1r2: 3, rows3: 3, cols3: 3, l2r1: 3, t1b2: 3, grid4: 4,
    })
    expect(paneCount(null)).toBe(0)
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
    expect(s.gutter).toBe(4)
    expect(s.ink).toBe(1)
  })
})

describe('splitLayout', () => {
  const W = 1920
  const H = 1080   // gutter 10 px at this width
  const lay = (layout, at) => splitLayout({ layout, at }, W, H)

  it('two rows: full width, the gutter between, outer edges bleed', () => {
    expect(lay('rows2', [0.5]).panels).toEqual([{ x: 0, y: 0, w: W, h: 535 }, { x: 0, y: 545, w: W, h: 535 }])
  })

  it('reads an old vertical split side by side at its position', () => {
    const l = splitLayout({ dir: 'v', at: 0.25 }, W, H)
    expect(l.panels).toEqual([{ x: 0, y: 0, w: 475, h: H }, { x: 485, y: 0, w: 1435, h: H }])
    expect(l.dividers).toEqual([{ k: 0, orient: 'v', x: 475, y: 0, w: 10, h: H }])
  })

  it('three columns: three panels, two gutters, two dividers', () => {
    const l = lay('cols3', [0.25, 0.75])
    expect(l.panels.map(p => [p.x, p.w])).toEqual([[0, 475], [485, 950], [1445, 475]])
    expect(l.dividers.map(d => [d.k, d.orient, d.x])).toEqual([[0, 'v', 475], [1, 'v', 1435]])
  })

  it('one left, two right: the second divider spans only the right column', () => {
    const l = lay('l1r2', [0.5, 0.5])
    expect(l.panels).toEqual([
      { x: 0, y: 0, w: 955, h: H },
      { x: 965, y: 0, w: 955, h: 535 },
      { x: 965, y: 545, w: 955, h: 535 },
    ])
    expect(l.dividers[1]).toEqual({ k: 1, orient: 'h', x: 965, y: 535, w: 955, h: 10 })
  })

  it('two left, one right, and one top, two bottom mirror it', () => {
    expect(lay('l2r1', [0.5, 0.5]).panels.map(p => [p.x, p.y])).toEqual([[0, 0], [0, 545], [965, 0]])
    expect(lay('t1b2', [0.5, 0.5]).panels.map(p => [p.x, p.y])).toEqual([[0, 0], [0, 545], [965, 545]])
  })

  it('four squares: one cross through the whole stage', () => {
    const l = lay('grid4', [0.5, 0.5])
    expect(l.panels.map(p => [p.x, p.y])).toEqual([[0, 0], [965, 0], [0, 545], [965, 545]])
    expect(l.dividers.map(d => [d.orient, d.w, d.h])).toEqual([['v', 10, H], ['h', W, 10]])
  })

  it('a diagonal: two clipped panels either side of one slanted line', () => {
    const l = lay('diag', [0.6, 0.4])
    expect(l.panels[0].clip).toEqual([[0, 0], [1147, 0], [763, H], [0, H]])
    expect(l.panels[1].clip).toEqual([[1157, 0], [W, 0], [W, H], [773, H]])
    expect(l.dividers).toEqual([{ k: 0, orient: 'd', x0: 1152, y0: 0, x1: 768, y1: H }])
  })

  it('stacks columns only on an upright stage (a phone held upright), so no panel is a sliver', () => {
    expect(splitLayout({ layout: 'cols3' }, 375, 667).layout).toBe('rows3')
    expect(splitLayout({ layout: 'cols2' }, 375, 667).layout).toBe('rows2')
    expect(splitLayout({ layout: 'grid4' }, 375, 667).layout).toBe('grid4')
  })

  // Bart, 2026-10-17: "the column layout is broken". The editor's 16:9 stage in a narrow window
  // (about 400x225) stacked his Two columns into rows while the inspector still said columns.
  it('keeps the chosen layout on a landscape stage of any width, as the inspector shows it', () => {
    for (const [w, h] of [[400, 225], [320, 180], [639, 360], [1920, 1080]]) {
      expect(splitLayout({ layout: 'cols2' }, w, h).layout).toBe('cols2')
      expect(splitLayout({ layout: 'cols3' }, w, h).layout).toBe('cols3')
      const p = splitLayout({ layout: 'cols2' }, w, h).panels
      expect(p[1].x).toBeGreaterThan(p[0].x)
      expect(p[1].y).toBe(p[0].y)
    }
  })

  it('has no layout without a split or a stage', () => {
    expect(splitLayout(null, W, H)).toBeNull()
    expect(splitLayout({ layout: 'rows2' }, 0, H)).toBeNull()
  })
})

describe('moveDivider: the divider follows the pointer', () => {
  const W = 1000
  const H = 500

  it('a column divider follows x, a row divider follows y', () => {
    expect(moveDivider({ layout: 'cols2' }, 0, 610, 0, W, H)).toEqual({ layout: 'cols2', at: [0.61] })
    expect(moveDivider({ layout: 'l1r2' }, 1, 0, 150, W, H)).toEqual({ layout: 'l1r2', at: [0.5, 0.3] })
  })

  it('snaps to its default when close, and stays inside the stage', () => {
    expect(moveDivider({ layout: 'cols2' }, 0, 508, 0, W, H).at).toEqual([0.5])
    expect(moveDivider({ layout: 'cols2' }, 0, 10, 0, W, H).at).toEqual([MIN_SHARE])
  })

  it('cannot push a divider through its neighbour', () => {
    expect(moveDivider({ layout: 'cols3', at: [0.3, 0.6] }, 0, 900, 0, W, H).at).toEqual([0.6, 0.8])
  })

  it('a diagonal moves as a whole', () => {
    expect(moveDivider({ layout: 'diag', at: [0.6, 0.4] }, 0, 0, 0, W, H, { dx: 100 }).at).toEqual([0.7, 0.5])
    expect(moveDivider({ layout: 'diag', at: [0.6, 0.4] }, 0, 0, 0, W, H, { dx: 900 }).at).toEqual([0.8, 0.6])
  })

  it('arrow keys step one divider, a diagonal both ends', () => {
    expect(stepDivider({ layout: 'grid4', at: [0.5, 0.5] }, 1, 0.01).at).toEqual([0.5, 0.51])
    expect(stepDivider({ layout: 'diag', at: [0.6, 0.4] }, 0, -0.05).at).toEqual([0.55, 0.35])
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

  it('keeps a balloon added in the editor in the panel it was put in', () => {
    expect(panelForLine({ figure: null, panel: 1 }, panels)).toBe(1)
    expect(panelForLine({ figure: { asset_id: 3 }, panel: 0 }, panels)).toBe(0)
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

// Bart 2026-10-16: the divider on the stage is the Position setting; the panes pan and zoom by hand.
describe('panFocus', () => {
  it('a drag to the right shows more of the left of the picture', () => {
    expect(panFocus({ x: 50, y: 50 }, 100, 0, 1000, 500)).toEqual({ x: 40, y: 50 })
  })
  it('a drag down shows more of the top', () => {
    expect(panFocus({ x: 50, y: 50 }, 0, 50, 1000, 500)).toEqual({ x: 50, y: 40 })
  })
  it('keeps the zoom and never leaves 0..100', () => {
    expect(panFocus({ x: 5, y: 95, zoom: 2 }, 500, -500, 1000, 500)).toEqual({ x: 0, y: 100, zoom: 2 })
  })
})

describe('wheelZoom', () => {
  it('wheel up zooms in, wheel down zooms out', () => {
    expect(wheelZoom(1, -100)).toBeGreaterThan(1)
    expect(wheelZoom(2, 100)).toBeLessThan(2)
  })
  it('never below the plain crop or past 4x', () => {
    expect(wheelZoom(1, 1000)).toBe(1)
    expect(wheelZoom(3.9, -5000)).toBe(4)
  })
})

describe('normalizeFocus', () => {
  it('defaults to the middle and no zoom', () => {
    expect(normalizeFocus(null)).toEqual({ x: 50, y: 50, zoom: 1 })
    expect(normalizeFocus({ x: 30, zoom: 9 })).toEqual({ x: 30, y: 50, zoom: 4 })
  })
})
