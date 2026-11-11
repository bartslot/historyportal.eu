/**
 * The sound plan of 3D (stage25d) scenes in the lesson player: ambience beds and sfx, played by the engine's own
 * player (engine-mvp/src/sound/player.ts + schedule.ts, through the @stage25d alias). No second audio engine here.
 *
 * The player plays scene by scene, on each scene's narration. So every stage scene replays a short WINDOW of the
 * lesson, [the stage scene heard just before, this one, the next one], from this scene's place in it: a bed that
 * carries on keeps looping, a bed that leaves fades out (its tail_s), the next scene's beds come in early
 * (lead_in_s), the sfx fire at their times, the beds duck under the narrator (duck_db) and drop at a silence.
 *
 * Times are on the narration's clock: the stage starts narration_at_s into a scene (engine.js `lead`), so scene
 * time `lead` is the narrator's first word = 0 here. An sfx cued before that word fires on it rather than never.
 */
// LessonSound is imported on demand in unlock() (keeps it out of the player's eager bundle)
import { isStage25d } from './config.js'

/** A scene that nothing follows keeps its beds looping this long, until the next scene, a card or leave(). */
const OPEN_END_S = 3600
const DEFAULT_DUCK_DB = -12

const planOf = (scene) => (isStage25d(scene) ? scene.config.stage25d.sound ?? null : null)

/** A stage scene with something to hear. */
export const hasStageSound = (scene) => {
  const p = planOf(scene)
  return !!(p && (p.ambience?.length || p.sfx?.length))
}

/** One queue scene in the director's Scene shape, shifted onto its narration's clock. */
export function onNarrationClock (scene, spokenS = 0) {
  const st = scene.config.stage25d
  const p = st.sound
  const lead = Number(st.narration_at_s) || 0
  const spoken = spokenS > 0 ? spokenS : Math.max(1, (Number(st.dur_s) || Number(scene.duration_seconds) || 3) - lead)
  const sil = p.silence
  const silEnd = sil ? sil.at_s + sil.dur_s - lead : 0
  return {
    id: String(scene.id ?? st.id ?? ''),
    narration: '',
    tts_s: spoken,       // the duck lifts when the narrator stops
    dur_s: spoken,       // the player moves on when the narration ends
    narration_at_s: 0,
    sound: {
      ambience: p.ambience ?? [],
      lead_in_s: Number(p.lead_in_s) || 0,
      tail_s: Number(p.tail_s) || 0,
      duck_db: Number.isFinite(p.duck_db) ? p.duck_db : DEFAULT_DUCK_DB,
      silence: sil && silEnd > 0 ? { at_s: Math.max(0, sil.at_s - lead), dur_s: Math.min(sil.dur_s, silEnd) } : null,
      sfx: (p.sfx ?? []).map((x) => ({ ...x, at_s: Math.max(0, (Number(x.at_s) || 0) - lead) })),
    },
  }
}

/** The scenes around this one are only there for their beds' crossfades. The next one's real start is a guess (the
 *  player moves on when it moves on), so its sfx, silence and duck wait for its own window: no knock heard twice. */
const bedsOnly = (s) => ({ ...s, sound: { ...s.sound, sfx: [], silence: null, duck_db: 0 } })

/**
 * The lesson the engine plays for queue[index], and where in it this scene's narration starts.
 * `prevIndex`: the stage scene heard just before (its beds fade out properly), or null.
 * `spokenS`: this narration's real length, when the audio knows it.
 */
export function soundWindow (queue, index, prevIndex = null, spokenS = 0) {
  const prev = prevIndex != null && hasStageSound(queue[prevIndex]) ? bedsOnly(onNarrationClock(queue[prevIndex])) : null
  const cur = onNarrationClock(queue[index], spokenS)
  const next = hasStageSound(queue[index + 1]) ? bedsOnly(onNarrationClock(queue[index + 1])) : null
  if (!next) cur.dur_s = cur.tts_s + OPEN_END_S
  const scenes = [prev, cur, next].filter(Boolean)
  return { lesson: { id: 'stage25d', lang: '', bundle: '', scenes }, from: prev ? prev.dur_s : 0 }
}

/**
 * One per page. The AudioContext is made in unlock(), which the page calls inside a user gesture (autoplay rules);
 * before that every call is a no-op, so a lesson without stage sound never makes one.
 * `make(ctx)` is for tests (a fake engine); the page leaves it out.
 */
