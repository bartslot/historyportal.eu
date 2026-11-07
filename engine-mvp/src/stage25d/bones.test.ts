import { describe, expect, it } from 'vitest'
import { bindParts, bindPicture, bindPuppet, bodyParts, labelPixels, weightsThroughShape } from './bones'

// a solid bar 20 x 100 px, standing: an upper and a lower part
const W = 40, H = 120
const data = new Uint8Array(W * H)
for (let y = 10; y < 110; y++) for (let x = 10; x < 30; x++) data[y * W + x] = 255
const joints = [
  { name: 'upper', parent: null, from: [20, 10] as [number, number], to: [20, 60] as [number, number] },
  { name: 'lower', parent: 'upper', from: [20, 60] as [number, number], to: [20, 110] as [number, number] },
]

const at = (v: number[], i: number) => [v[i * 2], v[i * 2 + 1]]
const tipIndex = (v: number[]) => { let best = 0; for (let i = 0; i < v.length / 2; i++) if (at(v, i)[1] > at(v, best)[1]) best = i; return best }

describe('bones on a flat picture', () => {
  const bent = bindPicture({ width: W, height: H, data }, joints)!

  it('with no bones turned the picture stays where it was painted', () => {
    const rest = bent.bend({})
    for (let i = 0; i < rest.length / 2; i++) {
      const [x, y] = at(rest, i)
      expect(x).toBeGreaterThan(5); expect(x).toBeLessThan(35); expect(y).toBeGreaterThan(5); expect(y).toBeLessThan(115)
    }
    expect(bent.uvs.length).toBe(rest.length)
  })

  it('a turned bone moves what hangs from it: clockwise on screen swings a hanging limb to the left', () => {
    const rest = bent.bend({})
    const tip = tipIndex(rest)
    const turned = bent.bend({ lower: 40 })
    expect(at(turned, tip)[0]).toBeLessThan(at(rest, tip)[0] - 15)
    const parent = bent.bend({ upper: 40 })
    expect(at(parent, tip)[0]).toBeLessThan(at(turned, tip)[0])
  })

  it('an unknown bone or a bad number changes nothing', () => {
    expect(bent.bend({ nope: 30, lower: Number.NaN })).toEqual(bent.bend({}))
  })
})

describe('a puppet of separate parts', () => {
  const quad = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  const puppet = {
    atlas: 'a.png', width: 100, height: 200,
    bones: [{ name: 'arm', parent: null, from: [50, 50] as [number, number] }, { name: 'hand', parent: 'arm', from: [50, 100] as [number, number] }],
    parts: [{ bone: 'hand', quad: quad(40, 100, 60, 130), uv: [0, 0, 0.5, 1] as [number, number, number, number] }, { bone: 'arm', quad: quad(40, 50, 60, 100), uv: [0.5, 0, 1, 1] as [number, number, number, number] }],
  }
  const bent = bindPuppet(puppet)

  it('at rest every part is where it was placed, back part first', () => {
    expect(bent.bend({}).map((n) => Math.round(n))).toEqual([40, 100, 60, 100, 60, 130, 40, 130, 40, 50, 60, 50, 60, 100, 40, 100])
    expect(bent.triangles).toEqual([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7])
  })

  it('a turned bone carries what hangs from it, and its joint stays put', () => {
    const v = bent.bend({ arm: 90 })   // clockwise: hanging down goes to the left
    expect(v[12]).toBeCloseTo(0, 0)                         // the arm's lower right corner: 50 px left of the shoulder
    const hand = bent.bend({ hand: 90 })
    expect(hand[8]).toBeCloseTo(40, 5)                     // the arm itself did not move
    expect(hand[4]).toBeLessThan(40)                       // the hand swung left around the wrist
  })

  it('names each joint where it stands now, its handle at the next joint or the middle of its part', () => {
    bent.bend({})
    const rest = Object.fromEntries(bent.joints().map((j) => [j.name, j]))
    const r = (p: number[]) => p.map((n) => Math.round(n) + 0)   // + 0: no -0
    expect(r(rest.arm.at)).toEqual([50, 50])
    expect(r(rest.arm.tip)).toEqual([50, 100])          // the wrist hangs off it
    expect(r(rest.hand.tip)).toEqual([50, 115])         // nothing hangs off a hand: the middle of its part
    bent.bend({ arm: 90 })
    const turned = Object.fromEntries(bent.joints().map((j) => [j.name, j]))
    expect(r(turned.arm.at)).toEqual([50, 50])   // the shoulder stays put
    expect(r(turned.arm.tip)).toEqual([0, 50])   // the wrist went round it, clockwise
    expect(r(turned.hand.at)).toEqual([0, 50])
  })
})

