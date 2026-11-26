/**
 * Ships go round the land.
 *
 * Bart, 2026-11-26: "make sure the voyages are going always around the land if they are on ships.
 * now you see boats crossing over islands ... also for current routes." The catalog is kept clean
 * by scripts/voyage-routes.py, but a lesson keeps its own copy of a route (game_config.voyage_def),
 * copies made before that fix still cross Corsica, and a teacher can drag a bend over an island.
 *
 * seaSafeDef() measures every ship stretch on the curve the map draws (smooth(), the same check as
 * `voyage-routes.py check`) against a land mask of the chart's own land, and sends a stretch that
 * crosses land round it: A* over 1/8 degree water cells, the path pulled tight, and the new points
 * inserted as ordinary waypoints, so leg `wp` indexes and label_at shift just as the script does it.
 * The mask is public/map-chart/sea-grid.bin, built by `voyage-routes.py grid`.
 */
import { smooth, SAMPLES_PER_SEGMENT } from './voyages.js';
import transportsDoc from './transports.json';

const LAND_TRANSPORTS = new Set(transportsDoc.transports.filter((t) => t.terrain === 'land').map((t) => t.id));
export const TOLERANCE_KM = 25;   // the check script allows 25 on the chart's polygons; the mask is coarser
export const PORT_KM = 30;        // a port is on the shore, an island call is on the island
const MAX_PASSES = 4;
const PRUNE_KM = 8;
const SNAP_KM = 40;               // a bend this close to a port is a hook at the port              // a bend is dropped only while every stretch stays under this             // a new bend changes its neighbours' curve: measure again
const GRID_URL = '/map-chart/sea-grid.bin';

const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;
const km = (a, b) => Math.hypot((b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * Math.PI / 180), b[1] - a[1]) * 111.32;

/** Read sea-grid.bin (see scripts/voyage-routes.py build_grid for the format). */
export function parseSeaGrid(buffer) {
  const view = new DataView(buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  if (String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2)) !== 'SG2') throw new Error('not a sea grid');
  const per = view.getUint8(3);
  const cols = view.getUint16(4, true);
  const rows = view.getUint16(6, true);
  // 0 water, 1 shore (centre on land: a route is measured against it), 2 solid (no ship enters).
  const land = new Uint8Array(cols * rows);
  let o = 8;
  for (const value of [1, 2]) {
    for (let r = 0; r < rows; r++) {
      const n = view.getUint16(o, true); o += 2;
      let x = 0, isLand = false;
      for (let k = 0; k < n; k++) {
        const run = view.getUint16(o, true); o += 2;
        if (isLand) land.fill(value, r * cols + x, r * cols + x + run);
        x += run;
        isLand = !isLand;
      }
    }
  }
  return { per, cols, rows, land };
}

