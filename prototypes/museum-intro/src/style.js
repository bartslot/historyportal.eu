import * as THREE from 'three';

// Two looks per material, one wipe between them. Every world material samples a PAINTERLY texture (Vroom's oil,
// made by ChatGPT from crops of the painting) and a HISTORY LINES texture (pencil + light watercolour washes)
// and mixes them by one screen-space mask: an ink stain that spreads from the point where the stick figure
// lands, with a noisy edge and a dark ink rim at its front. The ink outline (inverted hull) uses the same mask.

export const WIPE = {
  uWipe: { value: 0 }, // 0 = all painterly, 1 = all History Lines
  uWipeOrigin: { value: new THREE.Vector2(0.5, 0.5) }, // screen uv of the landing point
  uRes: { value: new THREE.Vector2(1, 1) },
  uSun: { value: new THREE.Vector3(-0.45, 0.75, 0.5).normalize() },
};

export const WIPE_GLSL = /* glsl */ `
  uniform float uWipe;
  uniform vec2 uWipeOrigin;
  uniform vec2 uRes;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  // x: 0 painterly .. 1 lines; y: ink rim strength at the spreading front
  vec2 wipeMask() {
    vec2 uv = gl_FragCoord.xy / uRes;
    vec2 d = (uv - uWipeOrigin) * vec2(uRes.x / uRes.y, 1.0);
    float n = vnoise(uv * 7.0) * 0.6 + vnoise(uv * 23.0) * 0.3 + vnoise(uv * 61.0) * 0.1; // brush/paper fibre
    float r = uWipe * uWipe * 4.2 - 0.1; // starts slow at the landing, then sweeps past the screen edges
    float e = length(d) + (n - 0.5) * 0.32;
    float m = max(1.0 - smoothstep(r - 0.02, r + 0.02, e), step(0.999, uWipe)); // done = everywhere, wherever the origin went
    float rim = smoothstep(r - 0.09, r - 0.01, e) * m * step(uWipe, 0.999);
    return vec2(m, rim);
  }
`;

const INK = new THREE.Color(0x2d2219);

const triplanar = /* glsl */ `
  vec3 tri(sampler2D t, vec3 p, vec3 n, float s) {
    vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
    return texture2D(t, p.zy * s).rgb * w.x + texture2D(t, p.xz * s).rgb * w.y + texture2D(t, p.xy * s).rgb * w.z;
  }
`;

// mode: 'tri' (any mesh, world-space triplanar) or 'uv'. tints multiply each look. lit: painterly modelling amount.
export function styledMaterial({ paint, lines, mode = 'tri', scale = 1, tintPaint = [1, 1, 1], tintLines = [1, 1, 1], lit = 0.6, side = THREE.FrontSide, extra = '' }) {
  for (const t of [paint, lines]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.ShaderMaterial({
    side,
    uniforms: {
      ...WIPE,
      uPaint: { value: paint },
      uLines: { value: lines },
      uScale: { value: scale },
      uTintP: { value: new THREE.Vector3(...tintPaint) },
      uTintL: { value: new THREE.Vector3(...tintLines) },
      uLit: { value: lit },
      uInk: { value: INK },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos; varying vec3 vN; varying vec2 vUv;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vPos = wp.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uPaint; uniform sampler2D uLines; uniform float uScale;
      uniform vec3 uTintP; uniform vec3 uTintL; uniform float uLit; uniform vec3 uSun; uniform vec3 uInk;
      varying vec3 vPos; varying vec3 vN; varying vec2 vUv;
      ${WIPE_GLSL}
      ${triplanar}
      void main() {
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        ${mode === 'tri'
          ? 'vec3 cp = tri(uPaint, vPos, n, uScale); vec3 cl = tri(uLines, vPos, n, uScale);'
          : 'vec3 cp = texture2D(uPaint, vUv * uScale).rgb; vec3 cl = texture2D(uLines, vUv * uScale).rgb;'}
        float l = clamp(dot(n, uSun), 0.0, 1.0);
        cp *= uTintP * mix(1.0, 0.45 + 0.75 * l, uLit);           // oil: modelled light and shade
        cl *= uTintL * mix(1.0, 0.8 + 0.25 * step(0.25, l), uLit); // watercolour: two flat washes
        ${extra}
        vec2 w = wipeMask();
        vec3 c = mix(cp, cl, w.x);
        c = mix(c, uInk, w.y * 0.75);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// Ink contour: the mesh again, pushed out along its normals, back faces only, shown where the wipe has passed.
export function outlineMaterial(width = 0.012) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { ...WIPE, uWidth: { value: width }, uInk: { value: INK } },
    vertexShader: /* glsl */ `
      uniform float uWidth;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 n = normalize(mat3(modelMatrix) * normal);
        // keep the line about as thick on screen near and far
        float d = length(cameraPosition - wp.xyz);
        wp.xyz += n * uWidth * clamp(d * 0.08, 0.0, 1.5);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      ${WIPE_GLSL}
      void main() {
        if (wipeMask().x < 0.5) discard;
        gl_FragColor = vec4(uInk, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// A card (cut-out) with a painterly and a History Lines texture. Without a lines texture the card is "inked" in the
// shader (lighter, a pencil edge from the alpha and colour gradient) so far painting cut-outs follow the wipe too.
// Without a paint texture (History Lines crew) the painterly look is derived: darker, warmer, varnished.
export function cardMaterial(paint, lines = null) {
  const base = paint ?? lines;
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: { ...WIPE, uPaint: { value: base }, uLines: { value: lines ?? base }, uHasLines: { value: lines ? 1 : 0 }, uHasPaint: { value: paint ? 1 : 0 }, uTexel: { value: new THREE.Vector2(1 / base.image.width, 1 / base.image.height) }, uInk: { value: INK } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uPaint; uniform sampler2D uLines; uniform float uHasLines; uniform float uHasPaint; uniform vec2 uTexel; uniform vec3 uInk;
      varying vec2 vUv;
      ${WIPE_GLSL}
      void main() {
        vec4 p = texture2D(uPaint, vUv);
        vec4 l = texture2D(uLines, vUv);
        if (uHasLines < 0.5) {
          // auto History Lines: brighter, softer wash + a thin pencil edge where alpha or luminance jumps
          float a0 = texture2D(uPaint, vUv + vec2(uTexel.x * 2.0, 0.0)).a, a1 = texture2D(uPaint, vUv - vec2(uTexel.x * 2.0, 0.0)).a;
          float a2 = texture2D(uPaint, vUv + vec2(0.0, uTexel.y * 2.0)).a, a3 = texture2D(uPaint, vUv - vec2(0.0, uTexel.y * 2.0)).a;
          float edge = clamp((abs(a0 - a1) + abs(a2 - a3)) * 1.5, 0.0, 1.0);
          vec3 wash = mix(p.rgb, vec3(dot(p.rgb, vec3(0.3, 0.59, 0.11))), 0.25) * 0.55 + 0.45;
          l = vec4(mix(wash, uInk, edge), p.a);
        }
        if (uHasPaint < 0.5) {
          float g = dot(l.rgb, vec3(0.3, 0.59, 0.11));
          p = vec4(mix(l.rgb, vec3(g), 0.35) * vec3(0.78, 0.68, 0.52), l.a);
        }
        vec2 w = wipeMask();
        vec4 c = mix(p, l, w.x);
        if (c.a < 0.05) discard;
        c.rgb = mix(c.rgb, uInk, w.y * 0.6);
        gl_FragColor = c;
        #include <colorspace_fragment>
      }`,
  });
}
