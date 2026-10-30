import { describe, expect, it } from 'vitest'
import { buildSelection, replaceLines, replaceSceneLines, selectionMessage, textOfLines } from './scriptEdit'

const p = (id: string, text: string, speaker: string | null = null) => ({ type: 'paragraph', attrs: { id, speaker, dur: null }, content: [{ type: 'text', text }] })
const h = (sceneId: string, title: string) => ({ type: 'sceneHeading', attrs: { sceneId, title } })
const doc = () => ({ type: 'doc', content: [h('a', 'One'), p('l1', 'old one'), p('l2', 'old two'), h('b', 'Two'), p('l3', 'keep me')] })
const kinds = (d: any) => d.content.map((n: any) => (n.type === 'sceneHeading' ? 'H:' + n.attrs.sceneId : n.content[0].text))

describe('replaceSceneLines', () => {
  it('replaces the scene under its heading and leaves the others', () => {
    const d = doc()
    const out = replaceSceneLines(d, 'a', [{ speaker: null, text: 'new 1' }, { speaker: 'Teo', text: 'new 2' }])
    expect(kinds(out)).toEqual(['H:a', 'new 1', 'new 2', 'H:b', 'keep me'])
    expect(out.content[2].attrs.speaker).toBe('Teo')
  })
  it('does not mutate the input', () => {
    const d = doc()
    const snapshot = JSON.stringify(d)
    replaceSceneLines(d, 'a', [{ speaker: null, text: 'x' }])
    expect(JSON.stringify(d)).toBe(snapshot)
  })
  it('gives every line a fresh unique id', () => {
    const out = replaceSceneLines(doc(), 'a', [{ speaker: null, text: 'x' }, { speaker: null, text: 'y' }])
    const ids = out.content.filter((n: any) => n.type === 'paragraph').map((n: any) => n.attrs.id)
    expect(ids).not.toContain('l1')
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('creates the heading with the scene title when the scene has none', () => {
    const out = replaceSceneLines({ type: 'doc', content: [h('a', 'One')] }, 'z', [{ speaker: null, text: 'x' }], 'Zed')
    expect(out.content.at(-2)).toEqual({ type: 'sceneHeading', attrs: { sceneId: 'z', title: 'Zed' } })
    expect(kinds(replaceSceneLines(null, 'z', [{ speaker: null, text: 'x' }]))).toEqual(['H:z', 'x'])
  })
})

describe('replaceLines', () => {
  it('replaces the selected lines at the first one and drops the rest of them', () => {
    const out = replaceLines(doc(), ['l1', 'l2'], [{ speaker: null, text: 'short' }])
    expect(kinds(out)).toEqual(['H:a', 'short', 'H:b', 'keep me'])
    expect(out.content[1].attrs.id).not.toBe('l1')
  })
  it('ignores unknown ids and returns the same document when none matches', () => {
    const d = doc()
    expect(replaceLines(d, ['nope'], [{ speaker: null, text: 'x' }])).toBe(d)
    expect(kinds(replaceLines(d, ['l3', 'nope'], [{ speaker: null, text: 'x' }]))).toEqual(['H:a', 'old one', 'old two', 'H:b', 'x'])
  })
  it('does not mutate the input', () => {
    const d = doc()
    const snapshot = JSON.stringify(d)
    replaceLines(d, ['l1'], [{ speaker: null, text: 'x' }])
    expect(JSON.stringify(d)).toBe(snapshot)
  })
})

describe('textOfLines and the selection request', () => {
  it('reads the old text of the lines', () => expect(textOfLines(doc(), ['l1', 'l2'])).toBe('old one old two'))
  it('caps the request like the server does and carries the scene', () => {
    const big = { type: 'doc', content: [h('a', 'One'), ...Array.from({ length: 60 }, (_, i) => p('l' + i, 'text ' + i))] }
    const s = buildSelection('rewrite', { text: 'x'.repeat(3000), lineIds: Array.from({ length: 30 }, (_, i) => 'l' + i), sceneId: 'a' }, big, 'H'.repeat(99))
    expect(s.text).toHaveLength(2000)
    expect(s.lineIds).toHaveLength(20)
    expect(s.how).toHaveLength(60)
    expect(s.scene).toHaveLength(40)
    expect(s.scene[0]).toEqual({ id: 'l0', speaker: null, text: 'text 0' })
  })
  it('words the chat line for each action', () => {
    expect(selectionMessage('rewrite', 'abc', 'Shorter')).toBe('Rewrite (Shorter): "abc"')
    expect(selectionMessage('check', 'abc')).toBe('Check the history of "abc"')
    expect(selectionMessage('ask', 'x'.repeat(200))).toMatch(/\.\.\."$/)
  })
})
