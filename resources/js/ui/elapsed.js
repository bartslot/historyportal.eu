/**
 * How long a generation has been running, m:ss, beside its spinner (Bart 11-16: "we need a timer for
 * the generations"). <x-ui.elapsed when="regenerating" />: x-effect feeds sync() the running state,
 * so a spot whose spinner comes and goes starts from 0:00 each time.
 */

const TICK_MS = 1000

export const elapsedLabel = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export function elapsed () {
  return {
    seconds: 0,
    running: false,
    _id: null,
    get label () { return elapsedLabel(this.seconds) },
    /** The generation is running (true) or done (false). */
    sync (on) {
      if (on && !this.running) {
        const began = Date.now()
        this.running = true
        this.seconds = 0
        this._id = setInterval(() => { this.seconds = Math.floor((Date.now() - began) / TICK_MS) }, TICK_MS)
      } else if (!on && this.running) {
        this.destroy()
      }
    },
    destroy () {
      clearInterval(this._id)
      this._id = null
      this.running = false
    },
  }
}
