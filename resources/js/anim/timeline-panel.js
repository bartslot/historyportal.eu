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

import { addKeyframe, sortedKeys, sameTime, segmentEasing, easingFn, keyStateAt, toggleKeyframe, baseOf, cameraValueMoves } from './keyframes.js'
import { keyId, moveKeys, deleteKeys, rubberBand, snapToNearest } from './timeline-edit.js'
import { propertiesFor, propertyFor, sampleFrame, kindOfTarget, INTERPOLATE, keyGroupTogether } from './properties.js'
import { wordSpans, snapTime, wordAt, sentenceAt } from './narration-clock.js'
import { loopRestarts, videoLengthLabel, probeVideoLength } from './video-clip.js'
import { textObjects, artObjects, balloonObjects, dioramaObjects, stage25dObjects, backgroundObjects, territoryObjects, readObjectProperty, writeObjectProperty, setObjectHidden, canHide } from './scene-objects.js'
import { createSaveQueue } from './save-queue.js'
import { introCameraTracks, isIntroCamera } from './scene-animation.js'
import { applyTextPreset, PRESET_PROPERTIES, EXIT_PRESETS } from './text-presets.js'
import { applyMapPreset, MAP_PRESET_PROPERTIES, MAP_EXIT_PRESETS } from './map-presets.js'
import { applyCameraPreset } from './map-camera-presets.js'
import { balloonPatch } from '../scene/BalloonLayer.js'
import { LAYER_KEY_FIELDS, WORD_FIELDS, keysFromTracks, tracksFromKeys } from './stage25d-keys.js'

/** A track the stage keeps on a layer's keys (stage25d-keys.js), not one of the timeline's own. */
const isLayerKeyTrack = (t) => LAYER_KEY_FIELDS.includes(t.property) || WORD_FIELDS.includes(t.property)
import { clipOf, shiftClip, stretchClip } from '../scene/diorama/clip.js'
import { sailClip, storedSail, sailProgressAt } from './sail-clip.js'

/** Which part of a diorama cell a row edits: X across, Z away from the camera. */
const DIO_AXIS = { x: 0, z: 1 }
import { isPlayPauseKey, isTypingTarget, scrubDirection } from '../ui/keyboard.js'
import { EASE, parseBezier, formatBezier } from '../easing.js'
import {
  fitZoom, timeAtX, toleranceSeconds, tickStep, ticksFor, formatTime,
  DRAG_THRESHOLD_PX, LANE_PAD_PX, zoomFromSlider, sliderFromZoom,
} from './timeline-view.js'
import { labelColumn } from './timeline-label-column.js'
import { groupsFor, sectionKey, displayOf, toShown, fromShown, nudged, summaryTimes } from './timeline-groups.js'

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

/** Copy values on a keyframe: `{ kind, values }`. Outside the panel, so a pose carries over to another scene. */
let keyClip = null
/** How long a let-go key takes to spring back out of another key's zone. */
const KEY_SPRING_MS = 160
/** Room the keyframe menu needs above the window's bottom edge, px. */
const KEY_MENU_H = 120

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
 * The scene's narration, one <audio> per scene, kept OUT of the Alpine component: a media element
 * behind Alpine's reactive proxy misbehaves, and a scene switch rebuilds the component while the
 * clip is still loaded and worth keeping (Bart, 2026-11-23: play in the timeline plays the voice).
 */
const NARRATION = new Map()

/** The narration's preview volume in the editor, per teacher (not the lesson's: the class sets its own on the deck). */
const VOLUME_KEY = 'timeline-narration-volume'
const storedVolume = () => {
  try { const v = Number(localStorage.getItem(VOLUME_KEY)); return localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1 } catch { return 1 }
}

/** The clip as peaks for the narration lane: one 0..1 loudness per bucket, at most `max` buckets. */
export const audioPeaks = (samples, buckets) => {
  const n = Math.max(1, Math.floor(buckets))
  const size = Math.max(1, Math.floor(samples.length / n))
  const peaks = []
  let top = 0
  for (let i = 0; i < n && i * size < samples.length; i++) {
    let peak = 0
    for (let j = i * size, end = Math.min(samples.length, j + size); j < end; j++) { const v = Math.abs(samples[j]); if (v > peak) peak = v }
    peaks.push(peak)
    if (peak > top) top = peak
  }
  return top > 0 ? peaks.map((p) => p / top) : peaks
}

/** Peaks as one SVG path in a `0 0 {peaks.length} 100` box: a bar per bucket, mirrored about the middle. */
export const peaksPath = (peaks) => peaks.map((p, i) => {
  const h = Math.max(1, p * 92)
  return `M${i + 0.5} ${(50 - h / 2).toFixed(1)}v${h.toFixed(1)}`
}).join('')

/** The latest key on any track, so a timeline that follows the narration never cuts a key off. */
const lastKeyTime = (tracks) => {
  let last = 0
  for (const t of tracks ?? []) for (const k of t?.keyframes ?? []) if (Number.isFinite(k?.time) && k.time > last) last = k.time
  return last
}

/** How long the Choices clip reads at the end of the ruler: the card comes when the scene is over. */
const CHOICES_CLIP_S = 1.5
const isPinnedObject = (o) => o.kind === 'choices' || o.kind === 'camera' || o.kind === 's25cam' || o.kind === 'sail'

const pinStyle = (scrolled, layer) => ` position: relative; z-index: ${layer}; background: var(--color-timeline-ground); transform: translateY(${scrolled}px);`

/** The sessionStorage key for one scene's unsent live edit. */
const draftKey = (sceneId) => `timeline-draft:${sceneId}`

/** A draft older than this is left behind: the server may have moved on since it was written. */
const DRAFT_MAX_AGE_MS = 10 * 60 * 1000

/**
 * How long a new scene's timeline runs, in seconds.
 *
 * NOT the narration's length. A segment can be nearly three minutes, and a 170-second ruler makes
 * keyframing impossible — every key lands in the first few pixels. Bart: *"the standard animation
 * time should be 8 seconds, not 170 seconds."* Most movement is a build, not a documentary. The
 * duration is editable, and word-snap still works across whatever range is shown.
 */
const DEFAULT_DURATION = 8
/** Room after the timeline's end: the inspector's resize handle reaches into the panel (.lp-resize, 6 px past the gap) and took
 *  the press meant for a key on the very end, resizing the inspector instead (Bart, 2026-11-05). */
const LANE_END_PAD_PX = 28

/** One press of an arrow key on the timeline, in seconds; with Shift. */
const SCRUB_S = 0.1
const SCRUB_LONG_S = 1

/** One decimal on a row that is 115px wide. `30.815` rendered as "30,815" and read as thirty
 *  thousand; the model keeps its precision, the field does not need it. */
// Two decimals: a factor (scale, opacity) moves in steps of 0.05, and tenths showed 0.25 as 0.3.
const round2 = (v) => Math.round(v * 100) / 100

/** How long a live keyframe edit waits for the teacher to pause before it saves to the server. */
const LIVE_SAVE_PAUSE_MS = 400

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


let stretchRaf = 0

/**
 * Play `from` → `to` once on the stage, then stay at `to` (a text preset just picked). Through window.__timelineKeying
 * every frame, not one panel: the save re-renders the scene and the panel is rebuilt part way. Stops the moment the
 * playhead is not where this left it (the teacher took it). Reduced motion: straight to `to`.
 */
function playStretch (from, to, reduced) {
  cancelAnimationFrame(stretchRaf)
  const keying = () => window.__timelineKeying
  if (reduced || !(to > from)) { keying()?.seek?.(to); return }
  let at = from
  keying()?.seek?.(from)
  const began = performance.now()
  const step = (now) => {
    const k = keying()
    if (!k?.seek || Math.abs(k.time() - at) > 1e-3) return
    at = Math.min(to, from + (now - began) / 1000)
    k.seek(at)
    if (at < to) stretchRaf = requestAnimationFrame(step)
  }
  stretchRaf = requestAnimationFrame(step)
}

