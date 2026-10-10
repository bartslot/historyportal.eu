// Finding an object on the stage from the object list: a white box drawn around it while its row is
// hovered, and a camera flight to it. The box lives on the utility layer, after the storybook post
// chain, so it stays a clean line over any picture (no glow, no colour).
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const camera = mvp.camera;
  const ui = BABYLON.UtilityLayerRenderer.DefaultUtilityLayer.utilityLayerScene;

  const MARGIN_M = 0.15;       // the box stands a little off the object
  const FRAME_FILL = 2.6;      // camera distance per metre of the object's size
  const MIN_DISTANCE_M = 4;

  // a unit cube's 12 edges, scaled to the object's world bounds
  const C = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]
    .map(([x, y, z]) => new BABYLON.Vector3(x / 2, y / 2, z / 2));
  const EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const box = BABYLON.MeshBuilder.CreateLineSystem('locate-box', { lines: EDGES.map(([a, b]) => [C[a], C[b]]) }, ui);
  box.color = BABYLON.Color3.White();
  box.isPickable = false;
  box.setEnabled(false);

  let shown = null;
  function place(a) {
    const { min, max } = mvp.actorBounds(a);
    box.position.copyFrom(min.add(max).scale(0.5));
    box.scaling.copyFrom(max.subtract(min).add(new BABYLON.Vector3(MARGIN_M, MARGIN_M, MARGIN_M).scale(2)));
  }
  // follows the object while it moves or plays
  mvp.scene.onBeforeRenderObservable.add(() => {
    if (!shown) return;
    if (shown.isDisposed() || !shown.isEnabled()) { box.setEnabled(false); return; }
    box.setEnabled(true);
    place(shown);
  });

  /** Outline this object on the stage (null: none). */
  function highlight(a) { shown = a; if (!a) box.setEnabled(false); }

  /** Fly the camera to an object, keeping the angle the teacher looks from. */
  function frame(a) {
    const { min, max } = mvp.actorBounds(a);
    const size = BABYLON.Vector3.Distance(min, max);
    mvp.shots.goTo({
      alpha: camera.alpha, beta: camera.beta,
      radius: Math.max(MIN_DISTANCE_M, size * FRAME_FILL),
      target: min.add(max).scale(0.5),
    });
  }

  mvp.locate = { highlight, frame, box };
})();
