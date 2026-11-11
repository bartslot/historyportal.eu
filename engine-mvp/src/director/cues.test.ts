import { describe, expect, it } from 'vitest'
import bank from '../sound/bank.json'
import { direct } from './direct'
import { pickBeds, pickSfx } from './cues'
import type { Lesson, Scene } from './types'

const B = 'babylonia-old-babylonian'
const scene = (id: string, beat: Scene['beat'], narration: string, sky: string, needs: string[], extra: Partial<Scene> = {}): Scene => ({
  id, beat, narration, est_s: 8, camera: null, sound: null,
  set: { sky, layers: needs.map((need, i) => ({ need, asset: null, depth: i ? 'mid' as const : 'bg' as const, x: 0.5 })) },
  figures: [{ char: 'herder', pose: 'point', x: 0.4, depth: 'mid', facing: 'right' }],
  ...extra,
})

const LESSON: Lesson = {
  id: 'babylon-sound-test', lang: 'nl', bundle: B,
  scenes: [
    scene('sc01', 'hook', 'In de vroege ochtend loopt een herder met zijn geiten over de vlakte.', 'sky dawn', ['steppe grass dry !mesopotamia', 'goat herd'],
      { figures: [{ char: 'herder', pose: 'walk', x: 0.4, depth: 'mid', facing: 'right' }] }),
    scene('sc02', 'setup', 'Die nacht slapen ze in het kamp, dicht bij het vuur.', 'sky night stars', ['camp tent !mesopotamia', 'fire hearth']),
    scene('sc03', 'cause', 'Bij de rivier, in de schemer, gromt een leeuw tussen de struiken.', 'sky dusk', ['thicket river !mesopotamia', 'bush tamarisk']),
    scene('sc04', 'effect', 'Langs het kanaal groeit de gerst. De ossen trekken de ploeg.', 'sky noon', ['field barley canal !mesopotamia', 'ox']),
    scene('sc05', 'recap', 'In de schrijfschool drukt een leerling spijkerschrift in een kleitablet.', 'sky day', ['room school !mesopotamia', 'tablet writing'],
      { set: { sky: 'sky day', habitat: 'interior', layers: [{ need: 'room school !mesopotamia', asset: null, depth: 'bg', x: 0.5 }] } }),
  ],
}

const beds = (l: Lesson) => l.scenes.map((s) => s.sound!.ambience.map((a) => a.id))

describe('Babylonia sound bundle', () => {
  const directed = direct(LESSON)

  it('the director picks the Babylonia beds for each place, the steppe wind under them', () => {
    expect(beds(directed)).toEqual([
      ['steppe-wind', 'steppe-goats'],
      ['steppe-wind', 'herders-camp'],
      ['steppe-wind', 'river-thicket'],
      ['steppe-wind', 'canal-fields'],
      ['tablet-house'], // a closed room plays alone: no steppe wind indoors
    ])
  })

  it('is not abroad in Mesopotamia: no neutral air, nothing on the shopping list', () => {
    expect(beds(directed).flat()).not.toContain('neutral-air')
    expect((directed.needed_assets ?? []).filter((n) => n.layer === 'sound')).toEqual([])
  })

  it('a walking figure steps on dry earth, and the scene that names a lion gets its growl', () => {
    const sfx = directed.scenes.map((s) => s.sound!.sfx.map((x) => x.id))
    expect(sfx[0]).toContain('step-earth')
    expect(sfx[0]).not.toContain('step-grass')
    expect(sfx[2]).toContain('lion-growl')
    expect(sfx[4]).toContain('stylus-clay')
  })

  it('a Babylonia scene inside a Dutch lesson takes its own bundle\'s beds', () => {
    const s = { ...LESSON.scenes[3], bundle: B }
    expect(pickBeds(s, B, null).map((a) => a.id)).toEqual(['steppe-wind', 'canal-fields'])
    expect(pickBeds(LESSON.scenes[3], 'nl-prehistory', null)[0].id).toBe('neutral-air')
  })

  it('leaves the other bundles\' foley alone', () => {
    const walk = { ...LESSON.scenes[0], figures: [{ char: 'x', pose: 'walk', x: 0.4, depth: 'mid' as const, facing: 'right' as const }] }
    expect(pickSfx(walk, 0, 8, false, 'nl-prehistory').map((x) => x.id)).toEqual(['step-grass'])
    expect(pickSfx(walk, 0, 8, false).map((x) => x.id)).toEqual(['step-grass'])
  })

  it('every bed and sfx the director picks is in the bank, with an ElevenLabs file', () => {
    const entries = new Map([...bank.beds, ...bank.sfx].map((e) => [e.id, e as { file: string; source?: string }]))
    for (const s of directed.scenes) {
      for (const id of [...s.sound!.ambience.map((a) => a.id), ...s.sound!.sfx.map((x) => x.id)]) expect(entries.has(id)).toBe(true)
    }
    const own = [...bank.beds, ...bank.sfx].filter((e) => (e as { bundle?: string }).bundle === B)
    expect(own.length).toBe(29)
    own.forEach((e) => expect((e as { source?: string }).source).toBe('elevenlabs'))
  })
})
