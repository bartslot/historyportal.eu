#!/usr/bin/env node
/**
 * check-chunk-budget.mjs — keep the heavy 2.5D stage out of every page that does not play one.
 *
 * Reads public/build/manifest.json and, for each entry, sums the bytes of everything it loads EAGERLY (the entry
 * file plus its static imports, not its dynamic imports). Two rules, both from chunk-budget.json:
 *   1. No entry may grow more than `tolerance` over its recorded size (the app chunk stays within +-5%).
 *   2. Nothing in `lazy` (the babylon chunk) may appear in any entry's eager graph: it is reached only through
 *      the dynamic import in resources/js/scene/stage25d/mount.js.
 * It also prints the size of each lazy chunk, so a stage25d scene's cost is a number in the build log.
 *
 * `node scripts/check-chunk-budget.mjs --record` rewrites the recorded sizes (a deliberate act, in a commit).
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BUILD = 'public/build'
const BUDGET = 'chunk-budget.json'
const manifest = JSON.parse(readFileSync(join(BUILD, 'manifest.json'), 'utf8'))
const budget = JSON.parse(readFileSync(BUDGET, 'utf8'))

const sizeOf = (chunk) => statSync(join(BUILD, chunk.file)).size

function eager(key, seen = new Set()) {
  if (seen.has(key)) return seen
  seen.add(key)
  for (const dep of manifest[key]?.imports ?? []) eager(dep, seen)
  return seen
}

const entries = Object.entries(manifest).filter(([, c]) => c.isEntry && /\.js$/.test(c.file))
const measured = {}
for (const [key] of entries) {
  measured[key] = [...eager(key)].reduce((n, k) => n + sizeOf(manifest[k]), 0)
}

if (process.argv.includes('--record')) {
  writeFileSync(BUDGET, JSON.stringify({ ...budget, entries: measured }, null, 2) + '\n')
  console.log(`chunk budget: recorded ${Object.keys(measured).length} entries`)
  process.exit(0)
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const failures = []
for (const [key, size] of Object.entries(measured)) {
  const base = budget.entries[key]
  if (base === undefined) continue            // a new entry is recorded on purpose, not failed
  if (size > base * (1 + budget.tolerance)) failures.push(`${key}: ${kb(size)} eager, recorded ${kb(base)} (+${(((size / base) - 1) * 100).toFixed(1)}%, limit ${budget.tolerance * 100}%)`)
}
for (const lazy of budget.lazy) {
  const chunks = Object.entries(manifest).filter(([, c]) => c.file.includes(`/${lazy}-`))
  chunks.forEach(([, c]) => console.log(`chunk budget: lazy chunk ${c.file} = ${kb(sizeOf(c))}`))
  for (const [key] of entries) {
    for (const k of eager(key)) {
      if (manifest[k].file.includes(`/${lazy}-`)) failures.push(`${key} loads the lazy "${lazy}" chunk eagerly (via ${k})`)
    }
  }
}
if (failures.length) {
  console.error('chunk budget FAILED:\n  ' + failures.join('\n  '))
  process.exit(1)
}
console.log(`chunk budget ok: ${Object.keys(measured).length} entries within ${budget.tolerance * 100}%`)
