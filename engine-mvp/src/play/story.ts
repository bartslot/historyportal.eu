// What tells the story until narration audio plays: the narrator's line as a caption while the director
// has it spoken (narration_at_s, for its spoken length), and the characters' silent balloons at their
// at_s/dur_s, over the speaker (house rule: only the narrator speaks; balloons are never voiced).
// Both hide while an interaction card is up.
import { narrationSeconds } from '../director/timing'
import type { Scene } from '../director/types'

/** `tail`: the balloon points at its speaker; false when there is none on screen yet (no figures until
 *  S3), so it never points at an empty middle. */
export type StoryFrame = { caption: string | null; balloons: { text: string; x: number; tail: boolean }[] }

/** What is on screen t seconds into a scene. Pure. A balloon stands over its speaker: the figure with
 *  that char, else a set layer whose need or asset names it; with neither it floats in the middle,
 *  without a tail. Kept inside the frame. */
export function storyAt(scene: Scene, t: number): StoryFrame {
  const at = scene.narration_at_s ?? 0
  const caption = scene.narration.trim() && t >= at && t < at + narrationSeconds(scene) + 0.6 ? scene.narration : null
  const balloons = (scene.balloons ?? [])
    .filter((b) => b.at_s !== undefined && t >= b.at_s && t < b.at_s + (b.dur_s ?? 0))
    .map((b) => {
      const named = (v: unknown) => typeof v === 'string' && v.toLowerCase().split(/[^a-z0-9-]+/).includes(b.char.toLowerCase())
      const who = scene.figures?.find((f) => f.char === b.char) ?? scene.set.layers.find((l) => named(l.need) || named(l.asset))
      return { text: b.text, x: Math.min(0.8, Math.max(0.2, who?.x ?? 0.5)), tail: !!who }
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
    el.className = b.tail ? 'story-balloon' : 'story-balloon no-tail'
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
