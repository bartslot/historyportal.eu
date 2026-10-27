// What tells the story until narration audio plays: the narrator's line as a caption while the director
// has it spoken (narration_at_s, for its spoken length), and the characters' silent balloons at their
// at_s/dur_s, over the speaker (house rule: only the narrator speaks; balloons are never voiced).
// Both hide while an interaction card is up.
import { narrationSeconds } from '../director/timing'
import type { Scene } from '../director/types'

export type StoryFrame = { caption: string | null; balloons: { text: string; x: number }[] }

/** What is on screen t seconds into a scene. Pure. A balloon stands over its speaker (the figure with
 *  that char, else the scene's middle), kept inside the frame. */
export function storyAt(scene: Scene, t: number): StoryFrame {
  const at = scene.narration_at_s ?? 0
  const caption = scene.narration.trim() && t >= at && t < at + narrationSeconds(scene) + 0.6 ? scene.narration : null
  const balloons = (scene.balloons ?? [])
    .filter((b) => b.at_s !== undefined && t >= b.at_s && t < b.at_s + (b.dur_s ?? 0))
    .map((b) => {
      const who = scene.figures?.find((f) => f.char === b.char)
      return { text: b.text, x: Math.min(0.8, Math.max(0.2, who?.x ?? 0.5)) }
    })
  return { caption, balloons }
}

/** Draw the frame into the host (a caption bar and balloon elements), touching the DOM only on change. */
export function drawStory(host: HTMLElement, frame: StoryFrame | null): void {
  const key = JSON.stringify(frame)
  if (host.dataset.key === key) return
  host.dataset.key = key
  host.replaceChildren()
  if (!frame) return
  for (const b of frame.balloons) {
    const el = document.createElement('div')
    el.className = 'story-balloon'
    el.style.left = `${b.x * 100}%`
    el.textContent = b.text
    host.append(el)
  }
  if (frame.caption) {
    const el = document.createElement('p')
    el.className = 'story-caption'
    el.textContent = frame.caption
    host.append(el)
  }
}
