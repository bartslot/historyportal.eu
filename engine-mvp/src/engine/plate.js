// A painted plate behind the 3D scene: one picture (sea, coast, sky) on an unlit card far behind the actors,
// in place of the procedural silhouette rings, with its horizon at the camera's height. The same picture is
// projected on the floor from that camera, so painted ground or sea reaches the actors' feet; the studio floor
// turns shadow-only. Ported from feat/rider-look's rider-test.js (2026-10-09) so every scene can use it.
//   window.__mvp.setPlate(url, { horizon, fit })   horizon = how far UP the picture its horizon line sits (0..1);
//     fit 'cover' (default) fills any view, 'view' = painted for this camera: its height = the view's height;
//     floorY: height of the painted ground/sea (default 0; below a ship's deck: minus the freeboard)
//   ?plate=<url>&horizon=0.65                 the same from the address bar
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const PLATE_DIST = 28, PLATE_W = 42;   // wide enough that the painted ground reaches the bottom of a low camera
  const DEFAULT_HORIZON = 0.55;
  const COVER_ASPECT = 2.5, COVER_MARGIN = 1.1;   // the card fills the view of a stage up to 2.5:1, with 10 % to spare

  /** Card size: at least PLATE_W, and large enough that no edge shows above or beside a level camera. */
  function cardSize(cam, imgAspect, horizon, fit, dist) {
    // 'view': a plate painted FOR this camera (a clean plate of the target panel) fills its view height exactly
    if (fit === 'view') { const h = 2 * dist * Math.tan(cam.fov / 2); return { w: h * imgAspect, h }; }
    const half = dist * Math.tan(cam.fov / 2) * COVER_MARGIN;   // half the view's height at the card
    const h = Math.max(PLATE_W / imgAspect, half / (1 - horizon), (half * COVER_ASPECT) / imgAspect);
    return { w: h * imgAspect, h };
  }
  const FLOOR_PROJ_M = 120;
  const GROUND_BAND_V = 0.18, GROUND_BAND_M = 14;   // bottom 18 % of the plate = bare ground; one mirror tile per 14 m
  const PLATE_NAMES = ['backdrop-plate', 'backdrop-floor'];

  // Matte-painting projection: the floor point's ray from the camera meets the card; that card UV is its colour.
  // Where the ray misses the painting (too near, or to the side) the floor lays the painting's own bottom band,
  // mirrored so it has no seam. Fixed after placement: flat ground with true parallax.
  BABYLON.Effect.ShadersStore.plateFloorVertexShader = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 world, viewProjection;
    varying vec3 vW;
    void main(void) { vec4 w = world * vec4(position, 1.0); vW = w.xyz; gl_Position = viewProjection * w; }`;
  BABYLON.Effect.ShadersStore.plateFloorFragmentShader = `
    precision highp float;
    varying vec3 vW;
    uniform sampler2D plate;
    uniform vec3 camPos, cardPos, cardR, cardU, cardN;
    uniform vec2 cardSize;
    uniform float bandV, bandM;
    float tri(float x) { return abs(mod(x, 2.0) - 1.0); }
    void main(void) {
      vec3 d = vW - camPos;
      float along = dot(d, cardN);
      float t = dot(cardPos - camPos, cardN) / (abs(along) > 1e-4 ? along : 1e-4);
      vec3 rel = camPos + d * t - cardPos;
      vec2 uv = vec2(dot(rel, cardR) / cardSize.x + 0.5, dot(rel, cardU) / cardSize.y + 0.5);
      float inside = step(0.0, t) * smoothstep(0.0, 0.04, uv.y) * smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x);
      vec3 painted = texture2D(plate, clamp(uv, 0.001, 0.999)).rgb;
      vec2 buv = vec2(0.1 + 0.8 * tri(vW.x / bandM), 0.01 + bandV * tri(vW.z / bandM));
      vec3 band = texture2D(plate, buv).rgb;
      gl_FragColor = vec4(mix(band, painted, inside), 1.0);
    }`;

  function projectOnFloor(cam, plate, tex, w, h, floorY) {
    plate.computeWorldMatrix(true);
    const floor = BABYLON.MeshBuilder.CreateGround('backdrop-floor', { width: FLOOR_PROJ_M, height: FLOOR_PROJ_M }, mvp.scene);
    floor.position.y = floorY - 0.005;   // under the shadow-only floor (or lower: the sea below a ship's deck)
    const M = plate.getWorldMatrix();
    const R = BABYLON.Vector3.TransformNormal(BABYLON.Axis.X, M).normalize();
    const U = BABYLON.Vector3.TransformNormal(BABYLON.Axis.Y, M).normalize();
    const m = new BABYLON.ShaderMaterial('backdrop-floor', mvp.scene, 'plateFloor', {
      attributes: ['position'],
      uniforms: ['world', 'viewProjection', 'camPos', 'cardPos', 'cardR', 'cardU', 'cardN', 'cardSize', 'bandV', 'bandM'],
      samplers: ['plate'],
    });
    m.setTexture('plate', tex);
    m.setVector3('camPos', cam.position.clone());
    m.setVector3('cardPos', plate.getAbsolutePosition().clone());
    m.setVector3('cardR', R); m.setVector3('cardU', U); m.setVector3('cardN', BABYLON.Vector3.Cross(R, U).normalize());
    m.setVector2('cardSize', new BABYLON.Vector2(w, h));
    m.setFloat('bandV', GROUND_BAND_V); m.setFloat('bandM', GROUND_BAND_M);
    floor.material = m;
    floor.isPickable = false;
    floor.metadata = { noGBuffer: true };   // out of the ink pass: its edge would draw a line
  }

  // The studio floor becomes shadow-only: invisible, it only darkens the painting where the actors cast shadow.
  function shadowOnlyFloor() {
    const ground = mvp.scene.getMeshByName('ground');
    if (!ground) return;
    const sun = mvp.scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
    const m = new BABYLON.ShadowOnlyMaterial('floor-shadow', mvp.scene);
    m.activeLight = sun;
    m.shadowColor = BABYLON.Color3.FromHexString('#3b2a1c');   // warm umber, like a painted cast shadow
    m.alpha = 0.55;
    ground.material = m;
    ground.metadata = { ...(ground.metadata || {}), noGBuffer: true };
    const grid = document.getElementById('grid');
    if (grid) grid.onchange = null;   // the grid toggle would swap the shadow floor back to a solid one
  }

  function hideRings() {
    ['bd-hills', 'bd-town', 'bd-trees'].forEach((id) => { const el = document.getElementById(id); if (el && el.checked) el.click(); });
    const ring = mvp.scene.getMeshByName('backdrop-ground');
    if (ring) ring.setEnabled(false);
  }

  /** Put a painted plate behind the scene, placed for the camera as it stands now (aim the camera first). */
  function setPlate(url, { horizon = DEFAULT_HORIZON, fit = 'cover', floorY = 0 } = {}) {
    PLATE_NAMES.forEach((n) => { const old = mvp.scene.getMeshByName(n); if (old) old.dispose(false, true); });
    hideRings();
    const cam = mvp.camera;
    cam.getViewMatrix(true);   // position is only recomputed on render; read it now
    const tex = new BABYLON.Texture(url, mvp.scene, false, true, BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
      () => {
        const { width, height } = tex.getSize();
        const view = cam.getTarget().subtract(cam.position); view.y = 0;
        const dist = view.length() + PLATE_DIST;   // the card stands PLATE_DIST beyond the camera's aim point
        view.normalize();
        const { w, h } = cardSize(cam, width / height, horizon, fit, dist);
        const plate = BABYLON.MeshBuilder.CreatePlane('backdrop-plate', { width: w, height: h }, mvp.scene);
        const m = new BABYLON.StandardMaterial('backdrop-plate', mvp.scene);
        m.emissiveTexture = tex; m.disableLighting = true; m.backFaceCulling = false;
        plate.material = m;
        plate.isPickable = false;
        plate.metadata = { noGBuffer: true };
        plate.position = cam.position.add(view.scale(dist));
        plate.position.y = cam.position.y - horizon * h + h / 2;   // the painted horizon at the camera's height
        plate.lookAt(plate.position.add(view));
        projectOnFloor(cam, plate, tex, w, h, floorY);
        shadowOnlyFloor();
      },
      (msg) => console.error('plate: could not load', url, msg));
  }
  mvp.setPlate = setPlate;

  const params = new URLSearchParams(location.search);
  const url = params.get('plate');
  if (url) {
    const horizon = Number(params.get('horizon'));
    // after the first frame, so a saved scene's camera has been restored before the plate is placed for it
    mvp.scene.executeWhenReady(() => setPlate(url, Number.isFinite(horizon) && horizon > 0 && horizon < 1 ? { horizon } : {}));
  }
})();
