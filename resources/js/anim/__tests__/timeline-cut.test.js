import { describe, it, expect } from 'vitest'
import { cutTracks } from '../timeline-cut.js'

const track = (target, property, keyframes) => ({ target, property, keyframes })

describe('cutTracks', () => {
  it('ends the first piece and starts the second on the value at the cut', () => {
    const { first, second } = cutTracks([track('text:t1', 'opacity', [
      { time: 0, value: 0, easing: 'linear' }, { time: 4, value: 1 },
    ])], 2)
    expect(first[0].keyframes).toEqual([{ time: 0, value: 0, easing: 'linear' }, { time: 2, value: 0.5 }])
    expect(second[0].keyframes).toEqual([{ time: 0, value: 0.5 }, { time: 2, value: 1 }])
  })

  it('moves the keys after the cut earlier by the cut', () => {
    const { second } = cutTracks([track('art:3', 'x', [
      { time: 1, value: 10 }, { time: 5, value: 50 }, { time: 7.5, value: 20 },
    ])], 5)
    expect(second[0].keyframes.map((k) => k.time)).toEqual([0, 2.5])
    expect(second[0].keyframes[0].value).toBe(50)
  })

  it('keeps the easing of a key that sits on the cut in the second piece', () => {
    const { first, second } = cutTracks([track('art:3', 'x', [
      { time: 0, value: 0 }, { time: 3, value: 30, easing: 'hold' }, { time: 6, value: 60 },
    ])], 3)
    expect(first[0].keyframes).toEqual([{ time: 0, value: 0 }, { time: 3, value: 30 }])
    expect(second[0].keyframes[0]).toEqual({ easing: 'hold', time: 0, value: 30 })
  })

  it('holds a row that only moves on one side', () => {
    const { first, second } = cutTracks([track('art:1', 'scale', [{ time: 6, value: 1 }, { time: 8, value: 2 }])], 3)
    expect(first[0].keyframes).toEqual([{ time: 3, value: 1 }])
    expect(second[0].keyframes).toEqual([{ time: 0, value: 1 }, { time: 3, value: 1 }, { time: 5, value: 2 }])
  })

  it('keeps a track\'s base, and leaves the input alone', () => {
    const tracks = [{ ...track('text:a', 'x', [{ time: 0, value: 1 }, { time: 2, value: 3 }]), base: 1 }]
    const copy = JSON.parse(JSON.stringify(tracks))
    const { first, second } = cutTracks(tracks, 1)
    expect(first[0].base).toBe(1)
    expect(second[0].base).toBe(1)
    expect(tracks).toEqual(copy)
  })

  it('steps an expression instead of blending it', () => {
    const { second } = cutTracks([track('s25:layer-2', 'face', [{ time: 0, value: 'smile' }, { time: 4, value: 'angry' }])], 2)
    expect(second[0].keyframes[0].value).toBe('smile')
  })
})
