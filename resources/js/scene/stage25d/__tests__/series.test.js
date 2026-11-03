import { describe, it, expect } from 'vitest'
import { seriesOf, poseOf, libraryTiles, membersOf, charactersOf, sameStanceIn, coverOf } from '../series.js'

const fig = (char, pose, facing = 'right') => ({
  id: `fig-${char}-${pose}-01${facing === 'left' ? '-l' : ''}`,
  layer: 'figure',
  tags: ['figure', `char:${char}`, `pose:${pose}`, `facing:${facing}`],
})
const lib = [
  { id: 'sky-summer-01', layer: 'sky', tags: ['sky'] },
  fig('dorpeling-a', 'walk'), fig('dorpeling-a', 'stand'), fig('dorpeling-a', 'stand', 'left'), fig('dorpeling-a', 'dig', 'left'),
  { id: 'tree-birch-01', layer: 'mid', tags: ['tree'] },
  fig('dorpeling-b', 'stand'), fig('dorpeling-b', 'walk', 'left'),
]

describe('stage25d series', () => {
  it('a figure belongs to its character, anything else stands alone', () => {
    expect(seriesOf(fig('dorpeling-a', 'walk'))).toBe('dorpeling-a')
    expect(seriesOf({ id: 'fig-meisje-sit-01', layer: 'figure' })).toBe('meisje')
    expect(seriesOf({ id: 'tree-birch-01', layer: 'mid' })).toBeNull()
  })

  it('reads pose and facing from tags, else from the id', () => {
    expect(poseOf(fig('dorpeling-a', 'dig', 'left'))).toEqual({ pose: 'dig', facing: 'left' })
    expect(poseOf({ id: 'fig-meisje-sit-01-l' })).toEqual({ pose: 'sit', facing: 'left' })
    expect(poseOf({ id: 'fig-meisje-sit-01' })).toEqual({ pose: 'sit', facing: 'right' })
  })

  it('one tile per series, with its count, standing right as the cover; library order kept', () => {
    const tiles = libraryTiles(lib)
    expect(tiles.map((t) => t.id)).toEqual(['sky-summer-01', 'series:dorpeling-a', 'tree-birch-01', 'series:dorpeling-b'])
    expect(tiles[1].count).toBe(4)
    expect(tiles[1].asset.id).toBe('fig-dorpeling-a-stand-01')
    expect(tiles[0]).toMatchObject({ series: null, count: 1 })
  })

  it('the cover falls back to the first picture without a standing one', () => {
    expect(coverOf([fig('x', 'walk'), fig('x', 'dig')]).id).toBe('fig-x-walk-01')
  })

  it('lists the members of a series and the characters of a library', () => {
    expect(membersOf(lib, fig('dorpeling-b', 'stand')).map((a) => a.id)).toEqual(['fig-dorpeling-b-stand-01', 'fig-dorpeling-b-walk-01-l'])
    expect(membersOf(lib, lib[0])).toEqual([lib[0]])
    expect(charactersOf(lib).map((c) => c.series)).toEqual(['dorpeling-a', 'dorpeling-b'])
  })

  it('a character switch keeps the pose and facing when the other character has them', () => {
    expect(sameStanceIn(lib, fig('dorpeling-b', 'walk', 'left'), 'dorpeling-a').id).toBe('fig-dorpeling-a-stand-01-l')
    expect(sameStanceIn(lib, fig('dorpeling-b', 'stand'), 'dorpeling-a').id).toBe('fig-dorpeling-a-stand-01')
    expect(sameStanceIn(lib, fig('dorpeling-a', 'dig', 'left'), 'dorpeling-b').id).toBe('fig-dorpeling-b-stand-01')
    expect(sameStanceIn(lib, fig('dorpeling-a', 'walk'), 'nobody')).toBeNull()
  })
})
