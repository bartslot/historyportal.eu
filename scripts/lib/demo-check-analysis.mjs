/**
 * Pure helpers for scripts/demo-check.mjs: no browser, no network, so they are unit-tested
 * (scripts/lib/demo-check-analysis.test.mjs).
 */

const MEDIA_EXT = /\.(webp|avif|jpe?g|png|gif|svg|m4a|mp3|ogg|wav|mp4|webm|glb)(\?|#|$)/i

/** SiteGround answers suspected bots with a 202 + JS challenge page instead of the site. */
export function isSiteGroundChallenge (status, body = '') {
  return status === 202 || /sgcaptcha|sg-captcha|\.well-known\/sgcaptcha/i.test(body)
}

/** `window.LESSON = {...};` from the player page, or null. */
export function parseLessonJson (html) {
  const line = html.split('\n').find((l) => /^\s*window\.LESSON\s*=/.test(l))
  if (!line) return null
  return JSON.parse(line.trim().replace(/^window\.LESSON\s*=\s*/, '').replace(/;\s*$/, ''))
}

/** Every media URL anywhere in a JSON value, absolute against `base`, deduped. */
export function collectMediaUrls (value, base) {
  const out = new Set()
  const walk = (v) => {
    if (typeof v === 'string') {
      if (MEDIA_EXT.test(v) && (/^https?:\/\//.test(v) || v.startsWith('/'))) out.add(new URL(v, base).href)
    } else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(value)
  return [...out]
}

/** "golden_bay_dusk" for any CDN / storage variant of that picture. */
export function pictureKey (url) {
  if (!url) return null
  const path = url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '').split(/[?#]/)[0]
  return decodeURIComponent(path.split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_.]depth$/, '').replace(/-/g, '_').toLowerCase() || null
}

/** Picture keys a scene may legitimately show. */
export function scenePictureKeys (scene) {
  return new Set(collectMediaUrls(scene, 'https://x.invalid/').map(pictureKey).filter(Boolean))
}

/**
 * Samples (taken every ~40 ms) where the stage shows a full-bleed flat picture that belongs to
 * neither the outgoing nor the incoming scene, with no opaque layered panel on top of it.
 * sample: { t, idx, flat: [{ url, op }], bgOp, px: [opacity] }
 */
export function findStaleFrames (samples, from, to, keysOf) {
  const allowed = new Set([...keysOf(from), ...keysOf(to)])
  return samples.filter((s) => {
    if ((s.px || []).some((op) => op >= 0.99)) return false
    if ((s.bgOp ?? 1) < 0.05) return false
    return (s.flat || []).some((l) => l.op > 0.05 && l.url && !allowed.has(pictureKey(l.url)))
  })
}

/** Indices in `samples` where the scene index changes: [{ at, from, to }]. */
export function sceneChanges (samples) {
  const out = []
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].idx
    const b = samples[i].idx
    if (a != null && b != null && a !== b) out.push({ at: i, t: samples[i].t, from: a, to: b })
  }
  return out
}