export const animationTimeline = (config = {}) => ({
  ...labelColumn(),
  time: 0,
  duration: Number(config.duration) || DEFAULT_DURATION,
  /** The teacher typed a Length: it stays theirs. Until then a scene with narration is as long as its clip. */
  durationSet: !!config.durationSet,
  /** Seconds of narration audio, once known; 0 for a scene without any. */
  narrationLength: 0,
  /** The narration lane's waveform, as an SVG path over `waveBuckets` columns; '' until decoded. */
  wavePath: '',
  waveBuckets: 0,
  /** The editor's preview volume for the narration, 0..1, and whether it is muted. */
  narrationVolume: storedVolume(),
  narrationMuted: false,
  zoom: 100,
  tracks: Array.isArray(config.tracks) ? config.tracks : [],
  targets: Array.isArray(config.targets) ? config.targets : [],
  /** A voyage leg's crossing as the teacher set it, { start, end } in seconds; null plays the default (sail-clip.js). */
  sail: storedSail(config),
  spans: [],
  objects: [],
  openGroups: {},
  drag: null,
  scrollLeft: 0,

  loop: false,               // playback returns to 0 at the end instead of stopping
  autoKey: true,             // a value change records itself at the playhead
  hiddenObjects: {},         // objects the author has taken off the canvas while working

  zoomIsMine: false,          // true once the teacher has touched the zoom control
  _saves: null,               // the live save queue, made by saves() on first use

  /** Selected keyframes, as keyId strings. Figma: click selects, Shift+click adds, Delete removes. */
  selected: [],
  /** The marquee rectangle while one is being drawn, in lane-content pixels. */
  marquee: null,
  /** Bumped whenever the canvas moves something, so fields that read live values re-render. */
  canvasTick: 0,

  /** The background's moving version (SceneLoop): its URL from the server, its length once the browser has read it. */
  videoLoop: config.loop ?? null,
  videoLength: null,

  init () {
    this.spans = wordSpans(config.alignment ?? [])
    this.refreshObjects()
    if (this.videoLoop) probeVideoLength(this.videoLoop).then((s) => { this.videoLength = s })
    // A video dropped on (or removed from) this scene arrives with its next scene:load, while the
    // panel lives on: follow it, so the clip appears without switching scenes.
    window.Livewire?.on?.('scene:load', (e) => {
      const p = Array.isArray(e) ? e[0]?.payload : e?.payload
      if (!p || p.sceneId !== config.sceneId) return
      const url = p.imageLoop ?? null
      if (url === this.videoLoop) return
      this.videoLoop = url
      this.videoLength = null
      this.refreshObjects()
      if (url) probeVideoLength(url).then((s) => { if (this.videoLoop === url) this.videoLength = s })
    })

    // A live edit still waiting for its pause goes out BEFORE an action that moves the scene on: an
    // undo (fired before its server call) and a scene switch (a capture listener, so it runs before
    // Livewire sends the request). Sent after, the stale tracks would land on the new state. The
    // page closing gets the same flush, best effort.
    const flushBeforeRequest = () => this.flushSave()
    window.addEventListener('scene:before-undo', flushBeforeRequest)
    window.addEventListener('scene:edit-step', flushBeforeRequest)   // a new gesture: the last one's edit is saved as its own undo step
    document.addEventListener('click', (event) => {
      if (event.target.closest?.('[wire\\:click*="selectScene("]')) flushBeforeRequest()
    }, true)
    window.addEventListener('pagehide', () => {
      this.stashDraft()
      flushBeforeRequest()
    })

    const saved = SESSIONS.get(config.sceneId)
    if (saved) Object.assign(this, saved)
    this.restoreDraft()

    // The Format panel's diamonds live in a different component, so the timeline publishes the
    // two things they need. Without this they were drawn but unpressable — which is what the
    // component's own comment said it was waiting for.
    window.__timelineKeying = {
      key: (target, property) => { this.toggleKey(target, property); this.announce() },
      has: (target, property) => this.hasKeyHere(target, property),
      state: (target, property) => this.keyState(target, property),
      animated: (target, property) => this.isAnimated(target, property),
      value: (target, property) => this.valueAt(target, property),
      edit: (target, property, value, options) => this.editKeyed(target, property, value, options),
      reset: (target, property) => this.resetProperty(target, property),
      // a row's name in the teacher's language (the stage's bone handles say which bone they turn)
      label: (key) => config.propertyLabels?.[key] ?? null,
      canResetObject: (target) => this.canResetObject(target),
      resetObject: (target) => this.resetObject(target),
      time: () => this.time,
      playing: () => this.playing,
      play: () => this.play(),
      pause: () => this.pause(),
      seekTo: (end) => { this.pause(); this.seek(end === 'to' ? this.duration : 0); this.revealPlayhead() },
      // A live edit still waiting for its pause: a re-fired scene:load must not overwrite it (stage25d adopt).
      pending: () => !!this._saves?.isPending(),
      // Selected keyframes own Backspace/Delete: the editor's object-delete key asks this first,
      // so deleting a keyframe never takes the whole layer with it (Bart, 2026-10-16).
      hasKeySelection: () => this.selected.length > 0 && this.transportHasTheKeyboard,
      // A diorama drag records a key at the playhead while this is on (never during playback).
      autoKey: () => this.autoKey && !this.playing,
      // an animation preset (presets-picker.js): a stage25d layer's keys as one list, read and replaced in one edit
      duration: () => this.duration,
      layerKeys: (target) => keysFromTracks(this.tracks)[String(target).slice(4)] ?? [],
      setLayerKeys: (target, keys) => this.replaceLayerKeys(target, keys),
      // a text's motion preset (Motion tab, text-presets.js): keys on its rows at the playhead, one edit, played once
      textPreset: (target, id) => this.applyTextPreset(target, id),
      // the Map block's motion presets (Motion tab with the map selected): its territory rows, and its camera
      mapPreset: (id) => this.applyMapPreset(id),
      cameraPreset: (id) => this.applyCameraPreset(id),
      seek: (time) => this.seek(time),
      refresh: () => this.applyFrame(),
      // the Object list's type icon: the same hidden state as this panel's eye
      hideTarget: (id) => this.hideTargetOf(id),
      isHidden: (target) => this.isHidden(target),
      toggleHidden: (target) => this.toggleHidden(target),
    }
    window.dispatchEvent(new CustomEvent('timeline-keying'))   // the Object list re-reads its hide icons

    // Cmd-Z / Cmd-Shift-Z restored the scene on the server: its timeline is the one to show now,
    // not the copy this panel remembered (which is exactly what the undo took back).
    window.addEventListener('timeline-restored', (event) => this.restore(event.detail?.timeline))
    window.addEventListener('voyage-intro-changed', (event) => this.introChanged(!!event.detail?.on))

    // The stage25d layers keep their keys on the layer: whenever the stage shows a scene, or the server's copy
    // changed under it (undo), the s25 tracks are re-read from the layers.
    window.addEventListener('stage25d-synced', () => { this.adoptStage25d(); this.refreshObjects(); this.applyFrame() })
    this.adoptStage25d()

    for (const event of ['scene-objects-changed', 'objscene-changed', 'stage25d-edited', 'scene-choices']) {
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
    this.listenToNarration()
    this.fitSailIntoDuration()
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
      // The map opens on the camera at 0 s (lesson-map openingCamera). A playhead this panel
      // remembered elsewhere puts the camera there once the map has settled, not at the next scrub.
      if (this.time > 0) map.once('idle', () => { if (this.$el?.isConnected) this.applyFrame() })
      if (map.__timelineHooked) return
      map.__timelineHooked = true
      const panel = () => document.querySelector('[data-timeline]')?._x_dataStack?.[0]
      map.on('move', () => { const p = panel(); if (p) p.canvasTick++ })
      map.on('movestart', () => { if (!applyingCamera) panel()?.noteCanvasValues('camera') })
      map.on('moveend', () => {
        if (applyingCamera) return
        panel()?.recordCanvasEdit('camera', cameraFromMap(map))
      })
    }
    hookMap()
  },

  /** An object's values before the canvas moves it: what auto-key holds at 0 when a drag starts its first move. */
  canvasSeen: {},

  noteCanvasValues (target) {
    this.canvasSeen[target] = Object.fromEntries(this.propertiesOf(target).map((p) => [p.key, this.valueAt(target, p.key)]))
  },

  /** Canvas edit → keyframes, for animated properties whose value really changed. */
  recordCanvasEdit (target, values) {
    this.canvasTick++
    if (this.playing || this.drag || !this.autoKey) return
    const frame = sampleFrame(this.tracks.filter((t) => sortedKeys(t).length), this.time)[target] ?? {}
    const seen = this.canvasSeen[target] ?? {}
    this.canvasSeen[target] = { ...seen, ...values }
    let changed = false
    for (const [property, value] of Object.entries(values ?? {})) {
      if (!Number.isFinite(value)) continue
      if (Number.isFinite(seen[property]) && Math.abs(seen[property] - value) >= 1e-3) this.armAutoKey(target, property, seen[property])
      if (!this.isAnimated(target, property)) continue
      if (Math.abs((frame[property] ?? NaN) - value) < 1e-3) continue
      this.writeTrack(target, property, (track) => addKeyframe(track, { time: this.time, value }))
      changed = true
    }
    if (changed) { this.save(); this.announce() }
  },

  /** Remember everything a morph would otherwise throw away. */
  remember () {
    SESSIONS.set(config.sceneId, {
      time: this.time, zoom: this.zoom, zoomIsMine: this.zoomIsMine, duration: this.duration, durationSet: this.durationSet,
      openGroups: { ...this.openGroups },
      loop: this.loop, autoKey: this.autoKey, hiddenObjects: { ...this.hiddenObjects },
      // The tracks too, because between a save and the next server render the CLIENT holds the
      // newer copy. A rebuild reads the config attribute the server last rendered, which can still
      // be the state before the keyframe you just set — and the keyframes vanish off the lane
      // while sitting safely in the database. Measured: two diamonds to none, no action taken.
      tracks: this.tracks, targets: this.targets, sail: this.sail,
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
    // A voyage leg's crossing is a clip, under the camera that frames it (Bart 2026-11-21).
    const crossing = this.isVoyageLeg ? [{ target: 'sail', kind: 'sail', icon: 'voyage', label: config.sailLabel ?? 'Crossing' }] : []
    // The map block: its year, and its territory's area and border (Bart 2026-11-23).
    const territory = config.sceneKind === 'map' ? territoryObjects(config.objectLabels?.mapBlock) : []
    // The Choices layer (scene-links.js): it fades in when the scene is over, so its clip sits at the end (Bart 2026-11-24).
    const choices = window.__objScene?.choices ? [{ target: 'choices', kind: 'choices', icon: 'choices', label: config.objectLabels?.choices ?? 'Choices' }] : []
    const listed = [...choices, ...cameras, ...territory, ...crossing, ...balloonObjects(), ...artObjects(), ...textObjects(), ...dioramaObjects(), ...stage25dObjects(),
      // the back-most, so the last row; a background that moves wears the video glyph (Bart, 2026-11-23)
      ...backgroundObjects(config.objectLabels?.background).map((o) => (this.videoLoop ? { ...o, icon: 'video' } : o))]
    this.objects = [...listed.filter(isPinnedObject), ...listed.filter((o) => !isPinnedObject(o))]
    for (const o of this.objects) if (!(o.target in this.openGroups)) this.openGroups[o.target] = false   // closed until a teacher opens one (Bart 2026-11-04)
    this.applyAppearances()   // an entrance changed elsewhere (Motion tab) shows at once
  },

  /** How far the tracks box has scrolled: a pinned row is held at its top by this much. */
  tracksScrolled: 0,

  /** The ruler and the camera stay in view while the rows scroll under them. A transform, not position: sticky, because
   *  the lanes are their own (sideways) scroller and sticky would stop at their edge. */
  get rulerPinStyle () { return pinStyle(this.tracksScrolled, 6) },

  pinnedStyle (object) { return isPinnedObject(object) ? pinStyle(this.tracksScrolled, 5) : '' },

  get canHaveCamera () { return ['map', 'voyage'].includes(config.sceneKind) },

  /** A voyage scene that sails a leg (not the itinerary): its crossing is a clip on this timeline. */
  get isVoyageLeg () { return !!config.sailLeg },

  /** The crossing on this scene's clock: the teacher's clip, or when the camera is done for as long as the dates say. */
  sailSpan () { return sailClip({ tracks: this.tracks, sail: this.sail }, config.sailLeg) },

  /** The ruler reaches past the crossing's end, so its end can always be taken. */
  fitSailIntoDuration () {
    if (!this.isVoyageLeg) return
    const end = this.sailSpan().end
    if (end > this.duration) { this.duration = Math.ceil(end * 10) / 10; this.measureFit() }
  },

  /** Scrubbing the timeline sails the ship to where it is at that moment, so a teacher sees the crossing they are timing. */
  previewSail () {
    if (!this.isVoyageLeg) return
    const tour = window.__voyageTour
    if (!tour?.previewSail) return
    const clip = this.sailSpan()
    // The scene's own camera frames the shot while its keys play; after them the map follows the ship.
    const cameraKeys = this.tracks.filter((t) => t.target === 'camera').flatMap((t) => sortedKeys(t).map((k) => k.time))
    const cameraUntil = cameraKeys.length >= 2 ? Math.max(...cameraKeys) : 0
    tour.previewSail(sailProgressAt(clip, this.time), { follow: this.time >= cameraUntil })
  },
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

  /**
   * The voyage's "from space" intro, as the scene's camera (Bart 2026-11-20: "i would like to see the camera
   * automatically when intro is on in the timeline. and the camera should also do the angle"). Switching it
   * on keys the camera from the whole globe down to the view on the stage now, ending tilted; the player
   * plays those keys instead of a built-in fly-in, so what the timeline shows is what the class sees.
   * Switching it off takes the camera away only while it is still the intro's: a camera a teacher keyed stays.
   */
  introChanged (on) {
    if (!this.canHaveCamera) return
    const mine = isIntroCamera(this.tracks)
    const keyed = this.tracks.some((t) => t.target === 'camera' && sortedKeys(t).length)
    if (on) {
      const map = window.__lessonMap
      if (!map || (keyed && !mine)) return
      const tracks = introCameraTracks(cameraFromMap(map))
      this.tracks = [...this.tracks.filter((t) => t.target !== 'camera'), ...tracks]
      if (!this.hasCamera) this.targets = [...this.targets, 'camera']
      const end = Math.max(...tracks.flatMap((t) => t.keyframes.map((k) => k.time)))
      if (this.duration < end) this.duration = end
      this.openGroups.camera = true
    } else if (mine) {
      this.tracks = this.tracks.filter((t) => t.target !== 'camera')
      this.targets = this.targets.filter((t) => t !== 'camera')
    } else return
    this.fitSailIntoDuration()   // an untouched crossing sets off when the camera lands, so it moved with it
    this.refreshObjects()
    this.save()
  },

  /** How many distinct moments this object is keyed at. Nothing moves under two. */
  keyCountOf (target) { return this.keyTimesOf(target).length },

  /**
   * Open or close a layer. Alt/Option-click is After Effects' "expand all": it opens the layer AND
   * every group under it, or, when all of that is already open, closes the layer.
   */
  toggleGroup (target, event = null) {
    if (event?.altKey) {
      const everything = this.openGroups[target] && this.groupsOf(target).every((g) => this.isSectionOpen(target, g.id))
      this.openGroups[target] = !everything
      for (const g of this.groupsOf(target)) this.openGroups[sectionKey(target, g.id)] = !everything
    } else {
      this.openGroups[target] = !this.openGroups[target]
    }
    this.remember()
  },

  // ── Groups: layer > group > property, as in After Effects ───────────────────────────────────

  groupLabel (group) { return config.groupLabels?.[group.id] ?? group.labelKey },

  /** The object's groups, each with its rows. */
  groupsOf (target) { return groupsFor(kindOfTarget(target)).filter((g) => (g.id !== 'bones' || this.hasBones(target)) && (g.id !== 'face' || this.hasFaces(target))) },
  /** A figure from the Character tab has an Expression row (stage25d engine layerInfo faces). */
  hasFaces (target) { return kindOfTarget(target) === 's25' && (window.__stage25d?.layerInfo?.(String(target).slice(4))?.faces?.length ?? 0) > 0 },
  /** A stage25d layer drawn from a puppet: only that one has Bones rows. */
  hasBones (target) { return !!window.__stage25d?.layerInfo?.(String(target).slice(4))?.puppet },

  /** A group is open unless the teacher closed it; the choice is remembered with the scene. */
  isSectionOpen (target, groupId) { return this.openGroups[sectionKey(target, groupId)] !== false },

  /** Alt/Option-click flips every group of the layer to the opposite of the one clicked. */
  toggleSection (target, groupId, event = null) {
    const open = !this.isSectionOpen(target, groupId)
    const ids = event?.altKey ? this.groupsOf(target).map((g) => g.id) : [groupId]
    for (const id of ids) this.openGroups[sectionKey(target, id)] = open
    this.remember()
  },

  /** Moments any row of the group is keyed at: the summary diamonds shown while it is closed. */
  sectionKeyTimes (target, groupId) {
    const group = this.groupsOf(target).find((g) => g.id === groupId)
    return summaryTimes((group?.props ?? []).map((p) => this.keysOf(target, p.key)))
  },

  /** How many rows of the group are animated, for the header's quiet count. */
  sectionAnimated (target, groupId) {
    const group = this.groupsOf(target).find((g) => g.id === groupId)
    return (group?.props ?? []).filter((p) => this.isAnimated(target, p.key)).length
  },

  // ── The value field: what the teacher reads, in the unit the Format panel uses ─────────────

  displayFor (target, property) { return displayOf(kindOfTarget(target), property, { baseM: this.baseMOf(target, property) }) },

  /** A 3D layer's own height in metres, so its size reads as a height (null: the sky, or not a 3D layer). */
  baseMOf (target, property) {
    if (property !== 'scale' || kindOfTarget(target) !== 's25' || target === 's25:sky') return null
    void this.canvasTick
    return window.__stage25d?.layerInfo?.(String(target).slice(4))?.baseM ?? null
  },

  /** The number shown for a property at the playhead (opacity 0.5 reads 50). */
  shownValue (target, property) {
    return toShown(this.valueAt(target, property), this.displayFor(target, property))
  },

  unitOf (target, property) { return this.displayFor(target, property).unit },

  /**
   * A number typed or scrubbed in the field. The same path as every other value edit (setValue):
   * the canvas follows at once, and on an animated property it becomes a keyframe at the playhead.
   * `flush: false` is the live drag; the release saves once.
   */
  commitShown (target, property, raw, { flush = true } = {}) {
    const value = fromShown(raw, this.displayFor(target, property))
    if (value === null) return
    this.setValue(target, property, value, { flush })
  },

  /** Arrow keys in the field: a step, ten with Shift, a tenth with Alt. One press, one save. */
  valueKey (event, target, property) {
    if (event.key === 'Enter') { event.target.blur(); return }
    const direction = { ArrowUp: 1, ArrowDown: -1 }[event.key]
    if (!direction || event.metaKey || event.ctrlKey) return
    event.preventDefault()
    const display = this.displayFor(target, property)
    const next = nudged(toShown(this.valueAt(target, property), display), direction, display, { shift: event.shiftKey, alt: event.altKey })
    event.target.value = String(next)
    this.commitShown(target, property, next)
  },

  /**
   * The stopwatch: animate this property, or stop animating it. Off → on keys it at the playhead;
   * on → off takes its keys away and returns it to what it was (Reset), which the next undo gives back.
   */
  toggleAnimated (target, property) {
    if (kindOfTarget(target) === 's25cam') this.toggleCameraValue(property)
    else if (this.canReset(target, property)) this.resetProperty(target, property)
    else this.toggleKey(target, property)
    this.announce()
  },

  /**
   * A camera key holds the whole pose, so one value is "animated" when it differs between keys (cameraValueMoves).
   * On: a key at the playhead, and the value waits there for the teacher to change it at another time. Off: the
   * value on screen holds for the whole shot (Bart 11-17: the stopwatch did nothing on the camera).
   */
  cameraOn: {},
  toggleCameraValue (property) {
    const stage = window.__stage25d
    if (this.isAnimated('s25cam', property)) {
      stage?.holdCameraValue?.(property)
      this.cameraOn = { ...this.cameraOn, [property]: false }
    } else {
      stage?.keyCameraHere?.()
      this.cameraOn = { ...this.cameraOn, [property]: true }
    }
    this.canvasTick++
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
  /** The background video's clip: the whole scene, since it loops until the scene ends. */
  get videoSpan () { return this.videoLoop ? { from: 0, to: this.duration } : null },

  /** Where the video starts over, as left offsets inside its bar. */
  get videoRestarts () {
    const left = this.xOf(0)
    return loopRestarts(this.duration, this.videoLength).map((t) => Math.round(this.xOf(t) - left))
  },

  get videoLabel () { return videoLengthLabel(this.videoLength) },

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

  /**
   * The row an Object list id hides, or null where the eye has nothing to hide. The list's type icon
   * toggles THIS state (window.__timelineKeying), so the icon and the eye always agree. Its single
   * Background row is the background only while the scene has one (a split has one per panel).
   */
  hideTargetOf (id) {
    const backgrounds = this.objects.filter((o) => o.kind === 'bg')
    const target = id === '__bg__' ? (backgrounds.length === 1 ? backgrounds[0].target : null) : this.targetFromObjectId(id)
    return canHide(target) && this.objects.some((o) => o.target === target) ? target : null
  },

  removeObject (target) {
    this.targets = this.targets.filter((t) => t !== target)
    this.tracks = this.tracks.filter((t) => t.target !== target)
    this.refreshObjects()
    this.save()
  },

  /** A puppet's rows are its own bones: Pieter has no legs, Ana has (stage25d engine layerInfo bones). */
  propertiesOf (target) {
    const info = window.__stage25d?.layerInfo?.(String(target).slice(4))
    const bones = info?.puppet ? info.bones ?? [] : []
    return propertiesFor(kindOfTarget(target))
      .filter((p) => p.group !== 'bones' || bones.includes(p.key.slice('bone:'.length)))
      .filter((p) => p.group !== 'face' || (info?.faces?.length ?? 0) > 0)
  },

  trackFor (target, property) {
    return this.tracks.find((t) => t.target === target && t.property === property) ?? null
  },

  keysOf (target, property) {
    if (kindOfTarget(target) === 'dio') return this.dioramaKeys(target, property)
    if (kindOfTarget(target) === 's25cam') return this.stage25dCameraKeys(property)
    return sortedKeys(this.trackFor(target, property))
  },

  // ── Geometry ────────────────────────────────────────────────────────────────────────────

  /** The zoom at which the whole timeline fits the lanes — the slider's zoomed-out end. Kept up to
   *  date on every resize even once the teacher owns the zoom, so the slider stays calibrated. */
  fittedZoom: 100,

  measureFit () {
    const width = (this.$refs.lanes?.clientWidth ?? 0) - LANE_PAD_PX - LANE_END_PAD_PX
    if (width > 0 && this.duration > 0) this.fittedZoom = fitZoom(width, this.duration)
  },

  fit () {
    this.measureFit()
    this.zoom = this.fittedZoom
  },

  get ticks () { return ticksFor(this.duration, tickStep(this.zoom)) },
  get playheadX () { return this.xOf(this.time) },
  get contentWidth () { return Math.max(0, this.duration * this.zoom) + LANE_PAD_PX + LANE_END_PAD_PX },
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

  /** The lesson's scene length changed and the server moved this scene with it, if it was still at the old one. */
  followSceneLength ({ was, seconds }) {
    if (!sameTime(this.duration, was)) return
    this.duration = seconds
    if (this.time > seconds) this.seek(seconds)
    if (this.zoomIsMine) this.measureFit(); else this.fit()
    this.remember()
  },

  /** The timeline's length. Keys outside it stay where they are; the ruler simply stops there. */
  setDuration (seconds) {
    this.durationSet = true   // typed by the teacher: the narration no longer decides it
    this.duration = Math.min(3600, Math.max(0.1, Number(seconds) || DEFAULT_DURATION))
    if (this.time > this.duration) this.seek(this.duration)
    if (this.zoomIsMine) this.measureFit(); else this.fit()
    this.remember()
    this.save()
  },

  // ── Narration ───────────────────────────────────────────────────────────────────────────

  /** The scene's narration clip, made on first use; null on a scene with no audio (or no Audio, in tests). */
  narration () {
    if (!config.audioUrl || typeof Audio === 'undefined') return null
    let audio = NARRATION.get(config.sceneId)
    if (audio && audio.__src !== config.audioUrl) { audio.pause(); audio = null }   // the voice was re-recorded
    if (!audio) {
      audio = new Audio()
      audio.preload = 'auto'
      audio.__src = config.audioUrl
      audio.src = config.audioUrl
      NARRATION.set(config.sceneId, audio)
    }
    audio.volume = this.narrationMuted ? 0 : this.narrationVolume
    return audio
  },

  /** Load the clip, stop any other scene's voice, and let the timeline follow the clip's length. */
  listenToNarration () {
    for (const [id, other] of NARRATION) if (id !== config.sceneId) other.pause()
    this.followNarration()   // from the word timings at once, so the ruler does not jump later
    const audio = this.narration()
    if (!audio) return
    this.drawWaveform()
    if (audio.readyState >= 1) this.followNarration()
    else audio.addEventListener('loadedmetadata', () => { if (this.$el?.isConnected !== false) this.followNarration() }, { once: true })
  },

  /** Alpine calls this when the panel goes (a scene switch): the voice stops with it. */
  destroy () {
    NARRATION.get(config.sceneId)?.pause()
  },

  /**
   * A scene with narration is as long as its clip (Bart, 2026-11-23: "automatically change the
   * timeline based on the length of the audio clip"), until the teacher types a Length of their own.
   * Never shorter than its last key (the save clamps keys to the length, so that would move them)
   * or a voyage leg's crossing.
   */
  followNarration () {
    if (!config.audioUrl) return
    const audio = NARRATION.get(config.sceneId)
    const fromAudio = Number.isFinite(audio?.duration) && audio.duration > 0 ? audio.duration : 0
    const length = fromAudio || (this.spans.length ? this.spans[this.spans.length - 1].end : 0)
    if (!(length > 0)) return
    this.narrationLength = length
    if (this.durationSet) return
    // Nor shorter than a voyage leg's crossing, or the ship's landing falls off the ruler.
    const crossing = this.isVoyageLeg ? this.sailSpan().end : 0
    const want = Math.round(Math.max(length, lastKeyTime(this.tracks), crossing) * 100) / 100
    if (Math.abs(want - this.duration) < 0.01) return
    this.duration = Math.min(3600, want)
    if (this.time > this.duration) this.seek(this.duration)
    if (this.$refs?.lanes) { if (this.zoomIsMine) this.measureFit(); else this.fit() }
    this.remember()
  },

  /** Whether the timeline has a narration lane: a scene with audio. */
  get hasNarration () { return !!config.audioUrl },

  /** The narration clip on the lane, from 0 to the clip's end. */
  get narrationSpan () {
    const end = this.narrationLength || (this.spans.length ? this.spans[this.spans.length - 1].end : 0)
    return end > 0 ? { from: 0, to: end } : null
  },

  /**
   * Draw the clip's waveform on its lane (Bart, 2026-11-24: the sound clip at the bottom of the
   * timeline). Decoded once from the same file the voice plays; a clip that will not decode keeps
   * a plain bar, which still says where the voice runs.
   */
  async drawWaveform () {
    if (this.wavePath || !config.audioUrl || typeof fetch === 'undefined') return
    const Ctx = window.AudioContext ?? window.webkitAudioContext
    if (!Ctx) return
    try {
      const bytes = await (await fetch(config.audioUrl)).arrayBuffer()
      const ctx = new Ctx()
      const buffer = await ctx.decodeAudioData(bytes)
      ctx.close?.()
      // ~25 columns a second: fine enough to see the words, few enough to stay one light path.
      const peaks = audioPeaks(buffer.getChannelData(0), Math.min(4000, Math.ceil(buffer.duration * 25)))
      this.waveBuckets = peaks.length
      this.wavePath = peaksPath(peaks)
    } catch { /* no waveform: the bar stays plain */ }
  },

  /** The lane's volume slider: the editor's own listening level, remembered for this teacher. */
  setNarrationVolume (value) {
    this.narrationVolume = Math.min(1, Math.max(0, Number(value) || 0))
    this.narrationMuted = this.narrationVolume === 0
    try { localStorage.setItem(VOLUME_KEY, String(this.narrationVolume)) } catch { /* private mode: this visit only */ }
    const audio = NARRATION.get(config.sceneId)
    if (audio) audio.volume = this.narrationMuted ? 0 : this.narrationVolume
  },

  /** The speaker on the lane mutes and unmutes, keeping the level to come back to. */
  toggleNarrationMute () {
    this.narrationMuted = !this.narrationMuted
    if (!this.narrationMuted && this.narrationVolume === 0) this.narrationVolume = 1
    const audio = NARRATION.get(config.sceneId)
    if (audio) audio.volume = this.narrationMuted ? 0 : this.narrationVolume
  },

  /** Hand the Length back to the narration after the teacher typed one. */
  matchNarration () {
    this.durationSet = false
    this.followNarration()
    this.save()
  },

  /** Play the voice from a time on the timeline; past the clip's end it simply stays quiet. */
  speakFrom (time) {
    const audio = this.narration()
    if (!audio) return
    if (Number.isFinite(audio.duration) && time >= audio.duration - 0.02) { audio.pause(); return }
    try { audio.currentTime = Math.max(0, time) } catch { /* not seekable yet: plays from the start */ }
    audio.play()?.catch?.(() => {})   // blocked or missing: the timeline still plays, silently
  },

  /** The voice while it is actually playing, which is the clock playback follows. */
  speakingVoice () {
    const audio = NARRATION.get(config.sceneId)
    return audio && config.audioUrl && !audio.paused && !audio.ended && !audio.error ? audio : null
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

  /** The sentence under the playhead and the word lit in it, for the narration strip (Bart, 2026-11-22). */
  get spokenSentence () { return sentenceAt(this.spans, this.time) },

  /**
   * Keeps the lit word on screen in the narration strip. A long sentence is wider than the dock, and
   * the strip does not wrap (a row that grew a line mid-playback would shove the tracks down), so it
   * scrolls itself sideways instead, only when the word would otherwise sit outside the view.
   */
  /**
   * A word pressed in the narration strip. Playback carries on FROM that word: play() counts from
   * the moment it started, so a bare seek would be undone on the very next frame.
   */
  seekToWord (time) {
    this.seek(time)
    // Pressing a word plays the narration from it (Bart, 2026-11-23: "it should play this word").
    if (!this.playing) return this.play()
    this._startedFrom = this.time
    this._startedAt = performance.now()
    this.speakFrom(this.time)
  },

  revealSpokenWord (strip) {
    const word = strip?.querySelector('[data-timeline-word]')
    if (!word) return
    const margin = 48
    const left = word.offsetLeft
    const right = left + word.offsetWidth
    if (left < strip.scrollLeft + margin) strip.scrollLeft = Math.max(0, left - margin)
    else if (right > strip.scrollLeft + strip.clientWidth - margin) strip.scrollLeft = right - strip.clientWidth + margin
  },

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
    this.stopEasingPreview()   // an edit or the clock takes the stage back from a preview
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
    if (memory.kind === 'camkey') return this.dragCameraKey(memory, event)
    if (memory.kind === 'marquee') return this.updateMarquee(memory, event)
  },

  onPointerUp () {
    if (this.drag) {
      const memory = dragMemory.get(this.drag.el)
      if (memory?.kind === 'key' && memory.moved) {
        this.springKey(memory.now ?? memory.rest, memory.rest ?? memory.anchorTime, (t) => { this.seek(memory.anchorTime + this.placeKeys(memory, t)) }, () => this.save())
      } else if (memory?.kind === 'bezier') this.save()
      if (memory?.kind === 'camkey' && memory.moved && memory.rest !== undefined) {
        this.springKey(memory.at, memory.rest, (t) => { memory.at = window.__stage25d?.moveCameraKey?.(memory.at, t) ?? memory.at; this.selected = [keyId({ target: memory.target, property: 'x', time: memory.at })]; this.seek(memory.at) }, () => {})
      }
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
    if (this.keyMenu) { this.keyMenu = null; return }
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
    this.previewSail()
    this.remember()
    this.announce()
  },

  /** Tell any diamond outside this component that its answer may have changed. */
  announce () {
    this.syncStage25d()   // keys edited here reach the stage before anything else reads it
    window.dispatchEvent(new CustomEvent('timeline-changed'))
  },

  /** A figure is not on screen before its layer bar starts (After Effects, Bart 2026-11-10), nor
   *  while its eye is off. */
  applyAppearances () {
    for (const o of this.objects) {
      if (o.kind !== 'art') continue
      const hidden = this.isHidden(o.target) || this.time < (o.entrance?.from ?? 0)
      document.querySelectorAll(`[data-layer-id="art_${o.target.slice(4)}"]`).forEach((el) => { el.style.visibility = hidden ? 'hidden' : '' })
    }
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
    window.__balloons?.time?.(this.time)
    this.applyAppearances()

    for (const [target, values] of Object.entries(frame)) {
      if (kindOfTarget(target) === 'camera') { if (map) applyCamera(map, values); continue }
      if (kindOfTarget(target) === 's25') continue   // the stage samples its own keys (below), with the player's easing
      for (const [property, value] of Object.entries(values)) writeObjectProperty(target, property, value)
    }
    this.syncStage25d()
    // A diorama plays its own paths (walks, facing, depth order) from the same clock.
    window.__diorama?.update(this.time)
    window.__stage25d?.update(this.time)
  },

  // ── Diorama clips. An item's path is ONE clip: drag it to move the walk in time, drag an end
  //    to stretch or squeeze it (Bart, 2026-09-29). The keys live in the diorama JSON, not here.

  /** The s25 tracks are the stage's layer keys, as tracks: replace the panel's copy with the stage's. */
  adoptStage25d () {
    const stage = window.__stage25d
    if (!stage?.items) return
    const own = (t) => kindOfTarget(t.target) === 's25'
    this.tracks = [...this.tracks.filter((t) => !own(t)), ...tracksFromKeys(stage.items())]
    // a key past the stored length (a scene's narration is longer than its first timeline) stays reachable
    const lastKey = Math.max(0, ...this.tracks.filter(own).flatMap((t) => t.keyframes.map((k) => k.time)))
    if (lastKey > this.duration) { this.duration = lastKey; this.measureFit() }
  },

  /**
   * A stage25d layer's keys replaced by `keys` (an animation preset laid in): its tracks become those keys' tracks, a
   * track keeping what else it carried (its base), and it is saved as one edit, so one undo takes it back.
   */
  replaceLayerKeys (target, keys) {
    this.stopEasingPreview()
    window.dispatchEvent(new CustomEvent('scene:edit-step'))   // a pending edit saves as its own step first
    const old = this.tracks.filter((t) => t.target === target)
    const fresh = tracksFromKeys([{ id: String(target).slice(4), keys }])
      .map((t) => ({ ...(old.find((o) => o.property === t.property) ?? {}), ...t }))
    this.tracks = [...this.tracks.filter((t) => t.target !== target || !isLayerKeyTrack(t)), ...fresh]
    this.applyFrame()
    this.save()
    this.announce()
  },

  /**
   * A text's motion preset laid into its rows at the playhead (text-presets.js): saved as one edit, so one undo takes
   * it back, then played once on the stage and left at its end, where the text has fully come in (or gone). Another
   * entrance (or exit) picked while the playhead still sits where the last one ended takes that one's place, so trying them in a
   * row compares them rather than stacking them one after the other.
   */
  applyTextPreset (target, id) {
    this.stopEasingPreview()
    this.pause()
    const item = (window.__lessonTextLayer?._texts ?? []).find((t) => `text:${t.id}` === target)
    const rest = (p) => { const track = this.trackFor(target, p); return track ? baseOf(track) : readObjectProperty(target, p) }
    const last = this._lastPreset
    const exit = EXIT_PRESETS.includes(id)
    const start = last?.target === target && last.exit === exit && sameTime(this.time, last.to) ? last.from : this.time
    const done = applyTextPreset(this.tracks, target, id, { start, duration: this.duration, text: item?.text ?? '', rest })
    if (!done) return
    this._lastPreset = { target, exit, from: done.from, to: done.to }
    window.dispatchEvent(new CustomEvent('scene:edit-step'))   // a pending edit saves as its own step first
    const before = this.tracks
    this.tracks = done.tracks
    // a row the preset emptied stops moving: the text goes back to its resting value there, not the last one played
    for (const p of PRESET_PROPERTIES) {
      if (sortedKeys(this.trackFor(target, p)).length >= 2) continue
      const old = before.find((t) => t.target === target && t.property === p)
      if (old) writeObjectProperty(target, p, baseOf(old) ?? readObjectProperty(target, p))
    }
    this.save()
    this.announce()
    playStretch(done.from, done.to, this.reducedMotion)
  },

  /**
   * A Map block territory preset laid into its rows at the playhead (map-presets.js), the same way as a text's: one
   * edit, one undo, played once; another one picked where the last one ended takes its place (Bart 11-24).
   */
  applyMapPreset (id) {
    const target = 'terr:map'
    if (!window.__lessonMapApi?.hasTerritory?.()) return
    this.stopEasingPreview()
    this.pause()
    const api = window.__lessonMapApi
    const rest = (p) => {
      if (p === 'from') return api.territoryFromYear?.() ?? null
      const track = this.trackFor(target, p)
      return track ? baseOf(track) : readObjectProperty(target, p)
    }
    const last = this._lastPreset
    const exit = MAP_EXIT_PRESETS.includes(id)
    const start = last?.target === target && last.exit === exit && sameTime(this.time, last.to) ? last.from : this.time
    const done = applyMapPreset(this.tracks, target, id, { start, duration: this.duration, rest })
    if (!done) return
    this._lastPreset = { target, exit, from: done.from, to: done.to }
    window.dispatchEvent(new CustomEvent('scene:edit-step'))
    const before = this.tracks
    this.tracks = done.tracks
    for (const p of MAP_PRESET_PROPERTIES) {
      if (sortedKeys(this.trackFor(target, p)).length >= 2) continue
      const old = before.find((t) => t.target === target && t.property === p)
      if (old) writeObjectProperty(target, p, baseOf(old) ?? readObjectProperty(target, p))
    }
    this.openGroups[target] = true
    this.refreshObjects()
    this.save()
    this.announce()
    playStretch(done.from, done.to, this.reducedMotion)
  },

  /**
   * A map camera preset (map-camera-presets.js), ending on the shot framed on the stage now: it replaces every camera
   * key (a scene's camera makes one move), from the playhead, and lengthens the scene when the move runs past its end.
   */
  applyCameraPreset (id) {
    const map = window.__lessonMap
    if (!map || !this.canHaveCamera) return
    this.stopEasingPreview()
    this.pause()
    const view = cameraFromMap(map)
    const start = this._lastCameraPreset && sameTime(this.time, this._lastCameraPreset.to) ? this._lastCameraPreset.from : this.time
    const done = applyCameraPreset(this.tracks, id, view, { start, focus: window.__lessonMapApi?.focusPoints?.() ?? [] })
    if (!done) return
    this._lastCameraPreset = { from: done.from, to: done.to }
    window.dispatchEvent(new CustomEvent('scene:edit-step'))
    this.tracks = done.tracks
    if (!this.hasCamera) this.targets = [...this.targets, 'camera']
    if (this.duration < done.to) this.duration = done.to
    this.openGroups.camera = true
    this.fitSailIntoDuration?.()
    this.refreshObjects()
    this.save()
    this.announce()
    playStretch(done.from, done.to, this.reducedMotion)
  },

  /** Hand the stage25d layers their keys, as the timeline holds them now: it eases them exactly as the player will. */
  syncStage25d () {
    const stage = window.__stage25d
    if (!stage) return
    const byLayer = keysFromTracks(this.tracks)
    for (const item of stage.items?.() ?? []) {
      if (item.id !== 'camera') stage.setLayerKeys(item.id, byLayer[item.id] ?? [])
    }
  },

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

  /** The 3D camera row's keys, one per framed moment. A move longer than the timeline ends at its edge. */
  stage25dCameraKeys (property) {
    void this.canvasTick   // reactive: the teacher framed the camera
    const keys = (window.__stage25d?.cameraInfo?.()?.keys ?? []).map((k) => ({ time: Math.min(this.duration, k.t), value: k.pose?.[property] ?? 0 }))
    return keys.filter((k, i) => !keys.slice(i + 1).some((later) => sameTime(later.time, k.time)))
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

  // ── Bars. A balloon is on screen from its start to its end (no end: the scene's end). A figure's
  //    bar is its After Effects layer bar (Bart, 2026-11-10): on screen from when it appears to the
  //    end of the scene. Dragging it sets when it appears; a balloon's ends stretch it.

  /** The live draft while a bar is dragged, else the object's own. */
  barOf (target) {
    if (this.spanDraft?.target === target) return this.spanDraft
    if (target === 'sail') { const c = this.sailSpan(); return { from: c.start, to: c.end } }
    if (target === 'choices') return { from: Math.max(0, this.duration - CHOICES_CLIP_S), to: this.duration }
    const o = this.objects.find((x) => x.target === target)
    if (!o) return null
    if (o.kind === 'art') return { from: o.entrance?.from ?? 0, to: this.duration }
    return { from: o.start ?? 0, to: Number.isFinite(o.end) ? o.end : this.duration }
  },

  spanDraft: null,

  startBar (event, target) {
    if (event.button !== 0) return
    event.stopPropagation()
    this.pause()
    const span0 = this.barOf(target)
    if (!span0) return
    // The bar you take is the layer you work on: selected, so a balloon stays on the stage while
    // its time moves past the playhead (Bart 11-16: it vanished when its bar was dragged).
    if (this.activeTarget !== target && target !== 'sail') this.selectObject(target)
    const keys0 = [{ t: span0.from }, { t: span0.to }]
    const bar = event.currentTarget.getBoundingClientRect()
    const EDGE_PX = 8
    const mode = event.clientX - bar.left < EDGE_PX ? 'start' : bar.right - event.clientX < EDGE_PX ? 'end' : 'move'
    const t0 = this.rawTimeFromEvent(event)
    let moved = false
    const onMove = (e) => {
      if (!moved && Math.abs(e.clientX - event.clientX) < DRAG_THRESHOLD_PX) return
      moved = true
      const dt = this.rawTimeFromEvent(e) - t0
      if (target.startsWith('art:')) {
        // Only its start moves: the end is the scene's end.
        // 10 s is the server's cap on anim_delay (EditsSceneArtwork).
        this.spanDraft = { target, from: Math.min(10, this.duration - 0.1, Math.max(0, span0.from + dt)), to: this.duration }
        return
      }
      const keys = mode === 'move' ? shiftClip(keys0, dt)
        : stretchClip(keys0, mode, (mode === 'end' ? keys0[1].t : keys0[0].t) + dt)
      // The crossing may run past the ruler's end: the ruler grows to take it when it is let go.
      this.spanDraft = { target, from: keys[0].t, to: target === 'sail' ? keys[1].t : Math.min(this.duration, keys[1].t) }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      const draft = this.spanDraft
      if (!moved || !draft) { this.spanDraft = null; return }
      this.commitBar(target, draft)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  },

  /** Save a dragged bar: when a figure appears, or a balloon's start and end. */
  commitBar (target, draft) {
    if (target === 'sail') {
      // The crossing: when the ship sets off and how long it sails, saved with the timeline.
      window.dispatchEvent(new CustomEvent('scene:edit-step'))
      this.sail = { start: Math.round(draft.from * 100) / 100, end: Math.round(draft.to * 100) / 100 }
      this.spanDraft = null
      this.fitSailIntoDuration()
      this.save()
      this.previewSail()
      return
    }
    const o = this.objects.find((x) => x.target === target)
    if (o?.kind === 'art') {
      const from = Math.round(draft.from * 10) / 10
      this.$wire?.setLayerAppearAt?.(Number(target.slice(4)), from)
      // The row shows the new bar now; the layer's own values arrive with the save.
      o.entrance = { ...o.entrance, from }
      this.spanDraft = null
      return
    }
    // Up to the timeline's end means up to the scene's end, however long the narration runs.
    const end = draft.to >= this.duration - 0.01 ? null : draft.to
    window.Livewire?.dispatch('balloon:change', { id: `bal_${target.slice(4)}`, patch: { start: draft.from, end } })
    // The row keeps the draft until the save comes back as the scene's new lines.
    setTimeout(() => { if (this.spanDraft === draft) this.spanDraft = null }, 1500)
  },

  // ── Transport ───────────────────────────────────────────────────────────────────────────

  playing: false,
  _raf: null,
  _startedAt: 0,
  _startedFrom: 0,

  play () {
    this.stopEasingPreview()   // an edit or the clock takes the stage back from a preview
    if (this.playing || !(this.duration > 0)) return
    this.playing = true
    window.dispatchEvent(new CustomEvent('timeline-playing', { detail: true }))
    this._startedFrom = this.time >= this.duration ? 0 : this.time
    this._startedAt = performance.now()
    this.speakFrom(this._startedFrom)
    const step = () => {
      if (!this.playing) return
      // While the voice plays, IT is the clock: the lit word is the word being heard, even when the
      // clip stalls to buffer. Past its end (or with none) the frame clock carries on from there.
      const voice = this.speakingVoice()
      if (voice) {
        this._startedFrom = voice.currentTime
        this._startedAt = performance.now()
      }
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
        this.speakFrom(t)
      }
      this.seek(t)
      this.revealPlayhead()
      this._raf = requestAnimationFrame(step)
    }
    this._raf = requestAnimationFrame(step)
  },

  pause () {
    if (this.playing) window.dispatchEvent(new CustomEvent('timeline-playing', { detail: false }))
    this.playing = false
    NARRATION.get(config.sceneId)?.pause()
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
   * Space plays and pauses, the way it does in every editor and in the lesson player, whichever tab of the dock is
   * showing; the left and right arrows scrub (Shift: a whole second). Typing in a field keeps its keys.
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
    const scrub = scrubDirection(event)
    if (scrub) {
      event.preventDefault()
      this.pause()
      this.seek(Math.min(this.duration, Math.max(0, this.time + scrub * (event.shiftKey ? SCRUB_LONG_S : SCRUB_S))))
      this.revealPlayhead()
      return
    }
    if (!isPlayPauseKey(event)) return

    event.preventDefault()   // only now that the key is ours: Space must not also scroll the page
    // A button just pressed with the mouse (play, a word) still has focus, and the browser presses it
    // again on Space's keyup: play-then-pause. Letting go of it leaves the key to the timeline.
    if (event.target?.tagName === 'BUTTON') event.target.blur?.()
    if (this.playing) this.pause()
    else this.play()
  },

  // ── Keyframes ───────────────────────────────────────────────────────────────────────────

  /**
   * The diamond on a property row, and after a property in the Format panel: a TOGGLE, as in
   * After Effects' keyframe navigator. No key under the playhead adds one with the value on screen;
   * a key there is removed (Bart, 2026-10-16). Re-framing a keyed shot needs no diamond at all:
   * editing the value while the playhead sits on the key updates it (editKeyed / setValue).
   */
  toggleKey (target, property) {
    if (kindOfTarget(target) === 's25cam') { window.__stage25d?.toggleCameraKey?.(); return }
    if (kindOfTarget(target) === 'dio') { window.__diorama?.keyHere(target.slice(4)); return }
    this.stopEasingPreview()
    const map = window.__lessonMap
    const live = kindOfTarget(target) === 'camera'
      ? (map ? cameraFromMap(map)[property] : undefined)
      : readObjectProperty(target, property)

    // A layer nobody has moved yet stores NOTHING for x — it is positioned by the stylesheet, and
    // the property reads null. Bailing on that made the diamond do nothing at all on a fresh
    // layer, silently, which is the worst way for a control to refuse. Key what the row is
    // SHOWING instead: the field says 0, so the keyframe says 0, and the two agree.
    const isColor = propertyFor(kindOfTarget(target), property)?.type === 'color'
    const value = isColor ? (typeof live === 'string' ? live : '') : (Number.isFinite(live) ? live : 0)

    const before = this.trackFor(target, property)
    const next = toggleKeyframe(before ?? { target, property, keyframes: [] }, this.time, value)
    // The last key gone: the property is not animated any more, and it goes back to what it was.
    if (!next.keyframes.length) return this.resetProperty(target, property)
    this.writeTrack(target, property, () => next)
    this.applyFrame()
    this.save()
  },

  /** 'none' | 'here' | 'elsewhere' — the three states of a property's diamond. */
  keyState (target, property) {
    void this.time
    if (['dio', 's25cam'].includes(kindOfTarget(target))) return keyStateAt({ keyframes: this.keysOf(target, property) }, this.time)
    return keyStateAt(this.trackFor(target, property), this.time)
  },

  /**
   * A value typed or dragged in the Format panel. On an animated property it is a keyframe at the
   * playhead — updating the key there, or adding one between keys (After Effects). Returns false on
   * a property that is not animated, so the panel saves the plain value as it always did.
   */
  editKeyed (target, property, value, { flush = true, hold = false } = {}) {
    this.stopEasingPreview()   // an edit or the clock takes the stage back from a preview
    if (kindOfTarget(target) === 'dio') return false
    this.armAutoKey(target, property)
    if (!this.isAnimated(target, property)) return false
    const isColor = propertyFor(kindOfTarget(target), property)?.type === 'color'
    const v = isColor ? String(value ?? '') : Number(value)
    if (!isColor && !Number.isFinite(v)) return true
    if (this.playing) this.pause()
    writeObjectProperty(target, property, v)   // draws the layer or balloon on the canvas now
    this.writeTrack(target, property, (track) => addKeyframe(track, { time: this.time, value: v }))
    if (flush) this.save()
    else if (!hold) this.saveSoon()   // hold: a drag still going on (a bone on the stage); its last edit saves
    this.announce()
    return true
  },

  /**
   * Auto-key on and past the scene's start, a property with no keys yet starts moving here: a key at 0 holds the value it
   * has now, and the edit that follows is keyed at the playhead. At 0 an edit only places the object.
   */
  armAutoKey (target, property, was = this.valueAt(target, property)) {
    if (!this.autoKey || this.time <= 0 || this.isAnimated(target, property)) return
    this.writeTrack(target, property, (track) => addKeyframe(track, { time: 0, value: was }))
  },

  /** Has this property anything Reset would take back? Only keys, so only an animated one. */
  canReset (target, property) {
    return kindOfTarget(target) !== 'dio' && this.isAnimated(target, property)
  },

  canResetObject (target) {
    return this.propertiesOf(target).some((p) => this.canReset(target, p.key))
  },

  /**
   * Reset: the property's keys go, and it returns to the value it had before it was keyed. The
   * layer's stored value is written back too, so a canvas drag made while it was animated cannot
   * leave the layer somewhere the teacher never chose.
   */
  resetProperty (target, property, { persist = true } = {}) {
    this.stopEasingPreview()   // an edit or the clock takes the stage back from a preview
    const track = this.trackFor(target, property)
    if (!track) return
    const base = baseOf(track)
    this.tracks = this.tracks.filter((t) => t !== track)
    this.selected = this.selected.filter((id) => !id.startsWith(`${target}|${property}|`))
    if (base !== null && base !== undefined) {
      if (kindOfTarget(target) === 'camera') { if (window.__lessonMap) applyCamera(window.__lessonMap, { [property]: base }) }
      else writeObjectProperty(target, property, base)
      const [kind, id] = String(target).split(':')
      if (kind === 'art') this.$wire?.updateArtworkLayer?.(Number(id), property, base)
      // A balloon keeps its own values on its line: the one Reset returns to is saved there too.
      if (kind === 'bal') this.$wire?.changeBalloon?.(`bal_${id}`, balloonPatch({ [property]: base }, (p) => readObjectProperty(target, p)))
    }
    if (!persist) return
    this.applyFrame()
    this.save()
    this.announce()
  },

  /** "Reset all": every property of the object, one save (and so one undo step). */
  resetObject (target) {
    for (const p of this.propertiesOf(target)) if (this.canReset(target, p.key)) this.resetProperty(target, p.key, { persist: false })
    this.applyFrame()
    this.save()
    this.announce()
  },

  /** The scene's timeline as the server now has it — after an undo or redo. */
  restore (timeline) {
    if (!timeline || typeof timeline !== 'object' || this.$el?.isConnected === false) return   // a panel from a scene since left
    // The stage25d keys are not in the stored timeline (they live on the layers): keep ours until the stage re-syncs.
    const s25 = this.tracks.filter((t) => kindOfTarget(t.target) === 's25')
    this.tracks = [...(Array.isArray(timeline.tracks) ? timeline.tracks : []), ...s25]
    this.targets = Array.isArray(timeline.targets) ? timeline.targets : this.targets
    // The stored length too: a paste into a scene with no timeline yet takes the source's, and a panel left at its old
    // length hid the later keys and clamped them on its next save.
    const duration = Number(timeline.duration)
    if (duration > 0 && !sameTime(duration, this.duration)) {
      this.duration = Math.min(3600, duration)
      if (this.time > this.duration) this.seek(this.duration)
      if (this.zoomIsMine) this.measureFit(); else this.fit()
    }
    this.sail = storedSail(timeline)
    this.selected = []
    this.remember()
    this.refreshObjects()
    this.applyFrame()
    this.announce()
  },

  /** A registry label in the teacher's language. */
  propertyLabel (property, target = null) {
    if (target && this.baseMOf(target, property.key)) return config.propertyLabels?.height ?? 'Height'
    return config.propertyLabels?.[property.key] ?? property.label
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
    if (kindOfTarget(target) === 's25cam') {
      void this.time
      return round2(window.__stage25d?.cameraInfo?.()?.pose?.[property] ?? 0)
    }
    const isColor = propertyFor(kindOfTarget(target), property)?.type === 'color'
    if (keys.length) {
      const frame = sampleFrame(this.tracks, this.time)
      const value = frame[target]?.[property]
      if (isColor && typeof value === 'string') return value
      if (Number.isFinite(value)) return round2(value)
    }
    if (isColor) { const live = readObjectProperty(target, property); return typeof live === 'string' ? live : '' }
    const map = window.__lessonMap
    const live = kindOfTarget(target) === 'camera'
      ? (map ? cameraFromMap(map)[property] : null)
      : readObjectProperty(target, property)
    return Number.isFinite(live) ? round2(live) : 0
  },

  /**
   * Is this property animated? Which is to say: has anyone put a keyframe on it.
   *
   * The gate on auto-keying, and the reason there is one. Recording every value change on every
   * property would mean nudging a title into place on an untouched scene starts an animation
   * nobody asked for, and leaves no way to simply POSITION something. The diamond is what starts
   * an animation; from the first key onwards, the timeline records what you do.
   */
  isAnimated (target, property) {
    const keys = this.keysOf(target, property)
    if (kindOfTarget(target) === 's25cam') return cameraValueMoves(keys) || (this.cameraOn[property] === true && keys.length > 0)
    return keys.length > 0
  },

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
  setValue (target, property, value, { flush = true } = {}) {
    const isColor = propertyFor(kindOfTarget(target), property)?.type === 'color'
    if (!isColor && !Number.isFinite(value)) return
    if (kindOfTarget(target) === 's25cam') { window.__stage25d?.setCameraValue?.(property, value); return }
    if (kindOfTarget(target) === 'dio') {
      // The stage applies the canvas rules: snapped, on its floor, recorded while auto-key is on.
      const id = target.slice(4)
      const cell = [...(window.__diorama?.poseCell(id) ?? [0, 0])]
      cell[DIO_AXIS[property]] = value
      window.__diorama?.placeCell(id, cell)
      return
    }
    this.armAutoKey(target, property)
    const map = window.__lessonMap
    if (kindOfTarget(target) === 'camera') { if (map) applyCamera(map, { [property]: value }) }
    else if (kindOfTarget(target) === 's25' && !this.isAnimated(target, property)) window.__stage25d?.commitLayerProp?.(target.slice(4), property, value)   // a base value: saved on the layer itself
    else writeObjectProperty(target, property, value)

    if (!this.autoKey || !this.isAnimated(target, property)) return
    this.writeTrack(target, property, (track) => addKeyframe(track, { time: this.time, value }))
    if (flush) this.save()
    else this.saveSoon()
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

  /** Delete/Backspace on the timeline, never while the caret is in a field. NOT gated on
   *  defaultPrevented: the editor's object-delete key yields to a key selection (hasKeySelection),
   *  and whichever listener runs first, the keys are what goes. */
  isDeleteKey (event) {
    if (event.key !== 'Delete' && event.key !== 'Backspace') return false
    if (event.metaKey || event.ctrlKey || event.altKey) return false
    return this.transportHasTheKeyboard && !isTypingTarget(event.target) && this.selected.length > 0
  },

  /** The right-click menu on a keyframe: copy or paste its values, or remove THIS key. Null when closed. */
  keyMenu: null,

  openKeyMenu (event, target, property, time) {
    if (kindOfTarget(target) === 'dio') return
    this.pause()
    this.selected = [keyId({ target, property, time })]
    this.keyMenu = {
      top: Math.min(event.clientY, window.innerHeight - KEY_MENU_H), left: Math.min(event.clientX, window.innerWidth - 200),
      target, time, canPaste: keyClip?.kind === kindOfTarget(target),
    }
  },

  /** A key's values: the camera's whole pose, or every property of the object keyed at that moment. */
  keyValuesAt (target, time) {
    if (kindOfTarget(target) === 's25cam') return window.__stage25d?.cameraInfo?.()?.keys?.find((k) => sameTime(k.t, time))?.pose ?? {}
    return Object.fromEntries(this.tracks.filter((t) => t.target === target)
      .flatMap((t) => sortedKeys(t).filter((k) => sameTime(k.time, time)).map((k) => [t.property, k.value])))
  },

  copyMenuKey () {
    const { target, time } = this.keyMenu
    keyClip = { kind: kindOfTarget(target), values: this.keyValuesAt(target, time) }
    this.keyMenu = null
  },

  pasteMenuKey () {
    const { target, time } = this.keyMenu
    this.keyMenu = null
    if (!keyClip || keyClip.kind !== kindOfTarget(target)) return
    if (keyClip.kind === 's25cam') { window.__stage25d?.setCameraKeyPose?.(time, keyClip.values); return }
    for (const [property, value] of Object.entries(keyClip.values)) this.writeTrack(target, property, (track) => addKeyframe(track, { ...sortedKeys(track).find((k) => sameTime(k.time, time)), time, value }))
    this.applyFrame()
    this.save()
    this.announce()
  },

  removeMenuKey () {
    this.keyMenu = null
    this.deleteSelected()
  },

  deleteSelected () {
    this.stopEasingPreview()   // an edit or the clock takes the stage back from a preview
    // Diorama keys live in the diorama JSON: one removal per item, at the selected times.
    const dioTimes = {}
    for (const id of this.selected) {
      const [target, , time] = id.split('|')
      if (kindOfTarget(target) === 'dio') (dioTimes[target] ??= []).push(Number(time))
    }
    for (const [target, times] of Object.entries(dioTimes)) window.__diorama?.removeKeys(target.slice(4), [...new Set(times)])
    // The camera's keys live on the stage.
    for (const id of this.selected) {
      const [target, , time] = id.split('|')
      if (kindOfTarget(target) === 's25cam') window.__stage25d?.removeCameraKey?.(Number(time))
    }
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
    if (kindOfTarget(target) === 's25cam') {   // a press selects that frame of the camera and goes to it, to look at it or frame it again; a drag moves the key
      window.__stage25d?.select?.('camera')
      this.selected = [id]
      this.seek(time)
      const el = event.currentTarget
      el.setPointerCapture?.(event.pointerId)
      dragMemory.set(el, { kind: 'camkey', target, anchorTime: time, at: time, startX: event.clientX, startY: event.clientY, moved: false })
      this.drag = { el }
      return
    }
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
    if (String(id).startsWith('art_')) {
      // An arrow's rows are its own (properties.js 'arw'); a picture's are 'art'.
      const arrow = this.objects.find((o) => o.target === `arw:${String(id).slice(4)}`)
      return arrow?.target ?? `art:${String(id).slice(4)}`
    }
    if (String(id).startsWith('dio_')) return `dio:${String(id).slice(4)}`
    if (id === 's25_camera') return 's25cam'
    // The sky's row is its own kind (scene-objects.js): 's25:sky' matched no row and lit none.
    if (id === 's25_sky') return 's25sky:sky'
    if (String(id).startsWith('s25_')) return `s25:${String(id).slice(4)}`
    if (String(id).startsWith('bg_')) return `bg:${String(id).slice(3)}`
    if (id === '__choices__') return this.objects.some((o) => o.target === 'choices') ? 'choices' : null
    if (String(id).startsWith('bal_')) return `bal:${String(id).slice(4)}`
    const text = this.objects.find((o) => (o.kind === 'text' || o.kind === 'rect') && o.target.slice(o.target.indexOf(':') + 1) === String(id))
    return text?.target ?? null
  },

  /**
   * Clicking a layer on the canvas highlights its row, opens its group and scrolls it into view.
   * It does NOT select the layer's keys: Delete pressed to remove the layer would take its
   * animation with it. Selecting keys stays a timeline gesture.
   */
  onObjectSelected (id) {
    // A layer (or the stage) is the selection now, so Delete is about IT, not about keyframes.
    this.selected = []
    this.keyMenu = null
    const target = this.targetFromObjectId(id)
    this.activeTarget = target
    if (!target) return
    this.noteCanvasValues(target)
    // The 3D camera stays closed: its two keys are on its own row, and its panel frames them.
    if (kindOfTarget(target) !== 's25cam' && !this.openGroups[target]) { this.openGroups[target] = true; this.remember() }
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
    // The row selects the LAYER, and only the layer: Delete then removes the layer, as the row
    // says. Its keys stay one press away on the lanes (a marquee takes them all).
    this.selected = []
    const [kind, ...rest] = String(target).split(':')
    const id = rest.join(':')
    if (kind === 'art') (window.__artOverlay?.() ?? window.__lessonArtworkLayer)?.select?.(`art_${id}`)
    else if (kind === 'text' || kind === 'rect') window.__lessonTextLayer?.select?.(id)
    else if (kind === 'dio') window.__diorama?.select?.(id)
    else if (kind === 's25') window.__stage25d?.select?.(id)
    else if (kind === 's25cam') window.__stage25d?.select?.('camera')
    else if (kind === 's25sky') window.__stage25d?.select?.('sky')
    else if (kind === 'bal') window.__balloons?.select?.(`bal_${id}`)
    // the background has no selection of its own: choosing its row lets go of whatever was selected on the stage
    // the Choices layer: the stage shows its card, the object list and the Choices panel follow
    else if (kind === 'choices') {
      window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: '__choices__' } }))
      window.dispatchEvent(new CustomEvent('inspector-open'))
    }
    else if (kind === 'bg') window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: `bg_${id}` } }))
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
    // What the stretch had when the menu opened: leaving without choosing puts this back.
    const before = sortedKeys(this.trackFor(target, property))[index]?.easing ?? 'auto'
    this.easingMenu = { target, property, index, top, left, before, chosen: false }
  },

  /**
   * Close the menu. Click outside and Esc CANCEL: no preview is left playing and the stretch keeps
   * the curve it had. Choosing an option closes it as well (chooseEasing).
   */
  closeEasing () {
    const m = this.easingMenu
    this.stopEasingPreview()
    const now = m ? (sortedKeys(this.trackFor(m.target, m.property))[m.index]?.easing ?? 'auto') : null
    if (m && !m.chosen && now !== m.before) {
      this.setSegmentEasing(m.before)
      this.save()
    }
    this.easingMenu = null
    this.applyFrame()
  },

  // ── Easing preview: hover or focus an option and the stretch plays once with that curve ────

  /** The option being previewed, and how far through (0..1) — the icon's dot reads both. */
  previewName: null,
  previewU: 0,
  _previewRaf: null,

  get reducedMotion () {
    return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  },

  /**
   * Play the open stretch once on the stage with `curve`: from its first key's value to its
   * second's over its own duration, then back to whatever the playhead shows. Reduced motion: the
   * icon is highlighted and nothing moves.
   */
  previewEasing (name, curve = name) {
    this.stopEasingPreview()
    const m = this.easingMenu
    const seg = this.easingSegment
    if (!m || !seg) return
    this.previewName = name
    this.previewU = 0
    if (this.reducedMotion || this.playing) return
    const keys = this.keysOf(m.target, m.property)
    const a = keys[m.index]
    const b = keys[m.index + 1]
    if (!a || !b) return
    const mix = INTERPOLATE[propertyFor(kindOfTarget(m.target), m.property)?.interpolate] ?? INTERPOLATE.linear
    const ease = easingFn(curve)
    const ms = Math.max(200, (b.time - a.time) * 1000)
    const started = performance.now()
    const step = () => {
      const u = Math.min(1, (performance.now() - started) / ms)
      this.previewU = u
      this.showValue(m.target, m.property, mix(a.value, b.value, ease(u)))
      if (u < 1) { this._previewRaf = requestAnimationFrame(step); return }
      this._previewRaf = null
      this.applyFrame()   // back to what the playhead says
    }
    this._previewRaf = requestAnimationFrame(step)
  },

  stopEasingPreview () {
    if (this._previewRaf) { cancelAnimationFrame(this._previewRaf); this._previewRaf = null; this.applyFrame() }
    this.previewName = null
    this.previewU = 0
  },

  /** One value on the stage, without recording anything. */
  showValue (target, property, value) {
    if (kindOfTarget(target) === 'camera') { if (window.__lessonMap) applyCamera(window.__lessonMap, { [property]: value }) }
    else writeObjectProperty(target, property, value)
  },

  /** The previewed option's travelling dot, in the icon's 40x24 box. */
  previewDot (curve) {
    const u = this.previewU
    return { x: (u * 36 + 2).toFixed(1), y: (20 - easingFn(curve)(u) * 16).toFixed(1) }
  },

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
    const curve = this.easingOptions.find((o) => o.name === name)?.curve ?? name
    this.setSegmentEasing(name)
    this.save()
    // Choosing closes the menu and plays the stretch once more with what was chosen.
    this.easingMenu = { ...this.easingMenu, chosen: true }
    this.previewEasing(name, curve)
    this.easingMenu = null
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
    this.stopEasingPreview()
    this.easingMenu = { ...this.easingMenu, editing: true, chosen: true }
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

    // ponytail: only the key under the pointer keeps its distance; a whole selection dragged together can still crowd a neighbour
    const anchor = memory.refs.find((ref) => sameTime(ref.time, memory.anchorTime)) ?? memory.refs[0]
    const moving = new Set(memory.refs.map(keyId))
    const row = memory.baseTracks.find((t) => t.target === anchor.target && t.property === anchor.property)
    const band = rubberBand(snapped, sortedKeys(row).map((k) => k.time).filter((time) => !moving.has(keyId({ target: anchor.target, property: anchor.property, time }))), 0, this.duration)
    if (!band) return
    memory.rest = band.rest
    memory.now = band.at
    const delta = this.placeKeys(memory, band.at)
    if (!event.shiftKey) this.seek(memory.anchorTime + delta)
    else this.applyFrame()
  },

  /** The dragged keys with the anchor at `time`. Returns how far they moved from where the drag began. */
  placeKeys (memory, time) {
    const { tracks, delta } = moveKeys(memory.baseTracks, memory.refs, time - memory.anchorTime, 0, this.duration)
    this.tracks = tracks
    this.selected = memory.refs.map((ref) => keyId({ ...ref, time: ref.time + delta }))
    return delta
  },

  /** A let-go key springs back out of another key's zone, then `done`. */
  springKey (from, to, place, done) {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (still || Math.abs(from - to) < 0.001) { place(to); return done() }
    const began = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - began) / KEY_SPRING_MS)
      place(from + (to - from) * (1 - (1 - p) ** 3))
      if (p < 1) requestAnimationFrame(step)
      else done()
    }
    requestAnimationFrame(step)
  },

  /** A camera key along the timeline: the stage holds its keys, so it moves them. Alt places freely. */
  dragCameraKey (memory, event) {
    const wanted = memory.anchorTime + (event.clientX - memory.startX) / this.zoom
    const snapped = event.altKey ? wanted : snapTime(this.spans, wanted, toleranceSeconds(this.zoom))
    const others = (window.__stage25d?.cameraInfo?.()?.keys ?? []).map((k) => k.t).filter((t) => !sameTime(t, memory.at))
    const band = rubberBand(snapped, others, 0, this.duration)
    if (!band) return
    memory.rest = band.rest
    memory.at = window.__stage25d?.moveCameraKey?.(memory.at, band.at) ?? memory.at
    this.selected = [keyId({ target: memory.target, property: 'x', time: memory.at })]
    this.seek(memory.at)
  },

  /** Every edit replaces the track; nothing here mutates one in place. */
  writeTrack (target, property, mutate) {
    const before = this.tracks
    const existing = this.trackFor(target, property) ?? { target, property, keyframes: [] }
    const next = { ...mutate(existing), target, property }
    this.tracks = this.trackFor(target, property)
      ? this.tracks.map((t) => (t.target === target && t.property === property ? next : t))
      : [...this.tracks, next]
    // A key ADDED to a row of a group (a balloon's tail) keys the whole group; a removed one stays gone.
    const added = sortedKeys(next).some((k) => !sortedKeys(existing).some((o) => sameTime(o.time, k.time)))
    if (added) this.tracks = keyGroupTogether(this.tracks, before, target, property, (p) => readObjectProperty(target, p))
  },

  /** A live edit (a keystroke, a scrub) waits for a pause; the last value saves at once. */
  /** The live save queue, made on first use so it exists whether or not init() has run. */
  saves () {
    this._saves ??= createSaveQueue(() => this.save(), LIVE_SAVE_PAUSE_MS)
    return this._saves
  },

  saveSoon () {
    this.saves().schedule()
  },

  /** Send a live edit that is still waiting for its pause. */
  flushSave () {
    this._saves?.flush()
  },

  /**
   * A live edit still waiting for its pause, kept across a reload. The page closing can cancel the
   * request in flight, so the unsent draft goes to this tab's sessionStorage and comes back on init.
   */
  stashDraft () {
    if (!this._saves?.isPending()) return
    try {
      sessionStorage.setItem(draftKey(config.sceneId), JSON.stringify({ at: Date.now(), tracks: this.tracks, targets: this.targets, duration: this.duration }))
    } catch (_) { /* storage blocked: the pause is lost, as it was before */ }
  },

  restoreDraft () {
    let draft = null
    try {
      const key = draftKey(config.sceneId)
      draft = JSON.parse(sessionStorage.getItem(key) ?? 'null')
      sessionStorage.removeItem(key)
    } catch (_) { return }
    if (!Array.isArray(draft?.tracks) || Date.now() - draft.at > DRAFT_MAX_AGE_MS) return
    this.tracks = draft.tracks
    this.applyFrame()
    this.saveSoon()
  },

  save () {
    this._saves?.cancel()
    this.remember()   // the client's copy is the newer one until the server renders again
    this.$wire?.setTimeline?.({ duration: this.duration, durationSet: this.durationSet, targets: this.targets, tracks: this.tracks, sail: this.sail, stage25dKeys: this.stage25dKeys(), sceneId: config.sceneId })
  },

  /** `{ 'layer-3': keys, 'band-0': keys, sky: keys }` for EVERY row of the stage (an empty list clears a layer's keys), or null with no stage. */
  stage25dKeys () {
    const stage = window.__stage25d
    if (!stage || String(stage.sceneId) !== String(config.sceneId)) return null   // not this scene's stage (yet): send nothing, clear nothing
    const items = (stage.items?.() ?? []).filter((i) => i.id !== 'camera')
    if (!items.length) return null
    const byLayer = keysFromTracks(this.tracks)
    return Object.fromEntries(items.map((i) => [i.id, byLayer[i.id] ?? []]))
  },
})
