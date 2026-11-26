import { describe, expect, it } from 'vitest'
import { stackOf, paletteOf, wear, colour, randomRecipe, cleanRecipe, zonesOf, onBody, presetRecipe } from '../recipe.js'
import { kindIndex, recolour, shadeLayer, castLayer, partLabels, INK, hoodMask, isHood } from '../paint.js'
import { cutPuppet, pack, fillFrom, robeLimits } from '../rig.js'
import { withFace } from '../face-keys.js'

const kinds = ['skin', 'tunic', 'shawl', 'hair', 'rope', 'tie', 'white', 'grey', 'apron', 'ochre', 'mouth', 'iris', 'brow']
const piece = (id, slot, k = []) => ({ id, slot, label: id, kinds: k, box: [0, 0, 1, 1], files: {} })
const kit = {
  kinds, slots: ['outfit', 'face', 'eyes', 'mouth', 'expression', 'hair', 'beard', 'headwear', 'extra'],
  kindDefaults: { white: '#fcfaf4', tie: '#b0754f', mouth: '#7a3a2c', iris: '#6e3c1e' },
  zoneKinds: { garment: 'tunic', second: 'shawl', cord: 'rope', apron: 'apron', 'head-cloth': 'ochre', band: 'apron' },
  swatches: [{ id: 'raw-linen', hex: '#e2d5b8' }, { id: 'indigo-blue', hex: '#46607a' }, { id: 'madder-red', hex: '#a8463a' }],
  skins: [{ id: 's1', hex: '#eac39a' }, { id: 's3', hex: '#c99263' }],
  hairColours: [{ id: 'black-brown', hex: '#2f231d' }, { id: 'grey', hex: '#a9a49c' }],
  bodies: [{
    id: 'woman',
    pieces: [piece('outfit/work-tunic-apron', 'outfit', ['skin', 'tunic', 'apron', 'rope']), piece('outfit/long-wrap', 'outfit', ['skin', 'tunic', 'shawl']),
      piece('face/woman-n', 'face', ['skin']), piece('face/old-woman-n', 'face', ['skin']), piece('eyes/woman-round', 'eyes'),
      piece('mouths/woman-ah', 'mouth'), piece('hair/woman-bun', 'hair', ['hair']), piece('headwear/woman-headband', 'headwear', ['apron']),
      piece('headwear/woman-shawl-over-head', 'headwear', ['ochre']), piece('extras/woman-jewellery', 'extra'), piece('expressions/woman-sad', 'expression'),
      piece('expressions/woman-round-sad', 'expression'), piece('expressions/old-woman-n_woman-round-sad', 'expression')],
    expressions: { sad: 'expressions/woman-sad' },
    expressionSets: { 'woman-n/eyes/woman-round': { sad: 'expressions/woman-round-sad' }, 'old-woman-n/eyes/woman-round': { sad: 'expressions/old-woman-n_woman-round-sad' } },
  }, { id: 'man', pieces: [piece('outfit/soldier', 'outfit', ['skin']), piece('face/man', 'face', ['skin'])], expressions: {} }],
  presets: [
    { id: 'weaver', recipe: { body: 'woman', outfit: 'work-tunic-apron', face: 'woman-n', parts: ['hair/woman-bun', 'headwear/woman-headband'], skin: 's3', hair_colour: 'black-brown', zones: { garment: 'raw-linen', apron: 'indigo-blue' }, height_m: 1.55 } },
    { id: 'soldier', recipe: { body: 'man', outfit: 'soldier', face: 'man', parts: [], skin: 's1', hair_colour: 'black-brown', zones: {}, height_m: 1.7 } },
  ],
}
const weaver = () => presetRecipe(kit, 'weaver')

