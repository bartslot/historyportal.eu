// The link between script, timeline and stage, outside React: the current scene's lines laid out in
// time, the line under the playhead, speaking it while the timeline plays, and its caption.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from 'react'
import { buildCues, cueAt } from '@hp/scene/captions.js'
import * as TL from '../timeline/model'
import * as L from '../lesson/store'
import { layout, lineAt, linesOf, type PlacedLine } from './narration'
import { speak, stopSpeaking } from './speech'

let voice: SpeechSynthesisVoice | null = null
export const setVoice = (v: SpeechSynthesisVoice | null) => { voice = v }
export const getVoice = () => voice

// the placed lines are recomputed only when the script or the scene changes
let cacheKey: any = null
let cache: PlacedLine[] = []
export function placedLines(): PlacedLine[] {
  const { lesson, current } = L.getLesson()
  if (cacheKey?.script !== lesson.script || cacheKey?.current !== current) {
    cacheKey = { script: lesson.script, current }
    cache = lesson.script ? layout(linesOf(lesson.script, current)) : []
  }
  return cache
}

export const usePlacedLines = () => {
  useSyncExternalStore(L.subscribe, L.getLesson)
  return placedLines()
}

/** The line under the playhead and what of it is on screen as a caption right now. */
export function nowSpeaking(time = TL.getState().time) {
  const line = lineAt(placedLines(), time)
  if (!line) return { line: null, caption: '' }
  const cue = line.subtitle ? cueAt(buildCues(line.subtitle, line.end - line.start), time - line.start) : null
  return { line, caption: cue?.text ?? '' }
}

TL.setOtherPlayable(() => placedLines().length > 0) // a scene with only narration can still be played

// Timeline Play speaks each line as the playhead enters it; pausing or scrubbing stops the voice.
// Reading never starts on typing: only Play and Read aloud make sound.
let spoken: string | null = null
let wasPlaying = false
TL.subscribe(() => {
  const { playing, time } = TL.getState()
  if (!playing) {
    if (wasPlaying) { stopSpeaking(); spoken = null }
    wasPlaying = false
    return
  }
  wasPlaying = true
  const line = lineAt(placedLines(), time)
  if (line && line.id !== spoken) {
    spoken = line.id
    stopSpeaking()
    void speak(line.text, voice)
  }
})

/** Make the timeline long enough for the scene's narration (it only ever grows). */
export function fitDurationToNarration() {
  const last = placedLines().at(-1)
  if (last && last.end > TL.getState().duration) TL.setDuration(Math.ceil(last.end + 0.5))
}
