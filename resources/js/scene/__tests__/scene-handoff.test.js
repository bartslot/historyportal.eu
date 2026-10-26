import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ParallaxScene } from '../ParallaxScene.js'

/**
 * A scene change never shows what lies under the panel (Bart, 2026-10-21, Tasman W24VRI: "in the
 * transition between scenes I can see the previous image fullscreen, for 1 frame or second").
 *
 * The player removed the outgoing panel BEFORE the incoming one had its pictures, so for a frame or
 * more the stage showed the flat layers underneath: a picture from scenes ago, cover-fitted full
 * bleed. Now the outgoing panel stays until the incoming one is drawn, and the flat layers it covers
 * are hidden once it is in.
 */

let pending = []
const decodeAll = async () => { pending.splice(0).forEach(resolve => resolve()); await flush() }
const flush = () => new Promise(resolve => setTimeout(resolve, 0))

beforeEach(() => {
  pending = []
  // jsdom never decodes: each picture waits here until the test lets it through.
  HTMLImageElement.prototype.decode = function () { return new Promise(resolve => pending.push(resolve)) }
})
afterEach(() => {
  delete HTMLImageElement.prototype.decode
  document.body.innerHTML = ''
  delete window.__parallax
})

const stage = () => {
  const host = document.createElement('div')
  const flat = document.createElement('div')   // the player's flat layer, holding an older picture
  flat.style.opacity = '1'
  host.appendChild(flat)
  document.body.appendChild(host)
  return { host, flat }
}
const panel = (url) => ({ layers: [{ url, kind: 'cover', depth: 1 }], motion: { panX: 0, panY: 0, zoom: 1 } })
const rootOf = (host, url) => host.querySelector(`img[src="${url}"]`)?.closest('.px-scene') ?? null

describe('a cut between two panels', () => {
  it('keeps the outgoing panel on screen until the incoming one has its pictures', async () => {
    const { host, flat } = stage()
    const a = new ParallaxScene(host)
    a.show({ ...panel('a.webp'), entry: 'cut', covers: [flat] })
    await decodeAll()
    expect(rootOf(host, 'a.webp').style.opacity).toBe('1')

    const b = new ParallaxScene(host)
    b.show({ ...panel('b.webp'), entry: 'cut', replaces: a, covers: [flat] })
    await flush()
    // b's picture is not decoded yet: a is still the one on screen, b waits invisible.
    expect(rootOf(host, 'a.webp')).not.toBeNull()
    expect(rootOf(host, 'b.webp').style.opacity).toBe('0')

    await decodeAll()
    expect(rootOf(host, 'a.webp')).toBeNull()
    expect(rootOf(host, 'b.webp').style.opacity).toBe('1')
    b.destroy()
  })

  it('hides the flat layer under the panel once the panel is in, so no later gap shows it', async () => {
    const { host, flat } = stage()
    const a = new ParallaxScene(host)
    a.show({ ...panel('a.webp'), entry: 'cut', covers: [flat] })
    expect(flat.style.opacity).toBe('1')   // the true previous picture, until the panel is in
    await decodeAll()
    await flush()
    expect(flat.style.opacity).toBe('0')
    a.destroy()
  })

  it('a panel superseded before it came in takes the one it was replacing with it', async () => {
    const { host } = stage()
    const a = new ParallaxScene(host)
    a.show({ ...panel('a.webp'), entry: 'cut' })
    await decodeAll()
    const b = new ParallaxScene(host)
    b.show({ ...panel('b.webp'), entry: 'cut', replaces: a })
    b.destroy()
    expect(host.querySelectorAll('.px-scene')).toHaveLength(0)
  })
})

describe('a Whole image panel', () => {
  beforeEach(() => {
    // The plate's natural size: 2:1. jsdom loads nothing, so report it straight away.
    vi.stubGlobal('Image', class {
      naturalWidth = 2000
      naturalHeight = 1000
      set src (_) { setTimeout(() => this.onload?.()) }
    })
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1600)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(1200)
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('comes in already in its letterboxed box, never full-bleed first', async () => {
    const { host } = stage()
    const scene = new ParallaxScene(host)
    scene.show({ ...panel('whole.webp'), fit: 'contain', entry: 'cut' })
    const root = rootOf(host, 'whole.webp')
    const plate = root.querySelector('.px-plate')
    // Before the plate's size is known it may not be on screen: it would be the whole stage.
    expect(plate.style.height).toBe('')
    expect(root.style.opacity).toBe('0')
    await decodeAll()
    await scene.shown
    expect(root.style.opacity).toBe('1')
    expect(plate.style.height).toBe('800px')   // 1600 wide / 2:1
    scene.destroy()
  })
})
