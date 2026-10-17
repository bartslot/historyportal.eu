import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  posterVariants, variantFor, uprightCover, UPRIGHT,
  posterFit, boxInGroup, groupRuns, frameCqw, layerTransform, entrancePlan, episodeSize, EPISODE_SHARE,
  ENTRANCE_BUDGET_MS, PHONE_GUTTER_PX, mountTitlePoster, coverBackdrop, COVER_FOCUS_Y,
} from '../title-poster.js'

const tasman = JSON.parse(readFileSync(resolve(__dirname, '../../../public/lesson-titles/tasman-standard/poster/poster.json'), 'utf8'))
const cover = JSON.parse(readFileSync(resolve(__dirname, '../../../public/lesson-titles/tasman-standard/cover/poster.json'), 'utf8'))
const close = (a, b, eps = 0.01) => expect(Math.abs(a - b)).toBeLessThan(eps)

describe('posterFit', () => {
  test('a landscape view fits the whole frame, centred (object-fit: contain)', () => {
    const r = posterFit(1440, 900, tasman)
    close(r.height, 900)
    close(r.width, 900 * tasman.frame.w / tasman.frame.h)
    close(r.left, (1440 - r.width) / 2)
    close(r.top, 0)
  })

  test('a portrait phone fills its width with the letters, a 16px gutter each side', () => {
    const r = posterFit(375, 812, tasman)
    const f = tasman.focus
    const lettersLeft = r.left + f.x / 100 * r.width
    const lettersRight = lettersLeft + f.w / 100 * r.width
    close(lettersLeft, PHONE_GUTTER_PX)
    close(lettersRight, 375 - PHONE_GUTTER_PX)
    // centred vertically on the letters
    close(r.top + (f.y + f.h / 2) / 100 * r.height, 812 / 2)
  })

  test('an empty view has no frame', () => {
    expect(posterFit(0, 0, tasman)).toEqual({ left: 0, top: 0, width: 0, height: 0 })
  })
})

describe('boxes and groups', () => {
  test('a frame box becomes a share of its group box', () => {
    expect(boxInGroup({ x: 30, y: 20, w: 10, h: 5 }, { x: 10, y: 10, w: 50, h: 50 })).toEqual({ x: 40, y: 20, w: 20, h: 10 })
    expect(boxInGroup({ x: 1, y: 2, w: 3, h: 4 })).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })

  test('the Tasman scene layers all sit at the shared mask origin Figma uses', () => {
    // Figma: the ships' mask-position is (-1213.668, -136.035) px from the ships' own corner.
    const ships = tasman.layers.find(l => l.id === 'voc-ships')
    const mask = tasman.groups.scene.box
    close((ships.box.x - mask.x) / 100 * tasman.frame.w, 1213.668, 1)
    close((ships.box.y - mask.y) / 100 * tasman.frame.h, 136.035, 1)
  })

  test('consecutive layers of one group share a wrapper, z-order kept', () => {
    const runs = groupRuns([{ id: 'a' }, { id: 'b', group: 'g' }, { id: 'c', group: 'g' }, { id: 'd' }])
    expect(runs.map(r => [r.group, r.layers.map(l => l.id).join('')])).toEqual([[null, 'a'], ['g', 'bc'], [null, 'd']])
  })

  test('Tasman stacks: ABEL, TASMAN (shadow group), then the masked scene with outlines last', () => {
    expect(groupRuns(tasman.layers).map(r => r.group)).toEqual([null, 'tasman', 'scene'])
    expect(tasman.layers.at(-1).id).toBe('outlines')
  })

  test('frame px become container-width units', () => {
    expect(frameCqw(90, { frame: { w: 9000 } })).toBe('1cqw')
  })

  test('flip goes first, then the rotation', () => {
    expect(layerTransform({ flip: 'x', rotate: 0.88 })).toBe('rotate(0.88deg) scaleX(-1)')
    expect(layerTransform({})).toBe('')
  })
})

describe('entrancePlan', () => {
  test('letters drop in order, the scene follows, all inside the budget', () => {
    const { steps, totalMs } = entrancePlan(tasman.layers)
    const drops = steps.filter(s => s.kind === 'drop')
    expect(drops.map(s => s.id)).toEqual(['a', 'b', 'e', 'l', 's', 't', 'm', 'n', 'a1', 'a2'])
    expect(drops.every((s, i) => i === 0 || s.delay > drops[i - 1].delay)).toBe(true)
    const fades = steps.filter(s => s.kind === 'fade')
    expect(fades.length).toBe(7)
    expect(fades[0].delay).toBeGreaterThan(drops.at(-1).delay)
    expect(totalMs).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS)
  })

  test('nothing to enter is an empty plan', () => {
    expect(entrancePlan([])).toEqual({ steps: [], totalMs: 0 })
  })
})

