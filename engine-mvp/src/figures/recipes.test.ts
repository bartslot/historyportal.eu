import { describe, expect, it } from 'vitest'
import { expressionFor, figureRecipe, poseFor, RECIPES } from './recipes'

// cast lines as S4's lesson writer gives them (eerste-boeren, hunebedden, voc)
const CAST = [
  { id: 'oma', look: 'old woman, hide cloak, grey braid, kneels at the quern' },
  { id: 'jager', look: 'man 40s, spear, hide cape' },
  { id: 'hond', look: 'lean dog of the camp' },
  { id: 'kind-dorp', look: 'child 8, round house doorway' },
  { id: 'moeder', look: 'woman 30s, linen dress, sows and fishes' },
  { id: 'tasman', look: 'after the Cuyp 1637 portrait: black doublet, white collar, thin moustache' },
  { id: 'bootsman', look: 'boatswain, 40s, weathered, cap, rope over shoulder' },
  { id: 'waka', look: 'only at a distance, in waka; no invented faces' },
]

describe('any lesson character gets a recipe', () => {
  it('keeps the named recipes', () => expect(figureRecipe('voc-schipper')).toBe(RECIPES['voc-schipper']))
  it('is not a body for animals and far-off canoe crews', () => {
    expect(figureRecipe('hond', CAST)).toBeNull()
    expect(figureRecipe('waka', CAST, 'nl-golden-age')).toBeNull()
  })
  it('reads the look line: a woman, a child, an old woman', () => {
    expect(figureRecipe('moeder', CAST)!.beard).toBeNull()
    expect(figureRecipe('kind-dorp', CAST)!.scale).toBeLessThan(0.8)
    expect(figureRecipe('oma', CAST)!.dyes.hair).toBe('#b8b0a4')
  })
  it('dresses VOC officers in black with a hat and the Tasman moustache, sailors in a cap', () => {
    const t = figureRecipe('tasman', CAST, 'nl-golden-age')!
    expect([t.dyes.coat, t.hat, t.beard]).toEqual(['#2e2c2c', true, 'Facial_Hair_02'])
    expect(figureRecipe('bootsman', CAST, 'nl-golden-age')!.hatKind).toBe('Bucket_Hat')
  })
  it('is deterministic and varies between characters', () => {
    expect(figureRecipe('jager', CAST)).toEqual(figureRecipe('jager', CAST))
    const coats = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => figureRecipe(`boer-${id}`)!.dyes.coat))
    expect(coats.size).toBeGreaterThan(2)
  })
  it('maps unknown poses and expressions to ones the kit has', () => {
    expect([poseFor('dig'), poseFor('run'), poseFor('juggle')]).toEqual(['dig', 'walk', 'stand'])
    expect([expressionFor('tired'), expressionFor('bored'), expressionFor(undefined)]).toEqual(['tired', 'neutral', 'neutral'])
  })
})
