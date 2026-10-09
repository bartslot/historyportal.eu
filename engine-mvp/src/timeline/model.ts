// The studio's timeline: the wizard's Timeline tab (resources/js/anim/timeline-panel.js) without
// Alpine, Livewire or the map. Same data (tracks of {target, property, keyframes[{time, value,
// easing?}]}), same pure modules, same rules:
//   - only a track with TWO or more keys drives anything; one key is a stored value, not a movement
//   - auto-key records a canvas edit only on a property that is already animated
//   - the easing of a stretch belongs to the key it leaves; 'auto' follows the key's position
// Targets are `actor:<id>`; their rows come from the shared registry (properties.js, kind 'actor').
/* eslint-disable @typescript-eslint/no-explicit-any */
import { addKeyframe, sameTime, segmentEasing, sortedKeys } from '@hp/anim/keyframes.js'
import { deleteKeys, keyId, moveKeys } from '@hp/anim/timeline-edit.js'
import { kindOfTarget, propertiesFor, sampleFrame as sampleAny } from '@hp/anim/properties.js'

export type Key = { time: number; value: number; easing?: string }
export type Track = { target: string; property: string; keyframes: Key[] }
export type KeyRef = { target: string; property: string; time: number }
export type TimelineObject = { target: string; label: string }

/** The shared sampler, typed: `{ target: { property: value } }`. */
const sampleFrame = (tracks: Track[], time: number) => sampleAny(tracks, time) as Record<string, Record<string, number>>

/** Bart: "the standard animation time should be 8 seconds". */
export const DEFAULT_DURATION = 8
const MAX_DURATION = 3600

type State = {
  tracks: Track[]; time: number; duration: number; playing: boolean; autoKey: boolean; loop: boolean
  selected: string[]; openGroups: Record<string, boolean>; hidden: Record<string, boolean>
  activeTarget: string | null; canvasTick: number
}

let state: State = {
  tracks: [], time: 0, duration: DEFAULT_DURATION, playing: false, autoKey: true, loop: false,
  selected: [], openGroups: {}, hidden: {}, activeTarget: null, canvasTick: 0,
}
const listeners = new Set<() => void>()
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach((l) => l()) }

export const getState = () => state
export const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } }

// ---------- the engine side: what an actor target reads and writes ----------
const mvp = (): any => (window as any).__mvp
const B = (): any => (window as any).BABYLON
export const targetOf = (actor: any) => `actor:${actor.metadata.id}`
export const actorOf = (target: string): any => mvp()?.actors.find((a: any) => targetOf(a) === target) ?? null
const yawDeg = (a: any) => ((a.rotationQuaternion.toEulerAngles().y * 180 / Math.PI) % 360 + 360) % 360

export function readProperty(target: string, property: string): number | null {
  const a = actorOf(target)
  if (!a) return null
  if (property === 'x') return a.position.x
  if (property === 'z') return a.position.z
  if (property === 'turn') return yawDeg(a)
  return null
}

function writeProperty(target: string, property: string, value: number) {
  const a = actorOf(target)
  if (!a || !Number.isFinite(value)) return
  if (property === 'x') a.position.x = value
  else if (property === 'z') a.position.z = value
  else if (property === 'turn') a.rotationQuaternion = B().Quaternion.RotationAxis(B().Axis.Y, value * Math.PI / 180)
}

/** Every actor that can be animated: floor objects, not wall pictures, doors or clouds. */
export function objects(): TimelineObject[] {
  return (mvp()?.actors ?? [])
    .filter((a: any) => !a.isDisposed() && !a.metadata.opening && !a.metadata.cloud && !a.metadata.decal)
    .map((a: any) => ({ target: targetOf(a), label: a.name }))
}

export const propertiesOf = (target: string) => propertiesFor(kindOfTarget(target)) as { key: string; label: string; unit: string }[]

// ---------- reading tracks ----------
export const trackFor = (target: string, property: string, tracks = state.tracks) =>
  tracks.find((t) => t.target === target && t.property === property) ?? null
export const keysOf = (target: string, property: string): Key[] => sortedKeys(trackFor(target, property))
export const isAnimated = (target: string, property: string) => keysOf(target, property).length > 0
export const hasKeyHere = (target: string, property: string) => keysOf(target, property).some((k) => sameTime(k.time, state.time))

export function spanOf(target: string, property: string) {
  const keys = keysOf(target, property)
  return keys.length < 2 ? null : { from: keys[0].time, to: keys[keys.length - 1].time }
}

