import * as THREE from 'three';

// The gallery: a plaster wall with a hole where the VOC painting hangs (the painting is a window into its own
// depth, see diorama.js), oak wainscot with a top rail the stick figure walks on, three more framed paintings,
// a plank floor and soft spot pools. Every texture is painted on a canvas here: zero bytes to download.

export const HALL = {
  wallX: [-9, 22],
  wallH: 4.6,
  railY: 1.03, // top of the wainscot rail (stick figure feet)
  railZ: 0.07,
  voc: { x: 12, y: 2.42, w: 4.4, h: (4.4 * 1770) / 3840 },
};

function canvasTexture(w, h, paint, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.anisotropy = 8;
  return tex;
}

const rand = (() => {
  let s = 7;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
})();

function grain(g, x, y, w, h, base, n) {
  g.fillStyle = base;
  g.fillRect(x, y, w, h);
  for (let i = 0; i < n; i++) {
    const yy = y + rand() * h;
    g.strokeStyle = `rgba(${40 + rand() * 30},${25 + rand() * 15},10,${0.05 + rand() * 0.12})`;
    g.lineWidth = 0.5 + rand() * 1.6;
    g.beginPath();
    g.moveTo(x, yy);
    for (let xx = x; xx <= x + w; xx += 24) g.lineTo(xx, yy + Math.sin(xx * 0.01 + i) * 2.5);
    g.stroke();
  }
}

// 1024 px = 2 m of wainscot: two raised panels per repeat
function paintWainscot(g, w, h) {
  grain(g, 0, 0, w, h, '#7a5634', 260);
  const pad = 46;
  for (let p = 0; p < 2; p++) {
    const x0 = p * (w / 2) + pad;
    const pw = w / 2 - 2 * pad;
    const y0 = 70;
    const ph = h - 140;
    grain(g, x0, y0, pw, ph, '#6a4a2c', 90);
    g.strokeStyle = 'rgba(255,225,180,0.22)'; // lit bevel (top/left)
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(x0, y0 + ph);
    g.lineTo(x0, y0);
    g.lineTo(x0 + pw, y0);
    g.stroke();
    g.strokeStyle = 'rgba(20,10,0,0.35)'; // bevel in shade (bottom/right)
    g.beginPath();
    g.moveTo(x0 + pw, y0);
    g.lineTo(x0 + pw, y0 + ph);
    g.lineTo(x0, y0 + ph);
    g.stroke();
  }
}

function paintPlaster(g, w, h) {
  g.fillStyle = '#8e8a80';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${rand() > 0.5 ? 255 : 0},${rand() > 0.5 ? 250 : 0},240,${rand() * 0.035})`;
    g.fillRect(rand() * w, rand() * h, 2 + rand() * 9, 2 + rand() * 9);
  }
}

function paintFloor(g, w, h) {
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    let x = -rand() * 300;
    while (x < w) {
      const len = 260 + rand() * 300;
      const tone = 70 + rand() * 25;
      grain(g, x, (r * h) / rows, len, h / rows, `rgb(${tone + 40},${tone + 15},${tone - 15})`, 10);
      g.fillStyle = 'rgba(15,8,0,0.5)';
      g.fillRect(x, (r * h) / rows, 3, h / rows);
      x += len;
    }
    g.fillRect(0, (r * h) / rows, w, 2);
  }
}

const gilt = new THREE.MeshStandardMaterial({ color: 0xb8913f, metalness: 0.55, roughness: 0.55 });

export function frame(w, h, depth = 0.1, bar = 0.16) {
  const g = new THREE.Group();
  const parts = [
    [w + 2 * bar, bar, 0, h / 2 + bar / 2],
    [w + 2 * bar, bar, 0, -h / 2 - bar / 2],
    [bar, h, -w / 2 - bar / 2, 0],
    [bar, h, w / 2 + bar / 2, 0],
  ];
  for (const [bw, bh, x, y] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, depth), gilt);
    m.position.set(x, y, depth / 2);
    g.add(m);
  }
  return g;
}

function wallWithHole() {
  const [x0, x1] = HALL.wallX;
  const v = HALL.voc;
  const s = new THREE.Shape();
  s.moveTo(x0, 0);
  s.lineTo(x1, 0);
  s.lineTo(x1, HALL.wallH);
  s.lineTo(x0, HALL.wallH);
  s.closePath();
  const hole = new THREE.Path();
  hole.moveTo(v.x - v.w / 2, v.y - v.h / 2);
  hole.lineTo(v.x - v.w / 2, v.y + v.h / 2);
  hole.lineTo(v.x + v.w / 2, v.y + v.h / 2);
  hole.lineTo(v.x + v.w / 2, v.y - v.h / 2);
  hole.closePath();
  s.holes.push(hole);
  const tex = canvasTexture(512, 512, paintPlaster, [0.5, 0.5]); // ShapeGeometry uv = world metres
  return new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshLambertMaterial({ map: tex }));
}

export function buildMuseum(scene, textures) {
  const group = new THREE.Group();
  scene.add(group);
  const [x0, x1] = HALL.wallX;
  const len = x1 - x0;
  group.add(wallWithHole());

  const wains = new THREE.Mesh(
    new THREE.PlaneGeometry(len, HALL.railY - 0.03),
    new THREE.MeshLambertMaterial({ map: canvasTexture(1024, 512, paintWainscot, [len / 2, 1]) }),
  );
  wains.position.set(x0 + len / 2, (HALL.railY - 0.03) / 2, 0.025);
  group.add(wains);

  const railMat = new THREE.MeshLambertMaterial({ map: canvasTexture(512, 64, (g, w, h) => grain(g, 0, 0, w, h, '#83603b', 40), [len / 2, 1]) });
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.06, 0.12), railMat);
  rail.position.set(x0 + len / 2, HALL.railY - 0.03, 0.06);
  group.add(rail);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(len, 14),
    new THREE.MeshLambertMaterial({ map: canvasTexture(1024, 1024, paintFloor, [len / 4, 14 / 4]) }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x0 + len / 2, 0, 7);
  group.add(floor);

  // the other paintings (public domain, Rijksmuseum; see CREDITS.md)
  const hung = [
    { tex: textures.milkmaid, x: -3.2, y: 2.3, h: 1.4 },
    { tex: textures.avercamp, x: 2.2, y: 2.3, h: 1.35 },
    { tex: textures.swan, x: 6.9, y: 2.3, h: 1.45 },
  ];
  for (const p of hung) {
    const img = p.tex.image;
    const w = (p.h * img.width) / img.height;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, p.h), new THREE.MeshLambertMaterial({ map: p.tex }));
    m.position.set(p.x, p.y, 0.06);
    const f = frame(w, p.h, 0.09, 0.12);
    f.position.set(p.x, p.y, 0);
    group.add(m, f);
  }
  const vf = frame(HALL.voc.w, HALL.voc.h, 0.12, 0.2);
  vf.position.set(HALL.voc.x, HALL.voc.y, 0);
  group.add(vf);

  // soft museum light: low warm ambient, one spot pool per painting, no shadows
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x3a2a1a, 0.9));
  for (const x of [...hung.map((p) => p.x), HALL.voc.x]) {
    const s = new THREE.SpotLight(0xffe6c0, x === HALL.voc.x ? 20 : 18, 9, 0.62, 0.9, 1.6);
    s.position.set(x, 4.4, 2.8);
    s.target.position.set(x, 1.9, 0);
    scene.add(s, s.target);
  }
  return group;
}
