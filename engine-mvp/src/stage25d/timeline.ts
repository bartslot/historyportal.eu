// Lesson playback without the renderer: which scene, how far into it, and whether it plays, is paused, or holds for
// a class interaction. The stage drives it once per frame (tick); tests drive it with plain numbers.
//   playing -> (scene with `interaction` reaches its end) -> holding: onInteraction(scene, resume) fires once;
//   resume() from the card moves on. holdAt(i, t) adds a stop inside a scene; setTime(t) poses without a rebuild
//   (a power meter); onScene(fn) tells which scene is on screen. pause()/resume() stop and restart the picture; clock() is the lesson position
//   (scene starts + t), so it stands still while paused or holding and S5's sound schedule stays in step.
import { sceneDuration } from './layout'
import type { Scene } from './types'

export type Mode = 'playing' | 'paused' | 'holding' | 'ended'
export type InteractionHandler = (scene: Scene, resume: () => void) => void

export class Timeline {
  index = 0
  t = 0
  /** seconds the current hold has lasted (drives the camera breathing) */
  holdT = 0
  private paused = false
  private hold: number | null = null     // the ticket of the hold in force
  private ended = false
  private ticket = 0                      // bumps on every scene change: a stale build or resume is ignored
  private entering = 0
  private dirty = false                   // the set was edited while a scene was loading: build it again once it lands
  private handlers = new Set<InteractionHandler>()
  private sceneListeners = new Set<(index: number) => void>()
  /** extra stops inside scenes (holdAt): scene index -> times; armed again each time the scene is entered */
  private stops = new Map<number, number[]>()
  private passed = new Set<string>()
  private listeners = new Set<() => void>()

  constructor(private scenes: () => Scene[], private build: (i: number) => Promise<void>) {}

  get mode(): Mode { return this.ended ? 'ended' : this.hold !== null ? 'holding' : this.paused ? 'paused' : 'playing' }
  get scene(): Scene { return this.scenes()[this.index] }
  /** start of scene i on the lesson clock */
  sceneStart(i: number): number { return this.scenes().slice(0, i).reduce((n, s) => n + sceneDuration(s), 0) }
  /** the lesson position in seconds: excludes pauses and holds */
  clock(): number { return this.sceneStart(this.index) + this.t }
  duration(): number { return this.sceneStart(this.scenes().length) }

  onInteraction(fn: InteractionHandler): () => void { this.handlers.add(fn); return () => { this.handlers.delete(fn) } }
  /** the scene on screen changed (after its set is built) */
  onScene(fn: (index: number) => void): () => void { this.sceneListeners.add(fn); return () => { this.sceneListeners.delete(fn) } }
  /** A guaranteed hold t s into scene i (besides the one at the end of a scene with an interaction): the picture stops
   *  there, onInteraction fires, and resume() plays on from t. Returns a remover. */
  holdAt(i: number, t: number): () => void {
    this.stops.set(i, [...(this.stops.get(i) ?? []), t].sort((a, b) => a - b))
    return () => { this.stops.set(i, (this.stops.get(i) ?? []).filter((x) => x !== t)) }
  }
  /** Pose the current scene at t without a rebuild (keeps pause and hold as they are): a power meter drives this. */
  setTime(t: number) { this.t = Math.max(0, Math.min(sceneDuration(this.scene), t)); this.emit() }

  /** mode, scene or position jumps (not every frame) */
  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn) } }
  private emit() { this.listeners.forEach((fn) => fn()) }

  /** Go to scene i at t (builds it first; the old frame holds meanwhile). Clears a hold and the end. */
  async enter(i: number, at = 0): Promise<void> {
    const target = Math.max(0, Math.min(this.scenes().length - 1, i))
    const mine = ++this.entering
    this.dirty = false
    await this.build(target)
    if (mine !== this.entering) return    // a later seek won
    while (this.dirty) {                  // edited meanwhile: the build above may hold old data
      this.dirty = false
      await this.build(target)
      if (mine !== this.entering) return
    }
    this.entering = 0
    this.ticket++
    const changed = target !== this.index
    Object.assign(this, { index: target, t: Math.min(at, sceneDuration(this.scenes()[target])), hold: null, holdT: 0, ended: false })
    this.passed = new Set([...(this.stops.get(target) ?? [])].filter((x) => x < this.t).map((x) => `${target}:${x}`))  // stops behind a seek stay passed
    this.emit()
    if (changed) this.sceneListeners.forEach((fn) => fn(target))
  }

  /** Rebuild the scene on screen after an edit to its set, keeping position, pause and hold as they are. */
  rebuild(): Promise<void> {
    if (this.entering) { this.dirty = true; return Promise.resolve() }   // a racing build would cancel the one in flight
    return this.build(this.index)
  }

  seekToScene(id: string): Promise<void> {
    const i = this.scenes().findIndex((s) => s.id === id)
    if (i < 0) return Promise.reject(new Error(`no scene ${id}`))
    return this.enter(i)
  }

  pause() { if (!this.paused) { this.paused = true; this.emit() } }
  /** Restart after pause(); at the end of the lesson, from the top. A hold is ended by its own resume callback. */
  resume() {
    if (this.ended) { this.paused = false; void this.enter(0); return }
    if (this.paused) { this.paused = false; this.emit() }
  }

  /** Advance by dt seconds of real time. */
  tick(dt: number) {
    if (this.entering) return
    if (this.hold !== null) { this.holdT += dt; return }
    if (this.paused || this.ended) return
    const dur = sceneDuration(this.scene)
    const to = Math.min(dur, this.t + dt)
    const stop = (this.stops.get(this.index) ?? []).find((x) => x > this.t - 1e-9 && x <= to && !this.passed.has(`${this.index}:${x}`))
    if (stop !== undefined && stop < dur) {           // a stop at the very end is the end-of-scene hold itself
      this.passed.add(`${this.index}:${stop}`)
      this.t = stop
      this.startHold(false)
      return
    }
    this.t = to
    if (this.t < dur) return
    if (this.scene.interaction || this.stops.get(this.index)?.some((x) => x >= dur && !this.passed.has(`${this.index}:${x}`))) this.startHold()
    else this.next()
  }

  /** atEnd: the scene's own interaction (resume = next scene); else a holdAt stop (resume = play on in this scene) */
  private startHold(atEnd = true) {
    const ticket = this.ticket
    this.hold = ticket
    this.holdT = 0
    this.emit()
    const resume = () => {
      if (this.hold !== ticket || this.ticket !== ticket) return
      this.hold = null
      this.paused = false                 // the card is done: the lesson goes on, even if someone paused during it
      if (atEnd) this.next(); else this.emit()
    }
    this.handlers.forEach((fn) => fn(this.scene, resume))
  }

  private next() {
    if (this.index < this.scenes().length - 1) { void this.enter(this.index + 1); return }
    this.ended = true
    this.emit()
  }
}