describe('a puppet keeps its joints human', () => {
  const quad = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  const uv: [number, number, number, number] = [0, 0, 1, 1]
  const figure = (facing: 1 | -1) => bindPuppet({
    atlas: 'a.png', width: 100, height: 200, facing,
    bones: [
      { name: 'upperarm_n', parent: null, from: [50, 50] }, { name: 'forearm_n', parent: 'upperarm_n', from: [50, 100] },
      { name: 'upperarm_f', parent: null, from: [50, 50] }, { name: 'forearm_f', parent: 'upperarm_f', from: [50, 100] },
      { name: 'head', parent: null, from: [50, 40] }, { name: 'chest', parent: null, from: [50, 90] },
    ],
    parts: ['forearm_n', 'upperarm_n', 'forearm_f', 'upperarm_f', 'head', 'chest'].map((bone) => ({ bone, quad: quad(40, 50, 60, 150), uv })),
  })
  const part = (v: number[], n: number) => v.slice(n * 8, n * 8 + 8)
  const FOREARM_N = 0, UPPER_N = 1, FOREARM_F = 2, HEAD = 4, CHEST = 5

  it('an elbow never bends backwards, whichever way the figure faces', () => {
    const right = figure(1)
    expect(part(right.bend({ forearm_n: 90 }), FOREARM_N)).toEqual(part(right.bend({ forearm_n: 5 }), FOREARM_N))
    expect(part(right.bend({ forearm_f: -90 }), FOREARM_F)).not.toEqual(part(right.bend({ forearm_f: 0 }), FOREARM_F))
    const left = figure(-1)
    expect(part(left.bend({ forearm_n: -90 }), FOREARM_N)).toEqual(part(left.bend({ forearm_n: -5 }), FOREARM_N))
    expect(part(left.bend({ forearm_n: 90 }), FOREARM_N)).not.toEqual(part(left.bend({ forearm_n: 0 }), FOREARM_N))
  })

  it('an upper arm never crosses to the other side of the body', () => {
    const f = figure(1)
    expect(part(f.bend({ upperarm_n: -80 }), UPPER_N)).toEqual(part(f.bend({ upperarm_n: -10 }), UPPER_N))
    expect(part(f.bend({ upperarm_n: 80 }), UPPER_N)).not.toEqual(part(f.bend({ upperarm_n: 0 }), UPPER_N))
  })

  it('head and chest turn a little, no more', () => {
    const f = figure(1)
    expect(part(f.bend({ head: 90 }), HEAD)).toEqual(part(f.bend({ head: 25 }), HEAD))
    expect(part(f.bend({ chest: -90 }), CHEST)).toEqual(part(f.bend({ chest: -12 }), CHEST))
  })
})

describe('a near arm and the body', () => {
  const quad = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
  const uv: [number, number, number, number] = [0, 0, 1, 1]
  const figure = bindPuppet({
    atlas: 'a.png', width: 300, height: 400, facing: 1,
    bones: [
      { name: 'hips', parent: null, from: [150, 200] }, { name: 'chest', parent: 'hips', from: [150, 200] },
      { name: 'upperarm_n', parent: 'chest', from: [70, 60] }, { name: 'forearm_n', parent: 'upperarm_n', from: [70, 130] },
    ],
    parts: [
      { bone: 'hips', quad: quad(110, 200, 190, 400), uv }, { bone: 'forearm_n', quad: quad(55, 130, 85, 230), uv }, { bone: 'upperarm_n', quad: quad(55, 60, 85, 130), uv },
      { bone: 'chest', quad: quad(110, 50, 190, 200), uv },
    ],
  })

  it('a hand swung across the body stops at its edge, the arm stays free elsewhere', () => {
    expect(figure.safe({ forearm_n: -10 }).forearm_n).toBe(-10)
    const held = figure.safe({ forearm_n: -120 }).forearm_n
    expect(held).toBeGreaterThan(-120)
    expect(held).toBeLessThan(-10)
    expect(figure.safe({ forearm_n: -120, upperarm_n: 150 }).forearm_n).toBe(-120)   // the arm swung away: the same fold is clear of the body
  })

  it('the pose it draws is the safe one', () => {
    expect(figure.bend({ forearm_n: -120 })).toEqual(figure.bend({ forearm_n: figure.safe({ forearm_n: -120 }).forearm_n }))
  })
})

describe('weights through the shape', () => {
  it('a vertex beside a bone across a gap does not follow it: only the path through the shape counts', () => {
    // a U: two prongs joined at the bottom, 4 apart at the top. Vertices: left prong 0-1-2 going up, the base 2-3, right prong 3-4-5
    const points = [[0, 0], [0, 50], [0, 100], [4, 100], [4, 50], [4, 0]]
    const triangles = [0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5]   // degenerate triangles: only their edges matter here
    const bones = [{ bone: 1, from: [0, 0], to: [0, 50] }, { bone: 2, from: [4, 0], to: [4, 50] }]
    const w = weightsThroughShape(points, triangles, bones)
    const of = (v: number, bone: number) => w[v].find((x: { bone: number }) => x.bone === bone)?.weight ?? 0
    expect(of(0, 1)).toBeGreaterThan(0.99)   // the left tip is the left bone's, though the right bone is 4 px away
    expect(of(5, 2)).toBeGreaterThan(0.99)
  })
})

