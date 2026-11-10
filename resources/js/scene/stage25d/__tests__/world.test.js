import { describe, it, expect } from 'vitest'
import { revealTime, worldRadius, worldPlace } from '../world.js'

describe('a world building itself around the class', () => {
  it('runs the reveal to the build-up the teacher set, and shows it whole at 0', () => {
    expect(revealTime(0, 6)).toBe(0)
    expect(revealTime(3, 6)).toBe(3)
    expect(revealTime(3, 12), 'twice as slow').toBe(1.5)
    expect(revealTime(-1, 6), 'never before the scene starts').toBe(0)
    expect(revealTime(0, 0), 'no build-up: there at once').toBeGreaterThan(30)
  })

  it('measures how far out most of the world lies, ignoring a few stray splats', () => {
    // 90 splats within 10 m on the ground plane, 10 strays 800 m out
    const pts = []
    for (let i = 0; i < 90; i++) pts.push((i % 10) + 1, 5, 0, 1)
    for (let i = 0; i < 10; i++) pts.push(800, 0, 0, 1)
    const r = worldRadius(new Float32Array(pts))
    expect(r).toBeGreaterThan(5)
    expect(r).toBeLessThanOrEqual(10)
    expect(worldRadius(null)).toBe(1)
  })

  it('places a world from its block, a missing or broken value at its default', () => {
    expect(worldPlace({ src: 'x', y: -1.5, scale: '2' })).toEqual({ x: 0, y: -1.5, z: 0, scale: 2, rot: 0 })
    expect(worldPlace({ rot: 'NaN', x: Infinity })).toEqual({ x: 0, y: 0, z: 0, scale: 1, rot: 0 })
    expect(worldPlace()).toEqual({ x: 0, y: 0, z: 0, scale: 1, rot: 0 })
  })
})
