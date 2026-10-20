import * as THREE from 'three';
import { WIPE, WIPE_GLSL, INK, HAND_WOBBLE } from './style.js';

// Screen-space ink contours for the History Lines look. The world renders once for colour (+ depth), then the
// line-casting meshes once more with a tiny normal + id material. A composite pass draws an ink line wherever,
// within a radius that shrinks with distance (thick close, thin + lighter far), the depth jumps (silhouettes),
// the part changes (sail against spar) or the surface folds sharply (creases, with gaps so not every edge is
// inked). The line sits on the nearer side and wobbles a little like a pen. Supersampled 2x on 1x screens.
// The hall (wipe 0) renders straight to the screen as before.

const LAYER = 1; // meshes on this layer cast ink lines

const quadVert = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// alphaMap: a cut-out card's texture, so the figure's own outline (not its quad) casts the line
function normalMaterial(id, alphaMap = null, wobble = false) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uId: { value: id / 255 }, uMap: { value: alphaMap }, uCut: { value: alphaMap ? 1 : 0 } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec2 vUv; varying float vPart; attribute float aPart; attribute float aKind;
      ${HAND_WOBBLE}
      void main() {
        vN = normalize(normalMatrix * normal); vUv = uv; vPart = aPart;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        ${wobble ? 'wp.xyz += handWobble(wp.xyz, normalize(mat3(modelMatrix) * normal), aKind);' : ''}
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `uniform float uId; uniform sampler2D uMap; uniform float uCut; varying vec3 vN; varying vec2 vUv; varying float vPart;
      void main() {
        if (uCut > 0.5 && texture2D(uMap, vUv).a < 0.5) discard;
        vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n;
        // ship pieces carry their own id (aPart, tools/build_ship.py): 0.02..0.47 solid, 0.5..0.97 rigging (thin lines)
        gl_FragColor = vec4(n * 0.5 + 0.5, vPart > 0.0 ? vPart : uId);
      }`,
  });
}

export const INK_PARAMS = {
  width: 2.2, // line radius in screen px at 1 world unit from the camera (falls off as distance^-0.4)
  minPx: 1.0,
  maxPx: 3.4,
  depthJump: 0.012, // relative depth step that counts as a silhouette
  crease: 0.5, // normal dot below which a fold is inked
  farFade: [8, 60], // world units: lines lighten from .. to
  farAlpha: 1.0,
  wobble: 1.4, // px
};

