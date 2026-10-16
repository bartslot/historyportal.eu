import { describe, it, expect } from 'vitest'
import { BalloonLayer, balloonValue, withBalloonValues, balloonPatch, MAX_SCALE, MIN_SCALE } from '../BalloonLayer.js'
import { editedValues, scaleFromDrag, balloonTarget } from '../balloon-edit.js'
import { applyFrameTo, frameAt } from '../../anim/scene-animation.js'
import { propertiesFor } from '../../anim/properties.js'

/**
 * Balloons animate like layers (Bart, 2026-10-16): the timeline keys their place, size, opacity
 * and tail, and the player plays those keys through the same sampler as figures.
 */
const line = { id: 'bal_2', speaker: 'balloon', text: 'Naar Batavia!', start: 0, end: null, at: [0.4, 0.25] }

describe('a balloon\'s animatable values', () => {
  it('reads them in the timeline\'s units: % for places, factors for size and opacity', () => {
    expect(balloonValue(line, 'x')).toBe(40)
    expect(balloonValue(line, 'y')).toBe(25)
    expect(balloonValue(line, 'scale')).toBe(1)
    expect(balloonValue(line, 'opacity')).toBe(1)
    expect(balloonValue({ ...line, tail: { tip: [0.5, 0.9], root: 0.6, bend: -0.1 } }, 'tip_y')).toBe(90)
    expect(balloonValue({ ...line, tail: { root: 0.6 } }, 'root')).toBe(0.6)
  })

  it('reads what is drawn for a value the line does not store (a balloon placed by its speaker)', () => {
    const drawn = { center: [0.7, 0.3], tip: [0.6, 0.8], root: 0.55 }
    expect(balloonValue({ ...line, at: undefined }, 'x', drawn)).toBe(70)
    expect(balloonValue(line, 'tip_x', drawn)).toBe(60)
    expect(balloonValue(line, 'root', drawn)).toBe(0.55)
  })

  it('puts keyed values on a copy of the line, one axis keeping the other', () => {
    const next = withBalloonValues(line, { x: 60, scale: 9, opacity: -1, tip_y: 80, root: 0.3 })
    expect(next.at).toEqual([0.6, 0.25])
    expect(next.scale).toBe(MAX_SCALE)
    expect(next.opacity).toBe(0)
    expect(next.tail).toEqual({ tip: [0.5, 0.8], root: 0.3 })
    expect(line.at).toEqual([0.4, 0.25])   // untouched
    expect(withBalloonValues(line, { scale: 0 }).scale).toBe(MIN_SCALE)
  })

  it('turns values back into the save the server stores', () => {
    const read = (p) => ({ y: 25, tip_y: 90 })[p]
    expect(balloonPatch({ x: 60 }, read)).toEqual({ at: [0.6, 0.25] })
    expect(balloonPatch({ tip_x: 50, bend: 0.2 }, read)).toEqual({ tail: { tip: [0.5, 0.9], bend: 0.2 } })
    expect(balloonPatch({ scale: 1.5, opacity: 0.5 })).toEqual({ scale: 1.5, opacity: 0.5 })
  })
})

describe('the timeline lists balloons with lanes', () => {
  it('has rows for place, size, opacity and every part of the tail', () => {
    expect(propertiesFor('bal').map((p) => p.key)).toEqual(['x', 'y', 'scale', 'opacity', 'tip_x', 'tip_y', 'root', 'bend'])
  })
})

describe('stage gestures as keyframe values', () => {
  it('a move, a tail drag and a corner drag report the values the timeline keys', () => {
    expect(editedValues({ at: [0.5, 0.2] })).toEqual({ x: 50, y: 20 })
    expect(editedValues({ tail: { tip: [0.3, 0.9], root: 0.7, bend: 0.1 } })).toEqual({ tip_x: 30, tip_y: 90, root: 0.7, bend: 0.1 })
    expect(editedValues({ scale: 1.4 })).toEqual({ scale: 1.4 })
    expect(balloonTarget('bal_12')).toBe('bal:12')
  })

  it('scales uniformly by how far the corner moved from the middle, within the limits', () => {
    expect(scaleFromDrag(1, [0, 0], [100, 0], [150, 0])).toBe(1.5)
    expect(scaleFromDrag(1.2, [0, 0], [100, 0], [50, 0])).toBe(0.6)
    expect(scaleFromDrag(1, [0, 0], [10, 0], [1000, 0])).toBe(MAX_SCALE)
  })
})

describe('the player plays balloon keys through the scene animation', () => {
  it('samples a balloon track and hands its values to the balloon sink by editor id', () => {
    const timeline = { tracks: [{ target: 'bal:2', property: 'scale', keyframes: [{ time: 0, value: 1 }, { time: 2, value: 2 }] }] }
    const got = []
    applyFrameTo(frameAt(timeline, 2), { bal: { patch: (id, values) => got.push([id, values]) } })
    expect(got).toEqual([['bal_2', { scale: 2 }]])
  })

  it('a balloon layer draws the keyed values', () => {
    const host = document.createElement('div')
    const layer = new BalloonLayer(host, () => null)
    layer.setLines([{ speaker: 'narrator', text: 'x', start: 0, end: 1 }, { ...line }].map((l, i) => ({ ...l, id: `bal_${i}` })))
    layer.applyValues('bal_1', { opacity: 0.25, scale: 2 })
    const el = host.querySelector('[data-balloon-id="bal_1"]')
    expect(el.style.opacity).toBe('0.25')
    expect(layer.readValue('bal_1', 'scale')).toBe(2)
    expect(layer.readValue('bal_9', 'scale')).toBeUndefined()
  })
})
