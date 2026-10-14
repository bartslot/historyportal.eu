/**
 * The microphone for a power-meter moment, and only that: it asks for the mic when the moment
 * opens (never on page load), listens to the room for a moment (calibration), then hands the meter
 * one { level, flatness } reading per frame until stop().
 *
 * Privacy: everything runs in this browser. The stream feeds an AnalyserNode and nothing else: it
 * is never recorded, stored, sent, or connected to the speakers, and there is no speech
 * recognition (Chrome's Web Speech sends audio to Google; with children that is not an option).
 * stop() releases the mic, so the browser's "in use" light goes out.
 */
import { SOUND, rms, toDb, flatness, noiseFloor, levelAbove } from './sound.js'

// 25 ms: fine enough to hear a clap land on the beat.
const FRAME_MS = 25

/**
 * @param {{ onCalibrated?: (floorDb: number) => void, onFrame: (f: {level: number, flatness: number, dt: number}) => void }} hooks
 * @returns {Promise<{ stop: () => void }>} rejects when there is no mic, no permission or no Web Audio
 */
export async function listen ({ onCalibrated = null, onFrame }) {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC || !navigator.mediaDevices?.getUserMedia) throw new Error('no-mic-support')

  // The raw room: the browser's voice processing would flatten exactly the loudness we measure.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  let ctx, source, analyser
  try {
    ctx = new AC()
    source = ctx.createMediaStreamSource(stream)
    analyser = ctx.createAnalyser()
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.3
    source.connect(analyser)   // and nowhere else: not to ctx.destination
    await ctx.resume().catch(() => {})
  } catch (e) {
    // The mic was granted but cannot be measured: give it back before saying so.
    stream.getTracks().forEach(t => t.stop())
    ctx?.close().catch(() => {})
    throw e
  }

  const wave = new Float32Array(analyser.fftSize)
  const spectrum = new Float32Array(analyser.frequencyBinCount)
  const heard = []
  const started = performance.now()
  let floor = null
  let last = started
  let stopped = false

  const timer = setInterval(() => {
    if (stopped) return
    const now = performance.now()
    analyser.getFloatTimeDomainData(wave)
    const db = toDb(rms(wave))
    if (floor === null) {
      heard.push(db)
      if (now - started < SOUND.calibrateMs) return
      floor = noiseFloor(heard)
      onCalibrated?.(floor)
      last = now
      return
    }
    analyser.getFloatFrequencyData(spectrum)
    onFrame({ level: levelAbove(db, floor), flatness: flatness(spectrum), dt: (now - last) / 1000 })
    last = now
  }, FRAME_MS)

  return {
    stop () {
      stopped = true
      clearInterval(timer)
      stream.getTracks().forEach(t => t.stop())
      try { source.disconnect() } catch (_) { /* gone */ }
      ctx.close().catch(() => {})
    },
  }
}
