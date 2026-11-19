/**
 * icons.js — the editor's interface icons for markup built in JS. Same files as <x-ui.icon> in Blade
 * (resources/ui-icons, App\Support\UiIcon): the name is the meaning, never the picture.
 *
 *   uiIcon('draw')                 → '<svg … class="h-4 w-4 shrink-0">…</svg>'
 *   uiIcon('publish', 'h-5 w-5')   → the 20 px top-bar size
 */
const FILES = import.meta.glob('../../ui-icons/*.svg', { query: '?raw', import: 'default', eager: true })

export const UI_ICONS = Object.fromEntries(
  Object.entries(FILES).map(([path, svg]) => [path.split('/').pop().replace(/\.svg$/, ''), svg.trim()]),
)

export function uiIcon (name, cls = 'h-4 w-4 shrink-0') {
  const svg = UI_ICONS[name]
  if (!svg) throw new Error(`No interface icon named "${name}" in resources/ui-icons`)
  return svg.replace(/^<svg\b/, `<svg class="${cls}" aria-hidden="true" data-icon="${name}"`)
}
