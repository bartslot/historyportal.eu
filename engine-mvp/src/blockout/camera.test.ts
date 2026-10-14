import { describe, expect, it } from 'vitest'
import { corners, frame, horizonV, LOWER_THIRD, project, type Box, type Subject } from './camera'
import { readback, type Item } from './readback'

const fig = (id: string, x: number, z: number, yaw = 0, y = 0): Subject => ({
  id, yaw, box: { min: [x - 0.25, y, z - 0.15], max: [x + 0.25, y + 1.8, z + 0.15] },
})
const item = (s: Subject, extra: Partial<Item> = {}): Item => ({ id: s.id, kit: 'figure', box: s.box, yaw: s.yaw, floorY: s.box.min[1], subject: true, figure: true, ...extra })
const inside = (cam: ReturnType<typeof frame>, b: Box) => corners(b).every((p) => { const q = project(cam, p); return q.u >= 0 && q.u <= 1 && q.v >= 0 && q.v <= 1 })

describe('frame (camera presets)', () => {
  it('puts the horizon on the lower third by default, and where the shot asks', () => {
    const s = [fig('a', 0, 0)]
    expect(horizonV(frame({ shot: 'three-quarter', subjects: ['a'] }, s))!).toBeCloseTo(LOWER_THIRD, 3)
    expect(horizonV(frame({ shot: 'wide', subjects: ['a'], horizon: 0.5155 }, s))!).toBeCloseTo(0.5155, 3)
  })

  it('fits the whole figure in a three-quarter shot, within its fill', () => {
    const cam = frame({ shot: 'three-quarter', subjects: ['a'] }, [fig('a', 0, 0)])
    const b = fig('a', 0, 0).box
    expect(inside(cam, b)).toBe(true)
    const vs = corners(b).map((p) => project(cam, p).v)
    expect(Math.max(...vs) - Math.min(...vs)).toBeLessThanOrEqual(0.7 + 1e-6)
  })

  it('stands in front of the subjects, turned to their right for a three-quarter view', () => {
    const cam = frame({ shot: 'three-quarter', subjects: ['a'] }, [fig('a', 0, 0, 0)])   // a faces +z
    expect(cam.position[2]).toBeGreaterThan(1)
    expect(cam.position[0]).toBeGreaterThan(0)                                         // a's right = +x
  })

  it('looks across two people facing each other, from the -z side, seeing both', () => {
    const a = fig('a', -1, 0, 90), b = fig('b', 1, 0, -90)                            // a looks at b, b at a
    const cam = frame({ shot: 'medium', subjects: ['a', 'b'] }, [a, b])
    expect(cam.position[2]).toBeLessThan(-1)
    expect(Math.abs(cam.position[0])).toBeLessThan(Math.abs(cam.position[2]))
  })

  it('cuts the legs in a medium shot but keeps the head in', () => {
    const s = fig('a', 0, 0)
    const cam = frame({ shot: 'medium', subjects: ['a'] }, [s])
    expect(project(cam, [0, 0, 0]).v).toBeGreaterThan(1)
    expect(project(cam, [0, 1.8, 0]).v).toBeGreaterThan(0)
  })

  it('a wide shot keeps the figure small', () => {
    const s = fig('a', 0, 0)
    const cam = frame({ shot: 'wide', subjects: ['a'] }, [s])
    const vs = corners(s.box).map((p) => project(cam, p).v)
    expect(Math.max(...vs) - Math.min(...vs)).toBeLessThanOrEqual(0.35 + 1e-6)
  })
})

describe('readback', () => {
  it('orders subjects left to right as the camera sees them', () => {
    const a = fig('a', -1, 0), b = fig('b', 1, 0)
    const cam = frame({ shot: 'front', subjects: ['a', 'b'] }, [a, b])               // camera at +z, looking -z
    const r = readback(cam, [item(a), item(b)])
    expect(r.order).toEqual(['b', 'a'])                                               // seen from the front: b is on the left
    expect(r.problems).toEqual([])
  })

  it('reports a subject hidden behind a nearer piece, and floating pieces', () => {
    const a = fig('a', 0, 0)
    const cam = frame({ shot: 'front', subjects: ['a'] }, [a])
    const wall: Item = { id: 'wall', kit: 'wall', box: { min: [-2, 0, 1], max: [2, 2.6, 1.25] }, yaw: 0, floorY: 0, subject: false, figure: false }
    const crate: Item = { id: 'crate', kit: 'crate', box: { min: [3, 0.5, 0], max: [3.8, 1.2, 0.8] }, yaw: 0, floorY: 0, subject: false, figure: false }
    const r = readback(cam, [item(a), wall, crate])
    expect(r.problems.some((p) => p.startsWith('hidden: wall covers'))).toBe(true)
    expect(r.problems.some((p) => p.startsWith('floating: crate'))).toBe(true)
    expect(r.text).toContain('horizon: 67 % down')
  })

  it('passes the solver\'s refusals through', () => {
    const a = fig('a', 0, 0)
    const cam = frame({ shot: 'front', subjects: ['a'] }, [a])
    const r = readback(cam, [item(a)], [{ id: 'c2', kind: 'overlap', with: 'c1', free: [1, 0], detail: 'c2 would stand where c1 stands: not placed; free nearby at [1, 0]' }])
    expect(r.problems[0]).toMatch(/^overlap: c2 would stand where c1 stands/)
  })
})
