import { describe, it, expect } from 'vitest'
import { normalizePanel, panelBox, dominantColors, drawPanel } from '../backing-panel.js'
import { TextOverlayLayer } from '../TextOverlayLayer.js'

describe('backing panel', () => {
  it('reads an older panel as it was: the left half, frosted, no picture or edge', () => {
    const p = normalizePanel({ side: 'left', color: '#0f172a', opacity: 0.5 })
    expect(p).toMatchObject({ side: 'left', size: 50, blur: 10, image: null, wash: null })
  })

  it('sits full screen, as a half or along the top and bottom, at its size', () => {
    expect(panelBox(normalizePanel({ side: 'full' }))).toBe('inset:0;')
    expect(panelBox(normalizePanel({ side: 'right', size: 30 }))).toContain('right:0;width:30%')
    expect(panelBox(normalizePanel({ side: 'top', size: 99 }))).toContain('top:0;height:80%')
    expect(panelBox(normalizePanel({ side: 'bottom' }))).toContain('bottom:0;height:50%')
    expect(normalizePanel({ side: 'diagonal' }).side).toBe('left')
  })

  it('crops a picture and masks the fill, never the node that carries the selection ring', () => {
    const node = drawPanel(document.createElement('div'), { side: 'full', image: '/storage/a.webp', focus: { x: 20, y: 30, zoom: 2 }, wash: 'blot-005', opacity: 0.8 })
    const fill = node.querySelector('[data-panel-fill]')
    expect(fill.style.getPropertyValue('mask')).toContain('edge-mask-blot-005.webp')
    expect(node.style.getPropertyValue('mask')).toBe('')
    const img = fill.querySelector('img')
    expect(img.getAttribute('src')).toBe('/storage/a.webp')
    expect(img.style.transform).toBe('scale(2)')
    expect(img.style.objectPosition).toBe('20% 30%')
  })

  it('draws the book edge from its own file, and no edge when there is none', () => {
    const book = drawPanel(document.createElement('div'), { wash: 'book' }).querySelector('[data-panel-fill]')
    expect(book.style.getPropertyValue('mask')).toContain('/images/paper/edge-mask.webp')
    const plain = drawPanel(document.createElement('div'), {}).querySelector('[data-panel-fill]')
    expect(plain.style.getPropertyValue('mask')).toBe('')
  })

  it('finds a picture\'s main colours, leaving out paper white and ink black', () => {
    const px = (r, g, b, n) => Array.from({ length: n }, () => [r, g, b, 255]).flat()
    const data = [...px(250, 250, 250, 50), ...px(200, 150, 40, 30), ...px(10, 10, 10, 20), ...px(40, 90, 160, 10), ...px(202, 151, 42, 5)]
    const colours = dominantColors(data, 4)
    expect(colours[0]).toBe('#c89628')
    expect(colours).toContain('#285aa0')
    expect(colours).toHaveLength(2)
  })

  it('a server patch with nulls puts a field back to its default', () => {
    const host = document.createElement('div')
    const layer = new TextOverlayLayer(host, { editable: true })
    layer.setTexts([{ id: 'rect_a', kind: 'rect', side: 'top', wash: 'book', image: '/storage/a.webp' }])
    layer.patch('rect_a', { side: 'full', wash: null, image: null })
    const node = host.querySelector('[data-text-id="rect_a"]')
    expect(node.style.inset).toBe('0px')
    expect(node.querySelector('img')).toBeNull()
    expect(node.querySelector('[data-panel-fill]').style.getPropertyValue('mask')).toBe('')
  })
})
