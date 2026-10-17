// De lading's rules against the plan's acceptance table (classroom-games/plan.md §14).
import { describe, it, expect } from 'vitest'
import {
  catalogueOf, newTeamCargo, totalOf, pointsLeft, addItem, removeItem, toggleCargo, confirmCargo, reopenCargo,
  previewExchange, swapGuard, exchangeCargo, keepCargo, resetExchange, lockDeparture, missingPrompt, differing, pagesOfFour,
  readTimers, flowSeconds, REFUSED,
} from '../cargo-run.js'

// The plan's catalogue (§3-§4).
const cfg = {
  capacity: 16,
  fixed: [{ id: 'water', name: 'Watervaten', cost: 3, tags: ['water'] }, { id: 'compass', name: 'Kompas', cost: 1, tags: ['navigation'] }],
  items: [
    ['rice', 3, 'food'], ['ships_bread', 2, 'food'], ['meat', 2, 'food'], ['spare_sails', 3, 'sails'], ['spare_rope', 2, 'rope'],
    ['spare_timber', 3, 'repair-wood'], ['tools', 1, 'tools'], ['firewood', 2, 'fuel'], ['charts', 1, 'charts'],
    ['paper_ink', 1, 'writing'], ['trade_textiles', 2, 'trade'], ['trade_metal', 1, 'trade'],
  ].map(([id, cost, tag]) => ({ id, name: id, cost, tags: [tag] })),
}
const cat = catalogueOf(cfg)
const load = (ids, confirmed = true) => {
  let s = newTeamCargo('team-a', cat)
  for (const id of ids) s = addItem(s, id, cat).state
  return confirmed ? confirmCargo(s).state : s
}
// Team A of the plan's §6 example: 16/16.
const teamA = ['rice', 'meat', 'spare_sails', 'tools', 'firewood', 'paper_ink']

describe('a new team (§3)', () => {
  it('has water and compass aboard: 4/16, 12 left, nothing confirmed', () => {
    const s = newTeamCargo('team-a', cat)
    expect(s.selected).toEqual(['water', 'compass'])
    expect(totalOf(s.selected, cat)).toBe(4)
    expect(pointsLeft(s, cat)).toBe(12)
    expect(s.confirmed).toBe(false)
  })
})

describe('choosing (§4)', () => {
  it('rejects removing fixed cargo, an unknown item, a duplicate and an overspend, keeping the load', () => {
    const s = load(['rice', 'spare_sails', 'spare_timber', 'meat'], false)   // 4 + 11 = 15
    for (const [r, reason] of [
      [removeItem(s, 'water', cat), REFUSED.fixed],
      [addItem(s, 'cannonballs', cat), REFUSED.unknown],
      [addItem(s, 'rice', cat), REFUSED.duplicate],
      [addItem(s, 'firewood', cat), REFUSED.budget],      // 17 > 16
      [addItem(s, 'water', cat), REFUSED.fixed],
    ]) {
      expect(r.ok).toBe(false)
      expect(r.reason).toBe(reason)
      expect(r.state).toBe(s)
    }
    expect(addItem(s, 'tools', cat).ok).toBe(true)        // exactly 16
  })

  it('recalculates from the catalogue, never from a price that came with the request', () => {
    const s = addItem(newTeamCargo('t', cat), 'rice', { ...cat, budget: 99 }).state
    expect(totalOf(s.selected, cat)).toBe(7)
  })

  it('never changes the state it was given', () => {
    const s = newTeamCargo('t', cat)
    const r = addItem(s, 'rice', cat)
    expect(s.selected).toEqual(['water', 'compass'])
    expect(r.state.selected).toEqual(['water', 'compass', 'rice'])
  })

  it('confirms under budget (no forced spending); a confirmed 4/16 differs from an unsubmitted 4/16', () => {
    const unsubmitted = newTeamCargo('t', cat)
    const confirmed = confirmCargo(unsubmitted).state
    expect(totalOf(confirmed.selected, cat)).toBe(4)
    expect([unsubmitted.confirmed, confirmed.confirmed]).toEqual([false, true])
  })

  it('clears ready when a confirmed load is edited, and the teacher can reopen', () => {
    const s = load(['rice'])
    expect(toggleCargo(s, 'rice', cat).state.confirmed).toBe(false)
    expect(addItem(s, 'meat', cat).state.confirmed).toBe(false)
    expect(reopenCargo(s).state.confirmed).toBe(false)
  })

  it('applies a retried operation once', () => {
    const s = addItem(newTeamCargo('t', cat), 'rice', cat, 'op-1').state
    const again = addItem(s, 'rice', cat, 'op-1')
    expect(again.ok).toBe(true)
    expect(again.state).toBe(s)
    expect(removeItem(s, 'rice', cat, 'op-2').state.selected).not.toContain('rice')
  })
})

