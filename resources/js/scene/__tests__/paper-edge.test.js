import { describe, it, expect } from 'vitest'
import { applyPaperEdge, hasPaperEdge } from '../paper-edge.js'

describe('hasPaperEdge', () => {
  it('is on by default for a scene with a picture', () => {
    expect(hasPaperEdge({}, true)).toBe(true)
    expect(hasPaperEdge(null, true)).toBe(true)
  })

  it('is off when the scene chose a straight edge, or has no picture', () => {
    expect(hasPaperEdge({ paper_edge: false }, true)).toBe(false)
    expect(hasPaperEdge({}, false)).toBe(false)
  })
})

describe('applyPaperEdge', () => {
  const stage = () => {
    const parent = document.createElement('div')
    const host = document.createElement('div')
    host.style.position = 'absolute'
    host.style.zIndex = '1'
    parent.appendChild(host)
    document.body.appendChild(parent)
    return { parent, host }
  }

  it('masks the host and lays one paper sheet under it at its z-index', () => {
    const { parent, host } = stage()
    applyPaperEdge(host, true)
    applyPaperEdge(host, true)
    const sheets = parent.querySelectorAll('[data-paper-sheet]')
    expect(host.classList.contains('paper-edge')).toBe(true)
    expect(sheets).toHaveLength(1)
    expect(sheets[0].nextElementSibling).toBe(host)
    expect(sheets[0].style.zIndex).toBe('1')
  })

  it('takes the edge off and hides the sheet', () => {
    const { parent, host } = stage()
    applyPaperEdge(host, true)
    applyPaperEdge(host, false)
    expect(host.classList.contains('paper-edge')).toBe(false)
    expect(parent.querySelector('[data-paper-sheet]').style.display).toBe('none')
  })

  it('adds nothing when it was never on', () => {
    const { parent, host } = stage()
    applyPaperEdge(host, false)
    expect(parent.querySelector('[data-paper-sheet]')).toBeNull()
  })
})

describe('layerEdge', () => {
  it('follows the choice, else paints a whole picture and leaves a cut-out straight', async () => {
    const { layerEdge } = await import('../ArtworkOverlay.js')
    expect(layerEdge({ kind: 'figure', edge: 'painted' })).toBe('painted')
    expect(layerEdge({ kind: 'cover', edge: 'straight' })).toBe('straight')
    expect(layerEdge({ kind: 'cover' })).toBe('painted')
    expect(layerEdge({ kind: 'figure' })).toBe('straight')
    expect(layerEdge({ kind: 'figure', edge: 'bogus' })).toBe('straight')
  })
})

describe('paperLook', () => {
  it('reads a hex colour and a known shape, else the paper and the book mask', async () => {
    const { paperLook } = await import('../paper-edge.js')
    expect(paperLook({ paper_color: '#1f2a44', paper_mask: 'blot-011' }))
      .toEqual({ color: '#1f2a44', mask: "url('/images/paper/edge-mask-blot-011.webp')" })
    expect(paperLook({ paper_color: 'red', paper_mask: 'book' })).toEqual({ color: null, mask: null })
    expect(paperLook(null)).toEqual({ color: null, mask: null })
  })

  it('paints the sheet in the scene colour', async () => {
    const { applyPaperEdge } = await import('../paper-edge.js')
    const parent = document.createElement('div'); const host = document.createElement('div')
    parent.appendChild(host); document.body.appendChild(parent)
    applyPaperEdge(host, true, { color: '#112233' })
    expect(parent.querySelector('[data-paper-sheet]').style.background).toContain('rgb(17, 34, 51)')
    expect(host.style.getPropertyValue('--paper-edge-bg')).toBe('#112233')
  })
})
