/**
 * Sound as a power-meter input: the class cheers (loudness), blows (blow) or keeps still (silence),
 * and the meter fills. Pure functions over numbers the microphone adapter (mic.js) measures; nothing
 * here touches audio, and nothing is ever recorded or sent: only a loudness and a "how noisy" figure
 * per frame exist, and they are gone the next frame.
 *
 *   level     how far above the room's own noise (measured at the start: calibration), 0..1
 *   flatness  spectral flatness 0..1: broadband noise (blowing, wind, a hiss) is high, a voice or a
 *             hum is low because its energy sits in a few harmonics. That is how blowing differs
 *             from talking, without any speech recognition.
 *
 * The numbers below are Bart's tuner's (window.__tune "Power meter sound"): rooms differ.
 */

export const MIC_INPUTS = ['loudness', 'blow', 'silence']

export const SOUND = {
  floorMarginDb: 3,      // added to the measured room noise, so a quiet room's own hum never counts
  rangeDb: 30,           // dB above the floor that reads as level 1
  fillPerSecond: 0.9,    // meter steps per second while the class is loud enough
  blowFlatness: 0.28,    // above this the sound is broadband: blowing, not a voice
  calibrateMs: 1500,     // listening to the room before the meter starts
}

/** Root mean square of one frame of samples (-1..1). */
export function rms (samples) {
  if (!samples?.length) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / samples.length)
}

export const toDb = (value) => 20 * Math.log10(Math.max(1e-6, value))

/**
 * Spectral flatness of a power spectrum given in dB (AnalyserNode.getFloatFrequencyData): the
 * geometric mean over the arithmetic mean of the power, 0 (a pure tone) .. 1 (white noise).
 * Only bins from `from` up, so mains hum and the DC bin do not decide it.
 */
export function flatness (spectrumDb, from = 2) {
  let logSum = 0
  let sum = 0
  let n = 0
  for (let i = from; i < (spectrumDb?.length ?? 0); i++) {
    const power = Math.pow(10, Math.max(-140, spectrumDb[i]) / 10)
    logSum += Math.log(power)
    sum += power
    n++
  }
  if (!n || sum <= 0) return 0
  return Math.min(1, Math.exp(logSum / n) / (sum / n))
}

/** The room's noise floor in dB from the levels heard while calibrating (a high-ish percentile). */
export function noiseFloor (dbLevels, margin = SOUND.floorMarginDb) {
  const sorted = [...dbLevels].filter(Number.isFinite).sort((a, b) => a - b)
  if (!sorted.length) return -60 + margin
  return sorted[Math.floor((sorted.length - 1) * 0.8)] + margin
}

/** 0..1: how far a frame is above the floor. */
export function levelAbove (db, floorDb, range = SOUND.rangeDb) {
  return Math.max(0, Math.min(1, (db - floorDb) / range))
}

/**
 * What one frame does to the meter, `dt` seconds long.
 *
 *   loudness  fills while level >= threshold
 *   blow      fills while level >= threshold AND the sound is broadband (flatness)
 *   silence   fills while level < threshold; a loud frame knocks it back (`knock`)
 *
 * @returns {{ amount: number, active: boolean, knock: boolean }} amount in meter steps
 */
export function soundStep (input, { level, flatness: flat }, { threshold = 0.4, holdSeconds = 5, goal = 4 }, dt) {
  const loud = level >= threshold
  if (input === 'silence') {
    return loud
      ? { amount: 0, active: false, knock: true }
      : { amount: (goal / Math.max(1, holdSeconds)) * dt, active: true, knock: false }
  }
  const counts = input === 'blow' ? loud && flat >= SOUND.blowFlatness : loud
  return { amount: counts ? SOUND.fillPerSecond * dt : 0, active: counts, knock: false }
}

let tunerOff = null
export function registerSoundTuner () {
  if (tunerOff || typeof window === 'undefined' || !window.__tune?.register) return
  tunerOff = window.__tune.register('Power meter sound', [
    { key: 'floorMarginDb', label: 'room margin (dB)', min: 0, max: 15, step: 0.5 },
    { key: 'rangeDb', label: 'loudness range (dB)', min: 10, max: 60, step: 1 },
    { key: 'fillPerSecond', label: 'fill per second (steps)', min: 0.1, max: 4, step: 0.05 },
    { key: 'blowFlatness', label: 'blow flatness gate', min: 0.05, max: 0.9, step: 0.01 },
    { key: 'calibrateMs', label: 'calibration (ms)', min: 500, max: 5000, step: 100 },
  ].map(c => ({ ...c, value: SOUND[c.key], apply: (v) => { SOUND[c.key] = Number(v) } })), { tab: 'Lesson' }) ?? null
}
