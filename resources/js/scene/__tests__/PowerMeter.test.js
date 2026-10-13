import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  PowerMeter, readMoment, wordButtons, startState, press, giveTurn, level, meterCount, layerNode, gust, sail,
} from '../PowerMeter.js'

const raw = {
  name: 'Wind in de zeilen',
  meter_label: 'Windmeter',
  prompt: 'Roep de woorden die de wind laten waaien!',
  words: { right: ['westenwind', 'zeilen', 'vertrekken', 'Mauritius'], wrong: ['stoommachine', 'motor', 'noordpool'] },
  goal: 4,
  after: 'En daar komt de westenwind.',
  react: { layer: 12, ambient: 'billow', amount: 1.6 },
  payoff: { type: 'move', layer: 12, to_x: 120, to_y: 44, duration: 5 },
}
const cfg = readMoment(raw)
const right = (i) => ({ id: `r${i}`, text: cfg.right[i], right: true })
const wrong = { id: 'w0', text: 'motor', right: false }

afterEach(() => {
  delete window.matchMedia
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('power meter rules', () => {
  it('reads a moment defensively', () => {
    const odd = readMoment({ words: { right: ['  a ', '', null, 'b'], wrong: 'x' }, goal: 99, teams: 1, seconds: 9999, after_audio: '//evil/a.mp3' })
    expect(odd.right).toEqual(['a', 'b'])
    expect(odd.wrong).toEqual([])
    expect(odd.goal).toBe(2)
    expect(odd.teams).toBe(0)
    expect(odd.seconds).toBe(300)
    expect(odd.afterAudio).toBe('')
    expect(odd.at).toBe('end')
    expect(readMoment({ words: { right: [] } }).enabled).toBe(false)
    expect(readMoment({ ...raw, enabled: false }).enabled).toBe(false)
    expect(readMoment({ ...raw, at: 12.5 }).at).toBe(12.5)
  })

  it('shuffles every word in exactly once', () => {
    const buttons = wordButtons(cfg, () => 0.3)
    expect(buttons.map(b => b.text).sort()).toEqual([...cfg.right, ...cfg.wrong].sort())
    expect(buttons.filter(b => b.right)).toHaveLength(4)
  })

  it('fills one step per right word and never changes the state it was given', () => {
    const s0 = startState(cfg)
    const { state: s1, result } = press(s0, cfg, right(0))
    expect(result).toBe('right')
    expect(s1.fills).toEqual([1])
    expect(s0.fills).toEqual([0])
    expect(level(s1, cfg)).toBe(0.25)
  })

  it('counts a right word once', () => {
    const { state } = press(startState(cfg), cfg, right(0))
    const again = press(state, cfg, right(0))
    expect(again.result).toBe('used')
    expect(again.state).toBe(state)
  })

  it('shakes a wrong word without touching the meter', () => {
    const { state, result } = press(startState(cfg), cfg, wrong)
    expect(result).toBe('wrong')
    expect(state.fills).toEqual([0])
    expect(state.done).toBe(false)
  })

  it('completes when the meter reaches its goal and then ignores taps', () => {
    let state = startState(readMoment({ ...raw, goal: 2 }))
    const small = readMoment({ ...raw, goal: 2 })
    state = press(state, small, right(0)).state
    const full = press(state, small, right(1))
    expect(full.result).toBe('full')
    expect(full.state.done).toBe(true)
    expect(full.state.winner).toBe(0)
    expect(press(full.state, small, right(2)).result).toBe('done')
  })

  it('takes turns on one shared meter by default', () => {
    const teams = readMoment({ ...raw, teams: 3 })
    expect(meterCount(teams, 3)).toBe(1)
    let s = startState(teams, 3)
    s = press(s, teams, right(0)).state
    expect(s.turn).toBe(1)
    s = press(s, teams, wrong).state           // a wrong word passes the turn too
    expect(s.turn).toBe(2)
    expect(s.fills).toEqual([1])
    expect(giveTurn(s, 0).turn).toBe(0)
    expect(giveTurn(s, 7).turn).toBe(2)
  })

  it('fills a meter per team when the teacher chose that, and the first full one wins', () => {
    const each = readMoment({ ...raw, teams: 2, team_meter: 'each', goal: 1 })
    let s = startState(each, 2)
    expect(s.fills).toEqual([0, 0])
    s = press(s, each, wrong).state            // team 1 misses, team 2's turn
    const won = press(s, each, right(0))
    expect(won.result).toBe('full')
    expect(won.state.fills).toEqual([0, 1])
    expect(won.state.winner).toBe(1)
  })
})

describe('PowerMeter on screen', () => {
  const mount = (opts = {}) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const meter = new PowerMeter(host)
    const onDone = vi.fn()
    const onReact = vi.fn()
    meter.show({ config: raw, onDone, onReact, ...opts })
    return { host, meter, onDone, onReact }
  }

  it('renders the prompt, the meter and every word as text, never markup', () => {
    const { host } = mount({ config: { ...raw, prompt: '<img src=x onerror=alert(1)>' } })
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toContain('<img src=x onerror=alert(1)>')
    expect(host.querySelectorAll('[data-word]')).toHaveLength(7)
    expect(host.querySelector('progress').max).toBe(4)
  })

  it('reacts per right word and hands back once full', () => {
    vi.useFakeTimers()
    const { host, meter, onDone, onReact } = mount()
    meter.tapWord('motor')
    expect(onReact).not.toHaveBeenCalled()
    cfg.right.forEach(w => meter.tapWord(w))
    expect(onReact).toHaveBeenCalledTimes(4)
    expect(host.querySelector('progress').value).toBe(4)
    vi.advanceTimersByTime(1000)
    expect(onDone).toHaveBeenCalledWith({ skipped: false, winner: 0, team: null })
    expect(host.childElementCount).toBe(0)
  })

  it('skips at any time', () => {
    const { host, onDone } = mount()
    ;[...host.querySelectorAll('button')].find(b => b.textContent === 'Skip').click()
    expect(onDone).toHaveBeenCalledWith({ skipped: true, winner: null, team: null })
  })

  it('plays without teams on a pupil\'s own device', () => {
    const { host } = mount({ config: { ...raw, teams: 4 }, solo: true })
    expect(host.textContent).not.toContain('Team 1')
  })

  it('names the team whose meter filled first', () => {
    vi.useFakeTimers()
    const { meter, onDone } = mount({ config: { ...raw, teams: 2, team_meter: 'each', goal: 1 } })
    meter.tapWord('westenwind')
    vi.advanceTimersByTime(1000)
    expect(onDone).toHaveBeenCalledWith({ skipped: false, winner: 0, team: 'Team 1' })
  })
})

describe('the panel reacts', () => {
  it('finds a figure layer by asset id', () => {
    document.body.innerHTML = '<div id="s"><div data-layer-id="art_12"></div></div>'
    expect(layerNode(document.getElementById('s'), 12)).not.toBeNull()
    expect(layerNode(document.getElementById('s'), null)).toBeNull()
  })

  it('a gust raises the ambient amount and puts it back', () => {
    vi.useFakeTimers()
    window.matchMedia = vi.fn().mockImplementation((q) => ({ matches: false, media: q }))
    document.body.innerHTML = '<div data-layer-id="art_12"><div class="art-ambient"></div></div>'
    const node = document.querySelector('[data-layer-id]')
    const wrap = node.querySelector('.art-ambient')
    wrap.__ambLayer = { ambient: 'bob', ambient_amount: 0.5 }
    gust(node, { ambient: 'billow', amount: 1.8 })
    expect(wrap.style.getPropertyValue('--amb-amount')).toBe('1.8')
    vi.advanceTimersByTime(2000)
    expect(wrap.style.getPropertyValue('--amb-amount')).toBe('0.5')
  })

  it('sails a layer to its place at once under reduced motion', async () => {
    window.matchMedia = vi.fn().mockImplementation((q) => ({ matches: q.includes('reduce'), media: q }))
    const stage = document.createElement('div')
    Object.defineProperty(stage, 'clientWidth', { value: 1000 })
    Object.defineProperty(stage, 'clientHeight', { value: 500 })
    const node = document.createElement('div')
    node.style.left = '60%'
    node.style.top = '40%'
    await sail(node, stage, { to_x: 120, to_y: 40, duration: 4 })
    expect(node.style.translate).toBe('600px 0px')
  })
})
