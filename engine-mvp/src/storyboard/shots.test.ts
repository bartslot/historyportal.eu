import { describe, expect, it } from 'vitest'
import { castOf, letter, nodesOfJson, shotData, shotOfLine, shotsOf, stagingOf, type ScriptNode } from './shots'
import { solve } from '../blockout/solve'

const head = (sceneId: string): ScriptNode => ({ type: 'sceneHeading', attrs: { sceneId }, text: '' })
const line = (id: string, text: string, attrs: Record<string, unknown> = {}): ScriptNode => ({ type: 'paragraph', attrs: { id, ...attrs }, text })

const doc = [
  head('s1'),
  line('a', 'At the town gate, a guildsman pushes a paper against Dante.'),
  line('b', 'Prior, my guild wants the other family out.', { speaker: 'Guildsman' }),
  line('c', 'They made me prior to keep order.', { speaker: 'Dante' }),
  line('d', 'Then the other side will pick you.', { speaker: 'Guildsman', cut: false }),
  line('e', '   '),
  head('s2'),
  line('f', 'On the road in Italy, about 1308.', { speaker: 'Narrator' }),
  line('g', 'I ride for Florence at dawn.', { speaker: 'Merchant', cut: false }),
]

describe('shot letters', () => {
  it('counts A..Z then AA', () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(letter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA'])
  })

  it('gives every line that cuts a frame, restarting the letters per scene', () => {
    const shots = shotsOf(doc)
    expect(shots.map((s) => `${s.sceneId}:${s.letter}:${s.lineIds.join('+')}`)).toEqual(['s1:A:a', 's1:B:b', 's1:C:c+d', 's2:A:f+g'])
  })

  it('links a line to its frame: a line inside a shot finds the shot, the shot lists the line', () => {
    const shots = shotsOf(doc)
    expect(shotOfLine(shots, 'd')?.id).toBe('c')
    expect(shotOfLine(shots, 'e')).toBeNull() // an empty line is no line
  })

  it('adding a line adds a frame, removing it removes the frame', () => {
    const added = [...doc.slice(0, 3), line('x', 'A new line.'), ...doc.slice(3)]
    expect(shotsOf(added).filter((s) => s.sceneId === 's1').map((s) => s.letter + s.id)).toEqual(['Aa', 'Bb', 'Cx', 'Dc'])
    const removed = doc.filter((n) => n.attrs?.id !== 'b')
    expect(shotsOf(removed).filter((s) => s.sceneId === 's1').map((s) => s.letter + s.id)).toEqual(['Aa', 'Bc'])
  })

  it('the first line of a scene always cuts, even when marked as the same shot', () => {
    const shots = shotsOf([head('s'), line('a', 'one', { cut: false }), line('b', 'two', { cut: false })])
    expect(shots.map((s) => s.lineIds)).toEqual([['a', 'b']])
  })

  it('reads TipTap JSON', () => {
    const json = { type: 'doc', content: [{ type: 'sceneHeading', attrs: { sceneId: 's' } }, { type: 'paragraph', attrs: { id: 'p', speaker: null }, content: [{ type: 'text', text: 'Hi' }] }] }
    expect(shotsOf(nodesOfJson(json))).toEqual([{ id: 'p', sceneId: 's', letter: 'A', lineIds: ['p'], speaker: null }])
  })
})

describe('shot data', () => {
  it("casts the scene's speakers and the lesson's speakers its lines name", () => {
    expect(castOf(doc, 's1')).toEqual(['Guildsman', 'Dante'])
    expect(castOf(doc, 's2')).toEqual(['Merchant'])
  })

  it("frames the narrator wide on the whole cast, a spoken line over the listener's shoulder", () => {
    const shots = shotsOf(doc)
    expect(shotData(shots[0], doc, undefined).camera).toEqual({ shot: 'wide', subjects: ['guildsman', 'dante'] })
    expect(shotData(shots[2], doc, undefined).camera).toEqual({ shot: 'over-shoulder', subjects: ['guildsman', 'dante'] })
  })

  it('keeps what the teacher directed', () => {
    const shots = shotsOf(doc)
    const directed = { camera: { shot: 'close-up' as const, subjects: ['dante'] }, objects: [], needs: [], directed: true }
    expect(shotData(shots[2], doc, { c: directed })).toBe(directed)
  })

  it('lists every character and every set piece without a real asset as needed, with the period', () => {
    const d = shotData(shotsOf(doc)[0], doc, undefined, '1300s Florence')
    expect(d.needs).toEqual([
      { name: 'Wall (4 m)', type: 'set', period: '1300s Florence' },
      { name: 'Guildsman', type: 'character', period: '1300s Florence' },
      { name: 'Dante', type: 'character', period: '1300s Florence' },
    ])
  })

  it('stages any cast size without anyone standing in another', () => {
    for (const n of [0, 1, 2, 3, 5]) {
      const cast = Array.from({ length: n }, (_, i) => `P${i}`)
      const r = solve(stagingOf(cast))
      expect(r.problems).toEqual([])
      expect(Object.values(r.placed).filter((p) => p.kit === 'figure')).toHaveLength(Math.max(1, n))
    }
  })
})
