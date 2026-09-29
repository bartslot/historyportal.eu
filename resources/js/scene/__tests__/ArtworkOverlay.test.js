import { describe, it, expect } from 'vitest'
import { ArtworkOverlay, layersIdentity, layersSignature } from '../ArtworkOverlay.js'

const host = () => document.createElement('div')
const layer = (extra = {}) => ({ asset_id: 1, url: '/a.png', x: 50, y: 58, scale: 1, height: 40, ...extra })

describe('ArtworkOverlay — resize handles', () => {
  const chrome = (el, id = 'art_1') => el.querySelector(`[data-layer-chrome="${id}"]`)

  it('gives a layer eight handles — four corners and four edges — hidden until selected', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    expect(el.querySelectorAll('[data-scale-handle]')).toHaveLength(8)
    expect(chrome(el).style.display).toBe('none')
  })

  // An edge is the obvious thing to grab, and grabbing one used to do nothing at all.
  it('offers an axis cursor on the edges and a diagonal one on the corners', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    const cursors = [...chrome(el).querySelectorAll('[data-scale-handle]')].map(h => h.style.cursor)
    expect(cursors.filter(c => c === 'ns-resize')).toHaveLength(2)
    expect(cursors.filter(c => c === 'ew-resize')).toHaveLength(2)
    expect(cursors.filter(c => c.endsWith('wse-resize') || c.endsWith('esw-resize'))).toHaveLength(4)
  })

  it('shows the handles on select and hides them again on deselect', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    overlay.select('art_1')
    expect(chrome(el).style.display).toBe('block')

    overlay.select(null)
    expect(chrome(el).style.display).toBe('none')
  })

  // A student has nothing to resize, and a stray handle over a map would be a target to grab.
  it('never renders handles in playback', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el, { readonly: true })
    overlay.setLayers([layer()])

    expect(el.querySelectorAll('[data-scale-handle]')).toHaveLength(0)
  })

  // The handles sit inside the layer node, which is also the drag surface — without the guard a
  // press on a corner would move the layer instead of resizing it.
  it('keeps a press on a handle out of the move gesture', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    const node = el.querySelector('[data-layer-id="art_1"]')
    const handle = chrome(el).querySelector('[data-scale-handle]')
    const before = { left: node.style.left, top: node.style.top }

    handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, clientY: 400 }))
    window.dispatchEvent(new PointerEvent('pointerup', {}))

    expect(node.style.left).toBe(before.left)
    expect(node.style.top).toBe(before.top)
  })
})

describe('ArtworkOverlay — blend mode', () => {
  const node = (el, id = 'art_1') => el.querySelector(`[data-layer-id="${id}"]`)

  // The blend must sit on the NODE. On the <img> it did nothing visible: the node carries a
  // transform, which makes it a stacking context, so the img could only ever blend with the
  // node's own empty backdrop. This is the regression that shipped once already.
  it('puts the blend on the layer node, not the image', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer({ blend: 'multiply' })])

    expect(node(el).style.mixBlendMode).toBe('multiply')
    expect(el.querySelector('img').style.mixBlendMode).toBe('')
  })

  it('leaves an unblended layer alone', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer(), layer({ asset_id: 2, blend: 'normal' })])

    expect(node(el).style.mixBlendMode).toBe('')
    expect(node(el, 'art_2').style.mixBlendMode).toBe('')
  })

  // The blend applies to a node's whole rendered subtree, so chrome inside it would be multiplied
  // into the map and become unusable — white handles vanish over dark satellite imagery.
  it('never puts the ring or handles inside the blended node', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer({ blend: 'multiply' })])

    const n = node(el)
    expect(n.style.mixBlendMode).toBe('multiply')
    expect(n.querySelectorAll('[data-scale-handle]')).toHaveLength(0)

    const ch = el.querySelector('[data-layer-chrome="art_1"]')
    expect(ch.parentElement).toBe(el)                 // sibling of the node, not a child
    expect(ch.style.mixBlendMode).toBe('')
    expect(ch.querySelectorAll('[data-scale-handle]')).toHaveLength(8)
  })

  it('blends in playback too, or the editor would be lying about the result', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el, { readonly: true })
    overlay.setLayers([layer({ blend: 'screen' })])

    expect(node(el).style.mixBlendMode).toBe('screen')
  })

  // A z-index on the host makes it a stacking context, which is exactly what stopped the blend
  // reaching the map. The level belongs on the nodes so the host stays transparent to stacking.
  it('stacks the nodes and never the host, so a blend can reach what is behind it', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setStackLevels(6, 8)
    overlay.setLayers([layer({ blend: 'multiply' })])

    expect(el.style.zIndex).toBe('')
    expect(node(el).style.zIndex).toBe('6')

    overlay.setOnTop(true)
    expect(node(el).style.zIndex).toBe('8')
    expect(el.style.zIndex).toBe('')
  })
})