export function createStageSound ({ make = null, AudioCtx = null } = {}) {
  let sound = null
  let pending = null      // the engine module loading after unlock()
  let level = 1
  let lastIndex = null   // the stage scene whose sound is playing, so the next one can fade it out
  let fadeTimer = null
  let req = 0            // a newer play/hold/leave wins over a play still loading its files

  const setGain = (v) => sound?.master.gain.setTargetAtTime(v, sound.ctx.currentTime, 0.02)

  return {
    get engine () { return sound },

    /** Call inside a user gesture. Idempotent. */
    unlock (startLevel = level) {
      level = startLevel
      if (sound) return
      const Ctx = AudioCtx || globalThis.AudioContext || globalThis.webkitAudioContext
      if (!Ctx || pending) return
      let ctx
      try { ctx = new Ctx() } catch (e) { console.warn('stage sound: no AudioContext', e); return }
      ctx.resume?.().catch(() => {})   // inside the gesture: the context may start
      const ready = (engine) => { sound = engine; sound.master.gain.value = level; sound.resume().catch(() => {}) }
      if (make) { ready(make(ctx)); return }
      // The engine loads only for a lesson that has stage sound, so it stays out of the player's eager bundle.
      pending = import('@stage25d/sound/player').then(({ LessonSound }) => ready(new LessonSound(ctx)))
        .catch((e) => console.warn('stage sound: engine did not load', e))
    },

    /** queue[index] starts its narration; `clock()` reads it (seconds). Loads the files, then plays on time. */
    async play (queue, index, clock = () => 0, spokenS = 0) {
      if (!sound && pending) await pending   // the first scene can start while the engine is still loading
      if (!sound) return
      if (!hasStageSound(queue[index])) { this.leave(); return }
      const mine = ++req
      clearTimeout(fadeTimer)
      sound.release(1)                 // a card's held beds fade out under the new scene
      sound.resume().catch(() => {})   // a new scene is an explicit play, never a carried-over pause
      const { lesson, from } = soundWindow(queue, index, lastIndex, spokenS)
      lastIndex = index
      await sound.preload(lesson)
      if (mine !== req || !sound) return
      await sound.play(lesson, from + Math.max(0, Number(clock()) || 0))
      // The next scene's sfx load now, so a cue 0.4 s into its narration is not lost to the fetch.
      if (mine === req && hasStageSound(queue[index + 1])) void sound?.preload({ scenes: [onNarrationClock(queue[index + 1])] })
    },

    /** A card is up (quiz, choice, consequence): the last stage scene's beds loop on, low. */
    hold (queue) {
      if (!sound) return
      if (sound.state().held.length) return   // already holding: a second card keeps the same beds
      const p = lastIndex != null ? planOf(queue[lastIndex]) : null
      if (!p?.ambience?.length) { this.leave(); return }
      req++
      lastIndex = null   // the held beds fade out by release() when the next scene plays, not by its window
      clearTimeout(fadeTimer)
      sound.resume().catch(() => {})
      sound.hold(p.ambience, Number.isFinite(p.duck_db) ? p.duck_db : DEFAULT_DUCK_DB)
    },

    /** Away from the stage scenes (a map, a flat scene, the end): everything fades out, then stops. */
    leave (fade = 1.5) {
      if (!sound) return
      req++
      lastIndex = null
      sound.release(fade)
      const g = sound.ambience.gain
      const t = sound.ctx.currentTime
      g.cancelScheduledValues(t)
      g.setTargetAtTime(0, t, fade / 3)
      clearTimeout(fadeTimer)
      fadeTimer = setTimeout(() => sound?.stop(), fade * 2000)
    },

    pause () { sound?.pause().catch(() => {}) },
    resume () { sound?.resume().catch(() => {}) },

    /** The deck's mute and volume: 0 when muted. */
    setLevel (v) {
      level = Math.max(0, Math.min(1, Number(v) || 0))
      setGain(level)
    },

    destroy () {
      clearTimeout(fadeTimer)
      req++
      lastIndex = null
      if (!sound) return
      const s = sound
      sound = null
      try { s.stop(); s.release(0.05) } catch (_) { /* graph already gone */ }
      s.ctx.close?.().catch?.(() => {})
    },
  }
}