describe('mountTitlePoster', () => {
  test('builds the groups in order under the subtitle, masked scene and shadowed letters', () => {
    const host = document.createElement('div')
    const stage = document.createElement('div')
    const subtitle = document.createElement('span')
    stage.appendChild(subtitle)
    host.appendChild(stage)
    const poster = {
      ...tasman,
      layers: tasman.layers.map(l => ({ ...l, url: `/x/${l.src}` })),
      groups: { ...tasman.groups, scene: { ...tasman.groups.scene, mask_url: '/x/mask.svg' } },
    }
    const stop = mountTitlePoster(host, stage, poster)
    const groups = stage.querySelectorAll(':scope > .title-poster-group')
    expect(groups.length).toBe(3)
    expect(stage.lastChild).toBe(subtitle)
    expect(groups[1].style.filter).toContain('drop-shadow')
    expect(groups[2].style.maskImage || groups[2].style.webkitMaskImage).toContain('/x/mask.svg')
    expect(stage.querySelector('[data-poster-layer="wave-break"]').style.transform).toBe('rotate(0.88deg) scaleX(-1)')
    stop()
  })
})

describe('the comic cover (fit: cover)', () => {
  const inView = (r, f, viewW, viewH) => {
    const left = r.left + f.x / 100 * r.width
    const top = r.top + f.y / 100 * r.height
    expect(left).toBeGreaterThanOrEqual(0)
    expect(top).toBeGreaterThanOrEqual(0)
    expect(left + f.w / 100 * r.width).toBeLessThanOrEqual(viewW + 0.01)
    expect(top + f.h / 100 * r.height).toBeLessThanOrEqual(viewH + 0.01)
  }

  test('a desktop view is filled edge to edge, no colour bars, the focus in sight', () => {
    const r = posterFit(1440, 900, cover)
    expect(r.left).toBeLessThanOrEqual(0)
    expect(r.top).toBeLessThanOrEqual(0)
    expect(r.left + r.width).toBeGreaterThanOrEqual(1440 - 0.01)
    expect(r.top + r.height).toBeGreaterThanOrEqual(900 - 0.01)
    inView(r, cover.focus, 1440, 900)
  })

  test('a phone keeps Tasman, the spyglass and the title across its width, 16px gutters, no side bars', () => {
    const r = posterFit(375, 812, cover)
    const f = cover.focus
    close(r.left + f.x / 100 * r.width, PHONE_GUTTER_PX, 1)
    close(r.left + (f.x + f.w) / 100 * r.width, 375 - PHONE_GUTTER_PX, 1)
    expect(r.left).toBeLessThanOrEqual(0)
    expect(r.left + r.width).toBeGreaterThanOrEqual(375)
    close(r.top + (f.y + f.h / 2) / 100 * r.height, 812 * COVER_FOCUS_Y, 1)
    inView(r, f, 375, 812)
  })

  test('a tall phone gets sky above and the deck colour below the painting', () => {
    const r = posterFit(375, 812, cover)
    const split = Math.round(r.top + r.height / 2)
    expect(coverBackdrop(cover, r)).toBe(`linear-gradient(to bottom, ${cover.background} ${split}px, ${cover.background_bottom} ${split}px)`)
    expect(coverBackdrop({ ...cover, background_bottom: null }, r)).toBeNull()
  })

  test('the painting is on screen from the first frame; the letters drop, the series line fades', () => {
    const plan = entrancePlan(cover.layers)
    expect(plan.steps.find(s => s.id === 'plate')).toBeUndefined()
    expect(plan.steps.filter(s => s.kind === 'drop').map(s => s.id).join('')).toBe('abelta1sma2n')
    expect(plan.steps.find(s => s.id === 'series').kind).toBe('fade')
    expect(plan.totalMs).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS)
  })
})

const banner = JSON.parse(readFileSync(resolve(__dirname, '../../../public/lesson-titles/tasman-standard/banner/poster.json'), 'utf8'))

