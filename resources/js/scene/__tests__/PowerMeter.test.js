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
    expect(readMoment({ after_audio: '/\\evil.example/a.mp3' }).afterAudio).toBe('')
    expect(readMoment({ after_audio: '/storage/a.mp3' }).afterAudio).toBe('/storage/a.mp3')
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

describe('the after line', () => {
  it('stays up as long as it takes to read, never shorter than a breath', async () => {
    const { readingMs } = await import('../PowerMeter.js')
    expect(readingMs('')).toBe(1800)
    expect(readingMs('En daar komt de westenwind. De Heemskerck vaart weer.')).toBe(4091)
  })

  it('shows as a caption over the panel, as text', () => {
    const host = document.createElement('div')
    new PowerMeter(host).say('<b>De Heemskerck vaart weer.</b>')
    expect(host.querySelector('b')).toBeNull()
    expect(host.querySelector('[role=status]').textContent).toBe('<b>De Heemskerck vaart weer.</b>')
  })
})

describe('sound fills the meter (microphone injected)', () => {
  const flush = () => new Promise(r => setTimeout(r, 0))
  const fakeMic = () => {
    const mic = { stopped: false, hooks: null }
    mic.listen = vi.fn(async (hooks) => { mic.hooks = hooks; return { stop: () => { mic.stopped = true } } })
    return mic
  }
  const mount = (config, opts = {}) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const meter = new PowerMeter(host)
    const onDone = vi.fn()
    const onReact = vi.fn()
    meter.show({ config, onDone, onReact, ...opts })
    return { host, meter, onDone, onReact }
  }
  const blow = { ...raw, input: 'blow', words: { right: [], wrong: [] }, goal: 2, input_options: { threshold: 0.4 } }

  it('never asks for the mic for a words moment', () => {
    const mic = fakeMic()
    mount(raw, { listen: mic.listen })
    expect(mic.listen).not.toHaveBeenCalled()
  })

  it('listens to the room first, then broadband sound fills it and a voice does not', async () => {
    vi.useFakeTimers()
    const mic = fakeMic()
    const { host, onReact, onDone } = mount(blow, { listen: mic.listen })
    await vi.waitFor(() => expect(mic.hooks).not.toBeNull())
    expect(host.textContent).toContain('Listening to the room')
    expect(host.textContent).toContain('Nothing is recorded')
    mic.hooks.onCalibrated(-60)
    expect(host.textContent).toContain('Blow!')
    mic.hooks.onFrame({ level: 0.9, flatness: 0.05, dt: 1 })        // shouting: no
    expect(host.querySelector('[data-meter="0"]').value).toBe(0)
    for (let i = 0; i < 3; i++) mic.hooks.onFrame({ level: 0.9, flatness: 0.6, dt: 1 })
    expect(onReact).toHaveBeenCalledTimes(2)
    expect(mic.stopped).toBe(true)                                   // released as soon as it is full
    vi.advanceTimersByTime(1000)
    expect(onDone).toHaveBeenCalledWith({ skipped: false, winner: 0, team: null })
  })

  it('silence: a noise knocks it back one step, never to nothing', async () => {
    const mic = fakeMic()
    const { host } = mount({ ...blow, input: 'silence', goal: 4, input_options: { hold_seconds: 4 } }, { listen: mic.listen })
    await vi.waitFor(() => expect(mic.hooks).not.toBeNull())
    mic.hooks.onCalibrated(-60)
    mic.hooks.onFrame({ level: 0.05, flatness: 0, dt: 2.5 })
    expect(host.querySelector('[data-meter="0"]').value).toBeCloseTo(2.5)
    mic.hooks.onFrame({ level: 0.9, flatness: 0, dt: 0.05 })
    expect(host.querySelector('[data-meter="0"]').value).toBe(2)
  })

  it('no mic or no permission: says so and the tap carries the moment', async () => {
    vi.useFakeTimers()
    const { host, onDone } = mount(blow, { listen: () => Promise.reject(new Error('NotAllowedError')) })
    await vi.waitFor(() => expect(host.textContent).toContain('No microphone. Tap instead.'))
    const tap = () => [...host.querySelectorAll('button')].find(b => b.textContent === 'Tap to fill').click()
    tap(); tap()
    vi.advanceTimersByTime(1000)
    expect(onDone).toHaveBeenCalledWith({ skipped: false, winner: 0, team: null })
  })

  it('sound is the whole class: no team turns, and closing releases the mic', async () => {
    const mic = fakeMic()
    const { host, meter } = mount({ ...blow, teams: 4 }, { listen: mic.listen })
    await vi.waitFor(() => expect(mic.hooks).not.toBeNull())
    expect(host.textContent).not.toContain('Team 1')
    meter.hide()
    expect(mic.stopped).toBe(true)
  })

  it('sits where it covers the least of the ship and the figures', () => {
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 1440 })
    Object.defineProperty(host, 'clientHeight', { value: 900 })
    const ship = { rect: { x: 900, y: 400, w: 260, h: 240 }, weight: 3 }
    const tasman = { rect: { x: 270, y: 430, w: 280, h: 470 } }
    new PowerMeter(host).show({ config: raw, avoid: () => [ship, tasman] })
    expect(host.querySelector('.card').dataset.spot).toBe('top-left')
  })
})

describe('the microphone after review', () => {
  const mount = (config, listen) => {
    const host = document.createElement('div')
    const meter = new PowerMeter(host)
    meter.show({ config, listen })
    return { host, meter }
  }
  const silence = { ...raw, input: 'silence', words: { right: [], wrong: [] }, goal: 4, input_options: { hold_seconds: 4 } }

  it('a mic granted late for an earlier moment is closed and never feeds the next one', async () => {
    let grantFirst
    const first = { stopped: false, hooks: null }
    const host = document.createElement('div')
    const meter = new PowerMeter(host)
    meter.show({ config: silence, listen: (hooks) => new Promise(r => { first.hooks = hooks; grantFirst = () => r({ stop: () => { first.stopped = true } }) }) })
    meter.hide()                                        // a chapter jump while the prompt is open
    const second = { hooks: null }
    meter.show({ config: silence, listen: async (hooks) => { second.hooks = hooks; return { stop () {} } } })
    grantFirst()
    await vi.waitFor(() => expect(first.stopped).toBe(true))
    second.hooks.onCalibrated(-60)
    first.hooks.onFrame({ level: 0, flatness: 0, dt: 4 })   // the old mic's frame
    expect(host.querySelector('[data-meter="0"]').value).toBe(0)
  })

  it('a long noise in a silence moment knocks back one step, not to nothing', async () => {
    let hooks
    const { host } = mount(silence, async (h) => { hooks = h; return { stop () {} } })
    await vi.waitFor(() => expect(hooks).toBeDefined())
    hooks.onCalibrated(-60)
    hooks.onFrame({ level: 0, flatness: 0, dt: 3.3 })
    for (let i = 0; i < 10; i++) hooks.onFrame({ level: 0.9, flatness: 0, dt: 0.05 })
    expect(host.querySelector('[data-meter="0"]').value).toBe(3)
  })

  it('a silence moment offers no taps while the mic works', async () => {
    let hooks
    const { host } = mount(silence, async (h) => { hooks = h; return { stop () {} } })
    await vi.waitFor(() => expect(hooks).toBeDefined())
    expect([...host.querySelectorAll('button')].map(b => b.textContent)).not.toContain('Tap to fill')
  })
})
