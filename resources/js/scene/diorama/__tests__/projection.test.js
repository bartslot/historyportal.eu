import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import golden from '../__fixtures__/blender-golden.json'
import {
  projectPoint, resolveFloors, cellToWorld, hitTest, placeItem, screenHeight,
  cellForScreenHeight, drawOrder, snapCell, viewAngleDeg, plateToStage, stageToPlate,
} from '../projection.js'

// The documented example the PHP validator also accepts (docs/diorama-example.json).
const example = JSON.parse(readFileSync(resolve(__dirname, '../../../../../docs/diorama-example.json'), 'utf8'))

const PX = 0.5   // Blender and we must agree to half a pixel on a 2560 px plate

describe('projectPoint matches Blender', () => {
  for (const { name, camera, points } of golden.cases) {
    it(`${name}: all ${points.length} feet and heads land where Blender puts them`, () => {
      for (const p of points) {
        const hit = projectPoint(camera, p.world)
        expect(hit, JSON.stringify(p)).not.toBeNull()
        expect(Math.abs(hit.u - p.u), `${p.floor} ${p.distance_m} m ${p.part} u`).toBeLessThan(PX)
        expect(Math.abs(hit.v - p.v), `${p.floor} ${p.distance_m} m ${p.part} v`).toBeLessThan(PX)
        expect(hit.depth).toBeCloseTo(p.depth, 4)   // Blender works in 32-bit floats
      }
    })
  }

  it('one absolute: hp1, feet of a figure 4 m ahead on the quay', () => {
    // v = horizon + f × eye height / depth = 480 + (28.254/36 × 2560) × 1.6 / 4
    const { camera } = golden.cases[0]
    const feet = golden.cases[0].points.find(p => p.floor === 'quay' && p.distance_m === 4 && p.side_m === 0 && p.part === 'feet')
    expect(feet.v).toBeCloseTo(480 + 2009.173 * 1.6 / 4, 1)
    expect(projectPoint(camera, feet.world).v).toBeCloseTo(1283.67, 1)
  })

  it('a 1.75 m figure is as tall on screen as Blender says, on every floor', () => {
    for (const { camera, points } of golden.cases) {
      for (const feet of points.filter(p => p.part === 'feet')) {
        const head = points.find(p => p.part === 'head' && p.floor === feet.floor && p.distance_m === feet.distance_m && p.side_m === feet.side_m)
        expect(screenHeight(camera, 1.75, feet.depth)).toBeCloseTo(feet.v - head.v, 2)
      }
    }
  })

  it('a point behind the camera has no pixel', () => {
    const { camera } = golden.cases[0]
    expect(projectPoint(camera, [0, -10, 0])).toBeNull()
  })
})

describe('hitTest: pointer → floor cell', () => {
  it('finds the floor point Blender projected, on quay, deck above eye height, and sea', () => {
    for (const { camera, points } of golden.cases) {
      for (const p of points.filter(pt => pt.part === 'feet')) {
        const z = p.world[2]
        const floors = new Map([[p.floor, { id: p.floor, origin: [0, 0], z, cellM: 1, cells: [[-100, -100], [100, 100]] }]])
        const hit = hitTest(camera, floors, p.u, p.v)
        expect(hit?.floor).toBe(p.floor)
        expect(hit.world[0]).toBeCloseTo(p.world[0], 3)
        expect(hit.world[1]).toBeCloseTo(p.world[1], 3)
      }
    }
  })

  it('above the horizon of a floor below the eye there is no floor: the figure does not fly', () => {
    const camera = golden.cases[0].camera
    const floors = resolveFloors(example)
    expect(hitTest(camera, floors, 1280, 100, { only: ['quay'] })).toBeNull()
  })

  it('the nearest floor wins, and a floor outside its cells lets the one behind show through', () => {
    const camera = example.camera
    const floors = resolveFloors(example)
    const quayPoint = projectPoint(camera, cellToWorld(floors.get('quay'), [2, 6]))
    expect(hitTest(camera, floors, quayPoint.u, quayPoint.v).floor).toBe('quay')

    const seaPoint = projectPoint(camera, cellToWorld(floors.get('sea'), [40, 100]))
    const hit = hitTest(camera, floors, seaPoint.u, seaPoint.v)
    expect(hit.floor).toBe('sea')
    expect(hit.cell[0]).toBeCloseTo(40, 6)
    expect(hit.cell[1]).toBeCloseTo(100, 6)
  })

  it('dragging a boat never hits its own deck', () => {
    const camera = example.camera
    const floors = resolveFloors(example)
    const deckPoint = projectPoint(camera, cellToWorld(floors.get('boat.deck'), [0, 0]))
    expect(hitTest(camera, floors, deckPoint.u, deckPoint.v).floor).toBe('boat.deck')
    expect(hitTest(camera, floors, deckPoint.u, deckPoint.v, { except: ['boat.deck'] })?.floor).not.toBe('boat.deck')
  })
})

describe('nested floors: a deck rides on its boat', () => {
  it('the deck origin is the boat\'s floor point plus its own offset and height', () => {
    const floors = resolveFloors(example)
    // boat on sea cell [10, 30]: sea origin [0, 20], 0.5 m cells, sea at -1.2 m → [5, 35, -1.2]; deck 2.5 m up
    expect(floors.get('boat.deck').origin).toEqual([5, 35])
    expect(floors.get('boat.deck').z).toBeCloseTo(1.3, 9)
  })

  it('moving the boat moves the sailor standing on its deck', () => {
    const before = cellToWorld(resolveFloors(example).get('boat.deck'), [-3, 0])
    const moved = structuredClone(example)
    moved.items.find(i => i.id === 'boat').cell = [14, 30]
    const after = cellToWorld(resolveFloors(moved).get('boat.deck'), [-3, 0])
    expect(after[0] - before[0]).toBeCloseTo(2, 9)   // 4 sea cells × 0.5 m
    expect(after[1]).toBe(before[1])
  })
})

