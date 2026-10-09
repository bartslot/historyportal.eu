// Procedural city: buildings are basic shapes stacked on each other — a block, maybe an overhanging
// upper floor, a gable or hip roof, a chimney — set shoulder to shoulder along streets. Now and then a
// tower or a church. Everything is merged per material, so a whole town costs a handful of draw calls,
// and the town is ONE actor: select it, drag it, turn it, key it like any other object.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const FLOOR = 3;        // metres per storey
  const STREET = 4;       // street width (m)
  const BLOCK = 14;       // block size between streets (m)

  const WALLS = ['#d9c9a8', '#cbb48f', '#e2d6bf', '#bfa27a', '#b8b0a2', '#d4bfa0'];
  const ROOFS = ['#8c3b2a', '#7a4a32', '#5e5a57', '#9a5a3a'];
  const STONE = '#9b9488';
  const SLATE = '#4f5560';

  const $ = (id) => document.getElementById(id);
  const ui = { blocks: $('cityBlocks'), density: $('cityDensity'), floors: $('cityFloors'), towers: $('cityTowers'),
    wall: $('cityWall'), build: $('cityBuild'), shuffle: $('cityShuffle') };
  let seed = 11;

  function rng(s) {
    let t = s >>> 0;
    return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }

  // one shared material per colour: merged meshes are grouped by it
  const mats = {};
  function mat(hex) {
    if (!mats[hex]) {
      const m = new BABYLON.StandardMaterial('city-' + hex, scene);
      m.diffuseColor = BABYLON.Color3.FromHexString(hex);
      m.specularColor = BABYLON.Color3.Black();
      mats[hex] = m;
    }
    return mats[hex];
  }

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
    m.position.set(x, y + (R / 2) * pitch, z);
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

  // ---------- buildings: stacks of the shapes above ----------
  function house(parts, rand, x, z, w, d, ry, maxFloors) {
    const wall = WALLS[Math.floor(rand() * WALLS.length)];
    const roof = ROOFS[Math.floor(rand() * ROOFS.length)];
    const floors = 1 + Math.floor(rand() * maxFloors);
    let h = floors * FLOOR;
    box(parts, wall, w, h, d, x, 0, z, ry);
    if (floors > 1 && rand() < 0.4) { // overhanging upper floor (jetty), a little wider than the ground floor
      const up = FLOOR;
      box(parts, WALLS[Math.floor(rand() * WALLS.length)], w + 0.1, up, d + 0.6, x, h, z, ry);
      h += up;
    }
    if (rand() < 0.75) gable(parts, roof, w + 0.4, d + 0.5, x, h, z, ry, 0.8 + rand() * 0.6);
    else pyramid(parts, roof, Math.max(w, d) + 0.3, 2 + rand() * 2, x, h, z, ry);
    if (rand() < 0.5) { // chimney on one side of the ridge
      const off = (rand() - 0.5) * w * 0.6;
      box(parts, STONE, 0.6, 2.6, 0.6, x + Math.cos(ry) * off, h, z - Math.sin(ry) * off, ry);
    }
  }
  function tower(parts, rand, x, z) {
    const s = 3 + rand() * 1.5;
    const h = 14 + rand() * 10;
    box(parts, STONE, s, h, s, x, 0, z);
    if (rand() < 0.5) pyramid(parts, SLATE, s + 0.4, 6 + rand() * 6, x, h, z);
    else { box(parts, STONE, s + 0.6, 1, s + 0.6, x, h, z); cone(parts, SLATE, s * 0.8, 5 + rand() * 4, x, h + 1, z); }
  }
  function church(parts, rand, x, z, ry) {
    const nave = 16;
    box(parts, STONE, nave, 9, 8, x, 0, z, ry);
    gable(parts, SLATE, nave + 0.4, 8.6, x, 9, z, ry, 1.2);
    const tx = x + Math.cos(ry) * (nave / 2 + 2);
    const tz = z - Math.sin(ry) * (nave / 2 + 2);
    box(parts, STONE, 4.5, 22, 4.5, tx, 0, tz, ry);
    pyramid(parts, SLATE, 4.9, 12, tx, 22, tz, ry);
  }
  function cityWall(parts, half) {
    const h = 6;
    for (const [dx, dz, len, ry] of [[0, -half, half * 2, 0], [0, half, half * 2, 0], [-half, 0, half * 2, Math.PI / 2], [half, 0, half * 2, Math.PI / 2]]) {
      box(parts, STONE, len, h, 1.5, dx, 0, dz, ry);
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      drum(parts, STONE, 5, h + 4, sx * half, 0, sz * half);
      cone(parts, ROOFS[0], 5.6, 5, sx * half, h + 4, sz * half);
    }
  }

  // ---------- layout: houses shoulder to shoulder along both street sides of every block ----------
  function buildCity() {
    const rand = rng(seed);
    const n = Number(ui.blocks.value);
    const density = Number(ui.density.value);
    const maxFloors = Number(ui.floors.value);
    const towerChance = Number(ui.towers.value);
    const pitch = BLOCK + STREET;
    const half = (n * pitch) / 2;
    const parts = [];
    let churchDone = false;

    for (let bx = 0; bx < n; bx++) {
      for (let bz = 0; bz < n; bz++) {
        const ox = -half + STREET / 2 + bx * pitch;
        const oz = -half + STREET / 2 + bz * pitch;
        // the most central block gets the church
        if (!churchDone && bx === Math.floor(n / 2) && bz === Math.floor(n / 2)) {
          church(parts, rand, ox + BLOCK / 2, oz + BLOCK / 2, 0);
          churchDone = true;
          continue;
        }
        for (const side of [0, 1]) { // north and south street fronts of the block
          let x = ox;
          while (x < ox + BLOCK - 3) {
            const w = Math.min(3.5 + rand() * 3, ox + BLOCK - x);
            const d = 5 + rand() * 2;
            if (rand() < density) {
              const z = side === 0 ? oz + d / 2 : oz + BLOCK - d / 2;
              if (rand() < towerChance) tower(parts, rand, x + w / 2, z);
              else house(parts, rand, x + w / 2, z, w - 0.15, d, 0, maxFloors);
            }
            x += w;
          }
        }
      }
    }
    if (ui.wall.checked) cityWall(parts, half + 3);

    // merge per colour: a whole town is a few meshes, not thousands
    const groups = {};
    parts.forEach(([hex, m]) => { (groups[hex] = groups[hex] || []).push(m); });
    return Object.entries(groups).map(([hex, ms]) => {
      const merged = BABYLON.Mesh.MergeMeshes(ms, true, true);
      merged.name = 'city-part';
      merged.material = mat(hex);
      return merged;
    });
  }

  // ---------- hook into the catalog: the mouse, the AI animator and this panel all use one path ----------
  const item = { name: 'City (procedural)', build: buildCity };
  mvp.CATALOG.push(item);
  const b = document.createElement('button');
  b.textContent = item.name;
  b.onclick = () => mvp.addFromCatalog(item);
  $('models').appendChild(b);

  ui.build.onclick = () => mvp.addFromCatalog(item);
  ui.shuffle.onclick = () => { seed = Math.floor(Math.random() * 1e9); mvp.addFromCatalog(item); };
  window.__city = { buildCity };
})();
