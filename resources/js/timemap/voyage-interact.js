import voyagesData from './voyages.json';
import { smooth, setVoyageHighlight } from './voyages.js';
import { dateAtSample, formatVoyageDate, nearestOnRoute } from './voyage-hover.js';

// Pointer behaviour on the voyage routes: the cursor, the selection highlight, and the hover that
// brings the fleet to the point under the pointer with the date it was there.
//
// Hover runs at most once per animation frame (the pointer fires far more often than the screen
// draws), and everything it does is undone when the pointer leaves the line's hit area: the label
// goes, the ships go back to their own lap.

const LABEL_GAP_PX = 18;          // label sits this far above the snapped point

const routes = new Map(voyagesData.voyages.map((v) => [v.id, { voyage: v, coords: smooth(v.waypoints) }]));

/** Ship names for the label: the whole fleet, flagship first. */
const fleetNames = (voyage) => (voyage.fleet ?? [])
  .slice()
  .sort((a, b) => Number(!!b.flagship) - Number(!!a.flagship))
  .map((f) => f.name)
  .filter(Boolean)
  .join(', ');

const makeLabel = (container) => {
  const el = document.createElement('div');
  el.className = 'pointer-events-none absolute left-0 top-0 z-10 w-max max-w-64 rounded-card bg-card-surface px-3 py-2';
  el.style.display = 'none';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.dataset.voyageHoverLabel = '';
  const names = document.createElement('p');
  names.className = 'text-xs font-medium leading-snug text-card-muted';
  const date = document.createElement('p');
  date.className = 'text-[13px] font-semibold leading-snug text-card-title';
  el.append(names, date);
  container.appendChild(el);
  return { el, names, date };
};

/**
 * @param {import('maplibre-gl').Map} map
 * @param {{ ships: () => any, locale?: string }} options  ships() returns the voyage-ships handle
 *   once its lazy chunk has loaded (null before)
 */
export function initVoyageInteraction(map, { ships, locale = 'en' } = {}) {
  // Into the map's WRAPPER, not the map: MapLibre's canvas paints over anything inside its own
  // container, and the map element itself is shifted to centre the globe above the deck.
  const host = map.getContainer().parentElement || map.getContainer();
  const label = makeLabel(host);
  let selected = null;
  let pinned = null;        // the voyage whose fleet the hover is holding
  let pending = null;       // the latest { id, lngLat } under the pointer, consumed once per frame
  let frame = 0;

  const release = () => {
    if (pinned) ships()?.setTourProgress(pinned, null);
    pinned = null;
    label.el.style.display = 'none';
  };

  const show = (id, lngLat) => {
    const route = routes.get(id);
    if (!route) return release();
    const hit = nearestOnRoute(route.coords, lngLat.lng, lngLat.lat);
    if (!hit) return release();

    const fleet = ships();
    if (pinned && pinned !== id) fleet?.setTourProgress(pinned, null);
    if (fleet?.fractionAtSample) {
      fleet.setTourProgress(id, fleet.fractionAtSample(id, hit.sample));
      pinned = id;
    }

    const date = dateAtSample(route.voyage, route.coords, hit.sample);
    label.names.textContent = fleetNames(route.voyage) || route.voyage.name;
    // No dated point covers this stretch: say only what we know, the voyage's years.
    label.date.textContent = date
      ? formatVoyageDate(date, locale)
      : String(route.voyage.years ?? '').replace(/\s+—\s+/g, ': ');

    const p = map.project([hit.lng, hit.lat]);
    const canvas = map.getCanvas().getBoundingClientRect();
    const box = host.getBoundingClientRect();
    label.el.style.display = '';
    const { offsetWidth: w, offsetHeight: h } = label.el;
    const x = canvas.left - box.left + p.x - w / 2;
    const y = canvas.top - box.top + p.y - h - LABEL_GAP_PX;
    label.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };

  const onFrame = () => {
    frame = 0;
    const hover = pending;
    pending = null;
    if (hover?.id) show(hover.id, hover.lngLat); else release();
  };

  map.on('mousemove', 'voyage-hit', (e) => {
    map.getCanvas().style.cursor = 'pointer';
    // Read the feature NOW: MapLibre deletes e.features once this handler returns, so the event
    // object is empty by the time the frame runs.
    pending = { id: e.features?.[0]?.properties?.id, lngLat: e.lngLat };
    if (!frame) frame = requestAnimationFrame(onFrame);
  });
  map.on('mouseleave', 'voyage-hit', () => {
    map.getCanvas().style.cursor = '';
    pending = null;
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
    release();
  });
  // A drag or zoom moves the line out from under a still pointer; the label would float.
  map.on('movestart', release);

  return {
    select(id) {
      selected = id || null;
      setVoyageHighlight(map, selected);
    },
    clear() {
      if (selected === null) return;
      selected = null;
      setVoyageHighlight(map, null);
    },
    get selected() { return selected; },
    destroy() {
      release();
      label.el.remove();
    },
  };
}
