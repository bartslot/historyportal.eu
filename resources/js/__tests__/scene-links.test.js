import { describe, it, expect, vi } from 'vitest'

vi.mock('../i18n.js', () => ({ t: (s) => s }))
const { routeAfter, sceneLinks, hasSceneLinks, showLinkChoices } = await import('../scene/scene-links.js')

const queue = [
  { id: 10, chapter_name: 'Venice', config: { links: [{ label: 'Ask Niccolò', to: 11 }, { label: 'Watch the sailors', to: 12 }] } },
  { id: 11, chapter_name: 'Destination', config: { links: [{ label: '', to: 13 }] } },
  { id: 12, chapter_name: 'Cargo', config: null },
  { id: 13, chapter_name: 'Embark', config: { ending: true } },
]

describe('where a lesson goes after a scene', () => {
  it('a scene with choices asks the class', () => {
    const r = routeAfter(queue, 0)
    expect(r.kind).toBe('choose')
    expect(r.links.map((l) => l.index)).toEqual([1, 2])
  })
  it('one link without words is a straight jump', () => {
    expect(routeAfter(queue, 1)).toEqual({ kind: 'jump', index: 3 })
  })
  it('no links plays the next scene in the list', () => {
    expect(routeAfter(queue, 2)).toEqual({ kind: 'next', index: 3 })
  })
  it('an ending ends the lesson, even with scenes after it', () => {
    expect(routeAfter([...queue, { id: 14 }], 3)).toEqual({ kind: 'end' })
  })
  it('a link to a scene that is gone is left out', () => {
    const q = [{ id: 1, config: { links: [{ label: 'Lost', to: 999 }] } }, { id: 2 }]
    expect(sceneLinks(q[0], q)).toEqual([])
    expect(routeAfter(q, 0)).toEqual({ kind: 'next', index: 1 })
  })
  it('knows a lesson that uses links', () => {
    expect(hasSceneLinks({ scenes: queue })).toBe(true)
    expect(hasSceneLinks({ scenes: [{ id: 1 }] })).toBe(false)
  })
})

describe('the choice card', () => {
  it('shows one button per link as text and picks once', () => {
    const host = document.createElement('div')
    const onPick = vi.fn()
    showLinkChoices(host, routeAfter(queue, 0).links.map((l, i) => (i === 1 ? { ...l, label: '<b>x</b>' } : l)), queue, onPick)
    const buttons = host.querySelectorAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[1].textContent).toBe('<b>x</b>')
    buttons[0].click(); buttons[0].click()
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][0].to).toBe(11)
    expect(host.querySelector('[data-scene-links]')).toBeNull()
  })
})
