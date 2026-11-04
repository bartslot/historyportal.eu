import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAlphaMaps } from '../alpha.js'

// two files: the library's is all paint, the edited copy has its left half erased
const FILES = {
  'https://lib/fig.webp': [255, 255],
  '/storage/lessons/1/edits/new.webp': [0, 255],
}

describe('which points of a picture are paint', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', class {
      set src (url) {
        this.url = url
        this.naturalWidth = 2
        this.naturalHeight = 1
        if (url in FILES) this.onload?.(); else this.onerror?.()
      }
    })
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      let drawn = null
      return {
        getContext: () => ({
          drawImage: (img) => { drawn = FILES[img.url] },
          getImageData: () => ({ data: new Uint8ClampedArray(drawn.flatMap((a) => [9, 9, 9, a])) }),
        }),
      }
    })
  })
  afterEach(() => vi.restoreAllMocks())

  const lib = { file: 'fig.webp' }

  it('reads the library file of a picture nobody edited', () => {
    const maps = createAlphaMaps('https://lib/')
    maps.prime([lib])
    expect(maps.opaque(lib, 0.1, 0.5)).toBe(true)
    expect(maps.opaque(lib, 0.9, 0.5)).toBe(true)
  })

  it('reads the new file of an edited picture, so what was erased no longer picks', () => {
    const maps = createAlphaMaps('https://lib/')
    maps.prime([lib])                                                       // the old file is already known
    const edited = { ...lib, src: '/storage/lessons/1/edits/new.webp' }
    maps.opaque(edited, 0.1, 0.5)                                           // first read starts the load
    expect(maps.opaque(edited, 0.1, 0.5)).toBe(false)
    expect(maps.opaque(edited, 0.9, 0.5)).toBe(true)
    expect(maps.opaque(lib, 0.1, 0.5)).toBe(true)                           // and the library picture is untouched
  })

  it('a picture that failed to load counts as paint: it can still be picked', () => {
    const maps = createAlphaMaps('https://lib/')
    maps.opaque({ file: 'missing.webp' }, 0.5, 0.5)
    expect(maps.opaque({ file: 'missing.webp' }, 0.5, 0.5)).toBe(true)
  })
})
