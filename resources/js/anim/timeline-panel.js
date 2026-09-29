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

import { addKeyframe, sortedKeys, sameTime, segmentEasing, easingFn } from './keyframes.js'
import { keyId, moveKeys, deleteKeys, snapToNearest } from './timeline-edit.js'
import { propertiesFor, sampleFrame, kindOfTarget } from './properties.js'
import { wordSpans, snapTime, wordAt } from './narration-clock.js'
import { textObjects, artObjects, dioramaObjects, readObjectProperty, writeObjectProperty, setObjectHidden } from './scene-objects.js'
import { clipOf, shiftClip, stretchClip } from '../scene/diorama/clip.js'

/** Which part of a diorama cell a row edits: X across, Z away from the camera. */
const DIO_AXIS = { x: 0, z: 1 }
import { isPlayPauseKey, isTypingTarget } from '../ui/keyboard.js'
import { EASE, parseBezier, formatBezier } from '../easing.js'
import {
  fitZoom, timeAtX, toleranceSeconds, tickStep, ticksFor, formatTime,
  DRAG_THRESHOLD_PX, LANE_PAD_PX, zoomFromSlider, sliderFromZoom,
} from './timeline-view.js'

/** Figma's Bézier easing presets, by our easing.js names. 'hold' is Figma's Hold: a cut. */
const EASING_PRESETS = [
  'linear', 'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeInBack', 'easeOutBack', 'easeInOutBack', 'hold',
]

/**
 * The handles a preset starts the Custom bezier editor from. Where easing.js already states the
 * curve as CSS it is used verbatim; the back curves are the standard CSS approximations.
 */
const PRESET_BEZIER = {
  linear: [0, 0, 1, 1],
  hold: [0, 0, 1, 1],
  easeInCubic: parseBezier(EASE.exit),
  easeOutCubic: parseBezier(EASE.enter),
  easeInOutCubic: parseBezier(EASE.move),
  easeInBack: [0.6, -0.28, 0.735, 0.045],
  easeOutBack: [0.175, 0.885, 0.32, 1.275],
  easeInOutBack: [0.68, -0.55, 0.265, 1.55],
}

/** The editor's plot, in SVG units: 0..1 maps onto a 128-unit square, with room for overshoot. */
const PLOT = { left: 12, size: 128, zeroY: 168, minV: -0.3, maxV: 1.3 }

/** Wheel pixels to zoom factor for Cmd/Ctrl+wheel and trackpad pinch. */
const WHEEL_ZOOM_RATE = 0.01
const MIN_ZOOM = 2
const MAX_ZOOM = 2000
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

/** True while the timeline itself is moving the camera, so its own move is not taken for an edit. */
let applyingCamera = false

