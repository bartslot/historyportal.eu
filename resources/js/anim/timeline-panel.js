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

import { addKeyframe, removeKeyframe, sortedKeys, sameTime } from './keyframes.js'
import { propertiesFor, sampleFrame, kindOfTarget } from './properties.js'
import { wordSpans, snapTime, wordAt } from './narration-clock.js'
import { textObjects, artObjects, readObjectProperty, writeObjectProperty, setObjectHidden } from './scene-objects.js'
import { isPlayPauseKey } from '../ui/keyboard.js'
import {
  fitZoom, timeAtX, xAtTime, toleranceSeconds, tickStep, ticksFor, formatTime, toMs, fromMs,
  DRAG_THRESHOLD_PX,
} from './timeline-view.js'
/** Per-element drag memory lives OUTSIDE the DOM: a Livewire morph strips any attribute the
 *  server has never heard of, and this state is invented client-side. */
const dragMemory = new WeakMap()

/**
 * Where the playhead was, keyed by scene.
 *
 * Saving a keyframe is a Livewire round trip, the round trip morphs the dock, and the morph
 * re-evaluates x-data — which built a fresh component with time back at 0, so the playhead jumped
 * home every time you keyed anything. Alpine state is not morph-proof; a module-level store is.
 * Same lesson as the drag memory above: state the server has never heard of has to live somewhere
 * the server cannot rewrite.
 */
const SESSIONS = new Map()

/**
 * How long a new scene's timeline runs, in seconds.
 *
 * NOT the narration's length. A segment can be nearly three minutes, and a 170-second ruler makes
 * keyframing impossible — every key lands in the first few pixels. Bart: *"the standard animation
 * time should be 8 seconds, not 170 seconds."* Most movement is a build, not a documentary. The
 * duration is editable, and word-snap still works across whatever range is shown.
 */
const DEFAULT_DURATION = 8

/** One decimal on a row that is 115px wide. `30.815` rendered as "30,815" and read as thirty
 *  thousand; the model keeps its precision, the field does not need it. */
const round1 = (v) => Math.round(v * 10) / 10

/** The map's camera as the five numbers the timeline animates — map-native, so it round-trips. */
export const cameraFromMap = (map) => {
  const centre = map.getCenter()
  return {
    lng: +centre.lng.toFixed(6),
    lat: +centre.lat.toFixed(6),
    zoom: +map.getZoom().toFixed(3),
    heading: +map.getBearing().toFixed(2),
    tilt: +map.getPitch().toFixed(2),
  }
}

/** Put those five numbers back. jumpTo, not easeTo: the timeline owns the timing. */
export const applyCamera = (map, values) => {
  const current = cameraFromMap(map)
  const next = { ...current, ...values }
  map.jumpTo({ center: [next.lng, next.lat], zoom: next.zoom, bearing: next.heading, pitch: next.tilt })
}

