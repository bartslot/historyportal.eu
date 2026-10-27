import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ParallaxScene } from '../ParallaxScene.js'
import { SplitStage } from '../SplitStage.js'
import { outgoingStages, hideFlatLayers } from '../stage-handoff.js'

/**
 * Tasman W24VRI, scenes 2 -> 3 -> 4 (demo-route check, 2026-10-24): scene 2 is a flat picture,
 * scene 3 a split scene (two comic panels, so two ParallaxScenes on the stage at once), scene 4 a
 * layered panel. The flat layer kept scene 2's picture under the split stage, and the split was
 * torn down the moment scene 4 was asked for, so scene 4 faded in over scene 2 for ~1.1 s.
 *
 * Reproduced with the player's own steps (lesson-player.js _showFlatScene / _showSplit /
 * _showLayeredShot); the player itself is one Alpine component that jsdom cannot run.
 */

let pending = []
const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const decodeAll = async () => { pending.splice(0).forEach(resolve => resolve()); await flush(); await flush() }

beforeEach(() => {
  pending = []
  HTMLImageElement.prototype.decode = function () { return new Promise(resolve => pending.push(resolve)) }
})
afterEach(() => {
  delete HTMLImageElement.prototype.decode
  document.body.innerHTML = ''
  delete window.__parallax
})

const cover = (url) => ({ url, kind: 'cover', depth: 1 })
/** What the class sees under everything else: a flat layer still on screen with an old picture. */
const staleFlat = (flat) => flat.style.opacity !== '0'

function stage () {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 1000 })
  Object.defineProperty(host, 'clientHeight', { value: 500 })
  const flat = document.createElement('div')
  flat.style.backgroundImage = 'url(scene2.webp)'   // scene 2, a flat picture
  flat.style.opacity = '1'
  host.appendChild(flat)
  document.body.appendChild(host)
  return { host, flat }
}

describe('flat -> split (two panels) -> layered', () => {
  it('never shows the flat picture: the split hides it, and stays until the next panel is drawn', async () => {
    const { host, flat } = stage()

    // Scene 3: the split stage, two panels mounted at once.
    const split = new SplitStage(host, { editable: false })
    split.show({ split: { layout: 'cols2', at: [0.6] }, shots: [{ layers: [cover('left.webp')] }, { layers: [cover('right.webp')] }] })
    hideFlatLayers([flat])
    expect(host.querySelectorAll('.px-scene')).toHaveLength(2)
    expect(staleFlat(flat)).toBe(false)

    // Scene 4: a layered panel, its picture not decoded yet.
    const next = new ParallaxScene(host)
    next.show({ layers: [cover('scene4.webp')], entry: 'cut', replaces: outgoingStages(null, split), covers: [flat] })
    await flush()
    expect(host.querySelector('.lp-split')).not.toBeNull()   // the split is still what is on screen

    await decodeAll()
    expect(host.querySelector('.lp-split')).toBeNull()
    expect(host.querySelector('img[src="scene4.webp"]').closest('.px-scene').style.opacity).toBe('1')
    expect(staleFlat(flat)).toBe(false)
    next.destroy()
  })

  it('a split handed off under a slide stays underneath for the slide, then goes', async () => {
    const { host } = stage()
    const split = new SplitStage(host, { editable: false })
    split.show({ split: { layout: 'cols2', at: [0.6] }, shots: [{ layers: [cover('left.webp')] }, { layers: [cover('right.webp')] }] })
    outgoingStages(split).destroy(20)
    expect(host.querySelector('.lp-split')).not.toBeNull()
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(host.querySelector('.lp-split')).toBeNull()
  })

  it('nothing leaving hands over nothing', () => {
    expect(outgoingStages(null, undefined)).toBeNull()
  })
})

describe('the player wires it', () => {
  const src = readFileSync(resolve(process.cwd(), 'resources/js/lesson-player.js'), 'utf8')
  const body = (name) => src.slice(src.indexOf(`async ${name} (`), src.indexOf('\n    },\n', src.indexOf(`async ${name} (`)))

  it('a layered panel takes over from a split stage as well as from a panel', () => {
    expect(body('_showLayeredShot')).toMatch(/outgoingStages\(_parallax, _split\)/)
    expect(body('_showLayeredShot')).toMatch(/replaces: outgoing/)
  })

  it('a split stage hides the flat layers under it', () => {
    expect(body('_showSplit')).toMatch(/hideFlatLayers\(\[this\._bgLayerA, this\._bgLayerB\]\)/)
  })
})
