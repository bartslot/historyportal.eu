import { test, expect } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Captures the screenshots the help centre shows, one set per language.
 *
 * Driven by `php artisan help:screenshots`, which sets the demo teacher's language, resolves every
 * named route to a real URL, and passes the work list in HELP_SHOTS. Running this spec on its own
 * does nothing useful — it needs that manifest.
 *
 * Each shot is a real page of the running app, so the pictures can never describe an interface that
 * no longer exists: re-run the command after a UI change and they are current again.
 */

type Shot = {
    key: string
    url: string
    /** Element to wait for before shooting, so a half-rendered page is never captured. */
    waitFor?: string
    /** Extra settle time for pages that animate in (maps, canvases). */
    settleMs?: number
    fullPage?: boolean
    /** WebGL pages: headless Chromium renders through swiftshader and complains regardless. */
    allowConsoleErrors?: boolean
    /** Product-tour shots are JPEGs: dark interfaces compress well, and the tour loads them one by one. */
    type?: 'png' | 'jpeg'
    /** name => selector (`a || b` = first visible): rectangles written to {key}.rects.json, in percent of the picture. */
    highlights?: Record<string, string>
    /** Elements hidden before the shutter (teacher-only chrome in the lesson player). */
    hide?: string[]
    /** Lesson player: click Start on the title screen, as a real gesture so narration may begin. */
    start?: boolean
    /** Chrome that hides until the pointer comes near (the player's control bar): hover it first. */
    reveal?: string
    /** 2 for the product tour, which zooms in on small highlights and is viewed on retina screens. */
    deviceScaleFactor?: number
}

/** Console noise produced by the software GL used in headless runs, not by the app. */
const HEADLESS_GL_NOISE = [
    /uniformMatrix4fv/i,
    /WebGL|WebGL2RenderingContext/i,
    /swiftshader/i,
]

const locale = process.env.HELP_LOCALE ?? 'en'
const outputDir = process.env.HELP_OUTPUT_DIR
const shots: Shot[] = JSON.parse(process.env.HELP_SHOTS ?? '[]')

test.describe(`help screenshots (${locale})`, () => {
    test.skip(shots.length === 0 || !outputDir, 'Run through: php artisan help:screenshots')

    test.use({ viewport: { width: 1440, height: 900 } })

    for (const shot of shots) {
        test(`capture ${shot.key}`, async ({ page: defaultPage, browser }) => {
            // Retina-sharp shots get their own context: the pixel ratio is fixed per context.
            const context = shot.deviceScaleFactor
                ? await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: shot.deviceScaleFactor })
                : null
            const page = context ? await context.newPage() : defaultPage

            const failures: string[] = []
            page.on('pageerror', (error) => failures.push(error.message))

            await page.goto(shot.url, { waitUntil: 'networkidle' })

            if (shot.waitFor) {
                await page.waitForSelector(shot.waitFor, { timeout: 20_000 })
            }

            // Local-only chrome that would otherwise appear in every help image.
            if (shot.start) {
                const cta = page.locator('[data-title-piece="cta"] button').first()
                await cta.waitFor({ timeout: 20_000 })
                const box = await cta.boundingBox()
                if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
            }

            await page.addStyleTag({
                content: `
                    ${(shot.hide ?? []).join(', ') || '[data-none]'} { visibility: hidden !important; }
                    [data-dev-panel] { display: none !important; }
                    [data-welcome-tour] { display: none !important; }
                    *, *::before, *::after {
                        animation-duration: 0s !important;
                        transition-duration: 0s !important;
                    }
                `,
            })

            // Let fonts and lazily-loaded imagery land before the shutter.
            await page.evaluate(() => document.fonts?.ready)
            await page.waitForTimeout(shot.settleMs ?? 400)

            if (shot.reveal) {
                const box = await page.locator(shot.reveal).first().boundingBox()
                if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
                await page.waitForTimeout(600)
            }

            const type = shot.type ?? 'png'
            const path = `${outputDir}/${shot.key}.${type === 'jpeg' ? 'jpg' : 'png'}`
            mkdirSync(dirname(path), { recursive: true })
            await page.screenshot({ path, type, fullPage: shot.fullPage ?? false, ...(type === 'jpeg' ? { quality: 76 } : {}) })

            if (shot.highlights) {
                const rects = await page.evaluate((highlights) => {
                    const width = document.documentElement.clientWidth
                    const height = document.documentElement.clientHeight
                    const round = (value: number) => Math.round(value * 100) / 100
                    const out: Record<string, { x: number, y: number, w: number, h: number } | null> = {}

                    for (const [name, selector] of Object.entries(highlights)) {
                        // `a || b`: the first alternative that is actually on screen.
                        const rect = selector.split('||')
                            .map((alternative) => document.querySelector(alternative.trim())?.getBoundingClientRect())
                            .find((candidate) => candidate && candidate.width > 0 && candidate.height > 0)
                        // Clip to the picture: an element running off screen is highlighted where it shows.
                        const left = Math.max(0, rect?.left ?? 0)
                        const top = Math.max(0, rect?.top ?? 0)
                        const right = Math.min(width, rect?.right ?? 0)
                        const bottom = Math.min(height, rect?.bottom ?? 0)

                        out[name] = rect && right > left && bottom > top
                            ? { x: round(left / width * 100), y: round(top / height * 100), w: round((right - left) / width * 100), h: round((bottom - top) / height * 100) }
                            : null
                    }

                    return out
                }, shot.highlights)

                writeFileSync(`${outputDir}/${shot.key}.rects.json`, JSON.stringify(rects, null, 2))

                const missing = Object.keys(rects).filter((name) => rects[name] === null)
                if (missing.length > 0) {
                    console.warn(`[${shot.key}] nothing to highlight for: ${missing.join(', ')}`)
                }
            }

            await context?.close()

            const real = failures.filter((message) => !HEADLESS_GL_NOISE.some((pattern) => pattern.test(message)))

            if (shot.allowConsoleErrors) {
                if (real.length > 0) {
                    console.warn(`[${shot.key}] page errors (not failing this shot): ${real.join(' | ')}`)
                }
                return
            }

            expect(real, `console errors while capturing ${shot.key}: ${real.join(' | ')}`).toEqual([])
        })
    }

    test.afterAll(async () => {
        if (!outputDir) return
        // A manifest makes it obvious which language a set belongs to and when it was taken. Merged,
        // because `--only` captures part of a set and must not forget the rest.
        const manifest = `${outputDir}/captured.json`
        const previous: string[] = existsSync(manifest) ? JSON.parse(readFileSync(manifest, 'utf8')).keys ?? [] : []
        const keys = [...new Set([...previous, ...shots.map((s) => s.key)])]
        writeFileSync(manifest, JSON.stringify({ locale, keys }, null, 2))
    })
})
