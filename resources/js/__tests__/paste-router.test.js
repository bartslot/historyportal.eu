import { describe, it, expect } from 'vitest'
import { routePaste, imageFileFrom, OBJECTS_MARK } from '../ui/paste-router.js'

/** clipboardData as a paste event hands it over, with only what the router reads. */
const clip = ({ files = [], types = [] } = {}) => ({
  items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
  files,
  types: [...types, ...(files.length ? ['Files'] : [])],
})
const png = new File([new Uint8Array([137, 80, 78, 71])], 'image.png', { type: 'image/png' })

describe('routePaste', () => {
  it('uploads an image into the picker when it is open', () => {
    expect(routePaste(clip({ files: [png] }), { dialogOpen: true })).toEqual({ action: 'dialog', file: png })
  })

  it('adds an image as a layer when no picker is open', () => {
    expect(routePaste(clip({ files: [png] }))).toEqual({ action: 'layer', file: png })
  })

  it('an image beats an older object copy', () => {
    expect(routePaste(clip({ files: [png] }), { hasObjects: true }).action).toBe('layer')
  })

  it('our own object copy beats an image left on the clipboard', () => {
    expect(routePaste(clip({ files: [png], types: [OBJECTS_MARK] }), { hasObjects: true }).action).toBe('objects')
  })

  it('no image falls through to the object paste', () => {
    expect(routePaste(clip({ types: ['text/plain'] }), { hasObjects: true }).action).toBe('objects')
  })

  it('no image and nothing copied leaves the paste alone', () => {
    expect(routePaste(clip({ types: ['text/plain'] })).action).toBe('none')
  })

  it('never takes a paste inside a text field, image or not', () => {
    expect(routePaste(clip({ files: [png] }), { typing: true, hasObjects: true }).action).toBe('ignore')
  })
})

describe('imageFileFrom', () => {
  it('prefers a PNG over a TIFF beside it', () => {
    const tiff = new File([], 'x.tiff', { type: 'image/tiff' })
    expect(imageFileFrom(clip({ files: [tiff, png] }))).toBe(png)
  })

  it('hands a wrong type on so the server can say why', () => {
    const tiff = new File([], 'x.tiff', { type: 'image/tiff' })
    expect(imageFileFrom(clip({ files: [tiff] }))).toBe(tiff)
  })

  it('ignores a non-image file', () => {
    expect(imageFileFrom(clip({ files: [new File([], 'a.pdf', { type: 'application/pdf' })] }))).toBeNull()
  })
})
