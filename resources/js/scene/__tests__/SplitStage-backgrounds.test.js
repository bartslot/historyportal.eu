import { describe, it, expect, afterEach } from 'vitest'
import { SplitStage } from '../SplitStage.js'

/**
 * Each panel's picture is a background the timeline can key (Bart, 2026-10-17): its saved crop
 * (Uitsnede) is the base, and the timeline moves, zooms and fades it in the editor and the player.
 */

function stage () {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 1000 })
  Object.defineProperty(host, 'clientHeight', { value: 500 })
  document.body.appendChild(host)
  const s = new SplitStage(host, { editable: false })
  const cover = { url: '/bay.png', kind: 'cover', depth: 1 }
  s.show({ split: { dir: 'v', at: 0.5 }, shots: [{ layers: [cover] }, { layers: [cover], focus: { x: 41, y: 29 } }] })
  return s
}

afterEach(() => { document.body.innerHTML = '' })

describe('a split panel\'s background', () => {
  it('is one background per panel, starting from the panel\'s saved crop', () => {
    const bgs = stage().backgrounds()
    expect(bgs.list()).toEqual([{ id: '0' }, { id: '1' }])
    expect(['x', 'y', 'zoom', 'opacity'].map((p) => bgs.value('1', p))).toEqual([41, 29, 1, 1])
  })

  it('takes a sampled frame: pan, zoom and fade on that panel only', () => {
    const s = stage()
    s.backgrounds().patch('1', { x: 10, zoom: 2, opacity: 0.5 })

    const img = s.panels[1].plate.querySelector('.px-layer-bg img')
    expect(img.style.objectPosition).toBe('10% 29%')
    expect(img.style.transform).toBe('scale(2)')
    expect(s.panels[1].plate.style.filter).toBe('opacity(0.5)')
    expect(s.panels[0].plate.style.filter).toBe('')
    expect(s.backgrounds().value('1', 'zoom')).toBe(2)
  })
})
