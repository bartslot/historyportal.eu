/**
 * A character is a recipe (vault topics/character-creator/character-tab-plan.md 6): which pieces of the kit, which of its
 * colours. These are the pure rules: the stack of pieces a recipe draws, its colours by kind, a change of one part, and
 * Random inside the period. kit.json comes from engine-mvp/tools/kit_bake.py.
 */

/** The parts a teacher clicks, in the rail's order, and the slots each one opens. */
export const PARTS = ['who', 'body', 'face', 'hair', 'clothes', 'extra']
export const PART_SLOTS = { body: [], face: ['face', 'eyes', 'mouth'], hair: ['hair', 'beard'], clothes: ['outfit'], extra: ['headwear', 'extra'] }
/** Which rail part a slot belongs to: a click on that piece of the figure opens it. */
export const SLOT_PART = { outfit: 'clothes', face: 'face', eyes: 'face', mouth: 'face', expression: 'face', hair: 'hair', beard: 'hair', headwear: 'extra', extra: 'extra' }
/** Slots a recipe holds one of at most; hair, beard, headwear and extras sit in `parts`. */
const SINGLE = ['outfit', 'face', 'eyes', 'mouth']
export const EXPRESSIONS = ['calm', 'curious', 'sad', 'angry', 'amazed']

export const bodyOf = (kit, recipe) => kit.bodies.find((b) => b.id === recipe.body) ?? kit.bodies[0]
export const pieceOf = (body, id) => body.pieces.find((p) => p.id === id)
export const piecesIn = (body, slot) => body.pieces.filter((p) => p.slot === slot)

/** The piece ids a recipe draws, back to front (kit.slots), with an expression's patch over the eyes and mouth. */
export function stackOf (kit, recipe, expression = 'calm') {
  const body = bodyOf(kit, recipe)
  const ids = [`outfit/${recipe.outfit}`, `face/${recipe.face}`]
  // an emotion changes only brows, lids and mouth: each chosen face and eyes has its own painted set (kit_bake
  // expressionSets, Bart 11-15); the body's plain set only where the kit has none for them
  const set = body.expressionSets?.[`${recipe.face}/${recipe.eyes ? `eyes/${recipe.eyes}` : ''}`]
  const expr = expression === 'calm' ? null : set?.[expression] || body.expressions?.[expression] || null
  // an expression repaints eyes, brows and mouth: the person's own chosen ones would show beside it (a double mouth)
  if (recipe.eyes && !expr) ids.push(`eyes/${recipe.eyes}`)
  if (recipe.mouth && !expr) ids.push(`mouths/${recipe.mouth}`)
  if (expr) ids.push(expr)
  ids.push(...(recipe.parts ?? []))
  const order = (id) => kit.slots.indexOf(pieceOf(body, id)?.slot ?? 'extra')
  return ids.filter((id) => pieceOf(body, id)).sort((a, b) => order(a) - order(b))
}

const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const swatchHex = (list, id, fallback) => (list.find((s) => s.id === id) ?? list.find((s) => s.id === fallback) ?? list[0]).hex

/** Each colour kind's [r, g, b] for this recipe: skin, hair (and its grey and brows), the zones from the twelve. */
export function paletteOf (kit, recipe) {
  const out = {}
  for (const [kind, hex] of Object.entries(kit.kindDefaults)) out[kind] = hexRgb(hex)
  const hair = hexRgb(swatchHex(kit.hairColours, recipe.hair_colour, 'black-brown'))
  out.skin = hexRgb(swatchHex(kit.skins, recipe.skin, 's3'))
  out.hair = hair
  out.grey = hair
  out.brow = hair.map((v) => Math.round(v * 0.72))
  for (const [zone, c] of Object.entries(recipe.zones ?? {})) {
    const kind = kit.zoneKinds[zone]
    if (kind) out[kind] = hexRgb(swatchHex(kit.swatches, c, c))
  }
  for (const kind of kit.kinds) out[kind] ??= [200, 190, 170]
  return out
}

/** The colour zones a stack shows (zone names of kit_presets.ZONE_KIND), first come first: what the colour rows offer. */
export function zonesOf (kit, recipe, slot = 'outfit') {
  const body = bodyOf(kit, recipe)
  const kinds = new Set(stackOf(kit, recipe).map((id) => pieceOf(body, id)).filter((p) => p.slot === slot || (slot === 'extra' && p.slot === 'headwear')).flatMap((p) => p.kinds))
  const seen = new Set()
  const zones = []
  for (const [zone, kind] of Object.entries(kit.zoneKinds)) {
    if (!kinds.has(kind) || seen.has(kind)) continue
    // an apron kind is the apron on a work tunic, a coloured band on the others
    const name = kind === 'apron' ? (recipe.outfit.includes('apron') ? 'apron' : 'band') : zone
    seen.add(kind)
    zones.push(name)
  }
  return zones
}

const DEFAULT_ZONE = { garment: 'undyed-wool', second: 'madder-red', cord: 'dark-wool-brown', apron: 'indigo-blue', band: 'reed-green', 'head-cloth': 'yellow-ochre' }

