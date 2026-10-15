/**
 * A team's colour, by its place in the class (team 1, team 2...): the race's chips and the cargo
 * results' column headers agree. Theme tokens only (DaisyUI), written out in full so Tailwind
 * sees every class.
 */
const TONES = [
  { badge: 'badge-secondary', head: 'bg-secondary text-secondary-content', soft: 'bg-secondary/15' },
  { badge: 'badge-accent', head: 'bg-accent text-accent-content', soft: 'bg-accent/15' },
  { badge: 'badge-info', head: 'bg-info text-info-content', soft: 'bg-info/15' },
  { badge: 'badge-success', head: 'bg-success text-success-content', soft: 'bg-success/15' },
  { badge: 'badge-warning', head: 'bg-warning text-warning-content', soft: 'bg-warning/15' },
  { badge: 'badge-neutral', head: 'bg-neutral text-neutral-content', soft: 'bg-neutral/15' },
  { badge: 'badge-ghost', head: 'bg-base-300 text-base-content', soft: 'bg-base-300/40' },
  { badge: 'badge-primary', head: 'bg-primary text-primary-content', soft: 'bg-primary/15' },
]

/** @returns {{badge: string, head: string, soft: string}} */
export const teamTone = (i) => TONES[((i % TONES.length) + TONES.length) % TONES.length]
