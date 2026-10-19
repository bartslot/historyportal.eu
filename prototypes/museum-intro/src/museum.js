import * as THREE from 'three';

// The gallery: a plaster wall with a hole where the VOC painting hangs (the painting is a window into its own
// depth, see diorama.js), oak wainscot with a top rail the stick figure walks on, three more framed paintings,
// a plank floor and soft spot pools. Every texture is painted on a canvas here: zero bytes to download.

export const HALL = {
  wallX: [-9, 22],
  wallH: 9, // tall enough that no camera sees over it (the painting world's sky is behind it)
  railY: 1.03, // top of the wainscot rail (stick figure feet)
  railZ: 0.07,
  voc: { x: 12, y: 2.56, w: 4.4, h: (4.4 * 1770) / 3840 },
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

const gilt = new THREE.MeshStandardMaterial({ color: 0xb38d45, metalness: 0.8, roughness: 0.4 });

// a real moulding: a rectangle-with-hole extruded with a wide bevel, so the gold catches the spot lights
export function frame(w, h, depth = 0.1, bar = 0.16) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - bar, -h / 2 - bar);
  s.lineTo(w / 2 + bar, -h / 2 - bar);
  s.lineTo(w / 2 + bar, h / 2 + bar);
  s.lineTo(-w / 2 - bar, h / 2 + bar);
  s.closePath();
  const hole = new THREE.Path();
  const i = 0.02; // the bevel grows inwards: keep the sight edge on the canvas
  hole.moveTo(-w / 2 - i, -h / 2 - i);
  hole.lineTo(-w / 2 - i, h / 2 + i);
  hole.lineTo(w / 2 + i, h / 2 + i);
  hole.lineTo(w / 2 + i, -h / 2 - i);
  hole.closePath();
  s.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(s, { depth: depth * 0.4, bevelEnabled: true, bevelThickness: depth * 0.6, bevelSize: bar * 0.35, bevelSegments: 3, curveSegments: 1 });
  geo.translate(0, 0, depth * 0.6);
  return new THREE.Mesh(geo, gilt);
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
    { tex: textures.milkmaid, x: -3.4, y: 2.45, h: 2.0 },
    { tex: textures.avercamp, x: 1.9, y: 2.4, h: 1.75 },
    { tex: textures.swan, x: 6.9, y: 2.45, h: 1.9 },
  ];
  for (const p of hung) {
    const img = p.tex.image;
    const w = (p.h * img.width) / img.height;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, p.h), new THREE.MeshLambertMaterial({ map: p.tex }));
    m.position.set(p.x, p.y, 0.06);
    const f = frame(w, p.h, 0.1, 0.15);
    f.position.set(p.x, p.y, 0);
    group.add(m, f);
  }
  const vf = frame(HALL.voc.w, HALL.voc.h, 0.14, 0.24);
  vf.position.set(HALL.voc.x, HALL.voc.y, 0);
  group.add(vf);

  // soft museum light: low warm ambient, one spot pool per painting, no shadows
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x3a2a1a, 0.55));
  for (const x of [...hung.map((p) => p.x), HALL.voc.x]) {
    const s = new THREE.SpotLight(0xffe2b8, x === HALL.voc.x ? 34 : 26, 10, x === HALL.voc.x ? 0.62 : 0.5, 0.75, 1.5);
    s.position.set(x, 5.2, 2.6);
    s.target.position.set(x, 2.3, 0);
    scene.add(s, s.target);
  }

  // the VOC painting itself: unlit, so its colours meet the (unlit) world inside it at the crossfade
  const voc = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.voc.w, HALL.voc.h),
    new THREE.MeshBasicMaterial({ map: textures.vroom, color: new THREE.Color(0.93, 0.93, 0.93), transparent: true }),
  );
  voc.position.set(HALL.voc.x, HALL.voc.y, 0.01);
  voc.renderOrder = 2;
  group.add(voc);
  return { group, voc };
}