/** Put those five numbers back. jumpTo, not easeTo: the timeline owns the timing. */
export const applyCamera = (map, values) => {
  const current = cameraFromMap(map)
  const next = { ...current, ...values }
  applyingCamera = true
  try {
    map.jumpTo({ center: [next.lng, next.lat], zoom: next.zoom, bearing: next.heading, pitch: next.tilt })
  } finally {
    applyingCamera = false
  }
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

  /** Selected keyframes, as keyId strings. Figma: click selects, Shift+click adds, Delete removes. */
  selected: [],
  /** The marquee rectangle while one is being drawn, in lane-content pixels. */
  marquee: null,
  /** Bumped whenever the canvas moves something, so fields that read live values re-render. */
  canvasTick: 0,

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
      // A diorama drag records a key at the playhead while this is on (never during playback).
      autoKey: () => this.autoKey && !this.playing,
    }

    for (const event of ['scene-objects-changed', 'objscene-changed']) {
      window.addEventListener(event, () => { this.refreshObjects(); this.canvasTick++ })   // a diorama path changed: its rows re-read
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
    this.listenToCanvas()
    this.$nextTick(() => { if (this.zoomIsMine) this.measureFit(); else this.fit() })
    // Only refit while the zoom is still ours to choose. Refitting on every resize threw away a
    // zoom the teacher had just set, which reads as the control not working.
    new ResizeObserver(() => { if (this.zoomIsMine) this.measureFit(); else this.fit() }).observe(this.$refs.lanes ?? this.$el)
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

  /**
   * The canvas and the panel are one control.
   *
   * Pan the map or drag a layer and the fields follow live; with auto-key on, the change records
   * itself at the playhead on every property already animated — Figma's auto-keyframe takes
   * canvas edits as well as typed ones. Before this the fields went stale, and the next scrub
   * snapped the object back to the keyed value, throwing the teacher's move away.
   *
   * The timeline's own writes are skipped: the camera through `applyingCamera` (jumpTo fires its
   * events synchronously), layers because recordCanvasEdit only keys a value that differs from
   * the sample at the playhead, and the timeline only ever writes the sample.
   *
   * The map listener is attached once per MAP and looks the panel up when it fires, because the
   * panel is rebuilt on every scene switch while the map outlives it.
   */
  listenToCanvas () {
    const hookMap = (tries = 80) => {
      const map = window.__lessonMap
      if (!this.$el?.isConnected) return
      if (!map) { if (tries) setTimeout(() => hookMap(tries - 1), 250); return }
      if (map.__timelineHooked) return
      map.__timelineHooked = true
      const panel = () => document.querySelector('[data-timeline]')?._x_dataStack?.[0]
      map.on('move', () => { const p = panel(); if (p) p.canvasTick++ })
      map.on('moveend', () => {
        if (applyingCamera) return
        panel()?.recordCanvasEdit('camera', cameraFromMap(map))
      })
    }
    hookMap()
  },

  /** Canvas edit → keyframes, for animated properties whose value really changed. */
  recordCanvasEdit (target, values) {
    this.canvasTick++
    if (this.playing || this.drag || !this.autoKey) return
    const frame = sampleFrame(this.tracks.filter((t) => sortedKeys(t).length), this.time)[target] ?? {}
    let changed = false
    for (const [property, value] of Object.entries(values ?? {})) {
      if (!Number.isFinite(value) || !this.isAnimated(target, property)) continue
      if (Math.abs((frame[property] ?? NaN) - value) < 1e-3) continue
      this.writeTrack(target, property, (track) => addKeyframe(track, { time: this.time, value }))
      changed = true
    }
    if (changed) { this.save(); this.announce() }
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
    this.objects = [...cameras, ...artObjects(), ...textObjects(), ...dioramaObjects()]
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
    return !this.tracks.some((t) => sortedKeys(t).length >= 2) &&
      !this.objects.some((o) => o.kind === 'dio' && this.dioramaClip(o.target))
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
    if (kindOfTarget(target) === 'dio') return this.dioramaClip(target)
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

  keysOf (target, property) {
    if (kindOfTarget(target) === 'dio') return this.dioramaKeys(target, property)
    return sortedKeys(this.trackFor(target, property))
  },

  // ── Geometry ────────────────────────────────────────────────────────────────────────────

  /** The zoom at which the whole timeline fits the lanes — the slider's zoomed-out end. Kept up to
   *  date on every resize even once the teacher owns the zoom, so the slider stays calibrated. */
  fittedZoom: 100,

  measureFit () {
    const width = (this.$refs.lanes?.clientWidth ?? 0) - 2 * LANE_PAD_PX
    if (width > 0 && this.duration > 0) this.fittedZoom = fitZoom(width, this.duration)
  },

  fit () {
    this.measureFit()
    this.zoom = this.fittedZoom
  },

  get ticks () { return ticksFor(this.duration, tickStep(this.zoom)) },
  get playheadX () { return this.xOf(this.time) },
  get contentWidth () { return Math.max(0, this.duration * this.zoom) + 2 * LANE_PAD_PX },
  get readout () { return formatTime(this.time) },

  /**
   * Zoom about a moment that stays put on screen: the playhead for the slider, the pointer for
   * Cmd/Ctrl+wheel and pinch, which is what Figma's timeline does.
   */
  setZoom (next, anchorTime = this.time) {
    const lanes = this.$refs.lanes
    const before = this.xOf(anchorTime) - (lanes?.scrollLeft ?? 0)   // anchor, in screen pixels
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(next) || MIN_ZOOM))
    this.zoomIsMine = true
    this.$nextTick(() => {
      if (lanes) lanes.scrollLeft = Math.max(0, this.xOf(anchorTime) - before)
      this.remember()
    })
  },

  get zoomSlider () { return sliderFromZoom(this.zoom, this.fittedZoom) },
  setZoomFromSlider (value) { this.setZoom(zoomFromSlider(value, this.fittedZoom)) },

  /** Cmd/Ctrl+wheel and trackpad pinch (which arrives as a ctrl+wheel) zoom about the pointer.
   *  A plain wheel is left to the browser: it scrolls the lanes. */
  onWheel (event) {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    const anchor = this.rawTimeFromEvent(event)
    this.setZoom(this.zoom * Math.exp(-event.deltaY * WHEEL_ZOOM_RATE), anchor)
  },

  /** The timeline's length. Keys outside it stay where they are; the ruler simply stops there. */
  setDuration (seconds) {
    this.duration = Math.min(3600, Math.max(0.1, Number(seconds) || DEFAULT_DURATION))
    if (this.time > this.duration) this.seek(this.duration)
    if (this.zoomIsMine) this.measureFit(); else this.fit()
    this.remember()
    this.save()
  },

  /** Keep the playhead in view when it moves under playback or a keyboard jump. */
  revealPlayhead () {
    const lanes = this.$refs.lanes
    if (!lanes) return
    const x = this.xOf(this.time)
    const margin = 40
    if (x < lanes.scrollLeft + margin) lanes.scrollLeft = Math.max(0, x - margin)
    else if (x > lanes.scrollLeft + lanes.clientWidth - margin) lanes.scrollLeft = x - lanes.clientWidth + margin
  },

  /** The word under the playhead, which is the only readout that means anything to a teacher. */
  get spokenWord () { return wordAt(this.spans, this.time)?.word ?? '' },

  xOf (t) { return LANE_PAD_PX + t * this.zoom },

  /** Seconds under the pointer, unclamped. */
  rawTimeFromEvent (event) {
    const lane = this.$refs.lanes
    if (!lane) return 0
    return timeAtX(event.clientX, lane.getBoundingClientRect().left + LANE_PAD_PX, lane.scrollLeft, this.zoom)
  },

  timeFromEvent (event) {
    return Math.min(this.duration, Math.max(0, this.rawTimeFromEvent(event)))
  },

  // ── Pointer. The ruler scrubs; the tracks select (Figma: click, Shift+click, marquee) ──────

  /** Pressing the RULER scrubs the playhead, and the scene follows live. Playback yields to it. */
  startScrub (event) {
    if (event.button !== 0) return
    event.stopPropagation()
    this.pause()
    const el = event.currentTarget
    el.setPointerCapture?.(event.pointerId)
    dragMemory.set(el, { kind: 'scrub', startX: event.clientX, startTime: this.time, moved: false })
    this.drag = { el }
    this.seek(this.timeFromEvent(event))
  },

  /** Pressing an empty stretch of TRACK starts a marquee; a press with no drag clears the
   *  selection, which is how every canvas and timeline deselects. */
  startMarquee (event) {
    if (event.button !== 0) return
    const el = event.currentTarget
    el.setPointerCapture?.(event.pointerId)
    const origin = this.contentPoint(event)
    dragMemory.set(el, {
      kind: 'marquee', startX: event.clientX, moved: false, origin,
      base: event.shiftKey ? [...this.selected] : [],
    })
    this.drag = { el }
  },

  /** A pointer position in lane-content pixels, so a marquee survives horizontal scrolling. */
  contentPoint (event) {
    const box = this.$refs.content.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  },

  updateMarquee (memory, event) {
    const p = this.contentPoint(event)
    const o = memory.origin
    this.marquee = { x: Math.min(o.x, p.x), y: Math.min(o.y, p.y), w: Math.abs(p.x - o.x), h: Math.abs(p.y - o.y) }
    const box = this.$refs.content.getBoundingClientRect()
    const rect = { left: box.left + this.marquee.x, top: box.top + this.marquee.y }
    rect.right = rect.left + this.marquee.w
    rect.bottom = rect.top + this.marquee.h
    const hit = [...this.$refs.content.querySelectorAll('[data-key-id]')]
      .filter((node) => node.offsetParent)            // a collapsed group's keys are not selectable
      .filter((node) => {
        const r = node.getBoundingClientRect()
        return r.right >= rect.left && r.left <= rect.right && r.bottom >= rect.top && r.top <= rect.bottom
      })
      .map((node) => node.dataset.keyId)
    this.selected = [...new Set([...memory.base, ...hit])]
  },

  onPointerMove (event) {
    if (!this.drag) return
    const memory = dragMemory.get(this.drag.el)
    if (!memory) return

    if (memory.kind === 'bezier') return this.dragHandle(memory, event)
    if (!memory.moved && Math.abs(event.clientX - memory.startX) < DRAG_THRESHOLD_PX
        && Math.abs(event.clientY - (memory.startY ?? event.clientY)) < DRAG_THRESHOLD_PX) return
    if (!memory.moved) {
      memory.moved = true
      // Only now: preventDefault on pointerdown would have swallowed the double-click.
      event.preventDefault()
    }

    if (memory.kind === 'scrub') return this.seek(this.timeFromEvent(event))
    if (memory.kind === 'key') return this.dragKey(memory, event)
    if (memory.kind === 'marquee') return this.updateMarquee(memory, event)
  },

  onPointerUp () {
    if (this.drag) {
      const memory = dragMemory.get(this.drag.el)
      if ((memory?.kind === 'key' && memory.moved) || memory?.kind === 'bezier') this.save()
      // A click on a key that was already part of a selection narrows the selection to it; a
      // Shift+click on a selected key takes it out. Both wait for the release, because the same
      // press might have been the start of dragging the whole selection.
      if (memory?.kind === 'key' && !memory.moved) memory.onClick?.()
      if (memory?.kind === 'marquee' && !memory.moved) this.selected = memory.base
      dragMemory.delete(this.drag.el)
    }
    this.drag = null
    this.marquee = null
  },

  /** Esc cancels a drag in flight, and otherwise clears the selection. */
  onEscape () {
    if (this.easingMenu && !this.drag) { this.closeEasing(); return }
    if (!this.drag) { if (this.transportHasTheKeyboard) this.selected = []; return }
    const memory = dragMemory.get(this.drag.el)
    if (memory?.kind === 'scrub') this.seek(memory.startTime)
    if (memory?.kind === 'key') { this.tracks = memory.baseTracks; this.selected = memory.baseSelected; this.applyFrame() }
    if (memory?.kind === 'marquee') this.selected = memory.base
    if (memory?.kind === 'bezier') { this.bezierDraft = memory.before; this.setSegmentEasing(formatBezier(memory.before)) }
    dragMemory.delete(this.drag.el)
    this.drag = null
    this.marquee = null
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
    // A diorama plays its own paths (walks, facing, depth order) from the same clock.
    window.__diorama?.update(this.time)
  },

  // ── Diorama clips. An item's path is ONE clip: drag it to move the walk in time, drag an end
  //    to stretch or squeeze it (Bart, 2026-09-29). The keys live in the diorama JSON, not here.

  /** The item behind a `dio:<id>` target, from the live stage. */
  dioramaItem (target) {
    const id = String(target).slice(4)
    return window.__diorama?.items().find((i) => i.id === id) ?? null
  },

  dioramaClip (target) { return clipOf(this.dioramaItem(target)) },

  /** A diorama row's keys as timeline keys: the path's keys, one component of each cell. */
  dioramaKeys (target, property) {
    void this.canvasTick   // reactive: the stage changed the path
    const i = DIO_AXIS[property]
    return (this.dioramaItem(target)?.keys ?? []).map((k) => ({ time: k.t, value: k.cell[i] }))
  },

  /** True when the item's picture has a walk animation: its clip is a walk, not a glide. */
  dioramaWalks (target) {
    const item = this.dioramaItem(target)
    return !!(item && window.__diorama?.assets?.[item.asset]?.sheet?.anims?.walk)
  },

  startDioramaClip (event, target) {
    if (event.button !== 0) return
    event.stopPropagation()
    this.pause()
    const stage = window.__diorama
    const item = this.dioramaItem(target)
    if (!stage || !item?.keys?.length) return
    const keys0 = item.keys
    const bar = event.currentTarget.getBoundingClientRect()
    const EDGE_PX = 8
    const mode = event.clientX - bar.left < EDGE_PX ? 'start' : bar.right - event.clientX < EDGE_PX ? 'end' : 'move'
    const t0 = this.rawTimeFromEvent(event)
    let keys = keys0
    let moved = false
    const onMove = (e) => {
      if (!moved && Math.abs(e.clientX - event.clientX) < DRAG_THRESHOLD_PX) return
      moved = true
      const dt = this.rawTimeFromEvent(e) - t0
      keys = mode === 'move' ? shiftClip(keys0, dt)
        : stretchClip(keys0, mode, (mode === 'end' ? keys0[keys0.length - 1].t : keys0[0].t) + dt)
      stage.setKeys(item.id, keys)
      stage.update(this.time)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      if (moved) window.Livewire?.dispatch('diorama:keys', { itemId: item.id, keys })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
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
      let t = this._startedFrom + elapsed
      if (t >= this.duration) {
        // Loop returns to the start rather than stopping, which is how you watch a build over and
        // over while tuning it. Restarting the clock beats seeking to 0 and calling play() again:
        // that would rebuild the rAF chain every lap and drift. The lap WRAPS the time, it does
        // not seek twice: seeking 0 and then the overshoot clamped every lap to one frame at the
        // end, a visible flash back to the final pose.
        if (!this.loop) { this.seek(this.duration); return this.pause() }
        t %= this.duration
        this._startedFrom = 0
        this._startedAt = performance.now() - t * 1000
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
    if (this.isDeleteKey(event)) {
      event.preventDefault()
      return this.deleteSelected()
    }
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
    if (kindOfTarget(target) === 'dio') { window.__diorama?.keyHere(target.slice(4)); return }
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
    void this.canvasTick   // a reactive read: the canvas moved, so the live value may have too
    if (kindOfTarget(target) === 'dio') {
      void this.time
      const cell = window.__diorama?.poseCell(target.slice(4))
      return cell ? Math.round(cell[DIO_AXIS[property]] * 100) / 100 : 0
    }
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
    if (kindOfTarget(target) === 'dio') {
      // The stage applies the canvas rules: snapped, on its floor, recorded while auto-key is on.
      const id = target.slice(4)
      const cell = [...(window.__diorama?.poseCell(id) ?? [0, 0])]
      cell[DIO_AXIS[property]] = value
      window.__diorama?.placeCell(id, cell)
      return
    }
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

  // ── Selection ───────────────────────────────────────────────────────────────────────────

  isSelected (target, property, time) { return this.selected.includes(keyId({ target, property, time })) },

  /** Every selected key as a reference, dropping any whose key no longer exists. */
  get selectedRefs () {
    return this.tracks.flatMap((track) => sortedKeys(track)
      .map((k) => ({ target: track.target, property: track.property, time: k.time }))
      .filter((ref) => this.selected.includes(keyId(ref))))
  },

  /** Delete/Backspace on the timeline, never while the caret is in a field. */
  isDeleteKey (event) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return false
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return false
    return this.transportHasTheKeyboard && !isTypingTarget(event.target) && this.selected.length > 0
  },

  deleteSelected () {
    // Diorama keys live in the diorama JSON: one removal per item, at the selected times.
    const dioTimes = {}
    for (const id of this.selected) {
      const [target, , time] = id.split('|')
      if (kindOfTarget(target) === 'dio') (dioTimes[target] ??= []).push(Number(time))
    }
    for (const [target, times] of Object.entries(dioTimes)) window.__diorama?.removeKeys(target.slice(4), [...new Set(times)])
    this.tracks = deleteKeys(this.tracks, this.selectedRefs)
    this.selected = []
    this.applyFrame()
    this.save()
    this.announce()
  },

  /** Double-click a keyframe: the playhead jumps to it, as in Figma, so its value can be edited. */
  jumpToKey (target, property, time) {
    this.pause()
    this.selected = [keyId({ target, property, time })]
    this.seek(time)
    this.revealPlayhead()
  },

  /**
   * Press on a keyframe. Selection follows Figma: a plain press on an unselected key selects only
   * it, Shift adds it. A press on an already selected key keeps the selection, so the drag that
   * may follow moves all of it; if no drag follows, the release decides (see onPointerUp).
   */
  startKeyDrag (event, target, property, time) {
    if (event.button !== 0) return
    event.stopPropagation()
    this.pause()
    const id = keyId({ target, property, time })
    if (kindOfTarget(target) === 'dio') {   // select only: a diorama path moves in time as one clip
      this.selected = event.shiftKey ? [...new Set([...this.selected, id])] : [id]
      return
    }
    const wasSelected = this.selected.includes(id)
    let onClick = null
    if (event.shiftKey) {
      if (wasSelected) onClick = () => { this.selected = this.selected.filter((s) => s !== id) }
      else this.selected = [...this.selected, id]
    } else if (wasSelected) {
      onClick = () => { this.selected = [id] }
    } else {
      this.selected = [id]
    }
    this.startMove(event, this.selectedRefs, time, onClick)
  },

  /** Begin moving `refs` with the pointer, `anchorTime` being the time that snaps. */
  startMove (event, refs, anchorTime, onClick = null) {
    this.easingMenu = null
    const el = event.currentTarget
    el.setPointerCapture?.(event.pointerId)
    dragMemory.set(el, {
      kind: 'key', anchorTime, startX: event.clientX, startY: event.clientY, moved: false, onClick,
      baseTracks: this.tracks, baseSelected: [...this.selected], refs,
    })
    this.drag = { el }
  },

  // ── The active object: the layer selected on the canvas, highlighted here ─────────────────

  /** The timeline target of the object selected on the canvas (or by its row here), or null. */
  activeTarget: null,

  /** A canvas selection id — `art_<asset>` for artwork, the text id for text — as a target. */
  targetFromObjectId (id) {
    if (!id) return null
    if (String(id).startsWith('art_')) return `art:${String(id).slice(4)}`
    if (String(id).startsWith('dio_')) return `dio:${String(id).slice(4)}`
    const text = this.objects.find((o) => (o.kind === 'text' || o.kind === 'rect') && o.target.slice(o.target.indexOf(':') + 1) === String(id))
    return text?.target ?? null
  },

  /**
   * Clicking a layer on the canvas highlights its row, opens its group and scrolls it into view.
   * It does NOT select the layer's keys: Delete pressed to remove the layer would take its
   * animation with it. Selecting keys stays a timeline gesture.
   */
  onObjectSelected (id) {
    const target = this.targetFromObjectId(id)
    this.activeTarget = target
    if (!target) return
    if (!this.openGroups[target]) { this.openGroups[target] = true; this.remember() }
    this.$nextTick(() => {
      const row = [...this.$el.querySelectorAll('[data-timeline-group]')].find((el) => el.dataset.timelineGroup === target)
      row?.scrollIntoView({ block: 'nearest' })
    })
  },

  /**
   * Clicking a row's NAME: the other direction. The layer is selected on the canvas, and — as in
   * Figma, where selecting a layer in the timeline selects its keyframes — all its keys are.
   */
  selectObject (target) {
    this.activeTarget = target
    this.selected = this.refsOf(target).map(keyId)
    const [kind, ...rest] = String(target).split(':')
    const id = rest.join(':')
    if (kind === 'art') (window.__artOverlay?.() ?? window.__lessonArtworkLayer)?.select?.(`art_${id}`)
    else if (kind === 'text' || kind === 'rect') window.__lessonTextLayer?.select?.(id)
    else if (kind === 'dio') window.__diorama?.select?.(id)
  },

  // ── Bars. Drag one to move the whole animation; click between two keys to choose easing ────

  /** Every key of one property, or of every property of an object. */
  refsOf (target, property = null) {
    return this.tracks
      .filter((t) => t.target === target && (property === null || t.property === property))
      .flatMap((t) => sortedKeys(t).map((k) => ({ target, property: t.property, time: k.time })))
  },

  /**
   * Press on a property's segment. A drag moves the whole track — Figma's "drag layer tracks to
   * reposition them"; a click opens the Easing menu for that segment, which is where Figma puts it.
   */
  startSegment (event, target, property, index) {
    if (event.button !== 0) return
    event.stopPropagation()
    this.pause()
    const refs = this.refsOf(target, property)
    const anchor = Math.min(...refs.map((r) => r.time))
    const rect = event.currentTarget.getBoundingClientRect()
    this.startMove(event, refs, anchor, () => this.openEasing(target, property, index, rect))
  },

  /** Press on an object's bar: drag moves everything it does; a click selects all its keys. */
  startObjectBar (event, target) {
    if (kindOfTarget(target) === 'dio') return this.startDioramaClip(event, target)
    if (event.button !== 0) return
    event.stopPropagation()
    this.pause()
    const refs = this.refsOf(target)
    const anchor = Math.min(...refs.map((r) => r.time))
    this.startMove(event, refs, anchor, () => { this.selected = refs.map(keyId) })
  },

  /** The stretches between consecutive keys, each with the easing it will actually play. */
  segmentsOf (target, property) {
    const track = this.trackFor(target, property)
    const keys = sortedKeys(track)
    return keys.slice(0, -1).map((a, index) => ({
      index, from: a.time, to: keys[index + 1].time,
      easing: segmentEasing(a, index, keys.length - 1, track),
      chosen: !!a.easing,
    }))
  },

  // ── Easing ──────────────────────────────────────────────────────────────────────────────

  /** The open Easing menu: which segment, and where on screen. Null when closed. */
  easingMenu: null,

  openEasing (target, property, index, rect) {
    const below = rect.bottom + 6
    const menuH = 400   // the taller of the two views, the bezier editor
    const top = below + menuH > window.innerHeight ? Math.max(8, rect.top - menuH - 6) : below
    const left = Math.min(window.innerWidth - 216, Math.max(8, rect.left + rect.width / 2 - 104))
    this.easingMenu = { target, property, index, top, left }
  },

  closeEasing () { this.easingMenu = null },

  /** Figma's Bézier presets, in Figma's order. Labels come translated from the server. */
  get easingOptions () {
    const seg = this.easingSegment
    const auto = seg ? segmentEasing({}, seg.index, this.segmentsOf(this.easingMenu.target, this.easingMenu.property).length) : 'easeInOutCubic'
    return [
      { name: 'auto', curve: auto, label: `${this.easingLabel('auto')} · ${this.easingLabel(auto)}` },
      ...EASING_PRESETS.map((name) => ({ name, curve: name, label: this.easingLabel(name) })),
      { name: 'custom', curve: seg && parseBezier(seg.easing) ? seg.easing : 'cubic-bezier(0.2, 0.9, 0.3, 0.6)', label: this.easingLabel('custom') },
    ]
  },

  /** 'auto' when the stretch follows the positional default, otherwise the chosen name. */
  get currentEasingName () {
    const seg = this.easingSegment
    if (!seg) return null
    if (!seg.chosen) return 'auto'
    return parseBezier(seg.easing) ? 'custom' : seg.easing
  },

  easingLabel (name) { return config.easingLabels?.[name] ?? name },

  isOpenSegment (target, property, index) {
    const m = this.easingMenu
    return !!m && m.target === target && m.property === property && m.index === index
  },

  /** The segment the menu is about, with its easing resolved. */
  get easingSegment () {
    const m = this.easingMenu
    return m ? this.segmentsOf(m.target, m.property)[m.index] ?? null : null
  },

  /**
   * Put an easing on the open segment. It lives on the key the segment LEAVES, which is what the
   * sampler reads. 'auto' removes the choice, so the positional default applies again.
   */
  chooseEasing (name) {
    if (name === 'custom') return this.openBezier()
    this.setSegmentEasing(name)
    this.save()
  },

  /** Write an easing onto the open segment and show it, without saving (the bezier drag calls
   *  this every frame; the save waits for the release). */
  setSegmentEasing (name) {
    const m = this.easingMenu
    if (!m) return
    this.writeTrack(m.target, m.property, (track) => {
      const keys = sortedKeys(track)
      const leaving = keys[m.index]
      if (!leaving) return track
      return {
        ...track,
        keyframes: keys.map((k) => {
          if (k !== leaving) return k
          const { easing, ...rest } = k
          return name === 'auto' ? rest : { ...rest, easing: name }
        }),
      }
    })
    this.applyFrame()
  },

  // ── Custom bezier: two handles on a curve, or a cubic-bezier() typed in ───────────────────

  /** The handles being edited, [x1, y1, x2, y2]. */
  bezierDraft: [0.42, 0, 0.58, 1],

  /** Open the editor on the curve the segment already has, so nothing jumps. */
  openBezier () {
    const current = this.easingSegment?.easing
    this.bezierDraft = parseBezier(current) ?? PRESET_BEZIER[current] ?? [0.42, 0, 0.58, 1]
    this.easingMenu = { ...this.easingMenu, editing: true }
    this.setSegmentEasing(formatBezier(this.bezierDraft))
    this.save()
  },

  backToPresets () { this.easingMenu = { ...this.easingMenu, editing: false } },

  get bezierText () { return formatBezier(this.bezierDraft) },

  plotX (u) { return PLOT.left + u * PLOT.size },
  plotY (v) { return PLOT.zeroY - v * PLOT.size },

  /** The curve, drawn as SVG's own cubic from the same four numbers the sampler uses. */
  get bezierPath () {
    const [x1, y1, x2, y2] = this.bezierDraft
    return `M${this.plotX(0)},${this.plotY(0)} C${this.plotX(x1)},${this.plotY(y1)} ${this.plotX(x2)},${this.plotY(y2)} ${this.plotX(1)},${this.plotY(1)}`
  },

  startHandle (event, which) {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    const el = event.currentTarget
    el.setPointerCapture?.(event.pointerId)
    dragMemory.set(el, { kind: 'bezier', which, svg: el.ownerSVGElement, before: [...this.bezierDraft], moved: true })
    this.drag = { el }
  },

  /** Handle x is held to 0..1 (CSS requires it); y may overshoot, which is what a back curve is. */
  dragHandle (memory, event) {
    const matrix = memory.svg.getScreenCTM()?.inverse()
    if (!matrix) return
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix)
    const u = Math.min(1, Math.max(0, (p.x - PLOT.left) / PLOT.size))
    const v = Math.min(PLOT.maxV, Math.max(PLOT.minV, (PLOT.zeroY - p.y) / PLOT.size))
    const next = [...this.bezierDraft]
    next[memory.which * 2] = u
    next[memory.which * 2 + 1] = v
    this.bezierDraft = next
    this.setSegmentEasing(formatBezier(next))
  },

  /** Typed in the field: applied on Enter/blur, refused (and the field put back) if unreadable. */
  typeBezier (text) {
    const parsed = parseBezier(text)
    if (!parsed) return
    this.bezierDraft = parsed
    this.setSegmentEasing(formatBezier(parsed))
    this.save()
  },

  /** A 40x24 polyline of an easing curve, for the menu's preview. Back easings overshoot the box. */
  curvePath (name) {
    const fn = easingFn(name)
    const points = []
    for (let i = 0; i <= 24; i++) {
      const u = i / 24
      points.push(`${(u * 36 + 2).toFixed(1)},${(20 - fn(u) * 16).toFixed(1)}`)
    }
    return name === 'hold' ? 'M2,20 L38,20 L38,4' : `M${points.join(' L')}`
  },

  /**
   * Move the selection by how far the POINTER has travelled, not to where it is: grabbing a
   * diamond off-centre used to jump it half a diamond before it followed.
   *
   * The grabbed key snaps and the rest keep their spacing. Default snap is to a spoken word;
   * Shift snaps to the playhead and to other keys (Figma's Shift); Alt places freely.
   */
  dragKey (memory, event) {
    const wanted = memory.anchorTime + (event.clientX - memory.startX) / this.zoom
    const tolerance = toleranceSeconds(this.zoom)
    let snapped = wanted
    if (event.shiftKey) {
      const moving = new Set(memory.refs.map(keyId))
      const others = memory.baseTracks.flatMap((track) => sortedKeys(track)
        .filter((k) => !moving.has(keyId({ target: track.target, property: track.property, time: k.time })))
        .map((k) => k.time))
      snapped = snapToNearest(wanted, [this.time, ...others], tolerance)
    } else if (!event.altKey) {
      snapped = snapTime(this.spans, wanted, tolerance)
    }

    const { tracks, delta } = moveKeys(memory.baseTracks, memory.refs, snapped - memory.anchorTime, 0, this.duration)
    this.tracks = tracks
    this.selected = memory.refs.map((ref) => keyId({ ...ref, time: ref.time + delta }))
    if (!event.shiftKey) this.seek(memory.anchorTime + delta)
    else this.applyFrame()
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
