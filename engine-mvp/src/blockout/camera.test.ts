import { describe, expect, it } from 'vitest'
import { corners, frame, horizonV, LOWER_THIRD, project, type Box, type Cam, type Subject } from './camera'
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

  it('lowers the camera so a full figure fills its share on the lower-third horizon', () => {
    const s = fig('a', 0, 0)
    const cam = frame({ shot: 'three-quarter', subjects: ['a'] }, [s])
    const vs = corners(s.box).map((p) => project(cam, p).v)
    expect(Math.max(...vs) - Math.min(...vs)).toBeGreaterThan(0.6)                    // was 0.37 from a 1.4 m eye
    expect(horizonV(cam)!).toBeCloseTo(LOWER_THIRD, 3)
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

  it('puts the subjects on the left or right third when asked, without cutting them', () => {
    const s = fig('a', 0, 0)
    for (const [align, u] of [['left-third', 1 / 3], ['right-third', 2 / 3]] as const) {
      const cam = frame({ shot: 'three-quarter', subjects: ['a'], align }, [s])
      expect(project(cam, [0, 0.9, 0]).u).toBeCloseTo(u, 1)
      expect(inside(cam, s.box)).toBe(true)
    }
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
    // a low rail across the legs is a framing, not hiding
    const rail: Item = { id: 'rail', kit: 'rail', box: { min: [-2, 0, 1], max: [2, 0.8, 1.2] }, yaw: 0, floorY: 0, subject: false, figure: false }
    expect(readback(cam, [item(a), rail]).problems.filter((p) => p.startsWith('hidden'))).toEqual([])
    expect(r.text).toContain('horizon: 67 % down')
  })

  it('stays a short text on a crowded set: subjects first, then the largest pieces, the rest counted', () => {
    const a = fig('a', 0, 0)
    const cam = frame({ shot: 'wide', subjects: ['a'] }, [a])
    const crates: Item[] = Array.from({ length: 500 }, (_, i) => ({ id: 'c' + i, kit: 'crate', box: { min: [-10 + (i % 25), 0, -20 - Math.floor(i / 25)], max: [-9.2 + (i % 25), 0.7, -19.2 - Math.floor(i / 25)] }, yaw: 0, floorY: 0, subject: false, figure: false }))
    const r = readback(cam, [item(a), ...crates])
    expect(r.text.split('\n').filter((l) => /^  \S+ \[/.test(l))).toHaveLength(40)
    expect(r.text).toMatch(/\+461 more pieces/)
    expect(r.text).toContain('  a [figure]')
    expect(r.text.length).toBeLessThan(5000)
  })

  it('cuts per body part: feet below a medium frame are allowed, a head out of frame is a problem', () => {
    const a = fig('a', 0, 0)
    const parts = { head: [0, 1.7, 0], 'left hand': [0.3, 0.9, 0], 'right hand': [-0.3, 0.9, 0], 'left foot': [0.1, 0.05, 0], 'right foot': [-0.1, 0.05, 0] } as Item['parts']
    const medium = frame({ shot: 'medium', subjects: ['a'] }, [a])
    const r = readback(medium, [item(a, { parts })], [], 'medium')
    expect(r.pieces[0].cut.sort()).toEqual(['left foot', 'right foot'])
    expect(r.problems.filter((p) => p.startsWith('cut'))).toEqual([])
    const low: Cam = { ...medium, target: [medium.target[0], medium.target[1] - 6, medium.target[2]] }   // tilted far down
    expect(readback(low, [item(a, { parts })], [], 'medium').problems.some((p) => p.startsWith('cut: head'))).toBe(true)
  })

  it('reports subject size and flags a subject too small for the preset', () => {
    const a = fig('a', 0, 0)
    const wide = frame({ shot: 'wide', subjects: ['a'] }, [a])
    const r = readback(wide, [item(a)], [], 'three-quarter')                         // a wide camera, judged as a 3/4
    expect(r.text).toMatch(/a: size \d+ % of the frame height/)
    expect(r.problems.some((p) => p.startsWith('small: subject a') && p.includes('bring the camera closer'))).toBe(true)
    expect(readback(wide, [item(a)], [], 'wide').problems.filter((p) => p.startsWith('small'))).toEqual([])
  })

  it('a wide wall BEHIND a subject, seen at an angle, does not hide it; the same wall in front does', () => {
    const a = fig('a', 0, 0)
    const cam = frame({ shot: 'three-quarter', subjects: ['a'] }, [a])                // camera in front, off to the side
    const behind: Item = { id: 'wall', kit: 'wall', box: { min: [-3, 0, -1.4], max: [3, 2.6, -1.15] }, yaw: 0, floorY: 0, subject: false, figure: false }
    expect(readback(cam, [item(a), behind]).problems.filter((p) => p.startsWith('hidden'))).toEqual([])
    const [cx, , cz] = cam.position
    const mid: Item = { id: 'screen', kit: 'wall', box: { min: [cx / 2 - 1.5, 0, cz / 2 - 0.3], max: [cx / 2 + 1.5, 2.6, cz / 2 + 0.3] }, yaw: 0, floorY: 0, subject: false, figure: false }
    expect(readback(cam, [item(a), mid]).problems.some((p) => p.startsWith('hidden: screen'))).toBe(true)
  })

  it('passes the solver\'s refusals through', () => {
    const a = fig('a', 0, 0)
    const cam = frame({ shot: 'front', subjects: ['a'] }, [a])
    const r = readback(cam, [item(a)], [{ id: 'c2', kind: 'overlap', with: 'c1', free: [1, 0], detail: 'c2 would stand where c1 stands: not placed; free nearby at [1, 0]' }])
    expect(r.problems[0]).toMatch(/^overlap: c2 would stand where c1 stands/)
  })
})
