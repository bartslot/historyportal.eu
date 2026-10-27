// The lesson's sound in the browser. One Web Audio graph:
//
//   bed sources -> bed gain ─┐
//                            ├─> ambience bus (duck / silence) ─┐
//   sfx sources -> sfx bus ──────────────────────────────────────┼─> master (mute) -> destination
//   narration (optional) -> narration bus ───────────────────────┘
//
// play(lesson, from) schedules every event of schedule.ts on the AudioContext clock; pause suspends
// the context, seek stops and reschedules. The narrator is not ours: a page may connect its
// <audio> element with connectNarration() so one master mute covers everything.
// Best effort like scene/sfx.js: a missing file or a blocked context never throws at a class.
import bank from './bank.json'
import type { Lesson } from '../director/types'
import { schedule, sceneStarts, type SoundEvent } from './schedule'

type Entry = { id: string; file: string; gain: number }
const ENTRIES = new Map<string, Entry>([...bank.beds, ...bank.sfx].map((e) => [e.id, e as Entry]))

export type LogLine = { at: number; ev: SoundEvent | { kind: string; [k: string]: unknown } }

export class LessonSound {
  readonly ctx: AudioContext
  readonly master: GainNode
  readonly ambience: GainNode
  readonly sfx: GainNode
  readonly narration: GainNode
  readonly log: LogLine[] = []
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private live: AudioScheduledSourceNode[] = []
  private bedGains = new Map<string, GainNode>()
  private loose = new Map<string, { src: AudioBufferSourceNode; g: GainNode }>()
  private muted = false
  private origin = 0 // ctx time of lesson time 0

  constructor(ctx: AudioContext, private baseUrl = bank.base_url) {
    this.ctx = ctx
    this.master = ctx.createGain()
    this.ambience = ctx.createGain()
    this.sfx = ctx.createGain()
    this.narration = ctx.createGain()
    this.ambience.connect(this.master)
    this.sfx.connect(this.master)
    this.narration.connect(this.master)
    this.master.connect(ctx.destination)
  }

