// Figure recipes: ONE standard body (Customizable Man), variety only from dyes, skin, hair, hat on/off.
// A recipe is data, never a model: lesson.json `figures[].char` names one of these.

export const EXPRESSIONS = ['neutral', 'happy', 'worried', 'surprised', 'sad', 'angry', 'proud', 'tired'] as const
export type Expression = typeof EXPRESSIONS[number]
export type Pose = 'walk' | 'stand' | 'point' | 'kneel' | 'carry' | 'sit' | 'lie' | 'dig' | 'pull' | 'push' | 'climb' | 'row'
export type DyeRole = 'coat' | 'trousers' | 'shoes' | 'hair' | 'hat'
export type Hex = `#${string}`

export type FigureRecipe = {
  body: 'man'
  dyes: Partial<Record<DyeRole, Hex>>
  skin: Hex
  hair: HairId | null      // null = bald cap only
  beard: BeardId | null
  hat: boolean
  hatKind?: HatId          // which hat part when hat is on
  expression: Expression
  scale?: number           // whole-figure size (1 = the standard body, 1.78 m)
  sleeves?: boolean        // long sleeves painted on the arms in the coat dye (default true: no period wears a T-shirt)
  legs?: 'trousers' | 'tunic' | 'breeches' | 'dress' // painted: tunic = coat dye to the knee, breeches = stockings below it
  stockings?: Hex
  collar?: boolean         // a painted white falling collar (1600s)
  belt?: Hex | null        // a painted belt at the coat's hem
}

// parts that exist on the body (export: src/figures/export_wardrobe.py)
export const HAIRS = ['Hair_00', 'Hair_01', 'Hair_02', 'Hair_03', 'Hair_04', 'Hair_05', 'Hair_07'] as const
export const BEARDS = ['Facial_Hair_01', 'Facial_Hair_02'] as const // 00/03/05-08 export invisible (vendor modifiers)
export const HATS = ['Cowboy_Hat', 'Bucket_Hat'] as const
export type HairId = typeof HAIRS[number]
export type BeardId = typeof BEARDS[number]
export type HatId = typeof HATS[number]

export const DEFAULT_DYES: Record<DyeRole, Hex> = {
  coat: '#b8a888', trousers: '#6b5038', shoes: '#4a3526', hair: '#4a3626', hat: '#2e2a28',
}

// earth dyes (prehistory): undyed wool, walnut brown, madder red, weld yellow, oak-gall black
export const RECIPES: Record<string, FigureRecipe> = {
  // eerste boeren, c. 5000 BCE: undyed wool tunic over walnut-brown legs
  'boer-man': {
    body: 'man', skin: '#d9a77f', hair: 'Hair_04', beard: 'Facial_Hair_01', hat: false, expression: 'neutral', legs: 'tunic', belt: '#4f3a28',
    dyes: { coat: '#b8a582', trousers: '#76593c', shoes: '#5a4330', hair: '#5a3f28' },
  },
  // she does the work: carries, sows, grinds. ONLY a male body exists, so this is the faithful best: the
  // longest hair part (shoulder length), no beard, a touch smaller, tunic and legs in one madder-red wool so
  // the silhouette reads as one long garment. Gaps: female body, long hair/braid, skirt, headscarf (README).
  'boer-vrouw': {
    body: 'man', skin: '#e2b392', hair: 'Hair_03', beard: null, hat: false, expression: 'neutral', scale: 0.95, legs: 'dress', belt: '#4f3a28',
    dyes: { coat: '#9a5c46', trousers: '#84503c', shoes: '#5a4330', hair: '#6b4428' },
  },
  // VOC, 1640s: black wide-brimmed hat, dark coat, curled moustache (the Tasman look)
  'voc-schipper': {
    body: 'man', skin: '#e8bf9e', hair: 'Hair_01', beard: 'Facial_Hair_02', hat: true, hatKind: 'Cowboy_Hat', expression: 'neutral', legs: 'breeches', collar: true,
    dyes: { coat: '#454b5c', trousers: '#4f4034', shoes: '#33291f', hair: '#5c4630', hat: '#2e2925' },
  },
  'voc-matroos': {
    body: 'man', skin: '#d6a07a', hair: 'Hair_02', beard: null, hat: true, hatKind: 'Bucket_Hat', expression: 'neutral', legs: 'breeches', stockings: '#a89f8c',
    dyes: { coat: '#8a8f86', trousers: '#5b6470', shoes: '#3a2d24', hair: '#3c2c20', hat: '#6e5a44' },
  },
}

export function recipeFor(char: string): FigureRecipe {
  const r = RECIPES[char]
  if (!r) throw new Error(`unknown figure char "${char}": known ${Object.keys(RECIPES).join(', ')}`)
  return r
}

// ---------- any lesson character -> a recipe ----------
// lesson.json names its own cast (`characters[]`: id + a free `look` line). No per-character model exists, so the
// look line picks an archetype (child / woman / old / VOC officer / sailor / worker) and the id seeds the dyes, so
// two farmers never wear the same colours. Deterministic: the same lesson always dresses the same.
export type CastEntry = { id: string; name?: string; look?: string }

