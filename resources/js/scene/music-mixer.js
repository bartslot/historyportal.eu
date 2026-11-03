/**
 * MusicMixer — the teacher's per-scene music, mixed with Web Audio.
 *
 * Each scene carries a mix (App\Support\SceneMusic): up to three library tracks, each with its own
 * volume, start point, loop points and fades, plus a crossfade length and how far the music dips
 * while the narrator speaks. A scene without a mix of its own keeps the one before it, so a track
 * can run under a whole chapter.
 *
 *   track source ─▶ track gain ─┐
 *   track source ─▶ track gain ─┼─▶ duck bus ─▶ master ─▶ speakers
 *   track source ─▶ track gain ─┘
 *
 * Moving to a new scene diffs the mixes: a track in both keeps playing and only glides to its new
 * volume (no restart on every scene), a track that left fades out, a new one fades in. Loops use
 * AudioBufferSourceNode's own loopStart/loopEnd, so they are sample-accurate with no gap.
 *
 * Same outward shape as BackgroundMusic (setMuted, setVolume, pause, resume, stop, destroy), so the
 * player's deck drives either one without knowing which it has.
 */

const DUCK_TIME_CONSTANT = 0.25   // s; how quickly the music dips under a voice and comes back
const MIN_RAMP = 0.05             // s; a 0 s fade would click
const STOP_FADE = 2               // s; the end of a lesson fades out, never cuts
// ponytail: decoded audio is ~60 MB per 3 min of stereo; keep a handful, stream from <audio> if lessons need more.
const BUFFER_CACHE_SIZE = 6

const clamp01 = v => Math.min(1, Math.max(0, Number(v) || 0))

/** The mix that plays at scene `index`: its own, or the nearest scene before it that has one. */
export function resolveSceneMusic (scenes, index) {
  for (let i = Math.min(index, (scenes?.length ?? 0) - 1); i >= 0; i--) {
    if (scenes[i]?.music) return scenes[i].music
  }
  return null
}

/** Does any scene of this lesson have music of its own? Then the mixer, not the shuffled bed, plays. */
export function hasSceneMusic (scenes) {
  return (scenes || []).some(s => s?.music?.layers?.length)
}

export class MusicMixer {
  /**
   * @param {Record<string, {url: string, title?: string}>} tracks  library tracks by id
   * @param {{volume?: number, AudioContextCtor?: Function, fetchFn?: Function, onError?: Function}} opts
   */
  constructor (tracks, { volume = 0.5, AudioContextCtor, fetchFn, onError } = {}) {
    this._onError = onError || null
    this.tracks = tracks || {}
    this.base = clamp01(volume)
    this._Ctx = AudioContextCtor || globalThis.AudioContext || globalThis.webkitAudioContext
    this._fetch = fetchFn || ((...a) => globalThis.fetch(...a))

    this.muted = false
    this.master = 1
    this.paused = false
    this.started = false

    this._ctx = null
    this._voices = new Map()   // track id → { source, gain, layer }
    this._buffers = new Map()  // url → Promise<AudioBuffer>, oldest first
    this._current = undefined  // the mix last applied
    this._gen = 0              // bumps on every scene change; a track that loads late checks it
    this._ducked = false
    this._duckLevel = 1
    this._stopped = false
  }

  get hasTracks () {
    return Object.keys(this.tracks).length > 0
  }

  /** BackgroundMusic compatibility: the mixer starts with the first scene that has music. */
  start () {
    this.started = true
  }

  /**
   * Play the mix for the scene that just started. Pass the RESOLVED mix (resolveSceneMusic):
   * null means no music at all, and everything fades out.
   */
  enterScene (music) {
    if (this._stopped) return
    if (music === this._current || JSON.stringify(music) === JSON.stringify(this._current)) return
    this._current = music
    const gen = ++this._gen
    if (!music?.layers?.length && !this._voices.size) return
    const ctx = this._ensureContext()
    if (!ctx) return

    const crossfade = Math.max(MIN_RAMP, Number(music?.crossfade ?? 2))
    this._duckLevel = music ? clamp01(music.duck ?? 0.4) : 1
    this._applyDuck()

    const wanted = new Map((music?.layers || []).map(l => [String(l.track_id), l]))
    for (const [id, voice] of [...this._voices]) {
      if (!wanted.has(id)) this._retire(id, voice, Math.max(crossfade, Number(voice.layer.fade_out) || 0))
    }
    for (const [id, layer] of wanted) {
      const voice = this._voices.get(id)
      if (voice) {
        // Still wanted: keep the bar it is on, follow the new settings.
        voice.layer = layer
        this._setLoop(voice.source, layer)
        this._ramp(voice.gain.gain, clamp01(layer.volume), crossfade)
      } else {
        this._open(id, layer, Math.max(crossfade, Number(layer.fade_in) || 0), gen)
      }
    }
  }

  /** The narration started (true) or stopped (false). */
  duck (on) {
    this._ducked = !!on
    this._applyDuck()
  }

  setMuted (muted) {
    this.muted = !!muted
    this._applyMaster()
  }

  setVolume (level) {
    this.master = clamp01(level)
    this._applyMaster()
  }

  pause () {
    this.paused = true
    this._ctx?.suspend?.().catch?.(() => {})
  }

