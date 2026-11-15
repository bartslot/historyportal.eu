import { describe, it, expect } from 'vitest'
import { layoutSpans } from '../slider.js'

describe('layoutSpans: voyage bars on the scrubber', () => {
  const at = { min: 1500, pxPerYear: 4 }

  it('places a bar from its first year to the end of its last, in strip px', () => {
    const [s] = layoutSpans([{ start: 1642, end: 1643, label: 'Abel Tasman' }], at)
    expect(s).toMatchObject({ x: 568, w: 8, lane: 0, showLabel: true })
  })

  it('stacks overlapping voyages into lanes and puts a crowded label in the second row and leaves it out when both are taken', () => {
    const out = layoutSpans([
      { start: 1642, end: 1643, label: 'Abel Tasman' },
      { start: 1644, end: 1644, label: 'Abel Tasman: the second voyage' },
      { start: 1642, end: 1660, label: 'Overlapping' },
      { start: 1645, end: 1646, label: 'Third' },
    ], at)
    const byLabel = Object.fromEntries(out.map((s) => [s.label, s]))
    expect(byLabel['Abel Tasman'].lane).toBe(0)
    expect(byLabel['Overlapping'].lane).toBe(1)                     // starts while lane 0 is still busy
    expect(byLabel['Abel Tasman: the second voyage'].lane).toBe(0)  // lane 0 is free again after 1643
    expect(byLabel['Overlapping']).toMatchObject({ showLabel: true, labelRow: 1 })   // row 0 has "Abel Tasman"
    expect(byLabel['Third'].showLabel).toBe(false)   // both label rows are still taken at 1645
  })

  it('leaves the input untouched', () => {
    const spans = [{ start: 1700, end: 1701, label: 'x' }]
    layoutSpans(spans, at)
    expect(spans[0]).toEqual({ start: 1700, end: 1701, label: 'x' })
  })
})
