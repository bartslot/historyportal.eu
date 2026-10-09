// Clouds: painted watercolour cloud cut-outs (assets/clouds, neutral white with real alpha) scattered
// procedurally over the sky. "Cloudiness" goes from a clear day to overcast; the shot type picks the set:
// thin clouds for normal shots, puffy towers for cinematic shots. Every cloud is an ordinary object you
// can drag across the sky; a cloud you moved by hand is pinned and survives re-scattering.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const MAX_CLOUDS = 28;
  const DIST = [220, 420];      // metres from the centre; beyond the backdrop rings, inside the sky dome
  const HEIGHT = [40, 120];     // metres above the ground
  const SETS = {
    normal: ['cloud-01-wisp', 'cloud-02-layered-bank', 'cloud-03-billowing-bank'],
    cinematic: ['cloud-04-towering', 'cloud-05-grand-bank', 'cloud-06-rounded-cluster'],
  };
  SETS.mixed = [...SETS.normal, ...SETS.cinematic];
  const WIDTH = { normal: [70, 150], cinematic: [90, 170] }; // metres wide on screen at that distance

  const $ = (id) => document.getElementById(id);
  const ui = { amount: $('cloudAmount'), shot: $('cloudShot'), shuffle: $('cloudShuffle') };
  let seed = 3;
  let dayness = 0;
  let info = {};              // name -> {w, h}
  const materials = {};

  function rng(s) {
    let t = s >>> 0;
    return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }

  // night: moonlit blue-grey; day: white
  const tint = () => BABYLON.Color3.Lerp(new BABYLON.Color3(0.55, 0.62, 0.76), new BABYLON.Color3(1, 1, 1), dayness);
  function material(name) {
    if (materials[name]) return materials[name];
    const m = new BABYLON.StandardMaterial('sky-cloud-' + name, scene);
    const tex = new BABYLON.Texture('assets/clouds/' + name + '.png', scene);
    tex.hasAlpha = true;
    m.diffuseTexture = tex;
    m.useAlphaFromDiffuseTexture = true;
    m.disableLighting = true;                 // painted cut-out, coloured only by the time-of-day tint
    m.emissiveColor = BABYLON.Color3.Black();
    m.diffuseColor = tint();
    m.backFaceCulling = false;
    materials[name] = m;
    return m;
  }

  function makeCloud(name, widthM) {
    const { w, h } = info[name];
    const plane = BABYLON.MeshBuilder.CreatePlane('sky-cloud', { width: widthM, height: widthM * h / w }, scene);
    plane.material = material(name);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y; // always faces the camera around the vertical axis
    plane.position.y = (widthM * h / w) / 2;            // the actor's origin sits at the cloud's base
    const root = mvp.makeActor(name, [plane]);
    root.metadata.scenery = true;                       // not shown to the AI animator as a character/prop
    root.metadata.cloud = true;
    plane.receiveShadows = false;
    mvp.addHitbox(root);
    return root;
  }

  // ---------- scatter ----------
  function scatter() {
    // remove the scattered (unpinned) clouds, keep hand-placed ones
    mvp.actors.filter((a) => a.metadata.cloud && !a.metadata.pinned).forEach((a) => mvp.deleteActor(a));
    const shot = ui.shot.value;
    const names = SETS[shot].filter((n) => info[n]);
    if (!names.length) return;
    const count = Math.round(Number(ui.amount.value) * MAX_CLOUDS);
    const rand = rng(seed);
    const [wMin, wMax] = WIDTH[shot === 'cinematic' ? 'cinematic' : 'normal'];
    for (let i = 0; i < count; i++) {
      // golden-angle spread around the sky so clouds never bunch into one quarter
      const angle = i * 2.39996 + rand() * 0.6;
      const dist = DIST[0] + rand() * (DIST[1] - DIST[0]);
      const cloud = makeCloud(names[Math.floor(rand() * names.length)], wMin + rand() * (wMax - wMin));
      cloud.position.set(Math.cos(angle) * dist, HEIGHT[0] + rand() * (HEIGHT[1] - HEIGHT[0]), Math.sin(angle) * dist);
    }
    mvp.select(null);
  }

  // ---------- dragging a cloud across the sky (keeps its distance from the camera) ----------
  mvp.placeHooks.push((actor) => {
    if (!actor.metadata.cloud) return false;
    const ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), mvp.camera);
    const cam = mvp.camera.position;
    const dist = Math.max(60, BABYLON.Vector3.Distance(cam, actor.position));
    const p = cam.add(ray.direction.scale(dist));
    actor.position.set(p.x, Math.max(HEIGHT[0] * 0.5, p.y), p.z);
    actor.metadata.pinned = true;                       // a moved cloud stays where you put it
    return true;
  });

  function setDayness(t) {
    dayness = t;
    Object.values(materials).forEach((m) => { m.diffuseColor = tint(); });
  }

  let pending = null;
  ui.amount.oninput = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(scatter); };
  ui.shot.onchange = scatter;
  ui.shuffle.onclick = () => { seed = Math.floor(Math.random() * 1e9); scatter(); };

  fetch('assets/clouds/clouds.json').then((r) => r.json()).then((list) => {
    info = Object.fromEntries(list.map((c) => [c.name, c]));
    scatter();
  }).catch((err) => console.warn('clouds unavailable:', err.message));

  window.__clouds = { scatter, setDayness };
})();
