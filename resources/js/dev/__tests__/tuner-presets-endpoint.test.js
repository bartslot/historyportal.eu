import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The dev panel's presets live behind /dev/tuning, a route that exists only on a local install for
 * a signed-in user (routes/web.php). tuner.js is part of app.js for EVERY visitor, and asked for it
 * on every page: prod answered 404 to each anonymous page view (error scan, 2026-10-18). It asks
 * only where the page says the endpoint is there: <meta name="dev-tuning">.
 */
describe('the presets request', () => {
  beforeEach(() => {
    vi.resetModules()
    delete window.__tune
    document.head.innerHTML = ''
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ active: null, presets: {} }) }))
  })

  it('is never made on a page without the endpoint (every visitor on prod)', async () => {
    await import('../tuner.js')
    await Promise.resolve()
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(window.__tune).toBeDefined()
  })

  it('is made where the page names the endpoint (a signed-in local install)', async () => {
    document.head.innerHTML = '<meta name="dev-tuning" content="/dev/tuning">'
    await import('../tuner.js')
    expect(globalThis.fetch).toHaveBeenCalledWith('/dev/tuning', expect.objectContaining({ method: 'GET' }))
  })
})
