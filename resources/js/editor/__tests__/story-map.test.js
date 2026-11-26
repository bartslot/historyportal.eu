import { describe, it, expect, vi } from 'vitest'
import {
  SIZE, hasButtons, mapEdges, nextOf, autoLayout, placeAll, edgePath, edgeEnds, mapBounds, openingView, zoomViewAt, choiceHeight, storyMap,
  nearestScene, springStep, portPoint, edgeVectors, snapPoint, easeOutBack, cardsInRect, edgeDeletion, minimapFrame, GRID,
} from '../story-map.js'

const scene = (id, number, extra = {}) => ({ id, number, name: `S${id}`, kind: 'narration', image: null, ending: false, links: [], prompt: '', canChoose: true, ...extra })

// Venice → choice (Sail | Stay) → Sail goes to 3, Stay to 4; 3 goes on to 4 in the list; 4 ends.
const story = () => [
  scene(1, 1),
  scene(2, 2, { links: [{ label: 'Sail', to: 3 }, { label: 'Stay', to: 4 }] }),
  scene(3, 3),
  scene(4, 4, { ending: true }),
]

describe('story map: what the lines are', () => {
  it('reads links the way the player does', () => {
    const edges = mapEdges(story())
    expect(edges.map((e) => [e.kind, e.from.id, e.from.index ?? null, e.to])).toEqual([
      ['next', 1, null, 2],
      ['attach', 2, null, 2],
      ['choice', 2, 0, 3],
      ['choice', 2, 1, 4],
      ['next', 3, null, 4],
    ])
  })

  it('a single link without words is a jump, not a choice card', () => {
    const s = [scene(1, 1, { links: [{ label: '', to: 3 }] }), scene(2, 2), scene(3, 3)]
    expect(hasButtons(s[0])).toBe(false)
    expect(mapEdges(s)[0]).toMatchObject({ kind: 'jump', to: 3 })
    expect(nextOf(s[0])).toBe(3)
  })

  it('a single labelled link is a choice card with one row', () => {
    expect(hasButtons(scene(1, 1, { links: [{ label: 'Go on', to: 2 }] }))).toBe(true)
  })

  it('a choice with no scene yet draws no line, and the last scene has nowhere to go', () => {
    const s = [scene(1, 1, { links: [{ label: 'A', to: null }, { label: 'B', to: 2 }] }), scene(2, 2)]
    const edges = mapEdges(s)
    expect(edges.find((e) => e.key === 'c1-0').to).toBeNull()
    expect(edges.some((e) => e.from.id === 2)).toBe(false)
  })

  it('names where a scene goes in setSceneNext words', () => {
    expect(nextOf(scene(1, 1))).toBe('next')
    expect(nextOf(scene(1, 1, { ending: true }))).toBe('end')
  })
})

describe('story map: laying it out', () => {
  it('puts each step in a column of its own, the choice card between a scene and its targets', () => {
    const l = autoLayout(story())
    expect(l.scenes[1][0]).toBe(0)
    expect(l.scenes[2][0]).toBeGreaterThan(l.scenes[1][0])
    expect(l.choices[2][0]).toBeGreaterThan(l.scenes[2][0])
    expect(l.scenes[3][0]).toBeGreaterThan(l.choices[2][0])
    // Scene 3 goes on to 4 in the list: 4 is a column further on.
    expect(l.scenes[4][0]).toBeGreaterThan(l.scenes[3][0])
    // Two endings of one choice card sit in one column, one under the other, never on top of each other.
    const two = story(); two[2].ending = true
    const t = autoLayout(two)
    expect(t.scenes[4][0]).toBe(t.scenes[3][0])
    expect(Math.abs(t.scenes[4][1] - t.scenes[3][1])).toBeGreaterThanOrEqual(SIZE.sceneH)
  })

  it('never puts a card in the column of the card it comes from', () => {
    // 1 offers A (to 2) and B (to 3); 2 jumps to 3: 3 goes a column past 2.
    const s = [scene(1, 1, { links: [{ label: 'A', to: 2 }, { label: 'B', to: 3 }] }), scene(2, 2, { links: [{ label: '', to: 3 }] }), scene(3, 3)]
    const l = autoLayout(s)
    expect(l.scenes[3][0]).toBeGreaterThan(l.scenes[2][0])
  })

  it('survives a loop back to an earlier scene', () => {
    const s = [scene(1, 1), scene(2, 2, { links: [{ label: 'Again', to: 1 }, { label: 'On', to: 3 }] }), scene(3, 3)]
    const l = autoLayout(s)
    expect(l.scenes[1][0]).toBe(0)
    expect(l.scenes[3][0]).toBeGreaterThan(l.choices[2][0])
  })

  it('places a scene nothing reaches as well', () => {
    const s = [scene(1, 1, { ending: true }), scene(2, 2)]
    const l = autoLayout(s)
    expect(l.scenes[1]).toBeDefined()
    expect(l.scenes[2]).toBeDefined()
    expect(l.scenes[2]).not.toEqual(l.scenes[1])
  })

  it('keeps what was saved and finds room for a new card', () => {
    const s = story()
    const saved = { scenes: { 1: [0, 0], 2: [300, 0], 3: [900, 0], 4: [900, 120] }, choices: { 2: [600, 0] } }
    const s5 = [...s.slice(0, 3), scene(5, 4), { ...s[3], number: 5 }]
    const l = placeAll(s5, saved)
    expect(l.scenes[1]).toEqual([0, 0])
    expect(l.choices[2]).toEqual([600, 0])
    // Scene 5 follows scene 3 in the list: to its right, clear of everything.
    expect(l.scenes[5][0]).toBeGreaterThan(900)
  })

  it('lays out the whole map when nothing was saved', () => {
    expect(placeAll(story(), null)).toEqual(autoLayout(story()))
    expect(placeAll(story(), { scenes: {}, choices: {} })).toEqual(autoLayout(story()))
  })

  it('a new choice card goes to the right of its scene', () => {
    const s = story()
    const l = placeAll(s, { scenes: { 1: [0, 0], 2: [300, 0], 3: [900, 0], 4: [900, 120] }, choices: {} })
    expect(l.choices[2][0]).toBe(300 + SIZE.sceneW + SIZE.colGap)
  })
})

