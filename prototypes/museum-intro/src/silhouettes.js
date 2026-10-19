import * as THREE from 'three';

// Visitors in the foreground: flat black cards (ChatGPT image gen, see CREDITS.md) at different depths between
// the camera and the wall, so the truck right gives parallax for free. Each one breathes and sways a little on
// its own phase (ambient layer); they never walk, they are people looking at paintings.

// x, z (depth), height in metres, mirror. Bottoms sit below the frame edge.
const LAYOUT = [
  { img: 2, x: -4.6, z: 3.6, h: 1.05 },
  { img: 1, x: -1.4, z: 2.6, h: 1.25 },
  { img: 6, x: 1.6, z: 3.9, h: 1.0, flip: true },
  { img: 3, x: 4.2, z: 3.1, h: 0.95 },
  { img: 7, x: 6.4, z: 2.4, h: 1.3 },
  { img: 5, x: 8.6, z: 3.4, h: 1.15 },
  { img: 4, x: 10.2, z: 2.5, h: 1.5, flip: true },
  { img: 1, x: 14.4, z: 2.9, h: 1.2, flip: true },
];
const BOTTOM_Y = 0.35;

export function buildSilhouettes(scene, textures) {
  const cards = LAYOUT.map((l, i) => {
    const tex = textures[`sil_${l.img}`];
    const w = (l.h * tex.image.width) / tex.image.height;
    const geo = new THREE.PlaneGeometry(w, l.h);
    geo.translate(0, l.h / 2, 0); // pivot at the bottom: sway like a body, not a flag
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.02 }));
    m.position.set(l.x, BOTTOM_Y, l.z);
    if (l.flip) m.scale.x = -1;
    m.renderOrder = 20;
    m.userData = { phase: i * 1.7, base: m.position.clone() };
    scene.add(m);
    return m;
  });

  return {
    cards,
    update(t, camera) {
      for (const m of cards) {
        const p = m.userData.phase;
        m.rotation.z = 0.015 * Math.sin(t * 0.7 + p); // slow weight shift
        m.position.y = m.userData.base.y + 0.006 * Math.sin(t * 1.3 + p * 2); // breathing
        // a card the camera is about to pass through fades instead of clipping
        const d = camera.position.distanceTo(m.position);
        m.material.opacity = Math.min(1, Math.max(0, (d - 0.6) / 0.6));
        m.visible = m.material.opacity > 0.01;
      }
    },
  };
}
