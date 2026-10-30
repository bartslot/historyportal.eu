import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BODY_OCCLUDE, EDGE_SHARE, MAX_SHARE, OCCLUDE, SHIP_SCORE, dressing, footprint, habitatOf, onScreen, screenRow, windowAt } from './dress'
import type { LayerRef, Library, LibraryAsset, Scene } from './types'
import { DEPTH_Z, viewWidthAt } from '../stage25d/layout'

// a small library shaped like nl-prehistory: dressing props, story subjects, a low-score asset
const A = (id: string, tags: string[], height_m: number, extra: Partial<LibraryAsset> = {}): LibraryAsset =>
  ({ id, layer: 'fg', tags, height_m, w: 1000, h: 1000, qa: { score: 8 }, ...extra })
const LIB: Library = {
  bundle: 'test',
  assets: [
    A('grass-01', ['grass', 'meadow'], 1), A('heather-01', ['heather', 'heath'], 0.5), A('stones-01', ['stones', 'rock'], 0.8),
    A('shrub-01', ['shrub', 'hazel'], 3.5), A('bramble-01', ['bramble', 'shrub'], 1.2), A('fence-01', ['fence', 'rail'], 1.3),
    A('tree-oak-01', ['tree', 'oak'], 18), A('tree-birch-01', ['tree', 'birch'], 15), A('log-01', ['log', 'deadwood'], 1),
    A('fire-pit-01', ['fire', 'hearth'], 1), A('hut-01', ['hut', 'house'], 3), A('cow-01', ['cow', 'animal'], 1.3),
    A('shrub-bad-01', ['shrub'], 2, { qa: { score: 6 } }),
  ],
}
const scene = (extra: Partial<Scene> = {}): Scene => ({
  id: 'sc13', beat: 'setup', narration: 'x', camera: null, sound: null, dress: true,
  set: { sky: 'sky-summer-01', layers: [{ asset: 'hut-01', depth: 'mid', x: 0.5 }, { asset: 'fire-pit-01', depth: 'fg', x: 0.2, scale: 0.6 }] },
  figures: [{ char: 'opa', x: 0.3, depth: 'mid' }, { char: 'meisje', x: 0.45, depth: 'mid' }],
  ...extra,
})
const byId = new Map(LIB.assets.map((a) => [a.id, a]))

