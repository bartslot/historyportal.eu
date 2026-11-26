/**
 * territory-label.js — the linked territory's label on the stage: its name and/or the year it is shown for.
 *
 * Bart, 2026-11-24: "I need also text added, which is standard off. the year of showing the territory ... where you
 * can position the year label like you can with the previews as the title" and "this will add the year label and or
 * territory name". Off unless the teacher turns one on (config.territory.label_year / label_name), placed at one of
 * nine spots (label_position), hand-lettered in the voyage stop's ink on a paper halo. The year follows the map, so a
 * Grow preset counts the years up while the borders spread.
 */

const BCE = { nl: 'v.Chr.', de: 'v. Chr.', fr: 'av. J.-C.', it: 'a.C.', es: 'a. C.' }

/** A year as a class reads it: 1271, or 500 v.Chr. in Dutch (BCE in English). */
export const formatMapYear = (year, lang = 'en') => {
  const y = Math.round(Number(year))
  if (!Number.isFinite(y)) return ''
  return y < 0 ? `${-y} ${BCE[String(lang).slice(0, 2)] ?? 'BCE'}` : String(y)
}

/** The label's lines: the name above, the year under it; empty when both are off or unknown. */
export const labelLines = ({ showName, showYear, name, year, lang }) => [
  showName && name ? String(name) : null,
  showYear && Number.isFinite(Number(year)) ? formatMapYear(year, lang) : null,
].filter(Boolean)

/** CSS placement for each of the nine spots, inset from the stage edge. */
const PLACE = {
  'top-left': { top: '4%', left: '3%' },
  'top-center': { top: '4%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' },
  'top-right': { top: '4%', right: '3%', textAlign: 'right' },
  'center-left': { top: '50%', left: '3%', transform: 'translateY(-50%)' },
  center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' },
  'center-right': { top: '50%', right: '3%', transform: 'translateY(-50%)', textAlign: 'right' },
  'bottom-left': { bottom: '5%', left: '3%' },
  'bottom-center': { bottom: '5%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' },
  'bottom-right': { bottom: '5%', right: '3%', textAlign: 'right' },
}
export const labelPlacement = (position) => PLACE[position] ?? PLACE['top-left']

/** Put the label element into `host` (the map's container). Returns { update(state), destroy() }. */
export function createTerritoryLabel (host) {
  const el = document.createElement('div')
  el.className = 'lp-territory-label'
  el.setAttribute('aria-hidden', 'true')
  host.appendChild(el)
  const fit = () => { el.style.fontSize = `${Math.max(14, Math.min(44, host.clientWidth / 38))}px` }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
  ro?.observe(host)
  fit()
  let last = ''
  return {
    update (state) {
      const lines = labelLines(state)
      const key = `${lines.join('|')}@${state.position}`
      if (key === last) return
      last = key
      el.hidden = !lines.length
      el.replaceChildren(...lines.map((text, i) => {
        const line = document.createElement('span')
        line.className = i === 0 && lines.length > 1 ? 'lp-territory-label-name' : 'lp-territory-label-line'
        line.textContent = text
        return line
      }))
      for (const k of ['top', 'right', 'bottom', 'left', 'transform', 'textAlign']) el.style[k] = ''
      Object.assign(el.style, labelPlacement(state.position))
    },
    destroy () { ro?.disconnect(); el.remove() },
  }
}
