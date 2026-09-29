/**
 * QuizEditorSlides: the quiz as the teacher edits it on the Configure stage.
 *
 * The student quiz (QuizOverlay) is a timed run: a read-gate, bars lifting in turn, answering as
 * the navigation, a score screen. In the editor all of that is in the way. Bart, 2026-09-29: "no
 * need for animations, it's annoying and slow. Just show the slides". So this draws the same card,
 * still, one question per slide, with the carousel's side arrows to page through them.
 *
 * The question and every answer are editable in place. An edit is committed on blur (or Enter) and
 * handed to `onEdit`; the server writes it into the same draft the inspector edits and autosaves,
 * then sends the fresh questions back through update(). The correct answer is always outlined in
 * green and labelled, and focusing it calls `onCorrectFocus` so the teacher is warned before
 * changing what counts as right.
 *
 * Answers are shown in stored order, never shuffled, so `option` in an edit is the stored index.
 */
import { t } from '../i18n.js'
import { LETTERS, LETTER_CLASSES, LETTER_CHIP, SCRIM, CARD_STILL } from './QuizOverlay.js'

// Heroicons outline chevrons, 24x24, stroke 1.5 (the icon standard).
const CHEVRON_LEFT = 'M15.75 19.5 8.25 12l7.5-7.5'
const CHEVRON_RIGHT = 'm8.25 4.5 7.5 7.5-7.5 7.5'

// The slide is laid out at one fixed 16:9 size and scaled to the stage (like the title screen's
// frame), so four answers always fit, however short the stage is.
const SLIDE_W = 960
const SLIDE_H = 540

const EDITABLE = 'rounded-md outline-none focus:ring-2 focus:ring-primary/60 cursor-text'

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const arrow = (dir, path, label, disabled) => `
  <button type="button" data-nav="${dir}" aria-label="${escapeHtml(label)}" data-tooltip="${escapeHtml(label)}"
          class="hp-slide-arrow absolute top-1/2 z-10 -translate-y-1/2 ${dir < 0 ? 'left-4' : 'right-4'}" ${disabled ? 'disabled' : ''}>
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="${path}"/>
    </svg>
  </button>`

export class QuizEditorSlides {
  /**
   * @param {HTMLElement} hostEl
   * @param {{ onEdit?: (edit: {question: number, option: number|null, text: string}) => void,
   *           onCorrectFocus?: () => void }} [opts]
   */
  constructor(hostEl, { onEdit = null, onCorrectFocus = null } = {}) {
    this.host = hostEl
    this.onEdit = onEdit
    this.onCorrectFocus = onCorrectFocus
    this._questions = []
    this._index = 0
    this._sceneId = null
    this._pending = null   // questions that arrived while the teacher was typing
  }

  get isVisible() { return this._questions.length > 0 }

  get sceneId() { return this._sceneId }

  /** A new scene starts at its first question; the same scene keeps its place. */
  show({ questions, sceneId = null }) {
    if (sceneId !== this._sceneId) this._index = 0
    this._sceneId = sceneId
    this.update(questions)
  }

  /** Fresh questions from the server. Held back while an edit is in progress, so typing is never clobbered. */
  update(questions) {
    const list = Array.isArray(questions) ? questions.filter(q => q?.question) : []
    if (this._editing()) { this._pending = list; return }
    this._questions = list
    if (!list.length) { this.hide(); return }
    this._index = Math.min(this._index, list.length - 1)
    this._render()
  }

  /** Scale the fixed-size slide to the stage, whatever size the stage is. */
  _fit() {
    const slide = this.host.querySelector('[data-slide]')
    if (!slide) return
    const scale = Math.min(this.host.clientWidth / SLIDE_W, this.host.clientHeight / SLIDE_H) || 1
    slide.style.transform = `scale(${scale})`
    if (!this._resize) {
      this._resize = new ResizeObserver(() => this._fit())
      this._resize.observe(this.host)
    }
  }

  hide() {
    this._resize?.disconnect()
    this._resize = null
    this._questions = []
    this._pending = null
    this.host.innerHTML = ''
    this.host.style.pointerEvents = 'none'
  }

  go(index) {
    const next = Math.max(0, Math.min(this._questions.length - 1, index))
    if (next === this._index) return
    this._index = next
    this._render()
  }

