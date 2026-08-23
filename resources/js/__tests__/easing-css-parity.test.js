import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gsap } from 'gsap'
import { GSAP_EASE, EASE, CURVE, EASING } from '../easing.js'

/**
 * The app has ONE motion vocabulary, it is GSAP's, and every half of the app can say it.
 *
 * There used to be three. GSAP ran seventeen ease strings across sixty-nine call sites.
 * resources/js/easing.js defined its own five curves in Penner's names, unaware of GSAP. And
 * app.css wrote out twenty-three more by hand, so the quiz card entered on a curve no other reveal
 * used and a Playwright spec had to exist to say so. Bart's call was that GSAP wins, so easing.js
 * is now a mapping over GSAP_EASE and the stylesheets mirror it as --ease-*.
 *
 * A mapping is only worth having while it still maps, so this file is where GSAP gets to be the
 * authority in practice rather than in a comment. It imports gsap itself and checks:
 *
 *   1. every CURVE.* function IS the GSAP ease it claims (exactly — these are the same maths),
 *   2. every EASING.* function IS the GSAP ease named in its comment (exactly, same reason),
 *   3. every EASE.* bezier tracks GSAP's real output (a bezier cannot always be exact, so: 0.004),
 *   4. every --ease-* token equals its EASE.* counterpart, and
 *   5. nothing else in either stylesheet writes a curve out at all.
 *
 * (5) is the half that stops the drift coming back, and it is stricter than it used to be. It only
 * caught curves that exactly matched one of the five, so the twenty-three that did not match were
 * invisible to it — including the quiz card's, the one the Playwright spec was written about. Any
 * hand-written cubic-bezier is now a failure, whatever its numbers.
 */

const CSS = ['app.css', 'brand-kit.css'].map((file) => ({
  file,
  text: readFileSync(resolve(__dirname, '../../css/', file), 'utf8'),
}))

/**
 * How far a bezier may sit from what GSAP computes.
 *
 * Sized from the measurement, not picked. The worst LEGITIMATE value is move at 2.6e-3, because
 * power2.inOut is piecewise and no single cubic reproduces it; the other four are exact to 2e-4.
 * The nearest WRONG curve a hand could plausibly write — enter given power3.out's shape — is 0.105,
 * twenty-six times outside this. Swapping two intents outright lands between 0.25 and 0.75.
 */
const TOLERANCE = 0.004

/** Which GSAP ease each EASING.* entry is. The names are Penner's; the curves are GSAP's. */
const EASING_IS = {
  linear: 'none',
  easeInQuad: 'power1.in', easeOutQuad: 'power1.out', easeInOutQuad: 'power1.inOut',
  easeInCubic: 'power2.in', easeOutCubic: 'power2.out', easeInOutCubic: 'power2.inOut',
  easeInQuart: 'power3.in', easeOutQuart: 'power3.out', easeInOutQuart: 'power3.inOut',
  easeInQuint: 'power4.in', easeOutQuint: 'power4.out', easeInOutQuint: 'power4.inOut',
}

/** `cubic-bezier(x1,y1,x2,y2)` as a progress→value function: Newton on x, then read y. */
function bezier(curve) {
  const [x1, y1, x2, y2] = curve.match(/-?[\d.]+/g).map(Number)
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const X = (t) => ((ax * t + bx) * t + cx) * t
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx

  return (x) => {
    let t = x
    for (let i = 0; i < 12; i++) {
      const e = X(t) - x
      if (Math.abs(e) < 1e-12) break
      const d = dX(t)
      if (Math.abs(d) < 1e-12) break
      t -= e / d
    }
    return ((ay * t + by) * t + cy) * t
  }
}

/** The worst disagreement between two progress→value curves, over the whole run. */
function drift(a, b) {
  let worst = 0
  for (let i = 0; i <= 2000; i++) {
    const t = i / 2000
    worst = Math.max(worst, Math.abs(a(t) - b(t)))
  }
  return worst
}

/** `--ease-draw-on: cubic-bezier(...)` → { drawOn: 'cubic-bezier(...)' }, keyed like EASE. */
function tokens() {
  const found = {}
  for (const { text } of CSS) {
    for (const m of text.matchAll(/--ease-([a-z-]+):\s*(cubic-bezier\([^)]*\))/g)) {
      found[m[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = m[2]
    }
  }
  return found
}

const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())

describe('the motion vocabulary is GSAP\'s', () => {
  it('every intent names an ease GSAP actually knows', () => {
    for (const [intent, name] of Object.entries(GSAP_EASE)) {
      expect(typeof gsap.parseEase(name), `GSAP does not know "${name}" (${intent})`).toBe('function')
    }
  })

  for (const [intent, name] of Object.entries(GSAP_EASE)) {
    it(`CURVE.${intent} is exactly GSAP ${name}`, () => {
      expect(drift(CURVE[intent], gsap.parseEase(name))).toBeLessThan(1e-9)
    })
  }

  for (const [fn, name] of Object.entries(EASING_IS)) {
    it(`EASING.${fn} is exactly GSAP ${name}`, () => {
      expect(drift(EASING[fn], gsap.parseEase(name))).toBeLessThan(1e-9)
    })
  }

  for (const [intent, name] of Object.entries(GSAP_EASE)) {
    it(`EASE.${intent} tracks GSAP ${name} to ${TOLERANCE}`, () => {
      const d = drift(bezier(EASE[intent]), gsap.parseEase(name))
      expect(d, `EASE.${intent} = ${EASE[intent]} is ${d.toFixed(4)} from ${name}`).toBeLessThan(TOLERANCE)
    })
  }
})

describe('the CSS easing tokens mirror easing.js', () => {
  it('declares a token for every named curve, and no extras', () => {
    expect(Object.keys(tokens()).sort()).toEqual(Object.keys(EASE).sort())
  })

  for (const [name, curve] of Object.entries(EASE)) {
    it(`--ease-${kebab(name)} is EASE.${name}`, () => {
      expect(tokens()[name], `the stylesheet has drifted from easing.js for "${name}"`).toBe(curve)
    })
  }

  it('no rule writes a curve out by hand — that is what drifts', () => {
    const offenders = []
    for (const { file, text } of CSS) {
      const rules = text
        // Comments are prose, not rules. Explaining in words which curve a token carries is how
        // this decision stays readable, and a guard that trips on its own explanation is a guard
        // people delete the explanation to satisfy. Blanked in place so line numbers still land.
        .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
        // And blank the token block: those five ARE the declarations, not copies of them.
        .replace(/--ease-[a-z-]+:\s*cubic-bezier\([^)]*\)/g, '')

      rules.split('\n').forEach((line, i) => {
        for (const c of line.match(/cubic-bezier\([^)]*\)/g) ?? []) {
          offenders.push(`${file}:${i + 1} ${c} — use var(--ease-${Object.keys(EASE).map(kebab).join('|')})`)
        }
      })
    }
    expect(offenders, 'hand-written curves in the stylesheets').toEqual([])
  })
})