// A layer over a map belongs to a PLACE, not to a pixel. Positions come from the projector on
// every map move, and the place — not the position — is what gets saved.
describe('ArtworkOverlay — pinned to the map', () => {
  const node = (el, id = 'art_1') => el.querySelector(`[data-layer-id="${id}"]`)

  // A stand-in for mapTextProjector: one degree of longitude = one percent of the host.
  const projector = (originLng = 0, originLat = 0) => ({
    project: (lng, lat) => ({ x: (lng - originLng) + 50, y: (lat - originLat) + 50 }),
    unproject: (x, y) => ({ lng: (x - 50) + originLng, lat: (y - 50) + originLat }),
  })

  const pinned = (extra = {}) => layer({ anchor: 'map', lng: 10, lat: -20, x: 0, y: 0, ...extra })

  it('places a pinned layer from its lng/lat, ignoring the stored x/y', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setProjector(projector())
    overlay.setLayers([pinned()])

    expect(node(el).style.left).toBe('60%')
    expect(node(el).style.top).toBe('30%')
  })

  it('falls back to the stored x/y when no map is under it', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([pinned({ x: 12, y: 34 })])

    expect(node(el).style.left).toBe('12%')
    expect(node(el).style.top).toBe('34%')
  })

  it('repositions pinned layers on a map move and leaves screen layers alone', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setProjector(projector())
    overlay.setLayers([pinned(), layer({ asset_id: 2, x: 25, y: 75 })])

    overlay.setProjector(projector(5, 5))   // the camera panned
    overlay.refreshPositions()

    expect(el.querySelector('[data-layer-id="art_1"]').style.left).toBe('55%')
    expect(el.querySelector('[data-layer-id="art_2"]').style.left).toBe('25%')
  })

  it('saves the PLACE a pinned layer was dragged to, not just the position', () => {
    const el = host()
    const saved = []
    const overlay = new ArtworkOverlay(el, { onChange: (id, t) => saved.push({ id, ...t }) })
    overlay.setProjector(projector())
    overlay.setLayers([pinned()])

    const item = overlay._layers[0]
    item.x = 70; item.y = 20               // as a drag would leave it
    overlay._emit(item)

    expect(saved[0]).toMatchObject({ id: 1, anchor: 'map', lng: 20, lat: -30 })
  })

  it('pins a screen layer to what it is sitting over, and releases it again', () => {
    const el = host()
    const saved = []
    const overlay = new ArtworkOverlay(el, { onChange: (id, t) => saved.push(t) })
    overlay.setProjector(projector())
    overlay.setLayers([layer({ x: 65, y: 40 })])

    expect(overlay.togglePin(1)).toBe(true)
    expect(saved.at(-1)).toMatchObject({ anchor: 'map', lng: 15, lat: -10 })

    expect(overlay.togglePin(1)).toBe(false)
    expect(saved.at(-1)).toMatchObject({ anchor: 'screen', lng: null, lat: null })
  })

  it('refuses to pin when there is no map to pin to', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    expect(overlay.canPin()).toBe(false)
    expect(overlay.togglePin(1)).toBe(false)
  })
})


// The Format panel saves on `change` — which for a colour picker means "when the picker closes"
// and for a slider means "on release". These keep the canvas following the drag itself.
describe('ArtworkOverlay — live preview while dragging a control', () => {
  const node = (el, id = 'art_1') => el.querySelector(`[data-layer-id="${id}"]`)

  it('repaints the tint without waiting for the picker to close', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer({ white_key: 0.04, tint: '#ff0000' })])

    overlay.setLayerProp(1, 'tint', '#00ff00')

    // A duotone carries the colour as matrix coefficients, not as a hex literal: pure green is
    // red 0, green 1, blue 0.
    expect(el.querySelector('filter').innerHTML).toContain('0 0 0 0 0 0 1 0 0 0 0 0 0 0 0')
  })

  it('applies a blend change immediately', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    overlay.setLayerProp(1, 'blend', 'multiply')
    expect(node(el).style.mixBlendMode).toBe('multiply')

    overlay.setLayerProp(1, 'blend', 'normal')
    expect(node(el).style.mixBlendMode).toBe('')
  })

  it('moves and resizes live, keeping the chrome on the layer', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    overlay.setLayerProp(1, 'x', 20)
    overlay.setLayerProp(1, 'scale', 2)

    expect(node(el).style.left).toBe('20%')
    expect(node(el).style.height).toBe('80%')   // height 40 × scale 2
  })

  // It previews only. Persisting is the panel's `change` handler, so letting go of a control
  // without committing must not have written anything.
  it('never saves — that is the change handler is job', () => {
    const el = host()
    const saved = []
    const overlay = new ArtworkOverlay(el, { onChange: (id, t) => saved.push([id, t]) })
    overlay.setLayers([layer()])

    overlay.setLayerProp(1, 'x', 20)

    expect(saved).toHaveLength(0)
  })

  it('ignores a layer that is not on the scene', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    expect(() => overlay.setLayerProp(999, 'tint', '#000000')).not.toThrow()
  })
})

