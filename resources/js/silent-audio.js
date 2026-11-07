/**
 * silent-audio.js — a silent WAV of a given length, as a URL an <audio> element can play.
 *
 * The player paces everything on the narration track (the stage's camera, captions, the move to the next scene).
 * When a narration file is missing or the network is down, the track errors, its clock stays at 0 and the scene
 * never ends. Swapping in silence of the scene's own length keeps every one of those working, with no second path.
 */
const RATE = 8000   // 8 kHz, 8-bit mono: a minute of silence is 480 kB

/** The editor's default scene length (App\Models\Lesson::SCENE_LENGTH_MS). */
const SCENE_LENGTH_S = 8

/**
 * How long a scene lasts without its voice: the length the teacher set on its timeline (Bart, 11-07: "the scene also
 * has a specific time from the timeline"), else its 2.5D stage's length, else its stored length, else the default.
 */
export function sceneSeconds (scene) {
  const first = [scene?.config?.timeline?.duration, scene?.config?.stage25d?.dur_s, scene?.duration_seconds]
    .map(Number).find((n) => Number.isFinite(n) && n > 0)
  return first ?? SCENE_LENGTH_S
}

/** WAV bytes of `seconds` of silence. */
export function silentWav (seconds) {
  const samples = Math.max(1, Math.round(Math.max(0.1, seconds) * RATE))
  const buf = new ArrayBuffer(44 + samples)
  const v = new DataView(buf)
  const text = (at, s) => { for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i)) }
  text(0, 'RIFF'); v.setUint32(4, 36 + samples, true); text(8, 'WAVE')
  text(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, RATE, true); v.setUint32(28, RATE, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  text(36, 'data'); v.setUint32(40, samples, true)
  new Uint8Array(buf, 44).fill(128)   // 8-bit PCM is unsigned: 128 is silence
  return buf
}

/** A playable URL for `seconds` of silence. ponytail: never revoked; a few kB per failed scene, fine for one lesson. */
export const silentWavUrl = (seconds) => URL.createObjectURL(new Blob([silentWav(seconds)], { type: 'audio/wav' }))