export const animationTimeline = (config = {}) => ({
  time: 0,
  duration: Number(config.duration) || DEFAULT_DURATION,
  zoom: 100,
  tracks: Array.isArray(config.tracks) ? config.tracks : [],
  targets: Array.isArray(config.targets) ? config.targets : [],
  spans: [],
  objects: [],
  openGroups: {},
  drag: null,
  scrollLeft: 0,

  loop: false,               // playback returns to 0 at the end instead of stopping
  autoKey: true,             // a value change records itself at the playhead
  hiddenObjects: {},         // objects the author has taken off the canvas while working

  zoomIsMine: false,          // true once the teacher has touched the zoom control

  init () {
    this.spans = wordSpans(config.alignment ?? [])
    this.refreshObjects()

    const saved = SESSIONS.get(config.sceneId)
    if (saved) Object.assign(this, saved)

    // The Format panel's diamonds live in a different component, so the timeline publishes the
    // two things they need. Without this they were drawn but unpressable — which is what the
    // component's own comment said it was waiting for.
    window.__timelineKeying = {
      key: (target, property) => { this.toggleKey(target, property); this.announce() },
      has: (target, property) => this.hasKeyHere(target, property),
      time: () => this.time,
    }

    for (const event of ['scene-objects-changed', 'objscene-changed']) {
      window.addEventListener(event, () => this.refreshObjects())
    }

    /**
     * Ask again whenever the tab is opened, because the event alone arrives too early.
     *
     * The text overlay mounts LAZILY — measured at 3.45s on a narration scene — and this panel is
     * built after it. So the one announcement lands on nobody, init()'s own refreshObjects() has
     * already run against an empty overlay, and the tab reads "Nothing on this scene can be
     * animated yet" with a Title sitting on the canvas. Listening was never going to be enough on
     * its own; the moment a teacher looks at the timeline is the moment to look at the scene.
     */
    this.$watch('$store.view.bottomTab', (tab) => { if (tab === 'timeline') this.refreshObjects() })
    this.waitForObjects()
    this.$nextTick(() => { if (!this.zoomIsMine) this.fit() })
    // Only refit while the zoom is still ours to choose. Refitting on every resize threw away a
    // zoom the teacher had just set, which reads as the control not working.
    new ResizeObserver(() => { if (!this.zoomIsMine) this.fit() }).observe(this.$refs.lanes ?? this.$el)
  },

  /**
   * Keep asking what is on the scene until it answers.
   *
   * The overlays mount on their own schedule — measured at ~3.5s on a narration scene — and none of
   * the three signals covers every order on its own. init() can run first and see nothing; the
   * announcement can arrive before this panel exists to hear it; and the tab watcher never fires
   * when the tab was ALREADY open, which is what a reload gives you. That last one is the ugly
   * case: reload the wizard on a scene you had animated, and the tracks come back from the server
   * while the ROWS stay empty, so a teacher sees their work gone when it is safely in the database.
   *
   * So this asks, on a budget, and stops the moment there is an answer. Twenty seconds rather than
   * five: a heavy scene — a globe, a video, a gallery of paintings — takes its time, and a budget
   * that expires first leaves the teacher looking at "nothing can be animated" on a scene full of
   * layers. Two array reads every 250ms costs nothing next to that. Bounded rather than a standing
   * poll, because a scene that is genuinely empty should stop being asked.
   */
  waitForObjects (tries = 80) {
    if (!tries || this.objects.length || !this.$el?.isConnected) return
    setTimeout(() => {
      if (!this.$el?.isConnected) return   // scene switched; this component is gone
      this.refreshObjects()
      this.waitForObjects(tries - 1)
    }, 250)
  },

  /** Remember everything a morph would otherwise throw away. */
  remember () {
    SESSIONS.set(config.sceneId, {
      time: this.time, zoom: this.zoom, zoomIsMine: this.zoomIsMine, duration: this.duration,
      openGroups: { ...this.openGroups },
      loop: this.loop, autoKey: this.autoKey, hiddenObjects: { ...this.hiddenObjects },
      // The tracks too, because between a save and the next server render the CLIENT holds the
      // newer copy. A rebuild reads the config attribute the server last rendered, which can still
      // be the state before the keyframe you just set — and the keyframes vanish off the lane
      // while sitting safely in the database. Measured: two diamonds to none, no action taken.
      tracks: this.tracks, targets: this.targets,
    })
  },

  // ── The object list, which is what the rows ARE ──────────────────────────────────────────

  /** Objects in this scene that can be animated. The camera is one a map scene HAS, not an
   *  ambient property of every scene — it appears here only once an author has added one. */
  /**
   * The scene's objects: its layers, which are simply THERE, plus any camera an author added.
   *
   * Layers are not stored in the timeline — they belong to the scene. Listing them from the live
   * overlay means a layer added in the Format panel shows up here without a save, and a deleted
   * one stops showing up without leaving a dead track behind.
   */
  refreshObjects () {
    const cameras = this.targets.filter((t) => kindOfTarget(t) === 'camera')
      .map((target) => ({ target, kind: 'camera', label: 'Camera' }))
    this.objects = [...cameras, ...artObjects(), ...textObjects()]
    for (const o of this.objects) if (!(o.target in this.openGroups)) this.openGroups[o.target] = true
  },

  get canHaveCamera () { return ['map', 'voyage'].includes(config.sceneKind) },
  get hasCamera () { return this.targets.includes('camera') },

  /**
   * A camera EXISTS whether or not anything is keyed on it.
   *
   * The first version recorded it by pushing an empty track, which made the object a side effect
   * of a property — so when the camera's rows moved from altitude to zoom, every scene was left
   * holding a track for a property the registry no longer has: invisible, inert, and still saved.
   */
  addCamera () {
    if (this.hasCamera || !this.canHaveCamera) return
    this.targets = [...this.targets, 'camera']
    this.refreshObjects()
    this.save()
  },

  /** How many distinct moments this object is keyed at. Nothing moves under two. */
  keyCountOf (target) { return this.keyTimesOf(target).length },

  /**
   * True when pressing play would show the class precisely nothing.
   *
   * One keyframe is a position, not a movement. The panel has to say so: a play button that runs
   * for thirty seconds and changes nothing on screen reads as the feature being broken, and that
   * is exactly how it read.
   */
  get nothingToPlay () {
    return !this.tracks.some((t) => sortedKeys(t).length >= 2)
  },

  toggleGroup (target) {
    this.openGroups[target] = !this.openGroups[target]
    this.remember()
  },

  /** Are any groups open? Drives whether the collapse-all button collapses or expands. */
  get anyGroupOpen () { return this.objects.some((o) => this.openGroups[o.target]) },

  /**
   * Collapse every group, or open every group when none is open.
   *
   * One button rather than two, because the state is visible in the rows themselves — there is
   * never a moment when you cannot tell which half of the pair you would get.
   */
  toggleAllGroups () {
    const open = !this.anyGroupOpen
    for (const o of this.objects) this.openGroups[o.target] = open
    this.remember()
  },

  // ── Spans. A track's bar runs from its first keyframe to its last ────────────────────────

  /**
   * The stretch of time a property is animated over, or null when it is not animated.
   *
   * ONE keyframe returns null on purpose: a single key is a stored position, not a movement, and
   * a zero-length bar would claim otherwise. It is the same rule applyFrame() plays by.
   */
  spanOf (target, property) {
    const keys = this.keysOf(target, property)
    if (keys.length < 2) return null
    return { from: keys[0].time, to: keys[keys.length - 1].time }
  },

  /** The union of every property's span — the object's own bar on its group row. */
  objectSpan (target) {
    const spans = this.propertiesOf(target)
      .map((p) => this.spanOf(target, p.key))
      .filter(Boolean)
    if (!spans.length) return null
    return {
      from: Math.min(...spans.map((s) => s.from)),
      to: Math.max(...spans.map((s) => s.to)),
    }
  },

  /** A span as pixels on the lane. Kept above zero so a bar is never invisible. */
  barStyle (span) {
    if (!span) return 'display: none'
    const left = this.xOf(span.from)
    const width = Math.max(2, this.xOf(span.to) - left)
    return `left: ${left}px; width: ${width}px`
  },

  // ── Visibility. The eye takes an object off the canvas while you work on another ─────────

  isHidden (target) { return !!this.hiddenObjects[target] },

  toggleHidden (target) {
    this.hiddenObjects[target] = !this.hiddenObjects[target]
    setObjectHidden(target, this.hiddenObjects[target])
    this.remember()
  },

  removeObject (target) {
    this.targets = this.targets.filter((t) => t !== target)
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
  get playheadX () { return xAtTime(this.time, 0, this.zoom) },
  get contentWidth () { return Math.max(0, this.duration * this.zoom) },
  get readout () { return formatTime(this.time) },

  /**
   * Zoom about the PLAYHEAD, not about the left edge.
   *
   * Zooming away from what you are looking at is the thing that made this feel broken: the lane
   * was pinned to zero, so going in far enough left the playhead somewhere off to the right with
   * no way to reach it.
   */
  setZoom (next) {
    const lanes = this.$refs.lanes
    const before = this.time * this.zoom - (lanes?.scrollLeft ?? 0)   // playhead, in screen pixels
    this.zoom = Math.min(2000, Math.max(2, Number(next) || 2))
    this.zoomIsMine = true
    this.$nextTick(() => {
      if (lanes) lanes.scrollLeft = Math.max(0, this.time * this.zoom - before)
      this.remember()
    })
  },

  /** The timeline's length. Keys outside it stay where they are; the ruler simply stops there. */
  setDuration (seconds) {
    this.duration = Math.min(3600, Math.max(0.1, Number(seconds) || DEFAULT_DURATION))
    if (this.time > this.duration) this.seek(this.duration)
    if (!this.zoomIsMine) this.fit()
    this.remember()
    this.save()
  },

  /** Keep the playhead in view when it moves under playback or a keyboard jump. */
  revealPlayhead () {
    const lanes = this.$refs.lanes
    if (!lanes) return
    const x = this.time * this.zoom
    const margin = 40
    if (x < lanes.scrollLeft + margin) lanes.scrollLeft = Math.max(0, x - margin)
    else if (x > lanes.scrollLeft + lanes.clientWidth - margin) lanes.scrollLeft = x - lanes.clientWidth + margin
  },

  /** The word under the playhead, which is the only readout that means anything to a teacher. */
  get spokenWord () { return wordAt(this.spans, this.time)?.word ?? '' },

  xOf (t) { return xAtTime(t, 0, this.zoom) },

  timeFromEvent (event) {
    const lane = this.$refs.lanes
    if (!lane) return 0
    const raw = timeAtX(event.clientX, lane.getBoundingClientRect().left, lane.scrollLeft, this.zoom)
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
    this.remember()
    this.announce()
  },

  /** Tell any diamond outside this component that its answer may have changed. */
  announce () {
    window.dispatchEvent(new CustomEvent('timeline-changed'))
  },

  /** Push the sampled frame at the playhead onto whatever renders it. Scrub and play are the
   *  same code path, so what a teacher sees while dragging is what the class will see. */
  applyFrame () {
    // ONLY tracks with two or more keyframes drive anything.
    //
    // A single keyframe is a stored value, not a movement, and applying it pinned the property for
    // the whole timeline: key the camera at 0, frame a new shot, scrub forward, and the map snapped
    // straight back to the keyed value — so the second keyframe captured the same numbers as the
    // first and nothing ever animated. The teacher has to be free to move the object between the
    // key they just set and the next one.
    const live = this.tracks.filter((t) => sortedKeys(t).length >= 2)
    const frame = sampleFrame(live, this.time)
    const map = window.__lessonMap

    for (const [target, values] of Object.entries(frame)) {
      if (kindOfTarget(target) === 'camera') { if (map) applyCamera(map, values); continue }
      for (const [property, value] of Object.entries(values)) writeObjectProperty(target, property, value)
    }
  },

  // ── Transport ───────────────────────────────────────────────────────────────────────────

  playing: false,
  _raf: null,
  _startedAt: 0,
  _startedFrom: 0,

  play () {
    if (this.playing || !(this.duration > 0) || this.nothingToPlay) return
    this.playing = true
    this._startedFrom = this.time >= this.duration ? 0 : this.time
    this._startedAt = performance.now()
    const step = () => {
      if (!this.playing) return
      const elapsed = (performance.now() - this._startedAt) / 1000
      const t = this._startedFrom + elapsed
      if (t >= this.duration) {
        // Loop returns to the start rather than stopping, which is how you watch a build over and
        // over while tuning it. Restarting the clock beats seeking to 0 and calling play() again:
        // that would rebuild the rAF chain every lap and drift.
        if (this.loop) { this._startedFrom = 0; this._startedAt = performance.now(); this.seek(0) }
        else { this.seek(this.duration); return this.pause() }
      }
      this.seek(t)
      this.revealPlayhead()
      this._raf = requestAnimationFrame(step)
    }
    this._raf = requestAnimationFrame(step)
  },

  pause () {
    this.playing = false
    if (this._raf) cancelAnimationFrame(this._raf)
    this._raf = null
  },

  /**
   * Whether the timeline is the thing on screen, and so whether Space is currently its key.
   *
   * The dock is ONE component with three tabs, and the two it is not showing stay mounted — the
   * tabs are x-show, not x-if. So a timeline that exists is not a timeline anyone is looking at,
   * and without this check Space would scrub a hidden panel while the teacher was typing a
   * lesson script one tab away.
   */
  get transportHasTheKeyboard () {
    const view = this.$store?.view
    return !!view && !!view.script && view.bottomTab === 'timeline'
  },

  /**
   * Space plays and pauses, the way it does in every editor and in the lesson player.
   *
   * Bound from the Blade as `x-on:keydown.window` rather than registered here. Switching scenes
   * changes the dock's wire:key, so Livewire tears the panel down and Alpine builds a fresh
   * component — four switches, five instances, measured. A window listener added in init() would
   * survive every teardown, because Alpine knows nothing about it, and the next one would join it;
   * two handlers turn one press into play-then-pause. Alpine removes a .window binding with the
   * component that declared it, which is the same reason Escape is bound that way already.
   */
  onKeydown (event) {
    if (!isPlayPauseKey(event) || !this.transportHasTheKeyboard) return

    // Play refuses under two keyframes, and the refusal has to look like nothing happened rather
    // than like a broken button. Cancelling the page's scroll to then do nothing is worse than
    // not taking the key at all, so this returns before preventDefault.
    if (!this.playing && this.nothingToPlay) return

    event.preventDefault()   // only now that the key is ours: Space must not also scroll the page
    if (this.playing) this.pause()
    else this.play()
  },

  // ── Keyframes ───────────────────────────────────────────────────────────────────────────

  /**
   * The diamond on a property row: "put what I am looking at, HERE".
   *
   * Sets or UPDATES the key at the playhead. It deliberately does not remove one: re-framing a
   * shot you had already keyed is the common act, and making that two clicks (off, then on) is
   * how you end up with a key you did not mean to delete. Removing is the double-click on the
   * diamond in the lane, where the thing being removed is the thing under the pointer.
   */
  toggleKey (target, property) {
    const map = window.__lessonMap
    const live = kindOfTarget(target) === 'camera'
      ? (map ? cameraFromMap(map)[property] : undefined)
      : readObjectProperty(target, property)

    // A layer nobody has moved yet stores NOTHING for x — it is positioned by the stylesheet, and
    // the property reads null. Bailing on that made the diamond do nothing at all on a fresh
    // layer, silently, which is the worst way for a control to refuse. Key what the row is
    // SHOWING instead: the field says 0, so the keyframe says 0, and the two agree.
    const value = Number.isFinite(live) ? live : 0

    this.writeTrack(target, property, (track) => addKeyframe(track, { time: this.time, value }))
    this.save()
  },

  /** Is there a key exactly under the playhead? Drives the diamond's pressed state. */
  hasKeyHere (target, property) {
    return this.keysOf(target, property).some((k) => sameTime(k.time, this.time))
  },

  /** What this property reads at the playhead: the sampled value when it is animated, and the
   *  map's own value when it is not, so the field never shows a number nothing is using. */
  valueAt (target, property) {
    const keys = this.keysOf(target, property)
    if (keys.length) {
      const frame = sampleFrame(this.tracks, this.time)
      const value = frame[target]?.[property]
      if (Number.isFinite(value)) return round1(value)
    }
    const map = window.__lessonMap
    const live = kindOfTarget(target) === 'camera'
      ? (map ? cameraFromMap(map)[property] : null)
      : readObjectProperty(target, property)
    return Number.isFinite(live) ? round1(live) : 0
  },

  /**
   * Is this property animated? Which is to say: has anyone put a keyframe on it.
   *
   * The gate on auto-keying, and the reason there is one. Recording every value change on every
   * property would mean nudging a title into place on an untouched scene starts an animation
   * nobody asked for, and leaves no way to simply POSITION something. The diamond is what starts
   * an animation; from the first key onwards, the timeline records what you do.
   */
  isAnimated (target, property) { return this.keysOf(target, property).length > 0 },

  /**
   * Typing a number moves the object, and records it at the playhead.
   *
   * Bart: *"Timeline should register new keyframes upon value change. if the time has moved (not
   * same as previous keyframe)"*. Before this it wrote only to a key that was ALREADY under the
   * playhead, so the common act — scrub forward, reposition, scrub forward, reposition — moved the
   * layer and recorded none of it unless you remembered the diamond each time.
   *
   * The two cases are one call: addKeyframe replaces a key at the same moment and inserts at a new
   * one, and "the same moment" is the epsilon test, not `===`, because a playhead dropped by
   * clicking the lane is a float. That is the whole of *"not same as previous keyframe"*.
   */
  setValue (target, property, value) {
    if (!Number.isFinite(value)) return
    const map = window.__lessonMap
    if (kindOfTarget(target) === 'camera') { if (map) applyCamera(map, { [property]: value }) }
    else writeObjectProperty(target, property, value)

    if (!this.autoKey || !this.isAnimated(target, property)) return
    this.writeTrack(target, property, (track) => addKeyframe(track, { time: this.time, value }))
    this.save()
    this.announce()
  },

  /** The keys of every property of this object, so the arrows step through the OBJECT's timing
   *  rather than one row's — which is what a teacher means by "the next keyframe". */
  keyTimesOf (target) {
    const times = new Set()
    for (const property of this.propertiesOf(target)) {
      for (const key of this.keysOf(target, property.key)) times.add(key.time)
    }
    return [...times].sort((a, b) => a - b)
  },

  prevKeyTime (target) {
    return this.keyTimesOf(target).filter((t) => t < this.time && !sameTime(t, this.time)).at(-1) ?? null
  },

  nextKeyTime (target) {
    return this.keyTimesOf(target).find((t) => t > this.time && !sameTime(t, this.time)) ?? null
  },

  /** @param {-1|1} direction */
  jumpKey (target, direction) {
    const to = direction < 0 ? this.prevKeyTime(target) : this.nextKeyTime(target)
    if (to === null) return
    this.seek(to)
    this.revealPlayhead()
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
    this.remember()   // the client's copy is the newer one until the server renders again
    this.$wire?.setTimeline?.({ duration: this.duration, targets: this.targets, tracks: this.tracks })
  },
})
