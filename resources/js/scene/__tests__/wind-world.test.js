import { describe, it, expect, afterEach } from 'vitest'
import { windTargets, windDirection, WindWorld, WIND } from '../wind-world.js'
import { readFrames, cellPosition, framesAt, mountFrames, showFrame } from '../layer-frames.js'

afterEach(() => { document.body.innerHTML = '' })

describe('the wind moves the ship', () => {
  it('drifts, swells, wakes and rolls with the level, from the layer\'s own values', () => {
    const base = { speed: 0.6, amount: 0.5, reactAmount: 1.6, drift: 6, dir: 1 }
    expect(windTargets(0, base)).toEqual({ frame: 0, speed: 0.6, amount: 0.5, driftPct: 0 })
    expect(windTargets(0.5, base)).toEqual({ frame: 0.5, speed: 0.8, amount: 1.05, driftPct: 3 })
    expect(windTargets(1, base)).toEqual({ frame: 1, speed: 1, amount: 1.6, driftPct: 6 })
    expect(windTargets(9, { ...base, dir: -1 }).driftPct).toBe(-6)
    // A teacher who turned the drift off keeps the ship in place.
    expect(windTargets(1, { ...base, drift: 0 }).driftPct).toBe(0)
  })

  it('drifts the way the payoff sails', () => {
    expect(windDirection({ asset_id: 5, x: 58 }, { type: 'move', layer: 5, to_x: 112 })).toBe(1)
    expect(windDirection({ asset_id: 5, x: 58 }, { type: 'move', layer: 5, to_x: -20 })).toBe(-1)
    expect(windDirection({ asset_id: 5, x: 58 }, { type: 'camera', layer: 5 })).toBe(1)
  })

  it('eases the ship to each new level and drives the overlay', () => {
    const stage = document.createElement('div')
    Object.defineProperty(stage, 'clientWidth', { value: 1000 })
    const node = document.createElement('div')
    node.dataset.layerId = 'art_7'
    stage.appendChild(node)
    const calls = []
    const overlay = {
      layerData: () => ({ asset_id: 7, x: 58, speed: 0.6, foam: 0.5, ambient_amount: 0.5 }),
      setSpeed: (id, v) => calls.push(['speed', v]),
      setLayerProp: (id, k, v) => calls.push([k, v]),
      setFrame: (id, v) => calls.push(['frame', v]),
    }
    let now = 0
    const frames = []
    const wind = new WindWorld({ overlay, stage, layerId: 7, react: { amount: 1.6, drift: 10 }, payoff: { type: 'move', layer: 7, to_x: 112 }, raf: (f) => frames.push(f), now: () => now })
    wind.set(0.5)
    expect(calls).toContainEqual(['speed', 0.8])
    expect(calls).toContainEqual(['ambient_amount', 1.05])
    // Mid-glide the ship is part of the way; at the end it is at 5% of the stage.
    now = WIND.tweenMs / 2
    frames.shift()()
    const mid = parseFloat(node.style.translate)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(50)
    now = WIND.tweenMs
    frames.shift()()
    expect(node.style.translate).toBe('50px 0px')
    expect(calls.filter(c => c[0] === 'frame').at(-1)[1]).toBe(0.5)
  })

  it('a layer without a wake never gets one', () => {
    const calls = []
    const overlay = { layerData: () => ({ asset_id: 7, x: 50, speed: null, foam: null }), setSpeed: () => calls.push('speed'), setLayerProp: () => {}, setFrame: () => {} }
    new WindWorld({ overlay, stage: document.createElement('div'), layerId: 7, raf: () => {} }).set(1)
    expect(calls).toEqual([])
  })
})

describe('sprite-sheet layers', () => {
  it('reads a sheet defensively', () => {
    expect(readFrames(null)).toBeNull()
    expect(readFrames({ url: '/s.webp', count: 1 })).toBeNull()
    expect(readFrames({ url: '/s.webp', count: 4, play: 'off' })).toBeNull()
    expect(readFrames({ url: '/s.webp', count: 4, columns: 9 })).toMatchObject({ count: 4, columns: 4, rows: 1, play: 'wind' })
    expect(readFrames({ url: '/s.webp', count: 6, columns: 3, play: 'loop' }).play).toBe('wind')
    expect(readFrames({ url: '/s.webp', count: 4, play: 'loop', fps: 99 }).fps).toBe(24)
  })

  it('finds each cell and blends between two', () => {
    expect(cellPosition(0, { columns: 4, rows: 1 })).toBe('0% 0%')
    expect(cellPosition(3, { columns: 4, rows: 1 })).toBe('100% 0%')
    expect(cellPosition(4, { columns: 2, rows: 3 })).toBe('0% 100%')
    expect(framesAt(0, 4)).toEqual({ lower: 0, upper: 1, mix: 0 })
    expect(framesAt(0.5, 4)).toEqual({ lower: 1, upper: 2, mix: 0.5 })
    expect(framesAt(1, 4)).toEqual({ lower: 3, upper: 3, mix: 0 })
  })

  it('puts the sheet over the picture and follows the level', () => {
    const body = document.createElement('div')
    const img = document.createElement('img')
    img.style.opacity = '0.8'
    body.appendChild(img)
    mountFrames(body, img, { url: '/s.webp', count: 4, columns: 4, play: 'wind' })
    const cells = body.querySelectorAll('.art-frames > .art-frame')
    expect(cells).toHaveLength(2)
    expect(body.querySelector('.art-frames').style.opacity).toBe('0.8')
    showFrame(body, 1)
    expect(cells[0].style.backgroundPosition).toBe('100% 0%')
    // Off again: the picture alone.
    mountFrames(body, img, { url: '/s.webp', count: 4, play: 'off' })
    expect(body.querySelector('.art-frames')).toBeNull()
  })
})
