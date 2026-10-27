import { describe, expect, it } from 'vitest'
import { libraryUrlFor, resolveAsset, tagsOf } from './library'
import type { Asset, Library } from './types'

const asset = (id: string, layer: Asset['layer'], tags: string[], score = 5): Asset =>
  ({ id, layer, tags, file: `${id}.png`, w: 10, h: 10, anchor: [0.5, 1], height_m: 1, qa: { score } })
const lib: Library = {
  version: 1, bundle: 't',
  assets: [asset('tree-oak-01', 'fg', ['tree', 'oak']), asset('tree-birch-01', 'fg', ['tree', 'birch']),
    asset('oak-far', 'bg', ['tree', 'oak'], 9), asset('sky-01', 'sky', ['sky', 'day'])],
}

describe('resolveAsset', () => {
  it('takes an asset id outright', () => {
    expect(resolveAsset(lib, { asset: 'tree-birch-01', need: 'oak' })?.id).toBe('tree-birch-01')
  })
  it('picks the asset matching most tags', () => {
    expect(resolveAsset(lib, { need: 'birch tree' })?.id).toBe('tree-birch-01')
  })
  it('prefers the asset made for the requested depth over a higher QA score', () => {
    expect(resolveAsset(lib, { need: 'oak tree' }, 'fg')?.id).toBe('tree-oak-01')
    expect(resolveAsset(lib, { need: 'oak tree' }, 'bg')?.id).toBe('oak-far')
  })
  it('reads an unknown id string as tags (set.sky)', () => {
    expect(resolveAsset(lib, { asset: 'day sky' })?.id).toBe('sky-01')
  })
  it('is deterministic on a full tie (id order)', () => {
    expect(resolveAsset(lib, { need: ['tree'] }, 'fg')?.id).toBe('tree-birch-01')
  })
  it('returns null when nothing shares a tag', () => {
    expect(resolveAsset(lib, { need: 'windmill' })).toBeNull()
  })
})

describe('tagsOf', () => {
  it('splits strings on spaces and commas, lowercases', () => {
    expect(tagsOf('Oak, tree  forest')).toEqual(['oak', 'tree', 'forest'])
  })
})

describe('libraryUrlFor', () => {
  it('lets a scene bundle override the lesson bundle', () => {
    expect(libraryUrlFor({ bundle: 'nl-golden-age' }, { bundle: 'nl-prehistory' })).toBe('library/nl-golden-age/library.json')
    expect(libraryUrlFor({}, { bundle: 'nl-prehistory' })).toBe('library/nl-prehistory/library.json')
  })
  it('uses the playLesson library URL for scenes without their own bundle', () => {
    expect(libraryUrlFor({}, { bundle: 'x' }, '/my/library.json')).toBe('/my/library.json')
    expect(libraryUrlFor({ bundle: 'y' }, { bundle: 'x' }, '/my/library.json')).toBe('library/y/library.json')
  })
})
