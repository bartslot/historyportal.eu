import { describe, it, expect, vi, beforeAll } from 'vitest'
import {
  GRID_KINDS, SRC_STEPS, clampThumb, readThumb, writeThumb, columnWidth, srcStep,
  resizedUrl, srcsetFor, zoomOrigin, initImageZoom, LONG_PRESS_MS,
} from '../ui/image-grid.js'

const memoryStorage = () => {
  const data = {}
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v } }
}

describe('size per kind', () => {
  it('icons stay smaller than images, at both ends of the slider', () => {
    expect(GRID_KINDS.icon.max).toBeLessThan(GRID_KINDS.image.max)
    expect(GRID_KINDS.icon.initial).toBeLessThan(GRID_KINDS.image.initial)
    expect(GRID_KINDS.image).toMatchObject({ min: 96, max: 360 })
    expect(GRID_KINDS.icon).toMatchObject({ min: 48, max: 160 })
  })

  it('clamps into the kind\'s range and falls back to the opening size on junk', () => {
    expect(clampThumb('image', 9999)).toBe(360)
    expect(clampThumb('image', 10)).toBe(96)
    expect(clampThumb('icon', 300)).toBe(160)
    expect(clampThumb('icon', '100.4')).toBe(100)
    expect(clampThumb('image', null)).toBe(GRID_KINDS.image.initial)
    expect(clampThumb('image', 'abc')).toBe(GRID_KINDS.image.initial)
    expect(clampThumb('nonsense', 200)).toBe(200)
  })

  it('remembers the size per grid, and survives storage that throws', () => {
    const s = memoryStorage()
    writeThumb('picker', 280, s)
    expect(readThumb('picker', 'image', s)).toBe(280)
    expect(readThumb('assets', 'icon', s)).toBe(GRID_KINDS.icon.initial)
    // An icon grid never opens at an image size, whatever was stored under its id.
    writeThumb('assets', 280, s)
    expect(readThumb('assets', 'icon', s)).toBe(160)

    // A grid may open smaller than its kind (a strip in a narrow panel), still inside the range.
    expect(readThumb('reuse', 'image', s, 112)).toBe(112)
    expect(readThumb('reuse', 'image', s, 20)).toBe(96)

    const broken = { getItem () { throw new Error('denied') }, setItem () { throw new Error('denied') } }
    expect(readThumb('picker', 'image', broken)).toBe(GRID_KINDS.image.initial)
    expect(() => writeThumb('picker', 200, broken)).not.toThrow()
  })
})

describe('column width', () => {
  it('fits as many columns as the row holds, then shares out the rest', () => {
    // 600 wide, 200 thumbs, 10 gap: 2 columns (3 would need 620), each 295.
    expect(columnWidth(600, 200, 10)).toBe(295)
    // Narrower than one thumb: one column, the whole row.
    expect(columnWidth(150, 200, 10)).toBe(150)
    // Not measured yet: the thumb itself.
    expect(columnWidth(0, 200, 10)).toBe(200)
  })
})

describe('requested widths', () => {
  it('rounds up to a few fixed steps, times the pixel ratio', () => {
    expect(srcStep(100, 1)).toBe(120)
    expect(srcStep(200, 2)).toBe(500)
    expect(srcStep(240, 1)).toBe(250)
    expect(srcStep(5000, 2)).toBe(SRC_STEPS.at(-1))
  })

  it('rewrites Cloudinary, Wikimedia thumbs and ?width=, and leaves the rest alone', () => {
    expect(resizedUrl('https://res.cloudinary.com/hp/image/upload/c_fill,w_400,h_250,f_auto,q_auto/v12/lessons/a.jpg', 500))
      .toBe('https://res.cloudinary.com/hp/image/upload/c_limit,w_500,f_auto,q_auto/v12/lessons/a.jpg')
    expect(resizedUrl('https://res.cloudinary.com/hp/image/upload/v12/a.jpg', 250))
      .toBe('https://res.cloudinary.com/hp/image/upload/c_limit,w_250,f_auto,q_auto/v12/a.jpg')
    // Line art must not be rasterised.
    expect(resizedUrl('https://res.cloudinary.com/hp/image/upload/v1/icons/arrow.svg', 250)).toBeNull()
    expect(resizedUrl('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Nachtwacht.jpg/400px-Nachtwacht.jpg', 960))
      .toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Nachtwacht.jpg/960px-Nachtwacht.jpg')
    expect(resizedUrl('https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg?width=400', 330))
      .toBe('https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg?width=330')
    expect(resizedUrl('/storage/lessons/1/bg.webp', 500)).toBeNull()
    expect(srcsetFor('/storage/lessons/1/bg.webp')).toBe('')
    expect(srcsetFor('https://res.cloudinary.com/hp/image/upload/v1/a.jpg').split(', ')).toHaveLength(SRC_STEPS.length)
  })
})

