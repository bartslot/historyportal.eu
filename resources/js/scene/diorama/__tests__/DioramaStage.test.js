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

describe('DioramaStage playback', () => {
  const sailorEl = () => el('sailor_1')
  it('walks the sailor along his keys, flips him to face the way he walks, and steps through the sheet', () => {
    const at = t => { stage.update(t); return { x: px(sailorEl().style.left), bg: sailorEl().style.backgroundPosition, flip: sailorEl().style.transform.includes('scaleX(-1)') } }
    const standing = at(0.5)
    const walking = at(2.0)
    const later = at(2.3)
    expect(walking.x).toBeLessThan(standing.x)          // heading left along the rail
    expect(walking.flip).toBe(true)                      // drawn facing right, walking left
    expect(standing.bg).toMatch(/^0% 0/)                    // idle frame
    expect(walking.bg).not.toMatch(/^0% 0/)                // a walk frame
    expect(later.bg).not.toBe(walking.bg)                // the cycle moves on
  })

  it('goes behind the wall when he steps through the doorway', () => {
    stage.update(11.9)
    const z = sel => Number(host.querySelector(sel).style.zIndex)
    expect(z('[data-diorama-item="sailor_1"]')).toBeLessThan(z('[data-diorama-layer="wall"]'))
    stage.update(0)
    expect(z('[data-diorama-item="sailor_1"]')).toBeGreaterThan(z('[data-diorama-layer="rail"]'))
  })

  it('without a clock (the editor) the item stands at its own cell', () => {
    const before = px(sailorEl().style.left)
    stage.update(null)
    expect(px(sailorEl().style.left)).toBe(before)
  })
})

