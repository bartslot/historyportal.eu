import { arcTable, SAMPLES_PER_SEGMENT } from './voyages.js';

// Where along a route the pointer is, and what day the fleet was there.
//
// Pure functions, so the date logic is tested without a map. The dates come from the legs in
// voyages.json: every leg's depart sits on its first waypoint and its arrive on its last. Between
// two dated points the date is interpolated by DISTANCE along the drawn line, not by waypoint count,
// because waypoints are bunched along coasts and sparse across oceans.
//
// A date is only as exact as its sources. A leg end can say `depart_precision` / `arrive_precision`
// ('month' or 'year', default 'day'), or the whole voyage `date_precision`; an interpolated date is
// as coarse as the coarser of its two ends. Before the first or after the last dated point there is
// no date at all, and the caller shows the voyage's years instead. Nothing is guessed.

const RANK = { day: 0, month: 1, year: 2 };
const coarser = (a, b) => (RANK[a] >= RANK[b] ? a : b);
const precisionOf = (value) => (value in RANK ? value : 'day');

/**
 * The dated points of a voyage, sorted along the route: [{ wp, ms, precision }].
 * Unparseable dates are skipped rather than trusted.
 *
 * @param {{ legs?: Array<object>, date_precision?: string }} voyage
 */
export const datedPoints = (voyage) => {
  const fallback = precisionOf(voyage?.date_precision);
  const points = [];
  for (const leg of voyage?.legs ?? []) {
    const [a, b] = Array.isArray(leg?.wp) ? leg.wp : [];
    for (const [wp, iso, precision] of [[a, leg.depart, leg.depart_precision], [b, leg.arrive, leg.arrive_precision]]) {
      const ms = Date.parse(iso);
      if (!Number.isFinite(Number(wp)) || !Number.isFinite(ms)) continue;
      points.push({ wp: Number(wp), ms, precision: precision ? precisionOf(precision) : fallback });
    }
  }
  return points.sort((p, q) => p.wp - q.wp || p.ms - q.ms);
};

/** Arc length (any consistent unit) at a fractional sample index of `table`. */
const arcAt = (table, sample) => {
  const last = table.cum.length - 1;
  const s = Math.max(0, Math.min(last, sample));
  const i = Math.min(last - 1, Math.floor(s));
  if (i < 0) return 0;
  return table.cum[i] + (table.cum[i + 1] - table.cum[i]) * (s - i);
};

/**
 * The date at a point on the route.
 *
 * @param {object} voyage  a voyages.json entry (legs, date_precision)
 * @param {Array<[number, number]>} coords  the smoothed route, smooth(voyage.waypoints)
 * @param {number} sample  fractional index into coords (from nearestOnRoute)
 * @returns {{ ms: number, precision: 'day'|'month'|'year' } | null}
 */
export const dateAtSample = (voyage, coords, sample) => {
  const points = datedPoints(voyage);
  if (!points.length || !Array.isArray(coords) || coords.length < 2) return null;
  const table = arcTable(coords);
  const here = arcAt(table, sample);
  const at = (p) => arcAt(table, p.wp * SAMPLES_PER_SEGMENT);
  const EPS = 1e-9;

  let before = null;
  let after = null;
  for (const p of points) {
    const d = at(p);
    if (d <= here + EPS) before = p;               // last point at or behind the pointer
    if (d >= here - EPS && !after) after = p;      // first point at or ahead of it
  }
  if (!before || !after) return null;
  if (before === after || at(after) - at(before) <= EPS) {
    return { ms: before.ms, precision: before.precision };
  }
  const f = (here - at(before)) / (at(after) - at(before));
  return {
    ms: Math.round(before.ms + (after.ms - before.ms) * f),
    precision: coarser(before.precision, after.precision),
  };
};

/**
 * "18 December 1642", "December 1642" or "1642", in the teacher's language. BCE years get the era
 * ("218 BC"), CE years do not. UTC throughout, so a date never slips a day with the time zone.
 */
export const formatVoyageDate = (date, locale = 'en') => {
  if (!date || !Number.isFinite(date.ms)) return '';
  // Bare English is American in Intl ("December 18, 1642"); this is a European product.
  const tag = String(locale || 'en').replace('_', '-').toLowerCase() === 'en' ? 'en-GB' : locale;
  const d = new Date(date.ms);
  const bce = d.getUTCFullYear() <= 0;
  const options = { timeZone: 'UTC', year: 'numeric' };
  if (date.precision !== 'year') options.month = 'long';
  if (date.precision === 'day') options.day = 'numeric';
  if (bce) options.era = 'short';
  try {
    return new Intl.DateTimeFormat(tag, options).format(d);
  } catch (e) {
    return new Intl.DateTimeFormat('en-GB', options).format(d);
  }
};

/**
 * The point on `coords` nearest to the pointer, as a fractional sample index plus the point itself
 * (in the route's own, possibly unwrapped, longitude).
 *
 * Routes keep longitudes past ±180 so a Pacific crossing stays continuous, while the pointer always
 * arrives wrapped; each segment therefore moves the pointer by whole turns to the copy nearest it.
 * Distances use a local equirectangular metric (longitude scaled by cos latitude), which is all a
 * "which bit of line is under the cursor" pick needs.
 *
 * @param {Array<[number, number]>} coords
 * @param {number} lng
 * @param {number} lat
 * @returns {{ sample: number, lng: number, lat: number, distance: number } | null}
 */
export const nearestOnRoute = (coords, lng, lat) => {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const k = Math.cos((lat * Math.PI) / 180);
  let best = null;
  for (let i = 1; i < coords.length; i++) {
    const [ax, ay] = coords[i - 1];
    const [bx, by] = coords[i];
    const px = lng + 360 * Math.round((ax - lng) / 360);
    const dx = (bx - ax) * k;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, (((px - ax) * k) * dx + (lat - ay) * dy) / len2)) : 0;
    const qx = ax + (bx - ax) * t;
    const qy = ay + (by - ay) * t;
    const distance = Math.hypot((px - qx) * k, lat - qy);
    if (!best || distance < best.distance) best = { sample: i - 1 + t, lng: qx, lat: qy, distance };
  }
  return best;
};
