/**
 * Is this page part of a test session? Tiny on purpose: app.js imports it on every page, and only
 * a yes fetches the recorder (and rrweb) with a dynamic import.
 */
export const STORE_KEY = 'hpTestSession'

export const store = {
  read () { try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null') } catch (_) { return null } },
  write (v) { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(v)) } catch (_) { /* private mode */ } },
  clear () { try { sessionStorage.removeItem(STORE_KEY) } catch (_) { /* private mode */ } },
}

/** The code this page should record under (?test=CODE, or an ongoing session), or null. */
export function pendingCode () {
  const fromUrl = new URLSearchParams(location.search).get('test')
  if (fromUrl && /^[A-Za-z0-9]{3,32}$/.test(fromUrl)) return fromUrl.toUpperCase()
  return store.read()?.code ?? null
}