let gridPromise = null;
/** The land mask, fetched once per page. Resolves null when it can't be had (the route is left as it is). */
export function loadSeaGrid() {
  if (!gridPromise) {
    gridPromise = fetch(GRID_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((b) => (b ? parseSeaGrid(b) : null))
      .catch(() => null);
  }
  return gridPromise;
}

const cellX = (g, lon) => Math.floor((lon + 180) * g.per);        // unwrapped: may run past cols
const cellY = (g, lat) => Math.max(0, Math.min(g.rows - 1, Math.floor((90 - lat) * g.per)));
const cell = (g, x, y) => (y < 0 || y >= g.rows ? 2 : g.land[y * g.cols + (((x % g.cols) + g.cols) % g.cols)]);
const landAt = (g, x, y) => cell(g, x, y) >= 1;
const solidAt = (g, x, y) => cell(g, x, y) === 2;

export const isLand = (g, lon, lat) => landAt(g, cellX(g, wrapLon(lon)), cellY(g, lat));

/** Is a waypoint stretch on a ship leg? An unlabelled stretch is drawn as a ship, so it is one. */
const legFor = (def, i) => (def.legs || []).find((l) => Array.isArray(l.wp) && i + 0.5 >= Math.min(...l.wp) && i + 0.5 <= Math.max(...l.wp));
const shipStretch = (def, i) => {
  const leg = legFor(def, i);
  return !leg || !LAND_TRANSPORTS.has(leg.transport);
};

/** km of a drawn stretch over land, its first and last PORT_KM let off (voyage-routes.py check). */
export function landKm(g, seg) {
  const lengths = seg.slice(1).map((b, k) => km(seg[k], b));
  const total = lengths.reduce((s, d) => s + d, 0);
  let wrong = 0, run = 0;
  for (let k = 0; k < lengths.length; k++) {
    const d = lengths[k];
    run += d;
    const mid = run - d / 2;
    if (mid < PORT_KM || mid > total - PORT_KM) continue;
    if (isLand(g, (seg[k][0] + seg[k + 1][0]) / 2, (seg[k][1] + seg[k + 1][1]) / 2)) wrong += d;
  }
  return wrong;
}

/** Stretch i of the drawn curve. A Catmull-Rom segment only depends on waypoints i-1 .. i+2. */
const curveOf = (def, i) => {
  const s0 = Math.max(0, i - 1);
  const li = i - s0;
  return smooth(def.waypoints.slice(s0, i + 3)).slice(li * SAMPLES_PER_SEGMENT, (li + 1) * SAMPLES_PER_SEGMENT + 1);
};
const maxLand = (g, def, i, k) => {
  let m = 0;
  for (let j = i; j <= i + k; j++) m = Math.max(m, landKm(g, curveOf(def, j)));
  return m;
};
const sumLand = (g, def, i, k) => {
  let s = 0;
  for (let j = i; j <= i + k; j++) s += landKm(g, curveOf(def, j));
  return s;
};
/** How much longer than the straight line a way is. Past MAX_DETOUR it was a road, mislabelled as sea. */
const MAX_DETOUR = 3;
const detour = (pts) => {
  let len = 0;
  for (let k = 1; k < pts.length; k++) len += km(pts[k - 1], pts[k]);
  const chord = km(pts[0], pts[pts.length - 1]);
  return chord > 50 ? len / chord : 1;
};

/** Waypoint indexes i whose ship stretch i -> i+1 is drawn over land. */
export function stretchesOverLand(def, g) {
  const wp = def.waypoints;
  const curve = smooth(wp);
  const bad = [];
  for (let i = 0; i < wp.length - 1; i++) {
    if (!shipStretch(def, i)) continue;
    const seg = curve.slice(i * SAMPLES_PER_SEGMENT, (i + 1) * SAMPLES_PER_SEGMENT + 1);
    if (landKm(g, seg) > TOLERANCE_KM) bad.push(i);
  }
  return bad;
}

// ── A* over water cells ────────────────────────────────────────────────────────

class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const { k, v } = this;
    let i = k.length;
    k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const { k, v } = this;
    const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= k.length) break;
        if (c + 1 < k.length && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const coastAt = (g, x, y) => NB.some(([dx, dy]) => landAt(g, x + dx, y + dy));

/**
 * Water cells from a to b inside a window padded by `pad` degrees, as unwrapped cell [x, y] pairs,
 * or null. Cells beside land cost more, so the path keeps off the coast and the spline that is
 * drawn through it has room to round its corners at sea.
 */
function astar(g, a, b, pad) {
  const ax = cellX(g, a[0]), ay = cellY(g, a[1]);
  const bx = cellX(g, b[0]), by = cellY(g, b[1]);
  const p = Math.round(pad * g.per);
  const x0 = Math.min(ax, bx) - p, x1 = Math.max(ax, bx) + p;
  const y0 = Math.max(0, Math.min(ay, by) - p), y1 = Math.min(g.rows - 1, Math.max(ay, by) + p);
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  if (W > g.cols * 1.5 || W * H > 4e6) return null;
  const inside = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const water = (x, y) => inside(x, y) && !landAt(g, x, y);
  const open = (x, y) => inside(x, y) && !solidAt(g, x, y);
  const coast = (x, y) => coastAt(g, x, y);

  // A port the mask puts inland (a river town, a narrow inlet) starts from the nearest water
  // cell. A stretch that starts further inland than 1.5 degrees is not a sea passage to route.
  const nearestWater = (x, y) => {
    if (water(x, y)) return [x, y];
    for (let r = 1; r <= 1.5 * g.per; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (const dy of (Math.abs(dx) === r ? range(-r, r) : [-r, r])) {
          if (water(x + dx, y + dy)) return [x + dx, y + dy];
        }
      }
    }
    return null;
  };
  const s = nearestWater(ax, ay), t = nearestWater(bx, by);
  if (!s || !t) return null;

  const idx = (x, y) => (y - y0) * W + (x - x0);
  const cost = new Float64Array(W * H).fill(Infinity);
  const done = new Uint8Array(W * H);
  const from = new Int32Array(W * H).fill(-1);
  const cosRow = (y) => Math.max(0.05, Math.cos((90 - (y + 0.5) / g.per) * Math.PI / 180));
  const h = (x, y) => Math.hypot((x - t[0]) * cosRow(y), y - t[1]);
  const heap = new Heap();
  cost[idx(s[0], s[1])] = 0;
  heap.push(h(s[0], s[1]), idx(s[0], s[1]));
  const goal = idx(t[0], t[1]);
  while (heap.size) {
    const cur = heap.pop();
    if (cur === goal) break;
    if (done[cur]) continue;   // a stale entry: this cell was settled cheaper already
    done[cur] = 1;
    const cx = (cur % W) + x0, cy = Math.floor(cur / W) + y0;
    const c0 = cost[cur];
    const cs = cosRow(cy);
    for (const [dx, dy] of NB) {
      const nx = cx + dx, ny = cy + dy;
      if (!open(nx, ny)) continue;
      // No corner-cutting between two solid cells.
      if (dx && dy && solidAt(g, cx + dx, cy) && solidAt(g, cx, cy + dy)) continue;
      // A shore cell only where there is no other way (a strait narrower than a cell); beside the
      // shore costs double, so the drawn spline has room to round a corner at sea.
      const step = Math.hypot(dx * cs, dy) * (landAt(g, nx, ny) ? 8 : coast(nx, ny) ? 2 : 1);
      const n = idx(nx, ny);
      if (c0 + step < cost[n]) {
        cost[n] = c0 + step;
        from[n] = cur;
        heap.push(c0 + step + h(nx, ny), n);
      }
    }
  }
  if (from[goal] === -1 && goal !== idx(s[0], s[1])) return null;
  const path = [];
  for (let n = goal; n !== -1; n = from[n]) path.push([(n % W) + x0, Math.floor(n / W) + y0]);
  return path.reverse();
}

