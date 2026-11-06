/**
 * scene-peek.js — the picture editor's Show scene (Bart, 2026-11-06: "see your work in the scene view, while still in asset
 * edit mode"). The real stage keeps drawing behind the editor; a pane beside the work shows a copy of its canvas, so the
 * tools stay in the teacher's hand. Frames and bones reach the stage as data; the picture on a stroke's end, when it is on.
 * A scene of the older kind (a picture over a painting, no stage) has no canvas to copy: the button stays away there.
 */
const PICTURE_WAIT_MS = 300   // encoding a picture is slow: only once the hand has stopped

export function mountScenePeek ({ button, label, pane, t, stage, stageId, picture }) {
  const canvas = pane.querySelector('canvas')
  const ctx = canvas.getContext?.('2d') ?? null
  const startedAt = stage.time ?? 0
  let on = false
  let raf = 0
  let timer = 0
  let shownUrl = null    // the editor's picture on the stage, not saved yet
  let timeMoved = false

  const draw = () => {
    if (!on) return
    const from = stage.canvas
    const { width, height } = pane.getBoundingClientRect()
    if (ctx && from?.width && width && height) {
      const scale = Math.min(1, (width * devicePixelRatio) / from.width, (height * devicePixelRatio) / from.height)
      const w = Math.max(1, Math.round(from.width * scale)), h = Math.max(1, Math.round(from.height * scale))
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      ctx.drawImage(from, 0, 0, w, h)
    }
    raf = requestAnimationFrame(draw)
  }

  const pushPicture = () => {
    const url = picture()
    if (!url || url === shownUrl) return
    shownUrl = url
    stage.showPicture?.(stageId, url)
  }

  const set = (next) => {
    on = next
    pane.hidden = !on
    button.setAttribute('aria-pressed', String(on))
    button.classList.toggle('btn-active', on)
    label.textContent = t(on ? 'Hide scene' : 'Show scene')
    stage.setPeeking?.(on)
    cancelAnimationFrame(raf)
    if (on) { pushPicture(); draw() }
  }
  button.hidden = false
  button.addEventListener('click', () => set(!on))

  return {
    get on () { return on },
    /** The picture changed: on the stage once the hand has stopped. */
    pictureChanged () {
      if (!on) return
      clearTimeout(timer)
      timer = setTimeout(pushPicture, PICTURE_WAIT_MS)
    },
    /** The Frames tab plays: the scene plays with it, from where it stood. Null: back to there. */
    setTime (seconds) {
      if (!on && seconds !== null) return
      if (seconds === null && !timeMoved) return
      timeMoved = seconds !== null
      stage.update?.(startedAt + (seconds ?? 0))
    },
    /** The window closes. Not saved: the stage gets its own picture and time back. Saved: the rebuild brings the new file. */
    destroy ({ saved = false } = {}) {
      clearTimeout(timer)
      on = false
      cancelAnimationFrame(raf)
      stage.setPeeking?.(false)
      if (timeMoved) stage.update?.(startedAt)
      if (shownUrl && !saved) stage.showPicture?.(stageId, null)
    },
  }
}
