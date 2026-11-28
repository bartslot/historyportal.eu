import { describe, it, expect } from 'vitest'
import {
  normalizeGroup, composeMember, releaseMember, localDelta, moveGroupPivot, groupPivotAt,
  layerTransform, moveLayerPivot, layerPivotAt, bakeMember,
} from '../art-groups.js'

const W = 1600
const H = 900
const close = (a, b, d = 6) => expect(a).toBeCloseTo(b, d)

describe('composeMember', () => {
  it('leaves a layer alone in a group that has not moved', () => {
    const g = normalizeGroup({ id: 'g1', pivot_x: 40, pivot_y: 60 })
    expect(composeMember({ x: 30, y: 20, scale: 1.5, rotation: 10, opacity: 0.5 }, g, W, H))
      .toEqual({ x: 30, y: 20, scale: 1.5, rotation: 10, opacity: 0.5 })
  })

  it('moves every member by the group move', () => {
    const g = normalizeGroup({ id: 'g1', x: 10, y: -5, pivot_x: 50, pivot_y: 50 })
    const shown = composeMember({ x: 30, y: 20, scale: 1 }, g, W, H)
    close(shown.x, 40)
    close(shown.y, 15)
  })

  it('turns members about the pivot in stage pixels, not percent', () => {
    // 90 degrees clockwise about the middle: 160 px to the right ends 160 px below.
    const g = normalizeGroup({ id: 'g1', rotation: 90, pivot_x: 50, pivot_y: 50 })
    const shown = composeMember({ x: 60, y: 50, scale: 1, rotation: 5 }, g, W, H)
    close(shown.x, 50)
    close(shown.y, 50 + (160 / H) * 100)
    expect(shown.rotation).toBe(95)
  })

  it('grows members away from the pivot and multiplies size and fade', () => {
    const g = normalizeGroup({ id: 'g1', scale: 2, opacity: 0.5, pivot_x: 0, pivot_y: 0 })
    const shown = composeMember({ x: 10, y: 20, scale: 0.5, opacity: 0.8 }, g, W, H)
    close(shown.x, 20)
    close(shown.y, 40)
    close(shown.scale, 1)
    close(shown.opacity, 0.4)
  })
})

describe('releaseMember / localDelta', () => {
  const g = normalizeGroup({ id: 'g1', x: 7, y: -3, scale: 1.4, rotation: 33, opacity: 0.6, pivot_x: 45, pivot_y: 55 })

  it('is the inverse of composeMember', () => {
    const own = { x: 22, y: 71, scale: 0.8, rotation: -12, opacity: 0.9 }
    const back = releaseMember(composeMember(own, g, W, H), g, W, H)
    for (const k of Object.keys(own)) close(back[k], own[k])
  })

  it('turns a drag on screen into the move of a member that lands under the pointer', () => {
    const own = { x: 30, y: 40, scale: 1 }
    const [dx, dy] = localDelta(5, 2, g, W, H)
    const before = composeMember(own, g, W, H)
    const after = composeMember({ ...own, x: own.x + dx, y: own.y + dy }, g, W, H)
    close(after.x - before.x, 5)
    close(after.y - before.y, 2)
  })
})

describe('moveGroupPivot', () => {
  it('moves the pivot to the pointer and keeps every member where it was', () => {
    const g = normalizeGroup({ id: 'g1', x: 4, y: 6, scale: 1.3, rotation: 40, pivot_x: 50, pivot_y: 50 })
    const layer = { x: 20, y: 30, scale: 1, rotation: 0 }
    const before = composeMember(layer, g, W, H)
    const moved = normalizeGroup({ ...g, ...moveGroupPivot(g, 70, 20, W, H) })
    const [px, py] = groupPivotAt(moved)
    close(px, 70)
    close(py, 20)
    const after = composeMember(layer, moved, W, H)
    close(after.x, before.x)
    close(after.y, before.y)
  })
})

describe('layer pivot', () => {
  it('keeps the old transform for a layer without a pivot', () => {
    expect(layerTransform({}, 30)).toBe('translate(calc(-50% + 0px), calc(-50% + 0px)) rotate(30deg)')
    expect(layerTransform({ flip_x: true }, 0)).toBe('translate(calc(-50% + 0px), calc(-50% + 0px)) scale(-1, 1)')
  })

  it('turns about the pivot', () => {
    expect(layerTransform({ pivot_x: 0, pivot_y: 1 }, 45))
      .toBe('translate(calc(-50% + 0px), calc(-50% + 0px)) translate(-50%, 50%) rotate(45deg) translate(50%, -50%)')
  })

  it('moves the pivot without moving the picture', () => {
    // A box 200 x 100 at (500, 300), turned 30 degrees about its middle.
    const box = { cx: 500, cy: 300, bw: 200, bh: 100, rotation: 30, pivot: [0.5, 0.5] }
    // The box corner (local -100, -50) on screen, before the move.
    const at = (b, q) => {
      // screen = c + o + R(q - o), o = (p - 0.5) * box
      const o = [(b.pivot[0] - 0.5) * b.bw, (b.pivot[1] - 0.5) * b.bh]
      const a = b.rotation * Math.PI / 180
      const v = [q[0] - o[0], q[1] - o[1]]
      return [b.cx + o[0] + v[0] * Math.cos(a) - v[1] * Math.sin(a), b.cy + o[1] + v[0] * Math.sin(a) + v[1] * Math.cos(a)]
    }
    const corner = at(box, [-100, -50])
    const next = moveLayerPivot(box, 420, 260)
    const moved = { ...box, cx: next.cx, cy: next.cy, pivot: [next.pivot_x, next.pivot_y] }
    const [qx, qy] = layerPivotAt(moved)
    close(qx, 420)
    close(qy, 260)
    const corner2 = at(moved, [-100, -50])
    close(corner2[0], corner[0])
    close(corner2[1], corner[1])
  })
})

