// node engine-mvp/tools/direct-export.mjs <lesson.json> <library.json> <out.json>
// Runs the director (src/director/direct.ts, the one implementation) over a writer's lesson.json and writes the
// directed lesson: camera, camera_more, ground bands, painted figure layers, sound plan, balloon timings.
// `php artisan lessons:import-25d` reads this file. esbuild (already in the root install via vite) bundles the TS.
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const [lessonPath, libraryPath, outPath] = process.argv.slice(2)
if (!lessonPath || !libraryPath || !outPath) {
  console.error('usage: direct-export.mjs <lesson.json> <library.json> <out.json>')
  process.exit(2)
}
const here = dirname(fileURLToPath(import.meta.url))
const tmp = mkdtempSync(join(tmpdir(), 'direct-export-'))
const bundled = join(tmp, 'direct.mjs')
await build({
  entryPoints: [join(here, '../src/director/direct.ts')], outfile: bundled, bundle: true, platform: 'node', format: 'esm',
  loader: { '.json': 'json' }, logLevel: 'error',
})
const { direct } = await import(pathToFileURL(bundled).href)
const lesson = JSON.parse(readFileSync(lessonPath, 'utf8'))
const lib = JSON.parse(readFileSync(libraryPath, 'utf8'))
const directed = direct(lesson, lib, { libraries: { [lesson.bundle]: lib } })
writeFileSync(outPath, JSON.stringify(directed))
console.log(`directed ${directed.scenes.length} scenes -> ${outPath}`)
