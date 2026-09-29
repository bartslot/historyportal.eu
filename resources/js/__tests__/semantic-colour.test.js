import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'

/**
 * One colour, one spelling.
 *
 * "Error" used to be written eight ways — text-rose-200, -300, -400, bg-rose-900/30,
 * border-rose-700, ring-rose-500/50 and so on, across 108 places — while 26 other places already
 * said `text-error` and got the theme's colour. Success was the same defect in emerald, seven
 * spellings across 63 places against 13 correct ones. The failure that causes is quiet: retune
 * --color-error in the theme and 108 of those 134 places keep the colour they were born with,
 * so the theme stops being the single source of truth without anything visibly breaking.
 *
 * CLAUDE.md already says it: never raw Tailwind colour utilities for chrome. This is that rule,
 * enforced, for the two hues that carry a MEANING.
 *
 * The other off-palette hues below are a different question, and not this test's to answer. They
 * are not error or success spelled wrong; they are a scene-kind colour coding (voyage indigo,
 * gallery violet, strategy teal) plus the dev panel's deliberately-garish fuchsia. Whether the
 * brand wants that system at all is Bart's call, so they sit in OPEN_HUES with the count they had
 * when this was written. Delete an entry once it is decided and the guard turns on for that hue —
 * which is the point of listing them here rather than in a comment somewhere.
 */

const ROOT = resolve(__dirname, '../../..')
const SCANNED = ['resources/views', 'resources/js']
const SKIP = /node_modules|__tests__/

/** The hues that ARE a semantic state, and the token each one has to be written as. */
const SEMANTIC = { rose: 'error', emerald: 'success' }

/** Off-palette decoration, awaiting a decision. The number is what was there on 2026-08-21. */
const OPEN_HUES = { indigo: 14, violet: 15, fuchsia: 13, teal: 6, blue: 0 }

const UTILITIES = [
  'text', 'bg', 'border', 'ring', 'from', 'to', 'via', 'fill', 'stroke', 'shadow',
  'decoration', 'outline', 'divide', 'accent', 'caret', 'placeholder',
].join('|')

/** `bg-rose-500/10`, `hover:text-emerald-300`, `border-l-indigo-400/60` — prefixes and all. */
const utilityFor = (hue) =>
  new RegExp(`\\b(?:${UTILITIES})(?:-[a-z])?-${hue}-\\d{2,3}(?:/\\d{1,3})?\\b`, 'g')

function sourceFiles() {
  const out = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry)
      if (SKIP.test(path)) continue
      if (statSync(path).isDirectory()) walk(path)
      else if (/\.(blade\.php|js)$/.test(entry)) out.push(path)
    }
  }
  for (const dir of SCANNED) walk(resolve(ROOT, dir))
  return out
}

/**
 * Blade and HTML comments, blanked line-for-line so line numbers still point at the real line.
 *
 * A comment is not chrome. Explaining in prose which utility a panel used to carry is exactly how
 * one of these decisions gets recorded, and a guard that trips on its own explanation is a guard
 * people delete the explanation to satisfy.
 */
const withoutComments = (src) =>
  src.replace(/\{\{--[\s\S]*?--\}\}|<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))

/** Every `<file>:<line> <utility>` where `hue` is written as a raw Tailwind colour. */
function rawUses(hue) {
  const found = []
  for (const file of sourceFiles()) {
    const lines = withoutComments(readFileSync(file, 'utf8')).split('\n')
    lines.forEach((line, i) => {
      for (const hit of line.match(utilityFor(hue)) ?? []) {
        found.push(`${relative(ROOT, file)}:${i + 1} ${hit}`)
      }
    })
  }
  return found
}

describe('semantic colour is reached through the theme, not by hue', () => {
  for (const [hue, token] of Object.entries(SEMANTIC)) {
    it(`no raw ${hue}-* utility survives — that colour is \`${token}\``, () => {
      expect(
        rawUses(hue),
        `write these as ${token} (text-${token}, bg-${token}/10, border-${token}/40, alert-${token}) ` +
        `so retuning --color-${token} moves them`,
      ).toEqual([])
    })
  }

  // A hue that quietly SPREADS while waiting for a decision is worse than one that is simply
  // undecided, so the count is pinned. Going up fails; going down means someone resolved some and
  // should lower the number — or remove the hue, which turns the guard above on for it.
  for (const [hue, ceiling] of Object.entries(OPEN_HUES)) {
    it(`off-palette ${hue}-* has not spread beyond the ${ceiling} awaiting a decision`, () => {
      expect(rawUses(hue).length).toBeLessThanOrEqual(ceiling)
    })
  }
})