describe('recipe', () => {
  it('stacks the pieces back to front, an expression over the eyes and mouth', () => {
    const r = { ...weaver(), eyes: 'woman-round', parts: ['headwear/woman-headband', 'hair/woman-bun'] }
    expect(stackOf(kit, r)).toEqual(['outfit/work-tunic-apron', 'face/woman-n', 'eyes/woman-round', 'hair/woman-bun', 'headwear/woman-headband'])
    expect(stackOf(kit, r, 'sad')).toContain('expressions/woman-round-sad')
    expect(stackOf(kit, r, 'sad')).not.toContain('eyes/woman-round')   // the expression's own eyes and mouth, never both
    expect(stackOf(kit, r, 'angry')).not.toContain('expressions/woman-sad')   // a body without that expression keeps its face
  })

  it('an expression keeps the eyes the teacher chose: that eye style\'s own painted expression (Bart 11-15)', () => {
    const round = { ...weaver(), eyes: 'woman-round' }
    expect(stackOf(kit, round, 'sad')).toContain('expressions/woman-round-sad')
    expect(stackOf(kit, round, 'sad')).not.toContain('expressions/woman-sad')
    expect(stackOf(kit, round, 'sad')).not.toContain('eyes/woman-round')       // the variant paints those eyes itself
    expect(stackOf(kit, { ...weaver(), eyes: undefined }, 'sad')).toContain('expressions/woman-sad')   // her own eyes: the plain one
  })

  it('an expression keeps the face the teacher chose too: that face and eyes\' own painted expression', () => {
    const old = { ...weaver(), face: 'old-woman-n', eyes: 'woman-round' }
    expect(stackOf(kit, old, 'sad')).toContain('expressions/old-woman-n_woman-round-sad')
    expect(stackOf(kit, old, 'sad')).toContain('face/old-woman-n')
    expect(stackOf(kit, old, 'sad')).not.toContain('expressions/woman-round-sad')     // never the first face's
  })

  it('colours each kind from the recipe: skin, hair and brows, the zones from the twelve', () => {
    const p = paletteOf(kit, weaver())
    expect(p.skin).toEqual([0xc9, 0x92, 0x63])
    expect(p.tunic).toEqual([0xe2, 0xd5, 0xb8])
    expect(p.apron).toEqual([0x46, 0x60, 0x7a])
    expect(p.brow).toEqual([0x2f, 0x23, 0x1d].map((v) => Math.round(v * 0.72)))
    expect(p.white).toEqual([0xfc, 0xfa, 0xf4])
  })

  it('wears a piece without touching the old recipe; one hair and one headwear at a time', () => {
    const r = weaver()
    const shawl = wear(kit, r, 'headwear/woman-shawl-over-head')
    expect(r.parts).toEqual(['hair/woman-bun', 'headwear/woman-headband'])
    expect(shawl.parts).toEqual(['hair/woman-bun', 'headwear/woman-shawl-over-head'])
    expect(shawl.zones['head-cloth']).toBeDefined()                     // a new zone gets a colour
    expect(wear(kit, shawl, 'headwear/woman-shawl-over-head').parts).toEqual(['hair/woman-bun'])   // worn: taken off
    expect(wear(kit, r, 'outfit/long-wrap').outfit).toBe('long-wrap')
    expect(wear(kit, r, 'mouths/woman-ah').mouth).toBe('woman-ah')
    expect(wear(kit, r, 'nope/x')).toBe(r)
  })

  it('names the zones an outfit shows, the apron as a band on other clothes', () => {
    expect(zonesOf(kit, weaver())).toEqual(['garment', 'cord', 'apron'])
    expect(zonesOf(kit, { ...weaver(), outfit: 'long-wrap' })).toEqual(['garment', 'second'])
  })

  it('sets colours without changing the old recipe', () => {
    const r = weaver()
    expect(colour(r, 'apron', 'madder-red').zones.apron).toBe('madder-red')
    expect(colour(r, 'skin', 's1').skin).toBe('s1')
    expect(colour(r, 'hair', 'grey').hair_colour).toBe('grey')
    expect(r.zones.apron).toBe('indigo-blue')
  })

  it('makes a random person of the same body, keeping the slot just changed', () => {
    let s = 1
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    const r = randomRecipe(kit, weaver(), rand, 'outfit')
    expect(r.body).toBe('woman')
    expect(r.outfit).toBe('work-tunic-apron')
    expect(kit.bodies[0].pieces.some((p) => p.id === `face/${r.face}`)).toBe(true)
    expect(r.parts.filter((p) => p.startsWith('hair/')).length).toBe(1)
    for (const c of Object.values(r.zones)) expect(kit.swatches.some((sw) => sw.id === c)).toBe(true)
  })

  it('keeps a random outfit inside its time: never Marco Polo\'s Venice for a Babylonian, only Venice for Marco', () => {
    const k = structuredClone(kit)
    k.bodies[0].pieces.push({ ...piece('outfit/venice-tunic-satchel', 'outfit', ['skin', 'tunic']), period: 'venice-1271' })
    let s = 7
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 40; i++) expect(randomRecipe(k, weaver(), rand).outfit).not.toBe('venice-tunic-satchel')
    for (let i = 0; i < 5; i++) expect(randomRecipe(k, { ...weaver(), outfit: 'venice-tunic-satchel' }, rand).outfit).toBe('venice-tunic-satchel')
  })

  it('cleans a recipe from outside: unknown ids go, the body\'s preset fills in', () => {
    const r = cleanRecipe(kit, { body: 'woman', outfit: 'evil', face: 'old-woman-n', parts: ['hair/woman-bun', '../x', 3], skin: 's9', zones: { garment: 'madder-red', apron: '#fff' }, height_m: 9, role: 'x'.repeat(99) })
    expect(r.outfit).toBe('work-tunic-apron')
    expect(r.face).toBe('old-woman-n')
    expect(r.parts).toEqual(['hair/woman-bun'])
    expect(r.skin).toBe('s3')
    expect(r.zones.garment).toBe('madder-red')
    expect(r.zones.apron).toBe('indigo-blue')
    expect(r.height_m).toBe(2.1)
    expect(r.role.length).toBe(60)
    expect(cleanRecipe(kit, null).body).toBe('woman')
    expect(onBody(kit, 'man').outfit).toBe('soldier')
  })
})

