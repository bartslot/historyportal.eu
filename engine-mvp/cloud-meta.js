// Procedural watercolour clouds from 2D metaballs. A cloud is a handful of circles; their summed field
// gives the scalloped outline, the dominant circle per pixel gives the billow shading, and where two
// circles meet on the upper side a thin grey arc is drawn: the hand-drawn contour inside a painted cloud.
// Two families: puffy (flat base, stepped billows, a tower) and thin (tapering horizontal strands).
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const MAX_BALLS = 28;

  BABYLON.Effect.ShadersStore.metaCloudVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;

  BABYLON.Effect.ShadersStore.metaCloudFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform vec4 balls[${MAX_BALLS}];  // x, y, radius (cloud units: y -0.5..0.5, x scaled by aspect), unused
    uniform float count;
    uniform float aspect;
    uniform float baseY;               // flat underside (puffy); -1 = none
    uniform float seed;
    uniform vec3 tint;
    uniform float opacity;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
    }
    float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.1; a *= 0.5; } return s; }
    void main(void) {
      vec2 p = vec2((vUV.x - 0.5) * aspect, vUV.y - 0.5);
      // ragged, painted edge: wobble the sample point a little before evaluating the field
      vec2 q = p + (vec2(fbm(p * 7.0 + seed), fbm(p * 7.0 + seed + 9.1)) - 0.5) * 0.035;
      float field = 0.0, best = 0.0, second = 0.0;
      vec2 bestC = vec2(0.0); float bestR = 1.0;
      for (int i = 0; i < ${MAX_BALLS}; i++) {
        if (float(i) >= count) break;
        vec4 b = balls[i];
        vec2 d = q - b.xy;
        float c = b.z * b.z / (dot(d, d) + 1e-4);
        field += c;
        if (c > best) { second = best; best = c; bestC = b.xy; bestR = b.z; } else if (c > second) { second = c; }
      }
      if (baseY > -0.9) field *= smoothstep(baseY - 0.015, baseY + 0.03, q.y);   // flat, slightly soft underside
      float body = smoothstep(0.92, 1.12, field);
      if (body <= 0.001) discard;

      // billow shading: the dominant ball acts as a sphere lit from the upper left
      vec2 n2 = (q - bestC) / bestR;
      float nz = sqrt(max(0.0, 1.0 - dot(n2, n2)));
      vec3 n = normalize(vec3(n2, nz + 0.25));
      float lit = clamp(dot(n, normalize(vec3(-0.35, 0.7, 0.6))), 0.0, 1.0);
      float shade = 0.72 + 0.28 * lit;
      shade *= mix(0.86, 1.0, smoothstep(-0.45, 0.25, q.y));                        // heavier towards the base

      // painted contours: where two billows meet (on the upper side of the front one) and along the rim
      float meet = 1.0 - smoothstep(0.0, 0.18, (best - second) / (best + second));
      float upper = smoothstep(-0.2, 0.4, n2.y);
      float rim = 1.0 - smoothstep(1.0, 1.35, field);
      float line = max(meet * upper * step(1.1, field), rim * 0.8);
      line *= 0.55 + 0.45 * fbm(p * 30.0 + seed);                                  // a pen line, not a vector stroke

      // pigment granulation and an uneven wash
      shade *= 0.93 + 0.12 * fbm(p * 18.0 + seed * 1.7);
      vec3 col = tint * shade;
      col = mix(col, tint * 0.55, line * 0.6);
      float alpha = body * opacity * (0.82 + 0.18 * fbm(p * 5.0 + seed));          // thinner and thicker wash
      gl_FragColor = vec4(col, alpha);
    }`;

  // ---------- shapes ----------
  // puffy: a flat base row, bigger stepped billows above it, one side rising into a tower
  function puffy(rand) {
    const aspect = 1.5 + rand() * 0.5;
    const half = aspect / 2 - 0.12;
    const base = -0.32;
    const balls = [];
    const towerX = (rand() < 0.5 ? -1 : 1) * half * (0.25 + rand() * 0.35);
    const nBase = 6 + Math.floor(rand() * 3);
    for (let i = 0; i < nBase; i++) {
      const x = -half + (2 * half) * (i + 0.5) / nBase + (rand() - 0.5) * 0.06;
      const r = 0.09 + rand() * 0.05;
      balls.push([x, base + r * 0.7, r]);
    }
    const nMid = 4 + Math.floor(rand() * 2);
    for (let i = 0; i < nMid; i++) {
      const x = -half * 0.75 + (1.5 * half) * (i + 0.5) / nMid + (rand() - 0.5) * 0.08;
      const r = 0.12 + rand() * 0.06 + 0.06 * Math.max(0, 1 - Math.abs(x - towerX) / half);
      balls.push([x, base + 0.2 + r * 0.5, r]);
    }
    const nTower = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < nTower; i++) {
      const r = 0.11 + rand() * 0.05 - i * 0.012;
      balls.push([towerX + (rand() - 0.5) * 0.12, base + 0.38 + i * 0.13, r]);
    }
    return { aspect, baseY: base, balls };
  }
  // thin: 2-3 long horizontal strands, a low hump, tails tapering to points
  function thin(rand) {
    const aspect = 3.2 + rand() * 1.2;
    const half = aspect / 2 - 0.08;
    const balls = [];
    const strands = 2 + Math.floor(rand() * 2);
    const hump = (rand() - 0.5) * half;
    for (let s = 0; s < strands; s++) {
      const y = -0.12 + s * 0.11 + (rand() - 0.5) * 0.04;
      const from = -half * (0.6 + rand() * 0.4);
      const to = half * (0.6 + rand() * 0.4);
      const n = 6 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const x = from + (to - from) * (i + 0.5) / n;
        const taper = Math.max(0.25, 1 - Math.abs(x - hump) / half);
        balls.push([x, y + (rand() - 0.5) * 0.03, (0.045 + rand() * 0.025) * taper * (s === 0 ? 1.25 : 1)]);
      }
    }
    return { aspect, baseY: -1, balls: balls.slice(0, MAX_BALLS) };
  }

  const materials = [];
  function makeMetaCloud(kind, widthM, rand, tint) {
    const shape = kind === 'puffy' ? puffy(rand) : thin(rand);
    const heightM = widthM / shape.aspect;
    const plane = BABYLON.MeshBuilder.CreatePlane('sky-cloud', { width: widthM, height: heightM }, scene);
    const m = new BABYLON.ShaderMaterial('sky-cloud-meta', scene, { vertex: 'metaCloud', fragment: 'metaCloud' }, {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'balls', 'count', 'aspect', 'baseY', 'seed', 'tint', 'opacity'],
      needAlphaBlending: true,
    });
    const flat = [];
    shape.balls.forEach(([x, y, r]) => flat.push(x, y, r, 0));
    while (flat.length < MAX_BALLS * 4) flat.push(0, 0, 0, 0);
    m.setArray4('balls', flat);
    m.setFloat('count', shape.balls.length);
    m.setFloat('aspect', shape.aspect);
    m.setFloat('baseY', shape.baseY);
    m.setFloat('seed', rand() * 100);
    m.setFloat('opacity', kind === 'puffy' ? 0.95 : 0.8);
    m.setColor3('tint', tint);
    m.backFaceCulling = false;
    plane.material = m;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    plane.position.y = heightM / 2;
    materials.push(m);
    plane.onDisposeObservable.add(() => { materials.splice(materials.indexOf(m), 1); m.dispose(); });
    return plane;
  }
  function setTint(t) { materials.forEach((m) => m.setColor3('tint', t)); }

  window.__metaClouds = { makeMetaCloud, setTint };
})();
