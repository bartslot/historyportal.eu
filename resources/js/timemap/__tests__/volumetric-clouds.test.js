import { describe, expect, it, vi } from 'vitest'
import {
  cloudHandover, createQualityGovernor, createVolumetricCloudLayer, volumetricFade,
  VOLUME_FULL_BELOW_M, VOLUME_NONE_ABOVE_M,
} from '../volumetric-clouds.js'

const R = 6371008.8
/** A map stub whose camera stands `altitude` metres above the sphere. */
const mapAt = (altitude) => {
  const map = {
    altitude,
    triggerRepaint: vi.fn(),
    get _camera() { return { transform: { cameraPosition: [0, 0, 1 + map.altitude / R] } } },
  }
  return map
}
const gl2 = { texStorage3D() {} }
const frame = { shaderData: { variantName: 'globe' }, defaultProjectionData: { mainMatrix: new Array(16).fill(0), projectionTransition: 1 } }
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

const fakeEngine = (overrides = {}) => {
  const engine = { ready: true, render: vi.fn(() => true), setOptions: vi.fn(), dispose: vi.fn(), ...overrides }
  return { engine, loadEngine: vi.fn(async () => ({ createCloudEngine: () => engine })) }
}

describe('volumetricFade', () => {
  it('is all 3D close in, all flat from orbit, and falls steadily between', () => {
    expect(volumetricFade(300e3)).toBe(1)
    expect(volumetricFade(VOLUME_FULL_BELOW_M)).toBe(1)
    expect(volumetricFade(VOLUME_NONE_ABOVE_M)).toBe(0)
    expect(volumetricFade(12000e3)).toBe(0)
    const mid = volumetricFade((VOLUME_FULL_BELOW_M + VOLUME_NONE_ABOVE_M) / 2)
    expect(mid).toBeCloseTo(0.5, 6)
    const span = VOLUME_NONE_ABOVE_M - VOLUME_FULL_BELOW_M
    expect(volumetricFade(VOLUME_FULL_BELOW_M + span * 0.3)).toBeGreaterThan(volumetricFade(VOLUME_FULL_BELOW_M + span * 0.7))
  })

  it('is 0, not NaN, when the height is unknown', () => {
    expect(volumetricFade(NaN)).toBe(0)
    expect(volumetricFade(undefined)).toBe(0)
  })
})

describe('createQualityGovernor', () => {
  const run = (governor, fps, frames) => { for (let i = 0; i < frames; i++) governor.sample(1000 / fps) }

  it('stays at full quality at a good frame rate', () => {
    const governor = createQualityGovernor()
    run(governor, 60, 1000)
    expect(governor.level).toBe(0)
  })

  it('steps down once per judgement at a low frame rate, and never back up', () => {
    const governor = createQualityGovernor({ window: 90, settle: 45 })
    run(governor, 20, 45 + 90)
    expect(governor.level).toBe(1)
    run(governor, 20, 45 + 90)
    expect(governor.level).toBe(2)
    run(governor, 60, 2000)
    expect(governor.level).toBe(2)
  })

  it('does not count a hidden tab or a stalled loader as slow frames', () => {
    const governor = createQualityGovernor()
    for (let i = 0; i < 500; i++) governor.sample(4000)
    expect(governor.level).toBe(0)
  })

  it('forgives the frames straight after a change', () => {
    const governor = createQualityGovernor({ window: 90, settle: 45 })
    run(governor, 5, 45)
    run(governor, 60, 90)
    expect(governor.level).toBe(0)
  })
})