describe('set dresser', () => {
  it('fills an empty floor with props by depth, all marked dressed', () => {
    const d = dressing(scene(), LIB)
    expect(d.length).toBeGreaterThanOrEqual(5)
    expect(d.every((l) => l.dressed)).toBe(true)
    expect(new Set(d.map((l) => l.depth))).toEqual(new Set(['near', 'fg', 'mid', 'bg']))
  })

  it('is deterministic per scene and differs between scenes', () => {
    expect(dressing(scene(), LIB)).toEqual(dressing(scene(), LIB))
    expect(dressing(scene({ id: 'sc14' }), LIB)).not.toEqual(dressing(scene(), LIB))
  })

  it('uses only shipped dressing, never a story subject or an asset under the ship score', () => {
    for (const l of dressing(scene(), LIB)) {
      const a = byId.get(l.asset!)!
      expect(a.qa!.score!).toBeGreaterThanOrEqual(SHIP_SCORE)
      expect(['fire-pit-01', 'hut-01', 'shrub-bad-01']).not.toContain(a.id)
    }
  })

  it('a prop in front of a named layer stays in its lowest OCCLUDE of height, never above it', () => {
    const s = scene()
    const rank = ['bg', 'mid', 'fg']
    for (const l of dressing(s, LIB)) {
      for (const n of s.set.layers) {
        if (rank.indexOf(l.depth) < rank.indexOf(n.depth)) continue
        const a = footprint(l, byId.get(l.asset!)), b = footprint(n, byId.get(n.asset!))
        if (!(a[0] < b[1] && b[0] < a[1])) continue
        const house = { x: 0, z: 0, fov: 50 }
        const top = screenRow(byId.get(l.asset!)!.height_m! * (l.scale ?? 1), DEPTH_Z[l.depth], house)
        expect(top >= screenRow(OCCLUDE * byId.get(n.asset!)!.height_m! * (n.scale ?? 1), DEPTH_Z[n.depth], house) - 1e-6, `${l.asset} over ${n.asset}`).toBe(true)
      }
    }
  })

  it('keeps the figures clear: in front of them only what stays under their legs (BODY_OCCLUDE of their height)', () => {
    const s = scene()
    for (const l of dressing(s, LIB).filter((x) => x.depth !== 'bg')) {
      const [lo, hi] = footprint(l, byId.get(l.asset!))
      for (const f of s.figures!) {
        if (lo < f.x! + 0.1 && f.x! - 0.1 < hi) {
          const house = { x: 0, z: 0, fov: 50 }
          const top = screenRow(byId.get(l.asset!)!.height_m! * (l.scale ?? 1), DEPTH_Z[l.depth], house)
          expect(top >= screenRow(BODY_OCCLUDE * 1.7, DEPTH_Z.mid, house) - 1e-6, `${l.asset} over ${f.char}`).toBe(true)
        }
      }
    }
  })

  it('frames the picture: fg framing stands at the edges, partly out of frame', () => {
    const tall = dressing(scene(), LIB).filter((l) => l.depth === 'fg' && (l.x! < 0.06 || l.x! > 0.94))
    expect(tall.length).toBeGreaterThanOrEqual(1)
  })

  it('dresses in front of a backdrop: a full-width bg strip and a wide house do not block it (hunebedden sc13)', () => {
    const lib: Library = { ...LIB, assets: [...LIB.assets, A('bg-farmland-01', ['fields', 'farm'], 78, { layer: 'bg', w: 6000, h: 1000 }), A('longhouse-01', ['house', 'farm'], 6, { layer: 'mid', w: 3000, h: 1000 })] }
    const s = scene({ set: { layers: [{ asset: 'bg-farmland-01', depth: 'bg', x: 0.5 }, { asset: 'longhouse-01', depth: 'mid', x: 0.5 }, { asset: 'fire-pit-01', depth: 'fg', x: 0.2, scale: 0.6 }] } })
    const d = dressing(s, lib)
    expect(d.length).toBeGreaterThanOrEqual(4)
    // the house: whatever stands in front of it overlaps only its lowest OCCLUDE of height
    const house = lib.assets.find((a) => a.id === 'longhouse-01')!
    const [hlo, hhi] = footprint({ depth: 'mid', x: 0.5 }, house)
    for (const l of d.filter((x) => x.depth !== 'bg')) {
      const a = lib.assets.find((x) => x.id === l.asset)!
      const [lo, hi] = footprint(l, a)
      if (lo < hhi && hlo < hi) expect(a.height_m! * (l.scale ?? 1), `${l.asset} over the house`).toBeLessThanOrEqual(OCCLUDE * house.height_m! + 1e-6)
    }
  })

  it('never uses a backdrop as a prop, even one with a dressing tag (a river strip tagged palm)', () => {
    const lib: Library = { ...LIB, assets: [...LIB.assets, A('river-01', ['river', 'water', 'palm'], 66, { layer: 'bg', w: 6000, h: 1000 }), A('tree-giant-01', ['tree'], 40)] }
    for (let k = 0; k < 20; k++) {
      const d = dressing(scene({ id: `sc${k}` }), lib)
      expect(d.map((l) => l.asset)).not.toContain('river-01')
      expect(d.map((l) => l.asset)).not.toContain('tree-giant-01')
    }
  })

  it('caps every prop: at most MAX_SHARE of the frame high, framing in the foreground and near band at most EDGE_SHARE', () => {
    // the stage's own view height at a depth (16:9), so this measures what the stage draws
    const viewH = (depth: LayerRef['depth']) => (viewWidthAt(DEPTH_Z[depth]) * 9) / 16
    const shareOf = (l: LayerRef) => (byId.get(l.asset!)!.height_m! * (l.scale ?? 1)) / viewH(l.depth)
    for (let k = 0; k < 20; k++) {
      for (const l of dressing(scene({ id: `sc${k}`, balloons: k % 2 ? [{ char: 'meisje', text: 'Hier wonen wij.' }] : [] }), LIB)) {
        const cap = l.depth === 'near' || l.depth === 'fg' ? EDGE_SHARE : MAX_SHARE
        expect(shareOf(l), `${l.asset}@${l.depth}:${l.x}`).toBeLessThanOrEqual(cap + 0.001)
      }
    }
  })

  it('keeps the clear zones at every camera pose: a near prop never rises over a subject\'s line during the move', () => {
    const poses = [{ x: -5, z: 3, fov: 50 }, { x: 0, z: 0, fov: 50 }, { x: 4, z: -3, fov: 58 }]
    const hut = byId.get('hut-01')!
    for (let k = 0; k < 20; k++) {
      for (const l of dressing({ ...scene({ figures: [] }), id: `sc${k}` }, LIB, { poses }).filter((l) => l.depth === 'fg' || l.depth === 'near')) {
        for (const p of poses) {
          const a = onScreen(footprint(l, byId.get(l.asset!)), DEPTH_Z[l.depth], p), b = onScreen(footprint({ depth: 'mid', x: 0.5 }, hut), DEPTH_Z.mid, p)
          if (!(a[0] < b[1] && b[0] < a[1])) continue
          const top = screenRow(byId.get(l.asset!)!.height_m! * (l.scale ?? 1), DEPTH_Z[l.depth], p)
          expect(top >= screenRow(OCCLUDE * hut.height_m!, DEPTH_Z.mid, p) - 1e-6, `${l.asset}@${l.depth}:${l.x} over the hut at cam x${p.x}`).toBe(true)
        }
      }
    }
  })

  it('is off by default: a scene is dressed only with dress: true', () => {
    expect(dressing(scene({ dress: undefined }), LIB)).toEqual([])
  })

  it('dresses by habitat: nothing in a room or on a deck, wet plants only by water, cargo only on a quay', () => {
    const lib: Library = { ...LIB, assets: [...LIB.assets, A('reeds-01', ['reeds', 'water', 'marsh'], 2.5), A('papyrus-01', ['papyrus', 'egypt'], 2.5),
      A('barrels-01', ['barrels', 'cargo', 'quay'], 1.5), A('crates-01', ['crates', 'cargo'], 1.2)] }
    const bare = (habitat?: string, layers: LayerRef[] = []) => scene({ figures: [], set: { layers, ...(habitat ? { habitat } : {}) } })
    // indoors: household things only (no plants, stones, cargo, animals); a deck: cargo only
    const room = dressing(bare(undefined, [{ need: 'room dutch hall', depth: 'bg', x: 0.5 }]), lib).map((l) => l.asset)
    expect(room.every((a) => ['reeds-01', 'papyrus-01', 'barrels-01', 'crates-01'].indexOf(a!) < 0)).toBe(true)
    expect(dressing(bare('deck'), lib).every((l) => ['barrels-01', 'crates-01'].includes(l.asset!))).toBe(true)
    const dry = dressing(bare('dry'), lib).map((l) => l.asset)
    expect(dry.length).toBeGreaterThan(0)
    expect(dry.filter((a) => /reeds|papyrus|barrels|crates/.test(a!))).toEqual([])
    const quay = dressing(bare('quay'), lib).map((l) => l.asset)
    expect(quay.length).toBeGreaterThan(0)
    expect(quay.every((a) => /barrels|crates/.test(a!))).toBe(true)
    expect(dressing(bare('wet'), lib).some((l) => /reeds|papyrus/.test(l.asset!))).toBe(true)
    expect(habitatOf(bare(undefined, [{ need: 'wide river', depth: 'bg', x: 0.5 }]), lib)).toBe('wet')
  })

  it('never dresses with a structure, even one whose first tag is a dressing role (stone-chamber-01, a hunebed being built)', () => {
    const lib: Library = { ...LIB, assets: [...LIB.assets, A('stone-chamber-01', ['stone', 'boulder', 'capstone', 'chamber', 'rollers'], 2), A('flagged-01', ['stone'], 0.8, { dressing: false })] }
    for (let k = 0; k < 20; k++) expect(dressing(scene({ id: `sc${k}` }), lib).map((l) => l.asset)).not.toContain('stone-chamber-01')
    for (let k = 0; k < 20; k++) expect(dressing(scene({ id: `sc${k}` }), lib).map((l) => l.asset)).not.toContain('flagged-01')
  })

  it('fills the near band: tufts and stones at the bottom corners, partly out of frame, clear of the figures', () => {
    const near = dressing(scene(), LIB).filter((l) => l.depth === 'near')
    expect(near.length).toBeGreaterThanOrEqual(1)
    expect(near.some((l) => l.x! < 0.2 || l.x! > 0.8)).toBe(true)
    for (const l of near) {
      expect(['grass-01', 'heather-01', 'stones-01', 'bramble-01', 'log-01']).toContain(l.asset)
      const [lo, hi] = footprint(l, byId.get(l.asset!))
      for (const f of scene().figures!) {
        if (lo < f.x! + 0.1 && f.x! - 0.1 < hi) {
          const house = { x: 0, z: 0, fov: 50 }
          const top = screenRow(byId.get(l.asset!)!.height_m! * (l.scale ?? 1), DEPTH_Z[l.depth], house)
          expect(top >= screenRow(BODY_OCCLUDE * 1.7, DEPTH_Z.mid, house) - 1e-6, `${l.asset} over ${f.char}`).toBe(true)
        }
      }
    }
  })

  it('brings life to the scene: a grazing herd with a breathing sway, and pots at a house\'s base', () => {
    const lib: Library = { ...LIB, assets: [...LIB.assets, A('goat-01', ['goat', 'animal'], 0.7), A('pot-01', ['pot', 'pottery'], 0.3)] }
    const s = scene({ figures: [], set: { layers: [{ asset: 'hut-01', depth: 'mid', x: 0.5 }] } })
    let herd = 0, pots = 0
    for (let k = 0; k < 10; k++) {
      for (const l of dressing({ ...s, id: `sc${k}` }, lib)) {
        if (l.asset === 'goat-01') { herd++; expect(l.motion).toMatchObject({ kind: 'sway' }) }
        if (l.asset === 'pot-01') { pots++; expect(l.depth).toBe('mid') }
      }
    }
    expect(herd).toBeGreaterThan(0)
    expect(pots).toBeGreaterThan(0)
  })

  it('is calmer on a silence and leaves a scene the teacher opted out alone', () => {
    expect(dressing(scene(), LIB, { silent: true }).length).toBeLessThan(dressing(scene(), LIB).length)
    expect(dressing(scene({ dress: false }), LIB)).toEqual([])
  })
})