describe('ArtworkOverlay — measuring a layer for the Dimensions row', () => {
  /**
   * jsdom reports 0 for every offset/client dimension, so the boxes are stubbed. That is the whole
   * point of the test: what matters is which boxes the ratio is built from, not what a real browser
   * would return.
   */
  const stub = (el, { width, height }) => {
    Object.defineProperty(el, 'offsetWidth', { value: width, configurable: true })
    Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true })
  }
  const stubHost = (el, { width, height }) => {
    Object.defineProperty(el, 'clientWidth', { value: width, configurable: true })
    Object.defineProperty(el, 'clientHeight', { value: height, configurable: true })
  }

  it('reports the box as a width-% to height-% ratio, not as two percentages', () => {
    // Arrange — a 16:9 stage with a square layer on it. A square is 22.5% as wide as the stage
    // when it is 40% as tall, so the ratio the row wants is 0.5625, not 1.
    const el = host()
    stubHost(el, { width: 1600, height: 900 })
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])
    stub(el.querySelector('[data-layer-id="art_1"]'), { width: 360, height: 360 })

    // Act
    const box = overlay.measure(1)

    // Assert
    expect(box.ratio).toBeCloseTo(0.5625, 6)
  })

  /**
   * THE BUG THIS REPLACED. The row multiplies the ratio by the layer's STORED height, so the ratio
   * must not depend on which box the node's percentage height resolved against. A node rendered
   * twice as tall as its stored height (its offset parent being half the host) has to yield the
   * same shape, or the lock captures a proportion the layer never had — measured live as a layer
   * stored at height 40 that reported 71.8, whose lock then took a halved width to 35.9 and not 20.
   */
  it('gives the same shape however tall the node happens to render', () => {
    const el = host()
    stubHost(el, { width: 1600, height: 900 })
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])
    const node = el.querySelector('[data-layer-id="art_1"]')

    stub(node, { width: 360, height: 360 })
    const small = overlay.measure(1).ratio

    stub(node, { width: 720, height: 720 })
    const large = overlay.measure(1).ratio

    expect(large).toBeCloseTo(small, 9)
  })

  it('reports nothing while the image has not decoded', () => {
    const el = host()
    stubHost(el, { width: 1600, height: 900 })
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])
    stub(el.querySelector('[data-layer-id="art_1"]'), { width: 0, height: 0 })

    expect(overlay.measure(1)).toBeNull()
  })
})