describe('bakeMember', () => {
  it('gives a member what its group showed, rounded for saving', () => {
    const g = normalizeGroup({ id: 'g1', x: 10, rotation: 200, pivot_x: 50, pivot_y: 50 })
    const baked = bakeMember({ x: 50, y: 50, scale: 1, rotation: 0 }, g, W, H)
    expect(baked).toEqual({ x: 60, y: 50, scale: 1, rotation: -160, opacity: 1 })
  })
})

describe('ArtworkOverlay groups', async () => {
  const { ArtworkOverlay } = await import('../ArtworkOverlay.js')
  // jsdom lays nothing out: the overlay works at its 16:9 fallback (1600 x 900).
  const make = (opts) => {
    const el = document.createElement('div')
    document.body.appendChild(el)
    return { el, overlay: new ArtworkOverlay(el, opts) }
  }
  const pic = (id, extra = {}) => ({ asset_id: id, url: `/p${id}.png`, x: 40, y: 50, scale: 1, height: 30, ...extra })
  const node = (el, id) => el.querySelector(`[data-layer-id="art_${id}"]`)

  it('shows a member where its group puts it, and leaves its own values alone', () => {
    const { el, overlay } = make()
    overlay.setGroups([{ id: 'g1', x: 10, y: 5, pivot_x: 50, pivot_y: 50 }])
    overlay.setLayers([pic(1, { group: 'g1' }), pic(2)])
    expect(node(el, 1).style.left).toBe('50%')
    expect(node(el, 1).style.top).toBe('55%')
    expect(node(el, 2).style.left).toBe('40%')
    expect(overlay.layerData(1).x).toBe(40)
  })

  it('moves every member live when the timeline sets a group value', () => {
    const { el, overlay } = make()
    overlay.setLayers([pic(1, { group: 'g1' }), pic(2, { group: 'g1', x: 60 })])
    overlay.setGroups([{ id: 'g1', pivot_x: 50, pivot_y: 50 }])
    overlay.setGroupProp('g1', 'x', -20)
    expect(node(el, 1).style.left).toBe('20%')
    expect(node(el, 2).style.left).toBe('40%')
    overlay.setGroupProp('g1', 'rotation', 30)
    expect(node(el, 1).style.transform).toContain('rotate(30deg)')
    expect(overlay.groupValue('g1', 'rotation')).toBe(30)
  })

  it('fades members with their group', () => {
    const { el, overlay } = make()
    overlay.setGroups([{ id: 'g1', opacity: 0.5 }])
    overlay.setLayers([pic(1, { group: 'g1', opacity: 0.8 })])
    expect(node(el, 1).querySelector('img').style.opacity).toBe('0.4')
  })

  it('lists its groups with their pictures, and draws a box for each in the editor only', () => {
    const { el, overlay } = make()
    overlay.setGroups([{ id: 'g1' }, { id: 'g2' }])
    overlay.setLayers([pic(1, { group: 'g1' }), pic(2, { group: 'g1' }), pic(3)])
    expect(overlay.groups()).toEqual([{ id: 'g1', name: '', members: [1, 2] }])
    expect(el.querySelectorAll('[data-group-chrome]')).toHaveLength(2)
    const { el: el2, overlay: player } = make({ readonly: true })
    player.setGroups([{ id: 'g1' }])
    player.setLayers([pic(1, { group: 'g1' })])
    expect(el2.querySelectorAll('[data-group-chrome]')).toHaveLength(0)
  })

  it('moves the whole group when a member is pressed, and the member alone with Cmd held', () => {
    const changes = []
    const moves = []
    const { el, overlay } = make({ onGroupChange: (id, v) => changes.push([id, v]), onChange: (id, v) => moves.push([id, v]) })
    overlay.setGroups([{ id: 'g1', pivot_x: 50, pivot_y: 50 }])
    overlay.setLayers([pic(1, { group: 'g1' })])
    el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1600, height: 900, right: 1600, bottom: 900 })
    const press = (opts) => {
      node(el, 1).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, ...opts }))
      window.dispatchEvent(new PointerEvent('pointermove', { clientX: 260, clientY: 100 }))
      window.dispatchEvent(new PointerEvent('pointerup', {}))
    }
    press({})
    expect(changes).toHaveLength(1)
    expect(changes[0][0]).toBe('g1')
    expect(changes[0][1].x).toBeCloseTo(10)
    expect(moves).toHaveLength(0)
    press({ metaKey: true })
    expect(moves).toHaveLength(1)
    expect(moves[0][1].x).toBeCloseTo(50)
  })

  it('a re-seed with the same groups changes nothing (a poll never undoes a scrub)', () => {
    const { el, overlay } = make()
    const groups = [{ id: 'g1', pivot_x: 50, pivot_y: 50 }]
    overlay.setGroups(groups)
    overlay.setLayers([pic(1, { group: 'g1' })])
    overlay.setGroupProp('g1', 'y', 10)
    overlay.setGroups(groups)
    expect(node(el, 1).style.top).toBe('60%')
  })
})