// the real libraries, where present: every bundle dresses a bare scene with its own shipped props
const ROOT = '/Users/bartslot/BartsMedia/historyportal/library'
for (const bundle of ['nl-prehistory', 'near-east-neolithic', 'nl-golden-age']) {
  const file = `${ROOT}/${bundle}/library.json`
  describe.skipIf(!existsSync(file))(`real library ${bundle}`, () => {
    it('dresses a bare scene with shipped props only', () => {
      const lib = JSON.parse(readFileSync(file, 'utf8')) as Library
      // each bundle dresses at least one of its outdoor habitats
      const d = ['dry', 'wet', 'quay'].map((habitat) => dressing(scene({ set: { layers: [], habitat }, figures: [] }), lib)).sort((a, b) => b.length - a.length)[0]
      expect(d.length).toBeGreaterThanOrEqual(3)
      for (const l of d) expect(lib.assets.find((a) => a.id === l.asset)!.qa!.score!).toBeGreaterThanOrEqual(SHIP_SCORE)
    })
  })
}

describe('set dressing inside direct()', async () => {
  const { direct } = await import('./direct')
  const { LESSON } = await import('./fixture')
  const lesson = { ...LESSON, scenes: LESSON.scenes.map((s) => ({ ...s, dress: true, set: { sky: 'sky-summer-01', layers: [{ asset: 'hut-01', depth: 'mid' as const, x: 0.5 }] } })) }
  const d = direct(lesson, LIB)

  it('dresses each scene, and a re-run proposes exactly the same', () => {
    expect(d.scenes.every((s) => s.set.layers.some((l) => l.dressed))).toBe(true)
    expect(direct(d, LIB)).toEqual(d)
  })

  it('gives dressed grass and shrubs their sway', () => {
    const swaying = d.scenes.flatMap((s) => s.set.layers.filter((l) => l.dressed && /grass|shrub|bramble/.test(l.need ?? '')))
    expect(swaying.length).toBeGreaterThan(0)
    swaying.forEach((l) => expect(l.motion).toMatchObject({ kind: 'sway' }))
  })

  it('keeps what the teacher did: a removed prop stays removed, an opted-out scene stays bare', () => {
    const s0 = d.scenes[0]
    const removed = s0.set.layers.filter((l) => l.dressed)[0]
    const edited = { ...d, scenes: d.scenes.map((s, i) => (i === 0 ? { ...s, set: { ...s.set, layers: s.set.layers.filter((l) => l !== removed) } } : i === 1 ? { ...s, dress: false, set: { ...s.set, layers: s.set.layers.filter((l) => !l.dressed) } } : s)) }
    const again = direct(edited, LIB)
    expect(again.scenes[0].set.layers.filter((l) => l.dressed)).toEqual(edited.scenes[0].set.layers.filter((l) => l.dressed))
    expect(again.scenes[1].set.layers.some((l) => l.dressed)).toBe(false)
    expect(direct(again, LIB)).toEqual(again)
  })

  it('plans the camera behind the near props: no plain move comes closer than FG_CLEARANCE to them', async () => {
    const { FG_CLEARANCE } = await import('./camera')
    const withNear = d.scenes.filter((s) => s.set.layers.some((l) => l.dressed && l.depth === 'near'))
    expect(withNear.length).toBeGreaterThan(0)
    for (const s of withNear) {
      for (const c of [s.camera!, ...(s.camera_more ?? [])].filter((c) => c && !c.native)) {
        expect(Math.max(c.from.z, c.to.z), `${s.id} ${c.move}`).toBeLessThanOrEqual(DEPTH_Z.near - FG_CLEARANCE + 1e-6)
      }
    }
  })

  it('keeps edge props inside the view each scene opens on (a close or panned shot does not crop them away)', async () => {
    let checked = 0
    for (const s of d.scenes.filter((x) => x.camera && !x.camera.native)) {
      for (const l of s.set.layers.filter((x) => x.dressed && (x.depth === 'near' || x.depth === 'fg'))) {
        const [lo, hi] = windowAt(l.depth, s.camera!.from)
        const [a, b] = footprint(l, byId.get(l.asset!))
        expect(b > lo && a < hi, `${s.id} ${l.asset}@${l.depth} ${l.x} outside [${lo}, ${hi}] of ${s.camera!.move}`).toBe(true)
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('dresses a scene in another bundle from that bundle\'s library', () => {
    const other: Library = { bundle: 'other', assets: [A('crate-01', ['crate', 'cargo'], 1.8), A('barrel-01', ['barrel', 'cargo'], 2)] }
    const l2 = { ...lesson, scenes: lesson.scenes.map((s, i) => (i === 0 ? { ...s, bundle: 'other', set: { ...s.set, habitat: 'quay' } } : s)) }
    const out = direct(l2, LIB, { libraries: { other } })
    expect(out.scenes[0].set.layers.some((l) => l.dressed)).toBe(true)
    expect(out.scenes[0].set.layers.filter((l) => l.dressed).every((l) => ['crate-01', 'barrel-01'].includes(l.asset!))).toBe(true)
  })
})
