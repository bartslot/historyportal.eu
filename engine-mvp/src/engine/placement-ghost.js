// Sims build mode's footprint: while something is being placed, dragged, dragged in from the drawer or
// pushed by a handle, the cells it will stand on are outlined on the grid. Where it fits, a white
// outline; where it does not, the cells are hatched too. No colour: the hatch carries the meaning, so
// it reads for a colour-blind teacher and over any sky. Drawn on the utility layer, after the
// storybook post chain, so the lines stay clean.
/* global BABYLON */
'use strict';
import { CELL_M } from '../placement/contract';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const ui = BABYLON.UtilityLayerRenderer.DefaultUtilityLayer.utilityLayerScene;

  const LIFT_M = 0.02;          // above the floor, below anything standing on it
  const HATCH_PX = 64;          // texture size; one tile per cell
  const HATCH_LINES = 3;        // diagonals per cell
  const HATCH_ALPHA = 0.55;

  // one unit square outline, scaled to the footprint
  const outline = BABYLON.MeshBuilder.CreateLines('footprint-outline', {
    points: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5]].map(([x, z]) => new BABYLON.Vector3(x, 0, z)),
  }, ui);
  outline.color = BABYLON.Color3.White();
  outline.isPickable = false;

  // the hatch: diagonal white lines on transparent, tiled once per cell
  const tex = new BABYLON.DynamicTexture('footprint-hatch', { width: HATCH_PX, height: HATCH_PX }, ui, false);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, HATCH_PX, HATCH_PX);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  for (let i = -HATCH_LINES; i <= HATCH_LINES; i++) {
    const o = (i * HATCH_PX) / HATCH_LINES;
    ctx.beginPath(); ctx.moveTo(o, HATCH_PX); ctx.lineTo(o + HATCH_PX, 0); ctx.stroke();
  }
  tex.hasAlpha = true;
  tex.update();
  tex.wrapU = tex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const hatchMat = new BABYLON.StandardMaterial('footprint-hatch-mat', ui);
  hatchMat.disableLighting = true;
  hatchMat.emissiveColor = BABYLON.Color3.White();
  hatchMat.diffuseTexture = tex;
  hatchMat.useAlphaFromDiffuseTexture = true;
  hatchMat.alpha = HATCH_ALPHA;
  hatchMat.backFaceCulling = false;
  const hatch = BABYLON.MeshBuilder.CreateGround('footprint-hatch', { width: 1, height: 1 }, ui);
  hatch.material = hatchMat;
  hatch.isPickable = false;

  const hide = () => { outline.setEnabled(false); hatch.setEnabled(false); };
  hide();

  const moving = () => mvp.getMoving() || mvp.getDragIn?.() || mvp.gizmos?.getBusy?.() || null;

  scene.onBeforeRenderObservable.add(() => {
    const a = moving();
    const fp = a && !a.isDisposed() && mvp.footprintNow(a);
    if (!fp) { hide(); return; }
    const [w, d] = fp;
    const x = a.position.x;
    const z = a.position.z;
    outline.setEnabled(true);
    outline.position.set(x, LIFT_M, z);
    outline.scaling.set(w * CELL_M, 1, d * CELL_M);
    const fits = mvp.fits(a);
    hatch.setEnabled(!fits);
    if (!fits) {
      hatch.position.set(x, LIFT_M, z);
      hatch.scaling.set(w * CELL_M, 1, d * CELL_M);
      tex.uScale = w;
      tex.vScale = d;
    }
  });

  mvp.placementGhost = { outline, hatch };
})();
