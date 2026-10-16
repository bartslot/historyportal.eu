import { describe, expect, it } from 'vitest'
import { isRtl, moveFocus, previewOf, subtitleRows, translateLine, translatedCues } from '../caption-menu.js'
import { cueChars, splitIntoCues } from '../captions.js'

const LANGS = [
  { code: 'nl', name: 'Nederlands' }, { code: 'en', name: 'English' }, { code: 'es', name: 'Español' },
  { code: 'ar', name: 'العربية' }, { code: 'zh', name: '中文' },
]

describe('subtitleRows', () => {
  it('puts Off first and the lesson language right after it', () => {
    const rows = subtitleRows(LANGS, 'es', 'Uit')
    expect(rows.map(r => r.code)).toEqual(['', 'es', 'nl', 'en', 'ar', 'zh'])
    expect(rows[0].name).toBe('Uit')
  })

  it('still lists a lesson language that is not a subtitle language', () => {
    expect(subtitleRows(LANGS, 'pl', 'Off')[1]).toEqual({ code: 'pl', name: 'pl' })
  })
})

describe('moveFocus', () => {
  const lengths = [2, 6]
  it('moves within a column and clamps at its ends', () => {
    expect(moveFocus({ col: 1, row: 0 }, 'ArrowDown', lengths)).toEqual({ col: 1, row: 1 })
    expect(moveFocus({ col: 1, row: 0 }, 'ArrowUp', lengths)).toEqual({ col: 1, row: 0 })
    expect(moveFocus({ col: 1, row: 5 }, 'ArrowDown', lengths)).toEqual({ col: 1, row: 5 })
  })

  it('crosses columns with left and right, clamping the row', () => {
    expect(moveFocus({ col: 1, row: 4 }, 'ArrowLeft', lengths)).toEqual({ col: 0, row: 1 })
    expect(moveFocus({ col: 0, row: 1 }, 'ArrowRight', lengths)).toEqual({ col: 1, row: 1 })
    expect(moveFocus({ col: 1, row: 1 }, 'ArrowRight', lengths)).toEqual({ col: 1, row: 1 })
  })

  it('ignores keys the panel does not use', () => {
    expect(moveFocus({ col: 1, row: 1 }, 'k', lengths)).toBeNull()
  })
})

describe('right-to-left', () => {
  it('is Arabic only', () => {
    expect(isRtl('ar')).toBe(true)
    expect(['nl', 'en', 'es', 'zh', 'ja', ''].some(isRtl)).toBe(false)
  })
})

describe('translated captions', () => {
  const set = { texts: { 'Tasman sails east.': 'Tasman navega hacia el este.', 'The ships wait.': 'Los barcos esperan.' } }

  it('looks a line up by its spoken text, tags and spacing ignored', () => {
    expect(translateLine('[position:left] Tasman  sails east.', set, 'es', 'en')).toEqual({ text: 'Tasman navega hacia el este.', lang: 'es' })
  })

  it('falls back to the original, in the original language, while a line is missing', () => {
    expect(translateLine('Not yet.', set, 'es', 'en')).toEqual({ text: 'Not yet.', lang: 'en' })
  })

  it('reuses each narrator line\'s exact start and end', () => {
    const lines = [
      { speaker: 'narrator', text: 'Tasman sails east.', start: 2, end: 5 },
      { speaker: 'tasman', text: 'Hold!', start: 5, end: 6 },
      { speaker: 'narrator', text: 'The ships wait.', start: 6, end: 9.5 },
    ]
    const cues = translatedCues({ lines }, 12, set, 'es', 'en')
    expect(cues.map(c => [c.text, c.start, c.end, c.lang])).toEqual([
      ['Tasman navega hacia el este.', 2, 5, 'es'],
      ['Los barcos esperan.', 6, 9.5, 'es'],
    ])
  })

  it('keeps the script\'s captions on a scene whose only lines are balloons added in the editor', () => {
    const lines = [{ speaker: 'balloon', text: 'Hold!', start: 0, end: null }]
    const cues = translatedCues({ script: 'Tasman sails east.', lines }, 4, set, 'es', 'en')
    expect(cues.map(c => c.text)).toEqual(['Tasman navega hacia el este.'])
  })

  it('spreads a translated script over the audio without the original alignment', () => {
    const alignment = [{ start_time: 0 }, { start_time: 9 }]
    const cues = translatedCues({ script: 'Tasman sails east.', alignment }, 4, set, 'es', 'en')
    expect(cues).toEqual([{ text: 'Tasman navega hacia el este.', start: 0, end: 4, lang: 'es', source: 'Tasman sails east.' }])
  })
})

describe('CJK cues', () => {
  it('are at most 32 characters and split where there are no spaces', () => {
    const zh = '塔斯曼的船队在一六四二年向东航行，经过了许多天的风暴和平静的海面，终于看见了一片陌生的陆地。'
    const cues = splitIntoCues(zh, cueChars('zh'))
    expect(cues.length).toBeGreaterThan(1)
    expect(cues.every(c => c.length <= 32)).toBe(true)
    expect(cues.join('')).toBe(zh)
  })

  it('end a sentence at 。', () => {
    expect(splitIntoCues('船来了。人们等着。', cueChars('ja'))).toEqual(['船来了。', '人们等着。'])
  })
})

describe('previewOf', () => {
  it('shows the first words, or the first characters in Chinese and Japanese', () => {
    expect(previewOf('Golden Bay, they called it.', 'en')).toBe('Golden Bay…')
    expect(previewOf('金色海湾的名字', 'zh')).toBe('金色海湾…')
    expect(previewOf('', 'en')).toBe('')
  })
})
