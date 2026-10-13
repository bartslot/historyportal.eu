// Frame-match test shot (comic-look Gate 1, 2026-10-13): ?scene=spyglass rebuilds Bart's Figma panel 2321:5151
// (Tasman with the spyglass on deck, the coast ahead) in 3D, to put next to it in the Reference panel.
// Painted plate (sea + coast) behind; a simple deck, railing and barrel; Tasman from one picture via
// Hunyuan3D-Omni with that picture painted back on (render PC). Tuning from the console: window.__shot.
//   ?scene=spyglass[&actor=<glb>][&ship=0][&look=<preset>]   ship=0: the box deck and rail in place of the Heemskerck
//   model; look: a Look preset by name, e.g. 'History Lines pencil' or 'Day', or 'off' (none: the look stays as saved);
//   &hide=tasman renders the set alone, no figures (the frame a painter repaints for the ship's projected paint);
//   &paint=ship lays that repainted frame on the ship, projected from the shot camera (matte painting);
//   &move=dx,dy,dz[,yawDeg] moves the camera AFTER everything is placed and painted (does the paint hold?);
//   &overscan=1 renders the paint frame with PAINT_OVERSCAN wider view (with hide=tasman: the frame to repaint)
/* global BABYLON */
'use strict';

(() => {
  const params = new URLSearchParams(location.search);
  if (params.get('scene') !== 'spyglass') return;
  const mvp = window.__mvp;
  const scene = mvp.scene;
  // a clean plate of the panel itself (ChatGPT removed ship and people, then painted it out 15 % on every side):
  // same sky, sea, coast and horizon, 1.3 x the shot's view so camera moves stay covered
  const PLATE = { url: 'assets/plates/tasman-spyglass-clean-os130.webp', horizon: 1 - 0.5155, fit: 'view', scale: 1.3 };
  // measured on the panel (16:9): horizon at 52 % down, Tasman from 21 % (hat) to the bottom edge, centred at 32 %
  // across. With a 40 degree vertical field of view that is an eye 1.1 m above the deck, Tasman 2.85 m away and
  // 0.66 m left of centre (a sailor's low view), tilted up a little so the horizon sits just below the middle.
  const CAMERA = { position: [0, 1.1, 0], target: [0, 1.24, 10], fov: 0.7 };
  // The cast: each figure is ONE painted cutout made 3D (Hunyuan3D-Omni + tools/artkit/blender/paint_front.py),
  // standing on the deck and turned to face the camera exactly (painted from the front; the sides carry smeared
  // paint). Tasman: measured on the panel above. Visscher: nearer, to his left (panel: the man in the green coat).
  // The sailor: at the rail (2.75 m out from the centre line) behind Tasman's right shoulder, pointing at the coast.
  const CAST = [
    { key: 'tasman', name: 'Tasman (test)', url: params.get('actor') || 'assets/models/tasman-spyglass.glb', height: 1.8, x: -0.66, z: 2.85 },
    { key: 'visscher', name: 'Visscher (test)', url: 'assets/models/visscher.glb', height: 1.75, x: -1.25, z: 2.4 },
    { key: 'sailor', name: 'Sailor pointing (test)', url: 'assets/models/sailor-pointing.glb', height: 1.72, x: -0.33, z: 3.29 },
  ];
  const facing = (x, z) => (Math.atan2(-x, -z) * 180) / Math.PI;   // degrees that turn a figure's front to the camera
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
    if (useShip) shipReady = loadShip(yaw)
    else set.push(box('set-deck', { width: DECK_W, height: 0.2, depth: DECK_L }, [mx + inboard[0] * DECK_W / 2, -0.1, mz + inboard[1] * DECK_W / 2], deck, yaw))
    if (!useShip) set.push(box('set-rail-top', { width: 0.2, height: 0.14, depth: len }, [mx, RAIL.height, mz], wood, yaw));
    if (!useShip) set.push(box('set-rail-low', { width: 0.12, height: 0.1, depth: len }, [mx, RAIL.height * 0.5, mz], dark, yaw));
    const posts = useShip ? -1 : Math.floor(len / RAIL.postEvery);
    for (let i = 0; i <= posts; i++) {
      const [px, pz] = mid(i / posts);
      set.push(box(`set-post-${i}`, { width: 0.22, height: RAIL.height + 0.18, depth: 0.22 }, [px, (RAIL.height + 0.18) / 2, pz], dark, yaw));
    }
    if (useShip) return set;   // the ship brings its own deck and rail; a barrel comes back as a painted prop
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
      if (params.get('paint') === 'ship') { aimCamera(); projectPaint(pivot); }
    } catch (e) {
      console.error('frame-match: could not load the ship', e);
    }
  }
  let shipPivot = null, shipReady = Promise.resolve();

  // Camera-projected paint: every ship surface takes the colour of the repainted frame where the shot camera
  // sees it (ChatGPT repainted our own render, geometry kept). Unlit: light and lines are in the painting.
  // Valid for this camera (and small moves); the frame was rendered at 16:9.
  // overscan: the painted frame covers PAINT_OVERSCAN x the shot's view, so pans and small moves stay painted
  const PAINT_OVERSCAN = 1.3;
  const SHIP_PAINT = { url: 'assets/plates/tasman-spyglass-ship-paint-os.webp', aspect: 16 / 9, overscan: PAINT_OVERSCAN, fallback: '#c9a77c' };
  BABYLON.Effect.ShadersStore.projPaintVertexShader = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 world, viewProjection;
    varying vec3 vW;
    void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;
  BABYLON.Effect.ShadersStore.projPaintFragmentShader = `
    precision highp float;
    varying vec3 vW;
    uniform sampler2D paint;
    uniform mat4 paintView;
    uniform float tanHalf, aspect;
    uniform vec3 fallback;
    void main(void) {
      vec4 v = paintView * vec4(vW, 1.0);   // Babylon view space: +z forward
      vec2 uv = vec2(v.x / (v.z * tanHalf * aspect), v.y / (v.z * tanHalf)) * 0.5 + 0.5;
      float inside = step(0.0, v.z) * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
      gl_FragColor = vec4(mix(fallback, texture2D(paint, clamp(uv, 0.0, 1.0)).rgb, inside), 1.0);
    }`;
  function projectPaint(root) {
    const cam = mvp.camera;
    cam.getViewMatrix(true);
    const m = new BABYLON.ShaderMaterial('ship-paint', scene, 'projPaint', {
      attributes: ['position'], uniforms: ['world', 'viewProjection', 'paintView', 'tanHalf', 'aspect', 'fallback'], samplers: ['paint'],
    });
    m.setTexture('paint', new BABYLON.Texture(SHIP_PAINT.url, scene));
    m.setMatrix('paintView', cam.getViewMatrix().clone());   // frozen: the camera the frame was painted from
    m.setFloat('tanHalf', Math.tan(cam.fov / 2) * SHIP_PAINT.overscan);
    m.setFloat('aspect', SHIP_PAINT.aspect);
    m.setColor3('fallback', BABYLON.Color3.FromHexString(SHIP_PAINT.fallback));
    m.backFaceCulling = false;
    root.getChildMeshes().forEach((mesh) => { if (mesh.material) mesh.material = m; });
  }

  /** The painter's light is in the picture: show the texture as painted (unlit), keep the cast shadow. */
  function paintedLight(root) {
    root.getChildMeshes().forEach((m) => {
      if (!m.material || !('unlit' in m.material)) return;
      m.material.unlit = true;
      m.metadata = { ...(m.metadata || {}), painted: true };
    });
  }

  /** A camera move after placement: offset in metres (x right, y up, z forward) and an optional pan in degrees. */
  function moveCamera(spec) {
    const [dx = 0, dy = 0, dz = 0, yaw = 0] = spec.split(',').map(Number);
    const cam = mvp.camera;
    const pos = new BABYLON.Vector3(...CAMERA.position).add(new BABYLON.Vector3(dx, dy, dz));
    const look = new BABYLON.Vector3(...CAMERA.target).subtract(new BABYLON.Vector3(...CAMERA.position));
    const r = (yaw * Math.PI) / 180;
    const turned = new BABYLON.Vector3(look.x * Math.cos(r) + look.z * Math.sin(r), look.y, -look.x * Math.sin(r) + look.z * Math.cos(r));
    cam.setTarget(pos.add(turned));
    cam.setPosition(pos);
  }

  function aimCamera() {
    const cam = mvp.camera;
    cam.setTarget(new BABYLON.Vector3(...CAMERA.target));
    cam.setPosition(new BABYLON.Vector3(...CAMERA.position));
    cam.fov = CAMERA.fov;
    cam.getViewMatrix(true);
    return cam;   // position is only recomputed on render; the plate reads it now
  }

  /** A Look preset by name, switched on (the line experiments: ink colour, weight, no paint over painted art). */
  function useLook(name) {
    const on = document.getElementById('lookOn'), preset = document.getElementById('lookPreset');
    if (name === 'off') { if (on && on.checked) { on.checked = false; on.onchange(); } return; }
    if (!on || !preset || ![...preset.options].some((o) => o.value === name)) return console.error('frame-match: no look preset', name);
    if (!on.checked) { on.checked = true; on.onchange(); }
    preset.value = name;
    preset.onchange();
  }

  scene.executeWhenReady(() => {
    const grid = document.getElementById('grid');
    if (grid && grid.checked) grid.click();
    if (params.get('look')) useLook(params.get('look'));
    aimCamera();
    const set = buildSet();
    mvp.setPlate(PLATE.url, { horizon: PLATE.horizon, fit: PLATE.fit, scale: PLATE.scale, floorY: useShip ? -SHIP.deckY : 0 });
    const hidden = params.get('hide') === 'tasman';   // the set alone: no figure in the frame to repaint
    const cast = Promise.all(CAST.map(async (c) => {
      try {
        mvp.CATALOG.push(c);
        const root = await mvp.addFromCatalog(c, { x: c.x, z: c.z, turn: facing(c.x, c.z) });
        root.position.set(c.x, 0, c.z);   // exact, not on the placement grid
        paintedLight(root);
        if (hidden) root.setEnabled(false);
        return [c.key, root];
      } catch (e) {
        console.error('frame-match: could not load', c.name, e);
        return [c.key, null];
      }
    }));
    cast.then((loaded) => {
      mvp.select(null);
      // the overscanned paint frame: same eye, wider view (after the plate and the paint were placed for the shot)
      if (params.get('overscan')) shipReady.then(() => { mvp.camera.fov = 2 * Math.atan(Math.tan(CAMERA.fov / 2) * PAINT_OVERSCAN); });
      const figures = Object.fromEntries(loaded);
      window.__shot = { ...figures, tasman: figures.tasman, set, ship: shipPivot, camera: mvp.camera, aimCamera, CAMERA, CAST, RAIL, SHIP };
      shipReady.then(() => { if (params.get('move')) moveCamera(params.get('move')); });
    });
  });
})();