  _editing() {
    const el = document.activeElement
    return !!(el && this.host.contains(el) && el.isContentEditable)
  }

  _render() {
    const q = this._questions[this._index]
    if (!q) return
    const total = this._questions.length
    const correct = Number(q.correct_index)

    const rows = (q.options || []).slice(0, LETTERS.length).map((opt, i) => {
      const isCorrect = i === correct
      const tone = isCorrect ? 'border-success ring-1 ring-success bg-success/10' : 'border-base-300 bg-base-300/50'
      // The label sits ON the row's top edge, not beside the text: beside it, a narrow stage
      // squeezed the answer to one letter per line.
      const badge = isCorrect
        ? `<span class="badge badge-success badge-sm absolute -top-2.5 right-3 font-semibold">${escapeHtml(t('Correct answer'))}</span>`
        : ''
      return `
        <div data-row="${i}" class="${tone} relative flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-lg font-medium">
          <span class="${LETTER_CLASSES[i]} ${LETTER_CHIP}">${LETTERS[i]}</span>
          <span data-edit="option" data-opt="${i}" ${isCorrect ? 'data-correct' : ''} contenteditable="plaintext-only" spellcheck="true"
                class="${EDITABLE} min-w-0 flex-1 px-1">${escapeHtml(opt)}</span>
          ${badge}
        </div>`
    }).join('')

    const dots = this._questions.map((_, i) => `
      <button type="button" data-dot="${i}" aria-label="${i + 1} / ${total}"
              class="${i === this._index ? 'bg-primary' : 'bg-base-content/25 hover:bg-base-content/50'} h-2 w-2 rounded-full"></button>`).join('')

    this.host.innerHTML = `
      <div class="${SCRIM} overflow-hidden">
        <div data-slide class="relative flex shrink-0 items-center justify-center"
             style="width: ${SLIDE_W}px; height: ${SLIDE_H}px">
          <div class="${CARD_STILL} relative max-h-[calc(100%-2rem)] w-[46rem] overflow-y-auto px-16 py-8">
            <div data-edit="question" contenteditable="plaintext-only" spellcheck="true"
                 class="${EDITABLE} mb-6 text-center text-3xl leading-snug font-medium">${escapeHtml(q.question)}</div>
            <div class="flex flex-col gap-2.5">${rows}</div>
            <div class="mt-5 flex items-center justify-center gap-1.5">${dots}</div>
            <div class="mt-1.5 text-center text-sm text-base-content/60">${this._index + 1} / ${total}</div>
          </div>
          ${arrow(-1, CHEVRON_LEFT, t('Previous question'), this._index === 0)}
          ${arrow(1, CHEVRON_RIGHT, t('Next question'), this._index === total - 1)}
        </div>
      </div>`
    this.host.style.pointerEvents = 'auto'
    this._fit()
    this._wire(q)
  }

  _wire(q) {
    this.host.querySelectorAll('[data-nav]').forEach(btn =>
      btn.addEventListener('click', () => this.go(this._index + Number(btn.dataset.nav))))
    this.host.querySelectorAll('[data-dot]').forEach(dot =>
      dot.addEventListener('click', () => this.go(Number(dot.dataset.dot))))

    this.host.querySelectorAll('[data-edit]').forEach(el => {
      const option = el.dataset.edit === 'option' ? Number(el.dataset.opt) : null
      const original = option === null ? String(q.question ?? '') : String(q.options?.[option] ?? '')

      if (el.hasAttribute('data-correct')) {
        el.addEventListener('focus', () => this.onCorrectFocus?.())
      }
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); el.blur() }
        if (e.key === 'Escape') { el.textContent = original; el.blur() }
        // Arrow keys belong to the text while typing, not to the stage around it.
        e.stopPropagation()
      })
      el.addEventListener('blur', () => {
        const text = el.textContent.trim()
        // An emptied field goes back: removing a question or an answer is the inspector's job.
        if (text === '') el.textContent = original
        else if (text !== original.trim()) this.onEdit?.({ question: this._index, option, text })
        this._flushPending()
      })
    })
  }

  _flushPending() {
    // Wait a tick: focus may be moving to another field on the same card.
    setTimeout(() => {
      if (this._pending && !this._editing()) {
        const list = this._pending
        this._pending = null
        this.update(list)
      }
    }, 0)
  }
}
