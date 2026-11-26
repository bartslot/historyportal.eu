import { describe, it, expect } from 'vitest'
import { assetIcon, assetLabel, layerLabel, numbered, plantLabel } from '../labels.js'

describe('stage25d labels', () => {
  it('names a picture from its id, in English or Dutch', () => {
    expect(assetLabel({ id: 'tree-birch-01' })).toBe('Birch')
    expect(assetLabel({ id: 'tree-birch-01' }, 'nl')).toBe('Berk')
    expect(assetLabel({ id: 'stone-chamber-01' })).toBe('Stone chamber')
    expect(assetLabel({ id: 'boulder-large-01' }, 'nl')).toBe('Grote zwerfkei')
    expect(assetLabel({ id: 'ground-path-sand-01' })).toBe('Ground path sand')
  })
  it('library.json names win; other languages read English', () => {
    expect(assetLabel({ id: 'x-01', name: { en: 'Odd', nl: 'Raar' } }, 'nl')).toBe('Raar')
    expect(assetLabel({ id: 'x-01', name: { en: 'Odd' } }, 'de')).toBe('Odd')
    expect(assetLabel({ id: 'cow-01' }, 'de')).toBe('Cow')
  })
  it('a figure layer reads as its character', () => {
    expect(layerLabel({ figure: 'dorpeling-b', asset: 'fig-dorpeling-b-walk-01' }, { id: 'fig-dorpeling-b-walk-01' })).toBe('Dorpeling B')
    expect(layerLabel({ need: 'stone boulder' }, null)).toBe('Stone boulder')
  })

  it('names a figure picture by its character even when the layer does not say who it is', () => {
    expect(layerLabel({ asset: 'fig-dorpeling-b-stand-01' }, { id: 'fig-dorpeling-b-stand-01', layer: 'figure', tags: ['figure', 'char:dorpeling-b', 'pose:stand'] })).toBe('Dorpeling B')
    expect(layerLabel({ asset: 'fig-moeder-walk-01-l' }, null)).toBe('Moeder')
  })

  it('numbers names that repeat, from the second one on', () => {
    expect(numbered(['Braam', 'Pot', 'Braam', 'Braam'])).toEqual(['Braam', 'Pot', 'Braam 2', 'Braam 3'])
  })
})

describe('assetIcon', () => {
  it('gives a character the person, a sky the cloud, a plant the leaf, the rest the picture', () => {
    expect(assetIcon({ layer: 'figure', tags: ['figure'] })).toBe('person')
    expect(assetIcon({ layer: 'sky', tags: ['sky'] })).toBe('cloud')
    expect(assetIcon({ layer: 'fg', tags: ['tree', 'oak'] })).toBe('leaf')
    expect(assetIcon({ layer: 'fg', tags: ['heather', 'heath', 'ground'] })).toBe('leaf')
    expect(assetIcon({ layer: 'bg', tags: ['fields', 'farm'] })).toBe('photo')
    expect(assetIcon({ layer: 'prop', tags: ['cow', 'animal'] })).toBe('photo')
    expect(assetIcon(undefined)).toBe('photo')
  })
})

describe('a Character-tab person keeps the name as typed (Twine import 11-17: "Marco polo")', () => {
  it('uses the asset name over the char tag', () => {
    expect(layerLabel({}, { id: 'chr-516', layer: 'figure', tags: ['char:marco-polo'], name: { en: 'Marco Polo' } })).toBe('Marco Polo')
  })
})

describe('plantLabel: a plant on the terrain\'s Plants list', () => {
  it('a library picture reads its own name, a sheet cell its plant tag', () => {
    expect(plantLabel({ key: 'grass-tall-01', asset: 'grass-tall-01', tags: ['grass'] }, { id: 'grass-tall-01' }, 'nl')).toBe('Hoog gras')
    expect(plantLabel({ key: 'ground-sprites-01#2', asset: 'ground-sprites-01', tags: ['heather', 'heath', 'ground'] }, null, 'nl')).toBe('Heide')
    expect(plantLabel({ key: 's#4', asset: 's', tags: ['forest', 'moss', 'undergrowth'] }, null, 'en')).toBe('Moss')
  })
})
