import { describe, it, expect, afterEach } from 'vitest'
import { tracksFromKeys, keysFromTracks } from '../stage25d-keys.js'
import { stage25dObjects, readObjectProperty, writeObjectProperty, setObjectHidden } from '../scene-objects.js'
import { propertiesFor } from '../properties.js'
import { displayOf } from '../timeline-groups.js'
import { structureSig, editSig, layerIndex } from '../../scene/stage25d/live.js'

afterEach(() => { delete window.__stage25d })

describe('layer keys <-> timeline tracks', () => {
  const items = [{ id: 'layer-2', keys: [{ t: 0, x: 0.2, y: 0 }, { t: 3, x: 0.8 }] }, { id: 'layer-3', keys: [] }]

  it('one track per keyed property, keyframes in time order', () => {
    expect(tracksFromKeys(items)).toEqual([
      { target: 's25:layer-2', property: 'x', keyframes: [{ time: 0, value: 0.2 }, { time: 3, value: 0.8 }] },
      { target: 's25:layer-2', property: 'y', keyframes: [{ time: 0, value: 0 }] },
    ])
  })

  it('round-trips, and a key at one moment carries every property keyed there', () => {
    expect(keysFromTracks(tracksFromKeys(items))).toEqual({ 'layer-2': [{ t: 0, x: 0.2, y: 0 }, { t: 3, x: 0.8 }] })
  })

  it('ignores other kinds and non-finite values', () => {
    const tracks = [{ target: 'text:1', property: 'x', keyframes: [{ time: 0, value: 1 }] }, { target: 's25:layer-0', property: 'x', keyframes: [{ time: 1, value: NaN }] }]
    expect(keysFromTracks(tracks)).toEqual({ 'layer-0': [] })
  })
})

describe('the timeline sees stage25d layers', () => {
  it('lists layers then the camera, as s25 targets', () => {
    window.__stage25d = { items: () => [{ id: 'layer-0', label: 'stone' }, { id: 'camera', label: 'Camera' }] }
    expect(stage25dObjects()).toEqual([{ target: 's25:layer-0', kind: 's25', label: 'stone' }, { target: 's25cam', kind: 's25cam', label: 'Camera' }])
  })

  it('reads, writes and hides through the stage', () => {
    const calls = []
    window.__stage25d = {
      readLayerProp: (id, p) => (id === 'layer-1' && p === 'x' ? 0.4 : null),
      setLayerProp: (...a) => calls.push(['set', ...a]),
      setHidden: (...a) => calls.push(['hide', ...a]),
    }
    expect(readObjectProperty('s25:layer-1', 'x')).toBe(0.4)
    writeObjectProperty('s25:layer-1', 'x', 0.9)
    setObjectHidden('s25:layer-1', true)
    expect(calls).toEqual([['set', 'layer-1', 'x', 0.9], ['hide', 'layer-1', true]])
  })

  it('offers x, distance, y, scale, angle and opacity, shown in readable units', () => {
    expect(propertiesFor('s25').filter((p) => p.group !== 'bones').map((p) => p.key)).toEqual(['x', 'z', 'y', 'scale', 'rotation', 'opacity'])
    expect(displayOf('s25', 'z')).toMatchObject({ scale: 1, unit: 'm' })
    expect(displayOf('s25', 'x')).toMatchObject({ scale: 100, unit: '%' })
    expect(displayOf('s25', 'opacity')).toMatchObject({ scale: 100, unit: '%' })
    expect(displayOf('s25', 'y').unit).toBe('m')
  })

  it('a bone is a keyed field like the others: its keys round-trip, a pose is keyed as one group, in degrees', () => {
    const items = [{ id: 'layer-1', keys: [{ t: 1, 'bone:head': 12, x: 0.2 }] }]
    expect(keysFromTracks(tracksFromKeys(items))).toEqual({ 'layer-1': [{ t: 1, x: 0.2, 'bone:head': 12 }] })
    expect(propertiesFor('s25').filter((p) => p.group === 'bones').map((p) => p.key)).toContain('bone:forearm_n')
    expect(displayOf('s25', 'bone:head').unit).toBe('°')
  })
})

describe('a bone on the stage', () => {
  it('turning a bone is an edit, never a rebuild', () => {
    const cfg = (layer) => ({ bundle: 'b', set: { layers: [{ asset: 'a', depth: 'mid', ...layer }] } })
    expect(structureSig(cfg({ 'bone:head': 10 }))).toBe(structureSig(cfg({ 'bone:head': 20 })))
    expect(editSig(cfg({ 'bone:head': 10 }))).not.toBe(editSig(cfg({ 'bone:head': 20 })))
  })
})

describe('what needs a rebuild', () => {
  const cfg = (layer) => ({ bundle: 'b', set: { layers: [{ asset: 'a', depth: 'mid', ...layer }] } })

  it('moving or keying a layer is not a different set; swapping its asset is', () => {
    expect(structureSig(cfg({ x: 0.1 }))).toBe(structureSig(cfg({ x: 0.9, keys: [{ t: 0, x: 1 }], rotation: 5 })))
    expect(structureSig(cfg({}))).not.toBe(structureSig({ ...cfg({}), set: { layers: [{ asset: 'b', depth: 'mid' }] } }))
  })

  it('the edit signature changes with the server copy of an edit', () => {
    expect(editSig(cfg({ x: 0.1 }))).not.toBe(editSig(cfg({ x: 0.2 })))
    expect(editSig(cfg({ x: 0.1 }))).toBe(editSig(cfg({ x: 0.1 })))
  })

  it('layer ids', () => {
    expect([layerIndex('layer-12'), layerIndex('camera')]).toEqual([12, -1])
  })
})