  resume () {
    this.paused = false
    this._ctx?.resume?.().catch?.(() => {})
  }

  /** The lesson is over: fade everything out, then let the context go. */
  stop () {
    if (this._stopped) return
    this._stopped = true
    this._gen++
    if (!this._ctx) return
    for (const [id, voice] of [...this._voices]) this._retire(id, voice, STOP_FADE)
    const ctx = this._ctx
    setTimeout(() => { try { ctx.close() } catch (_) { /* already closed */ } }, STOP_FADE * 1000 + 200)
  }

  /** Page teardown: silence now. */
  destroy () {
    this._stopped = true
    this._gen++
    this._voices.forEach(v => { try { v.source.stop() } catch (_) { /* never started */ } })
    this._voices.clear()
    try { this._ctx?.close() } catch (_) { /* already closed */ }
    this._ctx = null
  }

  // ── Internals ───────────────────────────────────────────────────────────

  _ensureContext () {
    if (this._ctx) return this._ctx
    if (!this._Ctx) return null
    try {
      const ctx = new this._Ctx()
      this._masterGain = ctx.createGain()
      this._duckGain = ctx.createGain()
      this._duckGain.connect(this._masterGain)
      this._masterGain.connect(ctx.destination)
      this._ctx = ctx
      this._applyMaster()
      this._applyDuck()
      if (this.paused) ctx.suspend?.().catch?.(() => {})
      return ctx
    } catch (e) {
      console.warn('music-mixer: no Web Audio', e)
      return null
    }
  }

  async _open (id, layer, fadeIn, gen) {
    const url = this.tracks[id]?.url
    if (!url) return
    let buffer
    try {
      buffer = await this._buffer(url)
    } catch (e) {
      console.warn('music-mixer: track failed to load', url, e)
      this._onError?.(id, e)
      return
    }
    // The class moved on while this was downloading; the newer scene opens what it wants itself.
    if (gen !== this._gen || !this._ctx || this._voices.has(id)) return

    const ctx = this._ctx
    const source = ctx.createBufferSource()
    source.buffer = buffer
    this._setLoop(source, layer)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(clamp01(layer.volume), ctx.currentTime + Math.max(MIN_RAMP, fadeIn))
    source.connect(gain)
    gain.connect(this._duckGain)

    const voice = { source, gain, layer }
    source.onended = () => {
      if (this._voices.get(id) === voice) this._voices.delete(id)
      try { gain.disconnect() } catch (_) { /* gone */ }
    }
    this._voices.set(id, voice)
    source.start(0, Math.min(Math.max(0, Number(layer.offset) || 0), Math.max(0, buffer.duration - 0.05)))
  }

  _setLoop (source, layer) {
    const duration = source.buffer?.duration ?? 0
    const start = Math.max(0, Number(layer.loop_start) || 0)
    const end = Number(layer.loop_end) || 0
    source.loop = !!layer.loop
    source.loopStart = Math.min(start, duration)
    source.loopEnd = end > start ? Math.min(end, duration) : 0   // 0 = the end of the file
  }

  _retire (id, voice, seconds) {
    if (this._voices.get(id) === voice) this._voices.delete(id)
    const t = Math.max(MIN_RAMP, seconds)
    this._ramp(voice.gain.gain, 0, t)
    try { voice.source.stop(this._ctx.currentTime + t + 0.05) } catch (_) { /* already stopped */ }
  }

  _ramp (param, to, seconds) {
    const t = this._ctx.currentTime
    param.cancelScheduledValues(t)
    param.setValueAtTime(param.value, t)
    param.linearRampToValueAtTime(to, t + Math.max(MIN_RAMP, seconds))
  }

  _buffer (url) {
    if (this._buffers.has(url)) {
      const hit = this._buffers.get(url)
      this._buffers.delete(url)   // move to the young end
      this._buffers.set(url, hit)
      return hit
    }
    const p = this._fetch(url)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer() })
      .then(data => this._ctx.decodeAudioData(data))
    p.catch(() => this._buffers.delete(url))
    this._buffers.set(url, p)
    this._evict()
    return p
  }

  _evict () {
    const inUse = new Set([...this._voices.keys()].map(id => this.tracks[id]?.url))
    for (const url of this._buffers.keys()) {
      if (this._buffers.size <= BUFFER_CACHE_SIZE) break
      if (!inUse.has(url)) this._buffers.delete(url)
    }
  }

  _applyDuck () {
    if (!this._ctx) return
    const p = this._duckGain.gain
    const t = this._ctx.currentTime
    p.cancelScheduledValues(t)
    p.setTargetAtTime(this._ducked ? this._duckLevel : 1, t, DUCK_TIME_CONSTANT)
  }

  _applyMaster () {
    if (!this._ctx) return
    const p = this._masterGain.gain
    const t = this._ctx.currentTime
    p.cancelScheduledValues(t)
    p.setTargetAtTime(this.muted ? 0 : this.base * this.master, t, 0.03)
  }
}

/** The player's mixer for a lesson whose scenes have music, built from the page's manifest. */
export function createMusicMixer (tracks, opts = {}) {
  return new MusicMixer(tracks, { volume: window.LP_AUDIO?.scene_music?.volume ?? 0.5, ...opts })
}
