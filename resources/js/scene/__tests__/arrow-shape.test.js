import { describe, it, expect } from 'vitest'
import {
  SHAFT_HANDLE_GAP,
  ARROW_DEFAULTS,
  ARROW_LIMITS,
  MAX_BEND,
  arrowFrame,
  arrowHandles,
  arrowParams,
  arrowPaths,
  bendFromPoint,
  halfShaft,
  headFromPoint,
  shaftFromPoint,
} from '../arrow-shape.js'
import { INTERPOLATE, propertyFor } from '../../anim/properties.js'

/** A square stage keeps the stage-unit maths readable: one unit is one % in both directions. */
const SQUARE = 1

const straight = { x: 20, y: 50, end_x: 80, end_y: 50, bend: 0, shaft: 2, head: 6, arrow_style: 'stroke' }

describe('arrowParams', () => {
  it('fills defaults for a layer saved before the arrow keys existed', () => {
    expect(arrowParams({})).toEqual({ ...ARROW_DEFAULTS })
  })

  it('clamps every value to the bounds the server also enforces', () => {
    const p = arrowParams({ end_x: 150, end_y: -4, bend: -2, shaft: 99, head: 0 })
    expect(p.end_x).toBe(ARROW_LIMITS.end_x[1])
    expect(p.end_y).toBe(ARROW_LIMITS.end_y[0])
    expect(p.bend).toBe(-MAX_BEND)
    expect(p.shaft).toBe(ARROW_LIMITS.shaft[1])
    expect(p.head).toBe(ARROW_LIMITS.head[0])
  })

  it('falls back to a line for an unknown style', () => {
    expect(arrowParams({ arrow_style: 'wiggle' }).arrow_style).toBe('stroke')
  })
})

describe('arrowPaths', () => {
  it('draws a straight arrow from start to end along the centre line', () => {
    const paths = arrowPaths(straight, SQUARE)
    expect(paths.shaft).toBe('M 20 50 Q 50 50 80 50')
    expect(paths.viewBox).toBe('0 0 100 100')
    expect(paths.fill).toBe(false)
    expect(paths.width).toBe(2)
  })

  it('scales the viewBox width with the stage aspect so strokes stay round', () => {
    expect(arrowPaths(straight, 16 / 9).viewBox).toBe('0 0 177.778 100')
  })

  it('opens the head as a chevron for a line arrow and closes it for a block arrow', () => {
    expect(arrowPaths(straight, SQUARE).head.endsWith('Z')).toBe(false)
    const block = arrowPaths({ ...straight, arrow_style: 'block' }, SQUARE)
    expect(block.head.endsWith('Z')).toBe(true)
    expect(block.fill).toBe(true)
    expect(block.width).toBe(straight.shaft * 2)
  })

  it('bows the curve by bend times its length, to the side the sign picks', () => {
    // Chord from (20,50) to (80,50) is 60 long; bend 0.25 sags 15 units to +y.
    const frame = arrowFrame({ ...straight, bend: 0.25 }, SQUARE)
    expect(frame.curveMid[1]).toBeCloseTo(65, 6)
    expect(frame.curveMid[0]).toBeCloseTo(50, 6)
    const down = arrowFrame({ ...straight, bend: -0.25 }, SQUARE)
    expect(down.curveMid[1]).toBeCloseTo(35, 6)
  })

  it('points the head along the curve at the end, not along the chord', () => {
    const frame = arrowFrame({ ...straight, bend: 0.25 }, SQUARE)
    // The tangent at the end runs up-and-right from the control point, so the arms sit back from it.
    expect(frame.tangent[0]).toBeGreaterThan(0)
    expect(frame.tangent[1]).toBeLessThan(0)
  })
})

describe('arrowHandles', () => {
  it('puts the two dots on the start and end, in % of the stage', () => {
    const at = arrowHandles(straight, SQUARE)
    expect(at.start).toEqual([20, 50])
    expect(at.end).toEqual([80, 50])
  })

  it('puts the bend handle on the curve itself', () => {
    const at = arrowHandles({ ...straight, bend: 0.25 }, SQUARE)
    expect(at.bend[0]).toBeCloseTo(50, 6)
    expect(at.bend[1]).toBeCloseTo(65, 6)
  })

  it('puts the width handle beside the shaft, clear of the bend handle', () => {
    const at = arrowHandles(straight, SQUARE)
    expect(at.shaft[0]).toBeCloseTo(50, 6)
    expect(at.shaft[1]).toBeCloseTo(50 + halfShaft(arrowParams(straight)) + SHAFT_HANDLE_GAP, 6)
    expect(at.shaft[1]).toBeGreaterThan(at.bend[1] + 2)
  })
})

describe('handle drags set the value under the hand', () => {
  it('bends the arrow through the point it is dragged to', () => {
    const bend = bendFromPoint(straight, [50, 60], SQUARE)
    expect(bend).toBeCloseTo(0.1667, 3)
    const moved = arrowHandles({ ...straight, bend }, SQUARE).bend
    expect(moved[1]).toBeCloseTo(60, 6)
  })

  it('round-trips a width: the handle where a width puts it gives that width back', () => {
    const at = arrowHandles(straight, SQUARE).shaft
    expect(shaftFromPoint(straight, at, SQUARE)).toBeCloseTo(straight.shaft, 6)
  })

  it('round-trips a head: the arm end where a head size puts it gives that size back', () => {
    const at = arrowHandles(straight, SQUARE).head
    expect(headFromPoint(straight, at, SQUARE)).toBeCloseTo(straight.head, 1)
  })

  it('clamps a width and a bend a hand drags past the bounds', () => {
    expect(shaftFromPoint(straight, [50, 99], SQUARE)).toBe(ARROW_LIMITS.shaft[1])
    expect(bendFromPoint(straight, [50, -400], SQUARE)).toBe(-MAX_BEND)
  })
})

describe('keyframes move the arrow', () => {
  it('keys every arrow value linearly on its own target', () => {
    for (const key of ['end_x', 'end_y', 'bend', 'shaft', 'head']) {
      expect(propertyFor('arw', key)?.interpolate).toBe('linear')
    }
  })

  it('draws the in-between arrow at the in-between value', () => {
    // Two keys: end_x 60 at 0 s, 80 at 1 s. At 0.5 s the end is at 70, which is the same
    // arrow as a layer stored with end_x 70.
    const mid = INTERPOLATE.linear(60, 80, 0.5)
    expect(mid).toBe(70)
    expect(arrowPaths({ ...straight, end_x: mid }, SQUARE).shaft).toBe(arrowPaths({ ...straight, end_x: 70 }, SQUARE).shaft)
  })
})
