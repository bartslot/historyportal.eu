import { describe, it, expect } from 'vitest'
import {
  finishOrder, raceDecided, finalOrder, crewFrom, ghostLevel, crewText, raceLanes, laneX, nextOpen, CHIP_H, HULL,
  readCrew, saveCrew, clearCrew, readBest, saveBest,
} from '../race.js'

const memory = () => {
  const data = new Map()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)), removeItem: (k) => data.delete(k) }
}

describe('who is out of the harbour first', () => {
  it('keeps the order teams crossed the line', () => {
    let order = finishOrder([], [1, 4, 2, 0], 4)
    expect(order).toEqual([1])
    order = finishOrder(order, [4, 4, 2, 0], 4)
    expect(order).toEqual([1, 0])
    expect(raceDecided(order, 4)).toBe(true)
    expect(raceDecided([0], 1)).toBe(true)
    expect(raceDecided([0], 4)).toBe(false)
  })

  it('a meter of parts that do not add up exactly still crosses the line', () => {
    expect(finishOrder([], [3.9999999999999996], 4)).toEqual([0])
  })

  it('ending the race early ranks the rest by how far they got', () => {
    expect(finalOrder([2], [3, 1, 4, 3.5])).toEqual([2, 3, 0, 1])
    expect(finalOrder([], [2, 2])).toEqual([0, 1])
  })

  it('the turn passes over teams already out', () => {
    expect(nextOpen([1], 3, 1)).toBe(2)
    expect(nextOpen([1, 2], 3, 2)).toBe(0)
    expect(nextOpen([0, 1, 2], 3, 2)).toBe(2)
  })

  it('first crews the Heemskerck, second the Zeehaen', () => {
    expect(crewFrom([2, 0, 1], ['De Haaien', 'Team 2', 'Oranje'])).toEqual({ heemskerck: 'Oranje', zeehaen: 'De Haaien' })
    expect(crewFrom([0], ['Jij'])).toEqual({ heemskerck: 'Jij' })
  })

  it('the 1642 fleet sails the meter in its own time, then waits', () => {
    expect(ghostLevel(0, 25)).toBe(0)
    expect(ghostLevel(12.5, 25)).toBe(0.5)
    expect(ghostLevel(90, 25)).toBe(1)
  })
})

describe('crew names in the lesson text', () => {
  const crew = { heemskerck: 'de Haaien', zeehaen: 'Oranje' }

  it('puts the crews in, with a capital at the start of a sentence', () => {
    expect(crewText('{crew:heemskerck} op de Heemskerck, {crew:zeehaen} op de Zeehaen.', crew))
      .toBe('De Haaien op de Heemskerck, Oranje op de Zeehaen.')
    expect(crewText('Storm! {crew:zeehaen} is weg!', crew)).toBe('Storm! Oranje is weg!')
  })

  it('uses the fallback when there was no race', () => {
    expect(crewText('{crew:zeehaen|de bemanning} roept.', {})).toBe('De bemanning roept.')
    expect(crewText('Waar is {crew:zeehaen}?', {}, 'de bemanning')).toBe('Waar is de bemanning?')
  })

  it('leaves other text and other braces alone', () => {
    expect(crewText('Geen naam hier.', crew)).toBe('Geen naam hier.')
    expect(crewText('{crew:captain} en {x}', crew)).toBe('{crew:captain} en {x}')
    expect(crewText(null, crew)).toBe(null)
  })
})

describe('race lanes', () => {
  const ship = { asset_id: 136, x: 70, y: 58, height: 28, depth: 0.6, foam: 0.5, url: '/s.webp' }

  it('one ship per team, stacked far to near, all on the start line, each its own layer', () => {
    const lanes = raceLanes(ship, 4, { startX: 20 })
    expect(lanes.map(l => l.asset_id)).toEqual(['136-lane0', '136-lane1', '136-lane2', '136-lane3'])
    expect(lanes.every(l => l.x === 20)).toBe(true)
    expect(lanes[0].y).toBeLessThan(lanes[3].y)
    expect(lanes[0].height).toBeLessThan(lanes[3].height)
    expect(lanes[2].foam).toBe(0.5)                     // blend-into-scene and foam come along
  })

  it('no hull covers another lane\'s chip, up to five teams', () => {
    for (let n = 2; n <= 5; n++) {
      const lanes = raceLanes(ship, n)
      lanes.forEach((a, i) => lanes.forEach((b, j) => {
        if (i === j) return
        const shipBottom = a.y + a.height / 2
        const shipTop = shipBottom - a.height * HULL
        const chipTop = b.y + b.height / 2 + 1
        // A lane's own chip sits under its own hull; only other lanes count.
        const overlaps = shipTop < chipTop + CHIP_H && shipBottom > chipTop
        expect(overlaps, `${n} lanes: hull ${i} over chip ${j}`).toBe(false)
      }))
    }
  })

  it('ships stay readable with many teams', () => {
    expect(Math.min(...raceLanes(ship, 8).map(l => l.height))).toBeGreaterThanOrEqual(8 * 0.7)
  })

  it('a lane moves from the start to the finish line with its meter', () => {
    expect(laneX(0, 20, 115)).toBe(20)
    expect(laneX(0.5, 20, 115)).toBe(67.5)
    expect(laneX(2, 20, 115)).toBe(115)
  })
})

describe('kept for this run only', () => {
  it('the crew lives in this tab and goes when cleared', () => {
    const s = memory()
    saveCrew(s, 'ABC', { heemskerck: 'De Haaien', zeehaen: '<b>x</b>'.repeat(20) })
    expect(readCrew(s, 'ABC').heemskerck).toBe('De Haaien')
    expect(readCrew(s, 'ABC').zeehaen.length).toBe(40)
    clearCrew(s, 'ABC')
    expect(readCrew(s, 'ABC')).toEqual({})
    expect(readCrew({ getItem: () => '{bad' }, 'ABC')).toEqual({})
  })

  it('a best time is only replaced by a better one', () => {
    const s = memory()
    expect(saveBest(s, 'L:1', 20.04)).toBe(true)
    expect(saveBest(s, 'L:1', 22)).toBe(false)
    expect(saveBest(s, 'L:1', 18)).toBe(true)
    expect(readBest(s, 'L:1')).toBe(18)
    expect(readBest(s, 'other')).toBe(null)
  })
})