describe('placement, resize = depth, order', () => {
  const camera = golden.cases[0].camera
  const quay = { id: 'quay', origin: [0, 0], z: 0, cellM: 0.5, cells: [[-12, 0], [12, 40]] }
  const floors = new Map([['quay', quay]])

  it('scale = plate px per source px, so a 1.75 m sailor drawn 700 px tall shows at the right height', () => {
    const item = { floor: 'quay', cell: [0, 8] }   // 4 m ahead of the origin
    const placed = placeItem(camera, floors, item, 400)   // 700 px / 1.75 m
    expect(placed.scale * 700).toBeCloseTo(screenHeight(camera, 1.75, placed.depth), 6)
  })

  it('resizing moves the figure in depth and keeps its world height and screen column', () => {
    const item = { floor: 'quay', cell: [4, 20] }   // 18.65 m out, so 1.5× bigger stays on the quay
    const before = placeItem(camera, floors, item, 400)
    const target = screenHeight(camera, 1.75, before.depth) * 1.5
    const cell = cellForScreenHeight(camera, quay, item, 1.75, target)
    const after = placeItem(camera, floors, { ...item, cell }, 400)

    expect(after.depth).toBeLessThan(before.depth)                               // bigger = nearer
    expect(screenHeight(camera, 1.75, after.depth)).toBeCloseTo(target, 6)       // exactly the size asked
    expect(after.u).toBeCloseTo(before.u, 6)                                     // same column
  })

  it('resizing past the floor edge stops at the edge instead of leaving the grid', () => {
    const cell = cellForScreenHeight(camera, quay, { floor: 'quay', cell: [0, 8] }, 1.75, 50_000)
    expect(cell[1]).toBe(0)
  })

  it('draws far first; equal depth breaks by height on the plate', () => {
    const order = drawOrder([
      { id: 'near', depth: 2, v: 900 }, { id: 'far', depth: 9, v: 600 },
      { id: 'mid_low', depth: 4, v: 800 }, { id: 'mid_high', depth: 4, v: 700 },
    ])
    expect(order.map(p => p.id)).toEqual(['far', 'mid_high', 'mid_low', 'near'])
  })

  it('snaps to quarter cells by default', () => {
    expect(snapCell([3.37, 5.12])).toEqual([3.25, 5])
    expect(snapCell([3.37, 5.12], 1)).toEqual([3, 5])
  })

  it('view angle: 0 at eye level, looking down on the quay, up at a deck above the eye', () => {
    expect(viewAngleDeg(camera, { z: 1.6 }, 5)).toBe(0)
    expect(viewAngleDeg(camera, { z: 0 }, 1.6)).toBeCloseTo(45, 9)
    expect(viewAngleDeg(camera, { z: 2.5 }, 4)).toBeLessThan(0)
  })
})

describe('responsive crop', () => {
  const camera = golden.cases[0].camera

  it('covers a phone stage the way object-fit: cover does, and inverts for the pointer', () => {
    const stage = [390, 844]   // portrait phone: height decides, sides are cropped
    const p = plateToStage(camera, ...stage, { u: 1280, v: 480 })
    expect(p.scale).toBeCloseTo(844 / 1440, 9)
    expect(p.x).toBeCloseTo(195, 9)
    const back = stageToPlate(camera, ...stage, p)
    expect(back.u).toBeCloseTo(1280, 9)
    expect(back.v).toBeCloseTo(480, 9)
  })

  it('a portrait crop centres on the focus column, but never past the plate edge', () => {
    const phone = [390, 844]
    const s = 844 / 1440
    expect(plateToStage(camera, ...phone, { u: 2000, v: 0 }, 2000).x).toBeCloseTo(195, 9)      // focus in the middle of the phone
    expect(plateToStage(camera, ...phone, { u: 2560, v: 0 }, 2500).x).toBeCloseTo(390, 9)      // clamped: the right edge meets the stage edge
    expect(plateToStage(camera, ...phone, { u: 0, v: 0 }, 50).x).toBe(0)                      // clamped on the left
    const back = stageToPlate(camera, ...phone, plateToStage(camera, ...phone, { u: 1800, v: 700 }, 2000), 2000)
    expect(back.u).toBeCloseTo(1800, 9)
    expect(back.v).toBeCloseTo(700, 9)
    expect(s).toBeGreaterThan(0)
  })

  it('a landscape stage ignores the focus: only top and bottom are cropped', () => {
    expect(plateToStage(camera, 1920, 1000, { u: 0, v: 0 }, 2400).x).toBe(0)   // wider than 16:9
  })

  it('a figure keeps its proportions to the plate at any stage size', () => {
    const feet = golden.cases[0].points.find(q => q.part === 'feet' && q.floor === 'quay' && q.distance_m === 4 && q.side_m === 0)
    const head = golden.cases[0].points.find(q => q.part === 'head' && q.floor === 'quay' && q.distance_m === 4 && q.side_m === 0)
    for (const [w, h] of [[1920, 1080], [390, 844], [1024, 1366]]) {
      const f = plateToStage(camera, w, h, feet)
      const top = plateToStage(camera, w, h, head)
      expect((f.y - top.y) / f.scale).toBeCloseTo(feet.v - head.v, 6)
    }
  })
})
