import { describe, expect, it } from 'vitest'
import { inStep, layout, lineAt, linesOf, LINE_GAP_SECONDS, reconcile, WORDS_PER_SECOND } from './narration'

const t = (text: string, subtitle = false) => ({ type: 'text', text, ...(subtitle ? { marks: [{ type: 'subtitle' }] } : {}) })
const p = (id: string, ...content: any[]) => ({ type: 'paragraph', attrs: { id }, content })
const h = (id: string, title = id) => ({ type: 'sceneHeading', attrs: { sceneId: id, title } })
const doc = { type: 'doc', content: [h('a'), p('1', t('Florence, 1300. '), t('Dante is nine', true), t('.')), { type: 'paragraph', attrs: { id: 'x' } }, h('b'), p('2', t('Twelve words make this line long enough to take a few seconds to say'))] }

describe('narration', () => {
  it('lines belong to the scene above them; empty paragraphs are not lines', () => {
    expect(linesOf(doc, 'a').map((l) => l.id)).toEqual(['1'])
    expect(linesOf(doc, 'b').map((l) => l.id)).toEqual(['2'])
  })
  it('only text marked as subtitle is the caption', () => {
    expect(linesOf(doc, 'a')[0].subtitle).toBe('Dante is nine')
  })
  it('lays lines end to end with a breath between, measured length winning over the estimate', () => {
    const lines = linesOf(doc, 'b')
    expect(layout(lines)[0].end).toBeCloseTo(14 / WORDS_PER_SECOND)
    const placed = layout([{ ...lines[0], dur: 2 }, { ...lines[0], id: '3', dur: 1 }])
    expect(placed[1].start).toBeCloseTo(2 + LINE_GAP_SECONDS)
    expect(lineAt(placed, 2.1)).toBeNull()
    expect(lineAt(placed, 2.5)?.id).toBe('3')
  })
  it('reorders sections with the tree, keeps their lines, adds new scenes and drops deleted ones', () => {
    const next = reconcile(doc, [{ id: 'b', title: 'Exile' }, { id: 'c', title: 'New' }])
    expect(next.content.map((n: any) => n.type === 'sceneHeading' ? `#${n.attrs.sceneId}:${n.attrs.title}` : n.attrs?.id ?? '_')).toEqual(['#b:Exile', '2', '#c:New', '_'])
    expect(inStep(next, [{ id: 'b', title: 'Exile' }, { id: 'c', title: 'New' }])).toBe(true)
    expect(inStep(doc, [{ id: 'b', title: 'b' }, { id: 'a', title: 'a' }])).toBe(false)
  })
})
