import { describe, expect, it } from 'vitest'
import { parseEvent, reduceLive, splitLines, type CrewEvent, type LiveMap } from './stream'

const run = (evs: object[], asked = 'make it dusk'): LiveMap =>
  evs.reduce<LiveMap>((m, e) => { const p = parseEvent(JSON.stringify(e)); return p ? reduceLive(m, p, asked, 1) : m }, {})

describe('splitLines', () => {
  it('keeps a partial last line for the next chunk', () => {
    const a = splitLines('', '{"type":"turn"}\n{"type":"do')
    expect(a.lines).toEqual(['{"type":"turn"}'])
    const b = splitLines(a.rest, 'ne"}\n')
    expect(b.lines).toEqual(['{"type":"done"}'])
    expect(b.rest).toBe('')
  })
})

describe('parseEvent', () => {
  it('ignores invalid JSON, unknown types and wrong field types', () => {
    expect(parseEvent('{nope')).toBeNull()
    expect(parseEvent('{"type":"wat"}')).toBeNull()
    expect(parseEvent('{"type":"routed","who":3,"ack":"x"}')).toBeNull()
    expect(parseEvent('{"type":"jev","who":"a","score":7,"choice":"x"}')).toBeNull()
    expect(parseEvent('[]')).toBeNull()
  })
  it('keeps the whole message for applying', () => {
    const e = parseEvent('{"type":"message","turn":1,"who":"a","text":"hi","settings":[1]}') as Extract<CrewEvent, { type: 'message' }>
    expect(e.msg.settings).toEqual([1])
  })
})

describe('reduceLive', () => {
  it('follows one member through routed, thinking, text, jev, review, message', () => {
    const m = run([
      { type: 'routed', turn: 1, who: 'a', ack: 'On it' }, { type: 'start', turn: 1, who: 'a' },
      { type: 'thinking', turn: 1, who: 'a', text: 'hm ' }, { type: 'thinking', turn: 1, who: 'a', text: 'ok' },
      { type: 'text', turn: 1, who: 'a', text: 'Dusk' }, { type: 'jev', turn: 1, who: 'a', score: 0.9, choice: 'go' },
      { type: 'review', turn: 1, who: 'a', text: 'fine' }, { type: 'message', turn: 1, who: 'a', text: 'Dusk.' },
    ])
    expect(m.a).toMatchObject({ status: 'done', ack: 'On it', asked: 'make it dusk', thinking: 'hm ok', draft: 'Dusk', review: 'fine', jev: { score: 0.9 } })
  })
  it('keeps interleaved members apart and marks a stopped one', () => {
    const m = run([
      { type: 'routed', turn: 1, who: 'a', ack: 'A' }, { type: 'routed', turn: 1, who: 'b', ack: 'B' },
      { type: 'text', turn: 1, who: 'a', text: '1' }, { type: 'text', turn: 1, who: 'b', text: '2' },
      { type: 'stopped', turn: 1, who: 'a' },
    ])
    expect(m.a).toMatchObject({ status: 'stopped', draft: '1' })
    expect(m.b).toMatchObject({ status: 'working', draft: '2' })
  })
  it('records an error on its member and ignores a leftover from an older turn', () => {
    const m = run([
      { type: 'routed', turn: 2, who: 'a', ack: 'A' }, { type: 'text', turn: 1, who: 'a', text: 'old' },
      { type: 'error', turn: 2, who: 'a', error: 'boom' },
    ])
    expect(m.a).toMatchObject({ status: 'error', error: 'boom', draft: '' })
  })
  it('does not mutate its input', () => {
    const before = run([{ type: 'routed', turn: 1, who: 'a', ack: 'A' }])
    const snap = JSON.stringify(before)
    reduceLive(before, { type: 'text', turn: 1, who: 'a', text: 'x' })
    expect(JSON.stringify(before)).toBe(snap)
  })
})
