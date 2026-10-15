import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

/**
 * One amber, and it is amber-500.
 *
 * Bart 2026-10-15, on the quiz card's lemon Submit button: "This yellow, globally needs to change
 * into amber" and "Amber is our color not that ugly yellow". The theme's primary was amber-300
 * (a pale lemon) and two dozen places had that lemon, or amber-400, typed in by hand, so changing
 * the theme alone would have left half the app yellow. The theme token is the only place the
 * brand amber is written; everything else reads it.
 */

const ROOT = resolve(__dirname, '../../..')
const css = readFileSync(resolve(ROOT, 'resources/css/app.css'), 'utf8')
const theme = css.slice(css.indexOf('@plugin "daisyui/theme"'), css.indexOf('}', css.indexOf('@plugin "daisyui/theme"')))
const token = (name) => theme.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim()

const AMBER_500 = 'oklch(76.9% 0.188 70.08)'

// amber-300 and amber-400, in every spelling the codebase has used.
const LEMON = /#fcd34d|#fbbf24|252,\s*211,\s*77|251,\s*191,\s*36|87\.9% 0\.169 91\.6/i

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name)
  if (name === '__tests__' || name === 'node_modules') return []
  return statSync(path).isDirectory() ? walk(path) : [path]
})

describe('the brand amber', () => {
  it('is amber-500 in the theme, for primary, secondary and links', () => {
    expect(token('color-primary')).toBe(AMBER_500)
    expect(token('color-secondary')).toBe(AMBER_500)
    expect(token('color-link')).toBe(AMBER_500)
  })

  it('is not typed in by hand anywhere as the old lemon (amber-300) or amber-400', () => {
    const files = [...walk(resolve(ROOT, 'resources/js')), ...walk(resolve(ROOT, 'resources/views')), resolve(ROOT, 'resources/css/app.css')]
      .filter((f) => /\.(js|jsx|ts|css|php)$/.test(f))
    const hits = files.flatMap((f) => readFileSync(f, 'utf8').split('\n')
      .map((line, i) => ({ line, at: `${relative(ROOT, f)}:${i + 1}` }))
      // --color-warning is the one amber that does semantic work (the report's grade scale).
      .filter(({ line }) => LEMON.test(line) && !line.includes('--color-warning:')))
    expect(hits.map((h) => h.at)).toEqual([])
  })
})

describe('the theme surfaces', () => {
  // DaisyUI paints --noise as an SVG film grain on every button; on a ghost button's hover it read
  // as "weird artifacts" across the pill. The look is flat: no grain, no depth.
  it('has no film grain on buttons', () => {
    expect(token('noise')).toBe('0')
  })
})
