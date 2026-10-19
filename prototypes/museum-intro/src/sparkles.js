import * as THREE from 'three';

// The magic trail. Deterministic in time so the dev scrubber shows the same sparkles as playback: a particle is
// born every STEP seconds at the figure's position AT ITS BIRTH TIME (source(t)), lives LIFE seconds, drifts up,
// twinkles and fades. Nothing to simulate, nothing to reset when you scrub backwards.

const STEP = 1 / 50;
const LIFE = 0.9;
const MAX = Math.ceil(LIFE / STEP) + 2;

const hash = (n) => {
  const s = Math.sin(n * 91.345 + 47.853) * 43758.5453;
  return s - Math.floor(s);
};

function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  g.fillStyle = '#fff6d8';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 7 : 30;
    const a = (i * Math.PI) / 4;
    g.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
  }
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Sparkles {
  constructor() {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3);
    this.alpha = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: starTexture() }, uScale: { value: 1 } },
      vertexShader: `
        attribute float alpha; attribute float size; varying float vA; uniform float uScale;
        void main() { vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        uniform sampler2D uMap; varying float vA;
        void main() { vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.83, 0.42) * c.rgb, c.a * vA); }`,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 11;
  }

  // source(t) -> { pos: Vector3, rate: 0..1, scale } or null when there is no figure
  update(t, source) {
    const first = Math.floor((t - LIFE) / STEP) + 1;
    let n = 0;
    for (let b = first; b * STEP <= t && n < MAX; b++) {
      const born = b * STEP;
      const src = born >= 0 ? source(born) : null;
      if (!src || hash(b) > src.rate) continue;
      const age = (t - born) / LIFE;
      const s = src.scale;
      this.pos[n * 3] = src.pos.x + (hash(b + 0.1) - 0.5) * 0.5 * s;
      this.pos[n * 3 + 1] = src.pos.y + (0.15 + hash(b + 0.2) * 0.6 + age * 0.5) * s;
      this.pos[n * 3 + 2] = src.pos.z + (hash(b + 0.3) - 0.5) * 0.2 * s;
      const twinkle = 0.6 + 0.4 * Math.sin(t * 25 + b);
      this.alpha[n] = (1 - age) ** 1.5 * twinkle;
      this.size[n] = (0.15 + hash(b + 0.4) * 0.25) * s * (1 - age * 0.5);
      n++;
    }
    this.geo.setDrawRange(0, n);
    for (const a of ['position', 'alpha', 'size']) this.geo.attributes[a].needsUpdate = true;
  }

  resize(heightPx, fovDeg) {
    // a point of world size 1 at distance 1 covers this many pixels
    this.material.uniforms.uScale.value = heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }
}
