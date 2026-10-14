// The player's Audio & Subtitles panel (Netflix's pattern): one plate over the CC button, the
// lesson's narration languages on the left, subtitles on the right. Spread into the lessonGame
// Alpine component; `this` is that component. The pure parts live in caption-menu.js.

import { isRtl, moveFocus, previewOf, subtitleRows, translateLine } from './caption-menu.js'
import { t } from '../i18n.js'

const POLL_MS = 4000
const store = (key, value) => { try { localStorage.setItem(key, value) } catch (_) { /* private mode */ } }
const read = (key) => { try { return localStorage.getItem(key) } catch (_) { return null } }

export const captionPanel = (lesson) => ({
  ccOpen: false,
  ccFocus: { col: 1, row: 0 },
  // The subtitle language while captions are on; captionsOn stays the on/off switch.
  captionLang: lesson.source_language,
  captionShownLang: lesson.source_language,
  // lang → { texts, translating, complete } as far as the server has it (LessonCaptionsController).
  ccSets: {},
  ccLineSource: '',         // the narration line on screen now, in the original (for the previews)
  ccAudioRows: lesson.audio_languages || [],
  ccSubtitleRows: subtitleRows(lesson.caption_languages || [], lesson.source_language, t('Off')),

  _initCaptionLanguage () {
    const remembered = read('lp:captions-lang')
    if (remembered && this.ccSubtitleRows.some(r => r.code === remembered)) this.captionLang = remembered
    if (this.captionsOn) this._loadCaptionSet(this.captionLang)
  },

  toggleCaptionPanel (open = !this.ccOpen) {
    this.ccOpen = open
    if (!open) return
    this.chaptersOpen = false
    const col = 1
    const row = Math.max(0, this.ccSubtitleRows.findIndex(r => r.code === this.ccSelectedSubtitle()))
    this.ccFocus = { col, row }
    // Peek at every language once, so the rows can preview the line already cached.
    this.ccSubtitleRows.forEach(r => r.code && !this.ccSets[r.code] && this._loadCaptionSet(r.code, true))
    this.$nextTick(() => this._focusCcRow())
  },

  ccSelectedSubtitle () {
    return this.captionsOn ? this.captionLang : ''
  },

  ccDir (lang) {
    return isRtl(lang) ? 'rtl' : 'ltr'
  },

  /** The faint text beside a subtitle language: a preview of the line, or "translating". */
  ccRowHint (code) {
    if (!code) return ''
    const set = this.ccSets[code]
    if (set?.translating) return t('Translating…')
    const line = this.ccLineSource
    if (!line) return ''
    if (code === lesson.source_language) return previewOf(line, code)
    const hit = set?.texts?.[line]
    return hit ? previewOf(hit, code) : ''
  },

  selectSubtitle (code) {
    if (!code) { this.setCaptions(false); return }
    this.captionLang = code
    store('lp:captions-lang', code)
    this._loadCaptionSet(code)
    this.setCaptions(true)
    this._captionLanguageChanged()
  },

  /**
   * Another narration language is another lesson (a translation_group sibling). It opens at the
   * same scene when the two lessons have the same scenes in the same order, else at the start.
   */
  selectAudio (row) {
    if (row.current) return
    const url = new URL(row.url, window.location.origin)
    if (row.same_scenes && this.phase !== 'TITLE_SCREEN') {
      url.searchParams.set('scene', String(this._sceneIndex || 0))
      url.searchParams.set('autoplay', '1')
    }
    window.location.assign(url.toString())
  },

  ccKeydown (e) {
    if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
      e.preventDefault()
      this.ccOpen = false
      this.$refs.ccButton?.focus()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this._activateCcRow()
      return
    }
    const next = moveFocus(this.ccFocus, e.key, [this.ccAudioRows.length, this.ccSubtitleRows.length])
    if (!next) return
    e.preventDefault()
    this.ccFocus = next
    this._focusCcRow()
  },

  _activateCcRow () {
    const { col, row } = this.ccFocus
    if (col === 0) this.ccAudioRows[row] && this.selectAudio(this.ccAudioRows[row])
    else this.ccSubtitleRows[row] && this.selectSubtitle(this.ccSubtitleRows[row].code)
  },

  _focusCcRow () {
    const { col, row } = this.ccFocus
    document.querySelector(`[data-cc-col="${col}"][data-cc-row="${row}"]`)?.focus()
  },

  /** A line in the chosen subtitle language when it is cached, else the original. */
  _ccLine (text) {
    if (!this.captionsOn) return text
    return translateLine(text, this.ccSets[this.captionLang], this.captionLang, lesson.source_language).text
  },

  async _loadCaptionSet (code, peek = false) {
    if (!code || code === lesson.source_language || !lesson.captions_url) return
    const known = this.ccSets[code]
    if (known?.complete || (known?.translating && !peek)) return
    try {
      const res = await fetch(lesson.captions_url.replace('__LANG__', code) + (peek ? '?peek=1' : ''), {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`captions ${res.status}`)
      const data = await res.json()
      const translating = !!data.translating
      this.ccSets = { ...this.ccSets, [code]: { texts: data.texts || {}, translating, complete: !data.pending } }
      if (code === this.captionLang) this._captionLanguageChanged()
      if (translating) setTimeout(() => this._pollCaptionSet(code), POLL_MS)
    } catch (err) {
      // The original language keeps showing; nothing for the class to act on.
      console.warn('[captions] could not load', code, err)
      this.ccSets = { ...this.ccSets, [code]: { ...(known || { texts: {} }), translating: false } }
    }
  },

  _pollCaptionSet (code) {
    const set = this.ccSets[code]
    if (!set) return
    this.ccSets = { ...this.ccSets, [code]: { ...set, translating: false } }
    this._loadCaptionSet(code)
  },

  /** New language or newly arrived lines: rebuild the cues and the balloons' words. */
  _captionLanguageChanged () {
    this._cues = []
    this._updateCaptions?.()
    this._refreshBalloonText?.()
  },
})
