// Volumetric Ghibli cumulus (after Lightning Boy Studio's "Ghibli Clouds in 3D" approach: a lumpy 3D
// volume lit by the sun, mapped through a stylised colour ramp). Real-time version:
//   1 the cloud is a 3D field of lobes and bumps with cauliflower detail, baked once into a 64^3 texture
//   2 a box in the scene ray-marches that texture; at every step a short march TOWARDS the sun measures
//     how much cloud is in the way, so lumps really shade each other (bright caps, blue undersides)
//   3 forward scattering lights the edges when the sun is behind (silver lining); sky light from above
//      makes the shade sky-blue and the base navy; the light is mapped through a soft banded ramp
// It is real 3D: parallax, any angle, draggable like every cloud.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const N = 64;           // texture resolution per axis
  const STEPS = 64;       // view-ray samples
  let dayness = 1;

  BABYLON.Effect.ShadersStore.cloudVolVertexShader = `
    precision highp float;
    attribute vec3 position;
    uniform mat4 world;
    uniform mat4 viewProjection;
    varying vec3 vLocal;
    void main(void) { vLocal = position; gl_Position = viewProjection * world * vec4(position, 1.0); }`;

  BABYLON.Effect.ShadersStore.cloudVolFragmentShader = `
    precision highp float;
    precision highp sampler3D;
    varying vec3 vLocal;
    uniform sampler3D density;
    uniform vec3 camLocal;     // camera in the box's own space (box = -0.5..0.5)
    uniform vec3 sunLocal;     // direction towards the sun, box space, normalised
    uniform vec3 boxSize;      // metres, to keep light marching isotropic
    uniform vec3 skyCol;       // shade picks up the sky
    uniform vec3 deepCol;      // the dark base
    uniform vec3 litCol;       // sunlit white
    uniform vec3 warmCol;      // the brightest, warm caps and silver lining
    uniform float densityK;
    uniform float bands;       // 0 smooth .. 1 strongly banded (painterly cel)
    uniform float sunPower;
    float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    float dens(vec3 p) { return texture(density, p + 0.5).r; }
    float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * c, 1.5) / 12.566; }
    vec3 ramp(float L) {
      // stylised: navy base -> sky-blue shade -> white -> warm highlight, with soft bands
      float q = L * 4.0;
      float banded = (floor(q) + smoothstep(0.3, 0.7, fract(q))) / 4.0;
      L = mix(L, banded, bands);
      vec3 c = mix(deepCol, skyCol, smoothstep(0.0, 0.3, L));
      c = mix(c, litCol, smoothstep(0.3, 0.7, L));
      return mix(c, warmCol, smoothstep(0.75, 1.0, L));
    }
    void main(void) {
      vec3 rd = normalize(vLocal - camLocal);
      vec3 ro = camLocal;
      vec3 inv = 1.0 / rd;
      vec3 t0 = (vec3(-0.5) - ro) * inv, t1 = (vec3(0.5) - ro) * inv;
      vec3 tmin = min(t0, t1), tmax = max(t0, t1);
      float tn = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
      float tf = min(min(tmax.x, tmax.y), tmax.z);
      if (tf <= tn) discard;
      float dt = (tf - tn) / float(${STEPS});
      float t = tn + dt * hash(vLocal * 91.7);                 // jitter: no stepping bands
      // light step in box space, scaled so a step is the same length in metres along every axis
      vec3 lstep = sunLocal * 0.045;
      float stepM = length(rd * dt * boxSize);
      float cosT = dot(normalize(rd * boxSize), normalize(sunLocal * boxSize));
      float phase = 0.6 + 4.0 * hg(cosT, 0.55);                // forward scattering: glow when looking at the sun
      float T = 1.0;
      vec3 acc = vec3(0.0);
      for (int i = 0; i < ${STEPS}; i++) {
        vec3 p = ro + rd * t;
        float d = dens(p);
        if (d > 0.01) {
          float od = 0.0;                                       // cloud between here and the sun
          for (int j = 1; j <= 6; j++) od += dens(p + lstep * float(j));
          float sun = exp(-od * 1.6) * sunPower;
          float sky = 0.35 + 0.45 * (p.y + 0.5);                // more sky light higher up
          float L = clamp(sun * phase * 0.55 + sky * 0.45 - 0.1, 0.0, 1.0);
          float a = 1.0 - exp(-d * densityK * stepM);
          acc += T * a * ramp(L);
          T *= 1.0 - a;
          if (T < 0.02) break;
        }
        t += dt;
      }
      float alpha = 1.0 - T;
      if (alpha < 0.01) discard;
      gl_FragColor = vec4(acc / alpha, alpha);
    }`;

  // ---------- shape: 3D lobes with bumps, rasterised to a 64^3 density texture ----------
  function valueNoise3(seedOff) {
    const h = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seedOff) * 43758.5453; return s - Math.floor(s); };
    const f = (t) => t * t * (3 - 2 * t);
    return (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const u = f(x - xi), v = f(y - yi), w = f(z - zi);
      const l = (a, b, k) => a + (b - a) * k;
      return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
               l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
    };
  }

  // spheres in metres inside a box (w, h, d), origin at the box centre
  function towerSpheres(rand, w, h, d) {
    const s = [];
    const base = -h / 2 + h * 0.08;
    // a broad, dark base deck, then lobes narrowing upwards into a dome, leaning a little
    const rows = 6;
    const lean = (rand() - 0.5) * w * 0.15;
    for (let r = 0; r < rows; r++) {
      const k = r / (rows - 1);
      const y = base + k * h * 0.72;
      const halfW = (w / 2) * (0.95 - 0.6 * k);
      const n = Math.max(1, Math.round(7 - 5 * k));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        const rad = (w * 0.13) * (1.0 - 0.25 * k) * (0.8 + rand() * 0.4);
        s.push([t * halfW * 0.75 + lean * k + (rand() - 0.5) * w * 0.05, y + rad * 0.3,
          (rand() - 0.5) * d * 0.35, rad]);
      }
    }
    return s;
  }
  function puffSpheres(rand, w, h, d) {
    const s = [];
    const n = 4 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * 2 - 1;
      const rad = h * (0.35 + rand() * 0.2) * (1 - Math.abs(t) * 0.3);
      s.push([t * w * 0.32, -h / 2 + h * 0.12 + rad * 0.5, (rand() - 0.5) * d * 0.3, rad]);
    }
    return s;
  }
  // every lobe sprouts bumps over its upper surface: the cauliflower
  function addBumps(lobes, rand) {
    const out = [...lobes];
    lobes.forEach(([x, y, z, r]) => {
      const k = 10 + Math.floor(rand() * 6);
      for (let i = 0; i < k; i++) {
        const th = rand() * Math.PI * 2;
        const ph = Math.acos(1 - rand() * 1.3);        // mostly upper hemisphere
        const dir = [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)];
        const rb = r * (0.3 + rand() * 0.25);
        const dd = r - rb * 0.45;
        out.push([x + dir[0] * dd, y + dir[1] * dd, z + dir[2] * dd, rb]);
      }
    });
    return out;
  }

  function bake(spheres, w, h, d, rand) {
    const data = new Uint8Array(N * N * N);
    const noise = valueNoise3(rand() * 100);
    const soft = Math.max(w, h) * 0.02;                  // edge softness in metres
    const detail = Math.max(w, h) * 0.06;                // cauliflower size
    const baseY = -h / 2 + h * 0.06;
    let idx = 0;
    for (let k = 0; k < N; k++) {
      const z = ((k + 0.5) / N - 0.5) * d;
      for (let j = 0; j < N; j++) {
        const y = ((j + 0.5) / N - 0.5) * h;
        for (let i = 0; i < N; i++, idx++) {
          const x = ((i + 0.5) / N - 0.5) * w;
          let sdf = 1e9;
          for (let s = 0; s < spheres.length; s++) {
            const sp = spheres[s];
            const dx = x - sp[0], dy = y - sp[1], dz = z - sp[2];
            const v = Math.sqrt(dx * dx + dy * dy + dz * dz) - sp[3];
            if (v < sdf) sdf = v;
          }
          if (sdf > soft * 3) continue;
          sdf += (noise(x / detail, y / detail, z / detail) - 0.5) * soft * 2.2; // lumpy surface
          let dens = Math.min(1, Math.max(0, -sdf / soft));
          if (y < baseY) dens *= Math.max(0, 1 - (baseY - y) / soft);          // flat-ish base
          data[k * N * N + j * N + i] = Math.round(dens * 255);
        }
      }
    }
    return data;
  }

  const materials = [];
  const SKY = { day: [0.48, 0.66, 0.90], night: [0.20, 0.29, 0.45] };
  const DEEP = { day: [0.20, 0.30, 0.52], night: [0.07, 0.10, 0.18] };
  const LIT = { day: [0.97, 0.97, 0.98], night: [0.62, 0.68, 0.80] };
  const WARM = { day: [1.0, 0.93, 0.80], night: [0.80, 0.84, 0.95] };
  const mixC = (a, b, t) => new BABYLON.Color3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  function colours(m) {
    m.setColor3('skyCol', mixC(SKY.night, SKY.day, dayness));
    m.setColor3('deepCol', mixC(DEEP.night, DEEP.day, dayness));
    m.setColor3('litCol', mixC(LIT.night, LIT.day, dayness));
    m.setColor3('warmCol', mixC(WARM.night, WARM.day, dayness));
  }

  function makeVolumeCloud(kind, widthM, rand) {
    const w = kind === 'tower' ? widthM : widthM;
    const h = kind === 'tower' ? widthM * 1.25 : widthM * 0.45;
    const d = widthM * 0.75;
    const lobes = kind === 'tower' ? towerSpheres(rand, w, h, d) : puffSpheres(rand, w, h, d);
    const data = bake(addBumps(lobes, rand), w, h, d, rand);
    const tex = new BABYLON.RawTexture3D(data, N, N, N, BABYLON.Engine.TEXTUREFORMAT_R, scene, false, false,
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE, BABYLON.Engine.TEXTURETYPE_UNSIGNED_BYTE);
    tex.wrapU = tex.wrapV = tex.wrapR = BABYLON.Texture.CLAMP_ADDRESSMODE;
    const box = BABYLON.MeshBuilder.CreateBox('sky-cloud', { size: 1 }, scene);
    box.scaling.set(w, h, d);
    box.position.y = h / 2;
    const m = new BABYLON.ShaderMaterial('sky-cloud-volume', scene, { vertex: 'cloudVol', fragment: 'cloudVol' }, {
      attributes: ['position'],
      uniforms: ['world', 'viewProjection', 'camLocal', 'sunLocal', 'boxSize', 'skyCol', 'deepCol', 'litCol', 'warmCol', 'densityK', 'bands', 'sunPower'],
      samplers: ['density'],
      needAlphaBlending: true,
    });
    m.setTexture('density', tex);
    m.setVector3('boxSize', new BABYLON.Vector3(w, h, d));
    m.setFloat('densityK', 0.08);
    m.backFaceCulling = true;
    m.metadata = { box };
    colours(m);
    box.material = m;
    materials.push(m);
    box.onDisposeObservable.add(() => { materials.splice(materials.indexOf(m), 1); tex.dispose(); m.dispose(); });
    return box;
  }

  const sun = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
  const bandsSlider = document.getElementById('cloudBands');
  const glowSlider = document.getElementById('cloudGlow');
  scene.onBeforeRenderObservable.add(() => {
    if (!materials.length) return;
    const toSun = sun ? sun.direction.scale(-1).normalize() : new BABYLON.Vector3(0.4, 1, 0.3).normalize();
    const cam = scene.activeCamera.position;
    materials.forEach((m) => {
      const box = m.metadata.box;
      const inv = BABYLON.Matrix.Invert(box.computeWorldMatrix(true));
      m.setVector3('camLocal', BABYLON.Vector3.TransformCoordinates(cam, inv));
      m.setVector3('sunLocal', BABYLON.Vector3.TransformNormal(toSun, inv).normalize());
      m.setFloat('bands', Number(bandsSlider.value));
      m.setFloat('sunPower', 0.8 + 0.6 * Number(glowSlider.value));
    });
  });

  window.__volumeClouds = { makeVolumeCloud, setDayness: (t) => { dayness = t; materials.forEach(colours); } };
})();