export class InkPass {
  constructor(renderer) {
    this.renderer = renderer;
    this.casters = [];
    const rt = (samples) =>
      new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples, depthTexture: new THREE.DepthTexture(1, 1) });
    this.rtMain = rt(4);
    this.rtN = rt(0);
    this.rtOut = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const P = INK_PARAMS;
    this.composite = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...WIPE,
        tColor: { value: this.rtMain.texture }, tDepthM: { value: this.rtMain.depthTexture },
        tN: { value: this.rtN.texture }, tDepthN: { value: this.rtN.depthTexture }, tHatch: { value: null },
        uNear: { value: 0.1 }, uFar: { value: 100 }, uInvVP: { value: new THREE.Matrix4() }, uTexel: { value: new THREE.Vector2() }, uSS: { value: 1 },
        uInk: { value: INK }, uSeaId: { value: 4 / 255 }, uRigId: { value: 2 / 255 },
        uWidth: { value: P.width }, uMinPx: { value: P.minPx }, uMaxPx: { value: P.maxPx },
        uJump: { value: P.depthJump }, uCrease: { value: P.crease },
        uFarFade: { value: new THREE.Vector2(...P.farFade) }, uFarAlpha: { value: P.farAlpha }, uWobble: { value: P.wobble },
      },
      vertexShader: quadVert,
      fragmentShader: /* glsl */ `
        uniform sampler2D tColor, tDepthM, tN, tDepthN, tHatch;
        uniform float uNear, uFar, uSS, uSeaId, uRigId, uWidth, uMinPx, uMaxPx, uJump, uCrease, uFarAlpha, uWobble;
        uniform vec2 uTexel, uFarFade; uniform vec3 uInk; uniform mat4 uInvVP;
        varying vec2 vUv;
        ${WIPE_GLSL}
        float viewZ(float d) { return (uNear * uFar) / (uFar - d * (uFar - uNear)); }
        void main() {
          vec3 col = texture2D(tColor, vUv).rgb;
          float dn = texture2D(tDepthN, vUv).r;
          vec4 c = texture2D(tN, vUv);
          vec4 hp = uInvVP * vec4(vUv * 2.0 - 1.0, dn * 2.0 - 1.0, 1.0);
          float w = wipeMask(hp.xyz / hp.w).x;
          if (dn >= 1.0 || w <= 0.0 || abs(c.a - uSeaId) < 0.002) { gl_FragColor = vec4(col, 1.0); return; }
          float zc = viewZ(dn);
          float zm = viewZ(texture2D(tDepthM, vUv).r);
          if (zm < zc * 0.995) { gl_FragColor = vec4(col, 1.0); return; } // a cut-out card stands in front
          vec3 nc = c.rgb * 2.0 - 1.0;
          float r = clamp(uWidth * pow(zc, -0.4), uMinPx, uMaxPx) * uSS; // a ship 70 m off still gets a real line
          bool rig = c.a > 0.49;
          vec2 px = gl_FragCoord.xy / uSS;
          vec2 wob = (vec2(vnoise(px * 0.03), vnoise(px * 0.03 + 17.3)) - 0.5) * uWobble * uSS;
          float gaps = smoothstep(0.45, 0.6, vnoise(px * 0.02 + 3.1)); // creases break up, silhouettes do not
          // pen pressure: the line swells and thins along its length, and now and then lifts off (a gap)
          float press = 0.35 + 1.0 * vnoise(px * 0.016 + 7.7); // swell and thin, but no blunt slabs
          float lift = smoothstep(0.12, 0.22, vnoise(px * 0.05 + 1.3));
          // ropes: thin contours so their fill and twist show close up; far rigging breaks up and lets lines go
          if (rig) { r *= 0.8; lift = mix(1.0, lift, smoothstep(2.0, 6.0, zc)); }
          float eS = 0.0, eI = 0.0, occ = 0.0; // silhouettes, inner lines, crevice (near occluders)
          for (int ring = 0; ring < 2; ring++) {
            // inner ring: every edge, thin. outer ring: only big occlusions (heavy accents), scaled by pressure
            float rr = ring == 0 ? r * (0.4 + 0.2 * press) : r * press; // both rings swell and thin with the pen
            for (int k = 0; k < 8; k++) {
              float a = float(k) * 0.785398 + float(ring) * 0.39;
              vec2 o = (vec2(cos(a), sin(a)) * rr + wob) * uTexel;
              float dk = texture2D(tDepthN, vUv + o).r;
              vec4 ck = texture2D(tN, vUv + o);
              float zk = dk >= 1.0 ? 1e6 : viewZ(dk);
              float jump = (zk - zc) / zc;
              // outer ring: big occlusions and the outline against the sky are the heavy strokes
              float sil = ring == 0 ? step(uJump, jump) : max(step(uJump * 3.0, jump), step(1.0, dk));
              // inner construction lines lighter than silhouettes
              float part = step(0.002, abs(ck.a - c.a)) * step(zc * 0.98, zk) * (ring == 0 ? 1.0 : 0.0);
              float fold = (1.0 - smoothstep(uCrease - 0.1, uCrease + 0.1, dot(nc, ck.rgb * 2.0 - 1.0))) * gaps * 0.45 * (ring == 0 ? 1.0 : 0.0) * step(abs(jump), uJump); // a fold lies on one surface: never across a gap
              eS = max(eS, sil);
              eI = max(eI, max(part, fold));
              occ += step(zk, zc * 0.996) * step(zc * 0.75, zk) / 16.0;
            }
          }
          // crisp, not soft: ink is on or off. Silhouettes never break; inner lines lift off now and then (gaps)
          float silGap = smoothstep(0.05, 0.11, vnoise(px * 0.03 + 9.0)); // even an outline lifts off now and then
          float e = max(smoothstep(0.25, 0.55, eS) * (rig ? lift : silGap), smoothstep(0.25, 0.55, eI) * lift * 0.7);
          // tucked into a corner behind something close (a joint, under a rail, behind a block): a few hatch strokes
          float crev = step(0.45, occ) * (1.0 - smoothstep(1.5, 3.0, zc)); // hard-edged
          // recesses: a flat, muted darker tone (no hatch pattern: it read as repeated slashes)
          // spot blacks: tucked under an overlap close by, the corner goes solid ink (a BD inker's dark accent)
          // (v4: spot blacks off, they read as dirty dashed bands under the tops)
          // thin far lines are lighter as well as thinner: a sub-pixel radius draws a fraction of the ink
          float alpha = mix(1.0, uFarAlpha, smoothstep(uFarFade.x, uFarFade.y, zc)) * clamp(r / uSS / 0.9, 0.75, 1.0);
          gl_FragColor = vec4(mix(col, uInk, e * alpha * w), 1.0);
        }`,
    });
    this.blit = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: { tSrc: { value: this.rtOut.texture } },
      vertexShader: quadVert,
      fragmentShader: /* glsl */ `uniform sampler2D tSrc; varying vec2 vUv;
        void main() { gl_FragColor = vec4(texture2D(tSrc, vUv).rgb, 1.0);
        #include <colorspace_fragment>
        }`,
    });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.composite);
    this.quad.frustumCulled = false;
  }

  // meshes that cast lines; id groups parts (same id = no line where they touch)
  addCaster(mesh, id, alphaMap = null) {
    mesh.layers.enable(LAYER);
    this.casters.push({ mesh, nMat: normalMaterial(id, alphaMap, !!mesh.material.userData.wobble), mat: null });
  }

  setHatch(tex) {
    this.composite.uniforms.tHatch.value = tex;
  }

  setSize(w, h) {
    this.ss = devicePixelRatio >= 2 ? 1 : 2;
    this.size = new THREE.Vector2(w * this.ss, h * this.ss);
    this.screen = new THREE.Vector2(w, h);
    for (const rt of [this.rtMain, this.rtN, this.rtOut]) rt.setSize(this.size.x, this.size.y);
    this.composite.uniforms.uTexel.value.set(1 / this.size.x, 1 / this.size.y);
    this.composite.uniforms.uSS.value = this.ss;
  }

  render(scene, camera) {
    const r = this.renderer;
    if (WIPE.uWipe.value <= 0) {
      WIPE.uRes.value.copy(this.screen);
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }
    WIPE.uRes.value.copy(this.size); // every wipe mask now runs at the supersampled size
    r.setRenderTarget(this.rtMain);
    r.render(scene, camera);

    const bg = scene.background;
    scene.background = null;
    for (const c of this.casters) [c.mat, c.mesh.material] = [c.mesh.material, c.nMat];
    const layers = camera.layers.mask;
    camera.layers.set(LAYER);
    r.setRenderTarget(this.rtN);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(scene, camera);
    camera.layers.mask = layers;
    for (const c of this.casters) c.mesh.material = c.mat;
    scene.background = bg;

    const u = this.composite.uniforms;
    u.uNear.value = camera.near;
    u.uInvVP.value.copy(camera.matrixWorld).multiply(camera.projectionMatrixInverse);
    u.uFar.value = camera.far;
    this.quad.material = this.composite;
    r.setRenderTarget(this.rtOut);
    r.render(this.quad, this.quadCam);
    this.quad.material = this.blit;
    r.setRenderTarget(null);
    r.render(this.quad, this.quadCam);
  }
}
