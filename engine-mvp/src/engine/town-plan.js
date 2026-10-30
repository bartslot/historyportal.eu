// Town plan: a street map for an old town, generated the way such towns grew. A market square in the
// middle, winding main streets running out to gates in a round wall, ring streets crossing them, and the
// blocks in between cut into narrow plots that face a street. Big blocks keep a courtyard. Pure geometry:
// city.js turns the plan into buildings. Everything scales with one number, the town radius R (metres).
'use strict';

(() => {
  const TAU = Math.PI * 2;
  const MAIN_W = 6;           // main street width (m)
  const RING_W = 4.5;         // ring street width (m)
  const PLOT = [70, 150];     // plot area range (m2): narrow medieval houses
  const PLOT_DEPTH = 11;      // plots deeper than this from a street become courtyard

  const area = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a.x * b.z - b.x * a.z; }, 0) / 2;
  const centroid = (p) => p.reduce((c, a) => ({ x: c.x + a.x / p.length, z: c.z + a.z / p.length }), { x: 0, z: 0 });

  // keep the part of polygon p on the side where dot(q - o, n) >= 0 (Sutherland-Hodgman, one plane)
  function clip(p, o, n) {
    const out = [];
    const side = (q) => (q.x - o.x) * n.x + (q.z - o.z) * n.z;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const sa = side(a), sb = side(b);
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }); }
    }
    return out;
  }

  // split a block into plots: cut across the longest edge until every plot is house-sized
  function subdivide(poly, rand, maxArea, out, depth = 0) {
    const A = Math.abs(area(poly));
    if (A < maxArea || depth > 9) { if (A > 18) out.push(poly); return; }
    let best = 0, ia = 0;
    poly.forEach((a, i) => { const b = poly[(i + 1) % poly.length]; const l = Math.hypot(b.x - a.x, b.z - a.z); if (l > best) { best = l; ia = i; } });
    const a = poly[ia], b = poly[(ia + 1) % poly.length];
    const t = 0.4 + rand() * 0.2;
    const o = { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
    const n = { x: (b.x - a.x) / best, z: (b.z - a.z) / best };          // cut perpendicular to that edge
    subdivide(clip(poly, o, n), rand, maxArea, out, depth + 1);
    subdivide(clip(poly, o, { x: -n.x, z: -n.z }), rand, maxArea, out, depth + 1);
  }

  function distToPoly(p, poly) {
    let best = Infinity;
    poly.forEach((a, i) => {
      const b = poly[(i + 1) % poly.length];
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
      best = Math.min(best, Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz));
    });
    return best;
  }

  // R = town radius in metres. Returns { streets: [{pts, width}], plaza, plots: [{poly, kind}], wall, gates }
  function planTown(rand, R) {
    const plazaR = Math.max(9, R * 0.13);
    const nMain = Math.max(4, Math.min(8, Math.round(3 + R / 35)));
    const ringRadii = R > 70 ? [R * 0.48, R * 0.76] : [R * 0.58];
    const phase = Array.from({ length: nMain }, () => rand() * TAU);

    // main streets wind a little: their angle drifts with distance from the square
    const base = Array.from({ length: nMain }, (_, i) => (i / nMain) * TAU + (rand() - 0.5) * (TAU / nMain) * 0.35);
    const angleAt = (i, r) => base[i] + 0.12 * Math.sin((r / R) * Math.PI * 1.6 + phase[i]);
    // rings are wobbly circles
    const ringWob = ringRadii.map(() => [rand() * TAU, rand() * TAU]);
    const ringAt = (k, th) => ringRadii[k] * (1 + 0.05 * Math.sin(th * 3 + ringWob[k][0]) + 0.03 * Math.sin(th * 5 + ringWob[k][1]));
    const wallAt = (th) => R * (1 + 0.04 * Math.sin(th * 4 + phase[0]));

    const streets = [];
    for (let i = 0; i < nMain; i++) {
      const pts = [];
      for (let s = 0; s <= 12; s++) { const r = plazaR + (R + 6 - plazaR) * (s / 12); const a = angleAt(i, r); pts.push({ x: Math.cos(a) * r, z: Math.sin(a) * r }); }
      streets.push({ pts, width: MAIN_W });
    }
    ringRadii.forEach((_, k) => {
      const pts = [];
      for (let s = 0; s <= 72; s++) { const th = (s / 72) * TAU; const r = ringAt(k, th); pts.push({ x: Math.cos(th) * r, z: Math.sin(th) * r }); }
      streets.push({ pts, width: RING_W });
    });

    // blocks: between two main streets and two consecutive rings (square, rings, wall)
    const bands = [{ r: () => plazaR, w: 0 }, ...ringRadii.map((_, k) => ({ r: (th) => ringAt(k, th), w: RING_W })), { r: (th) => wallAt(th) - 4, w: 0 }];
    const plots = [];
    for (let i = 0; i < nMain; i++) {
      const j = (i + 1) % nMain;
      for (let b = 0; b < bands.length - 1; b++) {
        const inner = bands[b], outer = bands[b + 1];
        const poly = [];
        const steps = 8;
        const rIn = (th) => inner.r(th) + inner.w / 2 + 0.5;
        const rOut = (th) => outer.r(th) - outer.w / 2 - 0.5;
        const thA = (r) => angleAt(i, r) + (MAIN_W / 2 + 0.5) / r;
        let thB = (r) => angleAt(j, r) - (MAIN_W / 2 + 0.5) / r;
        if (j === 0) { const tb = thB; thB = (r) => tb(r) + TAU; }
        const rMid = (rIn(base[i]) + rOut(base[i])) / 2;
        if (thB(rMid) - thA(rMid) < 0.05) continue;
        for (let s = 0; s <= steps; s++) { const r0 = rIn(base[i]); const th = thA(r0) + (thB(r0) - thA(r0)) * (s / steps); const r = rIn(th); poly.push({ x: Math.cos(th) * r, z: Math.sin(th) * r }); }
        for (let s = 0; s <= steps; s++) { const r1 = rOut(base[i]); const th = thB(r1) - (thB(r1) - thA(r1)) * (s / steps); const r = rOut(th); poly.push({ x: Math.cos(th) * r, z: Math.sin(th) * r }); }
        if (Math.abs(area(poly)) < 40) continue;
        const lots = [];
        subdivide(poly, rand, PLOT[0] + rand() * (PLOT[1] - PLOT[0]), lots);
        lots.forEach((lot) => {
          // plots deep inside a big block stay open: gardens and courtyards
          if (distToPoly(centroid(lot), poly) > PLOT_DEPTH) return;
          plots.push({ poly: lot, kind: 'house' });
        });
      }
    }

    // the church faces the square: the house plot closest to the square becomes the church
    let churchIdx = -1, bestD = Infinity;
    plots.forEach((p, i) => { const c = centroid(p.poly); const d = Math.hypot(c.x, c.z); if (d < bestD) { bestD = d; churchIdx = i; } });
    if (churchIdx >= 0) plots[churchIdx].kind = 'church';

    const wall = [];
    for (let s = 0; s < 64; s++) { const th = (s / 64) * TAU; const r = wallAt(th); wall.push({ x: Math.cos(th) * r, z: Math.sin(th) * r, th }); }
    const gates = base.map((a) => ((a % TAU) + TAU) % TAU);
    return { streets, plaza: { r: plazaR }, plots, wall, gates, R };
  }

  window.__townPlan = { planTown, area, centroid };
})();
