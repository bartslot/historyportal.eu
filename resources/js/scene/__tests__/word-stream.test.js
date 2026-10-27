import { describe, it, expect, afterEach } from 'vitest'
import { streamStart, streamTick, streamTicked, freshDeck, placeWord, wordSeconds, WordStream, STREAM, WORD_SECONDS } from '../word-stream.js'

const words = [
  { id: 'r0', text: 'westenwind', right: true },
  { id: 'r1', text: 'zeilen', right: true },
  { id: 'w0', text: 'motor', right: false },
]
// A fixed sequence, so every run draws the same words.
const seq = (...values) => { let i = 0; return () => values[i++ % values.length] }

afterEach(() => { delete window.matchMedia; document.body.innerHTML = '' })

describe('word stream rules', () => {
  it('clamps the teacher\'s seconds per word and keeps a word up longer with reduced motion', () => {
    expect(wordSeconds(undefined)).toBe(WORD_SECONDS.fallback)
    expect(wordSeconds(0.2)).toBe(1)
    expect(wordSeconds(99)).toBe(6)
    expect(wordSeconds(2, true)).toBeCloseTo(2 * STREAM.reducedFactor)
  })

  it('shows one word at a time, each for its seconds, with a gap before the next', () => {
    const io = { words, isUsed: () => false, seconds: 2, rand: seq(0.1, 0.7, 0.4) }
    const a = streamTick(streamStart(0), { ...io, now: 0 })
    expect(a.show.word).toBeTruthy()
    expect(a.wait).toBe(2000)
    // Still up at 1.9 s: nothing new.
    const b = streamTick(a.state, { ...io, now: 1900 })
    expect(b.show).toBeNull()
    expect(b.hide).toBe(false)
    // At 2 s it goes, and the next waits for the gap.
    const c = streamTick(a.state, { ...io, now: 2000 })
    expect(c.hide).toBe(true)
    expect(c.show).toBeNull()
    expect(c.wait).toBe(STREAM.gapS * 1000)
    const d = streamTick(c.state, { ...io, now: 2000 + STREAM.gapS * 1000 })
    expect(d.show.word.id).not.toBe(a.show.word.id)
    // Never changes the state it was given.
    expect(a.state.current.word.id).toBe(a.show.word.id)
  })

  it('brings back a right word nobody ticked, and stops once every right word is counted', () => {
    const used = new Set()
    const io = { words, isUsed: (w) => used.has(w.id), seconds: 1, rand: Math.random }
    let state = streamStart(0)
    let now = 0
    const seen = []
    for (let i = 0; i < 12; i++) {
      const step = streamTick(state, { ...io, now })
      state = step.state
      if (step.show) seen.push(step.show.word.id)
      now += step.wait ?? 0
    }
    // Every word came round more than once: nothing was ticked.
    expect(seen.filter(id => id === 'r0').length).toBeGreaterThan(1)
    used.add('r0')
    used.add('r1')
    const end = streamTick({ ...state, current: null, nextAt: 0 }, { ...io, now: now + 5000 })
    expect(end.show).toBeNull()
    expect(end.wait).toBeNull()
  })

  it('never deals a counted right word again, but keeps the wrong ones', () => {
    const deck = freshDeck(words, (w) => w.id === 'r0', Math.random)
    expect(deck.map(w => w.id).sort()).toEqual(['r1', 'w0'])
  })

  it('does not show the same word twice in a row across a reshuffle', () => {
    for (let i = 0; i < 20; i++) {
      const deck = freshDeck(words, () => false, Math.random, 'r1')
      expect(deck[0].id).not.toBe('r1')
    }
  })

  it('a ticked word goes at once and the next follows after the gap', () => {
    const io = { words, isUsed: () => false, seconds: 3, rand: seq(0.5) }
    const a = streamTick(streamStart(0), { ...io, now: 0 })
    const ticked = streamTicked(a.state, 800)
    expect(ticked.current).toBeNull()
    expect(ticked.nextAt).toBe(800 + STREAM.gapS * 1000)
  })

  it('alternates sides and keeps words off the ship', () => {
    const left = placeWord(0, () => 0.5)
    const right = placeWord(1, () => 0.5)
    expect(left.x).toBeLessThan(50)
    expect(right.x).toBeGreaterThan(50)
    // The whole left band is the ship: the spot moves off it if any try lands clear.
    const ship = { x: 0, y: 40, w: 50, h: 40 }
    const spot = placeWord(0, seq(0.5, 0.5, 0.5, 0.05), [ship])
    expect(spot.y).toBeLessThan(40)
  })
})

describe('word stream DOM', () => {
  function stream (opts = {}) {
    const layer = document.createElement('div')
    document.body.appendChild(layer)
    let now = 0
    const timers = []
    const picks = []
    const s = new WordStream(layer, {
      words, isUsed: () => false, seconds: 2, rand: seq(0.2, 0.6),
      onPick: (w) => { picks.push(w.id); return w.right ? 'right' : 'wrong' },
      now: () => now,
      setTimer: (f, ms) => { timers.push({ f, at: now + ms }); return timers.length },
      clearTimer: () => {},
      ...opts,
    })
    const advance = (ms) => { now += ms; const due = timers.splice(0).filter(t => t.at <= now); timers.push(...[]); due.forEach(t => t.f()) }
    return { s, layer, picks, advance, get now () { return now } }
  }

  it('puts one word button up, as text, and lets a click tick it', () => {
    const { s, layer, picks } = stream()
    s.start()
    const buttons = layer.querySelectorAll('[data-stream-word]')
    expect(buttons).toHaveLength(1)
    expect(buttons[0].textContent).toBe(s.state.current.word.text)
    expect(buttons[0].tagName).toBe('BUTTON')
    buttons[0].click()
    expect(picks).toEqual([s.state.last])
  })

  it('a right word leaves when ticked, a wrong one stays up', () => {
    const right = stream({ words: [words[0]] })
    right.s.start()
    right.layer.querySelector('[data-stream-word]').click()
    expect(right.layer.querySelector('[data-stream-word]')).toBeNull()

    const wrong = stream({ words: [words[2], { ...words[0] }], rand: () => 0.99 })
    wrong.s.start()
    const up = wrong.layer.querySelector('[data-stream-word]')
    // rand 0.99 keeps the deck in order: the wrong word first.
    expect(up.dataset.streamWord).toBe('w0')
    up.click()
    expect(wrong.layer.querySelector('[data-stream-word]')).toBe(up)
    expect(up.disabled).toBe(false)
  })

  it('stop removes the word', () => {
    const { s, layer } = stream()
    s.start()
    s.stop()
    expect(layer.querySelector('[data-stream-word]')).toBeNull()
  })
})
