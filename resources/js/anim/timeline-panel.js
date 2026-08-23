/**
 * timeline-panel.js — the wizard's Timeline tab.
 *
 * Registered from a bundled module rather than a <script> in the Blade, because the dock is morphed
 * in by Livewire and a script that arrives through a morph never runs.
 *
 * The timeline lists the scene's OBJECTS, and a camera is one an author adds to a map — so the rows
 * come from the object list, and each object's property rows come from the registry in
 * properties.js. There is no fixed list anywhere.
 */

import { addKeyframe, removeKeyframe, sortedKeys } from './keyframes.js'
import { propertiesFor, sampleFrame, kindOfTarget } from './properties.js'
import { wordSpans, snapTime, wordAt } from './narration-clock.js'
import {
  fitZoom, timeAtX, xAtTime, toleranceSeconds, tickStep, ticksFor, formatTime, DRAG_THRESHOLD_PX,
} from './timeline-view.js'
import { applyPose, poseFromMap } from '../map/camera-director.js'

/** Per-element drag memory lives OUTSIDE the DOM: a Livewire morph strips any attribute the
 *  server has never heard of, and this state is invented client-side. */
const dragMemory = new WeakMap()

export const animationTimeline = (config = {}) => ({
  time: 0,
  duration: Number(config.duration) || 0,
  zoom: 100,
  tracks: Array.isArray(config.tracks) ? config.tracks : [],
  spans: [],
  objects: [],
  openGroups: {},
  drag: null,
  scrollLeft: 0,

  init () {
    this.spans = wordSpans(config.alignment ?? [])
    if (!this.duration && this.spans.length) this.duration = this.spans.at(-1).end
    this.refreshObjects()
    this.$nextTick(() => this.fit())
    new ResizeObserver(() => this.fit()).observe(this.$refs.lanes ?? this.$el)
  },

  // ── The object list, which is what the rows ARE ──────────────────────────────────────────

  /** Objects in this scene that can be animated. The camera is one a map scene HAS, not an
   *  ambient property of every scene — it appears here only once an author has added one. */
  refreshObjects () {
    const objects = []
    if (this.hasCamera) objects.push({ target: 'camera', label: 'Camera', icon: 'camera' })
    this.objects = objects
    for (const o of objects) if (!(o.target in this.openGroups)) this.openGroups[o.target] = true
  },

  get canHaveCamera () { return ['map', 'voyage'].includes(config.sceneKind) },
  get hasCamera () { return this.tracks.some((t) => kindOfTarget(t.target) === 'camera') },

  addCamera () {
    if (this.hasCamera || !this.canHaveCamera) return
    // A camera with no keys yet: it exists as an object, and holds whatever the map is showing.
    this.tracks = [...this.tracks, { target: 'camera', property: 'altitude', keyframes: [] }]
    this.refreshObjects()
    this.save()
  },

  removeObject (target) {
    this.tracks = this.tracks.filter((t) => t.target !== target)
    this.refreshObjects()
    this.save()
  },

  propertiesOf (target) { return propertiesFor(kindOfTarget(target)) },

  trackFor (target, property) {
    return this.tracks.find((t) => t.target === target && t.property === property) ?? null
  },

  keysOf (target, property) { return sortedKeys(this.trackFor(target, property)) },

  // ── Geometry ────────────────────────────────────────────────────────────────────────────

  fit () {
    const width = this.$refs.lanes?.clientWidth ?? 0
    if (width > 0 && this.duration > 0) this.zoom = fitZoom(width, this.duration)
  },

  get ticks () { return ticksFor(this.duration, tickStep(this.zoom)) },
  get playheadX () { return xAtTime(this.time, this.scrollLeft, this.zoom) },
  get readout () { return formatTime(this.time) },

  /** The word under the playhead, which is the only readout that means anything to a teacher. */
  get spokenWord () { return wordAt(this.spans, this.time)?.word ?? '' },

  xOf (t) { return xAtTime(t, this.scrollLeft, this.zoom) },

  timeFromEvent (event) {
    const lane = this.$refs.lanes
    if (!lane) return 0
    const raw = timeAtX(event.clientX, lane.getBoundingClientRect().left, this.scrollLeft, this.zoom)
    return Math.min(this.duration, Math.max(0, raw))
  },

  // ── Scrubbing. The playhead is dragged, and the map follows it live rather than on release ──

  startScrub (event) {
    if (event.button !== 0) return
    const el = event.currentTarget
    el.setPointerCapture?.(event.pointerId)
    dragMemory.set(el, { kind: 'scrub', startX: event.clientX, startTime: this.time, moved: false })
    this.drag = { el }
    this.seek(this.timeFromEvent(event))
  },

  onPointerMove (event) {
    if (!this.drag) return
    const memory = dragMemory.get(this.drag.el)
    if (!memory) return

    if (!memory.moved && Math.abs(event.clientX - memory.startX) < DRAG_THRESHOLD_PX) return
    if (!memory.moved) {
      memory.moved = true
      // Only now: preventDefault on pointerdown would have swallowed the double-click.
      event.preventDefault()
    }

    if (memory.kind === 'scrub') return this.seek(this.timeFromEvent(event))
    if (memory.kind === 'key') return this.dragKey(memory, event)
  },

  onPointerUp () {
    if (this.drag) {
      const memory = dragMemory.get(this.drag.el)
      if (memory?.kind === 'key' && memory.moved) this.save()
      dragMemory.delete(this.drag.el)
    }
    this.drag = null
  },

  /** Esc returns the value to what it was when the drag started — the thing nobody notices
   *  until it is missing. */
  onEscape () {
    if (!this.drag) return
    const memory = dragMemory.get(this.drag.el)
    if (memory?.kind === 'scrub') this.seek(memory.startTime)
    if (memory?.kind === 'key') this.moveKey(memory.target, memory.property, memory.keyTime, memory.startTime)
    dragMemory.delete(this.drag.el)
    this.drag = null
  },

  seek (time) {
    this.time = Math.min(this.duration, Math.max(0, time))
    this.applyFrame()
  },

  /** Push the sampled frame at the playhead onto whatever renders it. Scrub and play are the
   *  same code path, so what a teacher sees while dragging is what the class will see. */
  applyFrame () {
    const frame = sampleFrame(this.tracks, this.time)
    const map = window.__lessonMap
    if (frame.camera && map) applyPose(map, { ...poseFromMap(map), ...frame.camera })
  },

  // ── Transport ───────────────────────────────────────────────────────────────────────────

  playing: false,
  _raf: null,
  _startedAt: 0,
  _startedFrom: 0,

  play () {
    if (this.playing || !(this.duration > 0)) return
    this.playing = true
    this._startedFrom = this.time >= this.duration ? 0 : this.time
    this._startedAt = performance.now()
    const step = () => {
      if (!this.playing) return
      const elapsed = (performance.now() - this._startedAt) / 1000
      const t = this._startedFrom + elapsed
      if (t >= this.duration) { this.seek(this.duration); return this.pause() }
      this.seek(t)
      this._raf = requestAnimationFrame(step)
    }
    this._raf = requestAnimationFrame(step)
  },

  pause () {
    this.playing = false
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = null
  },

  // ── Keyframes ───────────────────────────────────────────────────────────────────────────

  /** The diamond on a property row: "put what I am looking at, here". */
  toggleKey (target, property) {
    const existing = this.keysOf(target, property).find((k) => Math.abs(k.time - this.time) < 1e-6)
    if (existing) return this.removeKeyAt(target, property, existing.time)

    const map = window.__lessonMap
    const pose = map ? poseFromMap(map) : {}
    const value = pose[property]
    if (!Number.isFinite(value)) return

    this.writeTrack(target, property, (track) => addKeyframe(track, { time: this.time, value }))
    this.save()
  },

  /** Is there a key exactly under the playhead? Drives the diamond's pressed state. */
  hasKeyHere (target, property) {
    return this.keysOf(target, property).some((k) => Math.abs(k.time - this.time) < 1e-6)
  },

  /** What this property reads at the playhead: the sampled value when it is animated, and the
   *  map's own value when it is not, so the field never shows a number nothing is using. */
  valueAt (target, property) {
    const keys = this.keysOf(target, property)
    if (keys.length) {
      const frame = sampleFrame(this.tracks, this.time)
      const value = frame[target]?.[property]
      if (Number.isFinite(value)) return Math.round(value * 1000) / 1000
    }
    const map = window.__lessonMap
    const live = map && kindOfTarget(target) === 'camera' ? poseFromMap(map)[property] : null
    return Number.isFinite(live) ? Math.round(live * 1000) / 1000 : 0
  },

  /** Typing a number moves the object AND, if this property is keyed here, moves that key's value.
   *  Editing a value at a keyframe that then ignored it is the sort of thing nobody reports. */
  setValue (target, property, value) {
    if (!Number.isFinite(value)) return
    const map = window.__lessonMap
    if (map && kindOfTarget(target) === 'camera') applyPose(map, { ...poseFromMap(map), [property]: value })

    if (!this.hasKeyHere(target, property)) return
    this.writeTrack(target, property, (track) => ({
      ...track,
      keyframes: sortedKeys(track).map((k) => (Math.abs(k.time - this.time) < 1e-6 ? { ...k, value } : k)),
    }))
    this.save()
  },

  removeKeyAt (target, property, time) {
    this.writeTrack(target, property, (track) => {
      const index = sortedKeys(track).findIndex((k) => k.time === time)
      return index < 0 ? track : removeKeyframe({ ...track, keyframes: sortedKeys(track) }, index)
    })
    this.save()
  },

  startKeyDrag (event, target, property, time) {
    if (event.button !== 0) return
    event.stopPropagation()
    const el = event.currentTarget
    el.setPointerCapture?.(event.pointerId)
    dragMemory.set(el, {
      kind: 'key', target, property, keyTime: time, startTime: time,
      startX: event.clientX, moved: false,
    })
    this.drag = { el }
  },

  dragKey (memory, event) {
    const wanted = this.timeFromEvent(event)
    const snapped = event.altKey
      ? wanted
      : snapTime(this.spans, wanted, toleranceSeconds(this.zoom))

    if (snapped === memory.keyTime) return
    this.moveKey(memory.target, memory.property, memory.keyTime, snapped)
    memory.keyTime = snapped
    this.seek(snapped)
  },

  moveKey (target, property, from, to) {
    this.writeTrack(target, property, (track) => ({
      ...track,
      keyframes: sortedKeys(track).map((k) => (k.time === from ? { ...k, time: to } : k)),
    }))
  },

  /** Every edit replaces the track; nothing here mutates one in place. */
  writeTrack (target, property, mutate) {
    const existing = this.trackFor(target, property) ?? { target, property, keyframes: [] }
    const next = { ...mutate(existing), target, property }
    this.tracks = this.trackFor(target, property)
      ? this.tracks.map((t) => (t.target === target && t.property === property ? next : t))
      : [...this.tracks, next]
  },

  save () {
    this.$wire?.setTimeline?.({ duration: this.duration, tracks: this.tracks })
  },
})
