// De lading on the class screen and solo, screen by screen (plan §3-§8, Bart's mockups 10-15).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TeamGame } from '../TeamGame.js'
import { lockedCargo, clearRun } from '../class-teams.js'

const zones = [{ x: 20.5, y: 61.5, w: 62, h: 9.5 }, { x: 23.5, y: 74, w: 55.5, h: 9.8 }]
const config = (extra = {}) => ({
  mode: 'budget', title: 'De lading', teams: 2, capacity: 9, minutes: 3,
  mission: 'Wat nemen jullie mee?',
  roles: ['Kapitein', 'Bootsman', 'Verkenner', 'Stuurman'],
  hold: { ship: '/ship.webp', backdrop: '/plate.webp', zones, aspect: 16 / 9 },
  fixed: [{ id: 'water', name: 'Watervaten', cost: 3, image: '/w.webp' }, { id: 'compass', name: 'Kompas', cost: 1 }],
  items: [
    { id: 'rice', name: 'Rijst', cost: 3, image: '/r.webp', why: 'Veel eten?', real: true },
    { id: 'rope', name: 'Touw', cost: 2, image: '/t.webp' },
    { id: 'timber', name: 'Hout', cost: 3 },
  ],
  followup: 'Welk pakket willen jullie alsnog meenemen?',
  ...extra,
})

const mount = (extra = {}, solo = false) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const game = new TeamGame(host)
  const onComplete = vi.fn()
  game.show({ config: config(extra), solo, onComplete })
  return { host, game, onComplete }
}
const btn = (host, label) => {
  const b = [...host.querySelectorAll('button')].find(x => x.textContent.trim() === label)
  if (!b) throw new Error(`no button "${label}"`)
  return b
}
/** Setup (names) -> Start -> the mission -> "Load the ship": the pick screen. */
const toPick = (host) => { btn(host, 'Start').click(); btn(host, 'Load the ship').click() }
const card = (host, id) => host.querySelector(`[data-cargo-card="${id}"]`)
const inHold = (host) => [...host.querySelectorAll('[data-hold-stage] [data-cargo]')].filter(p => !p.hasAttribute('aria-hidden')).map(p => p.dataset.cargo)

beforeEach(() => { clearRun('/#De lading'); document.body.replaceChildren() })

