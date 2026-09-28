import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { layerOverlay, setLayerPropEverywhere, selectLayerEverywhere } from '../layer-overlays.js'

/** A stand-in overlay that records what was set on it. */
const overlay = (assetIds) => ({
  _layers: assetIds.map((id) => ({ asset_id: id })),
  sets: [],
  setLayerProp (assetId, key, value) { this.sets.push([assetId, key, value]) },
})

beforeEach(() => {
  delete window.__voyageArtworkLayer
  delete window.__lessonArtworkLayer
})
afterEach(() => {
  delete window.__voyageArtworkLayer
  delete window.__lessonArtworkLayer
})

describe('choosing which overlay to read a layer from', () => {
  it('prefers the map’s own overlay when both are rendering the layer', () => {
    // Arrange — a map scene: the voyage overlay sits over the map, the stage's is also alive.
    const voyage = overlay([232])
    const stage = overlay([232])
    window.__voyageArtworkLayer = voyage
    window.__lessonArtworkLayer = stage

    // Assert — the map's copy is the one on screen, and its host decides the measured proportion.
    expect(layerOverlay(232)).toBe(voyage)
  })

  it('falls back to the stage when there is no map overlay', () => {
    const stage = overlay([232])
    window.__lessonArtworkLayer = stage

    expect(layerOverlay(232)).toBe(stage)
  })

  it('skips an overlay that is not rendering the layer', () => {
    const voyage = overlay([999])
    const stage = overlay([232])
    window.__voyageArtworkLayer = voyage
    window.__lessonArtworkLayer = stage

    expect(layerOverlay(232)).toBe(stage)
  })

  it('reports nothing when no overlay has the layer', () => {
    window.__lessonArtworkLayer = overlay([999])

    expect(layerOverlay(232)).toBeNull()
  })
})

describe('previewing a change', () => {
  /**
   * THE BUG THIS EXISTS FOR. Writing to `__lessonArtworkLayer` alone left the map scene's visible
   * node untouched — the panel's slider moved, the stored value changed, and the canvas the
   * teacher was looking at did not move until the scene re-rendered.
   */
  it('reaches every overlay rendering the layer, not just one', () => {
    const voyage = overlay([232])
    const stage = overlay([232])
    window.__voyageArtworkLayer = voyage
    window.__lessonArtworkLayer = stage

    setLayerPropEverywhere(232, 'width', 5.05)

    expect(voyage.sets).toEqual([[232, 'width', 5.05]])
    expect(stage.sets).toEqual([[232, 'width', 5.05]])
  })

  it('leaves an overlay that does not have the layer alone', () => {
    const other = overlay([999])
    window.__voyageArtworkLayer = other
    window.__lessonArtworkLayer = overlay([232])

    setLayerPropEverywhere(232, 'width', 5.05)

    expect(other.sets).toEqual([])
  })

  it('matches a layer id given as a string against a numeric one', () => {
    const stage = overlay([232])
    window.__lessonArtworkLayer = stage

    setLayerPropEverywhere('232', 'height', 20)

    expect(stage.sets).toEqual([['232', 'height', 20]])
  })
})

describe('clearing the selection', () => {
  const selectable = () => ({ _layers: [{ asset_id: 232 }], selected: 'art_232', select (id) { this.selected = id } })

  /**
   * "Back to Scene" cleared only the stage's overlay, so on a map scene the layer stayed ringed and
   * handled over the map and the button looked inert.
   */
  it('deselects on every overlay, not just the stage', () => {
    const voyage = selectable()
    const stage = selectable()
    window.__voyageArtworkLayer = voyage
    window.__lessonArtworkLayer = stage

    selectLayerEverywhere(null)

    expect(voyage.selected).toBeNull()
    expect(stage.selected).toBeNull()
  })

  /**
   * Deselect does NOT filter by ownership. An overlay that is not rendering the layer can still be
   * holding a selection of its own, and "nothing is selected" has to mean nothing, anywhere.
   */
  it('clears an overlay that is not rendering the layer', () => {
    const other = { _layers: [{ asset_id: 999 }], selected: 'art_999', select (id) { this.selected = id } }
    window.__voyageArtworkLayer = other
    window.__lessonArtworkLayer = selectable()

    selectLayerEverywhere(null)

    expect(other.selected).toBeNull()
  })
})