  private load(id: string): Promise<AudioBuffer | null> {
    if (!this.buffers.has(id)) {
      const e = ENTRIES.get(id)
      this.buffers.set(id, !e ? Promise.resolve(null) : fetch(this.baseUrl + e.file)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status} ${e.file}`))))
        .then((b) => this.ctx.decodeAudioData(b))
        .catch((err) => { this.note({ kind: 'load-failed', id, err: String(err) }); return null }))
    }
    return this.buffers.get(id)!
  }

  private note(ev: LogLine['ev']) { this.log.push({ at: this.ctx.currentTime, ev }) }

  /** Fetch and decode everything a lesson uses, so play() starts on time. */
  async preload(lesson: Lesson): Promise<void> {
    const ids = new Set(lesson.scenes.flatMap((s) => [...(s.sound?.ambience.map((a) => a.id) ?? []), ...(s.sound?.sfx.map((x) => x.id) ?? [])]))
    await Promise.all([...ids].map((id) => this.load(id)))
  }

  /** Play from a lesson time (seconds). Stops whatever was playing first. A negative `from` is a
   *  preroll: scene 1's ambience starts now and lesson time 0 comes -from seconds later. */
  async play(lesson: Lesson, from = 0): Promise<void> {
    this.stop()
    await this.preload(lesson)
    const now = this.ctx.currentTime + 0.05
    this.origin = now - from
    for (const ev of schedule(lesson, Math.max(0, -from))) await this.apply(ev, from)
    this.note({ kind: 'play', from, scenes: sceneStarts(lesson).length })
  }

  /** Play from the start of scene `index`. */
  playScene(lesson: Lesson, index: number): Promise<void> {
    return this.play(lesson, sceneStarts(lesson)[index] ?? 0)
  }

  private at(t: number) { return Math.max(this.ctx.currentTime, this.origin + t) }

  private bedGain(id: string): GainNode {
    let g = this.bedGains.get(id)
    if (!g) { g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.ambience); this.bedGains.set(id, g) }
    return g
  }

  private async apply(ev: SoundEvent, from: number) {
    const entry = 'id' in ev ? ENTRIES.get(ev.id) : null
    switch (ev.kind) {
      case 'bed-start': {
        if (ev.stop <= from) return
        const buf = await this.load(ev.id)
        if (!buf) return
        const src = this.ctx.createBufferSource()
        src.buffer = buf; src.loop = true
        src.connect(this.bedGain(ev.id))
        const offset = Math.max(0, from - ev.t) % buf.duration // a seek lands mid-loop
        src.start(this.at(ev.t), offset)
        src.stop(this.at(ev.stop))
        this.live.push(src)
        break
      }
      case 'bed-gain': {
        const g = this.bedGain(ev.id).gain
        const target = ev.gain // the scene's bed gain (bank default, teacher-editable)
        if (ev.t + ev.ramp <= from) { g.setValueAtTime(target, this.ctx.currentTime); break }
        g.setTargetAtTime(target, this.at(ev.t), ev.ramp / 3)
        break
      }
      case 'amb-bus': {
        const g = this.ambience.gain
        if (ev.t + ev.ramp <= from) { g.setValueAtTime(ev.gain, this.ctx.currentTime); break }
        g.setTargetAtTime(ev.gain, this.at(ev.t), ev.ramp / 3)
        break
      }
      case 'sfx': {
        if (ev.t < from) return
        const buf = await this.load(ev.id)
        if (!buf) return
        const src = this.ctx.createBufferSource(); src.buffer = buf
        const g = this.ctx.createGain(); g.gain.value = ev.gain * (entry?.gain ?? 1)
        src.connect(g); g.connect(this.sfx)
        src.start(this.at(ev.t))
        this.live.push(src)
        break
      }
    }
    this.note(ev)
  }

  /** One-shot now (quiz answers, the power meter): outside the lesson clock. */
  async hit(id: string, gain = 1): Promise<void> {
    const buf = await this.load(id)
    if (!buf) return
    const src = this.ctx.createBufferSource(); src.buffer = buf
    const g = this.ctx.createGain(); g.gain.value = gain * (ENTRIES.get(id)?.gain ?? 1)
    src.connect(g); g.connect(this.sfx); src.start()
    this.note({ kind: 'hit', id })
  }

  /** A bed outside the lesson clock (the museum intro's room): fades in, loops until bedOff(). */
  async bedOn(id: string, fade = 1): Promise<void> {
    const buf = await this.load(id)
    if (!buf || this.loose.has(id)) return
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true
    const g = this.ctx.createGain(); g.gain.value = 0
    g.gain.setTargetAtTime(ENTRIES.get(id)?.gain ?? 1, this.ctx.currentTime, fade / 3)
    src.connect(g); g.connect(this.master); src.start()
    this.loose.set(id, { src, g })
    this.note({ kind: 'bed-on', id })
  }

  bedOff(id: string, fade = 1.5): void {
    const b = this.loose.get(id)
    if (!b) return
    b.g.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3)
    b.src.stop(this.ctx.currentTime + fade * 2)
    this.loose.delete(id)
    this.note({ kind: 'bed-off', id })
  }

  /** The narrator's own element, so the master mute covers it too. */
  connectNarration(el: HTMLMediaElement): void {
    this.ctx.createMediaElementSource(el).connect(this.narration)
  }

  stop(): void {
    for (const s of this.live) { try { s.stop() } catch { /* already stopped */ } }
    this.live = []
    for (const g of this.bedGains.values()) { g.gain.cancelScheduledValues(0); g.gain.value = 0 }
    this.ambience.gain.cancelScheduledValues(0); this.ambience.gain.value = 1
  }

  pause(): Promise<void> { return this.ctx.suspend() }
  resume(): Promise<void> { return this.ctx.resume() }

  setMuted(m: boolean): void {
    this.muted = m
    this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02)
    this.note({ kind: 'mute', muted: m })
  }

  /** Graph state for tests and the dev panel: what plays, how loud, nothing heard. */
  state() {
    return {
      ctx: this.ctx.state, muted: this.muted, time: this.ctx.currentTime - this.origin,
      master: this.master.gain.value, ambienceBus: this.ambience.gain.value,
      beds: Object.fromEntries([...this.bedGains].map(([id, g]) => [id, Math.round(g.gain.value * 1000) / 1000])),
      sources: this.live.length, events: this.log.length, loose: [...this.loose.keys()],
    }
  }
}
