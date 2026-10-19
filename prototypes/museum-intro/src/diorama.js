import * as THREE from 'three';

// The painting as a 2.5D diorama. A subdivided plane sits in the wall hole; each vertex is pushed AWAY FROM THE
// PAINTER'S EYE along its own view ray by the Depth Anything V2 map (white = near). From the eye the picture is
// therefore pixel-identical at any depth amount: it can only tear when the camera leaves that ray, which is
// what the camera path is designed around. `depthAmount` 0 = flat painting, the intro animates it up.
//
// distance factor s(d) = 1 + depthAmount * (1 - d)^gamma; foreground (d = 1) stays in the frame plane.

const vert = /* glsl */ `
  uniform sampler2D uDepth;
  uniform vec3 uCenter;
  uniform vec2 uSize;
  uniform vec3 uEye;
  uniform float uK;
  uniform float uGamma;
  uniform vec2 uTexel;
  uniform float uPush;
  uniform float uOver;
  varying vec2 vUv;
  varying float vEdge;
  float s(vec2 uv) { return 1.0 + uK * pow(1.0 - texture2D(uDepth, uv).r, uGamma); }
  void main() {
    // uOver > 1 makes a mesh larger than the frame with mirrored edges: the plate hides the world's rim
    vec2 tuv = 1.0 - abs(1.0 - mod((uv - 0.5) * uOver + 0.5, 2.0)); // mirrored past the edges
    vUv = tuv;
    vec3 p0 = uCenter + vec3((uv - 0.5) * uSize * uOver, 0.0);
    float f = s(tuv) + uPush * uK;
    // how much the factor jumps around this vertex: large on object edges, used to cut stretched triangles
    vEdge = max(abs(s(tuv + vec2(uTexel.x, 0.0)) - s(tuv - vec2(uTexel.x, 0.0))),
                abs(s(tuv + vec2(0.0, uTexel.y)) - s(tuv - vec2(0.0, uTexel.y))));
    vec3 p = uEye + (p0 - uEye) * f;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;

const frag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uBright;
  uniform float uCut;
  varying vec2 vUv;
  varying float vEdge;
  void main() {
    if (uCut > 0.0 && vEdge > uCut) discard;
    gl_FragColor = vec4(texture2D(uMap, vUv).rgb * uBright, 1.0);
    #include <colorspace_fragment>
  }
`;

export class Diorama {
  constructor({ map, depth, center, size, eye, segments = [640, 295], cut = 0, push = 0, over = 1 }) {
    this.center = center.clone();
    this.size = size.clone();
    this.eye = eye.clone();
    this.readDepth(depth.image);
    this.uniforms = {
      uMap: { value: map },
      uDepth: { value: depth },
      uCenter: { value: this.center },
      uSize: { value: this.size },
      uEye: { value: this.eye },
      uK: { value: 0 },
      uGamma: { value: 1.0 },
      uTexel: { value: new THREE.Vector2(1.5 / segments[0], 1.5 / segments[1]) },
      uBright: { value: 0.9 },
      uCut: { value: cut },
      uPush: { value: push },
      uOver: { value: over },
    };
    const geo = new THREE.PlaneGeometry(1, 1, segments[0], segments[1]);
    this.mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms }));
    this.mesh.frustumCulled = false; // vertices move in the shader
  }

  readDepth(img) {
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    this.depthPx = { w: c.width, h: c.height, data: g.getImageData(0, 0, c.width, c.height).data };
  }

  // depth 0..1 at uv (v up, like three), max over a small radius so thin masts/ropes read as the nearby object
  depthAt(u, v, r = 0) {
    const { w, h, data } = this.depthPx;
    const cx = Math.round(u * (w - 1));
    const cy = Math.round((1 - v) * (h - 1));
    let best = 0;
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const xx = Math.min(w - 1, Math.max(0, x));
        const yy = Math.min(h - 1, Math.max(0, y));
        best = Math.max(best, data[(yy * w + xx) * 4] / 255);
      }
    }
    return best;
  }

  // world point of painting uv at depth amount k (defaults to the current one). `d` overrides the sampled depth.
  worldAt(u, v, { k = this.uniforms.uK.value, d = this.depthAt(u, v, 3), toEye = 0 } = {}) {
    const p0 = new THREE.Vector3(this.center.x + (u - 0.5) * this.size.x, this.center.y + (v - 0.5) * this.size.y, this.center.z);
    const f = 1 + k * Math.pow(1 - d, this.uniforms.uGamma.value) - toEye;
    return this.eye.clone().add(p0.sub(this.eye).multiplyScalar(f));
  }

  // how much bigger something looks-the-same at that depth (to scale cards placed into the painting)
  scaleAt(u, v, opts) {
    return this.worldAt(u, v, opts).distanceTo(this.eye) / this.worldAt(u, v, { ...opts, k: 0 }).distanceTo(this.eye);
  }

  set depthAmount(k) {
    this.uniforms.uK.value = k;
  }

  get depthAmount() {
    return this.uniforms.uK.value;
  }
}
