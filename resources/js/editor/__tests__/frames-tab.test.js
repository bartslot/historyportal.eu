import { describe, it, expect, vi, beforeEach } from 'vitest'
import { moved, duplicated, removed, inserted, playOf, cellStyle, mountFrames, MAX_FRAMES } from '../frames-tab.js'

const fire = { cols: 4, rows: 2, frames: 8, fps: 12, w: 100, h: 200, loop: true, play: null }
const ALL = [0, 1, 2, 3, 4, 5, 6, 7]

describe('the list of frames', () => {
  it('moves one frame, anywhere', () => {
    expect(moved([0, 1, 2, 3], 0, 2)).toEqual([1, 2, 0, 3])
    expect(moved([0, 1, 2, 3], 3, 0)).toEqual([3, 0, 1, 2])
  })

  it('repeats a run right after itself, and stops at the most a layer may hold', () => {
    expect(duplicated([0, 1, 2, 3], 1, 2)).toEqual([0, 1, 2, 1, 2, 3])
    expect(duplicated([0, 1], 1, 0)).toEqual([0, 1, 0, 1])
    expect(duplicated(Array(MAX_FRAMES).fill(1), 0, 3)).toHaveLength(MAX_FRAMES)
  })

  it('leaves frames out, never the last one', () => {
    expect(removed([0, 1, 2, 3], 1, 2)).toEqual([0, 3])
    expect(removed([5, 6], 0, 1)).toEqual([5, 6])
  })

  it('adds a cell of the sheet after a place', () => {
    expect(inserted([0, 1], 0, 7)).toEqual([0, 7, 1])
  })
})

describe('what the layer saves', () => {
  it('nothing about frames when they are simply all of them in order', () => {
    expect(playOf({ frames: ALL, speed: 1, loop: true }, fire)).toEqual({ speed: 1 })
  })

  it('its own list and loop when they differ, and its start stays', () => {
    expect(playOf({ frames: [3, 3], speed: 0.5, loop: false }, { ...fire, play: { offset: 2 } })).toEqual({ speed: 0.5, offset: 2, frames: [3, 3], loop: false })
  })

  it('a tile shows its own cell of the sheet', () => {
    expect(cellStyle(fire, 5, '/s.webp')).toContain('background-position:33.33')
    expect(cellStyle(fire, 5, '/s.webp')).toContain('100%;')
    expect(cellStyle(fire, 5, '/s.webp')).toContain('background-size:400% 200%')
  })
})

