import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountBones } from '../bones-tab.js'

const quad = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const puppet = {
  atlas: '/a.png', width: 100, height: 200, facing: 1,
  bones: [{ name: 'hips', parent: null, from: [50, 120] }, { name: 'chest', parent: 'hips', from: [50, 100] }, { name: 'head', parent: 'chest', from: [50, 40] }, { name: 'upperarm_n', parent: 'chest', from: [30, 50] }, { name: 'forearm_n', parent: 'upperarm_n', from: [30, 90] }],
  parts: [
    { bone: 'hips', quad: quad(30, 100, 70, 200), uv: [0, 0, 0.5, 0.5] },
    { bone: 'chest', quad: quad(30, 40, 70, 110), uv: [0.5, 0, 1, 0.5] },
    { bone: 'head', quad: quad(35, 5, 65, 45), uv: [0, 0.5, 0.25, 1] },
    { bone: 'forearm_n', quad: quad(20, 90, 40, 130), uv: [0.25, 0.5, 0.5, 1] },
    { bone: 'upperarm_n', quad: quad(20, 45, 40, 95), uv: [0.5, 0.5, 1, 1] },
  ],
}

describe('the Bones tab', () => {
  let parts, stage, saveLayer, tab, onChange
  const t = (en) => en
  const slide = (name, value) => {
    const input = parts.panel.querySelector(`[data-cut-bn-${name}]`)
    input.value = String(value)
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new Event('change'))
    return input
  }
  const mount = (extra = {}) => mountBones({ ...parts, t, atlas: '/a.png', puppet, pose: {}, keys: [], duration: 8, time: 2, stage, stageId: 'layer-1', saveLayer, onChange, ...extra })

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    document.body.innerHTML = '<div id="v"></div><div id="s"></div><div id="p"></div>'
    parts = { view: document.getElementById('v'), strip: document.getElementById('s'), panel: document.getElementById('p') }
    stage = { setBones: vi.fn() }
    saveLayer = vi.fn(async () => {})
    onChange = vi.fn()
    tab = mount()
  })

  it('offers the bones that can turn, the hips stay', () => {
    expect(parts.panel.querySelector('[data-cut-bn-head]')).not.toBeNull()
    expect(parts.panel.querySelector('[data-cut-bn-hips]')).toBeNull()
    expect(tab.dirty()).toBe(false)
    expect(stage.setBones).not.toHaveBeenCalled()
  })

  it('a slider only goes as far as the body can: an elbow never bends backwards', () => {
    const forearm = parts.panel.querySelector('[data-cut-bn-forearm_n]')
    expect(Number(forearm.min)).toBe(-140)
    expect(Number(forearm.max)).toBe(5)
    expect(Number(parts.panel.querySelector('[data-cut-bn-head]').max)).toBe(25)
  })

  it('a turn with no keys is the layer\'s own pose, shown on the stage at once', () => {
    slide('head', 10)
    expect(stage.setBones).toHaveBeenLastCalledWith('layer-1', { 'bone:head': 10 }, [])
    expect(tab.dirty()).toBe(true)
    expect(onChange).toHaveBeenCalled()
    tab.undo()
    expect(tab.dirty()).toBe(false)
    expect(parts.panel.querySelector('[data-cut-bn-head]').value).toBe('0')
  })

  it('Add key holds the whole pose at the playhead, and from then on a turn is a key', () => {
    slide('head', 10)
    parts.strip.querySelector('[data-bn-key]').click()
    expect(stage.setBones.mock.lastCall[2]).toEqual([{ t: 2, 'bone:head': 10 }])
    expect(parts.strip.querySelector('[data-bn-key]').textContent).toBe('Remove key')
    const time = parts.strip.querySelector('[data-bn-time]')
    time.value = '4'
    time.dispatchEvent(new Event('input'))
    expect(parts.strip.querySelector('[data-bn-key]').textContent).toBe('Add key')
    slide('head', 20)
    expect(stage.setBones.mock.lastCall[2]).toEqual([{ t: 2, 'bone:head': 10 }, { t: 4, 'bone:head': 20 }])
    expect(stage.setBones.mock.lastCall[1]).toEqual({ 'bone:head': 10 })   // the layer's own pose stayed
  })

  it('moving the playhead shows the pose there; Remove key takes it away', () => {
    tab = mount({ keys: [{ t: 2, 'bone:head': 0 }, { t: 4, 'bone:head': 20 }, { t: 3, x: 0.2 }] })
    const head = parts.panel.querySelector('[data-cut-bn-head]')
    const time = parts.strip.querySelector('[data-bn-time]')
    time.value = '4'
    time.dispatchEvent(new Event('input'))
    expect(head.value).toBe('20')
    parts.strip.querySelector('[data-bn-key]').click()
    expect(stage.setBones.mock.lastCall[2]).toEqual([{ t: 2, 'bone:head': 0 }, { t: 3, x: 0.2 }])
  })

  it('Reset pose brings every bone back', () => {
    slide('head', 10)
    parts.panel.querySelector('[data-bn-reset]').click()
    expect(stage.setBones.mock.lastCall[1]['bone:head']).toBe(0)
    expect(parts.panel.querySelector('[data-bn-reset]').disabled).toBe(true)
  })

  it('Save stores pose and keys, the timeline hears of it; leaving puts back what it opened with', async () => {
    const heard = vi.fn()
    window.addEventListener('stage25d-synced', heard, { once: true })
    slide('head', 10)
    await tab.save()
    expect(saveLayer).toHaveBeenCalledWith({ 'bone:head': 10, keys: [] })
    expect(heard).toHaveBeenCalled()
    tab.discard()
    expect(stage.setBones).toHaveBeenLastCalledWith('layer-1', {}, [])
  })
})
