import { describe, it, expect, vi, beforeEach } from 'vitest'
import { targetOf, othersByScene, isOwnEdit, createCollab } from '../collab.js'

const joey = { id: 2, name: 'Joey Smit', initials: 'JS', color: 'hsl(1 70% 62%)', me: false }
const bart = { id: 1, name: 'Bart', initials: 'B', color: 'hsl(2 70% 62%)', me: true }

const room = (over = {}) => ({
  target: 'scene:12', people: [bart], holder: null, mine: true, rail: 'r1', scene_version: 1, media: 'm1', ...over,
})

const config = { pingUrl: '/p', takeOverUrl: '/t', leaveUrl: '/l', csrf: 'x', intervalMs: 3000,
  labels: { took_over: ':name took over this scene', new_media: 'New clip', someone: 'Someone' } }

describe('several accounts in one lesson (Bart 11-23)', () => {
  beforeEach(() => { document.body.innerHTML = ''; window.Livewire = undefined })

  it('names what is on screen the way the server does', () => {
    expect(targetOf({ id: 12, title: false })).toBe('scene:12')
    expect(targetOf({ id: 12, title: true })).toBe('title')
    expect(targetOf({ id: null, title: false })).toBeNull()
  })

  it('groups the other people by the scene they are on, leaving me out', () => {
    const out = othersByScene([{ ...bart, target: 'scene:3' }, { ...joey, target: 'scene:3' }, { ...joey, id: 3, target: 'title' }])
    expect(Object.keys(out)).toEqual(['3'])
    expect(out[3].map((p) => p.id)).toEqual([2])
  })

  it('a poll or a scene pick is not my own edit; a property change or an action is', () => {
    expect(isOwnEdit({ calls: [{ method: 'poll' }], updates: {} })).toBe(false)
    expect(isOwnEdit({ calls: [{ method: 'selectScene' }] })).toBe(false)
    expect(isOwnEdit({ calls: [{ method: 'setLayerSpeed' }] })).toBe(true)
    expect(isOwnEdit({ calls: [], updates: { 'selectedScene.script_segment': 'x' } })).toBe(true)
  })

  it('says who took the scene when it is taken while I am on it', () => {
    const c = createCollab({ wire: {}, config })
    c.apply(room())
    c.apply(room({ mine: false, holder: joey }))
    expect(c.state.mine).toBe(false)
    expect(c.state.notice).toBe('Joey Smit took over this scene')
  })

  it('follows the holder\'s edits while I watch, and does not reload my own scene for my own typing', () => {
    const wire = { selectScene: vi.fn() }
    const c = createCollab({ wire, config })
    c.apply(room({ mine: false, holder: joey }))
    c.apply(room({ mine: false, holder: joey, scene_version: 2 }))
    expect(wire.selectScene).toHaveBeenCalledWith(12)

    const mine = { selectScene: vi.fn() }
    const d = createCollab({ wire: mine, config })
    d.apply(room())
    d.apply(room({ scene_version: 5 }))
    expect(mine.selectScene).not.toHaveBeenCalled()
  })

  it('reloads my scene when a job drops a new picture or clip in', () => {
    const wire = { selectScene: vi.fn() }
    const c = createCollab({ wire, config, now: () => 100000 })
    c.apply(room())
    c.apply(room({ media: 'm2' }))
    expect(wire.selectScene).toHaveBeenCalledWith(12)
    expect(c.state.notice).toBe('New clip')
  })

  it('redraws the rail only when its fingerprint changes', () => {
    const dispatchTo = vi.fn()
    window.Livewire = { dispatchTo }
    const c = createCollab({ wire: {}, config })
    c.apply(room())
    c.apply(room())
    expect(dispatchTo).not.toHaveBeenCalled()
    c.apply(room({ rail: 'r2' }))
    expect(dispatchTo).toHaveBeenCalledWith('wizard.scene-rail', 'rail-refresh')
  })

  it('puts the initials of whoever is on a scene on its rail thumb', () => {
    document.body.innerHTML = '<div data-scene-block="12"></div><div data-scene-block="13"></div>'
    const c = createCollab({ wire: {}, config })
    c.apply(room({ people: [bart, { ...joey, target: 'scene:13' }] }))
    expect(document.querySelector('[data-scene-block="13"] .collab-chip')?.textContent).toBe('JS')
    expect(document.querySelector('[data-scene-block="12"] .collab-chip')).toBeNull()
    c.apply(room({ people: [bart] }))
    expect(document.querySelectorAll('.collab-chip').length).toBe(0)
  })
})
