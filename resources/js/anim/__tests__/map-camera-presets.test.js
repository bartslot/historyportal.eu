import { describe, it, expect } from 'vitest'
import { applyCameraPreset, CAMERA_PRESETS, startPoint } from '../map-camera-presets.js'

const V = { lng: 12.3, lat: 45.4, zoom: 6, heading: 0, tilt: 0 }
const cam = (tracks, p) => tracks.find((t) => t.target === 'camera' && t.property === p).keyframes

describe('map camera presets (Bart 11-24)', () => {
  it('has six, each ending on the framed shot', () => {
    expect(CAMERA_PRESETS).toHaveLength(6)
    for (const id of CAMERA_PRESETS.filter((i) => i !== 'zoomOut' && i !== 'drift')) {
      const { tracks } = applyCameraPreset([], id, V)
      expect(cam(tracks, 'lng').at(-1).value).toBeCloseTo(V.lng)
      expect(cam(tracks, 'lat').at(-1).value).toBeCloseTo(V.lat)
    }
  })
  it('zooms in to the shot and out from it', () => {
    expect(cam(applyCameraPreset([], 'zoomIn', V).tracks, 'zoom').map((k) => k.value)).toEqual([3.5, 6])
    expect(cam(applyCameraPreset([], 'zoomOut', V).tracks, 'zoom').map((k) => k.value)).toEqual([6, 3.5])
  })
  it('A to B starts at a focus place away from the shot, and replaces every camera key', () => {
    const old = [{ target: 'camera', property: 'zoom', keyframes: [{ time: 0, value: 1 }, { time: 9, value: 2 }] }, { target: 'terr:map', property: 'draw', keyframes: [] }]
    const { tracks, to } = applyCameraPreset(old, 'aToB', V, { start: 2, focus: [[12.3, 45.4], [64.4, 39.8]] })
    expect(to).toBe(7)
    expect(cam(tracks, 'lng')[0]).toMatchObject({ time: 2, value: 64.4 })
    expect(cam(tracks, 'zoom').map((k) => k.time)).toEqual([2, 4.5, 7])
    expect(tracks.filter((t) => t.target === 'terr:map')).toHaveLength(1)
  })
  it('with no focus place A is a stretch west of the shot', () => {
    expect(startPoint(V, [])[0]).toBeLessThan(V.lng)
  })
  it('from space starts on the whole globe and lands tilted', () => {
    const { tracks } = applyCameraPreset([], 'fromSpace', V)
    expect(cam(tracks, 'zoom')[0].value).toBeLessThan(1.1)
    expect(cam(tracks, 'tilt').at(-1).value).toBeGreaterThan(30)
  })
})
