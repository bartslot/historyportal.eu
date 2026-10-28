// The stage's own look on top of the shared post chain: what makes separately painted layers read as ONE picture.
// The shared chain's paper and granulation sit on world positions from the depth buffer, which painted planes are
// kept out of, so on a plane they are almost nothing. Here instead:
//   sheet: one paper sheet under the whole frame (tooth + granulation in screen space, a light warm wash in big soft
//          patches), the way a book page is one piece of paper whatever was painted where;
//   line by depth: far layers draw their ink lighter, thinner and into the sky's haze (aerial perspective), so a
//          line-weight mismatch between layers reads as distance, not as a cut-out.
// Every value is a key of lesson.look (teacher-editable, undoable, a slider in the panel).
import type { Depth } from './types'

export const DEPTHS: Depth[] = ['sky', 'bg', 'mid', 'fg']
const cap = (d: Depth) => d[0].toUpperCase() + d.slice(1)
export const lineKeys = (d: Depth) => ({ fade: `lineFade${cap(d)}`, thin: `lineThin${cap(d)}`, haze: `haze${cap(d)}` })

/** Defaults: tuned on art v3's plates against the Verbree pass-2 refs. thin is in screen px (1080p). */
export const STAGE_SHEET: Record<string, number> = {
  sheetPaper: 1, sheetGrain: 0.7, sheetWash: 0.12, sheetPatches: 0.5, lineBrown: 0.6, groundDetail: 0.45,
  lineFadeSky: 0.3, lineThinSky: 0, hazeSky: 0,
  lineFadeBg: 0.45, lineThinBg: 0.6, hazeBg: 0.22,
  lineFadeMid: 0.2, lineThinMid: 0.4, hazeMid: 0.06,
  lineFadeFg: 0.05, lineThinFg: 0.5, hazeFg: 0,
}

/** Slider ranges for the panel (same order as STAGE_SHEET). */
export const LOOK_RANGE: Record<string, [number, number, number]> = Object.fromEntries(Object.keys(STAGE_SHEET).map((k) => [
  k, k.startsWith('lineThin') ? [0, 2, 0.05] : [0, 1, 0.01],
]))

const num = (look: Record<string, unknown>, k: string) => { const v = Number(look[k] ?? STAGE_SHEET[k]); return Number.isFinite(v) ? v : STAGE_SHEET[k] }

/** A depth's line values from the lesson's look (defaults where unset). */
export function lineOf(look: Record<string, unknown>, d: Depth): { fade: number; thin: number; haze: number; brown: number } {
  const k = lineKeys(d)
  return { fade: num(look, k.fade), thin: num(look, k.thin), haze: num(look, k.haze), brown: num(look, 'lineBrown') }
}

/** Screen px per metre at distance zRel in front of the camera (vertical fov in radians, as the camera holds it). */
export const pxPerMetre = (renderH: number, zRel: number, fov: number) =>
  renderH / (2 * Math.max(zRel, 0.01) * Math.tan(fov / 2))

/** A plane's texture uv per screen px (u counts its repeats), at 1080p-equivalent px so thin means the same at any
 *  render size: thin 1 = one line pixel of a 1080p frame. */
export const pxUV = (wM: number, hM: number, uRepeat: number, ppm: number, renderH: number) => {
  const k = ppm * (1080 / renderH)
  return [uRepeat / Math.max(wM * k, 1e-3), 1 / Math.max(hM * k, 1e-3)] as const
}
