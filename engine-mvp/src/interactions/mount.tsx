// Runs a lesson's interactions on the player: when the stage clock reaches a scene's hold point the
// picture holds (the clock motion keeps breathing), the scene's ambience stays on under the card, ducked,
// and the card opens. A power meter's right words play the held scene onward in short bursts. Next or
// Skip closes the card and the lesson plays on; each interaction plays once per run.
// Uses only player.pause()/play()/scene() (S1's API); src/stage25d is not touched.
import { createRoot, type Root } from 'react-dom/client'
import type { Lesson, Scene } from '../director/types'
import type { Player } from '../stage25d/stage'
import type { LessonSound } from '../sound/player'
import { Card } from './Card'
import { HOLD_BEFORE_CUT_S, cardSeconds, holdAt, type Interaction } from './plan'

export type Interactions = {
  /** true while a card is up (the player's sound sync stands aside) */
  isOpen: () => boolean
  /** false = never open a card (a contact-sheet run that seeks through the lesson) */
  enabled: boolean
  /** what happened, for checks */
  log: { at: number; scene: string; what: 'open' | 'push' | 'close' }[]
}

export function startInteractions(player: Player, sound: LessonSound | null, lesson: Lesson, host: HTMLElement): Interactions {
  const done = new Set<number>()
  let root: Root | null = null
  let burstUntil = -1 // a meter burst: play until the scene clock reaches this, then hold again
  const api: Interactions = { isOpen: () => root !== null, enabled: true, log: [] }
  const note = (scene: Scene, what: Interactions['log'][number]['what']) => api.log.push({ at: performance.now(), scene: scene.id, what })

  function open(index: number, scene: Scene) {
    player.pause()
    done.add(index)
    if (scene.sound) sound?.hold(scene.sound.ambience, scene.sound.duck_db)
    note(scene, 'open')
    const dur = scene.dur_s ?? 0
    const hold = holdAt(scene, dur)
    root = createRoot(host)
    root.render(
      <Card
        interaction={scene.interaction as unknown as Interaction}
        seconds={cardSeconds(scene)}
        sfx={(id) => void sound?.hit(id)}
        onPush={(p) => {
          note(scene, 'push')
          burstUntil = hold + p * (dur - HOLD_BEFORE_CUT_S - hold)
          player.play()
        }}
        onDone={() => close(scene)}
      />,
    )
  }

  function close(scene: Scene) {
    root?.unmount()
    root = null
    burstUntil = -1
    sound?.release()
    note(scene, 'close')
    player.play()
  }

  const tick = () => {
    const { index, t } = player.scene()
    const scene = lesson.scenes[index]
    if (burstUntil >= 0 && t >= burstUntil) { player.pause(); burstUntil = -1 }
    if (api.enabled && !root && scene?.interaction && !done.has(index) && t >= holdAt(scene, scene.dur_s ?? 0) - 0.02) open(index, scene)
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return api
}