describe('keeping the canvas steady while a teacher edits', () => {
  /**
   * THE FLICKER. Every saved edit changed the layers' signature, and the callers answered a
   * signature change by tearing every node down (setLayers) and replaying the entrance animations.
   * Nudging one slider re-flew the whole scene in. Reported as "every change, either changing
   * position of layer or anything else, it flickers or distorts".
   */
  it('does not count a value change as a change of WHICH layers are present', () => {
    const before = [layer()]
    const after = [layer({ x: 20, rotation: 45 })]

    expect(layersSignature(after)).not.toBe(layersSignature(before))   // something did change…
    expect(layersIdentity(after)).toBe(layersIdentity(before))         // …but not the cast
  })

  it('treats a new layer, a removed one and a swapped image as a change of cast', () => {
    const one = [layer()]
    expect(layersIdentity([layer(), layer({ asset_id: 2 })])).not.toBe(layersIdentity(one))
    expect(layersIdentity([])).not.toBe(layersIdentity(one))
    expect(layersIdentity([layer({ url: '/b.png' })])).not.toBe(layersIdentity(one))
  })

  it('applies moved values to the live nodes instead of rebuilding them', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])
    const node = el.querySelector('[data-layer-id="art_1"]')

    const handled = overlay.syncProps([layer({ x: 20, rotation: 45, opacity: 0.5 })])

    expect(handled).toBe(true)
    expect(el.querySelector('[data-layer-id="art_1"]')).toBe(node)   // the SAME node, not a new one
    expect(node.style.left).toBe('20%')
    expect(node.style.transform).toContain('rotate(45deg)')
  })

  /**
   * A property setLayerProp cannot paint has to force the long way round. Applying it here would
   * update the held item and nothing on screen, which reads exactly like a save that did not take.
   */
  it('refuses the fast path for a property it cannot paint', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    expect(overlay.syncProps([layer({ depth: 2 })])).toBe(false)
    expect(overlay.syncProps([layer({ anim: 'zoom' })])).toBe(false)
  })

  it('refuses the fast path for a layer it does not hold', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    expect(overlay.syncProps([layer({ asset_id: 99 })])).toBe(false)
  })

  /**
   * Metadata the node never renders must not drag the whole scene into a rebuild. `path` and
   * `title` ride along on the server payload and the normalised item does not hold them at all.
   */
  it('ignores payload metadata the node does not render', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer()])

    expect(overlay.syncProps([layer({ path: 'lessons/1/a.png', title: 'Hannibal' })])).toBe(true)
  })

  /**
   * A width the payload still carries must survive a sync. The server sends `width` on every
   * layer, so this is the ordinary case — an edit to something else must not disturb the box.
   */
  it('leaves a width alone when the payload still carries it', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer({ width: 30 })])
    const node = el.querySelector('[data-layer-id="art_1"]')

    overlay.syncProps([layer({ width: 30, opacity: 0.5 })])

    expect(node.style.width).toBe('30%')
  })

  /**
   * `width: null` is not an absence, it is the server saying "this layer has no width of its own"
   * — which is what a teacher re-engaging the aspect lock produces. The node has to go back to
   * taking its width from the image's aspect rather than keeping the last explicit one.
   */
  it('returns a layer to its own aspect when the payload clears the width', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([layer({ width: 30 })])
    const node = el.querySelector('[data-layer-id="art_1"]')

    overlay.syncProps([layer({ width: null })])

    expect(node.style.width).not.toBe('30%')
  })
})

describe('syncProps against the payload the server actually sends', () => {
  /**
   * THE FIXTURE TRAP. Every test above hands syncProps a layer already in the overlay's own
   * normalised shape, and they all passed while the fast path was firing for nobody: the real
   * `scene:load` payload sends `anchor: null` where the item holds `'screen'`, `anim: null` where
   * it holds `'none'`, `blend: null` where it holds `'normal'`, and so on. The diff found an
   * unsyncable "change" on every load and fell straight back to a rebuild.
   *
   * This fixture is shaped like Step3SceneConfigurator::serializeShots, nulls and all.
   */
  const serverLayer = (extra = {}) => ({
    url: '/a.png?v=1699999999',
    asset_id: 1,
    title: 'Hannibal',
    x: 50, y: 58, depth: 1, kind: 'figure', scale: 1, height: 40, width: null,
    sway: false, blur: null, opacity: null, blend: null,
    anchor: null, lng: null, lat: null,
    anim: null, anim_delay: null, anim_ease: null, wobble: null,
    white_key: null, tint_opacity: null, rotation: null,
    anim_duration: null, anim_out: null, anim_out_delay: null,
    anim_out_ease: null, anim_out_duration: null,
    grayscale: false, tint: null, z: null, flip_x: false, flip_y: false,
    ink_preset: null, ink_fill: null, draw_time: null, embed: null,
    ...extra,
  })

  it('takes the in-place path for a real payload whose values moved', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([serverLayer()])
    const node = el.querySelector('[data-layer-id="art_1"]')

    const handled = overlay.syncProps([serverLayer({ scale: 2.4 })])

    expect(handled).toBe(true)
    expect(el.querySelector('[data-layer-id="art_1"]')).toBe(node)   // never torn down
    expect(node.style.height).toBe('96%')                            // 40 × 2.4
  })

  it('takes the in-place path even when nothing moved at all', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([serverLayer()])

    expect(overlay.syncProps([serverLayer()])).toBe(true)
  })

  it('still rebuilds when a real payload changes something it cannot paint', () => {
    const el = host()
    const overlay = new ArtworkOverlay(el)
    overlay.setLayers([serverLayer()])

    expect(overlay.syncProps([serverLayer({ depth: 2 })])).toBe(false)
  })
})