describe('the banner (Figma 2321:1315, fit: cover)', () => {
  test('a desktop view fills edge to edge with the lettering and both ribbons in sight', () => {
    const r = posterFit(1440, 900, banner)
    expect(r.left).toBeLessThanOrEqual(0)
    expect(r.top).toBeLessThanOrEqual(0)
    expect(r.left + r.width).toBeGreaterThanOrEqual(1440 - 0.01)
    expect(r.top + r.height).toBeGreaterThanOrEqual(900 - 0.01)
    const f = banner.focus
    expect(r.left + f.x / 100 * r.width).toBeGreaterThanOrEqual(0)
    expect(r.top + (f.y + f.h) / 100 * r.height).toBeLessThanOrEqual(900)
  })

  test('a 375px phone shows the lettering across its width less 16px gutters, nothing past the edge', () => {
    const r = posterFit(375, 812, banner)
    const f = banner.focus
    close(r.left + f.x / 100 * r.width, PHONE_GUTTER_PX, 1)
    close(r.left + (f.x + f.w) / 100 * r.width, 375 - PHONE_GUTTER_PX, 1)
    expect(r.left).toBeLessThanOrEqual(0)
    expect(r.left + r.width).toBeGreaterThanOrEqual(375)
  })

  test('the ribbons fade in, the ten letters drop, the painting is there from the first frame', () => {
    const plan = entrancePlan(banner.layers)
    expect(plan.steps.find(s => s.id === 'painting')).toBeUndefined()
    expect(plan.steps.filter(s => s.kind === 'drop').map(s => s.id).join('')).toBe('abelta1sma2n')
    expect(plan.steps.filter(s => s.kind === 'fade').map(s => s.id)).toEqual(['ribbon-subtitle', 'ribbon-title'])
    expect(plan.totalMs).toBeLessThanOrEqual(ENTRANCE_BUDGET_MS)
  })

  test('the subtitle sits on the subtitle ribbon', () => {
    const ribbon = banner.layers.find(l => l.id === 'ribbon-subtitle').box
    const s = banner.subtitle.box
    const middle = s.y + s.h / 2
    expect(middle).toBeGreaterThan(ribbon.y + ribbon.h / 2)
    expect(middle).toBeLessThan(ribbon.y + ribbon.h)
  })
})

describe('the episode line', () => {
  const poster = (size) => ({ frame: { w: 2880, h: 1621 }, subtitle: { size }, layers: [
    { enter: 'drop', box: { h: 7.08 } }, { enter: 'drop', box: { h: 7.08 } }, { enter: 'fade', box: { h: 90 } },
  ] })

  it('stays well under the letters: about a third of their height in font-size', () => {
    expect(episodeSize(poster(2.4))).toBeCloseTo(EPISODE_SHARE * 7.08 * 1621 / 2880, 2)
  })

  it('keeps a size already small enough', () => {
    expect(episodeSize(poster(0.8))).toBe(0.8)
  })
})

/**
 * The upright Tasman poster (Bart, 2026-10-17, Figma 2348:1089): a phone held upright shows the
 * candidate's portrait.json, the same data as the landscape one; a landscape view keeps its own.
 */
describe('the poster for the view\'s orientation', () => {
  const landscape = { frame: { w: 8696, h: 5679 }, layers: [{ id: 'a' }], portrait: { frame: { w: 5679, h: 8696 }, layers: [{ id: 'tasman' }] } }

  it('splits a candidate into its two variants once, each without the other', () => {
    const v = posterVariants(landscape)
    expect(v.landscape.frame.w).toBe(8696)
    expect(v.landscape.portrait).toBeUndefined()
    expect(v.portrait.frame.h).toBe(8696)
    expect(posterVariants({ frame: { w: 1, h: 1 }, layers: [] }).portrait).toBeNull()
    expect(posterVariants(null)).toBeNull()
  })

  it('an upright view gets the portrait, any other the landscape, and the same object each time', () => {
    const v = posterVariants(landscape)
    expect(variantFor(v, 375, 812)).toBe(v.portrait)
    expect(variantFor(v, 812, 375)).toBe(v.landscape)
    expect(variantFor(v, 600, 600)).toBe(v.landscape)
    const plain = posterVariants({ frame: { w: 1, h: 1 }, layers: [] })
    expect(variantFor(plain, 375, 812)).toBe(plain.landscape)   // no portrait: the one it has
    expect(variantFor(null, 375, 812)).toBeNull()
  })
})

describe('a poster mounted again', () => {
  it('stopping takes its layers out, so the next variant never stacks on the last one', () => {
    const host = document.createElement('div')
    const stage = document.createElement('div')
    host.appendChild(stage)
    const p = { frame: { w: 100, h: 150 }, background: '#F03E4A', layers: [{ id: 'a', url: '/a.svg', box: { x: 0, y: 0, w: 10, h: 10 }, enter: 'drop' }] }
    const stop = mountTitlePoster(host, stage, p)
    const count = () => stage.querySelectorAll('img').length
    expect(count()).toBe(1)
    stop()
    expect(count()).toBe(0)
    mountTitlePoster(host, stage, p)
    expect(count()).toBe(1)
  })
})

