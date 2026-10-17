import { describe, expect, it } from 'vitest'
import { solve } from '../blockout/solve'
import { project } from '../blockout/camera'
import { boxOf, cameraFor, FRAME_H, FRAME_W } from './clay'
import { stagingOf } from './shots'

const ASPECT = FRAME_W / FRAME_H
const centre = (b: { min: number[]; max: number[] }) => [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2) as [number, number, number]

describe('clay frame camera', () => {
  const { placed } = solve(stagingOf(['Dante', 'Guildsman']))

  it('boxes a figure from where it stands and its height', () => {
    const b = boxOf(placed.dante).box
    expect(b.min[1]).toBe(0)
    expect(b.max[1]).toBeCloseTo(1.8)
    expect(b.min[0]).toBeLessThan(placed.dante.x)
    expect(b.max[0]).toBeGreaterThan(placed.dante.x)
  })

  it("puts the shot's subjects inside the 16:10 frame", () => {
    const cam = cameraFor({ shot: 'wide', subjects: ['dante', 'guildsman'] }, placed, ASPECT)
    for (const id of ['dante', 'guildsman']) {
      const q = project(cam, centre(boxOf(placed[id]).box))
      expect(q.depth).toBeGreaterThan(0)
      expect(q.u).toBeGreaterThan(0)
      expect(q.u).toBeLessThan(1)
    }
  })

  it('frames everyone when the subjects named are not in the shot (a renamed speaker)', () => {
    const cam = cameraFor({ shot: 'medium', subjects: ['nobody'] }, placed, ASPECT)
    const q = project(cam, centre(boxOf(placed.dante).box))
    expect(q.u).toBeGreaterThan(0)
    expect(q.u).toBeLessThan(1)
  })

  it('a turned camera (az) looks at the same people from another side', () => {
    const a = cameraFor({ shot: 'wide', subjects: ['dante'] }, placed, ASPECT)
    const b = cameraFor({ shot: 'wide', subjects: ['dante'], az: 90 }, placed, ASPECT)
    expect(Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2])).toBeGreaterThan(1)
  })
})
