import { describe, it, expect } from 'vitest'
import { toDial, toStored, angleFromPointer, layerAngleRow } from '../ui/angle-dial.js'

describe('showing 0-360 while storing -180..180', () => {
  it('shows a left turn as most of a circle, not as a negative', () => {
    expect(toDial(-90)).toBe(270)
    expect(toDial(-10)).toBe(350)
  })

  it('round-trips every quarter turn', () => {
    // -180 is excluded on purpose: it and 180 are the same angle, and the pair is normalised to
    // 180 by the case below rather than kept as two spellings of one thing.
    for (const stored of [-135, -90, -45, 0, 45, 90, 135, 180]) {
      expect(toStored(toDial(stored))).toBe(stored)
    }
  })

  it('normalises the two spellings of half a turn to one', () => {
    expect(toStored(toDial(-180))).toBe(180)
  })

  /**
   * -180 and 180 are the same angle drawn the same way. Letting the wrap send 180 to -180 would
   * make the number flip sign the moment a teacher passes half a turn, for no visible reason.
   */
  it('keeps half a turn as 180 rather than flipping it to -180', () => {
    expect(toStored(180)).toBe(180)
  })

  it('wraps a value past a full turn instead of running away', () => {
    expect(toDial(370)).toBe(10)
    expect(toStored(370)).toBe(10)
    expect(toStored(-370)).toBe(-10)
  })

  it('treats a value it cannot read as no rotation', () => {
    expect(toDial('')).toBe(0)
    expect(toDial(undefined)).toBe(0)
    expect(toStored(NaN)).toBe(0)
  })
})

describe('reading an angle off the dial', () => {
  /**
   * Zero has to point UP, because zero means "not turned" and a dot resting at twelve o'clock is
   * the only way that reads. Clockwise is positive, matching CSS rotate().
   */
  it('calls straight up zero and goes clockwise from there', () => {
    expect(angleFromPointer(100, 100, 100, 50)).toBeCloseTo(0, 6)     // above
    expect(angleFromPointer(100, 100, 150, 100)).toBeCloseTo(90, 6)   // right
    expect(angleFromPointer(100, 100, 100, 150)).toBeCloseTo(180, 6)  // below
    expect(angleFromPointer(100, 100, 50, 100)).toBeCloseTo(270, 6)   // left
  })

  /**
   * The reason this is a dial and not a slider: a drag from just left of up to just right of up
   * crosses zero, and on a linear track that is a jump from one end to the other.
   */
  it('crosses zero without travelling back through the middle', () => {
    const justLeft = angleFromPointer(100, 100, 99, 50)
    const justRight = angleFromPointer(100, 100, 101, 50)

    expect(justLeft).toBeGreaterThan(358)
    expect(justRight).toBeLessThan(2)
  })
})

describe('the dial, the field and the stepper as one value', () => {
  const row = (rotation = 0) => {
    const r = layerAngleRow({ assetId: 1, rotation })
    r.init()
    return r
  }

  it('starts on the stored angle', () => {
    expect(row(-90).deg).toBe(270)
  })

  it('wraps a nudge past the top instead of stopping at it', () => {
    const r = row(0)
    r.nudge(-1, null)
    expect(r.deg).toBe(359)
  })

  it('wraps a nudge past a full turn', () => {
    const r = row(179)   // shown as 179
    r.setDeg(359)
    r.nudge(1, null)
    expect(r.deg).toBe(0)
  })

  it('ignores a value it cannot read rather than blanking the angle', () => {
    const r = row(45)
    r.setDeg('')
    expect(r.deg).toBe(45)
  })

  /**
   * Flip is NOT rotation. On a symmetrical shape a half turn and a horizontal flip look identical;
   * on a ship or a portrait they are completely different, so one must never stand in for the other.
   */
  it('flips without touching the angle', () => {
    const r = row(30)
    r.toggleFlip('x', null)

    expect(r.flipX).toBe(true)
    expect(r.deg).toBe(30)
  })

  it('flips each axis independently', () => {
    const r = row(0)
    r.toggleFlip('x', null)
    r.toggleFlip('y', null)
    expect([r.flipX, r.flipY]).toEqual([true, true])

    r.toggleFlip('x', null)
    expect([r.flipX, r.flipY]).toEqual([false, true])
  })
})

describe('the keyboard a role="slider" has to answer to', () => {
  const row = (rotation = 0) => {
    const r = layerAngleRow({ assetId: 1, rotation })
    r.init()
    return r
  }
  const key = (k, extra = {}) => ({ key: k, preventDefault () {}, stopPropagation () {}, ...extra })

  /** It is a DIAL. Someone reaching for Up to turn it clockwise is not making a mistake. */
  it('turns on both axes, not just left and right', () => {
    const up = row(10); up.onKey(key('ArrowUp'), null)
    const right = row(10); right.onKey(key('ArrowRight'), null)
    const down = row(10); down.onKey(key('ArrowDown'), null)
    const left = row(10); left.onKey(key('ArrowLeft'), null)

    expect([up.deg, right.deg]).toEqual([11, 11])
    expect([down.deg, left.deg]).toEqual([9, 9])
  })

  /** Shift is coarse everywhere in this panel; a modifier must not mean two things. */
  it('takes a coarser step with Shift, matching the scrubby labels', () => {
    const r = row(0)
    r.onKey(key('ArrowRight', { shiftKey: true }), null)
    expect(r.deg).toBe(10)
  })

  it('jumps to the ends of the turn with Home and End', () => {
    const home = row(123); home.onKey(key('Home'), null)
    const end = row(123); end.onKey(key('End'), null)
    expect([home.deg, end.deg]).toEqual([0, 359])
  })

  it('moves in fifteens on PageUp and PageDown', () => {
    const r = row(0)
    r.onKey(key('PageUp'), null)
    expect(r.deg).toBe(15)
    r.onKey(key('PageDown'), null)
    expect(r.deg).toBe(0)
  })

  it('wraps on the keyboard as it does on the pointer', () => {
    const r = row(359)
    r.onKey(key('ArrowRight'), null)
    expect(r.deg).toBe(0)
  })

  it('gives the angle back on Escape', () => {
    const r = row(45)
    r.onFocus()
    r.onKey(key('ArrowRight'), null)
    r.onKey(key('ArrowRight'), null)
    expect(r.deg).toBe(47)

    r.onKey(key('Escape'), null)
    expect(r.deg).toBe(45)
  })

  it('ignores a key it has no meaning for', () => {
    const r = row(45)
    r.onKey(key('a'), null)
    expect(r.deg).toBe(45)
  })
})