describe('the last exchange (§7)', () => {
  it('swaps one out and one in atomically, within the budget, and stores both loads', () => {
    const s = load(teamA)
    expect(previewExchange(s, 'spare_sails', 'spare_timber', cat)).toMatchObject({ ok: true, before: 16, after: 16 })
    const r = exchangeCargo(s, 'spare_sails', 'spare_timber', cat, 'swap-1')
    expect(r.ok).toBe(true)
    expect(r.state.selected).toContain('spare_timber')
    expect(r.state.selected).not.toContain('spare_sails')
    expect(r.state.original).toEqual(s.selected)
    expect(r.state.final).toEqual(r.state.selected)
    expect(r.state.exchange).toEqual({ state: 'swapped', removedId: 'spare_sails', addedId: 'spare_timber' })
  })

  it('rejects papier en inkt for reservehout at 18/16 and changes nothing', () => {
    const s = load(teamA)
    expect(previewExchange(s, 'paper_ink', 'spare_timber', cat)).toMatchObject({ ok: false, reason: REFUSED.budget, after: 18 })
    const r = exchangeCargo(s, 'paper_ink', 'spare_timber', cat)
    expect(r.ok).toBe(false)
    expect(r.state).toBe(s)
    expect(r.state.exchange.state).toBe('open')     // an invalid preview uses no exchange
  })

  it('guards the swap: over 16 the confirm is off and says how many places must come free', () => {
    const s = load(teamA)
    expect(swapGuard(previewExchange(s, 'paper_ink', 'spare_timber', cat), 16)).toEqual({ canSwap: false, over: 2, free: 0 })
    expect(swapGuard(previewExchange(s, 'spare_sails', 'spare_timber', cat), 16)).toEqual({ canSwap: true, over: 0, free: 0 })
    const room = load(['water', 'compass', 'rice', 'tools'])                       // 8/16
    expect(swapGuard(previewExchange(room, 'tools', 'charts', cat), 16)).toEqual({ canSwap: true, over: 0, free: 8 })
    expect(swapGuard(previewExchange(s, 'tools', 'tools', cat), 16)).toEqual({ canSwap: false, over: 0, free: 0 })   // refused, not over
  })

  it('lets unused points pay for a dearer replacement, but never a free extra item', () => {
    const s = load(['rice', 'tools'])                  // 8/16
    expect(exchangeCargo(s, 'tools', 'spare_sails', cat).ok).toBe(true)           // 1 -> 3
    expect(previewExchange(s, 'tools', 'tools', cat).reason).toBe(REFUSED.same)
    expect(previewExchange(s, 'meat', 'spare_sails', cat).reason).toBe(REFUSED.missing)   // nothing out = no swap
  })

  it('applies a double submit once, and refuses a second swap', () => {
    const s = load(teamA)
    const once = exchangeCargo(s, 'spare_sails', 'spare_timber', cat, 'swap-1').state
    expect(exchangeCargo(once, 'spare_sails', 'spare_timber', cat, 'swap-1').state).toBe(once)
    expect(exchangeCargo(once, 'tools', 'charts', cat, 'swap-2').reason).toBe(REFUSED.used)
  })

  it('keeps fixed cargo out of it and asks a confirmed team', () => {
    expect(previewExchange(load(teamA), 'water', 'spare_timber', cat).reason).toBe(REFUSED.fixed)
    expect(previewExchange(load(teamA, false), 'tools', 'charts', cat).reason).toBe(REFUSED.unconfirmed)
  })

  it('"Houden zo" closes the exchange without one; the teacher\'s reset reopens it', () => {
    const kept = keepCargo(load(teamA)).state
    expect(kept.exchange.state).toBe('kept')
    expect(kept.final).toEqual(kept.selected)
    expect(exchangeCargo(kept, 'tools', 'charts', cat).reason).toBe(REFUSED.used)
    const swapped = exchangeCargo(load(teamA), 'spare_sails', 'spare_timber', cat).state
    const reset = resetExchange(swapped).state
    expect(reset.selected).toEqual(load(teamA).selected)
    expect(reset.exchange.state).toBe('open')
  })
})

