/**
 * Tempo of a decoded track, so a music change can wait for the next bar (Suno gives no BPM).
 *
 * Onset strength (rise in log energy per ~12 ms frame) → autocorrelation over 70..180 BPM, weighted
 * towards 120 so a half or double tempo does not win → the beat phase that lines up most onsets.
 * ponytail: one global tempo per track, no tempo changes inside a song; an admin corrects it by hand.
 */

const HOP = 512
const ANALYSE_SECONDS = 60
const MIN_BPM = 70
const MAX_BPM = 180
const COMB = 6
const MIN_CORRELATION = 0.1   // how much the onsets must repeat at the winning tempo (0..1)

/**
 * @param {{sampleRate: number, numberOfChannels?: number, length?: number, getChannelData?: Function}} buffer
 * @returns {{bpm: number, beat_offset: number} | null}
 */
export function estimateTempo (buffer) {
  if (typeof buffer?.getChannelData !== 'function' || !buffer.sampleRate) return null
  const rate = buffer.sampleRate
  const data = buffer.getChannelData(0)
  const frames = Math.floor(Math.min(data.length, rate * ANALYSE_SECONDS) / HOP)
  if (frames < 64) return null

  const onset = new Float32Array(frames)
  let prev = 0
  for (let f = 0; f < frames; f++) {
    let e = 0
    for (let i = f * HOP, end = i + HOP; i < end; i++) e += data[i] * data[i]
    const log = Math.log1p(e * 100)
    onset[f] = Math.max(0, log - prev)
    prev = log
  }

  const fps = rate / HOP
  const minLag = Math.floor(fps * 60 / MAX_BPM)
  const maxLag = Math.ceil(fps * 60 / MIN_BPM)
  const mean = onset.reduce((a, b) => a + b, 0) / frames
  for (let f = 0; f < frames; f++) onset[f] -= mean
  const ac = new Float32Array(maxLag * COMB + 2)
  for (let lag = 0; lag < ac.length; lag++) {
    let sum = 0
    for (let f = lag; f < frames; f++) sum += onset[f] * onset[f - lag]
    ac[lag] = sum
  }
  const at = x => { const i = Math.floor(x); return ac[i] + (ac[i + 1] - ac[i]) * (x - i) }
  // A beat at lag L also echoes at 2L, 3L ...: summing them pins L down to a fraction of a frame.
  const comb = lag => { let s = 0; for (let k = 1; k <= COMB; k++) s += at(k * lag); return s }

  let best = 0; let bestLag = 0
  for (let lag = minLag; lag <= maxLag; lag += 0.05) {
    const octaves = Math.log2((fps * 60 / lag) / 120)
    const score = comb(lag) * Math.exp(-0.5 * (octaves / 0.6) ** 2)
    if (score > best) { best = score; bestLag = lag }
  }
  // No beat repeats (a drone, a pad, silence): better the timed crossfade than a wrong bar.
  if (!(ac[0] > 0) || comb(bestLag) / COMB / ac[0] < MIN_CORRELATION) return null

  const bpm = Math.round(fps * 60 / bestLag * 10) / 10
  const period = fps * 60 / bpm
  let bestPhase = 0; let phaseScore = -1
  for (let phase = 0; phase < period; phase++) {
    let sum = 0
    for (let t = phase; t < frames; t += period) sum += onset[Math.round(t)] ?? 0
    if (sum > phaseScore) { phaseScore = sum; bestPhase = phase }
  }
  return { bpm, beat_offset: Math.round(bestPhase / fps * 1000) / 1000 }
}

/** Seconds from `position` (in the track) to its next bar line, never less than `minLead`. */
export function secondsToNextBar (position, { bpm, beat_offset = 0 }, beatsPerBar = 4, minLead = 0.05) {
  const bar = beatsPerBar * 60 / bpm
  let wait = beat_offset + Math.ceil((position - beat_offset) / bar) * bar - position
  while (wait < minLead) wait += bar
  return wait
}