/**
 * A painted candidate (fit: cover) without a portrait.json on a phone held upright (PM, 2026-10-17:
 * W24VRI's banner showed the picture in the top half over a flat brown fill). Its upright layout is
 * derived from the same assets: the picture fills the tall frame, the title block below it.
 */
describe('a painted poster held upright, derived from its own assets', () => {
  const box = (b) => (Array.isArray(b) ? { x: b[0], y: b[1], w: b[2], h: b[3] } : b)
  const parsed = (p) => ({ ...p, keep_clear: p.keep_clear.map(k => ({ ...k, box: box(k.box) })) })
  const full = (b) => b.x <= 0 && b.y <= 0 && b.x + b.w >= 100 && b.y + b.h >= 100
  const union = (bs) => {
    const x = Math.min(...bs.map(b => b.x)); const y = Math.min(...bs.map(b => b.y))
    return { x, y, w: Math.max(...bs.map(b => b.x + b.w)) - x, h: Math.max(...bs.map(b => b.y + b.h)) - y }
  }
  const px = (b, p) => ({ x: b.x / 100 * p.frame.w, y: b.y / 100 * p.frame.h, w: b.w / 100 * p.frame.w, h: b.h / 100 * p.frame.h })

  it('fills the whole tall frame with the picture, its own shape kept: no letterbox, no flat fill', () => {
    const up = uprightCover(parsed(banner), 375, 812)
    close(up.frame.h / up.frame.w, 812 / 375, 0.01)
    const pic = up.layers.find(l => l.id === 'painting')
    expect(full(pic.box)).toBe(true)
    const was = banner.layers.find(l => l.id === 'painting').box
    close(px(pic.box, up).w / px(pic.box, up).h, (was.w * banner.frame.w) / (was.h * banner.frame.h), 0.01)
    expect(up.fit).toBe('cover')
    expect(up.background_bottom).toBeNull()
    expect(coverBackdrop(up, posterFit(375, 812, up))).toBeNull()
    const r = posterFit(375, 812, up)
    expect(r.left).toBeLessThanOrEqual(0)
    expect(r.top).toBeLessThanOrEqual(0)
    expect(r.left + r.width).toBeGreaterThanOrEqual(375 - 0.01)
    expect(r.top + r.height).toBeGreaterThanOrEqual(812 - 0.01)
  })

  it('sets the letters, ribbons and subtitle as one block across the width, larger, low on the screen', () => {
    const up = uprightCover(parsed(banner), 375, 812)
    const block = union(up.layers.filter(l => !full(l.box)).map(l => l.box).concat([up.subtitle.box]))
    close(block.x, UPRIGHT.gutterPx / 375 * 100, 0.01)
    close(block.x + block.w, 100 - UPRIGHT.gutterPx / 375 * 100, 0.01)
    close(block.y + block.h, UPRIGHT.blockBottom * 100, 0.01)
    // the same drawing, scaled as one: every piece keeps its place relative to the letter A
    const a0 = px(banner.layers.find(l => l.id === 'a').box, banner); const a1 = px(up.layers.find(l => l.id === 'a').box, up)
    const n0 = px(banner.layers.find(l => l.id === 'n').box, banner); const n1 = px(up.layers.find(l => l.id === 'n').box, up)
    const k = a1.w / a0.w
    close(a1.h / a0.h, k, 0.001)
    close(n1.x - a1.x, (n0.x - a0.x) * k, 0.01)
    close(n1.y - a1.y, (n0.y - a0.y) * k, 0.01)
    // never smaller than the landscape poster's own phone fit (already the full width less the gutters)
    const before = posterFit(375, 812, banner).width * banner.layers.find(l => l.id === 'a').box.w / 100
    const after = posterFit(375, 812, up).width * up.layers.find(l => l.id === 'a').box.w / 100
    expect(after).toBeGreaterThan(before * 0.98)
    // the subtitle font scales with the drawing, and its box stays on the subtitle ribbon
    close(up.subtitle.size / 100 * up.frame.w, banner.subtitle.size / 100 * banner.frame.w * k, 0.01)
    const rib = up.layers.find(l => l.id === 'ribbon-subtitle').box; const sub = up.subtitle.box
    expect(sub.y + sub.h / 2).toBeGreaterThan(rib.y)
    expect(sub.y + sub.h / 2).toBeLessThan(rib.y + rib.h)
    // focus and the letters' keep_clear follow the block
    expect(up.focus.y).toBeCloseTo(block.y, 1)
    for (const k of up.keep_clear.filter(k => k.kind === 'letters')) {
      expect(k.box.x).toBeGreaterThanOrEqual(block.x - 0.1)
      expect(k.box.y + k.box.h).toBeLessThanOrEqual(block.y + block.h + 0.01)
    }
  })

  it('slides the picture so its subject is in the middle, never past an edge', () => {
    const pic = { id: 'picture', box: { x: 0, y: 0, w: 100, h: 100 } }
    const p = { frame: { w: 1600, h: 900 }, fit: 'cover', background: '#000', layers: [pic, { id: 'a', enter: 'drop', box: { x: 40, y: 70, w: 20, h: 20 } }],
      keep_clear: [{ kind: 'figure', box: { x: 20, y: 10, w: 10, h: 60 }, weight: 3 }] }
    const up = uprightCover(p, 400, 800)
    const b = up.layers[0].box
    close(b.x + 25 / 100 * b.w, 50, 0.01)   // the figure's middle (25% of the picture) in the middle
    const edge = uprightCover({ ...p, keep_clear: [{ kind: 'figure', box: { x: 0, y: 0, w: 4, h: 50 } }] }, 400, 800).layers[0].box
    close(edge.x, 0, 0.001)
    const none = uprightCover({ ...p, keep_clear: [] }, 400, 800).layers[0].box
    close(none.x + none.w / 2, 50, 0.01)
    // a teacher's own picture: its own keep_clear (% of that picture) decides
    const own = uprightCover({ ...p, keep_clear: [] }, 400, 800, [{ kind: 'face', box: { x: 70, y: 10, w: 10, h: 10 } }]).layers[0].box
    close(own.x + 75 / 100 * own.w, 50, 0.01)
  })

  it('stacks one long line of letters into two rows at its widest gap, each centred', () => {
    const up = uprightCover(parsed(cover), 375, 812)
    const row = (ids) => union(ids.map(id => up.layers.find(l => l.id === id).box))
    const top = row(['a', 'b', 'e', 'l']); const bottom = row(['t', 'a1', 's', 'm', 'a2', 'n'])
    expect(bottom.y).toBeGreaterThan(top.y + top.h)
    close(top.x + top.w / 2, 50, 0.5)
    close(bottom.x + bottom.w / 2, 50, 0.5)
    const sub = up.subtitle.box; const series = up.layers.find(l => l.id === 'series').box
    expect(sub.y).toBeGreaterThan(bottom.y + bottom.h)
    expect(series.y + series.h).toBeLessThanOrEqual(top.y + 0.01)
    expect(up.keep_clear.filter(k => k.kind === 'letters').length).toBeGreaterThanOrEqual(2)
  })

  it('is what an upright view gets when the candidate has no portrait.json; a flat poster stays as it is', () => {
    const v = posterVariants(parsed(banner))
    expect(variantFor(v, 375, 812).layers.find(l => l.id === 'painting').box.w).toBeGreaterThan(200)
    expect(variantFor(v, 812, 375)).toBe(v.landscape)
    const flat = posterVariants({ frame: { w: 2, h: 1 }, layers: [] })
    expect(variantFor(flat, 375, 812)).toBe(flat.landscape)
  })
})

