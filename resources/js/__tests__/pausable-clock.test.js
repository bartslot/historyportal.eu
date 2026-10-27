import { describe, test, expect } from 'vitest'
import { createPausableClock, createPausableTimeout } from '../pausable-clock.js'

/**
 * The voyage sail is timed against this clock. A student pausing mid-ocean must find the ship
 * exactly where they left it — which only holds if paused time is never counted as sailing time.
 */
function fakeClock () {
  let t = 1000
  return {
    now: () => t,
    advance (ms) { t += ms },
  }
}

describe('createPausableClock', () => {
  test('counts real time while running', () => {
    const fake = fakeClock()
    const clock = createPausableClock(fake.now)

    fake.advance(250)

    expect(clock.elapsed()).toBe(250)
  })

  test('freezes while paused, however long the pause lasts', () => {
    const fake = fakeClock()
    const clock = createPausableClock(fake.now)

    fake.advance(400)
    clock.pause()
    fake.advance(10_000)

    expect(clock.elapsed()).toBe(400)
    expect(clock.isPaused).toBe(true)
  })

  test('resumes from where it stopped instead of jumping ahead', () => {
    const fake = fakeClock()
    const clock = createPausableClock(fake.now)

    fake.advance(400)
    clock.pause()
    fake.advance(10_000)   // the wall clock ran on; the ship must not
    clock.resume()
    fake.advance(100)

    expect(clock.elapsed()).toBe(500)
  })

  test('accumulates across several pauses', () => {
    const fake = fakeClock()
    const clock = createPausableClock(fake.now)

    for (let i = 0; i < 3; i++) {
      fake.advance(200)
      clock.pause()
      fake.advance(5_000)
      clock.resume()
    }

    expect(clock.elapsed()).toBe(600)
  })

  test('ignores a repeated pause or resume', () => {
    const fake = fakeClock()
    const clock = createPausableClock(fake.now)

    fake.advance(100)
    clock.pause()
    clock.pause()          // must not bank the same stretch twice
    fake.advance(1_000)
    clock.resume()
    clock.resume()         // must not rebase the start time again
    fake.advance(50)

    expect(clock.elapsed()).toBe(150)
  })

  test('reset starts over, running, even from a paused clock', () => {
    const fake = fakeClock()
    const clock = createPausableClock(fake.now)

    fake.advance(900)
    clock.pause()
    clock.reset()

    expect(clock.isPaused).toBe(false)
    expect(clock.elapsed()).toBe(0)

    fake.advance(75)
    expect(clock.elapsed()).toBe(75)
  })
})

/**
 * Pair test 2026-10-24: a scene without narration held on a plain setTimeout, so pausing it did
 * nothing — the lesson moved on to the next scene by itself while the class sat paused.
 */
describe('createPausableTimeout', () => {
  function fakeTimers () {
    let t = 0
    let pending = []
    return {
      now: () => t,
      setTimeout: (fn, ms) => { const h = { fn, at: t + ms }; pending.push(h); return h },
      clearTimeout: (h) => { pending = pending.filter((p) => p !== h) },
      advance (ms) {
        t += ms
        const due = pending.filter((p) => p.at <= t)
        pending = pending.filter((p) => p.at > t)
        due.forEach((p) => p.fn())
      },
    }
  }

  test('fires after its delay when never paused', () => {
    const fake = fakeTimers()
    let fired = 0
    createPausableTimeout(() => fired++, 4000, fake)

    fake.advance(3999)
    expect(fired).toBe(0)
    fake.advance(1)
    expect(fired).toBe(1)
  })

  test('never fires while paused, and resumes with only the time that was left', () => {
    const fake = fakeTimers()
    let fired = 0
    const timer = createPausableTimeout(() => fired++, 4000, fake)

    fake.advance(1000)
    timer.pause()
    fake.advance(60000)
    expect(fired).toBe(0)

    timer.resume()
    fake.advance(2999)
    expect(fired).toBe(0)
    fake.advance(1)
    expect(fired).toBe(1)
  })

  test('can start paused, and a cancelled timer never fires', () => {
    const fake = fakeTimers()
    let fired = 0
    const timer = createPausableTimeout(() => fired++, 1000, { ...fake, paused: true })
    fake.advance(5000)
    expect(fired).toBe(0)
    timer.resume()
    timer.cancel()
    fake.advance(5000)
    expect(fired).toBe(0)
  })
})
