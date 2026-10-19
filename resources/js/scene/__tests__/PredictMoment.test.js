import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PredictMoment, readPredict, canSend, predictSession, answererFor, pollFeedback, askDevices, ANSWER_MAX,
} from '../PredictMoment.js'

const config = {
  question: 'What happens to the harvest if they let in even more water?',
  outcome: 'The harvest fell year after year.',
  debrief: 'Why did the harvest fall?',
  mode: 'paper',
  seconds: 60,
}

const flush = () => new Promise(r => setTimeout(r, 0))
const click = (host, selector) => host.querySelector(selector).click()
const type = (host, text) => {
  const area = host.querySelector('[data-predict-text]')
  area.value = text
  area.dispatchEvent(new Event('input'))
}
const buttonByText = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.includes(text))

/** A fake server: stores answers, grades a WHY on the second poll. */
function fakeServer () {
  const posts = []
  let polls = 0
  const fetchImpl = vi.fn(async (url, init) => {
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body)
      posts.push(body)
      return { ok: true, json: async () => ({ id: posts.length, status: body.phase === 'why' ? 'pending' : 'saved' }) }
    }
    polls++
    return { ok: true, json: async () => (polls < 2 ? { status: 'pending', feedback: null } : { status: 'graded', feedback: 'You named the salt. What does the water leave behind?' }) }
  })
  return { posts, fetchImpl }
}

const poll = { everyMs: 1, forMs: 200, sleep: () => Promise.resolve() }

describe('predict moment rules', () => {
  it('reads a config whatever came in', () => {
    expect(readPredict({ question: ' Q ', seconds: 9999, mode: 'x' })).toEqual({ question: 'Q', outcome: '', debrief: '', mode: 'paper', seconds: 600 })
    expect(readPredict({ mode: 'typed', seconds: 'x' }).seconds).toBe(60)
  })

  it('sends only something typed, at most 200 characters', () => {
    expect([canSend(''), canSend('   '), canSend('salt'), canSend('a'.repeat(ANSWER_MAX)), canSend('a'.repeat(ANSWER_MAX + 1))])
      .toEqual([false, false, true, true, false])
  })

  it('keeps one run token per lesson in the given storage', () => {
    const store = new Map()
    const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
    const first = predictSession(storage, 'ABC')
    expect(first).toMatch(/^[A-Za-z0-9-]{16,64}$/)
    expect(predictSession(storage, 'ABC')).toBe(first)
    expect(predictSession(storage, 'XYZ')).not.toBe(first)
    expect(predictSession(null, 'ABC')).toMatch(/^[A-Za-z0-9-]{16,64}$/)   // private mode still answers
  })

  it('names who answers on the board', () => {
    expect(answererFor('0')).toEqual({ answerer: 'class', label: 'Whole class' })
    expect(answererFor('3')).toEqual({ answerer: 'team', label: 'Team 3' })
  })

  it('polls until the feedback is there, and gives up in time', async () => {
    const { fetchImpl } = fakeServer()
    expect(await pollFeedback('/p/1', 's', { fetchImpl, ...poll })).toEqual({ status: 'graded', feedback: expect.stringContaining('salt') })
    const never = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'pending', feedback: null }) }))
    expect((await pollFeedback('/p/1', 's', { fetchImpl: never, everyMs: 5, forMs: 20 })).status).toBe('timeout')
    expect(never.mock.calls[0][0]).toBe('/p/1?session=s')
  })
})

