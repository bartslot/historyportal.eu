import { describe, expect, it } from 'vitest'
import { BEFORE_CAP, SKETCH_MAX, attachSketch, buildPartial, cleanSketch, parseEvent, reduceLive, reviseLine, splitLines, sweepInterrupted, upsertLine, type CrewEvent, type LiveMap } from './stream'

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

describe('buildPartial', () => {
  it('hands back the draft when there is one', () => {
    expect(buildPartial('a', { draft: 'Dusk', thinking: 'hm' })).toEqual({ who: 'a', text: 'Dusk' })
  })
  it('hands back the marked tail of the thinking when the draft is empty', () => {
    const p = buildPartial('a', { draft: '', thinking: 'x'.repeat(3000) + 'END' })
    expect(p.text.startsWith('(still thinking) ')).toBe(true)
    expect(p.text.endsWith('END')).toBe(true)
    expect(p.text.length).toBe('(still thinking) '.length + 1500)
  })
  it('is empty when nothing happened yet', () => {
    expect(buildPartial('a', { draft: '', thinking: '' }).text).toBe('')
  })
})

describe('upsertLine', () => {
  type T = { who: string; text: string; turn?: number; status?: 'working' }
  const w = (who: string, turn: number): T => ({ who, turn, text: 'ack', status: 'working' })
  it('replaces the in-flight line of that turn and member, keeping the index', () => {
    const lines: T[] = [{ who: 'client', text: 'q' }, w('a', 1), w('b', 1)]
    const r = upsertLine(lines, 1, { who: 'a', text: 'done' })
    expect(r.index).toBe(1)
    expect(r.lines.map((l) => l.text)).toEqual(['q', 'done', 'ack'])
    expect(lines[1].status).toBe('working')
  })
  it('appends when no in-flight line matches (other turn, or no turn)', () => {
    expect(upsertLine([w('a', 1)], 2, { who: 'a', text: 'x' }).index).toBe(1)
    expect(upsertLine([w('a', 1)], null, { who: 'a', text: 'x' }).lines).toHaveLength(2)
  })
})

describe('sweepInterrupted', () => {
  it('turns working lines into interrupted ones and leaves the rest alone', () => {
    const done = { who: 'a', text: 'ok' }
    const out = sweepInterrupted([done, { who: 'b', text: 'ack', status: 'working' as const }])
    expect(out[0]).toBe(done)
    expect(out[1]).toEqual({ who: 'b', text: 'ack', interrupted: true })
  })
  it('returns the same array when nothing was in flight', () => {
    const a = [{ who: 'a', text: 'ok' }]
    expect(sweepInterrupted(a)).toBe(a)
  })
})

describe('cleanSketch', () => {
  const ok = 'data:image/jpeg;base64,/9j/4AAQ'
  it('keeps an image data URL and cuts the caption', () => {
    expect(cleanSketch(ok, 'x'.repeat(400))).toEqual({ url: ok, caption: 'x'.repeat(300) })
  })
  it('drops other URLs, wrong types and oversize images', () => {
    expect(cleanSketch('/sketches/a.webp', 'c')).toBeNull()
    expect(cleanSketch('https://x.test/a.jpg', 'c')).toBeNull()
    expect(cleanSketch('data:text/html;base64,AAAA', 'c')).toBeNull()
    expect(cleanSketch(ok + 'A'.repeat(SKETCH_MAX), 'c')).toBeNull()
    expect(cleanSketch(5, 'c')).toBeNull()
  })
})

describe('reviseLine', () => {
  type T = { who: string; text: string; turn?: number; status?: 'working'; before?: string; revised?: boolean; sketch?: { url: string; caption: string } }
  const sk = { url: 'data:image/jpeg;base64,AA', caption: 'c' }
  it('replaces the finished line in place and keeps the first text as before', () => {
    const lines: T[] = [{ who: 'client', text: 'q' }, { who: 'a', turn: 1, text: 'first', sketch: sk }, { who: 'b', turn: 1, text: 'other' }]
    const r = reviseLine(lines, 1, { who: 'a', turn: 1, text: 'fixed' })
    expect(r.index).toBe(1)
    expect(r.lines[1]).toMatchObject({ text: 'fixed', before: 'first', revised: true, sketch: sk })
    expect(r.old?.text).toBe('first')
    expect(lines[1].text).toBe('first')
  })
  it('keeps the very first text when the line is revised twice, capped', () => {
    const first = reviseLine<T>([{ who: 'a', turn: 1, text: 'x'.repeat(5000) }], 1, { who: 'a', turn: 1, text: 'v2' })
    expect(first.lines[0].before).toHaveLength(BEFORE_CAP)
    const again = reviseLine(first.lines, 1, { who: 'a', turn: 1, text: 'v3' })
    expect(again.lines[0].before).toHaveLength(BEFORE_CAP)
  })
  it('appends when there is no finished line, and never touches a working one', () => {
    const w: T = { who: 'a', turn: 1, text: 'ack', status: 'working' }
    const r = reviseLine([w], 1, { who: 'a', turn: 1, text: 'fixed' })
    expect(r.index).toBe(1)
    expect(r.old).toBeNull()
  })
})

describe('attachSketch', () => {
  it('puts the sketch on that member finished line of the turn, else returns null', () => {
    const sk = { url: 'data:image/jpeg;base64,AA', caption: 'c' }
    const lines: { who: string; turn: number; text: string; sketch?: typeof sk }[] = [{ who: 'set', turn: 1, text: 'built' }, { who: 'set', turn: 2, text: 'again' }]
    expect(attachSketch(lines, 1, 'set', sk)?.[0].sketch).toEqual(sk)
    expect(attachSketch(lines, 1, 'set', sk)?.[1].sketch).toBeUndefined()
    expect(attachSketch(lines, 3, 'set', sk)).toBeNull()
  })
})