describe('De lading on the class screen', () => {
  it('⓪ setup: names and team sizes (labelled), no clock while the teacher types', () => {
    const { host, game } = mount()
    expect(host.textContent).toContain('Wat nemen jullie mee?')
    expect(host.textContent).toContain('Children per team')
    expect(host.querySelector('[data-team-clock]')).toBeNull()
    expect(game._running).toBe(false)
  })

  it('① mission: Start starts its clock; the fixed cargo aboard, the counter in places, the number prompt', () => {
    const { host, game } = mount()
    btn(host, 'Start').click()
    expect(game._phase).toBe('mission')
    expect(game._running).toBe(true)
    expect(host.querySelector('[data-team-clock]').textContent).toBe('0:20')
    expect(inHold(host)).toEqual(['water', 'compass'])
    expect(host.querySelectorAll('[data-hold-stage] [data-fixed]')).toHaveLength(2)
    expect(host.textContent).toContain('4 of 9 places full · 5 places free')
    expect(host.textContent).toContain('Choose within your team who is 1, 2, 3 and 4.')
    game.hide()
  })

  it('②③ loads on a tap, refuses an overload with the plan\'s words, keeps each team\'s hold', () => {
    const { host, game } = mount()
    toPick(host)
    card(host, 'rice').click()
    expect(inHold(host)).toEqual(['water', 'compass', 'rice'])
    card(host, 'timber').click()                       // 7 + 3 = 10 > 9
    expect(host.querySelector('[role=alert]').textContent).toBe('Not enough points. Take something out first.')
    expect(inHold(host)).not.toContain('timber')

    host.querySelectorAll('[data-team-card] > button')[1].click()
    expect(inHold(host)).toEqual(['water', 'compass'])
    host.querySelectorAll('[data-team-card] > button')[0].click()
    expect(inHold(host)).toContain('rice')
    host.querySelector('[data-team-card] [data-cargo-tile="rice"]').click()     // out via the team card
    expect(inHold(host)).not.toContain('rice')
    card(host, 'rice').click()
    host.querySelector('[data-hold-stage] [data-cargo="rice"]').click()          // out via the hold
    expect(game.teamStore().cargo(0).selected).toEqual(['water', 'compass'])
  })

  it('shows each strip card\'s name and cost (dots + number) in type, readable from the back', () => {
    const { host } = mount()
    toPick(host)
    expect(card(host, 'rice').getAttribute('aria-label')).toBe('Rijst, costs 3 points')
    expect(card(host, 'rice').dataset.tooltip).toBe('Rijst: Veel eten?')
    expect(card(host, 'rice').textContent).toBe('Rijst3')
    expect(card(host, 'timber').textContent).toBe('Hout3')
  })

  it('"Klaar" asks first under budget, editing clears it, the teacher reopens', () => {
    const { host, game } = mount()
    toPick(host)
    card(host, 'rope').click()                         // 6 of 9
    btn(host, 'Ready').click()
    expect(host.textContent).toContain('You still have points left. Ready anyway?')
    btn(host, 'Ready anyway').click()
    expect(game.teamStore().cargo(0).confirmed).toBe(true)
    expect(host.querySelector('[data-team-card][data-active]').textContent).toContain('Ready')
    expect(host.textContent).toContain('1 of 2 ready')
    card(host, 'rope').click()                         // an edit
    expect(game.teamStore().cargo(0).confirmed).toBe(false)
    expect(host.querySelector('[data-team-card][data-active]').textContent).toContain('Not yet confirmed')
  })

  it('names ONE number and role at a time, rotating with the run\'s interaction index', () => {
    const { host } = mount({ interaction: 1 })
    toPick(host)
    const prompts = () => [...host.querySelectorAll('[data-role-prompt]')].map(p => `${p.dataset.rolePrompt}: ${p.textContent}`)
    expect(prompts()).toEqual(['fit: Number 1, Bootsman: does it still fit?'])
    expect(host.textContent).toContain('1 Bootsman · 2 Verkenner · 3 Stuurman · 4 Kapitein')   // the same for every team: shown once
    card(host, 'rice').click()                       // 7 of 9: rope (2) still fits
    expect(prompts()).toEqual(['fit: Number 1, Bootsman: does it still fit?'])
    card(host, 'rope').click()                       // 9 of 9: near "Klaar", the Kapitein, in the same place
    expect(prompts()).toEqual(['ready: Number 4, Kapitein: are you ready?'])
    btn(host, 'Next turn').click()
    expect(prompts()).toEqual(['ready: Number 3, Kapitein: are you ready?'])
  })

  it('switches the roles off', () => {
    const { host } = mount({ roles_on: false })
    toPick(host)
    expect(host.querySelector('[data-role-prompt]')).toBeNull()
  })

  it('④ results: a frozen snapshot, one ship per team, two compared with the differences outlined', () => {
    const { host, game } = mount()
    toPick(host)
    card(host, 'rice').click()
    btn(host, 'Ready').click(); btn(host, 'Ready anyway').click()
    host.querySelectorAll('[data-team-card] > button')[1].click()
    card(host, 'rope').click()
    btn(host, 'To the results').click()
    const ships = [...host.querySelectorAll('[data-team-ship]')].map(s => s.dataset.teamShip)
    expect(ships).toEqual(['Team 1', 'Team 2'])
    expect(host.textContent).toContain('7/9')
    expect(host.textContent).toContain('Not yet confirmed')
    // What no CONFIRMED team took (team 2 is not confirmed): rope and timber.
    expect(host.textContent).toContain('What would you still take?')
    // The snapshot is frozen: a change behind it does not move the results.
    game.teamStore().setCargo(1, { ...game.teamStore().cargo(1), selected: ['water'] })
    expect(host.querySelectorAll('[data-team-ship]')[1].textContent).toContain('6/9')
    host.querySelectorAll('[data-team-ship]')[0].click()
    host.querySelectorAll('[data-team-ship]')[1].click()
    expect(host.querySelectorAll('[data-differs]').length).toBe(2)       // rice on one, rope on the other
    expect(host.textContent).toContain('Only this ship: Rijst')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(host.querySelectorAll('[data-differs]').length).toBe(0)
  })

  it('⑤ last chance: one previewed swap, applied once, then closed; "Houden zo" for another team', () => {
    const { host, game } = mount()
    toPick(host)
    card(host, 'rice').click()
    btn(host, 'Ready').click(); btn(host, 'Ready anyway').click()
    host.querySelectorAll('[data-team-card] > button')[1].click()
    btn(host, 'Ready').click(); btn(host, 'Ready anyway').click()
    btn(host, 'To the results').click()
    btn(host, 'Last chance').click()
    host.querySelector('[data-hold-stage] [data-cargo="rice"]').click()       // out
    host.querySelector('[data-swap-in="rope"]').click()                        // in
    expect(host.textContent).toContain('− Rijst (3)  + Touw (2)  → 6/9')
    expect(host.querySelector('[data-swap-note]').textContent).toBe('after the swap: 3 places free')
    const swap = btn(host, 'Swap')
    swap.click()
    expect(game.teamStore().cargo(0).exchange.state).toBe('swapped')
    expect(game.teamStore().cargo(0).selected).toEqual(['water', 'compass', 'rope'])
    expect(host.textContent).toContain('Swapped')
    expect(() => btn(host, 'Swap')).toThrow()                                  // closed
    host.querySelectorAll('[role=tab]')[1].click()
    btn(host, 'Keep as it is').click()
    expect(game.teamStore().cargo(1).exchange.state).toBe('kept')
  })

  it('⑤ an over-budget swap says how much must come free and cannot be confirmed', () => {
    const { host, game } = mount()
    toPick(host)
    card(host, 'rope').click(); card(host, 'rice').click()      // 9 of 9
    btn(host, 'Ready').click()
    btn(host, 'To the results').click()
    btn(host, 'Last chance').click()
    host.querySelector('[data-hold-stage] [data-cargo="rope"]').click()       // out 2
    host.querySelector('[data-swap-in="timber"]').click()                      // in 3: 10 of 9
    expect(host.textContent).toContain('→ 10/9')
    expect(host.querySelector('[data-swap-note="over"]').textContent).toBe('This swap does not fit: first free up 1 place')
    const swap = btn(host, 'Swap')
    expect(swap.disabled).toBe(true)
    swap.click()
    expect(game.teamStore().cargo(0).exchange.state).toBe('open')
    expect(game.teamStore().cargo(0).selected).toEqual(['water', 'compass', 'rope', 'rice'])
  })

  it('⑤ the Verkenner first, the Kapitein once a swap is picked, one line', () => {
    const { host } = mount()
    toPick(host)
    btn(host, 'Ready').click(); btn(host, 'Ready anyway').click()
    btn(host, 'To the results').click()
    btn(host, 'Last chance').click()
    const kinds = () => [...host.querySelectorAll('[data-role-prompt]')].map(p => p.dataset.rolePrompt)
    expect(kinds()).toEqual(['risk'])
    host.querySelector('[data-swap-in="rope"]').click()
    expect(kinds()).toEqual(['swap'])
    btn(host, 'Keep as it is').click()
    expect(kinds()).toEqual([])
  })

  it('⑥ departure: one lock for all, stored for later scenes; late edits refused; no auto-advance', () => {
    const { host, game, onComplete } = mount()
    toPick(host)
    card(host, 'rice').click()
    btn(host, 'Ready').click(); btn(host, 'Ready anyway').click()
    btn(host, 'To the results').click()
    btn(host, 'Last chance').click()
    btn(host, 'Ready to set sail?').click()
    btn(host, 'Set sail').click()
    const snaps = lockedCargo(game._runKey)
    expect(snaps).toHaveLength(2)
    expect(snaps[0]).toMatchObject({ teamId: 'team-1', confirmed: true, finalItemIds: ['water', 'compass', 'rice'], phase: 'DEPARTURE_LOCKED' })
    expect(snaps[1]).toMatchObject({ confirmed: false, finalItemIds: [] })
    expect(host.querySelectorAll('[data-hatch]').length).toBeGreaterThan(0)
    expect(game.teamStore().cargo(0).locked).toBe(true)
    expect(onComplete).not.toHaveBeenCalled()
    expect(host.querySelector('[data-team-clock]')).toBeNull()                 // no second "Verder" up top
    game._render()                                                             // any redraw: the ships stay gone
    expect(host.querySelectorAll('[data-hold-stage][data-sailed]').length).toBe(2)
    expect([...host.querySelectorAll('button')].filter(b => b.textContent.trim() === 'Resume')).toHaveLength(0)
    btn(host, 'Continue the lesson').click()
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('resumes the run after a reload: same teams, phase and cargo', () => {
    const first = mount()
    toPick(first.host)
    card(first.host, 'rice').click()
    first.game.hide()
    const again = mount()
    expect(again.game._phase).toBe('load')
    expect(again.game.teamStore().cargo(0).selected).toContain('rice')
  })
})

describe('De lading solo (own device)', () => {
  it('one hold, no team cards to switch, no numbers: the questions alone, then an honest compare', () => {
    const { host } = mount({}, true)
    expect(host.textContent).not.toContain('Choose within your team')
    btn(host, 'Start').click()
    expect(host.querySelectorAll('[data-team-card] > button')).toHaveLength(0)
    expect(host.querySelector('[data-role-prompt="fit"]').textContent).toBe('Does it still fit?')
    card(host, 'rope').click()
    expect(inHold(host)).toContain('rope')
    btn(host, 'To the results').click()
    expect([...host.querySelectorAll('[data-team-ship]')].map(s => s.dataset.teamShip)).toEqual(['You'])
  })
})
