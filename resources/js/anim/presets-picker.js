/**
 * The Animation section of a figure's inspector: x-data="animationPresets(layerId, presets)". A preset clicked plays on
 * the figure on the stage, over and over, saving nothing; Add lays it into the figure's keys at the playhead, one
 * edit and one undo step through the timeline (window.__timelineKeying), where every key stays the teacher's to change.
 */
import { CLIPS, TRAVEL_CYCLES, applyClip, clipSpan, expandClip } from './presets.js'

/** A loop previews this many cycles before it starts over, a move plays once and starts over. */
const PREVIEW_CYCLES = 2
const FIGURE_M = 1.7   // a figure the library gives no height (engine layout.ts)

export function animationPresets (layerId, presets) {
  const target = `s25:${layerId}`
  let raf = 0

  return {
    presets: presets.filter((p) => CLIPS[p.id]),
    hints: {},
    chosen: null,
    speed: 1,
    previewing: false,

    get groups () {
      return [...new Set(this.presets.map((p) => p.group))].map((name) => ({ name, items: this.presets.filter((p) => p.group === name) }))
    },
    get clip () { return CLIPS[this.chosen] ?? null },
    /** What Add will do, in a few words. */
    get hint () {
      if (!this.clip) return ''
      return this.clip.loop ? (this.clip.travel ? this.hints.travelHint : this.hints.loopHint) : (this.hints.onceHint ?? '').replace(':s', String(Math.round((this.clip.duration / this.speed) * 100) / 100))
    },

    init () {
      this.hints = { ...this.$el.dataset }   // read here: in a getter $el is whichever element asks
      window.addEventListener('timeline-playing', (e) => { if (e.detail) this.stop() })
      this.$watch('speed', () => { if (this.previewing) this.play(this.chosen) })
    },
    destroy () { this.stop() },

    /** The clip as this figure's keys from `start`: its bones, the way it faces, its size on the stage. */
    keysFrom (start, length) {
      const stage = window.__stage25d
      const keying = window.__timelineKeying
      const info = stage?.layerInfo?.(layerId)
      if (!info?.puppet || !this.clip) return null
      const height = info.heightM ?? FIGURE_M
      return expandClip(this.clip, {
        start, length, speed: this.speed, bones: info.bones, facing: info.facing ?? 1, limits: info.limits ?? {}, legShare: info.legShare ?? null,
        x0: keying?.value?.(target, 'x') ?? 0.5, y0: keying?.value?.(target, 'y') ?? 0,
        xPerHeight: info.viewWidth ? height / info.viewWidth : 0, yPerHeight: height,
      })
    },

    /** Plays `id` on the figure, round and round, from the playhead. Nothing is saved. */
    play (id) {
      this.stop()
      const keying = window.__timelineKeying
      const stage = window.__stage25d
      this.chosen = id
      if (!keying || !stage?.setLayerKeys) return
      keying.pause?.()
      const from = keying.time()
      const { cycles, cycle } = clipSpan(this.clip, { speed: this.speed })
      const span = (this.clip.loop ? PREVIEW_CYCLES : cycles) * cycle
      const keys = this.keysFrom(from, this.clip.loop ? span : null)
      if (!keys) return
      stage.setLayerKeys(layerId, applyClip(keying.layerKeys(target), keys, { inPlace: !this.clip.travel }))
      this.previewing = true
      const began = performance.now()
      const tick = (now) => {
        if (Math.abs(keying.time() - from) > 1e-3) { this.stop(); return }   // the teacher moved the playhead
        stage.update(from + (((now - began) / 1000) % span))
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    },

    /** The figure back to its own keys, the stage back to the playhead. */
    stop () {
      cancelAnimationFrame(raf)
      raf = 0
      if (!this.previewing) return
      this.previewing = false
      window.__timelineKeying?.refresh?.()
    },

    toggle (id) {
      if (this.previewing && this.chosen === id) this.stop()
      else this.play(id)
    },

    /** The chosen preset into the figure's keys at the playhead: a loop to the end of the scene (a walk for a few
     *  steps), a move once; cut at the scene's end, which it never stretches. */
    add () {
      const keying = window.__timelineKeying
      if (!this.clip || !keying) return
      this.stop()
      const from = keying.time()
      const end = keying.duration()
      const cycle = this.clip.duration / this.speed
      const rest = Math.max(cycle, end - from)
      const length = !this.clip.loop ? null : this.clip.travel ? Math.min(rest, TRAVEL_CYCLES * cycle) : rest
      const keys = this.keysFrom(from, length)?.filter((k) => k.t <= end + 1e-6)
      if (keys?.length) keying.setLayerKeys(target, applyClip(keying.layerKeys(target), keys, { inPlace: !this.clip.travel }))
    },
  }
}