const ERA_DYES: Record<string, Hex[]> = {
  // undyed wool, walnut, madder, weld, woad, oak-gall grey, ochre, hide
  'nl-prehistory': ['#b8a582', '#76593c', '#9a5c46', '#b39a52', '#5d6b7a', '#6f6a60', '#a67f4f', '#8a6a4c'],
  // black, VOC grey-blue, dun, brick, linen, indigo, brown, deep green
  'nl-golden-age': ['#2e2c2c', '#454b5c', '#8a7d62', '#874a3a', '#c9bfa6', '#3d4a66', '#5c4630', '#3f4f3c'],
}
const SKINS: Hex[] = ['#e8bf9e', '#d9a77f', '#e2b392', '#c99572', '#b07d5a', '#8a5a3c', '#6e4630']
const HAIR_DYES: Hex[] = ['#5a3f28', '#3c2c20', '#6b4428', '#8a6a44', '#2a221c']

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}
const pick = <T>(list: readonly T[], seed: number, salt: number) => list[(seed >>> (salt * 3)) % list.length]

const has = (text: string, ...words: string[]) => words.some((w) => new RegExp(`\\b${w}`, 'i').test(text))

/** null = not a person on the standard body (an animal, a canoe crew seen far off): the stage skips it, the PM logs it */
/** variant: the n-th of a group in one scene (jagers, zeelui): same look line, other dyes */
export function figureRecipe(char: string, cast: CastEntry[] = [], bundle = 'nl-prehistory', variant = 0): FigureRecipe | null {
  if (RECIPES[char] && variant === 0) return RECIPES[char]
  const entry = cast.find((c) => c.id === char)
  const text = `${char} ${entry?.name ?? ''} ${entry?.look ?? ''}`
  if (has(text, 'dog', 'hond', 'cattle', 'cow', 'waka', 'canoe')) return null
  const seed = hash(variant ? `${char}#${variant}` : char)
  const dyes = ERA_DYES[bundle] ?? ERA_DYES['nl-prehistory']
  const child = has(text, 'child', 'kind', 'girl', 'boy', 'meisje', 'jongen', 'zusje', 'broertje') || /\b([2-9]|1[0-3])\b/.test(entry?.look ?? '')
  const woman = has(text, 'woman', 'vrouw', 'girl', 'meisje', 'zusje', 'moeder', 'mother', 'oma', 'widow', 'weduwe', 'weefster', 'dress', 'titia')
  const old = has(text, 'old', 'oma', 'opa', 'grey', 'gray', 'white beard')
  const officer = bundle === 'nl-golden-age' && has(text, 'governor', 'statesman', 'merchant', 'koopman', 'tasman', 'pilot', 'raad', 'clerk', 'klerk', 'doublet', 'gown')
  const sailor = bundle === 'nl-golden-age' && !officer && has(text, 'sailor', 'zeelui', 'boatswain', 'bootsman', 'uitkijk', 'ship', 'cap')
  const coat = officer ? '#2e2c2c' : pick(dyes, seed, 0)
  const trousers = officer ? '#3a3330' : pick(dyes, seed, 1)
  return {
    body: 'man',
    skin: pick(SKINS, seed, 2),
    hair: woman ? 'Hair_03' : (['Hair_00', 'Hair_01', 'Hair_02', 'Hair_04', 'Hair_07'] as const)[seed % 5],
    beard: woman || child ? null : old || has(text, 'beard', 'moustache', 'tasman') ? (has(text, 'moustache', 'tasman') ? 'Facial_Hair_02' : 'Facial_Hair_01') : seed % 3 === 0 ? 'Facial_Hair_01' : null,
    hat: officer || sailor || has(text, 'hat', 'cap'),
    hatKind: sailor || has(text, 'cap') ? 'Bucket_Hat' : 'Cowboy_Hat',
    expression: 'neutral',
    // a child is drawn smaller, not younger: the gap list asks for a child body
    scale: child ? 0.68 : woman ? 0.95 : 1,
    // costume by era, all painted on the one body: prehistory wears a belted tunic (a woman a long dress),
    // the 1600s breeches and stockings, officers and burghers a white falling collar
    legs: woman ? 'dress' : bundle === 'nl-golden-age' && !has(text, 'enslaved', 'werkers', 'loincloth') ? 'breeches' : 'tunic',
    collar: bundle === 'nl-golden-age' && (officer || woman || has(text, 'collar', 'ruff')),
    belt: bundle === 'nl-golden-age' ? null : '#4f3a28',
    dyes: { coat, trousers, shoes: '#4a3526', hair: old ? '#b8b0a4' : pick(HAIR_DYES, seed, 4), hat: officer ? '#262321' : '#6e5a44' },
  }
}

/** lesson poses outside the kit fall back to the nearest one we have */
export const POSE_FALLBACK: Record<string, Pose> = { swim: 'row', run: 'walk', fish: 'pull', throw: 'point', wave: 'point', fight: 'push', fall: 'lie', sleep: 'lie' }
export const poseFor = (p: string): Pose => (['walk', 'stand', 'point', 'kneel', 'carry', 'sit', 'lie', 'dig', 'pull', 'push', 'climb', 'row'].includes(p) ? p as Pose : POSE_FALLBACK[p] ?? 'stand')
export const expressionFor = (e: string | undefined): Expression => ((EXPRESSIONS as readonly string[]).includes(e ?? '') ? e as Expression : 'neutral')
