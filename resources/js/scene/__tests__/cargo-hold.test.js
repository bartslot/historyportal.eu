import { describe, it, expect, vi } from 'vitest'
import {
  readHold, unitsPerZone, gridFor, cellRects, piecesOf, placeCargo, stripLength, draughtFor, nearlyFull, zoomedPlace,
} from '../cargo-hold.js'
import { cargoOf, realPicks } from '../team-hold.js'
import { TeamGame } from '../TeamGame.js'

// Two decks of the painted hold, the upper one twice as wide as it is tall.
const zones = [{ x: 20, y: 40, w: 60, h: 15 }, { x: 22, y: 57, w: 56, h: 15 }]

describe('the hold: points become compartments', () => {
  it('shares the capacity over the zones by area, always adding up', () => {
    expect(unitsPerZone(zones, 16)).toEqual([8, 8])
    expect(unitsPerZone(zones, 17).reduce((a, b) => a + b)).toBe(17)
    expect(unitsPerZone([{ x: 0, y: 0, w: 30, h: 10 }, { x: 0, y: 0, w: 10, h: 10 }], 8)).toEqual([6, 2])
    expect(unitsPerZone([], 16)).toEqual([])
  })

  it('lays units out as near-square cells', () => {
    expect(gridFor(8, 8)).toEqual({ rows: 1, cols: 8 })     // a long low deck: one row
    expect(gridFor(4, 1)).toEqual({ rows: 2, cols: 2 })     // a square box: 2 x 2
  })

  it('gives one cell per unit, inside its zone, in strip order', () => {
    const cells = cellRects(zones, 16, 16 / 9)
    expect(cells).toHaveLength(16)
    cells.slice(0, 8).forEach(c => {
      expect(c.x).toBeGreaterThanOrEqual(20)
      expect(c.x + c.w).toBeLessThanOrEqual(80.01)
      expect(c.y).toBe(40)
    })
    expect(cells[8].y).toBe(57)
  })

  it('draws a run that crosses a row edge as two pieces', () => {
    const cells = cellRects(zones, 16, 16 / 9)
    expect(piecesOf(0, 3, cells)).toHaveLength(1)
    const split = piecesOf(6, 3, cells)
    expect(split).toHaveLength(2)
    expect(split[0].w).toBeCloseTo(cells[6].w * 2, 1)
  })
})

describe('the hold: where cargo goes', () => {
  const c = (key, cost) => ({ key, cost })

  it('packs cargo in load order, fixed items first', () => {
    const at = placeCargo([c('f0', 3), c('f1', 1), c('i0', 3)], 16)
    expect([...at]).toEqual([['f0', 0], ['f1', 3], ['i0', 4]])
  })

  it('keeps cargo in its place and leaves a gap when one comes out', () => {
    const first = placeCargo([c('f0', 3), c('i0', 2), c('i1', 3)], 16)
    const after = placeCargo([c('f0', 3), c('i1', 3)], 16, first)
    expect(after.get('i1')).toBe(5)              // did not slide into the gap
    const refill = placeCargo([c('f0', 3), c('i1', 3), c('i2', 1)], 16, after)
    expect(refill.get('i2')).toBe(3)             // the first free run: the old gap
    expect([...first]).toEqual([['f0', 0], ['i0', 3], ['i1', 5]])   // input untouched
  })

  it('packs tight again when no free run is long enough, so a load within capacity always fits', () => {
    // gaps of 1 and 2 units, 3 free in all: a 3-unit item still goes in
    const prev = new Map([['a', 0], ['b', 2], ['d', 5]])
    const at = placeCargo([c('a', 2), c('b', 2), c('d', 3), c('e', 3)], 10, prev)
    expect([...at.values()]).toEqual([0, 2, 4, 7])
  })

  it('gives free cargo no units and lets the real ship run over capacity', () => {
    expect(placeCargo([c('x', 0)], 4).get('x')).toBe(null)
    expect(stripLength([c('a', 10), c('b', 11)], 16)).toBe(21)
    expect(stripLength([c('a', 3)], 16)).toBe(16)
  })

  it('keeps each team in its own hold', () => {
    const memory = new Map()
    memory.set(0, placeCargo([c('i0', 2), c('i1', 2)], 8))
    memory.set(1, placeCargo([c('i1', 2)], 8))
    expect(memory.get(0).get('i1')).toBe(2)
    expect(memory.get(1).get('i1')).toBe(0)
  })
})