/**
 * The episode line between ABEL and TASMAN (Bart's Figma 2321:923 puts it there) clears both rows
 * with room to breathe: measured on the render (PM, 2026-10-17) it touched ABEL's shadow. Coming
 * Soon's line box is LINE_BOX x its font-size (1440x900 render: 25px box at 15.95px).
 */
describe('the Tasman poster\'s episode line', () => {
  const LINE_BOX = 1.57
  it('sits in the middle of the gap between the rows, at least half its own height clear each side', () => {
    const px = (l) => ({ top: l.box.y / 100 * tasman.frame.h, bottom: (l.box.y + l.box.h) / 100 * tasman.frame.h })
    const abelBottom = Math.max(...['a', 'b', 'e', 'l'].map(id => px(tasman.layers.find(l => l.id === id)).bottom))
    const tasTop = Math.min(...['t', 'a2', 's', 'm', 'a1', 'n'].map(id => px(tasman.layers.find(l => l.id === id)).top))
    const line = episodeSize(tasman) / 100 * tasman.frame.w * LINE_BOX
    const mid = (tasman.subtitle.box.y + tasman.subtitle.box.h / 2) / 100 * tasman.frame.h
    close(mid, (abelBottom + tasTop) / 2, tasman.frame.h * 0.003)
    expect(mid - line / 2 - abelBottom).toBeGreaterThanOrEqual(line / 2)
    expect(tasTop - (mid + line / 2)).toBeGreaterThanOrEqual(line / 2)
  })
})
