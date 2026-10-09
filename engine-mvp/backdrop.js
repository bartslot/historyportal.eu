// Backdrop: sky (supplied, never generated) with flat silhouette planes in front of it — hills, a town,
// a tree line — standing as rings at real distances. Because they are real 3D planes, any camera move
// gives true parallax: near rings slide faster than far ones, the sky does not move at all.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const SAMPLES = 2400; // points around the full circle; enough for sharp roof corners at 120 m

  // One colour per KIND of thing, not per distance: no automatic fade with depth (it reads as fake fog).
  // "Distance paleness" exists as an explicit per-scene slider, default 0.
  const LAYERS = [
    { key: 'hills', label: 'Hills', radius: 230, color: '#6d7d6a', profile: hills },
    { key: 'town', label: 'Town', radius: 125, color: '#8a7f6c', profile: town },
    { key: 'trees', label: 'Tree line', radius: 72, color: '#44593f', profile: trees },
  ];

  // ---------- seeded randomness so "Shuffle" is repeatable ----------
  let seed = 7;
  function rng(s) {
    let t = s >>> 0;
    return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }
  function noise1d(rand, octaves) {
    const waves = Array.from({ length: octaves }, (_, i) => ({ f: (i + 1) * (1 + rand() * 2), p: rand() * Math.PI * 2, a: 1 / (i + 1) }));
    return (t) => waves.reduce((s, w) => s + w.a * Math.sin(t * w.f + w.p), 0) / 1.6;
  }

  // ---------- silhouette profiles: height (m) at angle t in [0, 2π) ----------
  function hills(rand) {
    const n = noise1d(rand, 5);
    return (t) => 22 + 12 * n(t * 2);
  }
  function town(rand) {
    // buildings along the arc: gable roofs, now and then a church tower with a spire
    const blocks = [];
    let t = 0;
    while (t < Math.PI * 2) {
      const gap = rand() < 0.25 ? 0.02 + rand() * 0.08 : 0; // open fields between quarters
      t += gap;
      const w = 0.012 + rand() * 0.03;
      const tower = rand() < 0.06;
      blocks.push({ a: t, b: t + w, h: tower ? 16 + rand() * 8 : 6 + rand() * 6, roof: tower ? 10 + rand() * 6 : 2 + rand() * 3, tower });
      t += w;
    }
    return (x) => {
      const blk = blocks.find((k) => x >= k.a && x < k.b);
      if (!blk) return 0.5;
      const u = (x - blk.a) / (blk.b - blk.a);
      if (blk.tower) { // narrow shaft + spire in the middle third
        if (u < 0.3 || u > 0.7) return blk.h * 0.45;
        const v = (u - 0.3) / 0.4;
        return blk.h + blk.roof * (1 - Math.abs(2 * v - 1));
      }
      return blk.h + blk.roof * (1 - Math.abs(2 * u - 1));
    };
  }
  function trees(rand) {
    // rounded crowns overlapping, with a few conifers poking out
    const crowns = [];
    for (let t = 0; t < Math.PI * 2; t += 0.004 + rand() * 0.012) {
      const conifer = rand() < 0.15;
      crowns.push({ c: t, w: conifer ? 0.006 + rand() * 0.004 : 0.01 + rand() * 0.012, h: conifer ? 9 + rand() * 6 : 6 + rand() * 5, conifer });
    }
    return (x) => {
      let h = 2.5;
      for (const k of crowns) {
        const d = Math.abs(x - k.c) / k.w;
        if (d >= 1) continue;
        h = Math.max(h, k.conifer ? k.h * (1 - d) + 2 : 3 + (k.h - 3) * Math.sqrt(1 - d * d));
      }
      return h;
    };
  }

  // ---------- ring mesh ----------
  function buildRing(layer, rand) {
    const h = layer.profile(rand);
    const positions = [];
    const indices = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = (i / SAMPLES) * Math.PI * 2;
      const x = Math.cos(t) * layer.radius;
      const z = Math.sin(t) * layer.radius;
      positions.push(x, -1, z, x, h(t % (Math.PI * 2)), z);
      if (i < SAMPLES) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const mesh = new BABYLON.Mesh('backdrop-' + layer.key, scene);
    const vd = new BABYLON.VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, vd.normals);
    vd.applyToMesh(mesh);
    const mat = new BABYLON.StandardMaterial('backdrop-' + layer.key + '-mat', scene);
    mat.disableLighting = true;      // a silhouette: one flat colour, like a cut-out paper plane
    mat.backFaceCulling = false;
    mesh.material = mat;
    mesh.isPickable = false;
    return mesh;
  }

  // far ground so the rings stand on something all the way out
  const farGround = BABYLON.MeshBuilder.CreateDisc('backdrop-ground', { radius: 260, tessellation: 96 }, scene);
  farGround.rotation.x = Math.PI / 2;
  farGround.position.y = -0.03;
  farGround.isPickable = false;
  const farMat = new BABYLON.StandardMaterial('backdrop-ground-mat', scene);
  farMat.disableLighting = true;
  farGround.material = farMat;

  // ---------- controls ----------
  const ui = {
    paleness: document.getElementById('bdPale'),
    shuffle: document.getElementById('bdShuffle'),
    toggles: Object.fromEntries(LAYERS.map((l) => [l.key, document.getElementById('bd-' + l.key)])),
  };
  let meshes = {};

  function colorFor(layer) {
    // explicit paleness: mixes towards the horizon colour by distance, only as far as the slider says
    const base = BABYLON.Color3.FromHexString(layer.color);
    const horizon = BABYLON.Color3.FromHexString('#c9cfd2');
    const k = Number(ui.paleness.value) * Math.min(1, layer.radius / 230);
    return BABYLON.Color3.Lerp(base, horizon, k);
  }

  function rebuild() {
    Object.values(meshes).forEach((m) => m.dispose(false, true));
    meshes = {};
    const rand = rng(seed);
    LAYERS.forEach((layer) => {
      const r = rng(Math.floor(rand() * 1e9)); // each layer its own stream: toggling one never reshuffles another
      if (!ui.toggles[layer.key].checked) return;
      meshes[layer.key] = buildRing(layer, r);
    });
    recolor();
  }
  function recolor() {
    LAYERS.forEach((layer) => { if (meshes[layer.key]) meshes[layer.key].material.emissiveColor = colorFor(layer); });
    farMat.emissiveColor = BABYLON.Color3.FromHexString('#7a7a62');
  }

  Object.values(ui.toggles).forEach((el) => { el.onchange = rebuild; });
  ui.shuffle.onclick = () => { seed = Math.floor(Math.random() * 1e9); rebuild(); };
  ui.paleness.oninput = recolor;

  // ---------- plain painted-sky placeholder (a gradient, for trying silhouettes against) ----------
  function plainSky() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#2c4a6e');
    grad.addColorStop(0.45, '#7e9bb5');
    grad.addColorStop(0.5, '#d9dfdf');
    grad.addColorStop(1, '#d9dfdf');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);
    return c.toDataURL('image/png');
  }
  const skies = document.getElementById('skies');
  const img = document.createElement('img');
  img.src = plainSky();
  img.dataset.url = img.src;
  img.title = 'Plain sky';
  img.onclick = () => mvp.setSky(img.src);
  skies.appendChild(img);
  mvp.setSky(img.src);

  // a camera farther out than the grid would hide the rings; open the far plane
  mvp.camera.maxZ = 2000;
  mvp.camera.upperRadiusLimit = 120;

  rebuild();
  window.__backdrop = { rebuild, LAYERS };
})();
