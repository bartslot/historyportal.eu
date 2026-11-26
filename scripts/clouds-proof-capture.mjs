#!/usr/bin/env node
/**
 * clouds-proof-capture.mjs — screenshots of the 3D cloud layer on a real GPU.
 *
 * The cloud container's software renderer cannot draw Takram's clouds, so the look is only ever
 * judged on a machine with a GPU. This drives the proof page (npx vite --config
 * vite.clouds-proof.config.js, port 5197) in a Chromium window parked off-screen, takes each shot
 * in SHOTS, and writes the pictures, a report.json (frame rate, layer status, camera agreement,
 * console errors) and one labelled contact sheet.
 *
 *   node scripts/clouds-proof-capture.mjs --out <folder> [--shots shots.json] [--base http://localhost:5197]
 *
 * A shots file is a JSON array of { name, query, label? }.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : fallback
}
const out = resolve(arg('out', 'storage/clouds-proof'))
const base = arg('base', 'http://localhost:5197')
const italy = 'lng=12&lat=43'
const view = `${italy}&zoom=7&pitch=60`
// "A" is the candidate look; the shots before it change one thing at a time from the defaults.
const A = 'v.scale=12&v.stepScale=1.001&v.tone=neutral&v.weatherLow=0.1&v.weatherHigh=0.95&v.coverage=0.4'
const SHOTS = arg('shots') ? JSON.parse(readFileSync(arg('shots'), 'utf8')) : [
  { name: '01-defaults', query: view },
  { name: '02-tone-neutral', query: `${view}&v.tone=neutral` },
  { name: '03-tone-aces', query: `${view}&v.tone=aces` },
  { name: '04-tone-neutral-exposure6', query: `${view}&v.tone=neutral&v.exposure=6` },
  { name: '05-step1.001', query: `${view}&v.stepScale=1.001` },
  { name: '06-step1.0005', query: `${view}&v.stepScale=1.0005` },
  { name: '07-weather-soft', query: `${view}&v.weatherLow=0.1&v.weatherHigh=0.95` },
  { name: '08-weather-soft-coverage0.4', query: `${view}&v.weatherLow=0.1&v.weatherHigh=0.95&v.coverage=0.4` },
  { name: '09-scale16-step1.001', query: `${view}&v.scale=16&v.stepScale=1.001` },
  { name: '10-A', query: `${view}&${A}` },
  { name: '11-A-top-down', query: `${italy}&zoom=7&pitch=0&${A}` },
  { name: '12-A-z6', query: `${italy}&zoom=6&pitch=60&${A}` },
  { name: '13-A-z5.5-handover', query: `${italy}&zoom=5.5&pitch=45&${A}` },
  { name: '14-A-atlantic-evening', query: `lng=-30&lat=50&zoom=7&pitch=70&sunLng=40&sunLat=10&${A}` },
  { name: '15-A-caribbean', query: `lng=-70&lat=18&zoom=6.5&pitch=60&sunLng=-80&${A}` },
  { name: '16-A-skylight2', query: `${view}&${A}&v.skyLight=2` },
  { name: '17-A-noshadow', query: `${view}&${A}&v.shadows=0` },
  { name: '18-A-exposure6', query: `${view}&${A}&v.exposure=6` },
  { name: '18b-A-coverage0.33', query: `${view}&${A}&v.coverage=0.33` },
  { name: '18c-A-coverage0.47', query: `${view}&${A}&v.coverage=0.47` },
  { name: '18d-A-scale6', query: `${view}&${A}&v.scale=6` },
  { name: '18e-A-agx', query: `${view}&${A}&v.tone=agx` },
  { name: '19-flat-only', query: `${view}&v.strength=0`, label: 'same view, flat deck only' },
  { name: '20-orbit-flat', query: `${italy}&zoom=4&pitch=45`, label: 'orbit: flat deck' },
]

mkdirSync(out, { recursive: true })
// A real window, parked off-screen: headless falls back to software GL, and a minimised window
// stops drawing.
const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-3000,-3000', '--window-size=1280,880', '--ignore-gpu-blocklist'],
})
const report = []
try {
  for (const shot of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
    const logs = []
    page.on('console', async (m) => {
      if (m.type() !== 'error' && m.type() !== 'warning') return
      // An Error object prints as the bare word "Error"; ask the page for what it actually says.
      const parts = await Promise.all(m.args().map((a) => a.evaluate((x) => (x instanceof Error ? `${x.message} ${x.stack ?? ''}` : String(x))).catch(() => '')))
      logs.push(`${m.type()}: ${(parts.join(' ') || m.text()).slice(0, 400)} @ ${m.location().url}`)
    })
    page.on('pageerror', (e) => logs.push(`pageerror: ${String(e).slice(0, 300)}`))
    await page.goto(`${base}/index.html?nobloom=1&${shot.query}`)
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 }).catch(() => logs.push('ready timeout'))
    // Wait for the 3D layer to settle one way or the other, then for the picture to build up.
    await page.waitForFunction(() => ['ready', 'off'].includes(window.__globe?.layers.cloudVolume?.status), null, { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(6000)
    const info = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return {
        status: window.__globe?.layers.cloudVolume?.status ?? 'missing',
        fps: window.__fps?.(),
        cameraErrorPx: window.__cameraCheck?.(),
        altitudeKm: Math.round((Math.hypot(...window.__map._camera.transform.cameraPosition) - 1) * 6371),
        gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
      }
    })
    await page.screenshot({ path: join(out, `${shot.name}.png`) })
    report.push({ ...shot, ...info, logs: [...new Set(logs)].slice(0, 8) })
    console.log(`${shot.name}: ${info.status}, ${info.fps} fps, ${info.altitudeKm} km, camera ${info.cameraErrorPx?.toFixed?.(4)} px${logs.length ? `, ${logs.length} console messages` : ''}`)
    await page.close()
  }

  writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 2))
  const cells = report.map((r) => `<figure><img src="file://${join(out, `${r.name}.png`)}"><figcaption>${r.name}${r.label ? ` · ${r.label}` : ''} · ${r.status} · ${r.fps} fps · ${r.altitudeKm} km</figcaption></figure>`).join('')
  const sheet = await browser.newPage({ viewport: { width: 1960, height: 800 }, deviceScaleFactor: 1 })
  await sheet.setContent(`<style>body{margin:0;background:#0f172a;color:#e2e8f0;font:14px system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px}figure{margin:0}img{width:100%;display:block}figcaption{padding:4px 2px}</style>${cells}`)
  await sheet.waitForTimeout(1500)
  await sheet.screenshot({ path: join(out, 'sheet.png'), fullPage: true })
  console.log(`gpu: ${report[0]?.gpu}\nwrote ${report.length} shots, report.json and sheet.png to ${out}`)
} finally {
  await browser.close()
}
