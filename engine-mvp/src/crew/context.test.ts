import { describe, expect, it } from 'vitest'
import { browserLang, buildContextFrom, buildGreeting, detectLang, diffObjects, logAction, seesLine, type Action, type Facts } from './context'

const base: Facts = { title: 'Untitled lesson', scenes: [{ id: 'a', title: 'Scene 1' }], current: 'a', scriptWords: 0, selected: null, objects: [], time: 0 }
const tree = { name: 'Tree (Ghibli, round)', kind: 'model', x: 1, z: 2, yaw: 90 }
const working: Facts = { ...base, title: 'De Nachtwacht', scenes: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }, { id: 'c', title: 'C' }], current: 'b', objects: ['Tree (Ghibli, round)'], selected: tree }

describe('buildGreeting', () => {
  it('asks what to make on an empty lesson, per language and voice', () => {
    expect(buildGreeting(base, 'en', 'sofie')).toMatch(/Sofie.*lesson or story/)
    expect(buildGreeting(base, 'nl', 'daan')).toMatch(/Daan.*Wat gaan we maken/)
    expect(buildGreeting(base, 'de', 'sofie')).toMatch(/Sofie.*Geschichte/)
  })
  it('names the lesson, scene and selection', () => {
    expect(buildGreeting(working, 'nl', 'sofie')).toBe("Je werkt aan 'De Nachtwacht', scène 2 van 3. Tree (Ghibli, round) is geselecteerd: wat gaan we ermee doen?")
    expect(buildGreeting(working, 'en', 'daan')).toContain("scene 2 of 3")
    expect(buildGreeting({ ...working, selected: null }, 'de', 'daan')).toBe("Du arbeitest an 'De Nachtwacht', Szene 2 von 3. Was brauchst du?")
  })
  it('talks about the selected object when there is no title', () => {
    expect(buildGreeting({ ...base, selected: tree, objects: ['x'] }, 'en', 'sofie')).toBe('Tree (Ghibli, round) is selected. What shall we do with it?')
  })
  it('handles an untitled lesson with things on stage', () => {
    expect(buildGreeting({ ...base, objects: ['a', 'b'] }, 'en', 'sofie')).toMatch(/^Scene 1 of 1, 2 objects on stage\./)
  })
  it('uses no em dashes or emoji', () => {
    for (const l of ['en', 'nl', 'de'] as const) for (const w of ['sofie', 'daan'] as const)
      for (const f of [base, working]) expect(buildGreeting(f, l, w)).not.toMatch(/[—\u{1F300}-\u{1FAFF}]/u)
  })
})

describe('language', () => {
  it('detects from the text and falls back', () => {
    expect(detectLang('Is dit passend voor 1642?')).toBe('nl')
    expect(detectLang('Kannst du das bitte machen und ein Bild')).toBe('de')
    expect(detectLang('Make the tree bigger please')).toBe('en')
    expect(detectLang('1642')).toBeNull()
    expect(browserLang('nl-NL')).toBe('nl')
    expect(browserLang('fr-FR')).toBe('en')
  })
})

describe('logAction', () => {
  it('keeps 10, newest first', () => {
    let l: Action[] = []
    for (let i = 0; i < 12; i++) l = logAction(l, `a${i}`, i)
    expect(l).toHaveLength(10)
    expect(l[0].what).toBe('a11')
  })
  it('collapses consecutive changes of the same control', () => {
    let l = logAction([], 'selected Tree', 1)
    l = logAction(l, 'set Time to 0.10', 2, 'time')
    l = logAction(l, 'set Time to 0.40', 3, 'time')
    expect(l.map((a) => a.what)).toEqual(['set Time to 0.40', 'selected Tree'])
    expect(l[0].at).toBe(3)
    l = logAction(l, 'set Fog to 0.5', 4, 'fog')
    l = logAction(l, 'set Time to 0.9', 5, 'time')
    expect(l).toHaveLength(4)
  })
})

describe('diffObjects', () => {
  it('reports added and removed objects', () => {
    const o = (id: string) => ({ id, name: `N${id}` })
    expect(diffObjects([o('1')], [o('1'), o('2')])).toEqual(['added N2'])
    expect(diffObjects([o('1'), o('2')], [o('1')])).toEqual(['removed N2'])
    expect(diffObjects([], [o('1'), o('2'), o('3')])).toEqual(['added 3 objects'])
  })
})

describe('buildContextFrom', () => {
  it('shapes the contract and caps it', () => {
    const f: Facts = { ...working, title: 'x'.repeat(500), objects: Array.from({ length: 60 }, (_, i) => `o${i}`) }
    const c = buildContextFrom(f, [{ at: 7000, what: 'selected Tree' }], 10000)
    expect(c.lesson.title.length).toBeLessThanOrEqual(120)
    expect(c.objects).toHaveLength(40)
    expect(c.lesson.currentTitle).toBe('B')
    expect(c.recent).toEqual([{ ago: 3, what: 'selected Tree' }])
    expect(c.selected?.name).toBe('Tree (Ghibli, round)')
    expect('step' in c).toBe(false)
  })
})

describe('seesLine', () => {
  it('summarises scene and selection', () => {
    expect(seesLine(working)).toBe('Scene 2 of 3 · Tree (Ghibli, round) selected')
    expect(seesLine(base)).toBe('Scene 1 of 1 · empty stage')
  })
})

describe('greetings speak plainly', () => {
  it('never use crew jargon a teacher has to decode', async () => {
    const src = (await import('node:fs')).readFileSync(new URL('./context.ts', import.meta.url), 'utf8')
    expect(src).not.toMatch(/\bover\?|cue|Places, please|Op jullie plaatsen|Auf die Plätze|quiet on set|stil op de set|ruhig am Set/i)
  })
})
