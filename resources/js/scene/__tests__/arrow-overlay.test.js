import { describe, it, expect, vi } from 'vitest'
import { ArtworkOverlay } from '../ArtworkOverlay.js'

/**
 * The arrow on the stage: drawn by the same overlay the editor and the player use, redrawn in
 * place as its values move, and saved once per gesture.
 */

const arrow = { asset_id: 7, kind: 'arrow', x: 20, y: 50, end_x: 80, end_y: 50, bend: 0, shaft: 2, head: 6, arrow_style: 'stroke', title: 'Arrow' }

const mount = ({ readonly = false } = {}) => {
  const host = document.createElement('div')
  // A square stage: one stage unit is then one % of the width and of the height.
  Object.defineProperty(host, 'clientWidth', { value: 1000 })
  Object.defineProperty(host, 'clientHeight', { value: 1000 })
  host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 1000 })
  document.body.appendChild(host)
  const onChange = vi.fn()
  const overlay = new ArtworkOverlay(host, { readonly, onChange })
  return { host, overlay, onChange }
}

const nodeOf = (host) => host.querySelector('[data-layer-id="art_7"]')
const shaftOf = (host) => nodeOf(host).querySelectorAll('path')[1]

describe('an arrow layer on the stage', () => {
  it('is drawn as vector paths in its own node, with no picture', () => {
    const { host, overlay } = mount()
    overlay.setLayers([arrow])
    expect(nodeOf(host)).not.toBeNull()
    expect(nodeOf(host).querySelector('img')).toBeNull()
    expect(shaftOf(host).getAttribute('d')).toBe('M 20 50 Q 50 50 80 50')
  })

  it('redraws in place when a value moves mid-drag, keeping the same node', () => {
    const { host, overlay } = mount()
    overlay.setLayers([arrow])
    const before = nodeOf(host)
    overlay.setLayerProp(7, 'end_x', 90)
    expect(nodeOf(host)).toBe(before)
    expect(shaftOf(host).getAttribute('d')).toBe('M 20 50 Q 55 50 90 50')
  })

  it('applies a saved change in place, and rebuilds only when the style changes', () => {
    const { overlay } = mount()
    overlay.setLayers([arrow])
    expect(overlay.syncProps([{ ...arrow, end_y: 70 }])).toBe(true)
    expect(overlay.syncProps([{ ...arrow, arrow_style: 'block' }])).toBe(false)
  })

  it('turns its head into a solid triangle for a block arrow', () => {
    const { host, overlay } = mount()
    overlay.setLayers([{ ...arrow, arrow_style: 'block' }])
    const tip = nodeOf(host).querySelectorAll('path')[2]
    expect(tip.getAttribute('d').endsWith('Z')).toBe(true)
    expect(tip.getAttribute('fill')).toBe('#000')
  })

  it('is never moved by the centring translate that places a picture', () => {
    const { overlay } = mount()
    overlay.setLayers([arrow])
    // Parallax, the camera and a drag all write this value onto the node.
    expect(overlay._transform(overlay._layers[0], 12, -4)).toBe('none')
  })

  it('stays on the stage even when a stored pin would place it on a map', () => {
    const { overlay } = mount()
    overlay.setLayers([{ ...arrow, anchor: 'map', lng: 12, lat: 45 }])
    expect(overlay._layers[0].anchor).toBe('screen')
  })

  it('does not take pointer events in playback', () => {
    const { host, overlay } = mount({ readonly: true })
    overlay.setLayers([arrow])
    expect(nodeOf(host).querySelector('path[pointer-events="none"]')).not.toBeNull()
    expect(host.querySelector('[data-layer-chrome="art_7"]')).toBeNull()
  })
})

describe('dragging an arrow handle', () => {
  const dragHandle = (host, name, clientX, clientY) => {
    const handle = host.querySelector(`[data-arrow-handle="${name}"]`)
    handle.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true }))
    window.dispatchEvent(new MouseEvent('pointermove', { clientX, clientY }))
    window.dispatchEvent(new MouseEvent('pointerup', { clientX, clientY }))
  }

  it('moves the end dot live and saves the arrow once on release', () => {
    const { host, overlay, onChange } = mount()
    overlay.setLayers([arrow])
    // 70% of 1000 px is 700 px: the end moves to x 70.
    dragHandle(host, 'end', 700, 500)
    expect(shaftOf(host).getAttribute('d')).toBe('M 20 50 Q 45 50 70 50')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0]).toBe(7)
    expect(onChange.mock.calls[0][1]).toMatchObject({ end_x: 70, end_y: 50, x: 20, y: 50 })
  })

  it('bends the arrow through the point the hand reaches', () => {
    const { host, overlay, onChange } = mount()
    overlay.setLayers([arrow])
    // The middle of the chord is x 50% (500 px); y 60% (600 px) is 10 units below it: sag 10.
    dragHandle(host, 'bend', 500, 600)
    expect(onChange.mock.calls[0][1].bend).toBeCloseTo(0.1667, 3)
  })

  it('does not save when a handle is pressed and let go without moving', () => {
    const { host, overlay, onChange } = mount()
    overlay.setLayers([arrow])
    dragHandle(host, 'head', 0, 0)
    expect(onChange).not.toHaveBeenCalled()
  })
})
