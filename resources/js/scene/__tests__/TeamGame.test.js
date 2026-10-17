import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  TeamGame, clampTeams, teamNames, fixedLoad, loadOf, toggleItem, itemPicks, tally, allVoted, readConfig,
} from '../TeamGame.js'
import { formatClock } from '../chapter-timeline.js'

const fixed = [{ name: 'Watervaten', cost: 3 }, { name: 'Rijst', cost: 3 }, { name: 'Kompas', cost: 1 }]
const items = [
  { name: 'Reservezeilen', cost: 3 },
  { name: 'Touw', cost: 2 },
  { name: 'Hout', cost: 3 },
  { name: 'Kaarten', cost: 1 },
]

describe('team game rules', () => {
  it('clamps the team count to 2-8', () => {
    expect([clampTeams(1), clampTeams(5), clampTeams(12), clampTeams('x')]).toEqual([2, 5, 8, 4])
  })

  it('names teams, keeping what the teacher typed', () => {
    expect(teamNames(3, ['', '  De Zeehaen ', ''])).toEqual(['Team 1', 'De Zeehaen', 'Team 3'])
  })

  it('counts the fixed items before anything is picked', () => {
    expect(fixedLoad(fixed)).toBe(7)
    expect(loadOf(new Set([0, 3]), items, fixed)).toBe(11)
  })

  it('blocks an item that would go over capacity and keeps the old selection', () => {
    const picked = new Set([0, 2])            // 7 + 6 = 13 of 16
    const blocked = toggleItem(picked, 1, items, fixed, 14)   // +2 = 15 > 14
    expect(blocked.ok).toBe(false)
    expect(blocked.wouldBe).toBe(15)
    expect([...blocked.picked]).toEqual([0, 2])
    expect(blocked.picked).not.toBe(picked)   // never hands back the input

    const fits = toggleItem(picked, 3, items, fixed, 14)       // +1 = 14
    expect(fits.ok).toBe(true)
    expect(fits.load).toBe(14)
    expect([...picked]).toEqual([0, 2])       // input unchanged
  })

  it('always lets an item be taken off', () => {
    const off = toggleItem(new Set([0, 1, 2]), 2, items, fixed, 1)
    expect(off.ok).toBe(true)
    expect([...off.picked]).toEqual([0, 1])
  })

  it('counts picks per item and votes per option', () => {
    expect(itemPicks([new Set([0, 1]), new Set([1]), new Set()], 4)).toEqual([1, 2, 0, 0])
    expect(tally([1, 1, 0, null, 7], 3)).toEqual([1, 2, 0])
  })

  it('knows when every team has voted', () => {
    expect(allVoted([0, 2, 1])).toBe(true)
    expect(allVoted([0, null])).toBe(false)
    expect(allVoted([])).toBe(false)
  })

  it('formats the clock', () => {
    expect([formatClock(300), formatClock(61), formatClock(-4)]).toEqual(['5:00', '1:01', '0:00'])
  })

  it('keeps only http(s) and site-path images', () => {
    const cfg = readConfig({
      map: 'javascript:alert(1)',
      options: [{ image: 'https://example.org/a.png' }, { image: '//evil.example/b.png' }, { image: 'data:image/png;base64,x' }],
      evidence: [{ image: '/storage/c.png', caption: 'C' }, { image: 'javascript:x' }],
    })
    expect(cfg.map).toBe('')
    expect(cfg.options.map(o => o.image)).toEqual(['https://example.org/a.png', '', ''])
    expect(cfg.evidence).toEqual([{ image: '/storage/c.png', caption: 'C' }])
  })

  it('reads a broken config as a safe one', () => {
    const cfg = readConfig({ mode: 'poll', items: 'nope', options: [{}, {}, {}, {}, {}], answer: '1' })
    expect(cfg.mode).toBe('budget')
    expect(cfg.items).toEqual([])
    expect(cfg.options).toHaveLength(4)
    expect(cfg.answer).toBe(null)
  })
})