describe('zoom origin', () => {
  const rect = { left: 100, top: 50, width: 200, height: 100 }

  it('follows the pointer inside the tile, in percent', () => {
    expect(zoomOrigin(rect, 100, 50)).toEqual({ x: 0, y: 0 })
    expect(zoomOrigin(rect, 200, 100)).toEqual({ x: 50, y: 50 })
    expect(zoomOrigin(rect, 250, 125)).toEqual({ x: 75, y: 75 })
  })

  it('clamps to the tile and centres a tile with no size', () => {
    expect(zoomOrigin(rect, 900, -40)).toEqual({ x: 100, y: 0 })
    expect(zoomOrigin({ left: 0, top: 0, width: 0, height: 0 }, 10, 10)).toEqual({ x: 50, y: 50 })
  })
})

describe('delegated zoom + long press', () => {
  beforeAll(() => {
    window.matchMedia = () => ({ matches: true })
    initImageZoom(document)
  })

  const tile = () => {
    document.body.innerHTML = '<button data-zoom aria-label="Nachtwacht"><img src="/a.jpg" srcset="/a.jpg 250w" sizes="200px"></button>'
    const el = document.querySelector('[data-zoom]')
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 })
    return el
  }
  const fire = (target, type, extra = {}) => {
    const e = new Event(type, { bubbles: true, cancelable: true })
    Object.assign(e, { clientX: 0, clientY: 0, pointerType: 'mouse', ...extra })
    target.dispatchEvent(e)
    return e
  }

  it('a mouse over an image tile zooms at the pointer, asks for a sharper file, and leaving resets it', () => {
    const el = tile()
    fire(el.querySelector('img'), 'pointermove', { clientX: 150, clientY: 25 })
    expect(el.dataset.zoomed).toBe('')
    expect(el.style.getPropertyValue('--zoom-x')).toBe('75%')
    expect(el.style.getPropertyValue('--zoom-y')).toBe('25%')
    expect(el.querySelector('img').sizes).toBe('400px')
    fire(el, 'pointerout', { relatedTarget: document.body })
    expect(el.dataset.zoomed).toBeUndefined()
  })

  it('a long touch opens the lightbox and the tap that ends it is not a pick', () => {
    vi.useFakeTimers()
    const el = tile()
    const opened = vi.fn()
    let picked = false
    window.addEventListener('image-lightbox', opened)
    el.addEventListener('click', () => { picked = true })
    fire(el, 'pointerdown', { pointerType: 'touch' })
    vi.advanceTimersByTime(LONG_PRESS_MS + 10)
    fire(el, 'pointerup', { pointerType: 'touch' })
    el.click()
    expect(opened).toHaveBeenCalledOnce()
    expect(opened.mock.calls[0][0].detail.caption).toBe('Nachtwacht')
    expect(picked).toBe(false)
    // The click of a long press often lands on the lightbox that just opened under the finger:
    // it must not reach that backdrop either, or the lightbox closes at once.
    const backdrop = document.createElement('div')
    let closed = false
    backdrop.addEventListener('click', () => { closed = true })
    document.body.append(backdrop)
    fire(el, 'pointerdown', { pointerType: 'touch' })
    vi.advanceTimersByTime(LONG_PRESS_MS + 10)
    fire(el, 'pointerup', { pointerType: 'touch' })
    backdrop.click()
    expect(closed).toBe(false)
    // A short tap still picks.
    fire(el, 'pointerdown', { pointerType: 'touch' })
    fire(el, 'pointerup', { pointerType: 'touch' })
    el.click()
    expect(picked).toBe(true)
    vi.useRealTimers()
  })
})
