import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { passSvg } from '../svg-piece.js'

const KINDS = ['skin', 'tunic', 'shawl', 'hair', 'rope', 'tie', 'white', 'grey', 'apron', 'ochre']
const helmet = readFileSync(resolve(process.cwd(), 'public/character-kits/babylonia-old-babylonian/v1/man/headwear-man-helmet.svg'), 'utf8')
const parse = (t) => new DOMParser().parseFromString(t, 'image/svg+xml').documentElement

describe('passSvg: an SVG kit piece as the layers a baked piece has', () => {
  it('keeps only the fill group, painted in the kind key (ochre = 10 + 18 x 9)', () => {
    const svg = parse(passSvg(helmet, 'fill', KINDS, [412, 340]))
    expect(svg.querySelectorAll('g.ink, g.shade, g.cast')).toHaveLength(0)
    expect(svg.querySelector('[data-kind]').getAttribute('fill')).toBe('rgb(172,172,172)')
    expect(svg.getAttribute('width')).toBe('412')
  })

  it('draws a mask at its own strength, not the faint opacity the picture view uses', () => {
    const svg = parse(passSvg(helmet, 'shade', KINDS, [412, 340]))
    expect(svg.querySelector('g.shade').getAttribute('opacity')).toBe('0.55')
    expect(svg.querySelector('g.fill')).toBeNull()
  })

  it('returns null for a group the piece does not have', () => {
    const plain = '<svg xmlns="http://www.w3.org/2000/svg"><g class="fill"><path data-kind="ochre" d="M0 0h4v4z"/></g></svg>'
    expect(passSvg(plain, 'cast', KINDS, [4, 4])).toBeNull()
  })

  it('refuses a kind the kit does not know, instead of painting it as the first kind', () => {
    const bad = '<svg xmlns="http://www.w3.org/2000/svg"><g class="fill"><path data-kind="gold" d="M0 0h4v4z"/></g></svg>'
    expect(() => passSvg(bad, 'fill', KINDS, [4, 4])).toThrow(/gold/)
  })
})