describe('story map: drawing', () => {
  it('runs a line from a choice row to the scene it leads to', () => {
    const s = story()
    const l = { scenes: { 1: [0, 0], 2: [300, 0], 3: [900, 0], 4: [900, 200] }, choices: { 2: [600, 0] } }
    const e = mapEdges(s).find((x) => x.key === 'c2-1')
    const [a, b] = edgeEnds(e, l)
    expect(a).toEqual([600 + SIZE.choiceW, SIZE.choiceHead + SIZE.rowH + SIZE.rowH / 2])
    expect(b).toEqual([900, 200 + SIZE.sceneH / 2])
    expect(edgePath(a, b)).toMatch(/^M840 104 C/)
  })

  it('a backwards line swings out instead of folding', () => {
    const d = edgePath([500, 0], [100, 0])
    expect(Number(d.match(/C(-?[\d.]+)/)[1])).toBeGreaterThan(500)
  })

  it('opens a long story on its first scenes, a short one whole', () => {
    const wide = { x: 0, y: 0, w: 12000, h: 200 }
    const v = openingView(wide, 1200, 800, [0, 0])
    expect(v.z).toBe(1)
    expect(v.x).toBeGreaterThan(0)
    const small = mapBounds(story(), autoLayout(story()))
    expect(openingView(small, 1600, 900, [0, 0]).z).toBe(1)
  })

  it('zooms around the pointer', () => {
    const v = zoomViewAt({ z: 1, x: 0, y: 0 }, 2, 100, 100)
    expect(v).toEqual({ z: 2, x: -100, y: -100 })
  })

  it('a choice card is as tall as its rows', () => {
    expect(choiceHeight(story()[1])).toBe(SIZE.choiceHead + 2 * SIZE.rowH + SIZE.choicePad)
  })
})

