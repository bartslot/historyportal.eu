/**
 * The editor's preview of a scene transition (Motion tab): the scene before this one, then this scene
 * coming in over it, once, on the stage. The pictures are the rail's thumbnails; the motion is
 * animations.js playSceneTransition, the same code the student player runs.
 */
import { playSceneTransition } from './animations.js'

/** The scene before is held this long first, so the change itself is what the eye catches. */
const HOLD_MS = 400

/** The rail's picture of a scene and of the scene before it in the running order (null: none, or no picture). */
export function railPictures (sceneId, root = document) {
  const thumbs = [...root.querySelectorAll('[data-thumb][data-scene-id]')]
  const i = thumbs.findIndex((t) => t.dataset.sceneId === String(sceneId))
  const src = (t) => t?.querySelector('img')?.getAttribute('src') || null
  return { from: i > 0 ? src(thumbs[i - 1]) : null, to: i >= 0 ? src(thumbs[i]) : null }
}

const picture = (url) => {
  const el = document.createElement(url ? 'img' : 'div')
  if (url) { el.src = url; el.alt = '' }
  el.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:var(--color-base-300);'
  return el
}

let running = null

/**
 * Play `transition` ({ type, duration, ease }) for scene `sceneId` on `stage` (the stage's root element).
 * A new preview replaces one still running. Resolves once the frame is gone and the live stage shows again.
 */
export function previewSceneTransition (stage, sceneId, transition) {
  if (!stage) return Promise.resolve()
  running?.remove()
  const { from, to } = railPictures(sceneId)
  const frame = document.createElement('div')
  frame.setAttribute('data-transition-preview', '')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:absolute;inset:0;z-index:40;overflow:hidden;pointer-events:none;'
  const outgoing = picture(from)
  const incoming = picture(to)
  incoming.style.opacity = '0'
  frame.append(outgoing, incoming)
  stage.append(frame)
  running = frame
  return new Promise((resolve) => setTimeout(resolve, HOLD_MS))
    .then(() => {
      if (running !== frame) return null
      incoming.style.opacity = '1'   // its resting state; the transition animates from 0 up to it
      return playSceneTransition(incoming, outgoing, transition)
    })
    .then(() => {
      if (running === frame) running = null
      frame.remove()
    })
}