function range(a, b) { const out = []; for (let i = a; i <= b; i++) out.push(i); return out; }

const cellCentre = (g, [x, y]) => [(x + 0.5) / g.per - 180, 90 - (y + 0.5) / g.per];

/** Straight from p to q without touching land (and, with `margin`, without touching the coast). */
function clear(g, p, q, margin) {
  const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) * g.per * 2));
  for (let k = 0; k <= n; k++) {
    const x = cellX(g, p[0] + (q[0] - p[0]) * k / n), y = cellY(g, p[1] + (q[1] - p[1]) * k / n);
    if (landAt(g, x, y)) return false;
    if (margin && NB.some(([dx, dy]) => landAt(g, x + dx, y + dy))) return false;
  }
  return true;
}

/** Pull a cell path tight: keep only the corners a straight line can't skip. */
function pull(g, pts, margin) {
  const out = [pts[0]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = pts.length - 1;
    while (j > i + 1 && !clear(g, pts[i], pts[j], margin)) j--;
    out.push(pts[j]);
    i = j;
  }
  return out;
}

/**
 * Open water from a to b: the bends between them (a and b themselves left out), unwrapped next to
 * a's longitude, or null when there is no way by sea inside a sensible window.
 * `dense` keeps far more of the path, for the rare stretch whose spline still cuts a cape.
 */