export function objectSpan(target: string) {
  const spans = propertiesOf(target).map((p) => spanOf(target, p.key)).filter(Boolean) as { from: number; to: number }[]
  return spans.length ? { from: Math.min(...spans.map((s) => s.from)), to: Math.max(...spans.map((s) => s.to)) } : null
}

export function segmentsOf(target: string, property: string) {
  const track = trackFor(target, property)
  const keys = sortedKeys(track)
  return keys.slice(0, -1).map((a: Key, index: number) => ({
    index, from: a.time, to: keys[index + 1].time,
    easing: segmentEasing(a, index, keys.length - 1, track as any) as string, chosen: !!a.easing,
  }))
}

export function keyTimesOf(target: string) {
  const times = new Set<number>()
  for (const p of propertiesOf(target)) for (const k of keysOf(target, p.key)) times.add(k.time)
  return [...times].sort((a, b) => a - b)
}
export const prevKeyTime = (target: string) => keyTimesOf(target).filter((t) => t < state.time && !sameTime(t, state.time)).at(-1) ?? null
export const nextKeyTime = (target: string) => keyTimesOf(target).find((t) => t > state.time && !sameTime(t, state.time)) ?? null

export const nothingToPlay = () => !state.tracks.some((t) => sortedKeys(t).length >= 2)

/** What a property reads at the playhead: sampled when animated, live otherwise. */
export function valueAt(target: string, property: string) {
  if (keysOf(target, property).length) {
    const v = sampleFrame(state.tracks, state.time)[target]?.[property]
    if (Number.isFinite(v)) return v as number
  }
  return readProperty(target, property) ?? 0
}

export const refsOf = (target: string, property: string | null = null, tracks = state.tracks): KeyRef[] => tracks
  .filter((t) => t.target === target && (property === null || t.property === property))
  .flatMap((t) => sortedKeys(t).map((k: Key) => ({ target, property: t.property, time: k.time })))

export const selectedRefs = (): KeyRef[] => state.tracks.flatMap((t) => sortedKeys(t)
  .map((k: Key) => ({ target: t.target, property: t.property, time: k.time }))
  .filter((r: KeyRef) => state.selected.includes(keyId(r))))

/** A property's value at any moment, for the AI animator: keyed when there are keys, else live. */
export function sampleAt(target: string, property: string, time: number) {
  const v = sampleFrame(state.tracks.filter((t) => sortedKeys(t).length), time)[target]?.[property]
  return Number.isFinite(v) ? v : readProperty(target, property)
}

// ---------- applying ----------
/** Push the sampled frame onto the actors. Scrub and play share it, so what is scrubbed is what plays. */
export function applyFrame(tracks = state.tracks, time = state.time) {
  const live = tracks.filter((t) => sortedKeys(t).length >= 2)
  const frame = sampleFrame(live, time)
  for (const [target, values] of Object.entries(frame)) {
    for (const [property, value] of Object.entries(values as Record<string, number>)) writeProperty(target, property, value)
  }
}

// ---------- editing (every edit replaces tracks; nothing mutates one in place) ----------
function writeTrack(target: string, property: string, mutate: (t: Track) => Track, tracks = state.tracks) {
  const existing = trackFor(target, property, tracks)
  const next = { ...mutate(existing ?? { target, property, keyframes: [] }), target, property }
  return existing
    ? tracks.map((t) => (t.target === target && t.property === property ? next : t))
    : [...tracks, next]
}

export function setTracks(tracks: Track[], extra: Partial<State> = {}) {
  set({ tracks, ...extra })
  applyFrame()
}

export function seek(time: number) {
  set({ time: Math.min(state.duration, Math.max(0, time)) })
  applyFrame()
}

/** The diamond: key this property at the playhead with the value it has now. */
export function toggleKey(target: string, property: string) {
  const value = readProperty(target, property) ?? 0
  set({ tracks: writeTrack(target, property, (t) => addKeyframe(t, { time: state.time, value })) })
}

/** A value typed into a row: applied now, and keyed if the property is animated and auto-key is on. */
export function setValue(target: string, property: string, value: number) {
  if (!Number.isFinite(value)) return
  writeProperty(target, property, value)
  if (!state.autoKey || !isAnimated(target, property)) { set({ canvasTick: state.canvasTick + 1 }); return }
  set({ tracks: writeTrack(target, property, (t) => addKeyframe(t, { time: state.time, value })) })
}

