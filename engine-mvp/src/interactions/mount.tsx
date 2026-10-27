// Runs a lesson's interactions on S1's player (stage25d onInteraction / holdAt / setTime / resume):
// a scene with an interaction holds at its end on its own (a power meter at METER_HOLD of its scene,
// through holdAt), the clock stands still, layers keep moving and the camera breathes. The scene's
// ambience stays on under the card, ducked; the card opens. A power meter's right words move the held
// scene on (setTime, eased), so the world moves as the class calls. Next or Skip resumes the lesson.
// src/stage25d is not touched.
import { createRoot, type Root } from 'react-dom/client'
import type { Lesson, Scene } from '../director/types'
import type { Player } from '../stage25d/stage'
import type { LessonSound } from '../sound/player'
import { Card } from './Card'
import { HOLD_BEFORE_CUT_S, cardSeconds, holdAt, type Interaction } from './plan'

export type Interactions = {
  /** true while a card is up (the player's sound sync stands aside) */
  isOpen: () => boolean
  /** what happened, for checks */
  log: { at: number; scene: string; what: 'open' | 'push' | 'close' }[]
}

/** How long a meter push takes to play the scene on: quick, then settling (ease out). */
const PUSH_S = 1.2
const easeOut = (u: number) => 1 - (1 - u) ** 3

/** `frame`: the element holding stage + card; it gets `card-open` while a card is up, so the page can
 *  scale the held picture into the space above the card (play.html), keeping the whole world in view. */
export function startInteractions(player: Player, sound: LessonSound | null, lesson: Lesson, host: HTMLElement, frame?: HTMLElement): Interactions {
  let root: Root | null = null
  // once per ENTRY into a scene (S1: each hold fires once per entry): a meter scene's end hold, after
  // its holdAt card, just moves on; a teacher who seeks back into the scene gets the card again
  const done = new Set<string>()
  player.onScene((i) => { const id = lesson.scenes[i]?.id; if (id) done.delete(id) })
  const api: Interactions = { isOpen: () => root !== null, log: [] }
  const note = (scene: Scene, what: Interactions['log'][number]['what']) => api.log.push({ at: performance.now(), scene: scene.id, what })

  lesson.scenes.forEach((s, i) => {
    if (s.interaction?.type === 'power-meter') player.holdAt(i, holdAt(s, s.dur_s ?? 0))
  })

  /** Ease the held scene from where it stands to `to` seconds (setTime keeps the hold). */
  function playOnTo(to: number) {
    const from = player.scene().t
    const start = performance.now()
    const step = (now: number) => {
      const u = Math.min(1, (now - start) / 1000 / PUSH_S)
      player.setTime(from + (to - from) * easeOut(u))
      if (u < 1 && root) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  player.onInteraction((stageScene, resume) => {
    const scene = lesson.scenes.find((s) => s.id === stageScene.id) ?? (stageScene as unknown as Scene)
    if (done.has(scene.id) || !scene.interaction) { resume(); return }
    done.add(scene.id)
    if (scene.sound) sound?.hold(scene.sound.ambience, scene.sound.duck_db)
    note(scene, 'open')
    frame?.classList.add('card-open')
    const dur = scene.dur_s ?? 0
    const hold = holdAt(scene, dur)
    root = createRoot(host)
    root.render(
      <Card
        interaction={scene.interaction as unknown as Interaction}
        seconds={cardSeconds(scene)}
        sfx={(id) => void sound?.hit(id)}
        onPush={(p) => { note(scene, 'push'); playOnTo(hold + p * (dur - HOLD_BEFORE_CUT_S - hold)) }}
        onDone={() => {
          root?.unmount()
          root = null
          frame?.classList.remove('card-open')
          sound?.release()
          note(scene, 'close')
          resume()
          if (sound) void sound.play(lesson, player.clock()) // the timeline back at once, not after the sync's next pass
        }}
      />,
    )
  })
  return api
}
