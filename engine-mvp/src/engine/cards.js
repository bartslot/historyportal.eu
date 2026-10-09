// 2D -> 3D: any image (the History Portal icon library, History-line art, or a file dropped from the
// desktop) becomes a flat card that sticks to the surface it is dropped on: flat on a wall, flat on the
// floor, 2 cm proud so it never flickers against it. Like a door, it becomes part of what it sticks to
// (move the house, the painting moves along). Transparent parts are cut out, so line art reads as a
// drawing on the wall. Scale it with the gizmo (R).
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const CARD_WIDTH = 1.4;       // metres, before you scale it
  const MAX_TEX = 1024;         // texture size cap (longest side)
  const OFFSET = 0.02;          // metres in front of the surface: no z-fighting with the wall
  const MINUS_Z = new BABYLON.Vector3(0, 0, -1); // a Babylon plane faces -Z

  // rasterise any image (SVG included, which may have no pixel size of its own) to a canvas
  function loadCanvas(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const w0 = img.naturalWidth || 512, h0 = img.naturalHeight || 512;
        const k = MAX_TEX / Math.max(w0, h0);
        const c = document.createElement('canvas');
        c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c);
      };
      img.onerror = () => reject(new Error('image failed to load: ' + url));
      img.src = url;
    });
  }

  function makeCard(url) {
    const plane = BABYLON.MeshBuilder.CreatePlane('decal', { size: 1 }, scene);
    plane.scaling.set(CARD_WIDTH, CARD_WIDTH, 1);
    const m = new BABYLON.StandardMaterial('decal-mat', scene);
    m.specularColor = BABYLON.Color3.Black();
    m.emissiveColor = new BABYLON.Color3(0.25, 0.25, 0.25);   // stays readable in the shade
    m.backFaceCulling = false;
    m.transparencyMode = BABYLON.Material.MATERIAL_ALPHATESTANDBLEND; // cut-out also in the depth pass
    m.alphaCutOff = 0.1;
    plane.material = m;
    loadCanvas(url).then((c) => {
      const tex = new BABYLON.DynamicTexture('decal-tex', { width: c.width, height: c.height }, scene, true);
      tex.getContext().drawImage(c, 0, 0);
      tex.update();
      tex.hasAlpha = true;
      m.diffuseTexture = tex;
      m.useAlphaFromDiffuseTexture = true;
      plane.scaling.y = CARD_WIDTH * c.height / c.width;           // the picture's own aspect
    }).catch((err) => { console.warn(err.message); mvp.flash('Could not load that image'); });
    return plane;
  }

  // ---------- sticking to surfaces ----------
  const surface = (actor) => (m) => m.isEnabled() && m.isVisible && m.isPickable !== false
    && m.name !== 'hitbox' && !m.name.startsWith('sky') && !m.name.startsWith('backdrop')
    && !(m.metadata && m.metadata.actor === actor) && !m.isDescendantOf(actor);
  mvp.placeHooks.push((actor) => {
    if (!actor.metadata.decal) return false;
    const pick = scene.pick(scene.pointerX, scene.pointerY, surface(actor));
    actor.metadata.onSurface = false;
    if (!pick || !pick.hit) return true;                         // over the sky: nowhere to stick, keep it where it was
    const n = pick.getNormal(true, true);
    if (!n) return true;
    actor.setParent(null);
    actor.position.copyFrom(pick.pickedPoint.add(n.scale(OFFSET)));
    actor.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(MINUS_Z, n.normalize(), new BABYLON.Quaternion());
    const host = pick.pickedMesh.metadata && pick.pickedMesh.metadata.actor;
    if (host && host !== actor) actor.setParent(host);           // part of what it sticks to
    actor.metadata.onSurface = true;
    return true;
  });
  mvp.dropGuards.push((actor) => !actor.metadata.decal || actor.metadata.onSurface);

  // ---------- catalog: the library from History Portal (assets/images/images.json) ----------
  function cardItem(name, url, folder, sub) {
    return {
      name, folder, sub, image: url,
      build: () => [makeCard(url)],
      onCreate: (root) => { root.metadata.decal = true; root.metadata.scenery = true; },
    };
  }
  mvp.cardItem = cardItem;
  fetch('assets/images/images.json').then((r) => r.json()).then((list) => {
    list.forEach((i) => mvp.CATALOG.push(cardItem(i.name, i.url, i.group, i.sub)));
    if (window.__drawer) window.__drawer.render();
  }).catch((err) => console.warn('image library unavailable:', err.message));
})();