/** Canvas edit -> keyframes, for animated properties whose value really changed. */
export function recordCanvasEdit(target: string) {
  set({ canvasTick: state.canvasTick + 1 })
  if (state.playing || !state.autoKey) return
  const frame = sampleFrame(state.tracks.filter((t) => sortedKeys(t).length), state.time)[target] ?? {}
  let tracks = state.tracks
  for (const p of propertiesOf(target)) {
    const value = readProperty(target, p.key)
    if (value === null || !isAnimated(target, p.key)) continue
    if (Math.abs((frame[p.key] ?? NaN) - value) < 1e-3) continue
    tracks = writeTrack(target, p.key, (t) => addKeyframe(t, { time: state.time, value }), tracks)
  }
  if (tracks !== state.tracks) set({ tracks })
}

/** Write one key directly (the AI animator), pinning the start at 0 so a later key never drags it from nowhere. */
export function keyAt(target: string, property: string, time: number, value: number) {
  let tracks = state.tracks
  if (!keysOf(target, property).length && time > 0) {
    const start = readProperty(target, property) ?? value
    tracks = writeTrack(target, property, (t) => addKeyframe(t, { time: 0, value: start }), tracks)
  }
  set({ tracks: writeTrack(target, property, (t) => addKeyframe(t, { time, value }), tracks) })
  if (time > state.duration) setDuration(Math.ceil(time))
}

export function deleteSelected() {
  set({ tracks: deleteKeys(state.tracks, selectedRefs()), selected: [] })
  applyFrame()
}

export function removeTarget(target: string) {
  set({ tracks: state.tracks.filter((t) => t.target !== target), selected: state.selected.filter((s) => !s.startsWith(target + '|')) })
}

export function setSegmentEasing(target: string, property: string, index: number, name: string) {
  set({
    tracks: writeTrack(target, property, (track) => {
      const keys = sortedKeys(track)
      const leaving = keys[index]
      if (!leaving) return track
      return {
        ...track,
        keyframes: keys.map((k: Key) => {
          if (k !== leaving) return k
          const { easing: _drop, ...rest } = k
          return name === 'auto' ? rest : { ...rest, easing: name }
        }),
      }
    }),
  })
  applyFrame()
}

/** Move `refs` by `delta` seconds, from the tracks as they were when the drag began. */
export function moveFrom(baseTracks: Track[], refs: KeyRef[], delta: number) {
  const moved = moveKeys(baseTracks, refs, delta, 0, state.duration)
  set({ tracks: moved.tracks as Track[], selected: refs.map((r) => keyId({ ...r, time: r.time + moved.delta })) })
  return moved.delta
}

export const select = (ids: string[]) => set({ selected: ids })
export const setDuration = (seconds: number) => {
  const duration = Math.min(MAX_DURATION, Math.max(0.1, Number(seconds) || DEFAULT_DURATION))
  set({ duration, time: Math.min(state.time, duration) })
  applyFrame()
}
export const setAutoKey = (on: boolean) => set({ autoKey: on })
export const setLoop = (on: boolean) => set({ loop: on })
export const setGroups = (targets: string[], open: boolean) => set({ openGroups: Object.fromEntries(targets.map((t) => [t, open])) })
/** The easing a stretch gets when nobody chose one (the menu's "Automatic · …"). */
export const autoEasing = (index: number, count: number) => segmentEasing({}, index, count) as string
export const toggleGroup = (target: string) => set({ openGroups: { ...state.openGroups, [target]: !state.openGroups[target] } })
export const setActive = (target: string | null) => set({
  activeTarget: target,
  openGroups: target && !state.openGroups[target] ? { ...state.openGroups, [target]: true } : state.openGroups,
})

export function toggleHidden(target: string) {
  const hidden = { ...state.hidden, [target]: !state.hidden[target] }
  actorOf(target)?.setEnabled(!hidden[target])
  set({ hidden })
}

// ---------- playback: driven by the engine's own render loop, one clock for the scene ----------
let startedAt = 0
let startedFrom = 0
export function play() {
  if (state.playing || !(state.duration > 0) || nothingToPlay()) return
  startedFrom = state.time >= state.duration ? 0 : state.time
  startedAt = performance.now()
  set({ playing: true })
}
export const pause = () => { if (state.playing) set({ playing: false }) }
export const togglePlay = () => (state.playing ? pause() : play())

/** Called once per rendered frame by the engine. */
export function tick() {
  if (!state.playing) return
  let t = startedFrom + (performance.now() - startedAt) / 1000
  if (t >= state.duration) {
    if (!state.loop) { seek(state.duration); pause(); return }
    t %= state.duration
    startedFrom = 0
    startedAt = performance.now() - t * 1000
  }
  seek(t)
}
