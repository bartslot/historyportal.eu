import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Babylon drops whole-line // comments, but splits the rest of the shader at every ';', so a ';' in a comment that
// follows code pushes the rest of that comment onto a code line and the shader stops compiling (every picture on the
// stage vanishes).
describe('stage shaders', () => {
  it('no comment after code inside a shader holds a ;', () => {
    const dir = __dirname
    const bad: string[] = []
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts'))) {
      const src = readFileSync(join(dir, f), 'utf8')
      for (const m of src.matchAll(/ShadersStore\.\w+ = `([\s\S]*?)`/g)) {
        for (const line of m[1].split('\n')) if (/^\s*[^\s/].*\/\/.*;/.test(line)) bad.push(`${f}: ${line.trim()}`)
      }
    }
    expect(bad).toEqual([])
  })
})
