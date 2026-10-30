// Backdrop: sky (supplied, never generated) with flat silhouette planes in front of it — hills, a town,
// a tree line — standing as rings at real distances. Because they are real 3D planes, any camera move
// gives true parallax: near rings slide faster than far ones, the sky does not move at all.
/* global BABYLON */
'use strict';
import { __ } from '../i18n';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const SAMPLES = 2400; // points around the full circle; enough for sharp roof corners at 120 m

  // One colour per KIND of thing, not per distance: no automatic fade with depth (it reads as fake fog).
  // "Distance paleness" exists as an explicit per-scene slider, default 0.
  const LAYERS = [
    { key: 'hills', label: 'Hills', radius: 230, color: '#6d7d6a', day: '#7fa36a', profile: hills },
    { key: 'town', label: 'Town', radius: 125, color: '#8a7f6c', day: '#c4ab86', profile: town },
    { key: 'trees', label: 'Tree line', radius: 72, color: '#44593f', day: '#4f7f3c', profile: trees },
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
    // buildings along the arc, in metres converted to angle at this radius, with real proportions:
    // houses 5-12 m wide with low gables (roof <= 0.4 x width), now and then a church tower whose
    // spire is as wide as the tower and at most 1.5 x that width tall. No needles.
    const R = 125;
    const blocks = [];
    let t = 0;
    while (t < Math.PI * 2) {
      if (rand() < 0.2) t += (6 + rand() * 20) / R;            // open ground between quarters
      const tower = rand() < 0.03;
      const wM = tower ? 6 + rand() * 3 : 5 + rand() * 7;      // width in metres
      const h = tower ? 18 + rand() * 8 : 6 + rand() * 6;
      const roof = tower ? wM * (1 + rand() * 0.5) : wM * (0.25 + rand() * 0.15);
      blocks.push({ a: t, b: t + wM / R, h, roof, tower });
      t += wM / R;
    }
    return (x) => {
      const blk = blocks.find((k) => x >= k.a && x < k.b);
      if (!blk) return 0.5;
      const u = (x - blk.a) / (blk.b - blk.a);
      return blk.h + blk.roof * (1 - Math.abs(2 * u - 1));     // gable or spire over the full width
    };
  }
  function trees(rand) {
    // rounded crowns overlapping, a few conifers; sizes in metres at this radius so nothing becomes a needle
    const R = 72;
    const crowns = [];
    for (let t = 0; t < Math.PI * 2; t += (2 + rand() * 4) / R) {
      const conifer = rand() < 0.15;
      const halfW = conifer ? 2 + rand() * 1.5 : 3 + rand() * 3;      // half width, metres
      const h = conifer ? 10 + rand() * 5 : 7 + rand() * 5;
      crowns.push({ c: t, w: halfW / R, h, conifer });
    }
    return (x) => {
      let h = 2.5;
      for (const k of crowns) {
        const d = Math.abs(x - k.c) / k.w;
        if (d >= 1) continue;
        h = Math.max(h, k.conifer ? 3 + (k.h - 3) * (1 - d) : 3 + (k.h - 3) * Math.sqrt(1 - d * d));
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
  let dayness = 0; // 0 = night colours, 1 = day colours (set by the look's Time of day)

  function colorFor(layer) {
    // explicit paleness: mixes towards the horizon colour by distance, only as far as the slider says
    const base = BABYLON.Color3.Lerp(BABYLON.Color3.FromHexString(layer.color), BABYLON.Color3.FromHexString(layer.day), dayness);
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
    farMat.emissiveColor = BABYLON.Color3.Lerp(BABYLON.Color3.FromHexString('#7a7a62'), BABYLON.Color3.FromHexString('#7f9a5a'), dayness);
  }

  Object.values(ui.toggles).forEach((el) => { el.onchange = rebuild; });
  ui.shuffle.onclick = () => { seed = Math.floor(Math.random() * 1e9); rebuild(); };
  ui.paleness.oninput = recolor;

  // ---------- plain painted-sky placeholder (a gradient, for trying silhouettes against) ----------
  // night -> day: deep night blue to a clear day blue; redrawn in place so a fade costs nothing
  // eye-level shots only see ~0-20 degrees above the horizon (v 0.39-0.5), so the blue must reach down there
  const SKY = { night: ['#16233a', '#2f4766', '#7d8c9c'], day: ['#3d7cc2', '#6aa6dc', '#cfe3ef'] };
  const mixHex = (a, b, t) => BABYLON.Color3.Lerp(BABYLON.Color3.FromHexString(a), BABYLON.Color3.FromHexString(b), t).toHexString();
  function drawSky(g, t) {
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, mixHex(SKY.night[0], SKY.day[0], t));
    grad.addColorStop(0.44, mixHex(SKY.night[1], SKY.day[1], t));
    grad.addColorStop(0.5, mixHex(SKY.night[2], SKY.day[2], t));
    grad.addColorStop(1, mixHex(SKY.night[2], SKY.day[2], t));
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 512);
  }
  function plainSky() {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    drawSky(c.getContext('2d'), 0);
    return c.toDataURL('image/png');
  }
  // a NEW texture each time: replacing the dome disposes the old one with it, and drawing on a
  // disposed texture's context crashed every later day/night change
  let skyTex = null;
  let plainActive = false;
  const setPhotoSky = mvp.setSky;
  function usePlainSky() {
    setPhotoSky(img.src);
    skyTex = new BABYLON.DynamicTexture('plain-sky', { width: 1024, height: 512 }, mvp.scene, false);
    mvp.getDome().photoTexture = skyTex;
    plainActive = true;
    drawSky(skyTex.getContext(), dayness);
    skyTex.update();
  }
  const skies = document.getElementById('skies');
  const img = document.createElement('img');
  img.src = plainSky();
  img.dataset.url = img.src;
  img.title = __('Plain sky');
  img.onclick = usePlainSky;
  skies.appendChild(img);
  skies.addEventListener('click', (e) => { if (e.target !== img) plainActive = false; }, true);
  usePlainSky();
  // a saved scene asks for its sky by url: the plain sky comes back through its own route
  mvp.setSky = (url) => { if (url === img.src) usePlainSky(); else { plainActive = false; setPhotoSky(url); } };

  function setDayness(t) {
    dayness = t;
    recolor();
    if (plainActive && skyTex && !skyTex.isDisposed?.()) { drawSky(skyTex.getContext(), t); skyTex.update(); }
  }

  // a camera farther out than the grid would hide the rings; open the far plane
  mvp.camera.maxZ = 2000;
  mvp.camera.upperRadiusLimit = 120;

  rebuild();
  window.__backdrop = { rebuild, LAYERS, setDayness };
})();
