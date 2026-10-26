import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  cameraSpec, cameraPose, chainPose, cameraFrame, cameraEntry, entryLingerMs, previewCycleS,
  CAMERA_MOVES, CAMERA_AMP, MOVE_DURATION_S, ENTRY_MS,
} from '../camera.js'
import { ParallaxScene } from '../ParallaxScene.js'
import { ArtworkOverlay } from '../ArtworkOverlay.js'

afterEach(() => {
  delete window.matchMedia
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('cameraSpec (pure)', () => {
  it('is null for a still camera or anything it does not know', () => {
    for (const c of [null, undefined, {}, { move: 'hold' }, { move: 'spin' }, 'push']) {
      expect(cameraSpec(c)).toBeNull()
    }
  })

  it('fills each move\'s own defaults: duration per move, smooth easing, no delay, amount 1', () => {
    expect(cameraSpec({ move: 'push' })).toEqual({ move: 'push', amount: 1, duration: MOVE_DURATION_S.push, delay: 0, ease: 'move' })
    expect(cameraSpec({ move: 'shake' }).duration).toBe(MOVE_DURATION_S.shake)
  })

  it('clamps amount, duration and delay, and drops an unknown ease', () => {
    expect(cameraSpec({ move: 'pan-r', amount: 9, duration: 0, delay: -4, ease: 'bouncy' }))
      .toEqual({ move: 'pan-r', amount: 2, duration: 0.3, delay: 0, ease: 'move' })
  })
})

describe('cameraPose (pure)', () => {
  const at = (camera, t) => cameraPose(cameraSpec(camera), t)

  it('push zooms in from 1 to 1 + zoom over the duration, eased, then holds', () => {
    const c = { move: 'push', duration: 4 }
    expect(at(c, 0).zoom).toBe(1)
    expect(at(c, 2).zoom).toBeCloseTo(1 + CAMERA_AMP.zoom / 2, 6)   // power2.inOut is symmetric
    expect(at(c, 1).zoom - 1).toBeLessThan(CAMERA_AMP.zoom / 4)     // eased: slow start
    expect(at(c, 4).zoom).toBeCloseTo(1 + CAMERA_AMP.zoom, 6)
    expect(at(c, 40).zoom).toBeCloseTo(1 + CAMERA_AMP.zoom, 6)
  })

  it('pull is push backwards: it starts in close and ends at rest', () => {
    expect(at({ move: 'pull', duration: 4 }, 0).zoom).toBeCloseTo(1 + CAMERA_AMP.zoom, 6)
    expect(at({ move: 'pull', duration: 4 }, 4).zoom).toBeCloseTo(1, 6)
  })

  it('pans and tilts travel the picture through the centre, opposite to the camera', () => {
    expect(at({ move: 'pan-r', duration: 2 }, 0).panX).toBeCloseTo(CAMERA_AMP.pan, 6)
    expect(at({ move: 'pan-r', duration: 2 }, 2).panX).toBeCloseTo(-CAMERA_AMP.pan, 6)
    expect(at({ move: 'pan-l', duration: 2 }, 2).panX).toBeCloseTo(CAMERA_AMP.pan, 6)
    expect(at({ move: 'tilt-up', duration: 2 }, 2).panY).toBeCloseTo(CAMERA_AMP.pan, 6)
    expect(at({ move: 'tilt-down', duration: 2 }, 2).panY).toBeCloseTo(-CAMERA_AMP.pan, 6)
  })

  it('waits for its delay, and scales with amount', () => {
    expect(at({ move: 'push', delay: 3, duration: 2 }, 2.9).zoom).toBe(1)
    expect(at({ move: 'push', amount: 2, duration: 2 }, 2).zoom).toBeCloseTo(1 + 2 * CAMERA_AMP.zoom, 6)
    expect(at({ move: 'push', amount: 0, duration: 2 }, 2).zoom).toBe(1)
  })

  it('shake jolts and then settles exactly back to centre', () => {
    const c = { move: 'shake', duration: 1 }
    const mid = [0.2, 0.3, 0.45].map(t => at(c, t))
    expect(mid.some(p => Math.abs(p.panX) > 0.1)).toBe(true)
    for (const p of mid) expect(Math.abs(p.panX)).toBeLessThanOrEqual(CAMERA_AMP.shake + 1e-9)
    expect(at(c, 1)).toMatchObject({ panX: 0, panY: 0, zoom: 1 })
    expect(at(c, 5)).toMatchObject({ panX: 0, panY: 0 })
  })

  it('a still camera is the rest pose', () => {
    expect(cameraPose(null, 3)).toEqual({ panX: 0, panY: 0, truckX: 0, truckY: 0, zoom: 1 })
  })
})

describe('cameraFrame (pure): parallax by depth stays right during the move', () => {
  it('a pan moves every depth the same (the camera turns, nothing parallaxes)', () => {
    const pose = { panX: 2, panY: 0, truckX: 0, truckY: 0, zoom: 1 }
    expect(cameraFrame(pose, 0).translateX).toBe(2)
    expect(cameraFrame(pose, 1.5).translateX).toBe(2)
  })

  it('a truck moves each plane by its depth: sky pinned, foreground most', () => {
    const pose = cameraPose(cameraSpec({ move: 'truck-r', duration: 2 }), 0)
    expect(cameraFrame(pose, 0).translateX).toBe(0)
    expect(cameraFrame(pose, 2).translateX).toBeCloseTo(2 * cameraFrame(pose, 1).translateX, 6)
  })

  it('a push scales each plane by its depth', () => {
    const pose = { panX: 0, panY: 0, truckX: 0, truckY: 0, zoom: 1.1 }
    expect(cameraFrame(pose, 0).scale).toBe(1)
    expect(cameraFrame(pose, 1).scale).toBeCloseTo(1.1, 6)
    expect(cameraFrame(pose, 2).scale).toBeCloseTo(1.2, 6)
  })

  it('stays inside the 6% plate bleed at the highest amount, for every move', () => {
    for (const move of CAMERA_MOVES) {
      const spec = cameraSpec({ move, amount: 2 })
      if (!spec) continue
      for (let t = 0; t <= spec.duration; t += spec.duration / 40) {
        const f = cameraFrame(cameraPose(spec, t), 1)
        expect(Math.abs(f.translateX)).toBeLessThanOrEqual(6)
        expect(Math.abs(f.translateY)).toBeLessThanOrEqual(6)
      }
    }
  })
})

describe('panel entry', () => {
  it('normalises to the known entries, fade by default', () => {
    expect(cameraEntry('reveal')).toBe('reveal')
    expect(cameraEntry('explode')).toBe('fade')
    expect(cameraEntry(null)).toBe('fade')
  })

  it('keeps the panel before on screen only while a slide, wipe or dissolve covers it', () => {
    expect(entryLingerMs('fade')).toBe(0)
    expect(entryLingerMs('cut')).toBe(0)
    expect(entryLingerMs('slide')).toBe(ENTRY_MS.slide)
    expect(entryLingerMs('match')).toBe(ENTRY_MS.match)
  })

  it('a preview cycle is the move plus a short rest', () => {
    expect(previewCycleS(cameraSpec({ move: 'push', duration: 4, delay: 1 }))).toBeCloseTo(6.5, 6)
  })
})

describe('ParallaxScene + ArtworkOverlay play one camera', () => {
  const rafQueue = () => {
    const q = []
    vi.stubGlobal('requestAnimationFrame', (cb) => { q.push(cb); return q.length })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    return q
  }
  // The panel, and its camera, start once its pictures are drawn (ParallaxScene `shown`).
  const drawn = () => new Promise(resolve => setTimeout(resolve, 0))

  it('drives the planes from its own clock and ignores narration progress', async () => {
    const q = rafQueue()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const scene = new ParallaxScene(host)
    scene.show({ layers: [{ url: 'sea.png', kind: 'cover', depth: 1 }], camera: { move: 'push', duration: 1 } })
    await drawn()
    const plane = host.querySelector('.px-layer')
    expect(plane.style.transform).toContain('scale(1)')

    vi.spyOn(performance, 'now').mockReturnValue(performance.now())
    const start = performance.now()
    q.splice(0).forEach(cb => cb(start + 1000))       // the end of the move
    expect(plane.style.transform).toContain(`scale(${1 + CAMERA_AMP.zoom})`)

    scene.update(0)                                   // narration progress: no effect
    expect(plane.style.transform).toContain(`scale(${1 + CAMERA_AMP.zoom})`)
    vi.unstubAllGlobals()
  })

  it('a finished move applies its last pose once and stops asking for frames; a shake ends at rest', async () => {
    const q = rafQueue()
    const host = document.createElement('div')
    document.body.appendChild(host)
    const frames = []
    const scene = new ParallaxScene(host)
    scene.show({
      layers: [{ url: 'sea.png', kind: 'cover', depth: 1 }],
      camera: { move: 'shake', duration: 1 },
      onCameraFrame: (f) => frames.push(f(1)),
    })
    await drawn()
    const start = performance.now()
    q.splice(0).forEach(cb => cb(start + 300))      // mid-shake
    expect(q).toHaveLength(1)                       // still moving: one more frame asked for
    q.splice(0).forEach(cb => cb(start + 1500))     // past the end
    expect(q).toHaveLength(0)                       // done: no more frames
    expect(frames.at(-1)).toEqual({ translateX: 0, translateY: 0, scale: 1 })
    expect(host.querySelector('.px-layer').style.transform).toMatch(/translate3d\(0%, 0%, 0(px)?\) scale\(1\)/)
    vi.unstubAllGlobals()
  })

  it('a looping editor preview keeps asking for frames', async () => {
    const q = rafQueue()
    const host = document.createElement('div')
    new ParallaxScene(host).show({ layers: [{ url: 'sea.png', kind: 'cover' }], camera: { move: 'push', duration: 1 }, loop: true })
    await drawn()
    const start = performance.now()
    q.splice(0).forEach(cb => cb(start + 5000))
    expect(q).toHaveLength(1)
    vi.unstubAllGlobals()
  })

  it('gives a cover plate bleed even with Ken Burns off, so a pan never shows an edge', () => {
    rafQueue()
    const host = document.createElement('div')
    new ParallaxScene(host).show({ layers: [{ url: 'sea.png', kind: 'cover' }], camera: { move: 'pan-r' } })
    expect(host.querySelector('.px-layer-bg').style.inset).toBe('-6%')
    vi.unstubAllGlobals()
  })

  it('reduced motion holds the camera still', () => {
    window.matchMedia = vi.fn().mockImplementation((q) => ({ matches: q.includes('reduce') }))
    const host = document.createElement('div')
    const scene = new ParallaxScene(host)
    scene.show({ layers: [{ url: 'sea.png', kind: 'cover' }], camera: { move: 'push' } })
    expect(scene._camera).toBeNull()
  })

  it('moves a figure in the overlay with the same frame, about the stage centre', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    host.getBoundingClientRect = () => ({ width: 1000, height: 500, left: 0, top: 0 })
    const overlay = new ArtworkOverlay(host, { readonly: true })
    overlay.setLayers([{ asset_id: 9, url: 'ship.png', x: 70, y: 50, depth: 1 }])
    const node = host.querySelector('[data-layer-id="art_9"]')

    overlay.setCamera(() => ({ translateX: 1, translateY: 0, scale: 1.1 }))
    // 1% of 1000 = 10px pan, plus (70% - 50%) x 1000 x 0.1 = 20px outward from the centre.
    expect(node.style.transform).toContain('calc(-50% + 30px)')
    expect(node.style.transform).toContain('scale(1.1)')

    overlay.setCamera(null)
    expect(node.style.transform).not.toContain('scale(1.1)')
  })

  it('looks the nodes and the stage box up once, and gives rebuilt nodes the last pose', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const rect = vi.fn(() => ({ width: 1000, height: 500, left: 0, top: 0 }))
    host.getBoundingClientRect = rect
    const overlay = new ArtworkOverlay(host, { readonly: true })
    overlay.setLayers([{ asset_id: 9, url: 'ship.png', x: 50, y: 50, depth: 1 }])
    const lookups = vi.spyOn(host, 'querySelectorAll')
    const frame = () => ({ translateX: 2, translateY: 0, scale: 1 })

    for (let i = 0; i < 10; i++) overlay.setCamera(frame)
    expect(lookups).toHaveBeenCalledTimes(1)
    const reads = rect.mock.calls.length

    overlay.setLayers([{ asset_id: 9, url: 'ship.png', x: 50, y: 50, depth: 1, opacity: 0.5 }])   // a rebuild
    const node = host.querySelector('[data-layer-id="art_9"]')
    expect(node.style.transform).toContain('calc(-50% + 20px)')        // the finished move's pose
    expect(rect.mock.calls.length).toBe(reads)                          // box not re-read

    overlay.setCamera(null)
    overlay.setLayers([{ asset_id: 9, url: 'ship.png', x: 50, y: 50, depth: 1 }])
    expect(host.querySelector('[data-layer-id="art_9"]').style.transform).not.toContain('20px')
  })
})

describe('chainPose (pure)', () => {
  it('starts a second move where the camera already is, then moves by that move alone', () => {
    const base = { panX: -4, panY: 0, truckX: 0, truckY: 0, zoom: 1.1 }
    const push = cameraSpec({ move: 'push', amount: 1, duration: 4 })
    expect(chainPose(base, push, 0)).toEqual(base)
    const end = chainPose(base, push, 4)
    expect(end.panX).toBe(-4)
    expect(end.zoom).toBeCloseTo(1.1 * cameraPose(push, 4).zoom)
    const pan = cameraSpec({ move: 'pan-r', amount: 1, duration: 4 })
    expect(chainPose(base, pan, 0).panX).toBeCloseTo(-4)
    expect(chainPose(null, pan, 4).panX).toBeCloseTo(cameraPose(pan, 4).panX - cameraPose(pan, 0).panX)
  })
})
