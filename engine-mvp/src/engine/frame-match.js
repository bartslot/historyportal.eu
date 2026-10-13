// Frame-match test shot (comic-look Gate 1, 2026-10-13): ?scene=spyglass rebuilds Bart's Figma panel 2321:5151
// (Tasman with the spyglass on deck, the coast ahead) in 3D, to put next to it in the Reference panel.
// Painted plate (sea + coast) behind; a simple deck, railing and barrel; Tasman from one picture via
// Hunyuan3D-Omni with that picture painted back on (render PC). Tuning from the console: window.__shot.
//   ?scene=spyglass[&actor=<glb>][&ship=0]   ship=0: the box deck and rail in place of the Heemskerck model
/* global BABYLON */
'use strict';

(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('scene') !== 'spyglass') return;
  const mvp = window.__mvp;
  const scene = mvp.scene;
  // a clean plate of the panel itself (ChatGPT removed ship and people): same sky, sea, coast and horizon (48 % up)
  const PLATE = { url: 'assets/plates/tasman-spyglass-clean.webp', horizon: 0.48, fit: 'view' };
  const TASMAN = { name: 'Tasman (test)', url: params.get('actor') || 'assets/models/tasman-spyglass.glb', height: 1.8 };
  // measured on the panel (16:9): horizon at 52 % down, Tasman from 21 % (hat) to the bottom edge, centred at 32 %
  // across. With a 40 degree vertical field of view that is an eye 1.1 m above the deck, Tasman 2.85 m away and
  // 0.66 m left of centre (a sailor's low view), tilted up a little so the horizon sits just below the middle.
  const CAMERA = { position: [0, 1.1, 0], target: [0, 1.24, 10], fov: 0.7 };
  const TASMAN_AT = { x: -0.66, z: 2.85 };
  // the Heemskerck: Sketchfab "dutch ship large" by TegnoGenial (CC-BY-4.0), 34 m, via tools/artkit/blender/ship_glb.py.
  // Its main deck is 4.61 m above the keel at midships (measured in the Studio: y=0 from 3 m aft to 3 m forward of
  // midships; the stern deck rises from 6 m aft); bow along the model's +X. Stood with its starboard rail
  // along RAIL, the camera on deck looking out over the side.
  // Measured cross-section at midships: flat deck within 2.4 m of the centre line, the rail at 2.8 m, 0.7 m high.
  // The ship is placed so the CAMERA stands 2.5 m aft of midships, 1.6 m out from the centre line (Tasman then
  // stands just inside the rail, on the flat waist), the bow along the rail direction.
  const SHIP = { url: 'assets/models/heemskerck.glb', deckY: 4.61, cameraAlong: -2.5, cameraSide: 1.6 };
  const useShip = params.get('ship') !== '0';
  const WOOD = '#9a7350', WOOD_DARK = '#6e4f37', DECK = '#c9ae86';
  // the rail enters at the bottom right and runs away behind Tasman; low, as in the panel
  const RAIL = { from: [0.9, 1.1], to: [-1.5, 6.0], height: 0.7, postEvery: 1.1 };

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
    const [x0, z0] = RAIL.from, [x1, z1] = RAIL.to;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    const mid = (k) => [x0 + (x1 - x0) * k, z0 + (z1 - z0) * k];
    const [mx, mz] = mid(0.5);
    // the deck lies on the inboard side of the rail (its right edge IS the rail), so the sea shows beyond it
    const DECK_W = 30, DECK_L = 40, inboard = [-Math.cos(yaw), Math.sin(yaw)];
    const set = []
    if (useShip) loadShip(yaw)
    else set.push(box('set-deck', { width: DECK_W, height: 0.2, depth: DECK_L }, [mx + inboard[0] * DECK_W / 2, -0.1, mz + inboard[1] * DECK_W / 2], deck, yaw))
    if (!useShip) set.push(box('set-rail-top', { width: 0.2, height: 0.14, depth: len }, [mx, RAIL.height, mz], wood, yaw));
    if (!useShip) set.push(box('set-rail-low', { width: 0.12, height: 0.1, depth: len }, [mx, RAIL.height * 0.5, mz], dark, yaw));
    const posts = useShip ? -1 : Math.floor(len / RAIL.postEvery);
    for (let i = 0; i <= posts; i++) {
      const [px, pz] = mid(i / posts);
      set.push(box(`set-post-${i}`, { width: 0.22, height: RAIL.height + 0.18, depth: 0.22 }, [px, (RAIL.height + 0.18) / 2, pz], dark, yaw));
    }
    const barrel = BABYLON.MeshBuilder.CreateCylinder('set-barrel', { height: 0.6, diameter: 0.45, tessellation: 24 }, scene);
    barrel.position.set(-0.15, 0.3, 2.3);
    barrel.material = wood;
    barrel.isPickable = false;
    set.push(barrel);
    const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
    const gen = sun && sun.getShadowGenerator();
    if (gen) set.forEach((m) => gen.addShadowCaster(m));
    return set;
  }

  /** The ship around the camera, bow along the rail direction. */
  async function loadShip(railYaw) {
    try {
      const res = await BABYLON.SceneLoader.ImportMeshAsync('', SHIP.url, '', scene);
      const pivot = new BABYLON.TransformNode('set-ship', scene);
      res.meshes.filter((m) => !m.parent).forEach((m) => { m.parent = pivot; });
      res.meshes.forEach((m) => { m.isPickable = false; m.receiveShadows = true; });
      const ax = [Math.sin(railYaw), Math.cos(railYaw)], side = [ax[1], -ax[0]];   // bow, and toward the rail
      const [cx, , cz] = CAMERA.position;
      pivot.position.set(cx - ax[0] * SHIP.cameraAlong - side[0] * SHIP.cameraSide, -SHIP.deckY,
        cz - ax[1] * SHIP.cameraAlong - side[1] * SHIP.cameraSide);
      pivot.rotation.y = railYaw - Math.PI / 2;   // model +X (bow) along the rail
      window.__shot && (window.__shot.ship = pivot);
      shipPivot = pivot;
    } catch (e) {
      console.error('frame-match: could not load the ship', e);
    }
  }
  let shipPivot = null;

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
    mvp.setPlate(PLATE.url, { horizon: PLATE.horizon, fit: PLATE.fit });
    mvp.CATALOG.push(TASMAN);
    mvp.addFromCatalog(TASMAN, { x: TASMAN_AT.x, z: TASMAN_AT.z, turn: 180 }).then((tasman) => {
      mvp.select(null);
      tasman.position.set(TASMAN_AT.x, 0, TASMAN_AT.z);   // exact, not on the placement grid
      paintedLight(tasman);
      window.__shot = { tasman, set, ship: shipPivot, camera: mvp.camera, aimCamera, CAMERA, TASMAN_AT, RAIL, SHIP };
    }, (e) => console.error('frame-match: could not load Tasman', e));
  });
})();
