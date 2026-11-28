import { describe, it, expect } from 'vitest'
import { comicLayers, comicLayerIds } from '../comic-style.js'
import { chartLayers } from '../../map-chart.js'

/**
 * The Comic style is the lesson map's chart dropped into the Time-Map's style. The two maps share
 * names that mean different things (land, coast-bold, coastline), so what matters is that nothing
 * of the chart's lands on a Time-Map name, and that it all starts hidden.
 */
describe('comic style', () => {
  it('carries every chart layer, under its own comic- id', () => {
    const { under, over } = chartLayers()
    const ids = comicLayerIds()
    expect(ids).toHaveLength(under.length + over.length)
    for (const id of ids) expect(id.startsWith('comic-')).toBe(true)
    for (const taken of ['land', 'coast-bold', 'water', 'bg', 'lakes']) expect(ids).not.toContain(taken)
  })

  it('reads its own coastline, not the Time-Map one', () => {
    const { under, over } = comicLayers()
    const sources = [...under, ...over].map((layer) => layer.source).filter(Boolean)
    expect(sources).not.toContain('coastline')
    expect(sources).toContain('comic-coastline')
  })

  it('starts hidden', () => {
    const { under, over } = comicLayers()
    for (const layer of [...under, ...over]) expect(layer.layout.visibility).toBe('none')
  })
})