describe('predict moment flows', () => {
  let host
  beforeEach(() => { host = document.createElement('div'); document.body.replaceChildren(host) })

  it('paper: question, writing clock, Show what happened; nothing is sent', async () => {
    const { fetchImpl } = fakeServer()
    const m = new PredictMoment(host, { storeUrl: '/lesson/X/predictions', session: 'run-0123456789abcdef', fetchImpl })
    const done = vi.fn()
    m.ask({ sceneId: 7, config, onDone: done })

    expect(host.textContent).toContain(config.question)
    expect(host.querySelector('[data-predict-clock]').textContent).toBe('1:00')
    expect(host.querySelector('[data-predict-text]')).toBeNull()
    expect(host.textContent).toContain('Write your answer on paper.')
    buttonByText(host, 'Show what happened').click()
    expect(done).toHaveBeenCalledWith([])

    const after = vi.fn()
    m.debrief({ sceneId: 7, config, predictions: [], onDone: after })
    expect(host.querySelector('[data-predict-compare]').textContent).toContain(config.outcome)
    expect(host.textContent).toContain(config.debrief)
    buttonByText(host, 'Continue the lesson').click()
    expect(after).toHaveBeenCalled()
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(host.childElementCount).toBe(0)
    m.hide()
  })

  it('board: the teacher types a team\'s prediction, then its why gets feedback', async () => {
    const { posts, fetchImpl } = fakeServer()
    const m = new PredictMoment(host, { storeUrl: '/lesson/X/predictions', session: 'run-0123456789abcdef', classroomId: 4, fetchImpl, pollOpts: poll })
    const done = vi.fn()
    m.ask({ sceneId: 7, config, onDone: done })
    click(host, '[data-predict-type]')
    host.querySelector('select').value = '2'
    type(host, 'More grain')
    click(host, '[data-predict-save]')
    await flush()

    expect(posts[0]).toMatchObject({ scene_id: 7, phase: 'predict', text: 'More grain', answerer: 'team', label: 'Team 2', classroom_id: 4 })
    expect(host.textContent).toContain('More grain')
    buttonByText(host, 'Show what happened').click()
    expect(done).toHaveBeenCalledWith([{ label: 'Team 2', text: 'More grain' }])

    const after = vi.fn()
    m.debrief({ sceneId: 7, config, predictions: done.mock.calls[0][0], onDone: after })
    const compare = host.querySelector('[data-predict-compare]').textContent
    expect(compare).toContain('Team 2 thought')
    expect(compare).toContain('More grain')
    expect(compare).toContain(config.outcome)
    host.querySelector('select').value = '2'
    type(host, 'The salt stayed in the soil')
    click(host, '[data-predict-save]')
    await flush(); await flush(); await flush()

    expect(posts[1]).toMatchObject({ phase: 'why', answerer: 'team', label: 'Team 2' })
    await vi.waitFor(() => expect(host.querySelector('[data-predict-feedback="ready"]')?.textContent).toContain('You named the salt'))
    buttonByText(host, 'Continue the lesson').click()
    expect(after).toHaveBeenCalled()
  })

  it('a typed default opens the teacher\'s box at once', () => {
    const m = new PredictMoment(host, { storeUrl: '/x', session: 'run-0123456789abcdef' })
    m.ask({ sceneId: 1, config: { ...config, mode: 'typed' }, onDone: () => {} })
    expect(host.querySelector('[data-predict-text]')).not.toBeNull()
  })

  it('own devices on the board: no typing, the children answer on theirs', () => {
    const m = new PredictMoment(host, { storeUrl: '/x', session: 'run-0123456789abcdef', devices: 'solo' })
    m.ask({ sceneId: 1, config: { ...config, mode: 'typed' }, onDone: () => {} })
    expect(host.querySelector('[data-predict-text]')).toBeNull()
    expect(host.querySelector('[data-predict-type]')).toBeNull()
    expect(host.textContent).toContain('Everyone answers on their own device.')
  })

  it('solo: the pupil types, sees "you thought vs what happened", then the feedback', async () => {
    const { posts, fetchImpl } = fakeServer()
    const m = new PredictMoment(host, { storeUrl: '/lesson/X/predictions', session: 'run-0123456789abcdef', solo: true, nickname: 'Sanne', classCode: 'ABC123', fetchImpl, pollOpts: poll })
    const done = vi.fn()
    m.ask({ sceneId: 7, config, onDone: done })
    expect(host.querySelector('[data-predict-clock]')).toBeNull()   // no clock at your own pace
    const send = host.querySelector('[data-predict-send]')
    expect(send.disabled).toBe(true)
    type(host, 'More water, more grain')
    expect(send.disabled).toBe(false)
    send.click()
    await flush()

    expect(posts[0]).toMatchObject({ phase: 'predict', answerer: 'pupil', label: 'Sanne', class_code: 'ABC123', session: 'run-0123456789abcdef' })
    expect(host.textContent).toContain('Your prediction is saved.')
    buttonByText(host, 'Show what happened').click()

    m.debrief({ sceneId: 7, config, predictions: done.mock.calls[0][0], onDone: () => {} })
    const compare = host.querySelector('[data-predict-compare]').textContent
    expect(compare).toContain('You thought')
    expect(compare).toContain('More water, more grain')
    expect(compare).toContain(config.outcome)
    expect(compare).not.toMatch(/wrong|right|correct/i)   // a prediction gets a comparison, never a grade
    type(host, 'The salt stayed behind')
    host.querySelector('[data-predict-send]').click()
    await vi.waitFor(() => expect(host.querySelector('[data-predict-feedback="ready"]')?.textContent).toContain('You named the salt'))
    expect(posts[1]).toMatchObject({ phase: 'why', text: 'The salt stayed behind' })
  })

  it('when grading never answers, the pupil reads that the teacher will look at it', async () => {
    const fetchImpl = vi.fn(async (url, init) => init?.method === 'POST'
      ? { ok: true, json: async () => ({ id: 1, status: 'pending' }) }
      : { ok: false, json: async () => ({}) })
    const m = new PredictMoment(host, { storeUrl: '/p', session: 'run-0123456789abcdef', solo: true, fetchImpl, pollOpts: { everyMs: 1, forMs: 5 } })
    m.debrief({ sceneId: 1, config, predictions: [], onDone: () => {} })
    type(host, 'Salt')
    host.querySelector('[data-predict-send]').click()
    await vi.waitFor(() => expect(host.querySelector('[data-predict-feedback="ready"]')?.textContent).toContain('Saved. Your teacher will look at it.'))
  })

  it('a failed save says so and lets the pupil go on', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }))
    const m = new PredictMoment(host, { storeUrl: '/p', session: 'run-0123456789abcdef', solo: true, fetchImpl })
    const done = vi.fn()
    m.ask({ sceneId: 1, config, onDone: done })
    type(host, 'Salt')
    host.querySelector('[data-predict-send]').click()
    await vi.waitFor(() => expect(host.textContent).toContain('We could not save it. You can go on.'))
    buttonByText(host, 'Skip').click()
    expect(done).toHaveBeenCalledWith([])
  })

  it('child text is never parsed as markup', () => {
    const m = new PredictMoment(host, { storeUrl: '/p', session: 'run-0123456789abcdef' })
    m.debrief({ sceneId: 1, config, predictions: [{ label: 'Team 1', text: '<img src=x onerror=alert(1)>' }], onDone: () => {} })
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toContain('<img src=x onerror=alert(1)>')
  })
})

describe('devices in class', () => {
  it('preselects what the class chose last time and starts on the click', () => {
    HTMLDialogElement.prototype.showModal ??= function () { this.open = true }
    HTMLDialogElement.prototype.close ??= function () { this.open = false; this.dispatchEvent(new Event('close')) }
    const onChoose = vi.fn()
    const dialog = askDevices(document.body, {
      classrooms: [{ id: 1, name: 'Groep 7', devices_mode: 'solo' }, { id: 2, name: 'Groep 8', devices_mode: null }],
      onChoose,
    })
    expect(dialog.querySelector('[data-devices-mode="solo"]').getAttribute('aria-pressed')).toBe('true')
    const pick = dialog.querySelector('select')
    pick.value = '2'
    pick.dispatchEvent(new Event('change'))
    expect(dialog.querySelector('[data-devices-mode="paper"]').getAttribute('aria-pressed')).toBe('true')
    dialog.querySelector('[data-devices-start]').click()
    expect(onChoose).toHaveBeenCalledWith({ mode: 'paper', classroomId: 2 })
  })
})
