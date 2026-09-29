import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DioramaStage } from '../DioramaStage.js'
import { resolveFloors, placeItem, plateToStage, projectPoint, cellToWorld, screenHeight } from '../projection.js'

const dir = resolve(__dirname, '../../../../../public/diorama/test-quay')
const spec = JSON.parse(readFileSync(`${dir}/scene.json`, 'utf8'))
const assets = JSON.parse(readFileSync(`${dir}/assets.json`, 'utf8'))
const W = 1280
const H = 720    // half the plate: a 16:9 stage, scale 0.5

globalThis.ResizeObserver ??= class { observe () {} disconnect () {} }

let host, stage, moves
beforeEach(() => {
  host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: W })
  Object.defineProperty(host, 'clientHeight', { value: H })
  document.body.appendChild(host)
  moves = []
  stage = new DioramaStage(host)
  stage.show(spec, assets, { editable: true, onMove: m => moves.push(m) })
})
afterEach(() => { stage.destroy(); host.remove() })

const el = id => host.querySelector(`[data-diorama-item="${id}"]`)
const px = v => parseFloat(v)
const pointer = (target, type, { u, v }) => {
  // Plate pixel → client pixel on this stage (the host sits at 0,0 in jsdom).
  const at = plateToStage(spec.camera, W, H, { u, v })
  const ev = new Event(type, { bubbles: true })
  Object.assign(ev, { clientX: at.x, clientY: at.y, pointerId: 1 })
  target.dispatchEvent(ev)
}
const feetOf = item => projectPoint(spec.camera, cellToWorld(resolveFloors(spec).get(item.floor), item.cell))

describe('DioramaStage layout', () => {
  it('stands each item on its floor point with the right size, like the Blender truth', () => {
    const truth = JSON.parse(readFileSync(`${dir}/truth.json`, 'utf8'))
    for (const item of spec.items) {
      const img = el(item.id)
      const feet = plateToStage(spec.camera, W, H, { u: truth[item.id].feet_px[0], v: truth[item.id].feet_px[1] })
      expect(px(img.style.left)).toBeCloseTo(feet.x, 1)
      expect(px(img.style.top)).toBeCloseTo(feet.y, 1)
      const asset = assets[item.asset]
      const p = placeItem(spec.camera, resolveFloors(spec), item, asset.px_per_m)
      expect(px(img.style.width)).toBeCloseTo(asset.frame_m[0] * asset.px_per_m * p.scale * 0.5, 3)
    }
  })

  it('stacks plate, wall, barrel, rail, sailor back to front', () => {
    const z = sel => Number(host.querySelector(sel).style.zIndex)
    const order = ['[data-diorama-layer="plate"]', '[data-diorama-layer="wall"]', '[data-diorama-item="barrel_1"]',
      '[data-diorama-layer="rail"]', '[data-diorama-item="sailor_1"]'].map(z)
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })

  it('the floor grid sits over the plate and under every occluder and item', () => {
    const z = sel => Number(host.querySelector(sel).style.zIndex)
    const grid = Number(host.querySelector('.diorama-stage svg').style.zIndex)
    expect(grid).toBeGreaterThan(z('[data-diorama-layer="plate"]'))
    for (const sel of ['[data-diorama-layer="wall"]', '[data-diorama-layer="rail"]', '[data-diorama-item="barrel_1"]', '[data-diorama-item="sailor_1"]']) {
      expect(grid).toBeLessThan(z(sel))
    }
  })

  it('on a portrait phone the crop centres on the nearest item (the sailor), not the empty middle', () => {
    const phone = document.createElement('div')
    Object.defineProperty(phone, 'clientWidth', { value: 390 })
    Object.defineProperty(phone, 'clientHeight', { value: 844 })
    document.body.appendChild(phone)
    const onPhone = new DioramaStage(phone)
    onPhone.show(spec, assets)
    const sailorX = px(phone.querySelector('[data-diorama-item="sailor_1"]').style.left)
    expect(sailorX).toBeGreaterThan(390 * 0.25)
    expect(sailorX).toBeLessThan(390 * 0.75)
    onPhone.destroy()
    phone.remove()
  })

  it('a read-only stage (the player) takes no pointer input', () => {
    stage.show(spec, assets)
    expect(el('sailor_1').style.pointerEvents).toBe('none')
  })
})

describe('DioramaStage editing', () => {
  it('dragging snaps to quarter cells on the floor and reports the move once, on release', () => {
    const sailor = spec.items.find(i => i.id === 'sailor_1')
    const start = feetOf(sailor)
    pointer(el('sailor_1'), 'pointerdown', start)
    pointer(el('sailor_1'), 'pointermove', { u: start.u - 400, v: start.v - 60 })
    expect(moves).toEqual([])
    pointer(el('sailor_1'), 'pointerup', { u: start.u - 400, v: start.v - 60 })

    expect(moves).toHaveLength(1)
    const [{ itemId, floor, cell }] = moves
    expect(itemId).toBe('sailor_1')
    expect(floor).toBe('quay')
    for (const c of cell) expect(c * 4).toBe(Math.round(c * 4))
    expect(cell[1]).toBeGreaterThan(sailor.cell[1])    // up the picture = further away
  })

  it('a drag above the horizon has no floor: the item stays where it last stood', () => {
    const sailor = spec.items.find(i => i.id === 'sailor_1')
    const start = feetOf(sailor)
    pointer(el('sailor_1'), 'pointerdown', start)
    pointer(el('sailor_1'), 'pointermove', { u: start.u, v: 200 })   // sky
    pointer(el('sailor_1'), 'pointerup', { u: start.u, v: 200 })
    expect(moves).toEqual([])
    expect(stage.spec.items.find(i => i.id === 'sailor_1').cell).toEqual(sailor.cell)
  })

  it('the resize handle moves the item nearer and keeps its real height', () => {
    const barrel = spec.items.find(i => i.id === 'barrel_1')
    const feet = feetOf(barrel)
    const asset = assets[barrel.asset]
    pointer(el('barrel_1'), 'pointerdown', feet)
    pointer(el('barrel_1'), 'pointerup', feet)
    const handle = host.querySelector('[data-diorama-handle]')
    expect(handle.style.display).toBe('')
    // The host is pointer-events:none (the canvas below must stay clickable); a handle that
    // inherits it lets every press fall through to the item, which then drags instead of resizing.
    expect(handle.style.pointerEvents).toBe('auto')

    const before = screenHeight(spec.camera, asset.height_m, feet.depth)
    pointer(handle, 'pointerdown', { u: feet.u, v: feet.v - before })
    pointer(handle, 'pointermove', { u: feet.u, v: feet.v - before * 1.5 })
    pointer(handle, 'pointerup', { u: feet.u, v: feet.v - before * 1.5 })

    const [move] = moves
    expect(move.itemId).toBe('barrel_1')
    expect(move.cell[1]).toBeLessThan(barrel.cell[1])            // nearer
    expect(move.cell[0]).toBeCloseTo(barrel.cell[0] * (move.cell[1] / barrel.cell[1]), 0)   // same screen column (±snap)
  })

  it('matches() is true for what it shows, so an echoing scene:load does not re-mount', () => {
    expect(stage.matches(spec)).toBe(true)
    expect(stage.matches({ ...spec, items: [] })).toBe(false)
  })
})