describe('paint', () => {
  const px = (w, h, f) => ({ width: w, height: h, data: Uint8ClampedArray.from({ length: w * h * 4 }, (_, i) => f(Math.floor(i / 4), i % 4)) })

  it('reads the kind off the key colour\'s red', () => {
    expect(kindIndex(10, 13)).toBe(0)
    expect(kindIndex(28, 13)).toBe(1)
    expect(kindIndex(37, 13)).toBe(2)    // a blended edge: the nearest kind
    expect(kindIndex(255, 13)).toBe(12)
  })

  it('recolours by kind and lays the ink over it', () => {
    const fill = px(2, 1, (i, c) => (c === 3 ? 255 : c === 0 ? 10 + 18 * (i === 0 ? 0 : 1) : 0))   // skin, tunic
    const ink = px(2, 1, (i, c) => (i === 1 ? 255 : 0))
    const { colour, flat } = recolour(fill, ink, { skin: [200, 150, 100], tunic: [240, 230, 200] }, kinds)
    expect([...colour.slice(0, 4)]).toEqual([200, 150, 100, 255])
    expect([...colour.slice(4, 8)]).toEqual([...INK, 255])
    expect([...flat.slice(4, 8)]).toEqual([240, 230, 200, 255])
  })

  it('a shade layer covers where the piece paints; a cast is red only', () => {
    const fill = px(2, 1, (i, c) => (c === 3 && i === 0 ? 255 : 0))
    const shade = px(2, 1, () => 90)
    expect([...shadeLayer(shade, fill, null)]).toEqual([90, 90, 90, 255, 90, 90, 90, 0])
    expect([...castLayer(px(2, 1, (i) => (i === 0 ? 50 : 2)))]).toEqual([50, 0, 0, 255, 0, 0, 0, 0])
  })

  it('labels head pieces as the head, cloth over a leg as the hips, the air by its torso', () => {
    const rig = { parts: ['shin_n', 'hips', 'chest', 'head'] }
    const labels = px(3, 1, (i, c) => (c === 0 ? [1, 1, 0][i] : c === 1 ? 3 : 0))   // two shin px, one in the air (torso: chest)
    const skin = 10, tunic = 28
    const out = partLabels([
      { slot: 'outfit', box: [0, 0, 3, 1], fill: px(3, 1, (i, c) => (c === 3 ? 255 : c === 0 ? [skin, tunic, tunic][i] : 0)), ink: null },
      { slot: 'hair', box: [2, 0, 1, 1], fill: px(1, 1, (i, c) => (c === 3 ? 0 : 0)), ink: px(1, 1, () => 0) },
    ], labels, rig, kinds)
    expect([...out]).toEqual([1, 2, 3])
  })
})