describe('story map: top to bottom', () => {
  it('lays the story out downwards, a choice card under its scene and its scenes under that', () => {
    const l = autoLayout(story(), 'tb')
    expect(l.scenes[1][1]).toBe(0)
    expect(l.scenes[2][1]).toBeGreaterThan(l.scenes[1][1])
    expect(l.choices[2][1]).toBeGreaterThan(l.scenes[2][1])
    expect(l.scenes[3][1]).toBeGreaterThan(l.choices[2][1])
    // Two endings of one step sit side by side, never on top of each other.
    const two = story(); two[2].ending = true
    const t = autoLayout(two, 'tb')
    expect(t.scenes[4][1]).toBe(t.scenes[3][1])
    expect(Math.abs(t.scenes[4][0] - t.scenes[3][0])).toBeGreaterThanOrEqual(SIZE.sceneW)
  })

  it('lines leave a scene at its foot and arrive at the head; choice rows still leave on the right', () => {
    const l = { scenes: { 1: [0, 0], 3: [0, 300] }, choices: { 1: [0, 100] } }
    expect(portPoint(l, null, { type: 'out', id: 1 }, 'tb')).toEqual([SIZE.sceneW / 2, SIZE.sceneH])
    expect(portPoint(l, null, { type: 'in', id: 3 }, 'tb')).toEqual([SIZE.sceneW / 2, 300])
    expect(portPoint(l, null, { type: 'choice-in', id: 1 }, 'tb')).toEqual([SIZE.choiceW / 2, 100])
    expect(portPoint(l, null, { type: 'choice', id: 1, index: 0 }, 'tb')[0]).toBe(SIZE.choiceW)
    const [va, vb] = edgeVectors({ from: { type: 'choice', id: 1, index: 0 } }, 'tb')
    expect([va, vb]).toEqual([[1, 0], [0, 1]])
    // Straight down: both handles run downwards.
    expect(edgePath([0, 0], [0, 200], [0, 1], [0, 1])).toBe('M0 0 C0 100 0 100 0 200')
  })

  it('a new scene goes under what leads to it', () => {
    const s = story()
    const l = placeAll([...s.slice(0, 3), scene(5, 4), { ...s[3], number: 5 }], { scenes: { 1: [0, 0], 2: [0, 120], 3: [0, 400], 4: [300, 400] }, choices: { 2: [0, 220] } }, 'tb')
    expect(l.scenes[5][1]).toBeGreaterThan(400)
  })

  it('switching ways while cards land stops them, so nothing is saved under the new way', async () => {
    const calls = []
    const wire = { call: vi.fn(async (method, ...args) => { calls.push([method, ...args]); return { scenes: story(), layout: { scenes: {}, choices: {} }, layoutTb: { scenes: {}, choices: {} } } }) }
    const m = storyMap()
    m.$wire = wire; m.$nextTick = () => {}; m.$refs = {}; m.open = true
    m.dir = 'tb'
    await m.reload()
    const tidying = m.tidy()
    m.setDir('lr')
    await tidying
    expect(calls.some((c) => c[0] === 'saveStoryMapLayout')).toBe(false)
    expect(m.layout).toEqual(autoLayout(story(), 'lr'))
  })

  it('each way keeps its own cards, and saves under its own name', async () => {
    const calls = []
    const wire = { call: vi.fn(async (method, ...args) => { calls.push([method, ...args]); return { scenes: story(), layout: { scenes: { 1: [5, 5] }, choices: {} }, layoutTb: { scenes: {}, choices: {} } } }) }
    const m = storyMap()
    m.$wire = wire; m.$nextTick = () => {}; m.open = true
    m.dir = 'lr'
    await m.reload()
    expect(m.layout.scenes[1]).toEqual([5, 5])
    m.setDir('tb')
    expect(m.dir).toBe('tb')
    expect(m.layout).toEqual(autoLayout(story(), 'tb'))
    await m.saveLayout()
    expect(calls.at(-1)[2]).toBe('tb')
    m.setDir('lr')
    expect(m.layout.scenes[1]).toEqual([5, 5])
  })
})

describe('story map: magnetic, elastic, the grid', () => {
  const layout = { scenes: { 1: [0, 0], 2: [400, 0], 3: [400, 200] }, choices: {} }
  const s3 = [scene(1, 1), scene(2, 2), scene(3, 3)]

  it('pulls a dragged line onto the nearest scene within reach, never its own', () => {
    expect(nearestScene(s3, layout, [380, 30], 72)).toBe(2)
    expect(nearestScene(s3, layout, [380, 150], 72)).toBe(3)
    expect(nearestScene(s3, layout, [330, 30], 40)).toBeNull()
    expect(nearestScene(s3, layout, [100, 30], 72, 1)).toBeNull()
    expect(nearestScene(s3, layout, [100, 30], 72)).toBe(1)
  })

  it('the spring overshoots a little and comes to rest on its goal', () => {
    let st = { tip: [0, 0], vel: [0, 0] }
    let max = 0
    for (let i = 0; i < 200; i++) { st = springStep(st.tip, st.vel, [100, 0]); max = Math.max(max, st.tip[0]) }
    expect(max).toBeGreaterThan(100)
    expect(st.tip[0]).toBeCloseTo(100, 1)
  })

  it('a card lands on the grid, with a small overshoot on the way', () => {
    expect(snapPoint([13, -13])).toEqual([GRID, -GRID])
    expect(snapPoint([11, 35])).toEqual([0, 24])
    expect(easeOutBack(0)).toBeCloseTo(0)
    expect(easeOutBack(1)).toBeCloseTo(1)
    expect(Math.max(...[0.6, 0.7, 0.8, 0.9].map(easeOutBack))).toBeGreaterThan(1)
  })

  it('a box picks the cards it touches', () => {
    const s = story()
    const l = { scenes: { 1: [0, 0], 2: [300, 0], 3: [900, 0], 4: [900, 200] }, choices: { 2: [600, 0] } }
    expect(cardsInRect(s, l, { x: 250, y: -10, w: 400, h: 40 })).toEqual([['scenes', 2], ['choices', 2]])
    expect(cardsInRect(s, l, { x: 0, y: 500, w: 10, h: 10 })).toEqual([])
  })

  it('deleting a line: a choice waits for a scene, a jump goes on to the next, the next ends the lesson', () => {
    const edges = mapEdges(story())
    expect(edgeDeletion(edges.find((e) => e.key === 'c2-1'))).toEqual({ method: 'saveSceneLink', args: [2, 1, 'to', null], undo: { method: 'saveSceneLink', args: [2, 1, 'to', 4] } })
    expect(edgeDeletion(edges.find((e) => e.key === 'n1'))).toEqual({ method: 'setSceneNext', args: [1, 'end'], undo: { method: 'setSceneNext', args: [1, 'next'] } })
    expect(edgeDeletion(edges.find((e) => e.key === 'a2'))).toBeNull()
    const j = mapEdges([scene(1, 1, { links: [{ label: '', to: 3 }] }), scene(2, 2), scene(3, 3)])[0]
    expect(edgeDeletion(j)).toEqual({ method: 'setSceneNext', args: [1, 'next'], undo: { method: 'setSceneNext', args: [1, 3] } })
  })

  it('the minimap fits the whole story, centred', () => {
    const f = minimapFrame({ x: 0, y: 0, w: 1000, h: 100 }, 200, 100, 0)
    expect(f.s).toBeCloseTo(0.2)
    expect(f.oy).toBeCloseTo(40)
    expect(f.ox).toBeCloseTo(0)
  })
})

