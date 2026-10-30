// Which crew lines belong to the latest turn (shown in full) and a one-line gist for the older ones.
const MAX_GIST = 140

/** Index of the first line of the latest turn: right after the client's last message (0 when there is none). */
export function latestTurnStart(lines: ReadonlyArray<{ who: string }>): number {
  for (let i = lines.length - 1; i >= 0; i--) if (lines[i].who === 'client') return i + 1
  return 0
}

/** The first sentence of a text, whitespace collapsed; capped so a missing full stop cannot return a wall of text. */
export function firstSentence(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const m = flat.match(/^.*?[.?!](?=\s|$)/)
  const s = m ? m[0] : flat
  return s.length > MAX_GIST ? s.slice(0, MAX_GIST).trimEnd() : s
}
