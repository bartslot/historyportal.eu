import voyagesData from './voyages.json';
import { formatVoyageDate } from './voyage-hover.js';

// A voyage's story for the information card, shaped like the territory the card already knows how
// to show (label, inception/dissolution, figures, wikipedia_url) plus what only a voyage has: the
// three short paragraphs, the dated moments and the picture gallery.
//
// The data is public/timemap/voyages/<id>/card.json: researched per voyage, every sentence keyed to
// an entry in its `sources`, every picture public domain or CC BY / BY-SA with its credit. It is
// fetched on the first click and kept, so it never weighs on the map's own bundle.
//
// Card text exists in English and Dutch; any other language reads the English.

const BASE = '/timemap/voyages';
const cache = new Map();

/** `{ en, nl }` → the string for this language, English when there is none. */
export const pick = (text, lang) => {
  if (!text || typeof text !== 'object') return typeof text === 'string' ? text : '';
  return text[lang] || text.en || '';
};

/** "c. 1460–1524", "247–183 BCE". An en dash is not the em dash the UI rules forbid. */
const years = (p, lang) => {
  const known = (y) => Number.isFinite(y);
  if (!known(p.born) && !known(p.died)) return '';
  const bce = (known(p.born) ? p.born : p.died) <= 0;
  const n = (y, approx) => (known(y) ? `${approx ? 'c. ' : ''}${y <= 0 ? 1 - y : y}` : '?'); // year 0 is 1 BCE
  const era = bce ? (lang === 'nl' ? ' v.Chr.' : ' BCE') : '';
  return `${n(p.born, p.born_approx)}\u2013${n(p.died, p.died_approx)}${era}`;
};

const initials = (name) => String(name || '')
  .split(/\s+/)
  .filter((w) => /^\p{Lu}/u.test(w))
  .slice(0, 2)
  .map((w) => w[0])
  .join('') || String(name || '?')[0];

const credit = (img) => [img.creator, img.year, img.licence].filter(Boolean).join(', ');

/**
 * Turn card.json into the card's model. Pure, so it is tested without a network.
 *
 * @param {object} card   card.json
 * @param {object} voyage the voyages.json entry
 * @param {string} lang   'en', 'nl', ...
 */
export const toCardModel = (card, voyage, lang = 'en') => {
  const dir = `${BASE}/${encodeURIComponent(card.id)}/`;
  const image = (img) => (img && img.file ? {
    src: dir + encodeURIComponent(img.file),
    width: img.width || null,
    height: img.height || null,
    title: img.title || '',
    caption: pick(img.caption, lang) || img.title || '',
    credit: credit(img),
    source_url: img.source_url || null,
  } : null);

  return {
    voyage: true,
    voyageId: card.id,
    label: String(voyage?.name ?? card.id).replace(/\s+—\s+/g, ': '),
    inception: voyage?.year_start ?? null,
    dissolution: voyage?.year_end ?? null,
    summary: null,
    flag_path: null,
    predecessor: null,
    successor: null,
    wikipedia_url: pick(card.wikipedia, lang) || null,
    story: [
      { key: 'purpose', text: pick(card.purpose, lang) },
      { key: 'crew', text: pick(card.crew, lang) },
      { key: 'legacy', text: pick(card.legacy, lang) },
    ].filter((s) => s.text),
    moments: (card.moments ?? []).map((m, i) => ({
      key: `${m.date}-${i}`,
      date: formatVoyageDate({ ms: Date.parse(m.date), precision: m.precision || 'day' }, lang),
      year: new Date(Date.parse(m.date)).getUTCFullYear(),
      text: pick(m, lang),
    })),
    gallery: (card.images ?? []).map(image).filter(Boolean),
    figures: (card.people ?? []).map((p, i) => ({
      qid: p.qid || null,
      key: p.qid || `person-${i}`,
      name: p.name,
      kind: pick(p.role, lang),
      era: years(p, lang),
      lines: pick(p, lang),
      image_url: p.image?.file ? dir + encodeURIComponent(p.image.file) : null,
      credit: p.image ? credit(p.image) : '',
      initials: initials(p.name),
    })),
    sources: (card.sources ?? []).map((s) => ({ key: s.key, title: s.title, url: s.url })),
  };
};

/**
 * Load a voyage's card model. Rejects when the file is missing or unreadable, so the card can say
 * so instead of spinning.
 */
export const loadVoyageCard = async (voyageId, locale = 'en') => {
  const lang = String(locale || 'en').slice(0, 2).toLowerCase();
  const voyage = voyagesData.voyages.find((v) => v.id === voyageId);
  if (!voyage) throw new Error(`unknown voyage ${voyageId}`);
  if (!cache.has(voyageId)) {
    cache.set(voyageId, fetch(`${BASE}/${encodeURIComponent(voyageId)}/card.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch((e) => { cache.delete(voyageId); throw e; }));
  }
  return toCardModel(await cache.get(voyageId), voyage, lang);
};