describe('departure (§8)', () => {
  const teams = [{ id: 'team-1', name: 'A' }, { id: 'team-2', name: 'B' }]

  it('locks every team at one boundary; a confirmed team gets its snapshot, an unconfirmed one none', () => {
    const swapped = exchangeCargo(load(teamA), 'spare_sails', 'spare_timber', cat).state
    const { states, snapshots } = lockDeparture([swapped, load(['rice'], false)], teams, cat, { runId: 'r1', lockedAt: 'now' })
    expect(snapshots[0]).toMatchObject({
      runId: 'r1', teamId: 'team-a', teamName: 'A', phase: 'DEPARTURE_LOCKED', confirmed: true, totalCost: 16,
      catalogueVersion: 'de-lading-draft-1', exchange: { state: 'swapped', removedId: 'spare_sails', addedId: 'spare_timber' },
    })
    expect(snapshots[0].originalItemIds).toContain('spare_sails')
    expect(snapshots[0].finalItemIds).toContain('spare_timber')
    expect(snapshots[0].tags).toEqual(expect.arrayContaining(['water', 'navigation', 'repair-wood', 'tools']))
    expect(snapshots[1]).toMatchObject({ confirmed: false, finalItemIds: [], totalCost: 0 })
    // Late edits are refused.
    expect(addItem(states[1], 'meat', cat).reason).toBe(REFUSED.locked)
    expect(confirmCargo(states[1]).reason).toBe(REFUSED.locked)
    expect(keepCargo(states[0]).reason).toBe(REFUSED.locked)
  })
})

describe('compare (§6)', () => {
  it('prompts with what no CONFIRMED team took, in catalogue order, at most three', () => {
    const a = load(teamA)
    const unconfirmed = load(['ships_bread', 'spare_rope'], false)
    expect(missingPrompt([a, unconfirmed], cat)).toEqual(['ships_bread', 'spare_rope', 'spare_timber'])
  })

  it('asks another question once every item is aboard somewhere', () => {
    const b = load(['ships_bread', 'spare_rope', 'spare_timber', 'charts', 'trade_textiles', 'trade_metal'])
    const c = load(['rice', 'meat', 'spare_sails', 'tools', 'firewood', 'paper_ink'])
    expect(missingPrompt([b, c], cat)).toEqual([])
  })

  it('finds what only one of two ships has, and pages teams by four in their own order', () => {
    expect([...differing(['a', 'b'], ['b', 'c'])]).toEqual(['a', 'c'])
    expect(pagesOfFour(6)).toEqual([[0, 1, 2, 3], [4, 5]])
    expect(pagesOfFour(1)).toEqual([[0]])
  })
})

describe('timing (§2)', () => {
  it('defaults to 20 s / 3 min / 1 / 1 / 20 s = 5:40, every step editable', () => {
    const timers = readTimers({})
    expect(flowSeconds(3, timers)).toBe(340)
    expect(readTimers({ compare: '90', exchange: -5, sail: 9999 })).toEqual({ mission: 20, compare: 90, exchange: 0, sail: 600 })
  })
})
