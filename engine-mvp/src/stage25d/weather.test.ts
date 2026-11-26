import { describe, expect, it } from 'vitest'
import { daylightOf } from './daylight'
import { boxOf, slabsOf, velocityOf, WEATHER_DEFAULTS, weatherOf } from './weather'
import { DEPTH_Z } from './layout'

describe('weather: snow and rain in the air in front of the camera', () => {
  it('no kind, an unknown kind or an amount of 0 is dry', () => {
    expect(weatherOf(undefined)).toBeNull()
    expect(weatherOf({ kind: 'hail' as never })).toBeNull()
    expect(weatherOf({ kind: 'snow', amount: 0 })).toBeNull()
  })

  it('a kind alone takes the defaults; numbers out of range are held to it', () => {
    expect(weatherOf({ kind: 'snow' })).toEqual({ kind: 'snow', ...WEATHER_DEFAULTS })
    expect(weatherOf({ kind: 'rain', amount: 7, wind: -9, size: 0, speed: 'x' as never })).toEqual({ kind: 'rain', amount: 1, wind: -1, size: 0.4, speed: WEATHER_DEFAULTS.speed })
  })

  it('the scene light carries it, and falling weather softens the shadows', () => {
    const dry = daylightOf({ daylight: { time: 'day' } })
    const wet = daylightOf({ daylight: { time: 'day', weather: { kind: 'snow', amount: 1 } } })
    expect(dry.weather).toBeNull()
    expect(wet.weather?.kind).toBe('snow')
    expect(wet.shadowK).toBeCloseTo(dry.shadowK * 0.5)
  })

  it('rain falls much faster than snow, and the wind blows it sideways', () => {
    const snow = velocityOf(weatherOf({ kind: 'snow', wind: 1 })!)
    const rain = velocityOf(weatherOf({ kind: 'rain', wind: -1 })!)
    expect(rain[1]).toBeLessThan(snow[1] * 4)
    expect(snow[0]).toBeGreaterThan(0)
    expect(rain[0]).toBeLessThan(0)
  })

  it('the slabs run on from each other, their edges just in front of the stage depths, and fill the frame', () => {
    for (const kind of ['snow', 'rain'] as const) {
      const slabs = slabsOf(kind)
      slabs.slice(1).forEach((s, i) => expect(s.near).toBe(slabs[i].far))
      for (const z of [DEPTH_Z.near, DEPTH_Z.fg, DEPTH_Z.mid, DEPTH_Z.bg]) expect(slabs.some((s) => s.far < z && s.far > z - 2.5)).toBe(true)
      for (const s of slabs) {
        const [w, h, d] = boxOf(s)
        expect(w).toBeGreaterThan(2 * s.far * Math.tan((50 * Math.PI) / 360) * (16 / 9))
        expect(h).toBeGreaterThan(2 * s.far * Math.tan((50 * Math.PI) / 360))
        expect(d).toBeCloseTo(s.far - s.near)
      }
    }
  })
})
