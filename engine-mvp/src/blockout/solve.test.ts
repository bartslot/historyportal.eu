import { describe, expect, it } from 'vitest'
import { headingTo, solve, type Spec } from './solve'

const rail: Spec = { id: 'rail', kit: 'rail', at: [0, 4] }          // 4 m along x, facing +z

describe('solve', () => {
  it('puts a figure against the front of the rail, gap included, on the 0.5 m grid', () => {
    const { placed, problems } = solve([rail, { id: 'tasman', kit: 'figure', place: { near: 'rail', side: 'front', gap: 0.3 } }])
    expect(problems).toEqual([])
    // rail half depth 0.1 + figure half depth 0.15 + gap 0.3 = 0.55 m in front, snapped to a cell centre
    expect(placed.tasman.x).toBe(0.25)
    expect(placed.tasman.z).toBe(4.75)
    expect(placed.tasman.z % 0.5).toBe(0.25)
  })

  it('reads behind / left_of / right_of in the OTHER piece\'s own frame', () => {
    const { placed } = solve([
      { id: 'a', kit: 'figure', at: [0, 0], face: 90 },                // a looks along +x: its right is -z
      { id: 'b', kit: 'crate', place: { behind: 'a', gap: 0.5 } },
      { id: 'c', kit: 'crate', place: { right_of: 'a', gap: 0.5 } },
    ])
    expect(placed.b.x).toBeLessThan(0)                                  // behind a = -x
    expect(Math.abs(placed.b.z)).toBeLessThan(0.5)
    expect(placed.c.z).toBeLessThan(0)                                  // a's right = -z
  })

  it('places between two pieces and faces a marker listed later', () => {
    const { placed, problems } = solve([
      { id: 'mid', kit: 'figure', place: { between: ['l', 'r'] }, face: 'coast' },
      { id: 'l', kit: 'barrel', at: [-3, 0] },
      { id: 'r', kit: 'barrel', at: [3, 0] },
      { id: 'coast', kit: 'marker', at: [0, 40] },
    ])
    expect(problems).toEqual([])
    expect(Math.abs(placed.mid.x)).toBeLessThanOrEqual(0.25)
    expect(placed.mid.yaw).toBe(headingTo(placed.mid.x, placed.mid.z, 0, 40))
  })

  it('stands a piece on top of another and keeps it off the floor grid', () => {
    const { placed } = solve([{ id: 't', kit: 'table', at: [1, 1] }, { id: 'b', kit: 'barrel', on: 't' }])
    expect(placed.b.y).toBeCloseTo(0.78)
    expect(placed.b.onFloor).toBe(false)
  })

  it('still refuses overlaps between pieces standing on a deck', () => {
    const deck: Spec = { id: 'deck', kit: 'deck', at: [0, 0] }
    const { placed, problems } = solve([deck, { id: 'a', kit: 'figure', on: 'deck', at: [0, 0] }, { id: 'b', kit: 'figure', on: 'deck', at: [0.1, 0] }])
    expect(placed.a.y).toBeCloseTo(0.2)
    expect(placed.b).toBeUndefined()
    expect(problems[0]).toMatchObject({ id: 'b', kind: 'overlap', with: 'a' })
  })

  it('refuses an overlap, never pushes, and reports the nearest free spot', () => {
    const { placed, problems } = solve([{ id: 'c1', kit: 'crate', at: [0, 0] }, { id: 'c2', kit: 'crate', at: [0.2, 0.1] }])
    expect(placed.c2).toBeUndefined()
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatchObject({ id: 'c2', kind: 'overlap', with: 'c1' })
    const [fx, fz] = problems[0].free!
    expect(solve([{ id: 'c1', kit: 'crate', at: [0, 0] }, { id: 'c2', kit: 'crate', at: [fx, fz] }]).problems).toEqual([])
  })

  it('does not depend on the order the pieces are listed in', () => {
    const specs: Spec[] = [{ id: 'v', kit: 'figure', place: { behind: 't', gap: 0.4 } }, rail, { id: 't', kit: 'figure', place: { near: 'rail' } }]
    expect(solve(specs).placed).toEqual(solve([...specs].reverse()).placed)
  })

  it('reports unknown references, kits and cycles instead of throwing', () => {
    const { problems } = solve([
      { id: 'x', kit: 'figure', place: { near: 'ghost' } },
      { id: 'y', kit: 'dragon' },
      { id: 'p', kit: 'crate', place: { near: 'q' } },
      { id: 'q', kit: 'crate', place: { near: 'p' } },
    ])
    expect(problems.map((p) => p.kind).sort()).toEqual(['cycle', 'unknown-kit', 'unknown-ref'])
  })

  it('keeps fixed pieces (a teacher\'s edit) where they are and solves only the new ones around them', () => {
    const fixed = solve([rail]).placed
    const moved = { ...fixed, rail: { ...fixed.rail, x: 2 } }        // the teacher dragged the rail 2 m along
    const { placed } = solve([{ id: 't', kit: 'figure', place: { near: 'rail' } }], moved)
    expect(placed.rail.x).toBe(2)
    expect(placed.t.x).toBeCloseTo(2.25)
  })
})