export function seaPath(g, a, b, { dense = false } = {}) {
  let cells = null;
  for (const pad of [6, 20, 45]) {
    cells = astar(g, a, b, pad);
    if (cells) break;
  }
  if (!cells) return null;
  const pts = [a, ...cells.map((c) => cellCentre(g, c)).slice(1, -1), b];
  // Any landward bit of the ends (a port in a land cell) is fine: the check lets ports off.
  let tight = dense ? pts.filter((_, k) => k === 0 || k === pts.length - 1 || k % 6 === 0) : pull(g, pull(g, pts, true), false);
  // The path starts at the water cell nearest each port, which can lie behind it: kept, that is a
  // hook out and back at the port. Bends that close to a port go, and so does any bend the path
  // turns back at (voyage-routes.py drop_spurs).
  const snap = Math.min(SNAP_KM, km(a, b) * 0.15);
  tight = dropSpurs([a, ...tight.slice(1, -1).filter((p) => km(p, a) > snap && km(p, b) > snap), b]);
  const shift = a[0] - wrapLon(a[0]);
  return tight.slice(1, -1).map(([x, y]) => {
    let lon = x + shift;
    while (lon - a[0] > 180) lon -= 360;
    while (a[0] - lon > 180) lon += 360;
    return [Math.round(lon * 100) / 100, Math.round(y * 100) / 100];
  });
}

/**
 * A bend (a waypoint inside a ship leg, not a stop) more than PORT_KM inland moves to the nearest
 * open water, up to 1.5 degrees away. Marco Polo's copy had a bend in the middle of Ceylon. A bend
 * on a shore is a call (Bear Island, Tahiti) and stays, and so does every stop: a port is on the
 * shore and an island call is on the island. Returns null when nothing moved.
 */
function nudgeBends(def, g) {
  const stops = new Set((def.legs || []).flatMap((l) => (Array.isArray(l.wp) ? l.wp : [])));
  const shore = Math.ceil(PORT_KM / (111.32 / g.per));
  let out = null;
  def.waypoints.forEach((p, i) => {
    if (stops.has(i) || i === 0 || i === def.waypoints.length - 1) return;
    if (!shipStretch(def, i - 1) || !shipStretch(def, i)) return;
    const x = cellX(g, wrapLon(p[0])), y = cellY(g, p[1]);
    let best = null;
    for (let r = 0; r <= 1.5 * g.per && !best; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || landAt(g, x + dx, y + dy)) continue;
          if (r <= shore) return;   // water within PORT_KM: a shore, leave it
          if (coastAt(g, x + dx, y + dy)) continue;
          const d = Math.hypot(dx, dy);
          if (!best || d < best.d) best = { d, dx, dy };
        }
      }
    }
    if (!best) return;
    out = out || JSON.parse(JSON.stringify(def));
    const [lon, lat] = cellCentre(g, [x + best.dx, y + best.dy]);
    out.waypoints[i] = [Math.round((lon + (p[0] - wrapLon(p[0]))) * 100) / 100, Math.round(lat * 100) / 100];
  });
  return out;
}

/** The opposite of insertAfter: waypoint j out, leg indexes and label_at shifted back. */
function removeAt(def, j) {
  def.waypoints.splice(j, 1);
  for (const leg of def.legs || []) {
    if (Array.isArray(leg.wp)) leg.wp = leg.wp.map((w) => (w > j ? w - 1 : w));
  }
  if (Number.isInteger(def.label_at) && def.label_at > j) def.label_at -= 1;
}

/**
 * Drop every new bend the drawn curve does not need. The router keeps a bend wherever a straight
 * line would touch land, but the spline is not a straight line: most of them can go, and each bend
 * left is a handle the teacher sees in the editor. A bend goes when the stretch still measures no
 * worse without it.
 */
