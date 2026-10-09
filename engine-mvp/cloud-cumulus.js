// Comic cumulus, lit by the scene's sun. A cloud is lobes made of many small round bumps, drawn back to
// front: for every pixel the FRONTMOST bump that covers it decides the shading (a little sphere, cel-
// banded: warm highlight, pale blue, blue shadow, deep blue) and, near its rim, draws a thin dark-blue ink
// arc. That gives the scalloped comic cloud; with lines at 0 and sun glow up it becomes the painterly,
// sunlit tower. Bumps live in a float data texture (up to 256), not in uniforms (those run out).
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const MAX_BUMPS = 256;

  BABYLON.Effect.ShadersStore.cumulusVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 worldViewProjection;
    varying vec2 vUV;
    void main(void) { vUV = uv; gl_Position = worldViewProjection * vec4(position, 1.0); }`;

  BABYLON.Effect.ShadersStore.cumulusFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform highp sampler2D bumps;     // texel i = (x, y, radius, layer 0 back .. 1 front)
    uniform float count;
    uniform float aspect;
    uniform vec3 light;                // sun direction TOWARDS the sun, in card space (x right, y up, z to camera)
    uniform vec3 tint;                 // time of day
    uniform float lines;               // ink amount (0 = painterly)
    uniform float glow;                // sunlit rim / halo strength
    uniform float seed;
    uniform float baseY;               // flat cumulus base
    uniform vec4 volume;               // x, y, rx, ry: the cloud's overall rounded volume
    uniform float transfer;            // how much each bump takes the volume's normal (Ghibli-tree normal transfer)
    const vec3 HI = vec3(1.0, 0.975, 0.92);
    const vec3 MID = vec3(0.86, 0.91, 0.97);
    const vec3 SH = vec3(0.60, 0.73, 0.90);
    const vec3 DEEP = vec3(0.36, 0.50, 0.76);
    const vec3 INK = vec3(0.16, 0.27, 0.48);
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(void) {
      vec2 p = vec2((vUV.x - 0.5) * aspect, vUV.y - 0.5);
      float sdf = 1e3;
      vec4 front = vec4(0.0); float frontD = 1e3; bool hit = false;
      for (int i = 0; i < ${MAX_BUMPS}; i++) {
        if (float(i) >= count) break;
        vec4 b = texelFetch(bumps, ivec2(i, 0), 0);
        float d = length(p - b.xy) - b.z;
        sdf = min(sdf, d);
        if (d < 0.0) { front = b; frontD = d; hit = true; }   // later = nearer the viewer
      }
      sdf = max(sdf, baseY - p.y);                                         // cumulus sit on a flat base
      if (p.y < baseY) hit = false;
      float px = fwidth(p.x) * 1.2;
      float alpha = 1.0 - smoothstep(-px, px, sdf);
      // sun halo just outside the silhouette on the sun side
      vec2 l2 = normalize(light.xy + vec2(1e-4));
      float halo = glow * 0.35 * exp(-max(sdf, 0.0) * 60.0) * max(0.0, light.z * 0.5 + 0.6) * step(0.0, sdf);
      if (!hit) {
        if (halo < 0.01) discard;
        gl_FragColor = vec4(HI * tint, halo * 0.6);
        return;
      }
      // normal transfer (as in Ghibli trees): each bump's normal is blended with the normal of the cloud's
      // overall volume, so the tower is lit as ONE soft mass (big sunlit side, big shadow side) while the
      // bumps keep their own small crescent and scalloped edge
      vec2 n2 = (p - front.xy) / front.z;
      vec3 nb = normalize(vec3(n2, sqrt(max(0.0, 1.0 - dot(n2, n2))) + 0.15));
      vec2 g2 = clamp((p - volume.xy) / volume.zw, vec2(-1.0), vec2(1.0));
      vec3 ng = normalize(vec3(g2, sqrt(max(0.05, 1.0 - dot(g2, g2) * 0.85))));
      vec3 n = normalize(mix(nb, ng, transfer));
      // artist's light: the sun decides WHICH side is bright (its direction in the picture), never that the
      // whole cloud goes dark because the sun is behind it; backlight is spent on the rim glow below
      vec3 artLight = normalize(vec3(l2 * 0.75, 0.62));
      float ndl = dot(n, artLight) + (hash(front.xy * 91.0 + seed) - 0.5) * 0.08; // no two bumps alike
      // cel ramp over the transferred normal: highlight / pale blue / shadow / deep
      vec3 col = ndl > 0.5 ? HI : ndl > 0.22 ? mix(MID, HI, smoothstep(0.42, 0.5, ndl))
               : ndl > -0.1 ? mix(SH, MID, smoothstep(0.14, 0.22, ndl)) : mix(DEEP, SH, smoothstep(-0.2, -0.1, ndl));
      // each bump still darkens a little along its rim away from the sun: keeps the scalloped read
      float side = dot(n2, l2);
      col = mix(col, col * vec3(0.82, 0.88, 0.97), smoothstep(-0.15, -0.5, side) * smoothstep(0.5, 0.9, length(n2)));
      col = mix(col, mix(SH, DEEP, 0.4), (1.0 - front.w) * 0.45);         // bumps further back sit in shade
      col = mix(mix(DEEP, SH, 0.5), col, 0.55 + 0.45 * smoothstep(-0.5, 0.1, p.y)); // underside in its own shadow
      // sunlit rim: bright edges on the side facing the sun (backlit look of the third reference)
      float back = clamp(0.4 - light.z, 0.0, 1.0);                         // stronger when the sun is behind
      float rim = pow(1.0 - n.z, 3.0) * max(0.0, dot(n2, l2));
      col += glow * (0.25 + 0.5 * back) * rim * vec3(1.0, 0.95, 0.85);
      // comic ink: the visible arc of every bump, a constant thin pen on screen, heavier on the silhouette
      float w = px * 1.3;
      float arc = 1.0 - smoothstep(w * 0.5, w * 1.3, -frontD);
      float outer = 1.0 - smoothstep(w, w * 2.2, -sdf);
      float ink = lines * max(arc * 0.85, outer);
      col = mix(col, INK, clamp(ink, 0.0, 1.0));
      gl_FragColor = vec4(col * tint, alpha);
    }`;

  // ---------- shapes: lobes, each covered by small bumps ----------
  function lobesTower(rand) {
    // a tower: a broad base row, rising middle lobes, a dome on top; higher lobes sit further back
    const lobes = [];
    const lean = (rand() - 0.5) * 0.12;
    const rows = [
      { y: -0.30, n: 5, spread: 0.40, r: [0.10, 0.14], layer: 1.0 },
      { y: -0.13, n: 4, spread: 0.32, r: [0.12, 0.16], layer: 0.8 },
      { y: 0.04, n: 3, spread: 0.24, r: [0.12, 0.16], layer: 0.6 },
      { y: 0.20, n: 2, spread: 0.16, r: [0.11, 0.15], layer: 0.4 },
      { y: 0.33, n: 1, spread: 0.0, r: [0.10, 0.13], layer: 0.25 },
    ];
    rows.forEach((row, ri) => {
      for (let i = 0; i < row.n; i++) {
        const t = row.n === 1 ? 0 : (i / (row.n - 1)) * 2 - 1;
        lobes.push({ x: t * row.spread + lean * ri + (rand() - 0.5) * 0.05, y: row.y + (rand() - 0.5) * 0.04,
          r: row.r[0] + rand() * (row.r[1] - row.r[0]), layer: row.layer });
      }
    });
    return { aspect: 1.0, lobes, baseY: -0.36 };
  }
  function lobesPuff(rand) {
    // a small fair-weather puff: a few lobes on a flat line
    const lobes = [];
    const n = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1;
      const r = 0.16 + rand() * 0.1 - Math.abs(t) * 0.05;
      lobes.push({ x: t * 0.55, y: -0.12 + r * 0.5 + (rand() - 0.5) * 0.04, r, layer: 0.6 + 0.4 * rand() });
    }
    return { aspect: 2.2, lobes, baseY: -0.16 };
  }

  function toBumps(shape, rand) {
    // draw order: back to front. Higher lobes first (behind), lower lobes last (in front).
    const lobes = shape.lobes.slice().sort((a, b) => a.layer - b.layer || b.y - a.y);
    const out = [];
    lobes.forEach((L) => {
      const lobe = [];
      lobe.push([L.x, L.y, L.r * 0.6, L.layer]);                         // small body, mostly hidden
      const inner = 6 + Math.floor(rand() * 3);                           // the inside is bumpy too
      for (let j = 0; j < inner; j++) {
        const a = rand() * Math.PI;                                       // upper half only: nothing dangles below
        const rb = L.r * (0.26 + rand() * 0.16);
        lobe.push([L.x + Math.cos(a) * L.r * 0.35, L.y + Math.sin(a) * L.r * 0.3, rb, L.layer]);
      }
      for (let j = 0; j < 4; j++) {                                       // underside: fills the lobe down to the flat base
        const a = Math.PI * (1.15 + 0.7 * (j + rand() * 0.6) / 4);
        const rb = L.r * (0.3 + rand() * 0.12);
        lobe.push([L.x + Math.cos(a) * L.r * 0.55, L.y + Math.sin(a) * L.r * 0.5, rb, L.layer]);
      }
      const k = 14 + Math.floor(rand() * 7);                              // the scalloped outer edge
      for (let j = 0; j < k; j++) {
        const ang = Math.PI * (-0.1 + 1.2 * (j + rand() * 0.8) / k);     // over the top and down the sides
        const rb = L.r * (0.14 + rand() * 0.2);
        const d = L.r - rb * (0.35 + rand() * 0.45);
        lobe.push([L.x + Math.cos(Math.PI - ang) * d, L.y + Math.sin(ang) * d * 0.95, rb, L.layer]);
      }
      // within a lobe, higher bumps first: lower bumps then overlap them, as in the references
      lobe.slice(1).sort((a, b) => b[1] - a[1]).forEach((b, i) => { lobe[i + 1] = b; });
      out.push(...lobe);
    });
    return out.slice(0, MAX_BUMPS);
  }

  const materials = [];
  let tint = new BABYLON.Color3(1, 1, 1);
  const lineSlider = document.getElementById('cloudLines');
  const glowSlider = document.getElementById('cloudGlow');
  const volumeSlider = document.getElementById('cloudVolume');

  function makeCumulus(kind, widthM, rand, tintNow) {
    tint = tintNow;
    const shape = kind === 'tower' ? lobesTower(rand) : lobesPuff(rand);
    const bumps = toBumps(shape, rand);
    const data = new Float32Array(MAX_BUMPS * 4);
    bumps.forEach((b, i) => data.set(b, i * 4));
    const tex = BABYLON.RawTexture.CreateRGBATexture(data, MAX_BUMPS, 1, scene, false, false,
      BABYLON.Texture.NEAREST_SAMPLINGMODE, BABYLON.Engine.TEXTURETYPE_FLOAT);
    const heightM = widthM / shape.aspect;
    const plane = BABYLON.MeshBuilder.CreatePlane('sky-cloud', { width: widthM, height: heightM }, scene);
    const m = new BABYLON.ShaderMaterial('sky-cloud-cumulus', scene, { vertex: 'cumulus', fragment: 'cumulus' }, {
      attributes: ['position', 'uv'],
      uniforms: ['worldViewProjection', 'count', 'aspect', 'light', 'tint', 'lines', 'glow', 'seed', 'baseY', 'volume', 'transfer'],
      samplers: ['bumps'],
      needAlphaBlending: true,
    });
    m.setTexture('bumps', tex);
    m.setFloat('count', bumps.length);
    m.setFloat('aspect', shape.aspect);
    m.setFloat('seed', rand() * 100);
    m.setFloat('baseY', shape.baseY);
    // the overall volume = bounding ellipse of all bumps (the 'blob' the normals are transferred from)
    let x0 = 1e3, x1 = -1e3, y0 = 1e3, y1 = -1e3;
    bumps.forEach(([x, y, r]) => { x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); });
    y0 = Math.max(y0, shape.baseY);
    m.setVector4('volume', new BABYLON.Vector4((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2));
    m.setColor3('tint', tint);
    m.backFaceCulling = false;
    m.metadata = { plane };
    plane.material = m;
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
    plane.position.y = heightM / 2;
    materials.push(m);
    plane.onDisposeObservable.add(() => { materials.splice(materials.indexOf(m), 1); tex.dispose(); m.dispose(); });
    return plane;
  }

  // every frame: the real sun direction expressed in each card's own frame, plus the line/glow sliders
  const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
  scene.onBeforeRenderObservable.add(() => {
    if (!materials.length) return;
    const toSun = sun ? sun.direction.scale(-1).normalize() : new BABYLON.Vector3(0.4, 1, 0.3).normalize();
    const cam = scene.activeCamera.position;
    const lines = Number(lineSlider.value);
    const glow = Number(glowSlider.value);
    const transfer = Number(volumeSlider.value);
    materials.forEach((m) => {
      const pos = m.metadata.plane.getAbsolutePosition();
      const toCam = cam.subtract(pos); toCam.y = 0; toCam.normalize();          // Y-billboard: card faces the camera horizontally
      const right = BABYLON.Vector3.Cross(BABYLON.Axis.Y, toCam).normalize();
      m.setVector3('light', new BABYLON.Vector3(BABYLON.Vector3.Dot(toSun, right), toSun.y, BABYLON.Vector3.Dot(toSun, toCam)));
      m.setFloat('lines', lines);
      m.setFloat('glow', glow);
      m.setFloat('transfer', transfer);
      m.setColor3('tint', tint);
    });
  });

  window.__cumulus = { makeCumulus, setTint: (t) => { tint = t; } };
})();
