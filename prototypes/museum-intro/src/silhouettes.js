import * as THREE from 'three';

// Visitors in the foreground: flat black cards (ChatGPT image gen, see CREDITS.md) at different depths between
// the camera and the wall, so the truck right gives parallax for free. Each one breathes and sways a little on
// its own phase (ambient layer); they never walk, they are people looking at paintings.

// x, z (depth), height in metres, mirror. Five whole upper bodies (round 2), bottoms just below the frame edge.
const LAYOUT = [
  { img: 'hat', x: -3.9, z: 3.3, h: 0.95 },
  { img: 'old', x: 0.6, z: 3.6, h: 1.25 },
  { img: 'kid', x: 4.4, z: 3.0, h: 0.72, flip: true },
  { img: 'point', x: 7.9, z: 3.2, h: 1.3 }, // points up at the VOC painting
  { img: 'teen', x: 14.6, z: 3.1, h: 1.0, flip: true },
];
const BOTTOM_Y = 0.92;

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
        m.rotation.z = 0.02 * Math.sin(t * 0.6 + p) + 0.012 * Math.sin(t * 1.7 + p * 3); // weight shift, a head tilt
        m.scale.y = 1 + 0.008 * Math.sin(t * 1.4 + p * 2); // breathing
        // a card the camera is about to pass through fades instead of clipping
        const d = camera.position.distanceTo(m.position);
        m.material.opacity = Math.min(1, Math.max(0, (d - 0.6) / 0.6));
        m.visible = m.material.opacity > 0.01;
      }
    },
  };
}