function prune(g, def, i, k) {
  const out = JSON.parse(JSON.stringify(def));
  let end = i + k + 1;   // the stretch's far waypoint
  for (let j = i + 1; j < end;) {
    const trial = JSON.parse(JSON.stringify(out));
    removeAt(trial, j);
    const span = end - i;
    const from = Math.max(0, i - 1);
    // No worse in total, and no stretch near the tolerance: the chart's coast is finer than the mask.
    if (sumLand(g, trial, from, span) <= sumLand(g, out, from, span + 1) + 0.5 && maxLand(g, trial, from, span) <= PRUNE_KM) {
      removeAt(out, j);
      end -= 1;
    } else {
      j++;
    }
  }
  return out;
}

/** Drop every bend the path turns back at by more than about 125 degrees. */
function dropSpurs(pts) {
  const out = pts.slice();
  for (let changed = true; changed && out.length > 2;) {
    changed = false;
    for (let i = 1; i < out.length - 1; i++) {
      const [a, b, c] = [out[i - 1], out[i], out[i + 1]];
      const u = [b[0] - a[0], b[1] - a[1]], w = [c[0] - b[0], c[1] - b[1]];
      const nu = Math.hypot(...u), nw = Math.hypot(...w);
      if (nu < 1e-9 || nw < 1e-9 || (u[0] * w[0] + u[1] * w[1]) / (nu * nw) < -0.6) {
        out.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return out;
}

/** voyage-routes.py insert_after: new waypoints after i, leg indexes and label_at shifted. */
export function insertAfter(def, i, pts) {
  const k = pts.length;
  if (!k) return;
  def.waypoints.splice(i + 1, 0, ...pts);
  for (const leg of def.legs || []) {
    if (Array.isArray(leg.wp)) leg.wp = leg.wp.map((w) => (w > i ? w + k : w));
  }
  if (Number.isInteger(def.label_at) && def.label_at > i) def.label_at += k;
}

/**
 * The route with every ship stretch sent round the land. Returns the SAME object when nothing had
 * to change (so a caller can tell), else a copy. Stretches with no way by sea are left as drawn.
 */
export function seaSafeDef(def, g) {
  if (!g || !def || !Array.isArray(def.waypoints) || def.waypoints.length < 2) return def;
  const clone = (d) => JSON.parse(JSON.stringify(d));
  const key = (d, i) => `${d.waypoints[i]}|${d.waypoints[i + 1]}`;
  const given = new Set();   // stretches routed as well as the mask allows: not tried again
  let out = nudgeBends(def, g);
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const cur = out || def;
    // A stretch with no leg is a hole in the data (Paris to Toulon once had none), not a passage.
    const bad = stretchesOverLand(cur, g).filter((i) => legFor(cur, i) && !given.has(key(cur, i)));
    if (!bad.length) break;
    out = out || clone(def);
    // Last first, so the earlier indexes still point at the same stretch.
    for (const i of bad.reverse()) {
      let pick = null;
      // The pulled path first; when its spline still clips a cape, one that keeps more bends.
      for (const dense of [false, true]) {
        const pts = seaPath(g, out.waypoints[i], out.waypoints[i + 1], { dense });
        if (!pts || !pts.length) break;
        const trial = clone(out);
        insertAfter(trial, i, pts);
        const left = stretchesOverLand(trial, g).filter((j) => j >= i && j <= i + pts.length);
        pick = { pts, trial, left };
        if (!left.length) break;
      }
      // Kept only when it is clearly better than what was drawn: the same route measured again on
      // the next load comes out the same, and is left alone instead of growing more bends.
      const before = landKm(g, curveOf(out, i));
      const after = pick ? sumLand(g, pick.trial, i, pick.pts.length) : Infinity;
      if (!pick || after > before / 2 || detour(pick.trial.waypoints.slice(i, i + pick.pts.length + 2)) > MAX_DETOUR) {
        given.add(key(out, i));
        continue;
      }
      const n0 = out.waypoints.length;
      out = prune(g, pick.trial, i, pick.pts.length);
      const k = out.waypoints.length - n0;   // bends kept
      stretchesOverLand(out, g).filter((j) => j >= i && j <= i + k).forEach((j) => given.add(key(out, j)));
    }
  }
  // A stretch the mask could not improve was tried on a copy: same route, same object back.
  return out && JSON.stringify(out) !== JSON.stringify(def) ? out : def;
}