describe('DioramaStage editing', () => {
  it('dragging snaps to quarter cells on the floor and reports the move once, on release', () => {
    const barrel = spec.items.find(i => i.id === 'barrel_1')
    const start = feetOf(barrel)
    pointer(el('barrel_1'), 'pointerdown', start)
    pointer(window, 'pointermove', { u: start.u - 200, v: start.v - 30 })
    expect(moves).toEqual([])
    pointer(window, 'pointerup', { u: start.u - 200, v: start.v - 30 })

    expect(moves).toHaveLength(1)
    const [{ itemId, floor, cell, keys }] = moves
    expect(itemId).toBe('barrel_1')
    expect(floor).toBe('quay')
    expect(keys).toBeUndefined()                       // a still item has no path to carry
    for (const c of cell) expect(c * 4).toBe(Math.round(c * 4))
    expect(cell[1]).toBeGreaterThan(barrel.cell[1])    // up the picture = further away
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

describe('DioramaStage for the editor panels', () => {
  it('cellAt: a drop point becomes the snapped floor cell under it', () => {
    const barrel = spec.items.find(i => i.id === 'barrel_1')
    const at = plateToStage(spec.camera, W, H, feetOf(barrel))
    const hit = stage.cellAt(at.x, at.y)
    expect(hit.floor).toBe('quay')
    expect(hit.cell[0]).toBeCloseTo(barrel.cell[0], 0)
    expect(hit.cell[1]).toBeCloseTo(barrel.cell[1], 0)
    for (const c of hit.cell) expect(c * 4).toBe(Math.round(c * 4))
  })

  it('cellAt: no point, or sky under it, still lands on a floor (never off the grid)', () => {
    expect(stage.cellAt().floor).toBe('quay')
    expect(stage.cellAt(W / 2, 5).floor).toBe('quay')
  })

  it('select: shows the handle and tells the object list', () => {
    const seen = []
    const on = e => seen.push(e.detail.id)
    window.addEventListener('scene-object-selected', on)
    stage.select('barrel_1')
    window.removeEventListener('scene-object-selected', on)
    expect(seen).toEqual(['dio_barrel_1'])
    expect(host.querySelector('[data-diorama-handle]').style.display).toBe('')
  })

  it('a library picture stands on the bottom centre of its drawing, and says what it is', () => {
    const lib = { url: 'https://cdn.example/donna.webp', px_per_m: 800, height_m: 1.6, frame_m: [1.25, 2], anchor: [0.4, 0.9], description: 'A Florentine woman, standing.' }
    stage.show({ ...spec, items: [{ id: 'donna_1', asset: 'library:9', asset_version: 1, floor: 'quay', cell: [0, 12] }] }, { 'library:9': lib }, { editable: true })
    const d = el('donna_1')
    expect(d.style.transform).toBe('translate(-40%,-90%)')
    expect(d.style.backgroundImage).toContain('https://cdn.example/donna.webp')
    expect(d.getAttribute('aria-label')).toBe('A Florentine woman, standing.')
  })
})

describe('the wall fades while the item behind it is selected', () => {
  it('a barrel in the room: selecting it fades the wall in front, letting go restores it', () => {
    stage._setItem('barrel_1', { cell: [-6, 32] })   // through the doorway, behind the wall
    const wall = host.querySelector('[data-diorama-layer="wall"]')
    stage.select('barrel_1')
    expect(wall.style.opacity).toBe('0.3')
    stage.select(null)
    expect(wall.style.opacity).toBe('')
  })
})

describe('canvas zoom (editor)', () => {
  it('zooming out keeps the plate point under the pointer where it is, and shows past the picture', () => {
    const at = [900, 500]
    const before = stage._toPlate(...at)
    stage.setZoom(0.5, ...at)
    const after = stage._toPlate(...at)
    expect(after.u).toBeCloseTo(before.u, 6)
    expect(after.v).toBeCloseTo(before.v, 6)
    const plate = host.querySelector('[data-diorama-layer="plate"]')
    expect(px(plate.style.width)).toBeCloseTo(W / 2, 3)               // the picture is half as wide
    expect(host.querySelector('button.btn').textContent).toBe('50%')
  })

  it('zoomed out, an item can be dragged onto the floor beyond the picture\'s edge', () => {
    stage.setZoom(0.4)
    const barrel = spec.items.find(i => i.id === 'barrel_1')
    const start = feetOf(barrel)
    const toClient = p => stage._toStage(p)
    const fire2 = (target, type, p) => {
      const at = toClient(p)
      const ev = new Event(type, { bubbles: true })
      Object.assign(ev, { clientX: at.x, clientY: at.y, pointerId: 1 })
      target.dispatchEvent(ev)
    }
    fire2(el('barrel_1'), 'pointerdown', start)
    fire2(window, 'pointermove', { u: -600, v: start.v })             // left of the picture
    fire2(window, 'pointerup', { u: -600, v: start.v })
    expect(moves).toHaveLength(1)
    const onPlate = stage._toStage(feetOf({ ...barrel, cell: moves[0].cell }))
    expect(onPlate.x).toBeLessThan(stage._toStage({ u: 0, v: 0 }).x)   // its feet are past the left edge
  })

  it('the chip takes you back to what the class sees', () => {
    stage.setZoom(0.5)
    host.querySelector('button.btn').click()
    expect(stage.view).toEqual({ zoom: 1, panX: 0, panY: 0 })
    expect(host.querySelector('button.btn').style.display).toBe('none')
  })

  it('the player (read-only) is never zoomed and has no chip', () => {
    stage.show(spec, assets)
    expect(host.querySelector('button.btn')).toBeNull()
    expect(host.querySelector('.diorama-stage').style.overflow).toBe('hidden')
  })

  it('the editor is not cut off at the canvas, and around the picture it is the app\'s dark blue', () => {
    const root = host.querySelector('.diorama-stage')
    expect(root.style.overflow).toBe('visible')
    expect(root.style.background).toContain('--color-base-200')   // the page around it, not the 3D canvas's grey
  })

  it('reports the camera frame, so the title overlay stays on the scene, not the canvas', () => {
    const frames = []
    stage.show(spec, assets, { editable: true, onFrame: f => frames.push(f) })
    expect(frames.at(-1)).toEqual({ x: 0, y: 0, w: W, h: H })
    stage.setZoom(0.5)
    const f = frames.at(-1)
    for (const [k, v] of Object.entries({ x: W / 4, y: H / 4, w: W / 2, h: H / 2 })) expect(f[k]).toBeCloseTo(v, 3)
  })

  it('the backdrop is the frame: a shadow to black around it in the editor, none in the player', () => {
    const plate = () => host.querySelector('[data-diorama-layer="plate"]')
    expect(plate().style.boxShadow).not.toBe('')
    expect(host.querySelector('[data-diorama-layer="wall"]').style.boxShadow).toBe('')   // occluders cover the plate: one shadow
    stage.show(spec, assets)
    expect(plate().style.boxShadow).toBe('')
  })
})

describe('the player\'s portrait crop follows the walking figure', () => {
  it('on a phone the sailor stays in frame from the rail to the doorway', () => {
    const phone = document.createElement('div')
    Object.defineProperty(phone, 'clientWidth', { value: 390 })
    Object.defineProperty(phone, 'clientHeight', { value: 844 })
    document.body.appendChild(phone)
    const player = new DioramaStage(phone)
    // A figure standing still NEARER the camera than the sailor: the crop must still follow him.
    const bystander = { id: 'bystander', asset: 'test/barrel', asset_version: 1, floor: 'quay', cell: [8, 7] }
    player.show({ ...spec, items: [...spec.items, bystander] }, assets)
    const sailorX = () => px(phone.querySelector('[data-diorama-item="sailor_1"]').style.left)
    let now = 0
    const realNow = performance.now
    performance.now = () => now
    try {
      for (let t = 0; t <= 12; t += 1 / 30) { now += 1000 / 30; player.update(t) }   // play it at 30 fps
    } finally { performance.now = realNow }
    expect(sailorX()).toBeGreaterThan(0)
    expect(sailorX()).toBeLessThan(390)                // at the doorway, still on the phone
    player.destroy()
    phone.remove()
  })

  it('the editor never follows: the view stays where the teacher put it', () => {
    const before = stage._focusU
    stage.update(8)
    expect(stage._focusU).toBe(before)
  })
})

describe('a keyed item in the editor', () => {
  const sailor = () => stage.spec.items.find(i => i.id === 'sailor_1')

  it('stands where its path starts when the editor has no playhead', () => {
    const start = feetOf({ ...sailor(), cell: sailor().keys[0].cell })
    const at = plateToStage(spec.camera, W, H, start)
    expect(px(el('sailor_1').style.left)).toBeCloseTo(at.x, 1)
  })

  it('dragging it moves the whole path, and the move carries the new keys', () => {
    const before = sailor().keys.map(k => k.cell)
    const start = feetOf({ ...sailor(), cell: before[0] })
    pointer(el('sailor_1'), 'pointerdown', start)
    pointer(window, 'pointermove', { u: start.u - 300, v: start.v })
    pointer(window, 'pointerup', { u: start.u - 300, v: start.v })
    const [move] = moves
    const dx = move.keys[0].cell[0] - before[0][0]
    expect(dx).toBeLessThan(0)
    move.keys.forEach((k, i) => {
      expect(k.cell[0] - before[i][0]).toBeCloseTo(dx, 9)
      expect(k.cell[1]).toBeCloseTo(before[i][1], 9)
    })
    expect(move.keys.map(k => k.t)).toEqual(sailor().keys.map(k => k.t))   // times untouched
  })

  it('setKeys shows a stretched clip at once', () => {
    const keys = sailor().keys.map(k => ({ ...k, t: k.t * 2 }))
    stage.setKeys('sailor_1', keys)
    stage.update(2)
    const at2 = px(el('sailor_1').style.left)
    stage.setKeys('sailor_1', sailor().keys.map(k => ({ ...k, t: k.t / 2 })))
    stage.update(2)
    expect(px(el('sailor_1').style.left)).not.toBeCloseTo(at2, 0)
  })
})


describe('auto-key: scrub, drag, and the item gets a key at the playhead', () => {
  const drag = (id, from, to) => {
    pointer(el(id), 'pointerdown', from)
    pointer(window, 'pointermove', to)
    pointer(window, 'pointerup', to)
  }

  it('a still barrel dragged at 2 s gets a key at 0 where it stood and one at 2 s where it is now', () => {
    stage.show(spec, assets, { editable: true, onMove: m => moves.push(m), recording: () => true })
    stage.update(2)
    const barrel = spec.items.find(i => i.id === 'barrel_1')
    const start = feetOf(barrel)
    drag('barrel_1', start, { u: start.u - 200, v: start.v - 30 })
    const [move] = moves
    expect(move.keys.map(k => k.t)).toEqual([0, 2])
    expect(move.keys[0].cell).toEqual(barrel.cell)
    expect(move.keys[1].cell).not.toEqual(barrel.cell)
    expect(move.cell).toEqual(barrel.cell)              // the item's own cell is where its path starts
  })

  it('the walking sailor dragged mid-walk gets a new key there; the rest of his path stays', () => {
    stage.show(spec, assets, { editable: true, onMove: m => moves.push(m), recording: () => true })
    const sailor = spec.items.find(i => i.id === 'sailor_1')
    const t = (sailor.keys[1].t + sailor.keys[2].t) / 2
    stage.update(t)
    const now = projectPoint(spec.camera, cellToWorld(resolveFloors(spec).get(sailor.floor), stage._poseOf(sailor).cell))
    drag('sailor_1', now, { u: now.u, v: now.v + 40 })
    const [move] = moves
    expect(move.keys).toHaveLength(sailor.keys.length + 1)
    expect(move.keys.map(k => k.t)).toEqual([...sailor.keys.map(k => k.t), t].sort((a, b) => a - b))
    for (const k of sailor.keys) expect(move.keys).toContainEqual(k)
  })

  it('with auto-key off, dragging still moves the whole path', () => {
    const sailor = spec.items.find(i => i.id === 'sailor_1')
    const start = feetOf({ ...sailor, cell: sailor.keys[0].cell })
    drag('sailor_1', start, { u: start.u - 300, v: start.v })
    expect(moves[0].keys).toHaveLength(sailor.keys.length)
  })
})

describe('the stage API the timeline rows and the Format panel use', () => {
  const item = id => stage.spec.items.find(i => i.id === id)

  it('poseCell: where the item stands at the playhead', () => {
    const sailor = spec.items.find(i => i.id === 'sailor_1')
    stage.update(0)
    expect(stage.poseCell('sailor_1')).toEqual(sailor.keys[0].cell)
    expect(stage.poseCell('barrel_1')).toEqual(spec.items.find(i => i.id === 'barrel_1').cell)
  })

  it('placeCell on a still item at 0 moves it, snapped to quarter cells and kept on its floor', () => {
    stage.update(0)
    stage.placeCell('barrel_1', [3.1, 99])
    const [move] = moves
    expect(move.cell[0]).toBe(3)
    expect(move.cell[1]).toBeLessThanOrEqual(40)          // the quay ends at 40
    expect(move.keys).toBeUndefined()
  })

  it('placeCell while recording at 2 s gives a still item its first path', () => {
    stage.show(spec, assets, { editable: true, onMove: m => moves.push(m), recording: () => true })
    stage.update(2)
    const cell0 = item('barrel_1').cell
    stage.placeCell('barrel_1', [cell0[0] + 2, cell0[1]])
    expect(moves[0].keys).toEqual([{ t: 0, cell: cell0 }, { t: 2, cell: [cell0[0] + 2, cell0[1]] }])
  })

  it('keyHere: a key at the playhead where the item stands; at 0 on a still item, a single key', () => {
    stage.update(0)
    stage.keyHere('barrel_1')
    expect(moves.at(-1).keys).toEqual([{ t: 0, cell: item('barrel_1').cell }])
  })

  it('removeKeys: takes the keys at those times away and says so, even down to none', () => {
    const sailor = spec.items.find(i => i.id === 'sailor_1')
    stage.removeKeys('sailor_1', [sailor.keys[1].t])
    expect(moves.at(-1).keys).toHaveLength(sailor.keys.length - 1)
    stage.removeKeys('sailor_1', item('sailor_1').keys.map(k => k.t))
    expect(moves.at(-1).keys).toEqual([])
    expect(moves.at(-1).cell).toEqual(sailor.keys[0].cell)   // it stays where its path started
  })
})