describe('rig', () => {
  it('packs boxes in rows, tallest first', () => {
    const { at, height } = pack([{ w: 10, h: 5 }, { w: 10, h: 8 }, { w: 15, h: 2 }], 20)
    expect(at[1]).toEqual({ x: 0, y: 0 })
    expect(at[0]).toEqual({ x: 10, y: 0 })
    expect(at[2]).toEqual({ x: 0, y: 8 })
    expect(height).toBe(10)
  })

  it('fills a hidden region from the nearest source pixel, through the region only', () => {
    const W = 4, H = 1
    const region = Uint8Array.from([0, 1, 1, 0]), source = Uint8Array.from([1, 0, 0, 0])
    const flat = Uint8ClampedArray.from([9, 8, 7, 255, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 255])
    const shade = new Uint8ClampedArray(16).fill(3)
    const c = new Uint8ClampedArray(16), s = new Uint8ClampedArray(16)
    fillFrom(W, H, region, source, flat, shade, c, s)
    expect([...c.slice(4, 12)]).toEqual([9, 8, 7, 255, 9, 8, 7, 255])
    expect(c[15]).toBe(0)
  })

  it('cuts a person into parts that rebuild the picture at rest, with a face per expression', () => {
    // 6 x 4 canvas at scale 2: chest on top (rows 0-1), an arm over it at column 1, hips below; the arm hides chest paint
    const W = 6, H = 4, n = W * H
    const label = Uint8Array.from({ length: n }, (_, i) => (i < 12 ? (i % W === 1 ? 2 : 1) : 3))   // 1 chest, 2 upperarm, 3 hips
    const under = Uint8Array.from({ length: n }, (_, i) => (i % W === 1 && i < 12 ? 1 : 0))      // chest goes on under the arm
    const colour = Uint8ClampedArray.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : label[Math.floor(i / 4)] * 50))
    const rig = { parts: ['chest', 'upperarm_n', 'hips'], facing: 1, bones: [{ name: 'hips', parent: null, from: [1, 2] }, { name: 'chest', parent: 'hips', from: [1, 1] }, { name: 'upperarm_n', parent: 'chest', from: [0.5, 0] }] }
    const rest = { colour, flat: colour, shade: new Uint8ClampedArray(n * 4), label }
    const { atlas, puppet } = cutPuppet({ canvas: { width: W, height: H, scale: 2 }, rest, under, rig })
    expect(puppet.parts.map((p) => p.bone)).toEqual(['chest', 'upperarm_n', 'hips'])
    expect(puppet.paint).toBe('flat')
    expect(puppet.width).toBe(3)
    // the chest tile has paint where the arm hid it: chest colour (50) at canvas column 1
    const chest = puppet.parts[0]
    const ax = Math.round(chest.uv[0] * atlas.width), ay = Math.round(chest.uv[1] * atlas.height)
    expect(atlas.data[(ay * atlas.width + ax + 1) * 4]).toBe(50)
    expect(puppet.faces).toBeUndefined()
  })

  it('cuts the head again for each expression, from its region, the rest of the head from the person', () => {
    const W = 4, H = 2, n = W * H
    const label = Uint8Array.from({ length: n }, () => 1)                 // all head
    const colour = Uint8ClampedArray.from({ length: n * 4 }, (_, i) => (i % 4 === 3 ? 255 : 10))
    const rig = { parts: ['head'], facing: 1, bones: [{ name: 'head', parent: null, from: [1, 1] }] }
    const rest = { colour, flat: colour, shade: new Uint8ClampedArray(n * 4), label }
    const sad = { x0: 1, y0: 0, w: 1, h: 1, colour: Uint8ClampedArray.from([99, 99, 99, 255]), shade: new Uint8ClampedArray(4) }
    const { atlas, puppet } = cutPuppet({ canvas: { width: W, height: H, scale: 1 }, rest, under: new Uint8Array(n), faces: { sad }, rig })
    expect(Object.keys(puppet.faces)).toEqual(['sad'])
    expect(puppet.parts).toHaveLength(1)
    const [u0, v0] = puppet.faces.sad
    const x = Math.round(u0 * atlas.width), y = Math.round(v0 * atlas.height)
    expect(atlas.data[(y * atlas.width + x) * 4]).toBe(10)             // outside the region: the person as saved
    expect(atlas.data[(y * atlas.width + x + 1) * 4]).toBe(99)         // inside it: the expression
  })
})