describe('body parts', () => {
  const j = (name: string, parent: string | null) => ({ name, parent, from: [0, 0] as [number, number], to: [0, 1] as [number, number] })

  it('an arm, a leg and the head are parts of their own, what hangs from them goes with them', () => {
    const parts = bodyParts([j('chest', null), j('head', 'chest'), j('upperarm_n', 'chest'), j('forearm_n', 'upperarm_n'), j('hand_n', 'forearm_n'), j('pelvis', null), j('thigh_f', 'pelvis'), j('shin_f', 'thigh_f')])
    expect(parts.get('chest')).toBe('core')
    expect(parts.get('pelvis')).toBe('core')
    expect(parts.get('head')).toBe('head')
    expect(parts.get('hand_n')).toBe('upperarm_n')
    expect(parts.get('shin_f')).toBe('thigh_f')
  })

  it('moving an arm moves nothing of the rest of the picture', () => {
    // a T: a body bar and an arm bar joined at the shoulder
    const W = 120, H = 120
    const data = new Uint8Array(W * H)
    for (let y = 10; y < 110; y++) for (let x = 50; x < 70; x++) data[y * W + x] = 255
    for (let y = 20; y < 32; y++) for (let x = 70; x < 115; x++) data[y * W + x] = 255
    const bent = bindPicture({ width: W, height: H, data }, [
      { name: 'chest', parent: null, from: [60, 110], to: [60, 20] },
      { name: 'upperarm_f', parent: 'chest', from: [70, 26], to: [112, 26] },
    ])!
    const rest = bent.bend({}), moved = bent.bend({ upperarm_f: 60 })
    let bodyMoved = 0, armMoved = 0
    for (let i = 0; i < rest.length / 2; i++) {
      const d = Math.hypot(moved[i * 2] - rest[i * 2], moved[i * 2 + 1] - rest[i * 2 + 1])
      if (rest[i * 2] < 66) bodyMoved = Math.max(bodyMoved, d)
      if (rest[i * 2] > 100) armMoved = Math.max(armMoved, d)
    }
    expect(armMoved).toBeGreaterThan(20)
    expect(bodyMoved).toBeLessThan(0.001)
  })
})

describe('a picture cut along its part map', () => {
  it('a pixel is the nearest colour of the map, see-through pixels are nothing', () => {
    const parts = [{ colour: [255, 0, 0] as [number, number, number] }, { colour: [0, 255, 255] as [number, number, number] }]
    const labels = labelPixels({ data: new Uint8Array([250, 10, 5, 255, 20, 240, 230, 255, 0, 0, 0, 255]) }, { data: new Uint8Array([255, 255, 0]) }, parts)
    expect([...labels]).toEqual([0, 1, -1])
  })

  it('moving the arm moves no vertex of the body, even where the two touch and overlap', () => {
    const W = 120, H = 120
    const alpha = new Uint8Array(W * H), labels = new Int8Array(W * H).fill(-1)
    for (let y = 10; y < 110; y++) for (let x = 50; x < 70; x++) { alpha[y * W + x] = 255; labels[y * W + x] = 1 }
    for (let y = 20; y < 32; y++) for (let x = 70; x < 115; x++) { alpha[y * W + x] = 255; labels[y * W + x] = 0 }
    const parts = [{ part: 'upperarm_f' }, { part: 'core' }]
    const bent = bindParts({ width: W, height: H, data: alpha }, labels, parts, [
      { name: 'chest', parent: null, from: [60, 110], to: [60, 20] },
      { name: 'upperarm_f', parent: 'chest', from: [70, 26], to: [112, 26] },
    ])!
    const rest = bent.bend({}), moved = bent.bend({ upperarm_f: 60 })
    let unmoved = 0, far = 0
    for (let i = 0; i < rest.length / 2; i++) {
      const d = Math.hypot(moved[i * 2] - rest[i * 2], moved[i * 2 + 1] - rest[i * 2 + 1])
      if (d < 1e-6) unmoved++
      if (d > 20) far++
    }
    expect(far).toBeGreaterThan(0)              // the hand end swung
    expect(unmoved).toBeGreaterThan(10)         // the whole body mesh stayed
    expect(bent.uvs.length).toBe(rest.length)
    expect(Math.max(...bent.triangles)).toBe(rest.length / 2 - 1)
  })
})

