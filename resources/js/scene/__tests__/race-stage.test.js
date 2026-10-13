import { describe, it, expect, vi, afterEach } from 'vitest'
import { RaceStage } from '../race-stage.js'

/** An ArtworkOverlay stand-in: renders a node per layer with the overlay's own data-layer-id. */
function fakeOverlay (host) {
  return {
    layers: [],
    speeds: [],
    setLayers (layers) {
      this.layers = layers
      host.replaceChildren(...layers.map(l => {
        const node = document.createElement('div')
        node.dataset.layerId = `art_${l.asset_id}`
        return node
      }))
    },
    setSpeed (id, v) { this.speeds.push([id, v]) },
  }
}

afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers() })

describe('the race on the panel', () => {
  const setup = () => {
    const stage = document.createElement('div')
    const host = document.createElement('div')
    Object.defineProperty(host, 'clientWidth', { value: 1000 })
    stage.appendChild(host)
    document.body.appendChild(stage)
    const overlay = fakeOverlay(host)
    const race = new RaceStage({ overlay, host })
    const ship = { asset_id: 136, x: 70, y: 58, height: 28, url: '/s.webp' }
    const figure = { asset_id: 148, x: 30, y: 60, height: 90, url: '/f.webp' }
    race.open({ layers: [ship, figure], ship, lanes: 3, startX: 20, finishX: 120, names: ['Team 1', 'Team 2', 'Team 3'] })
    return { stage, host, overlay, race }
  }

  it('replaces the ship by one lane per team and keeps the other figures', () => {
    const { overlay, stage } = setup()
    expect(overlay.layers.map(l => String(l.asset_id))).toEqual(['148', '136~0', '136~1', '136~2'])
    expect([...stage.querySelectorAll('[data-race-chip]')].map(c => c.textContent)).toEqual(['Team 1', 'Team 2', 'Team 3'])
  })

  it('a lane moves with its meter, its chip along, and a gain shows in the bow wave', () => {
    vi.useFakeTimers()
    const { race, stage, overlay } = setup()
    race.update([0, 0.5, 0])
    expect(race.node(1).style.translate).toBe('500px 0px')
    expect(stage.querySelector('[data-race-chip="1"]').style.translate).toBe('500px 0px')
    expect(overlay.speeds.at(-1)).toEqual(['136~1', 1])
    vi.advanceTimersByTime(1000)
    expect(overlay.speeds.at(-1)).toEqual(['136~1', 0])
  })

  it('names the crews and sails every lane out, then cleans up', async () => {
    vi.useFakeTimers()
    const { race, stage } = setup()
    race.label(2, 'Team 3 · Heemskerck')
    expect(stage.querySelector('[data-race-chip="2"]').textContent).toBe('Team 3 · Heemskerck')
    const out = race.sailOut(130, 2)
    expect(race.node(0).style.translate).toBe('1100px 0px')
    vi.advanceTimersByTime(2000)
    await out
    race.close()
    expect(stage.querySelector('[data-race-chips]')).toBeNull()
  })
})
