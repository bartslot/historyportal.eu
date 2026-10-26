import { describe, expect, it } from 'vitest'
import { collectMediaUrls, findStaleFrames, isSiteGroundChallenge, parseLessonJson, pictureKey, sceneChanges, scenePictureKeys } from './demo-check-analysis.mjs'

describe('demo-check analysis', () => {
  it('detects the SiteGround challenge by status or body', () => {
    expect(isSiteGroundChallenge(202, '')).toBe(true)
    expect(isSiteGroundChallenge(200, '<script src="/.well-known/sgcaptcha/x">')).toBe(true)
    expect(isSiteGroundChallenge(200, '<html>fine</html>')).toBe(false)
  })

  it('reads window.LESSON from the player page', () => {
    expect(parseLessonJson('<script>\n    window.LESSON = {"id":63,"scenes":[]};\n</script>')).toEqual({ id: 63, scenes: [] })
    expect(parseLessonJson('<html></html>')).toBeNull()
  })

  it('collects media urls, resolves relative ones and ignores non-media strings', () => {
    const urls = collectMediaUrls({ a: '/storage/x.webp', b: ['https://cdn.example/y.m4a?v=1', 'not a url.webp', 'https://x/page'] }, 'https://historyportal.eu/')
    expect(urls).toEqual(['https://historyportal.eu/storage/x.webp', 'https://cdn.example/y.m4a?v=1'])
  })

  it('matches a picture across its CDN and storage variants', () => {
    expect(pictureKey('https://res.cloudinary.com/a/f_auto/v1/library/tasman/golden_bay_dusk.webp')).toBe('golden_bay_dusk')
    expect(pictureKey('url("/storage/svg-assets/tasman/golden-bay-dusk.depth.webp")')).toBe('golden_bay_dusk')
  })

  it('flags a flat picture from an older scene with no panel over it, and nothing else', () => {
    const scenes = [{ image_url: '/a.webp' }, { image_url: '/b.webp' }, { image_url: '/c.webp' }]
    const keysOf = (i) => scenePictureKeys(scenes[i])
    const samples = [
      { t: 0, idx: 1, flat: [{ url: 'url("/b.webp")', op: 1 }], px: [] },
      { t: 40, idx: 2, flat: [{ url: 'url("/a.webp")', op: 1 }], px: [0.2] },   // stale: scene 0's picture
      { t: 80, idx: 2, flat: [{ url: 'url("/a.webp")', op: 1 }], px: [1] },     // covered by the panel
      { t: 120, idx: 2, flat: [{ url: 'url("/c.webp")', op: 1 }], px: [] },
    ]
    const [change] = sceneChanges(samples)
    expect(change).toMatchObject({ from: 1, to: 2 })
    expect(findStaleFrames(samples, 1, 2, keysOf).map((s) => s.t)).toEqual([40])
  })
})
