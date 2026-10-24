/**
 * A stopwatch that can be paused.
 *
 * Animations timed against `performance.now()` cannot simply be resumed: the wall clock kept
 * running while the student was paused, so the next frame jumps forward by however long they
 * stood still. This keeps the running total instead — pause banks the time so far, resume starts
 * counting again from zero-added — and every consumer just asks for `elapsed()`.
 *
 * `now` is injectable so the behaviour can be tested without waiting in real time.
 */
export function createPausableClock (now = () => performance.now()) {
  let startedAt = now()
  let banked = 0        // running time accumulated before the current pause
  let paused = false

  return {
    /** Restart from zero, running. */
    reset () {
      startedAt = now()
      banked = 0
      paused = false
    },

    /** Milliseconds this clock has actually been running, pauses excluded. */
    elapsed () {
      return paused ? banked : banked + (now() - startedAt)
    },

    pause () {
      if (paused) return
      banked += now() - startedAt
      paused = true
    },

    resume () {
      if (!paused) return
      startedAt = now()
      paused = false
    },

    get isPaused () {
      return paused
    },
  }
}

/**
 * A setTimeout that pause() holds and resume() continues with only the time that was left.
 * A silent scene's hold must not run on while the class is paused (pair test 2026-10-24).
 * `opts` injects now/setTimeout/clearTimeout for tests; `paused: true` starts it held.
 */
export function createPausableTimeout (fn, ms, opts = {}) {
  const set = opts.setTimeout ?? ((f, d) => setTimeout(f, d))
  const clear = opts.clearTimeout ?? ((h) => clearTimeout(h))
  const clock = createPausableClock(opts.now)
  let handle = null
  let done = false

  const arm = () => { handle = set(() => { done = true; fn() }, Math.max(0, ms - clock.elapsed())) }
  if (opts.paused) clock.pause()
  else arm()

  return {
    pause () {
      if (done || clock.isPaused) return
      clear(handle)
      clock.pause()
    },
    resume () {
      if (done || !clock.isPaused) return
      clock.resume()
      arm()
    },
    cancel () {
      done = true
      clear(handle)
    },
  }
}