/** The recipe with one piece put on (or, for a part already worn, taken off): a new object, the old one untouched. */
export function wear (kit, recipe, id) {
  const body = bodyOf(kit, recipe)
  const piece = pieceOf(body, id)
  if (!piece) return recipe
  const name = id.slice(id.indexOf('/') + 1)
  if (SINGLE.includes(piece.slot)) {
    const key = piece.slot === 'mouth' ? 'mouth' : piece.slot
    const next = { ...recipe, [key]: name }
    if (piece.slot === 'outfit') next.zones = withZones(kit, next)
    return next
  }
  const parts = recipe.parts ?? []
  if (parts.includes(id)) return { ...recipe, parts: parts.filter((p) => p !== id) }
  // one hair, one beard, one headwear at a time; extras add up
  const sameSlot = piece.slot === 'extra' ? [] : parts.filter((p) => pieceOf(body, p)?.slot === piece.slot)
  const next = { ...recipe, parts: [...parts.filter((p) => !sameSlot.includes(p)), id] }
  return { ...next, zones: withZones(kit, next) }
}

/** The recipe's zones, with a default colour for any zone its pieces show that it has none for. */
function withZones (kit, recipe) {
  const zones = { ...(recipe.zones ?? {}) }
  for (const slot of ['outfit', 'extra']) {
    for (const z of zonesOf(kit, { ...recipe, zones }, slot)) zones[z] ??= DEFAULT_ZONE[z] ?? kit.swatches[0].id
  }
  return zones
}

/** The recipe with a colour set: a zone from the twelve, the skin or the hair. */
export function colour (recipe, what, id) {
  if (what === 'skin') return { ...recipe, skin: id }
  if (what === 'hair') return { ...recipe, hair_colour: id }
  return { ...recipe, zones: { ...(recipe.zones ?? {}), [what]: id } }
}

/** The eyes and mouth a body offers: its own (null) first. */
export const optionsFor = (body, slot) => (['eyes', 'mouth'].includes(slot) ? [null, ...piecesIn(body, slot).map((p) => p.id)] : piecesIn(body, slot).map((p) => p.id))

/** A preset's recipe, or the first preset of a body. */
export function presetRecipe (kit, id) {
  const p = kit.presets.find((x) => x.id === id) ?? kit.presets[0]
  return structuredClone(p.recipe)
}

/** A new person on another body: that body's first preset. */
export function onBody (kit, bodyId) {
  const p = kit.presets.find((x) => x.recipe.body === bodyId)
  return p ? structuredClone(p.recipe) : null
}

/**
 * Random, inside the period: an outfit and hair this body wears, colours from the twelve, a calm face. `keep` names a
 * slot the teacher just changed by hand: it stays. `rand` is a 0..1 source (seedable in tests).
 */
export function randomRecipe (kit, recipe, rand = Math.random, keep = null) {
  const body = bodyOf(kit, recipe)
  const pick = (list) => list[Math.floor(rand() * list.length) % list.length]
  const next = { ...recipe, parts: [...(recipe.parts ?? [])] }
  if (keep !== 'outfit') next.outfit = pick(piecesIn(body, 'outfit')).id.split('/')[1]
  if (keep !== 'face') next.face = pick(piecesIn(body, 'face')).id.split('/')[1]
  if (keep !== 'hair') {
    const hair = piecesIn(body, 'hair').map((p) => p.id)
    const headwear = piecesIn(body, 'headwear').map((p) => p.id)
    next.parts = next.parts.filter((p) => !hair.includes(p) && !headwear.includes(p))
    if (hair.length) next.parts.push(pick(hair))
    if (headwear.length && rand() < 0.5) next.parts.push(pick(headwear))
    next.hair_colour = pick(kit.hairColours.filter((h) => !['grey', 'white'].includes(h.id) || next.face.includes('old'))).id
  }
  if (keep !== 'skin') next.skin = pick(kit.skins).id
  if (keep !== 'colours') {
    const zones = {}
    for (const z of zonesOf(kit, { ...next, zones: {} }, 'outfit')) zones[z] = pick(kit.swatches).id
    for (const z of zonesOf(kit, { ...next, zones: {} }, 'extra')) zones[z] = pick(kit.swatches).id
    next.zones = zones
  }
  return { ...next, zones: withZones(kit, next) }
}

/** A recipe from outside (the server, an old save) made safe: only ids this kit has, else the body's first preset's. */
export function cleanRecipe (kit, raw) {
  const base = onBody(kit, raw?.body) ?? presetRecipe(kit)
  if (!raw || typeof raw !== 'object') return base
  const body = bodyOf(kit, base)
  const has = (slot, name) => name && pieceOf(body, `${slot === 'mouth' ? 'mouths' : slot}/${name}`)
  const out = { ...base }
  for (const slot of ['outfit', 'face', 'eyes', 'mouth']) {
    if (has(slot, raw[slot])) out[slot] = raw[slot]
    else if (slot === 'eyes' || slot === 'mouth') delete out[slot]
  }
  out.parts = Array.isArray(raw.parts) ? raw.parts.filter((id) => typeof id === 'string' && pieceOf(body, id)) : base.parts
  if (kit.skins.some((s) => s.id === raw.skin)) out.skin = raw.skin
  if (kit.hairColours.some((s) => s.id === raw.hair_colour)) out.hair_colour = raw.hair_colour
  out.zones = Object.fromEntries(Object.entries(raw.zones ?? {}).filter(([z, c]) => typeof z === 'string' && kit.swatches.some((s) => s.id === c)))
  if (typeof raw.role === 'string') out.role = raw.role.slice(0, 60)
  if (Number.isFinite(raw.height_m)) out.height_m = Math.min(2.1, Math.max(0.9, raw.height_m))
  out.facing = raw.facing === -1 ? -1 : 1
  return { ...out, zones: withZones(kit, out) }
}
