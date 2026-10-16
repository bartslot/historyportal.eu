import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cameraSpec } from '../camera.js'
import { ParallaxScene } from '../ParallaxScene.js'

/**
 * Hold means NOTHING moves (Bart, 2026-10-16: "it's still moving, but without the layers").
 *
 * A scene had two background motions: the shot camera, which moves the plate and the figures as
 * one picture, and an older Ken Burns drift (`scenes.kb_animated`, on by default) that moved only
 * the plate. With the camera on Hold the drift still ran, so the backdrop slid under figures that
 * stood still. The drift is retired: the camera is the one control, and Hold is its default.
 */

// What the player and the editor preview hand ParallaxScene for every scene now.
const STILL = { panX: 0, panY: 0, zoom: 1 }
const REST = 'translate3d(0%, 0%, 0) scale(1)'

afterEach(() => { document.body.innerHTML = '' })

describe('camera default', () => {
  it('a scene with no camera, an empty camera or an explicit Hold resolves to a still camera', () => {
    for (const c of [undefined, null, {}, { move: 'hold' }, { move: 'hold', amount: 2 }]) {
      expect(cameraSpec(c)).toBeNull()
    }
  })
})

describe('a held shot', () => {
  it('keeps every backdrop plane at rest from the first word of the narration to the last', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const scene = new ParallaxScene(host)
    scene.show({
      layers: [
        { url: 'sky.png', kind: 'cover', depth: 0 },
        { url: 'room.png', kind: 'cover', depth: 1 },
        { url: 'floor.svg', kind: 'strip', depth: 1.6, height: 20 },
      ],
      motion: STILL,
      camera: { move: 'hold' },
    })
    const planes = [...host.querySelector('.px-scene').children]

    for (const progress of [0, 0.25, 0.5, 1]) {
      scene.update(progress)
      for (const plane of planes) expect(plane.style.transform).toBe(REST)
    }
    scene.destroy()
  })
})

describe('no Ken Burns behind the camera', () => {
  // The root cause, kept out: neither renderer reads the old per-scene drift setting any more,
  // so a held scene cannot pan its backdrop under figures that stand still.
  for (const file of ['resources/js/lesson-player.js', 'resources/js/scene/wizard-bridge.js']) {
    it(`${file} never reads kb_animated / kb_direction`, () => {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8')
      expect(src).not.toMatch(/kb_animated|kbAnimated|kb_direction|kbDirection/)
    })
  }
})
