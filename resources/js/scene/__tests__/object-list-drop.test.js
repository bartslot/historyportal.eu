import { describe, expect, it } from 'vitest'
import { resolveDrop } from '../object-list-drop.js'

// The object list shows one stack; the stage draws two bands (text objects, figures) that only
// swap as a whole. These are the drops Bart made on 2026-10-22 that "can't change the order".
const KINDS = { bal_0: null, txt_title: 'text', rect_r: 'text', art_1: 'art', art_2: 'art' }
const kindOf = (id) => KINDS[id] ?? null

describe('resolveDrop', () => {
  it('brings the figures in front when one figure is dragged above the title, with another figure left below', () => {
    const drop = resolveDrop({ ids: ['bal_0', 'art_1', 'txt_title', 'rect_r', 'art_2'], kindOf, movedId: 'art_1', artOnTop: false })
    expect(drop.artOnTop).toBe(true)
    expect(drop.artIds).toEqual(['art_1', 'art_2'])
    expect(drop.textIds).toEqual(['txt_title', 'rect_r'])
  })

  it('sends the figures back when a text is dragged above them', () => {
    const drop = resolveDrop({ ids: ['rect_r', 'art_1', 'art_2', 'txt_title'], kindOf, movedId: 'rect_r', artOnTop: true })
    expect(drop.artOnTop).toBe(false)
  })

  it('brings the figures in front when a text is dragged below a figure', () => {
    const drop = resolveDrop({ ids: ['txt_title', 'art_1', 'rect_r', 'art_2'], kindOf, movedId: 'rect_r', artOnTop: false })
    expect(drop.artOnTop).toBe(true)
  })

  it('keeps the bands when a figure is reordered among the figures only', () => {
    const drop = resolveDrop({ ids: ['txt_title', 'rect_r', 'art_2', 'art_1'], kindOf, movedId: 'art_2', artOnTop: false })
    expect(drop).toEqual({ textIds: ['txt_title', 'rect_r'], artIds: ['art_2', 'art_1'], artOnTop: false, blocked: false })
  })

  it('never counts a balloon as a text object, whatever its id', () => {
    const drop = resolveDrop({ ids: ['line_a', 'txt_title', 'art_1'], kindOf: (id) => (id === 'line_a' ? null : kindOf(id)), movedId: 'art_1', artOnTop: false })
    expect(drop.textIds).toEqual(['txt_title'])
  })

  it('on a split scene keeps the figures under the text and says the drop was blocked', () => {
    const drop = resolveDrop({ ids: ['art_1', 'txt_title', 'rect_r', 'art_2'], kindOf, movedId: 'art_1', artOnTop: false, canSwap: false })
    expect(drop.artOnTop).toBe(false)
    expect(drop.blocked).toBe(true)
    expect(drop.artIds).toEqual(['art_1', 'art_2'])
  })

  it('on a split scene a reorder among the figures is not blocked', () => {
    const drop = resolveDrop({ ids: ['txt_title', 'rect_r', 'art_2', 'art_1'], kindOf, movedId: 'art_2', artOnTop: true, canSwap: false })
    expect(drop.artOnTop).toBe(false)
    expect(drop.blocked).toBe(false)
  })
})
