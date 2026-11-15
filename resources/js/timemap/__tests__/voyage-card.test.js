import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { toCardModel } from '../voyage-card.js'
import voyagesDoc from '../voyages.json'

// The researched voyage cards in public/timemap/voyages/<id>/card.json. These hold the rules the
// research had to keep: every picture is on disk and freely licensed, every sentence names a source
// that is listed, and no UI text carries an em dash.

const DIR = resolve(__dirname, '../../../../public/timemap/voyages')
const FREE = /^(public domain|pd|cc0|cc by(-sa)?( \d\.\d)?|cc-by(-sa)?(-\d\.\d)?)/i

const cards = voyagesDoc.voyages.map((v) => ({
  voyage: v,
  card: JSON.parse(readFileSync(resolve(DIR, v.id, 'card.json'), 'utf8')),
}))

const texts = (card) => [
  card.purpose, card.crew, card.legacy,
  ...card.moments, ...card.people, ...card.people.map((p) => p.role),
  ...card.images.map((i) => i.caption),
].flatMap((t) => [t?.en, t?.nl]).filter(Boolean)

describe.each(cards)('$voyage.id card', ({ voyage, card }) => {
  it('has English and Dutch text without em dashes', () => {
    for (const key of ['purpose', 'crew', 'legacy']) {
      expect(card[key].en, key).toBeTruthy()
      expect(card[key].nl, key).toBeTruthy()
    }
    for (const t of texts(card)) expect(t).not.toContain('—')
  })

  it('backs every sourced line with a listed source', () => {
    const keys = new Set(card.sources.map((s) => s.key))
    const sourced = [card.purpose, card.crew, card.legacy, ...card.moments, ...card.people]
    for (const item of sourced) {
      expect(item.src?.length, JSON.stringify(item).slice(0, 80)).toBeGreaterThan(0)
      for (const k of item.src) expect(keys.has(k), `${k} in ${voyage.id}`).toBe(true)
    }
  })

  it('keeps every picture on disk, as WebP, freely licensed and credited', () => {
    const pictures = [...card.images, ...card.people.map((p) => p.image).filter(Boolean)]
    for (const img of pictures) {
      expect(img.file, img.title).toMatch(/\.webp$/)
      expect(existsSync(resolve(DIR, voyage.id, img.file)), img.file).toBe(true)
      expect(img.licence, img.file).toMatch(FREE)
      expect(img.source_url, img.file).toMatch(/^https:\/\//)
    }
  })

  it('becomes a card model with people, moments and pictures', () => {
    const model = toCardModel(card, voyage, 'nl')
    expect(model.voyage).toBe(true)
    expect(model.figures.length).toBeGreaterThan(0)
    expect(model.moments.every((m) => m.date && m.text)).toBe(true)
    expect(model.label).not.toContain('—')
    for (const f of model.figures) expect(f.image_url || f.initials).toBeTruthy()
  })
})
