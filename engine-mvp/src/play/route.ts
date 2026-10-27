// Pure helpers for play.html, tested in route.test.ts.

/** public/lessons/vault is a (git-ignored) link to the vault's topics/autonomous-lessons/lessons. */
const VAULT_MARK = 'topics/autonomous-lessons/lessons/'
export const DEFAULT_LESSON = 'hunebedden' // PM: the end-to-end demo lesson (its art is in)
const ID = /^[a-z0-9][a-z0-9-]*$/

/** ?lesson= as a lesson id (`hunebedden`) or a vault path (absolute or from the vault root) to a
 *  lesson folder or its lesson.json. Anything else is refused: the page only plays vault lessons. */
export function lessonUrlOf(param: string | null): string {
  const p = (param ?? DEFAULT_LESSON).trim()
  const inVault = p.indexOf(VAULT_MARK)
  const id = (inVault >= 0 ? p.slice(inVault + VAULT_MARK.length) : p).replace(/\/(lesson\.json)?$/, '')
  if (!ID.test(id)) throw new Error(`not a lesson id or vault path: ${p}`)
  return `lessons/vault/${id}/lesson.json`
}

/** A scene's narration file (S4's `scene.audio`, "<lesson id>/<scene id>.mp3", relative to the narration
 *  root ~/BartsMedia/historyportal/narration, served at public/narration) as a URL, or undefined.
 *  Confined to the root the way the browser will read it: the path is DECODED first (a %2e%2e is a ..),
 *  must be two plain segments (no backslash, no dot segment, nothing absolute), and the URL it resolves
 *  to must still sit under /narration/. */
const AUDIO = /^[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9_-]*(\.[a-z0-9_-]+)*\.(mp3|m4a)$/i
export function voiceUrl(audio: unknown, base = 'http://studio.invalid/play.html'): string | undefined {
  if (typeof audio !== 'string') return undefined
  let plain: string
  try { plain = decodeURIComponent(audio) } catch { return undefined } // a broken %-escape
  if (plain !== audio || !AUDIO.test(plain)) return undefined // escapes of any kind are refused outright
  const resolved = new URL(`narration/${plain}`, base)
  const root = new URL('narration/', base)
  return resolved.origin === root.origin && resolved.pathname.startsWith(root.pathname) ? `narration/${plain}` : undefined
}

/** Seconds the sound may drift from the picture before it is re-placed. */
export const RESYNC_S = 0.35
export const RESYNC_EVERY_MS = 1000
export const needsResync = (soundTime: number, pictureTime: number): boolean => Math.abs(soundTime - pictureTime) > RESYNC_S

export type SyncState = { mode: 'playing' | 'paused' | 'holding' | 'ended'; cardOpen: boolean; ctxRunning: boolean; soundTime: number; clock: number; msSinceFix: number }
export type SyncAction = 'none' | 'suspend' | 'resume' | 'resync'

/** What the sound does this frame to follow the picture. A card owns the sound (its held beds); a
 *  pause or the end suspends it; playing resumes it and re-places it when it has drifted. Pure. */
export function syncAction(s: SyncState): SyncAction {
  if (s.cardOpen) return 'none'
  if (s.mode !== 'playing') return s.ctxRunning ? 'suspend' : 'none'
  if (!s.ctxRunning) return 'resume'
  return s.msSinceFix > RESYNC_EVERY_MS && needsResync(s.soundTime, s.clock) ? 'resync' : 'none'
}
