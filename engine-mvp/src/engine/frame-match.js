// Frame-match test shot (comic-look Gate 1, 2026-10-13): ?scene=spyglass rebuilds Bart's Figma panel 2321:5151
// (Tasman with the spyglass on deck, the coast ahead) in 3D, to put next to it in the Reference panel.
// Painted plate (sea + coast) behind; a simple deck, railing and barrel; Tasman from one picture via
// Hunyuan3D-Omni with that picture painted back on (render PC). Tuning from the console: window.__shot.
//   ?scene=spyglass[&actor=<glb>]
/* global BABYLON */
'use strict';

(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('scene') !== 'spyglass') return;
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const PLATE = { url: 'assets/plates/nz-high-land-sea.webp', horizon: 0.65 };
  const TASMAN = { name: 'Tasman (test)', url: params.get('actor') || 'assets/models/tasman-spyglass.glb', height: 1.8 };
  // the camera of the panel: a little below Tasman's eyes, looking out over the rail, horizon near the middle
  const CAMERA = { position: [-0.6, 1.35, -1.2], target: [0.5, 1.5, 4.5], fov: 0.72 };
  const WOOD = '#9a7350', WOOD_DARK = '#6e4f37', DECK = '#c9ae86';
  const RAIL = { from: [3.2, 1.0], to: [1.0, 9.0], height: 1.05, postEvery: 1.3 };

  function mat(name, hex) {
    const m = new BABYLON.StandardMaterial(name, scene);
    m.diffuseColor = BABYLON.Color3.FromHexString(hex);
    m.specularColor = BABYLON.Color3.Black();
    return m;
  }

  function box(name, size, pos, material, yaw = 0) {
    const b = BABYLON.MeshBuilder.CreateBox(name, size, scene);
    b.position.set(...pos);
    b.rotation.y = yaw;
    b.material = material;
    b.receiveShadows = true;
    b.isPickable = false;
    return b;
  }

  /** The ship's set: deck planking, a railing running away from the camera on the right, one barrel. */
  function buildSet() {
    const wood = mat('set-wood', WOOD), dark = mat('set-wood-dark', WOOD_DARK), deck = mat('set-deck', DECK);
    const set = [box('set-deck', { width: 8, height: 0.2, depth: 14 }, [0, -0.1, 5], deck)];
    const [x0, z0] = RAIL.from, [x1, z1] = RAIL.to;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    const mid = (k) => [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k];
    const [mx, mz] = mid(0.5);
    set.push(box('set-rail-top', { width: 0.2, height: 0.14, depth: len }, [mx, RAIL.height, mz], wood, yaw));
    set.push(box('set-rail-low', { width: 0.12, height: 0.1, depth: len }, [mx, RAIL.height * 0.5, mz], dark, yaw));
    const posts = Math.floor(len / RAIL.postEvery);
    for (let i = 0; i <= posts; i++) {
      const [px, pz] = mid(i / posts);
      set.push(box(`set-post-${i}`, { width: 0.22, height: RAIL.height + 0.18, depth: 0.22 }, [px, (RAIL.height + 0.18) / 2, pz], dark, yaw));
    }
    const barrel = BABYLON.MeshBuilder.CreateCylinder('set-barrel', { height: 0.8, diameter: 0.56, tessellation: 24 }, scene);
    barrel.position.set(2.0, 0.4, 2.6);
    barrel.material = wood;
    barrel.isPickable = false;
    set.push(barrel);
    const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
    const gen = sun && sun.getShadowGenerator();
    if (gen) set.forEach((m) => gen.addShadowCaster(m));
    return set;
  }

  /** The painter's light is in the picture: show the texture as painted (unlit), keep the cast shadow. */
  function paintedLight(root) {
    root.getChildMeshes().forEach((m) => {
      if (!m.material || !('unlit' in m.material)) return;
      m.material.unlit = true;
      m.metadata = { ...(m.metadata || {}), painted: true };
    });
  }

  function aimCamera() {
    const cam = mvp.camera;
    cam.setTarget(new BABYLON.Vector3(...CAMERA.target));
    cam.setPosition(new BABYLON.Vector3(...CAMERA.position));
    cam.fov = CAMERA.fov;
    cam.getViewMatrix(true);   // position is only recomputed on render; the plate reads it now
  }

  scene.executeWhenReady(() => {
    const grid = document.getElementById('grid');
    if (grid && grid.checked) grid.click();
    aimCamera();
    const set = buildSet();
    mvp.setPlate(PLATE.url, { horizon: PLATE.horizon });
    mvp.CATALOG.push(TASMAN);
    mvp.addFromCatalog(TASMAN, { x: 0, z: 4, turn: 180 }).then((tasman) => {
      mvp.select(null);
      paintedLight(tasman);
      window.__shot = { tasman, set, camera: mvp.camera, aimCamera, CAMERA };
    }, (e) => console.error('frame-match: could not load Tasman', e));
  });
})();
