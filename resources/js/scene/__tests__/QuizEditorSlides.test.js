import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuizEditorSlides } from '../QuizEditorSlides.js'

vi.stubGlobal('ResizeObserver', class { observe () {} disconnect () {} })

const blank = () => ({ question: '', image_path: null, options: ['', '', '', ''], correct_index: 0 })
const filled = () => ({ question: 'Who sailed?', image_path: null, options: ['Tasman', 'Cook', '', ''], correct_index: 0 })

describe('the quiz card on the stage', () => {
  let host, onGenerate, onEdit, slides

  beforeEach(() => {
    document.body.innerHTML = '<div id="h"></div>'
    host = document.getElementById('h')
    onGenerate = vi.fn()
    onEdit = vi.fn()
    slides = new QuizEditorSlides(host, { onGenerate, onEdit })
  })

  it('a quiz just added shows the card at once: a question and four answers, empty, to type on', () => {
    slides.show({ questions: [blank(), blank()], sceneId: 1 })
    expect(slides.isVisible).toBe(true)
    expect(host.querySelector('[data-edit="question"]').dataset.placeholder).toBeTruthy()
    expect(host.querySelectorAll('[data-edit="option"]')).toHaveLength(4)
  })

  it('the button generates only on a click, and shows it is working until the questions come', () => {
    slides.show({ questions: [blank()], sceneId: 1 })
    expect(onGenerate).not.toHaveBeenCalled()
    host.querySelector('[data-generate]').click()
    expect(onGenerate).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[data-generate]').disabled).toBe(true)
    slides.update([filled()])
    expect(host.querySelector('[data-generate]')).toBeNull()
  })

  it('a failed click is a button again', () => {
    slides.show({ questions: [blank()], sceneId: 1 })
    host.querySelector('[data-generate]').click()
    slides.generateFailed()
    expect(host.querySelector('[data-generate]').disabled).toBe(false)
  })

  it('once anything is typed the button goes: a second click belongs to the panel, which asks first', () => {
    slides.show({ questions: [{ ...blank(), question: 'Mine' }], sceneId: 1 })
    expect(host.querySelector('[data-generate]')).toBeNull()
  })

  it('typing into an empty answer hands over the slot it is in', () => {
    slides.show({ questions: [blank()], sceneId: 1 })
    const third = host.querySelector('[data-opt="2"]')
    third.textContent = 'De Zeehaen'
    third.dispatchEvent(new Event('blur'))
    expect(onEdit).toHaveBeenCalledWith({ question: 0, option: 2, text: 'De Zeehaen' })
  })
})