describe('the cloud volume layer', () => {
  it('does not download the renderer from orbit', () => {
    const { loadEngine } = fakeEngine()
    const map = mapAt(9000e3)
    const layer = createVolumetricCloudLayer({ loadEngine })
    layer.onAdd(map, gl2)
    layer.render(gl2, frame)
    expect(loadEngine).not.toHaveBeenCalled()
    expect(cloudHandover(map)).toBe(0)
  })

  it('loads close in, draws, and tells the deck how much sky it took', async () => {
    const { engine, loadEngine } = fakeEngine()
    const map = mapAt(600e3)
    const layer = createVolumetricCloudLayer({ loadEngine })
    layer.onAdd(map, gl2)
    layer.render(gl2, frame)
    expect(loadEngine).toHaveBeenCalledTimes(1)
    expect(cloudHandover(map)).toBe(0)   // nothing drawn yet, so the deck keeps the whole sky
    await settle()

    layer.render(gl2, frame)
    expect(engine.render).toHaveBeenCalledTimes(1)
    expect(engine.render.mock.calls[0][1]).toBe(1)
    expect(cloudHandover(map)).toBe(1)

    map.altitude = (VOLUME_FULL_BELOW_M + VOLUME_NONE_ABOVE_M) / 2
    layer.render(gl2, frame)
    expect(cloudHandover(map)).toBeCloseTo(0.5, 6)

    map.altitude = 9000e3
    layer.render(gl2, frame)
    expect(cloudHandover(map)).toBe(0)
    expect(engine.render).toHaveBeenCalledTimes(2)
  })

  it('follows the teacher\'s Clouds slider without taking more sky from the deck', async () => {
    const { engine, loadEngine } = fakeEngine()
    const map = mapAt(600e3)
    const layer = createVolumetricCloudLayer({ loadEngine, deckOpacity: () => 0.4 })
    layer.onAdd(map, gl2)
    layer.render(gl2, frame)
    await settle()
    layer.render(gl2, frame)
    expect(engine.render.mock.calls[0][1]).toBeCloseTo(0.4, 6)
    expect(cloudHandover(map)).toBe(1)
  })

  it('leaves the deck alone while its textures are still loading', async () => {
    const { engine, loadEngine } = fakeEngine({ ready: false })
    const map = mapAt(600e3)
    const layer = createVolumetricCloudLayer({ loadEngine })
    layer.onAdd(map, gl2)
    layer.render(gl2, frame)
    await settle()
    layer.render(gl2, frame)
    expect(engine.render).not.toHaveBeenCalled()
    expect(cloudHandover(map)).toBe(0)
  })

  for (const [name, overrides] of [
    ['the renderer throws', { render: vi.fn(() => { throw new Error('shader rejected') }) }],
  ]) {
    it(`switches itself off and hands the sky back when ${name}`, async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { engine, loadEngine } = fakeEngine(overrides)
      const map = mapAt(600e3)
      const layer = createVolumetricCloudLayer({ loadEngine })
      layer.onAdd(map, gl2)
      layer.render(gl2, frame)
      await settle()
      layer.render(gl2, frame)
      expect(layer.status).toBe('off')
      expect(cloudHandover(map)).toBe(0)
      expect(engine.dispose).toHaveBeenCalled()
      layer.render(gl2, frame)
      expect(engine.render).toHaveBeenCalledTimes(1)
      warn.mockRestore()
    })
  }

  it('switches itself off when the download fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const map = mapAt(600e3)
    const layer = createVolumetricCloudLayer({ loadEngine: async () => { throw new Error('offline') } })
    layer.onAdd(map, gl2)
    layer.render(gl2, frame)
    await settle()
    expect(layer.status).toBe('off')
    expect(cloudHandover(map)).toBe(0)
    warn.mockRestore()
  })

  it('switches itself off when the frame rate stays low', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const now = vi.spyOn(performance, 'now')
    let clock = 1000
    now.mockImplementation(() => clock)
    const { engine, loadEngine } = fakeEngine()
    const map = mapAt(600e3)
    const layer = createVolumetricCloudLayer({ loadEngine })
    layer.onAdd(map, gl2)
    layer.render(gl2, frame)
    await settle()
    for (let i = 0; i < 400 && layer.status !== 'off'; i++) { clock += 60; layer.render(gl2, frame) }
    expect(layer.status).toBe('off')
    expect(cloudHandover(map)).toBe(0)
    // It tried half resolution before giving up.
    expect(engine.render.mock.calls.some((call) => call[3] === 1)).toBe(true)
    now.mockRestore()
    warn.mockRestore()
  })

  it('never starts without WebGL2', () => {
    const { loadEngine } = fakeEngine()
    const map = mapAt(600e3)
    const layer = createVolumetricCloudLayer({ loadEngine })
    layer.onAdd(map, {})
    layer.render({}, frame)
    expect(loadEngine).not.toHaveBeenCalled()
    expect(layer.status).toBe('off')
  })

  it('does not draw while the map is changing projection', async () => {
    const { engine, loadEngine } = fakeEngine()
    const map = mapAt(600e3)
    const layer = createVolumetricCloudLayer({ loadEngine })
    layer.onAdd(map, gl2)
    layer.render(gl2, frame)
    await settle()
    layer.render(gl2, { ...frame, defaultProjectionData: { ...frame.defaultProjectionData, projectionTransition: 0.5 } })
    expect(engine.render).not.toHaveBeenCalled()
    expect(cloudHandover(map)).toBe(0)
  })
})