describe('the hold: the ship sits lower as it fills', () => {
  it('maps the load to a draught, from riding high to deep', () => {
    expect(draughtFor(0, 16, 0.05)).toBe(0)
    expect(draughtFor(8, 16, 0.05)).toBe(0.025)
    expect(draughtFor(16, 16, 0.05)).toBe(0.05)
  })

  it('clamps: never past full, never above empty, nothing for a broken capacity', () => {
    expect(draughtFor(21, 16, 0.05)).toBe(0.05)
    expect(draughtFor(-3, 16, 0.05)).toBe(0)
    expect(draughtFor(4, 0, 0.05)).toBe(0)
    expect(draughtFor(16, 16, 9)).toBe(1)
  })

  it('tints the bar near full', () => {
    expect(nearlyFull(14, 16)).toBe(false)
    expect(nearlyFull(15, 16)).toBe(true)
    expect(nearlyFull(17, 16)).toBe(true)
  })
})

describe('the hold config', () => {
  it('reads numbers as numbers and drops empty zones', () => {
    const h = readHold({ ship: '/s.webp', zones: [{ x: '10', y: 5, w: 20, h: 10 }, { x: 1, y: 1, w: 0, h: 5 }], draught: 'x' })
    expect(h.zones).toEqual([{ x: 10, y: 5, w: 20, h: 10 }])
    expect(h.draught).toBe(0.05)
  })

  it('zooms the reveal ship on its hold', () => {
    const p = zoomedPlace(readHold({ zones }))
    expect(p.h).toBeGreaterThan(100)
  })
})

describe('a team\'s cargo', () => {
  const items = [{ name: 'Rijst', cost: 3, image: '/r.webp', real: true }, { name: 'Touw', cost: 2 }]
  const fixed = [{ name: 'Water', cost: 3 }]

  it('lists the fixed items first, then the picks in load order', () => {
    expect(cargoOf(new Set([1, 0]), items, fixed).map(c => [c.key, c.fixed ?? false])).toEqual([['f0', true], ['i1', false], ['i0', false]])
  })

  it('knows what the real expedition carried', () => {
    expect([...realPicks(items)]).toEqual([0])
  })
})

