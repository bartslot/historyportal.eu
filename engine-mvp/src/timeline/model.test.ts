// The timeline rules a teacher relies on, against a fake actor (no WebGL): keys, auto-key, playback.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as TL from './model'

const actor = () => {
  const a: any = { position: { x: 0, z: 0 }, metadata: { id: 'a1' }, isDisposed: () => false, setEnabled: vi.fn() }
  let yaw = 0
  a.rotationQuaternion = { toEulerAngles: () => ({ y: yaw }) }
  ;(globalThis as any).BABYLON = { Axis: { Y: 'y' }, Quaternion: { RotationAxis: (_: string, r: number) => { yaw = r; return a.rotationQuaternion } } }
  return a
}
const T = 'actor:a1'
let a: any

beforeEach(() => {
  a = actor()
  ;(globalThis as any).window = { __mvp: { actors: [a] }, BABYLON: (globalThis as any).BABYLON }
  TL.setTracks([], { time: 0, duration: 8, autoKey: true, playing: false, selected: [] })
})

describe('timeline model', () => {
  it('one key stores a value and drives nothing; two keys move the actor', () => {
    TL.toggleKey(T, 'x')
    a.position.x = 3
    TL.seek(1)
    expect(a.position.x).toBe(3)                       // a single key never pins the property
    TL.seek(2); TL.toggleKey(T, 'x')                   // x = 3 at 2 s
    TL.seek(1)
    expect(a.position.x).toBeGreaterThan(0)
    expect(a.position.x).toBeLessThan(3)
  })

  it('auto-key records only properties that are already animated', () => {
    TL.toggleKey(T, 'x')
    TL.seek(2)
    a.position.x = 5; a.position.z = 4
    TL.recordCanvasEdit(T)
    expect(TL.keysOf(T, 'x').map((k) => k.value)).toEqual([0, 5])
    expect(TL.keysOf(T, 'z')).toEqual([])
  })

  it('auto-key off: an edit is not keyed', () => {
    TL.toggleKey(T, 'x'); TL.seek(2); TL.setAutoKey(false)
    a.position.x = 5
    TL.recordCanvasEdit(T)
    expect(TL.keysOf(T, 'x')).toHaveLength(1)
  })

  it('keyAt pins the start at 0 so a later key never moves it from nowhere', () => {
    a.position.x = 2
    TL.keyAt(T, 'x', 3, 6)
    expect(TL.keysOf(T, 'x').map((k) => [k.time, k.value])).toEqual([[0, 2], [3, 6]])
  })

  it('Delete removes the selected keys and drops a track left empty', () => {
    TL.toggleKey(T, 'x'); TL.seek(2); TL.toggleKey(T, 'x')
    TL.select([`${T}|x|2`])
    TL.deleteSelected()
    expect(TL.keysOf(T, 'x').map((k) => k.time)).toEqual([0])
    TL.select([`${T}|x|0`]); TL.deleteSelected()
    expect(TL.getState().tracks).toEqual([])
  })

  it('the easing of a stretch belongs to the key it leaves; auto clears it', () => {
    TL.toggleKey(T, 'x'); TL.seek(2); TL.toggleKey(T, 'x')
    TL.setSegmentEasing(T, 'x', 0, 'linear')
    expect(TL.keysOf(T, 'x')[0].easing).toBe('linear')
    TL.setSegmentEasing(T, 'x', 0, 'auto')
    expect(TL.keysOf(T, 'x')[0].easing).toBeUndefined()
  })

  it('turn is an angle: it takes the short way round', () => {
    TL.keyAt(T, 'turn', 0, 350); TL.keyAt(T, 'turn', 2, 10)
    TL.setSegmentEasing(T, 'turn', 0, 'linear')
    expect(TL.sampleAt(T, 'turn', 1)).toBeCloseTo(360, 5)
  })

  it('play needs something to move', () => {
    TL.play()
    expect(TL.getState().playing).toBe(false)
    TL.toggleKey(T, 'x'); TL.seek(2); a.position.x = 1; TL.toggleKey(T, 'x')
    TL.play()
    expect(TL.getState().playing).toBe(true)
    TL.pause()
  })
})
