// Figure recipes: ONE standard body (Customizable Man), variety only from dyes, skin, hair, hat on/off.
// A recipe is data, never a model: lesson.json `figures[].char` names one of these.

export type Expression = 'neutral' | 'happy' | 'worried' | 'surprised'
export type Pose = 'walk' | 'stand' | 'point' | 'kneel' | 'carry'
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
    body: 'man', skin: '#d9a77f', hair: 'Hair_03', beard: 'Facial_Hair_01', hat: false, expression: 'neutral',
    dyes: { coat: '#b9a382', trousers: '#6e5236', shoes: '#5a4330', hair: '#5a3f28' },
  },
  // she does the work: carries, sows, grinds. ONLY a male body exists, so this is the faithful best:
  // long hair, madder-red wool. Gap: female body + skirt part (see README).
  'boer-vrouw': {
    body: 'man', skin: '#e2b392', hair: 'Hair_05', beard: null, hat: false, expression: 'neutral',
    dyes: { coat: '#a8573e', trousers: '#7a5a3a', shoes: '#5a4330', hair: '#6b4428' },
  },
  // VOC, 1640s: black wide-brimmed hat, dark coat, curled moustache (the Tasman look)
  'voc-schipper': {
    body: 'man', skin: '#e8bf9e', hair: 'Hair_01', beard: 'Facial_Hair_02', hat: true, hatKind: 'Cowboy_Hat', expression: 'neutral',
    dyes: { coat: '#2f3442', trousers: '#4a3a2e', shoes: '#2a2220', hair: '#5c4630', hat: '#262321' },
  },
  'voc-matroos': {
    body: 'man', skin: '#d6a07a', hair: 'Hair_02', beard: null, hat: true, hatKind: 'Bucket_Hat', expression: 'neutral',
    dyes: { coat: '#8a8f86', trousers: '#5b6470', shoes: '#3a2d24', hair: '#3c2c20', hat: '#6e5a44' },
  },
}

export function recipeFor(char: string): FigureRecipe {
  const r = RECIPES[char]
  if (!r) throw new Error(`unknown figure char "${char}": known ${Object.keys(RECIPES).join(', ')}`)
  return r
}
