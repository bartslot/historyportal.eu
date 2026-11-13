/**
 * One gesture is one undo step (11-13: three bone drags a second apart were all undone by one Cmd-Z).
 *
 * The server merges saves that come close together (SceneHistory::MERGE_SECONDS), which is what makes a drag or a
 * burst of typing undo in one go, but it cannot tell two quick drags from one. So at the start of every gesture
 * the editor tells it: the previous gesture's waiting saves go out first, then `startEditStep`. Both are Livewire
 * calls on the same component, which keep their order however Livewire batches them, so the marker always lands
 * between one gesture's saves and the next. A stamp read at send time (a header) would not: calls queued while a
 * request is in flight go out together, two gestures in one request.
 */
import { isTypingTarget } from '../ui/keyboard.js'

/** Keys typed into one field closer together than this are one burst, and one step. */
export const TYPING_PAUSE_MS = 1000

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn'])

/**
 * Does this event start a new gesture? `lastKey`: the previous keydown in a field, `{ target, at }`, or null.
 * A press always does (a second finger of a pinch does not); a key does unless it repeats, is a bare modifier,
 * or carries on typing in the same field without a pause.
 */
export const startsGesture = (event, lastKey, now) => {
  if (event.type === 'pointerdown') return event.isPrimary !== false
  if (event.type !== 'keydown' || event.repeat || MODIFIERS.has(event.key)) return false
  if (!isTypingTarget(event.target)) return true
  return !lastKey || lastKey.target !== event.target || now - lastKey.at > TYPING_PAUSE_MS
}

/** Listen on the whole page, before anything else can swallow the event (the stage's canvas takes its pointer). */
export const installEditSteps = (getWire = () => window.__step3Wire?.()) => {
  let lastKey = null
  const onEvent = (event) => {
    const now = Date.now()
    const starts = startsGesture(event, lastKey, now)
    if (event.type === 'keydown') lastKey = isTypingTarget(event.target) ? { target: event.target, at: now } : null
    if (!starts) return
    const wire = getWire()
    if (typeof wire?.startEditStep !== 'function') return   // not in the editor
    window.dispatchEvent(new CustomEvent('scene:edit-step'))   // the last gesture's waiting saves go out first
    wire.startEditStep()
  }
  window.addEventListener('pointerdown', onEvent, true)
  window.addEventListener('keydown', onEvent, true)
  return () => {
    window.removeEventListener('pointerdown', onEvent, true)
    window.removeEventListener('keydown', onEvent, true)
  }
}