describe('TeamGame as a ship\'s hold', () => {
  const hold = { ship: '/ship.webp', backdrop: '/plate.webp', zones, aspect: 16 / 9 }
  const fixed = [{ name: 'Watervaten', cost: 3, image: '/w.webp' }, { name: 'Kompas', cost: 1 }]
  const items = [
    { name: 'Rijst', cost: 3, image: '/r.webp', why: 'Veel eten?', real: true },
    { name: 'Touw', cost: 2, image: '/t.webp' },
    { name: 'Hout', cost: 3 },
  ]
  const mount = (extra = {}, solo = false) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const game = new TeamGame(host)
    game.show({ config: { mode: 'budget', teams: 2, capacity: 9, fixed, items, hold, ...extra }, solo, onComplete: vi.fn() })
    return { host, game }
  }
  const card = (host, i) => host.querySelector(`[data-cargo-card="${i}"]`)
  const inHold = (host) => [...host.querySelectorAll('[data-hold-stage] [data-cargo]')].filter(p => !p.hasAttribute('aria-hidden')).map(p => p.dataset.cargo)

  it('starts with the fixed items in the hold, marked fixed', () => {
    const { host } = mount()
    host.querySelectorAll('button').forEach(b => { if (b.textContent === 'Start') b.click() })
    expect(inHold(host)).toEqual(['f0', 'f1'])
    expect(host.querySelectorAll('[data-hold-stage] [data-fixed]')).toHaveLength(2)
    expect(host.textContent).toContain('4 / 9')
  })

  it('loads on a tap, unloads from the hold, keeps each team\'s hold, and sinks the ship', () => {
    const { host, game } = mount()
    host.querySelectorAll('button').forEach(b => { if (b.textContent === 'Start') b.click() })
    const draught = () => Number(host.querySelector('[data-hold-stage] [data-draught]').dataset.draught)
    const empty = draught()
    card(host, 0).click()
    expect(inHold(host)).toContain('i0')
    expect(draught()).toBeGreaterThan(empty)
    expect(card(host, 0).getAttribute('aria-pressed')).toBe('true')

    const team = (i) => host.querySelectorAll('[data-team-card] > button')[i]
    team(1).click()
    expect(inHold(host)).toEqual(['f0', 'f1'])
    expect(host.querySelectorAll('[data-team-card]')[1].hasAttribute('data-active')).toBe(true)
    team(0).click()
    expect(inHold(host)).toContain('i0')
    // the team card shows it loaded; its tile takes it out again
    host.querySelector('[data-team-card] [data-cargo-tile="0"]').click()
    expect(inHold(host)).not.toContain('i0')
    card(host, 0).click()

    host.querySelector('[data-hold-stage] [data-cargo="i0"]:not([aria-hidden])').click()
    expect(inHold(host)).not.toContain('i0')
    expect(game.teamStore().picked(0).size).toBe(0)
  })

  it('refuses an overload with the text and keeps the hold as it was', () => {
    const { host } = mount()
    host.querySelectorAll('button').forEach(b => { if (b.textContent === 'Start') b.click() })
    card(host, 0).click()                 // 7 of 9
    card(host, 2).click()                 // 10 > 9
    expect(host.querySelector('[role=alert]').textContent).toContain('Team 1')
    expect(inHold(host)).not.toContain('i2')
  })

  it('shows the cost as dots and the name on hover, never as text on the strip', () => {
    const { host } = mount()
    host.querySelectorAll('button').forEach(b => { if (b.textContent === 'Start') b.click() })
    expect(card(host, 0).getAttribute('aria-label')).toBe('Rijst, costs 3 points')
    expect(card(host, 0).dataset.tooltip).toBe('Rijst: Veel eten?')
    expect(card(host, 0).textContent).toBe('')
  })

  it('reveals a results sheet: one column per team and the real expedition, the ship on top', () => {
    const { host } = mount()
    host.querySelectorAll('button').forEach(b => { if (b.textContent === 'Start') b.click() })
    card(host, 1).click()
    host.querySelectorAll('button').forEach(b => { if (b.textContent === 'Reveal') b.click() })
    const cols = [...host.querySelectorAll('[data-team-card]')].map(c => c.dataset.teamCard)
    expect(cols).toEqual(['Team 1', 'Team 2', 'The real expedition'])
    expect(host.querySelector('table')).toBeNull()
    host.querySelector('[data-team-card="The real expedition"] > button').click()
    expect(inHold(host)).toContain('i0')
    expect(host.textContent).toContain('Available cargo')
  })

  it('plays solo: one hold, no tabs, then the reveal', () => {
    const { host } = mount({}, true)
    expect(host.querySelector('[role=tab]')).toBeNull()
    card(host, 1).click()
    expect(inHold(host)).toContain('i1')
    host.querySelectorAll('button').forEach(b => { if (b.textContent === 'Reveal') b.click() })
    expect([...host.querySelectorAll('[data-team-card]')].map(c => c.dataset.teamCard)).toEqual(['You', 'The real expedition'])
  })

  it('falls back to the cards when there is no ship, or the teacher picks the cards', () => {
    expect(mount({ hold: {} }).game.cfg.presentation).toBe('grid')
    expect(mount({ presentation: 'grid' }).game.cfg.presentation).toBe('grid')
    expect(mount().game.cfg.presentation).toBe('hold')
  })
})
