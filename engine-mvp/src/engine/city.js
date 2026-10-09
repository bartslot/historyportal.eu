// Procedural town, map first: town-plan.js draws the street map (square, winding main streets, rings,
// wall, plots); this file builds it from basic shapes: every plot becomes an extruded house with a gable
// over its long side and a door on the wall nearest a street; the plot nearest the square becomes the
// church with a tower; a round wall with towers and gates rings the town. One slider sets the town size.
// Merged per colour, so a whole town is a handful of draw calls and ONE actor you can move and key.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const FLOOR = 3;            // metres per storey
  const MAX_ROOF = 6;         // metres of roof above the eaves (wide plots would otherwise get towering gables)
  const MAX_ROOF_BIG = 14;    // church
  const SIZE = [35, 180];     // town radius range (m) the City size slider maps onto

  const WALLS = ['#d9c9a8', '#cbb48f', '#e2d6bf', '#bfa27a', '#b8b0a2', '#d4bfa0'];
  const ROOFS = ['#8c3b2a', '#7a4a32', '#5e5a57', '#9a5a3a'];
  const STONE = '#9b9488';
  const SLATE = '#4f5560';
  const DOOR = '#3d2c20';
  const WOOD = '#6b4a2b';
  const PAVING = '#b9ad97';
  const PROP_HEIGHT = 0.8;    // metres; door-sign objects are scaled to this
  // a roof's underside must not lie in the same plane as the wall top: two coplanar faces flicker against
  // each other (z-fighting), seen from inside a house or along the eaves
  const ROOF_LIFT = 0.02;

  // Objects above doors are made up front with the 3D tool and listed in assets/props/props.json
  // (["guild-sign-baker.glb", ...]). Until there are any, a plain bracket + sign stands in.
  const doorProps = [];
  fetch('assets/props/props.json').then((r) => (r.ok ? r.json() : [])).then((files) => Promise.all(files.map((f) =>
    BABYLON.SceneLoader.LoadAssetContainerAsync('assets/props/', f, scene).then((c) => doorProps.push(c))
      .catch((err) => console.warn('door prop failed to load:', f, err.message))))).catch(() => {});

  const $ = (id) => document.getElementById(id);
  const ui = { size: $('citySize'), wall: $('cityWall'), build: $('cityBuild'), shuffle: $('cityShuffle') };
  let seed = 11;

  function rng(s) {
    let t = s >>> 0;
    return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }
  // building surfaces: the hole-aware toon material from door.js, so doors and gates can cut any town wall
  const mat = (hex) => mvp.buildingMaterial(hex);

  // ---------- the stackable shapes ----------
  function box(parts, hex, w, h, d, x, y, z, ry = 0) {
    const m = BABYLON.MeshBuilder.CreateBox('b', { width: w, height: h, depth: d }, scene);
    m.position.set(x, y + h / 2, z);
    m.rotation.y = ry;
    parts.push([hex, m]);
  }
  // gable roof: triangular prism, ridge along the building's length (local x), pitch scales the height
  function gable(parts, hex, len, width, x, y, z, ry, pitch) {
    const R = width / Math.sqrt(3);
    const m = BABYLON.MeshBuilder.CreateCylinder('g', { height: len, diameter: 2 * R, tessellation: 3 }, scene);
    m.rotation.set(0, ry, Math.PI / 2);
    m.scaling.y = 1;
    m.bakeCurrentTransformIntoVertices();
    m.scaling.y = pitch;
    m.position.set(x, y + ROOF_LIFT + (R / 2) * pitch, z);
    parts.push([hex, m]);
  }
  function pyramid(parts, hex, size, height, x, y, z, ry = 0) {
    const m = BABYLON.MeshBuilder.CreateCylinder('p', { height, diameterTop: 0, diameterBottom: size * Math.SQRT2, tessellation: 4 }, scene);
    m.rotation.y = Math.PI / 4 + ry;
    m.position.set(x, y + height / 2, z);
    parts.push([hex, m]);
  }
  function cone(parts, hex, dia, height, x, y, z) {
    const m = BABYLON.MeshBuilder.CreateCylinder('c', { height, diameterTop: 0, diameterBottom: dia, tessellation: 8 }, scene);
    m.position.set(x, y + height / 2, z);
    parts.push([hex, m]);
  }
  function drum(parts, hex, dia, height, x, y, z) {
    const m = BABYLON.MeshBuilder.CreateCylinder('d', { height, diameter: dia, tessellation: 8 }, scene);
    m.position.set(x, y + height / 2, z);
    parts.push([hex, m]);
  }

  // A door in a wall at (x, z) whose outward normal is (nx, nz); ry turns the door into the wall's line.
  // The slot above it is filled later by doorObject. 
  function door(parts, props, x, z, ry, nx, nz) {
    box(parts, DOOR, 1.0, 2.1, 0.12, x + nx * 0.04, 0, z + nz * 0.04, ry);
    props.push({ x, y: 2.45, z, ry, nx, nz });
  }

  // above-door object: one of the pre-made props, else a basic bracket with a hanging sign
  function doorObject(parts, extra, rand, slot) {
    if (doorProps.length) {
      const c = doorProps[Math.floor(rand() * doorProps.length)];
      const inst = c.instantiateModelsToScene((n) => 'prop-' + n, false);
      const root = inst.rootNodes[0];
      root.computeWorldMatrix(true);
      const { min, max } = root.getHierarchyBoundingVectors(true);
      root.scaling.scaleInPlace(PROP_HEIGHT / Math.max(0.01, max.y - min.y));
      root.position.set(slot.x + slot.nx * 0.3, slot.y, slot.z + slot.nz * 0.3);
      const face = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.Y, Math.atan2(slot.nx, slot.nz)); // look out of the wall
      root.rotationQuaternion = face.multiply(root.rotationQuaternion || BABYLON.Quaternion.Identity());
      extra.push(root);
      return;
    }
    // bracket sticking out of the wall, with a blade sign hanging from it
    box(parts, WOOD, 0.08, 0.08, 0.7, slot.x + slot.nx * 0.35, slot.y + 0.4, slot.z + slot.nz * 0.35, slot.ry);
    box(parts, WOOD, 0.05, 0.45, 0.55, slot.x + slot.nx * 0.45, slot.y - 0.05, slot.z + slot.nz * 0.45, slot.ry);
  }

  // ---------- one plot -> one house ----------
  function building(parts, walls, props, plot, rand, nearestStreet) {
    const { area } = window.__townPlan;
    let poly = plot.poly.map((p) => ({ ...p }));
    if (area(poly) < 0) poly = poly.reverse();                  // counter-clockwise: (dz, -dx) points outward
    const c = window.__townPlan.centroid(poly);
    poly = poly.map((p) => ({ x: c.x + (p.x - c.x) * 0.97, z: c.z + (p.z - c.z) * 0.97 })); // hairline gap between houses
    const church = plot.kind === 'church';
    const dist = Math.hypot(c.x, c.z);
    const floors = church ? 4 : 2 + Math.floor(rand() * 2) + (dist < 60 && rand() < 0.4 ? 1 : 0); // taller near the centre
    const h = floors * FLOOR;
    const shape = poly.map((p) => new BABYLON.Vector3(p.x, 0, p.z));
    // single-sided geometry: the building material already draws both sides. DOUBLESIDE would add a coplanar
    // copy of every wall, and the two copies flicker against each other (z-fighting) as the camera moves
    const m = BABYLON.MeshBuilder.ExtrudePolygon('w', { shape, depth: h }, scene, window.earcut);
    m.position.y = h;                                          // ExtrudePolygon grows downwards from y = 0
    walls.push([church ? STONE : WALLS[Math.floor(rand() * WALLS.length)], m]);

    // gable over the long side of the plot
    let best = 0, angle = 0;
    poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; const l = Math.hypot(q.x - p.x, q.z - p.z); if (l > best) { best = l; angle = Math.atan2(q.z - p.z, q.x - p.x); } });
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const loc = poly.map((p) => ({ u: p.x * ca + p.z * sa, v: -p.x * sa + p.z * ca }));
    const u0 = Math.min(...loc.map((q) => q.u)), u1 = Math.max(...loc.map((q) => q.u));
    const v0 = Math.min(...loc.map((q) => q.v)), v1 = Math.max(...loc.map((q) => q.v));
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
    const cx = cu * ca - cv * sa, cz = cu * sa + cv * ca;
    const width = v1 - v0;
    const pitch = Math.min(church ? 1.2 : 0.9 + rand() * 0.4, (church ? MAX_ROOF_BIG : MAX_ROOF) / (0.866 * width));
    gable(parts, church ? SLATE : ROOFS[Math.floor(rand() * ROOFS.length)], u1 - u0, width, cx, h, cz, -angle, pitch);
    if (!church && rand() < 0.35) box(parts, STONE, 0.6, 2.6, 0.6, cx + ca * (u1 - u0) * 0.25, h, cz + sa * (u1 - u0) * 0.25, -angle);
    if (church) {                                              // tower at one end of the nave
      const tx = cx + ca * (u1 - u0) * 0.5, tz = cz + sa * (u1 - u0) * 0.5;
      box(parts, STONE, 4.5, h + 14, 4.5, tx, 0, tz, -angle);
      pyramid(parts, SLATE, 4.9, 11, tx, h + 14, tz, -angle);
    }

    // door in the wall that faces a street most closely
    let d0 = null;
    poly.forEach((p, i) => {
      const q = poly[(i + 1) % poly.length];
      const len = Math.hypot(q.x - p.x, q.z - p.z);
      if (len < 1.6) return;
      const mid = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
      const nx = (q.z - p.z) / len, nz = -(q.x - p.x) / len;
      const d = nearestStreet({ x: mid.x + nx, z: mid.z + nz });
      if (!d0 || d < d0.d) d0 = { d, mid, nx, nz, ry: -Math.atan2(q.z - p.z, q.x - p.x) };
    });
    if (d0) door(parts, props, d0.mid.x, d0.mid.z, d0.ry, d0.nx, d0.nz);
  }

  function townWall(parts, plan) {
    const H = 7;
    const nearGate = (th) => plan.gates.some((g) => { const d = Math.abs(((th - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI); return d < 0.05; });
    plan.wall.forEach((a, i) => {
      const b = plan.wall[(i + 1) % plan.wall.length];
      if (nearGate(a.th) || nearGate(b.th)) return;            // gaps where the main streets leave the town
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      box(parts, STONE, len + 0.4, H, 1.6, (a.x + b.x) / 2, 0, (a.z + b.z) / 2, -Math.atan2(b.z - a.z, b.x - a.x));
      if (i % 8 === 0) { drum(parts, STONE, 5, H + 4, a.x, 0, a.z); cone(parts, ROOFS[0], 5.6, 5, a.x, H + 4, a.z); }
    });
  }

  function buildTown() {
    const rand = rng(seed);
    const R = SIZE[0] + (SIZE[1] - SIZE[0]) * Number(ui.size.value);
    const plan = window.__townPlan.planTown(rand, R);
    const parts = [], walls = [], props = [], extra = [];
    const segs = [];
    plan.streets.forEach(({ pts, width }) => {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const len = Math.hypot(b.x - a.x, b.z - a.z);
        box(parts, PAVING, len + width * 0.5, 0.04, width, (a.x + b.x) / 2, 0.005, (a.z + b.z) / 2, -Math.atan2(b.z - a.z, b.x - a.x));
        segs.push({ a, b });
      }
    });
    const square = BABYLON.MeshBuilder.CreateCylinder('sq', { height: 0.04, diameter: plan.plaza.r * 2 + 4, tessellation: 24 }, scene);
    square.position.y = 0.025;
    parts.push([PAVING, square]);
    const nearestStreet = (p) => {
      let best = Math.max(0, Math.hypot(p.x, p.z) - plan.plaza.r);   // the square counts as a street
      segs.forEach(({ a, b }) => {
        const dx = b.x - a.x, dz = b.z - a.z;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
        best = Math.min(best, Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz));
      });
      return best;
    };
    plan.plots.forEach((plot) => building(parts, walls, props, plot, rand, nearestStreet));
    if (ui.wall.checked) townWall(parts, plan);
    props.forEach((slot) => doorObject(parts, extra, rand, slot));
    return mergeParts([...parts, ...walls], extra);
  }

  function mergeParts(parts, extra) {
    const groups = {};
    parts.forEach(([hex, m]) => { (groups[hex] = groups[hex] || []).push(m); });
    const merged = Object.entries(groups).map(([hex, ms]) => {
      const m = BABYLON.Mesh.MergeMeshes(ms, true, true);
      m.name = 'city-part';
      m.material = mat(hex);
      return m;
    });
    return [...merged, ...extra];
  }

  // ---------- catalog + panel: one path for the mouse, the AI animator and the slider ----------
  const item = { name: 'Town (procedural)', build: buildTown, footprint: null }; // a whole town: things stand in its streets
  mvp.CATALOG.push(item);
  const town = () => mvp.actors.find((a) => a.name === item.name);
  async function rebuild() {
    // rebuild in place: same position and turn, new size or shuffle
    const old = town();
    const at = old ? { x: old.position.x, z: old.position.z } : { x: 0, z: 0 };
    const rot = old && old.rotationQuaternion.clone();
    if (old) mvp.deleteActor(old);
    const t = await mvp.addFromCatalog(item, at);
    if (rot) t.rotationQuaternion = rot;
  }
  ui.build.onclick = rebuild;
  ui.shuffle.onclick = () => { seed = Math.floor(Math.random() * 1e9); rebuild(); };
  ui.size.onchange = () => { if (town()) rebuild(); };   // on release: a big town takes a moment
  ui.wall.onchange = () => { if (town()) rebuild(); };
  window.__city = { buildTown };
})();
