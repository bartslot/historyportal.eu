import { describe, it, expect } from 'vitest'
import { placeCard, CHROME } from '../card-place.js'

const stage = { w: 1440, h: 900 }
const card = { w: 576, h: 320 }
const ship = { rect: { x: 900, y: 400, w: 260, h: 240 }, weight: 3 }
const tasman = { rect: { x: 270, y: 430, w: 280, h: 470 } }

describe('where the moment card goes', () => {
  it('stays at the bottom centre over an empty panel', () => {
    expect(placeCard(stage, card).name).toBe('bottom-center')
  })

  it('moves off the ship that reacts', () => {
    expect(placeCard(stage, card, [ship]).name).toBe('bottom-left')
  })

  it('goes up when the ship and the speaking figure fill the bottom (Tasman S05-C)', () => {
    const spot = placeCard(stage, card, [ship, tasman])
    expect(spot.name).toBe('top-left')
    expect(spot.y).toBe(CHROME.top)
  })

  it('covers a figure rather than the ship when it must choose', () => {
    const wide = { w: 1440, h: 520 }
    const spot = placeCard(wide, { w: 700, h: 400 }, [{ rect: { x: 760, y: 0, w: 680, h: 520 }, weight: 3 }, { rect: { x: 0, y: 0, w: 700, h: 520 } }])
    expect(spot.x).toBeLessThan(720)
  })
})
