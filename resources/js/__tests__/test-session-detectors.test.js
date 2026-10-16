import { describe, expect, it, vi } from 'vitest'
import { createDeadClickWatcher, createRageDetector, isReaction } from '../test-session/detectors.js'

describe('rage click detector', () => {
  it('fires on the third click on the same spot within a second, once per burst', () => {
    const rage = createRageDetector()
    expect(rage({ t: 0, x: 100, y: 100 })).toBeNull()
    expect(rage({ t: 300, x: 104, y: 98 })).toBeNull()
    expect(rage({ t: 600, x: 101, y: 102 })).toBe(3)
    expect(rage({ t: 800, x: 100, y: 100 })).toBeNull() // the same burst is not reported twice
  })

  it('does not fire when the clicks are slower than a second apart', () => {
    const rage = createRageDetector()
    expect([0, 600, 1700].map((t) => rage({ t, x: 50, y: 50 }))).toEqual([null, null, null])
  })

  it('does not fire for quick clicks on different spots', () => {
    const rage = createRageDetector()
    expect([[0, 0], [200, 200], [400, 400]].map(([x, y], i) => rage({ t: i * 100, x, y }))).toEqual([null, null, null])
  })

  it('fires again for a new burst after a pause', () => {
    const rage = createRageDetector()
    ;[0, 100, 200].forEach((t) => rage({ t, x: 10, y: 10 }))
    const second = [3000, 3100, 3200].map((t) => rage({ t, x: 10, y: 10 }))
    expect(second).toEqual([null, null, 3])
  })
})

describe('dead click watcher', () => {
  const setup = () => {
    let clock = 0
    const timers = []
    const dead = []
    const watcher = createDeadClickWatcher({
      now: () => clock,
      setTimeout: (fn, ms) => timers.push({ at: clock + ms, fn }),
      onDead: (info) => dead.push(info),
    })
    const advance = (ms) => {
      clock += ms
      timers.filter((t) => t.at <= clock && !t.done).forEach((t) => { t.done = true; t.fn() })
    }
    return { watcher, advance, dead, tick: (ms) => { clock += ms } }
  }

  it('reports a click nothing reacted to within a second', () => {
    const { watcher, advance, dead } = setup()
    watcher.click({ text: 'Klaar' })
    advance(1000)
    expect(dead).toEqual([{ text: 'Klaar' }])
  })

  it('does not report a click the page reacted to', () => {
    const { watcher, advance, dead, tick } = setup()
    watcher.click({ text: 'Start de les' })
    tick(120)
    watcher.reaction()
    advance(1000)
    expect(dead).toEqual([])
  })

  it('does not count a reaction from before the click', () => {
    const { watcher, advance, dead, tick } = setup()
    watcher.reaction()
    tick(50)
    watcher.click({ text: 'Plaatje' })
    advance(1000)
    expect(dead).toHaveLength(1)
  })
})

describe('isReaction', () => {
  const span = () => document.createElement('span')
  const text = () => document.createTextNode('4:56')

  it('counts structural changes, not style, ticking text or the recorder’s own UI', () => {
    document.body.innerHTML = '<div id="a"></div><div class="hp-no-record"><span id="b"></span></div>'
    const a = document.getElementById('a')
    const b = document.getElementById('b')
    expect(isReaction({ type: 'attributes', attributeName: 'style', target: a })).toBe(false)
    expect(isReaction({ type: 'attributes', attributeName: 'class', target: a })).toBe(true)
    expect(isReaction({ type: 'childList', target: a, addedNodes: [span()], removedNodes: [] })).toBe(true)
    expect(isReaction({ type: 'childList', target: a, addedNodes: [], removedNodes: [span()] })).toBe(true)
    expect(isReaction({ type: 'childList', target: a, addedNodes: [text()], removedNodes: [text()] })).toBe(false)
    expect(isReaction({ type: 'characterData', target: a.appendChild(text()) })).toBe(false)
    expect(isReaction({ type: 'childList', target: b, addedNodes: [span()], removedNodes: [] })).toBe(false)
  })

  it('sees real MutationObserver records the same way: a countdown is not a reaction, a panel is', async () => {
    document.body.innerHTML = '<p id="timer">4:57</p><div id="stage"></div>'
    const seen = []
    const observer = new MutationObserver((records) => seen.push(...records.map(isReaction)))
    observer.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true })
    document.getElementById('timer').style.width = '10px'
    document.getElementById('timer').textContent = '4:56'
    document.getElementById('stage').appendChild(span())
    await vi.waitFor(() => expect(seen).toEqual([false, false, true]))
    observer.disconnect()
  })
})
