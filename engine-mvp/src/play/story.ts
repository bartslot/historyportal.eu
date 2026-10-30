// What tells the story until narration audio plays: the narrator's line as a caption while the director
// has it spoken (narration_at_s, for its spoken length), and the characters' silent balloons at their
// at_s/dur_s, over the speaker (house rule: only the narrator speaks; balloons are never voiced).
// Both hide while an interaction card is up.
import { narrationSeconds } from '../director/timing'
import type { Scene } from '../director/types'

/** `tail`: the balloon points at its speaker; false when there is none on screen yet (no figures until
 *  S3), so it never points at an empty middle. */
export type StoryFrame = { caption: string | null; balloons: { text: string; x: number; tail: boolean; y?: number }[] }

/** Where a speaker stands on screen right now: x and y (top of the head) as shares of the frame, or null when out of frame. */
export type Where = (char: string) => { x: number; y: number } | null

/** What is on screen t seconds into a scene. Pure. A balloon stands over its speaker as the stage DRAWS
 *  it: a figure with that char (only once figures are drawn, `figuresDrawn`; S3), else a set layer whose
 *  need or asset names it; with neither it floats in the middle, without a tail. Kept inside the frame. */
export function storyAt(scene: Scene, t: number, { figuresDrawn = false, where }: { figuresDrawn?: boolean; where?: Where } = {}): StoryFrame {
  const at = scene.narration_at_s ?? 0
  const caption = scene.narration.trim() && t >= at && t < at + narrationSeconds(scene) + 0.6 ? scene.narration : null
  const balloons = (scene.balloons ?? [])
    .filter((b) => b.at_s !== undefined && t >= b.at_s && t < b.at_s + (b.dur_s ?? 0))
    // a speaker drawn on the stage but out of the camera's frame has no balloon (nobody to point at)
    // and one whose speaker is in no figure of the scene (nor a layer that names it) has nobody to speak
    .filter((b) => {
      if (!where || !figuresDrawn) return true
      if (scene.figures?.some((f) => f.char === b.char)) return !!where(b.char)
      return scene.set.layers.some((l) => [l.need, l.asset].some((v) => typeof v === 'string' && v.toLowerCase().split(/[^a-z0-9-]+/).includes(b.char.toLowerCase())))
    })
    .map((b) => {
      const spot = where && figuresDrawn ? where(b.char) : null
      if (spot) return { text: b.text, x: Math.min(0.85, Math.max(0.15, spot.x)), y: Math.min(0.9, Math.max(0.2, spot.y)), tail: true }
      const named = (v: unknown) => typeof v === 'string' && v.toLowerCase().split(/[^a-z0-9-]+/).includes(b.char.toLowerCase())
      const who = (figuresDrawn ? scene.figures?.find((f) => f.char === b.char) : undefined) ?? scene.set.layers.find((l) => named(l.need) || named(l.asset))
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
    el.className = (b.tail ? 'story-balloon' : 'story-balloon no-tail') + (b.y === undefined ? '' : ' at-head')
    el.style.left = `${b.x * 100}%`
    if (b.y !== undefined) el.style.top = `${b.y * 100}%`
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