describe('story map: saving and undo', () => {
  const make = (wire) => {
    const m = storyMap()
    m.$wire = wire
    m.$nextTick = () => {}
    m.open = true
    return m
  }
  const payload = (scenes) => ({ scenes, layout: { scenes: {}, choices: {} } })

  it('a change that failed stays "Not saved" and cannot be undone', async () => {
    const wire = { call: vi.fn(async (method) => { if (method === 'setSceneNext') throw new Error('500'); return payload(story()) }) }
    const m = make(wire)
    await m.reload()
    await m.setNext(1, 'end')
    expect(m.saveState).toBe('failed')
    expect(m.undoStack).toHaveLength(0)
  })

  it('undoing Add choices puts back the jump the scene had', async () => {
    const calls = []
    const wire = { call: vi.fn(async (method, ...args) => { calls.push([method, ...args]); return payload([scene(1, 1, { links: [{ label: '', to: 3 }] }), scene(2, 2), scene(3, 3)]) }) }
    const m = make(wire)
    await m.reload()
    await m.addChoices(1)
    calls.length = 0
    await m.undo()
    expect(calls.filter((c) => c[0] !== 'storyMap')).toEqual([['removeSceneChoices', 1], ['setSceneNext', 1, 3]])
  })

  it('a line dragged out of a scene adds a choice there, and undo puts the old links back', async () => {
    const calls = []
    const wire = { call: vi.fn(async (method, ...args) => { calls.push([method, ...args]); return payload([scene(1, 1, { links: [{ label: '', to: 3 }] }), scene(2, 2), scene(3, 3)]) }) }
    const m = make(wire)
    await m.reload()
    await m.rewire({ type: 'scene', id: 1 }, 2)
    expect(calls).toContainEqual(['addSceneChoiceTo', 1, 2])
    calls.length = 0
    await m.undo()
    expect(calls.filter((c) => c[0] !== 'storyMap')).toEqual([['restoreSceneLinks', 1, [{ label: '', to: 3 }], false, '']])
  })

  it('Delete on a picked line removes it, and undo puts it back', async () => {
    const calls = []
    const wire = { call: vi.fn(async (method, ...args) => { calls.push([method, ...args]); return payload(story()) }) }
    const m = make(wire)
    await m.reload()
    m.edge = 'c2-0'
    m.keydown({ key: 'Delete', target: document.body, stopPropagation: vi.fn(), preventDefault: vi.fn() })
    await new Promise((r) => setTimeout(r, 0))
    expect(calls).toContainEqual(['saveSceneLink', 2, 0, 'to', null])
    expect(m.edge).toBeNull()
    calls.length = 0
    await m.undo()
    expect(calls).toContainEqual(['saveSceneLink', 2, 0, 'to', 3])
  })

  it('an undo or a grab while cards land stops them, so nothing writes over it', async () => {
    const wire = { call: vi.fn(async () => payload(story())) }
    const m = make(wire)
    await m.reload()
    const start = [...m.layout.scenes[1]]
    const landing = m.settle([['scenes', 1, [start[0] + 480, start[1]]]])
    m.undoStack.push({ layout: { scenes: { 1: start }, choices: {} } })
    await m.undo()
    expect(await landing).toBe(false)
    expect(m.layout.scenes[1]).toEqual(start)
  })

  it('keeps the scene editor away from keys while the map is open', () => {
    const m = make({ call: vi.fn() })
    const ev = { key: 'Delete', target: document.body, stopPropagation: vi.fn(), preventDefault: vi.fn() }
    m.keydown(ev)
    expect(ev.stopPropagation).toHaveBeenCalled()
  })
})