describe('TeamGame on the class screen', () => {
  afterEach(() => vi.useRealTimers())

  const mount = (config) => {
    const host = document.createElement('div')
    const onComplete = vi.fn()
    const game = new TeamGame(host)
    game.show({ config, onComplete })
    return { host, game, onComplete }
  }
  const click = (host, label) => {
    const b = [...host.querySelectorAll('button')].find(x => x.textContent.trim() === label)
    if (!b) throw new Error(`no button "${label}"`)
    b.click()
  }

  it('renders teacher text as text, never markup', () => {
    const { host } = mount({ mode: 'budget', title: '<img src=x onerror=alert(1)>', intro: '<b>hi</b>' })
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toContain('<b>hi</b>')
  })

  it('budget: blocks an overload with a message and compares the teams', () => {
    const { host, onComplete } = mount({ mode: 'budget', teams: 2, capacity: 9, fixed, items })
    click(host, 'Start')
    click(host, 'Reservezeilen3')       // 7 + 3 = 10 > 9
    expect(host.querySelector('[role=alert]').textContent).toContain('Team 1')
    click(host, 'Touw2')                // 9 of 9
    expect(host.textContent).toContain('9 of 9 points loaded')
    click(host, 'Reveal')
    const rows = [...host.querySelectorAll('tbody tr')].map(r => r.textContent)
    expect(rows.find(r => r.startsWith('Touw'))).toContain('✓')
    click(host, 'Continue the lesson')
    expect(onComplete).toHaveBeenCalledOnce()
    expect(host.children).toHaveLength(0)
  })

  it('choose: hides the tally until every team has voted, then marks the real decision', () => {
    const options = [{ label: 'A', text: 'Zuid' }, { label: 'B', text: 'Noord, dan oost' }, { label: 'C', text: 'Terug' }]
    const { host } = mount({ mode: 'choose', teams: 2, options, answer: 1 })
    click(host, 'Start')
    click(host, 'Teams choose')
    const reveal = () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Reveal')
    host.querySelectorAll('[role=group]')[0].querySelectorAll('button')[1].click()
    expect(host.querySelector('progress')).toBeNull()
    expect(reveal().disabled).toBe(true)
    host.querySelectorAll('[role=group]')[1].querySelectorAll('button')[0].click()
    expect(host.querySelectorAll('progress')).toHaveLength(3)
    reveal().click()
    expect(host.textContent).toContain('Real decision')
  })

  it('discuss: runs a pausable timer and ends on the closing line', () => {
    vi.useFakeTimers()
    const { host } = mount({ mode: 'discuss', minutes: 1, question: 'Klopt dat?', closing: 'Welke woorden?' })
    vi.advanceTimersByTime(0)
    vi.advanceTimersByTime(3000)
    expect(host.querySelector('[data-team-clock]').textContent).toBe('0:57')
    click(host, 'Pause')
    vi.advanceTimersByTime(5000)
    expect(host.querySelector('[data-team-clock]').textContent).toBe('0:57')
    click(host, '+1 minute')
    vi.advanceTimersByTime(0)
    expect(host.querySelector('[data-team-clock]').textContent).toBe('1:57')
    click(host, 'Close the discussion')
    expect(host.textContent).toContain('Welke woorden?')
  })

  it('offers only "+1 minute" once the time is up (a "Resume" at zero did nothing)', () => {
    vi.useFakeTimers()
    const { host } = mount({ mode: 'discuss', minutes: 1, question: 'Klopt dat?' })
    vi.advanceTimersByTime(60_000)
    expect(host.querySelector('[data-team-clock]').textContent).toBe('Time is up')
    expect(host.querySelector('[data-team-pause]')).toBeNull()
    ;[...host.querySelectorAll('button')].find(b => b.textContent === '+1 minute').click()
    expect(host.querySelector('[data-team-pause]').textContent).toBe('Pause')
    vi.useRealTimers()
  })
})

describe('TeamGame played solo on a pupil\'s own device', () => {
  const mount = (config) => {
    const host = document.createElement('div')
    const onComplete = vi.fn()
    new TeamGame(host).show({ config, onComplete, solo: true })
    return { host, onComplete }
  }
  const click = (host, label) => {
    const b = [...host.querySelectorAll('button')].find(x => x.textContent.trim() === label)
    if (!b) throw new Error(`no button "${label}"`)
    b.click()
  }

  it('budget: no team setup, their own load, a reveal without a team count', () => {
    const { host, onComplete } = mount({ mode: 'budget', teams: 6, capacity: 9, fixed, items })
    expect(host.textContent).not.toContain('Fewer teams')
    click(host, 'Reservezeilen3')
    expect(host.querySelector('[role=alert]').textContent).toContain('that would be 10 of 9')
    click(host, 'Touw2')
    click(host, 'Reveal')
    const heads = [...host.querySelectorAll('th')].map(th => th.textContent)
    expect(heads).toContain('You')
    expect(heads).not.toContain('Teams')
    click(host, 'Continue the lesson')
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('choose: their own choice, then the real decision, no tally', () => {
    const options = [{ label: 'A', text: 'Zuid' }, { label: 'B', text: 'Noord' }]
    const { host } = mount({ mode: 'choose', options, answer: 1, situation: 'Storm.' })
    click(host, 'Choose')
    click(host, 'B')
    expect(host.querySelector('progress')).toBeNull()
    click(host, 'Reveal')
    expect(host.textContent).toContain('Your choice: B')
    expect(host.textContent).toContain('Real decision')
    expect(host.querySelector('progress')).toBeNull()
  })

  it('discuss: a short answer of their own that survives going back', () => {
    const { host } = mount({ mode: 'discuss', question: 'Ontdekte Tasman Nieuw-Zeeland?' })
    const area = host.querySelector('textarea')
    area.value = 'Voor Europeanen wel.'
    area.dispatchEvent(new Event('input'))
    click(host, 'Close the discussion')
    click(host, 'Back')
    expect(host.querySelector('textarea').value).toBe('Voor Europeanen wel.')
  })
})
