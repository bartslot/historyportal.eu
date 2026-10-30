import { describe, expect, it } from 'vitest'
import { clearTreesFromStone, liftSmallProps, liftSubjects, PROP_MIN_M } from './props'
import type { Library, Scene } from './types'

const LIB: Library = { bundle: 't', assets: [
  { id: 'pot-01', layer: 'prop', tags: ['pot'], height_m: 0.3 },
  { id: 'hut-01', layer: 'mid', tags: ['hut'], height_m: 3 },
  { id: 'tree-01', layer: 'bg', tags: ['tree', 'birch'], height_m: 15 },
  { id: 'hb-01', layer: 'mid', tags: ['hunebed'], height_m: 3 },
] }
const scene = (layers: Scene['set']['layers']): Scene => ({ id: 's', beat: 'setup', narration: 'x', camera: null, sound: null, set: { layers } })

describe('small props', () => {
  it('brings a prop at mid to fg and sizes it to PROP_MIN_M', () => {
    const l = liftSmallProps(scene([{ asset: 'pot-01', depth: 'mid', x: 0.5, scale: 1.6 }]), LIB).set.layers[0]
    expect(l.depth).toBe('fg')
    expect(0.3 * (l.scale ?? 1)).toBeCloseTo(PROP_MIN_M)
  })
  it('leaves buildings, fg props and unknown assets alone', () => {
    const s = scene([{ asset: 'hut-01', depth: 'mid' }, { asset: 'pot-01', depth: 'fg', scale: 1 }, { asset: 'nope', depth: 'mid' }])
    expect(liftSmallProps(s, LIB)).toBe(s)
  })
})

describe('trees and stone', () => {
  it('moves a far tree off a stone subject, to the open side', () => {
    const s = scene([{ asset: 'tree-01', depth: 'bg', x: 0.5 }, { asset: 'hb-01', depth: 'mid', x: 0.6 }])
    expect(clearTreesFromStone(s, LIB).set.layers[0].x).toBe(0.15)
  })
  it('leaves a tree that is already clear, or behind a hut', () => {
    const far = scene([{ asset: 'tree-01', depth: 'bg', x: 0.1 }, { asset: 'hb-01', depth: 'mid', x: 0.6 }])
    expect(clearTreesFromStone(far, LIB)).toBe(far)
    const hut = scene([{ asset: 'tree-01', depth: 'bg', x: 0.5 }, { asset: 'hut-01', depth: 'mid', x: 0.5 }])
    expect(clearTreesFromStone(hut, LIB)).toBe(hut)
  })
})

describe('subjects', () => {
  it('brings a mid-plane subject the writer put at bg to mid', () => {
    expect(liftSubjects(scene([{ asset: 'hb-01', depth: 'bg', x: 0.5 }]), LIB).set.layers[0].depth).toBe('mid')
  })
  it('leaves bg strips (library layer bg) alone', () => {
    const s = scene([{ asset: 'tree-01', depth: 'bg' }])
    expect(liftSubjects(s, LIB)).toBe(s)
  })
})