describe('face keys', () => {
  it('sets the face on the key at the playhead, else adds one in time order', () => {
    const keys = [{ t: 0, x: 0.5 }, { t: 2, 'bone:head': 5 }]
    expect(withFace(keys, 2.004, 'sad')).toEqual([{ t: 0, x: 0.5 }, { t: 2, 'bone:head': 5, face: 'sad' }])
    expect(withFace(keys, 1, 'amazed')).toEqual([{ t: 0, x: 0.5 }, { t: 1, face: 'amazed' }, { t: 2, 'bone:head': 5 }])
    expect(keys[1].face).toBeUndefined()
  })
})

describe('robe limits', () => {
  const bones = [{ name: 'thigh_n', from: [0, 500], limit: [-25, 20] }, { name: 'shin_n', from: [0, 1000], to: [0, 1400], limit: [0, 120] }, { name: 'head', from: [0, 100], limit: [-25, 25] }]
  it('a robe past the middle of the shin holds the legs to a shuffle', () => {
    const out = robeLimits(bones, 1300)
    expect(out.find((b) => b.name === 'thigh_n').limit).toEqual([-6, 6])
    expect(out.find((b) => b.name === 'shin_n').limit).toEqual([0, 8])
    expect(out.find((b) => b.name === 'head').limit).toEqual([-25, 25])
  })
  it('a kilt to the knee leaves the legs free', () => {
    expect(robeLimits(bones, 1050)).toBe(bones)
  })
})

describe('a hood over the hair (Bart 11-16)', () => {
  const img = (w, h, on) => ({ width: w, height: h, data: Uint8ClampedArray.from({ length: w * h * 4 }, (_, i) => (i % 4 === 3 && on(Math.floor(i / 4) % w, Math.floor(i / 4 / w)) ? 255 : 0)) })
  // a 10 x 10 canvas, the hair fills it; the cloth's box is columns 3-7, rows 0-9: it covers the head from row 2 down to
  // the line (0.43 of its box: row 4.3) and hangs on below in column 3 only, its tail
  const on = (x, y) => (y >= 2 && y < 5) || x === 0
  const cloth = { fill: img(5, 10, on), ink: img(5, 10, () => false) }
  const m = hoodMask([0, 0, 10, 10], cloth, [3, 0, 5, 10])
  const at = (x, y) => m[y * 10 + x]

  it('hides the hair above the cloth, and behind it, down to where the cloth leaves the head', () => {
    expect(at(5, 1)).toBe(1)   // above the cloth
    expect(at(1, 3)).toBe(1)   // behind it
    expect(at(9, 1)).toBe(1)   // in front, above the cloth's front end
  })

  it('leaves the braid that hangs below that line, beside the cloth\'s tail', () => {
    expect(at(1, 6)).toBe(0)
    expect(at(2, 9)).toBe(0)
    expect(at(9, 3)).toBe(0)   // in front of the band, below its top: the hair on the forehead
  })

  it('names only a cloth over the head a hood', () => {
    expect(isHood('headwear/shawl-over-head')).toBe(true)
    expect(isHood('headwear/woman-shawl-over-head')).toBe(true)
    expect(isHood('headwear/headband')).toBe(false)
  })
})
