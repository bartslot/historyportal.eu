/**
 * stage25d/labels: the name a teacher reads for a library picture (`tree-birch-01` -> "Birch").
 * library.json may carry `name: { nl: 'Berk', en: 'Birch' }`; without it the id's words are translated here.
 * Only en and nl are written out; any other language reads the English name.
 */

/** word -> [en, nl]. Adjectives are listed in ADJECTIVES and move in front of their noun. */
const WORDS = {
  tree: ['tree', 'boom'], oak: ['oak', 'eik'], birch: ['birch', 'berk'], alder: ['alder', 'els'], lime: ['lime', 'linde'],
  hawthorn: ['hawthorn', 'meidoorn'], pine: ['pine', 'den'], shrub: ['shrub', 'struik'], juniper: ['juniper', 'jeneverbes'],
  hazel: ['hazel', 'hazelaar'], heather: ['heather', 'heide'], bramble: ['bramble', 'braam'], reeds: ['reeds', 'riet'],
  grass: ['grass', 'gras'], tall: ['tall', 'hoog'], boulder: ['boulder', 'zwerfkei'], boulders: ['boulders', 'zwerfkeien'],
  large: ['large', 'grote'], small: ['small', 'kleine'], fence: ['fence', 'hek'], rail: ['rail', 'rail'], log: ['log', 'boomstam'],
  fallen: ['fallen', 'omgevallen'], cow: ['cow', 'koe'], calf: ['calf', 'kalf'], sheep: ['sheep', 'schaap'], pig: ['pig', 'varken'],
  goat: ['goat', 'geit'], pot: ['pot', 'pot'], funnelbeaker: ['funnelbeaker', 'trechterbeker'], funnel: ['funnel', 'trechter'],
  quern: ['quern', 'maalsteen'], axe: ['axe', 'bijl'], flint: ['flint', 'vuursteen'], basket: ['basket', 'mand'],
  digging: ['digging', 'graaf'], stick: ['stick', 'stok'], bowls: ['bowls', 'kommen'], ground: ['ground', 'grond'],
  heath: ['heath', 'heide'], meadow: ['meadow', 'weide'], band: ['band', 'strook'], pebbles: ['pebbles', 'keitjes'],
  ramp: ['ramp', 'helling'], earth: ['earth', 'aarde'], stone: ['stone', 'steen'], chamber: ['chamber', 'kamer'],
  case: ['case', 'vitrine'], museum: ['museum', 'museum'], house: ['house', 'huis'], longhouse: ['longhouse', 'langhuis'],
  ice: ['ice', 'ijs'], sheet: ['sheet', 'laag'], path: ['path', 'pad'], sand: ['sand', 'zand'], hunebed: ['hunebed', 'hunebed'],
  long: ['long', 'lange'], short: ['short', 'korte'], wheat: ['wheat', 'tarwe'], patch: ['patch', 'veld'],
  clearing: ['clearing', 'open plek'], stumps: ['stumps', 'stronken'], fire: ['fire', 'vuur'], pit: ['pit', 'kuil'],
  sky: ['sky', 'lucht'], summer: ['summer', 'zomer'], autumn: ['autumn', 'herfst'], bg: ['backdrop', 'achtergrond'],
  farmland: ['farmland', 'akkerland'], trb: ['TRB', 'TRB'], lbk: ['LBK', 'LBK'],
}
const ADJECTIVES = new Set(['large', 'small', 'tall', 'long', 'short', 'fallen'])
/** Words that only say what kind of thing it is; the next word is the name (tree-birch -> Birch). */
const KINDS = new Set(['tree', 'shrub'])

const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const pick = (word, nl) => WORDS[word]?.[nl ? 1 : 0] ?? word

/** @param {string} lang 'nl' or anything else (English). */
export function assetLabel (asset, lang = 'en') {
  const nl = lang === 'nl'
  const named = asset?.name?.[lang] ?? asset?.name?.en
  if (named) return named
  const words = String(asset?.id ?? '').replace(/-\d+$/, '').split('-').filter(Boolean)
  if (!words.length) return ''
  const rest = words.length > 1 && KINDS.has(words[0]) ? words.slice(1) : words
  const front = rest.filter((w) => ADJECTIVES.has(w))
  const body = rest.filter((w) => !ADJECTIVES.has(w))
  return capital([...front, ...body].map((w) => pick(w, nl)).join(' '))
}

/** A character id as a name: "meisje" -> "Meisje", "dorpeling-b" -> "Dorpeling B". */
const characterName = (id) => capital(String(id).replace(/-/g, ' ').replace(/ ([a-z])$/, (m, c) => ` ${c.toUpperCase()}`))

/** The character a figure picture shows: its `char:` tag, else its id (fig-<character>-<pose>-01). */
const characterOf = (asset) => {
  const tag = (asset?.tags ?? []).find((t) => t.startsWith('char:'))
  if (tag) return tag.slice(5)
  const m = /^fig-(.+)-[a-z]+-\d+(-l)?$/.exec(String(asset?.id ?? ''))
  return m ? m[1] : null
}

/** A layer's row name: a painted figure reads as its character ("Meisje"), anything else as its picture. */
export function layerLabel (layer, asset, lang = 'en') {
  if (layer.figure) return characterName(layer.figure)
  const picture = asset ?? (layer.asset ? { id: layer.asset } : null)
  const character = (picture?.layer === 'figure' || /^fig-/.test(String(picture?.id ?? ''))) && characterOf(picture)
  if (character) return characterName(character)
  if (picture) return assetLabel(picture, lang)
  const need = Array.isArray(layer.need) ? layer.need[0] : layer.need
  return need ? capital(String(need)) : ''
}

/** Row names that repeat get a number from the second one on: Braam, Braam 2, Braam 3. */
export function numbered (labels) {
  const seen = new Map()
  return labels.map((label) => {
    const n = (seen.get(label) ?? 0) + 1
    seen.set(label, n)
    return n === 1 ? label : `${label} ${n}`
  })
}

/** Tags that make a picture a growing thing: it gets the leaf in the object list. */
const NATURE = new Set(['tree', 'shrub', 'heather', 'grass', 'reeds', 'bramble', 'log', 'wheat', 'crop', 'plant', 'flower'])

/**
 * The object-list glyph of a library picture (window.__objIcons): a person for a character, a cloud for a sky, a leaf
 * for a plant, the picture glyph for everything else (backdrops, ground, houses, animals, tools).
 */
export function assetIcon (asset) {
  if (asset?.layer === 'figure') return 'person'
  if (asset?.layer === 'sky') return 'cloud'
  return (asset?.tags ?? []).some((t) => NATURE.has(t)) ? 'leaf' : 'photo'
}
