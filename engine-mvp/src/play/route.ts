// Pure helpers for play.html, tested in route.test.ts.

/** public/lessons/vault is a (git-ignored) link to the vault's topics/autonomous-lessons/lessons. */
const VAULT_MARK = 'topics/autonomous-lessons/lessons/'

/** ?lesson= as an id (`eerste-boeren-1`), a vault path (absolute or from the vault root), or a URL the
 *  page can fetch as it is. No parameter = eerste-boeren-1. */
export function lessonUrlOf(param: string | null): string {
  const p = (param ?? 'eerste-boeren-1').trim()
  const inVault = p.indexOf(VAULT_MARK)
  if (inVault >= 0) {
    const rest = p.slice(inVault + VAULT_MARK.length).replace(/\/$/, '')
    return `lessons/vault/${rest.endsWith('.json') ? rest : `${rest}/lesson.json`}`
  }
  if (/^[a-z0-9-]+$/i.test(p)) return `lessons/vault/${p}/lesson.json`
  return p
}

/** Seconds the sound may drift from the picture before it is re-placed. */
export const RESYNC_S = 0.35
export const needsResync = (soundTime: number, pictureTime: number): boolean => Math.abs(soundTime - pictureTime) > RESYNC_S
