import { describe, it, expect } from 'vitest'
import {
  SIZE, hasButtons, mapEdges, nextOf, autoLayout, placeAll, edgePath, edgeEnds, mapBounds, openingView, zoomViewAt, choiceHeight,
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