describe('the tab', () => {
  let stage, parts, tab, onChange, saveLayer
  const t = (en) => en
  const tiles = () => [...parts.strip.querySelectorAll('[data-frame]')]
  const press = (key, extra = {}) => tab.key({ key, code: key === ' ' ? 'Space' : key, target: document.body, ...extra })
  const lastLive = () => stage.setLayerProp.mock.lastCall[2]

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    document.body.innerHTML = '<div id="v"></div><div id="s"></div><div id="p"></div>'
    parts = { view: document.getElementById('v'), strip: document.getElementById('s'), panel: document.getElementById('p') }
    stage = { setLayerProp: vi.fn(), commitLayerProp: vi.fn() }
    onChange = vi.fn()
    saveLayer = vi.fn()
    tab = mountFrames({ ...parts, t, sheet: '/s.webp', frames: fire, stage, stageId: 'layer-2', onChange, saveLayer })
  })

  it('opens with every frame, nothing to lose, nothing on the stage changed', () => {
    expect(tiles()).toHaveLength(8)
    expect(tab.dirty()).toBe(false)
    expect(tab.canUndo()).toBe(false)
    expect(stage.setLayerProp).not.toHaveBeenCalled()
    tab.discard()
    expect(stage.setLayerProp).not.toHaveBeenCalled()
  })

  it('opens with the layer\'s own list when it has one', () => {
    const own = mountFrames({ ...parts, t, sheet: '/s.webp', frames: { ...fire, play: { frames: [2, 2, 5], speed: 2, loop: false } }, stage, stageId: 'layer-2' })
    expect(tiles()).toHaveLength(3)
    expect(parts.panel.querySelector('[data-cut-fr-speed]').value).toBe('200')
    expect(parts.panel.querySelector('[data-fr-loop]').checked).toBe(false)
    expect(own.dirty()).toBe(false)
  })

  it('duplicate shows on the stage at once, and undo takes it back', () => {
    press('d')
    expect(tiles()).toHaveLength(9)
    expect(lastLive().frames).toEqual([0, 0, 1, 2, 3, 4, 5, 6, 7])
    expect(tab.dirty()).toBe(true)
    expect(onChange).toHaveBeenCalled()
    tab.undo()
    expect(tiles()).toHaveLength(8)
    expect(lastLive().frames).toBeUndefined()
    expect(tab.dirty()).toBe(false)
    tab.redo()
    expect(tiles()).toHaveLength(9)
  })

  it('Alt with an arrow moves the frame, an arrow only walks', () => {
    press('ArrowRight')
    expect(tab.dirty()).toBe(false)
    press('ArrowRight', { altKey: true })
    expect(lastLive().frames).toEqual([0, 2, 1, 3, 4, 5, 6, 7])
  })

  it('Shift picks a run: delete takes all of it, never the very last frame', () => {
    press('ArrowRight', { shiftKey: true })
    press('ArrowRight', { shiftKey: true })
    press('Delete')
    expect(lastLive().frames).toEqual([3, 4, 5, 6, 7])
    for (let i = 0; i < 10; i++) { press('End'); press('Delete') }
    expect(tiles()).toHaveLength(1)
    expect(parts.strip.querySelector('[data-fr-delete]').disabled).toBe(true)
  })

  it('a frame of the sheet comes back from the Add a frame grid, after the picked one', () => {
    press('Delete')
    parts.panel.querySelector('[data-cell="0"]').click()
    expect(lastLive().frames).toEqual([1, 0, 2, 3, 4, 5, 6, 7])
  })

  it('All frames in order undoes the shuffling in one step', () => {
    press('d')
    parts.panel.querySelector('[data-fr-all]').click()
    expect(tiles()).toHaveLength(8)
    expect(parts.panel.querySelector('[data-fr-all]').disabled).toBe(true)
  })

  it('one slide of Speed is one undo', () => {
    const speed = parts.panel.querySelector('[data-cut-fr-speed]')
    for (const v of ['120', '140', '160']) { speed.value = v; speed.dispatchEvent(new Event('input')) }
    speed.dispatchEvent(new Event('change'))
    expect(lastLive().speed).toBe(1.6)
    tab.undo()
    expect(speed.value).toBe('100')
    expect(tab.canUndo()).toBe(false)
  })

  it('Save stores what the stage shows; leaving without it puts back what it opened with', () => {
    press('d')
    tab.save()
    expect(saveLayer).toHaveBeenCalledWith({ play: expect.objectContaining({ frames: [0, 0, 1, 2, 3, 4, 5, 6, 7] }) })
    tab.discard()
    expect(stage.setLayerProp).toHaveBeenLastCalledWith('layer-2', 'play', undefined)
  })

  it('Space plays and stops', () => {
    const onTime = vi.fn()
    const own = mountFrames({ ...parts, t, sheet: '/s.webp', frames: fire, stage, stageId: 'layer-2', onTime })
    own.key({ key: ' ', code: 'Space', target: document.body })
    expect(parts.strip.querySelector('[data-fr-play]').getAttribute('aria-label')).toBe('Pause')
    own.key({ key: ' ', code: 'Space', target: document.body })
    expect(parts.strip.querySelector('[data-fr-play]').getAttribute('aria-label')).toBe('Play')
    expect(onTime).toHaveBeenLastCalledWith(null)
  })
})
