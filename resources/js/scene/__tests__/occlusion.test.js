import { describe, it, expect } from 'vitest'
import { OCC, depthAt, groundLine, groundAt, layerDepth, occlusionMask, maskPlacement, fitHeight, stageBoxToImage } from '../occlusion.js'

/**
 * A 100 x 100 depth map shaped like a ship's deck: sky (0) above row 30, a floor whose disparity
 * grows in a straight line below it, and a rail across rows 50..60 standing at its base row 62.
 */
function deck ({ rail = true } = {}) {
  const width = 100; const height = 100
  const floor = (r) => Math.max(0, ((r + 0.5) / height - 0.3) / 0.7)   // 0 at the horizon, 1 at the bottom
  const data = new Uint8Array(width * height)
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const isRail = rail && r >= 50 && r < 62
      data[r * width + c] = Math.round(255 * (isRail ? floor(62) : floor(r)))
    }
  }
  return { data, width, height, aspect: 1 }
}

describe('groundLine', () => {
  it('fits the floor and finds the horizon where it reaches the far end', () => {
    const g = groundLine(deck())
    expect(g.horizon).toBeCloseTo(0.3, 1)
    expect(groundAt(g, 1)).toBeCloseTo(1, 1)
  })

  it('is null for a plate with no floor (one flat value)', () => {
    expect(groundLine({ data: new Uint8Array(100).fill(90), width: 10, height: 10 })).toBeNull()
  })
})

describe('layerDepth', () => {
  it('reads the floor line at the contact row, not the rail painted over the feet', () => {
    const d = deck()
    const g = groundLine(d)
    // Feet at row 0.55: the pixel there is the rail; the figure stands behind it.
    expect(layerDepth(d, g, 0.55, 0.4, 0.6)).toBeLessThan(depthAt(d, 0.5, 0.55))
  })

  it('without a floor, takes the farthest value along the contact row', () => {
    const d = deck()
    expect(layerDepth(d, null, 0.45, 0.4, 0.6)).toBeCloseTo(depthAt(d, 0.5, 0.45), 5)
  })
})

describe('occlusionMask', () => {
  // A figure from row 0.35 to 0.55 (feet behind the rail, which runs 0.50..0.62).
  const box = { u0: 0.4, v0: 0.35, u1: 0.6, v1: 0.55 }
  const rowOf = (mask, t) => Math.floor(((t + OCC.padTop) / (1 + OCC.padTop + OCC.padBottom)) * mask.height)
  const shownAt = (mask, t) => mask.alpha[rowOf(mask, t) * mask.width + (mask.width >> 1)] === 255

  it('hides the part of a figure behind the rail and keeps the rest', () => {
    const d = deck()
    const mask = occlusionMask(d, groundLine(d), box)
    expect(shownAt(mask, 0.2)).toBe(true)     // head and chest: above the rail
    expect(shownAt(mask, 0.85)).toBe(false)   // legs: the rail is in front
    expect(mask.hidden).toBeGreaterThan(0)
  })

  it('hides nothing on the same deck without the rail', () => {
    const d = deck({ rail: false })
    expect(occlusionMask(d, groundLine(d), box).hidden).toBe(0)
  })

  it('never hides a shadow on the floor in front of the feet (below the contact row the layer lies on the floor)', () => {
    const d = deck({ rail: false })
    const mask = occlusionMask(d, groundLine(d), box)
    expect(shownAt(mask, 1.3)).toBe(true)
  })

  it('a floating layer stands at its waterline, not its bottom edge', () => {
    const d = deck()
    const g = groundLine(d)
    // Bottom at 0.55 (rail) but the hull meets the water at 0.45: still behind the rail.
    const low = occlusionMask(d, g, box, { contact: 0.5 })
    expect(shownAt(low, 0.85)).toBe(false)
  })

  it('is mirrored with the layer, so a flipped layer keeps its mask on the same plate pixels', () => {
    const d = deck()
    const g = groundLine(d)
    const half = { u0: 0.4, v0: 0.35, u1: 0.6, v1: 0.55 }
    // A rail that only covers the left half of the plate.
    const left = { ...d, data: d.data.map((v, p) => ((p % 100) >= 50 ? Math.round(255 * Math.max(0, ((Math.floor(p / 100) + 0.5) / 100 - 0.3) / 0.7)) : v)) }
    const plain = occlusionMask(left, g, half)
    const flipped = occlusionMask(left, g, half, { flipX: true })
    const row = rowOf(plain, 0.85) * plain.width
    expect(plain.alpha[row + 1]).toBe(0)                     // node's left = plate's left: hidden
    expect(flipped.alpha[row + 1]).toBe(255)                 // node's left = plate's right: shown
    expect(flipped.alpha[row + flipped.width - 2]).toBe(0)
  })
})

describe('maskPlacement', () => {
  it('lays the padded mask over the node with its box on the node', () => {
    const { size, position } = maskPlacement()
    expect(size).toBe('200% 170%')   // at the shipped padding: 0.5 each side, 0.1 above, 0.6 below
    // background-position maths: p * (box - image) = -padTop * box
    const p = parseFloat(position.split(' ')[1]) / 100
    expect(p * (1 - (1 + OCC.padTop + OCC.padBottom))).toBeCloseTo(-OCC.padTop, 4)
  })
})

describe('fitHeight', () => {
  const g = { a: -0.3 / 0.7, k: 1 / 0.7, horizon: 0.3 }

  it('puts a standing grown-up\'s head on the horizon (eye height ≈ their height)', () => {
    const h = fitHeight(g, 0.8, 1, 1, OCC.eyeM)
    expect(0.8 - h).toBeCloseTo(0.3, 6)
  })

  it('shrinks toward the horizon and is null above it', () => {
    expect(fitHeight(g, 0.5, 1, 1)).toBeLessThan(fitHeight(g, 0.9, 1, 1))
    expect(fitHeight(g, 0.2, 1, 1)).toBeNull()
    expect(fitHeight(null, 0.8, 1, 1)).toBeNull()
  })

  it('scales with the thing\'s real height', () => {
    expect(fitHeight(g, 0.8, 1, 1, 3.4)).toBeCloseTo(2 * fitHeight(g, 0.8, 1, 1, 1.7), 6)
  })

  it('maps through a cover crop: a plate taller than the stage', () => {
    // Plate 1:1 on a 2:1 stage: the stage shows the middle half of its rows.
    const onStage = fitHeight(g, 1, 2, 1, OCC.eyeM)            // stage bottom = plate row 0.75
    expect(onStage).toBeCloseTo((0.75 - 0.3) * 2, 6)
  })
})

describe('stageBoxToImage', () => {
  it('is the identity when the plate has the stage\'s shape', () => {
    expect(stageBoxToImage({ x: 0.5, y: 0.5, w: 0.2, h: 0.4 }, 1.6, 1.6)).toEqual({ u0: 0.4, v0: 0.3, u1: 0.6, v1: 0.7 })
  })
})
