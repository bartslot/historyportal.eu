import * as THREE from 'three';

// Two looks per material, one wipe between them. PAINTERLY samples Vroom-style oil textures (ChatGPT, from crops
// of the painting). HISTORY LINES is drawn, not textured: a flat fill from the material's palette (one light and
// one shade colour, taken from the Tasman anchors), hand-drawn ink tiles (ChatGPT line passes: plank seams and
// grain, sail seams, rope lay, wavelets, shadow hatching) laid on in the ship's own frame so they never swim, and
// the contour lines come from the screen-space ink pass (ink.js). Both looks are mixed by one mask: an ink
// stain that spreads THROUGH THE 3D WORLD from where the figure lands, down the mast to Tasman, then everywhere.

export const WIPE = {
  uWipe: { value: 0 }, // 0 = all painterly, 1 = all History Lines
  uWipeOrigin: { value: new THREE.Vector3() }, // world position of the landing point on the sail
  uWipeR: { value: 0 }, // world radius of the stain front, set per frame by main.js
  uRes: { value: new THREE.Vector2(1, 1) },
  uSun: { value: new THREE.Vector3(-0.45, 0.75, 0.5).normalize() },
};

export const WIPE_GLSL = /* glsl */ `
  uniform float uWipe;
  uniform vec3 uWipeOrigin;
  uniform float uWipeR;
  uniform vec2 uRes;
  float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y);
  }
  // x: 0 painterly .. 1 lines; y: a thin ink front where the stain is spreading
  // p: world position of the pixel. Converted stays converted, whatever the camera does next.
  vec2 wipeMask(vec3 p) {
    float n = vnoise(p.xz * 6.0 + p.y * 2.3) * 0.6 + vnoise(p.xy * 17.0 + p.z * 5.0) * 0.3 + vnoise(p.zy * 41.0) * 0.1;
    float r = uWipeR;
    float e = length(p - uWipeOrigin) * (1.0 + (n - 0.5) * 0.35); // ragged front at any size
    float fw = max(fwidth(e), 1e-5);
    float m = max(1.0 - smoothstep(r - fw, r + fw, e), step(0.999, uWipe)); // done = everywhere
    // a pen line just behind the front (3 px), not smoke
    float rim = (smoothstep(r - 5.0 * fw, r - 3.0 * fw, e) - smoothstep(r - 1.5 * fw, r - 0.5 * fw, e)) * step(uWipe, 0.999) * step(1e-4, r);
    return vec2(m, max(rim, 0.0));
  }
`;

export const INK = new THREE.Color(0x140e09);

// History Lines palettes: [light, shade], sRGB, sampled from TARGET_s03a / s03b / s01
export const PALETTE = {
  hullSide: [0xab7647, 0x8b5d36],
  deck: [0xd8ae74, 0xb88a56],
  rail: [0xdca05a, 0xba7f48],
  spar: [0xe0a25a, 0xbb7f45],
  rope: [0x6e5639, 0x584430], // tarred hemp: dark brown, like the TARGET's ropes
  block: [0x7d5a3a, 0x654830], // blocks, deadeyes: dark weathered wood like the TARGET's
  sail: [0xfbf7ea, 0xf0e7d2],
  sea: [0x7eaacd, 0x9fc4dc, 0xb7d4e6], // near, pale patches, far (TARGET_s01)
  seaInk: 0x2f5f8c,
};

const lin = (hex) => new THREE.Color(hex);

// A hand never rules a line: rigging and spars are bent a little by a few long, slow sines (world units), so ropes
// sag and wander and masts are not machine-straight. The ink pass's normal material applies the same bend.
export const HAND_WOBBLE = /* glsl */ `
  // rope (aKind 1): also pushed out along its smooth normals so it gets a visible width (fill, twist, contour). Only
  // ropes: on the hard-edged tops and blocks a normal push opens cracks.
  vec3 handWobble(vec3 p, vec3 n, float kind) {
    float rope = step(0.5, kind) * step(kind, 1.5);
    // near the eye the rope gets a drawable width (fill, twist, contour); far off a rope is just an ink line
    float push = max(0.004, length(cameraPosition - p) * 0.0014) * (1.0 - smoothstep(6.0, 10.0, length(cameraPosition - p))); // ~1.2 px a side out to 6 units
    return vec3(sin(p.y * 2.3 + p.z * 1.1), sin(p.x * 1.9 + p.y * 1.4 + 1.7), sin(p.z * 2.1 + p.x * 0.8 + 2.9)) * 0.006 + n * push * rope;
  }
`;

// GLSL shared by every History Lines surface. Positions and normals arrive in the ship's model frame (vM, vMN),
// so the hand-drawn tiles stay glued to the wood and cloth while the camera moves.
const DRAWN = /* glsl */ `
  uniform vec3 uSun; uniform vec3 uInk;
  uniform float uInkNear; uniform float uInkFar;
  // ink amount (0 paper .. 1 ink) of a black-on-white tile
  float inkOf(sampler2D t, vec2 uv) { return 1.0 - texture2D(t, uv).r; }
  // triplanar, but each face picks the projection so plank/grain lines keep their direction
  float inkTri(sampler2D t, vec3 p, vec3 n) {
    vec3 w = pow(abs(n), vec3(6.0)); w /= (w.x + w.y + w.z);
    return inkOf(t, p.zy) * w.x + inkOf(t, p.xz) * w.y + inkOf(t, p.xy) * w.z;
  }
  // Stroke-size LOD (like a tonal art map): the tile is drawn at a scale that halves with every doubling of the
  // distance, so its pen strokes stay about the same width on screen (crisp, never grey mush or blunt slabs);
  // two neighbouring octaves cross-fade. x, y = the two scale factors, z = the blend.
  // Never finer than the base scale up close: planks are structure, they must not multiply as the camera nears.
  vec3 strokeLod(float d) { float lv = max(log2(max(d, 0.05)), 0.0); float f = floor(lv); return vec3(exp2(-f), exp2(-f - 1.0), fract(lv)); }
  // how much hand-drawn texture survives at this distance: full close up, a few strokes far, none on the horizon
  float drawnFade(float d) { return 1.0 - smoothstep(uInkNear, uInkFar, d); }
  // flat two-tone fill: light side / shade side, a hard but anti-aliased step
  float litStep(vec3 n) { float l = dot(n, uSun); return smoothstep(-0.32, -0.22, l); } // only faces turned well away are shade
`;

const LINES_VARYINGS = 'varying vec3 vPos; varying vec3 vN; varying vec3 vM; varying vec3 vMN; varying vec2 vUv; varying float vKind; varying vec3 vAxis;';

// which faces of a v4 ship material go to the shade colour: undersides only (flat wood), undersides + the flat dark
// band where a round piece turns away from the eye (masts, ropes, barrels), or the sun step (cloth)
const LIT = {
  under: 'smoothstep(-0.47, -0.43, mn.y)',
  round: 'min(smoothstep(-0.47, -0.43, mn.y), smoothstep(0.3, 0.36, abs(dot(n, normalize(cameraPosition - vPos)))))',
  sun: 'litStep(n)',
};

// paint: oil texture; tint/lit as before. lines: { kind, light, shade, ink, hatch, scale, inkK, hatchK }
//   kind: 'wood' (hull: deck/side/rail by normal + height), 'spar' (rigging: spars grain / ropes lay, by curvature),
//         'sail', 'sea'
export function styledMaterial({ paint, tintPaint = [1, 1, 1], lit = 0.6, mode = 'tri', scale = 1, side = THREE.FrontSide, toModel, lines, swell = '', extraPaint = '', wobble = false }) {
  paint.wrapS = paint.wrapT = THREE.RepeatWrapping;
  const L = lines;
  for (const k of ['ink', 'ink2', 'hatch', 'grain']) if (L[k]) L[k].wrapS = L[k].wrapT = THREE.RepeatWrapping;
  const P = PALETTE;
  const kindGLSL = {
    wood: /* glsl */ `
      // colour by height only, never by face direction (that reads as faceted CG lighting): brown hull up to
      // the deck, honey deck and upper works. The drawn tile still follows the face: planks on deck, strakes on sides.
      float up = smoothstep(0.55, 0.8, mn.y);
      float upper = smoothstep(uRailY - 0.05, uRailY + 0.05, vM.y);
      vec3 light = mix(uHullL, mix(uRailL, uDeckL, up * 0.5), upper), shade = mix(uHullS, uRailS, upper);
      // hand colouring: every plank strake its own slightly different flat honey/brown (by plank, never by face)
      float plank = mix(floor(vM.y * 2.6), floor(vM.z * 2.6) + 31.0, up);
      float tone = h21(vec2(plank, 7.0)) - 0.5;
      light *= 1.0 + tone * 0.16; shade *= 1.0 + tone * 0.16;
      vec3 lod = strokeLod(dist);
      float inkA = mix(inkTri(uTex, vM * ls * lod.x, mn), inkOf(uTex2, vM.xz * ls * lod.x), up);
      float inkB = mix(inkTri(uTex, vM * ls * lod.y, mn), inkOf(uTex2, vM.xz * ls * lod.y), up);
      // two octaves at once: the long grain plus a finer layer between, like the TARGET's mast
      float ink = max(inkA * (1.0 - 0.5 * lod.z), inkB * (0.55 + 0.45 * lod.z));
      // dense hand-drawn grain over the planks (long axis of a plank: x on the sides and deck), thinned by the clusters
      float gr = mix(inkTri(uGrain, vM * vec3(0.6, 3.0, 3.0) * ls * lod.x, mn), inkOf(uGrain, vM.xz * vec2(0.6, 3.0) * ls * lod.x), up);
      ink = max(ink, gr * 0.85);
      // shrouds and ratlines that belong to the hull mesh: dark rope, no plank lines
      float hullRope = step(0.5, vKind) * step(vKind, 1.5);
      light = mix(light, uRopeL, hullRope); shade = mix(shade, uRopeS, hullRope); ink *= 1.0 - hullRope;`,
    spar: /* glsl */ `
      // tube axis and radius from screen derivatives: a cylinder's normal turns only around it
      vec3 dnx = dFdx(mn), dny = dFdy(mn), dpx = dFdx(vM), dpy = dFdy(vM);
      bool ux = length(dnx) > length(dny);
      vec3 dn = ux ? dnx : dny; vec3 dp = ux ? dpx : dpy;
      float radius = length(dp) / max(length(dn), 1e-4);
      // the piece's own long axis (rigging.js); around it, the angle of the normal (for the rope's spiral lay)
      vec3 ax = normalize(vAxis + vec3(0.0, 1e-4, 0.0));
      vec3 bx = normalize(cross(ax, vec3(0.31, 0.53, 0.79))), cx = cross(ax, bx);
      float around = atan(dot(mn, cx), dot(mn, bx)) / 6.2832;
      vec2 tube = vec2(dot(vM, ax), dot(vM, bx));
      // part kind from the load-time split (rigging.js): 0 spar, 1 rope, 2 block. Stable per piece, never per facet.
      float isRope = step(0.5, vKind) * step(vKind, 1.5), isBlock = step(1.5, vKind);
      vec3 light = mix(mix(uSparL, uRopeL, isRope), uBlockL, isBlock), shade = mix(mix(uSparS, uRopeS, isRope), uBlockS, isBlock);
      vec3 lod = strokeLod(dist);
      float grain = mix(inkOf(uTex, tube * vec2(ls * 0.5, ls * 3.0) * lod.x), inkOf(uTex, tube * vec2(ls * 0.5, ls * 3.0) * lod.y), lod.z); // long strokes along the spar
      grain = max(grain, inkOf(uGrain, tube * vec2(ls * 0.35, ls * 1.8) * lod.x + 0.37)); // the dense grain drawing on top
      // flat faces (caps, cheeks, platform boards) have no tube axis: plain triplanar grain there, else every facet
      // gets its own random grain direction
      float curved = smoothstep(0.02, 0.08, length(dn) / max(length(dp), 1e-5) * 0.1);
      grain = mix(mix(inkTri(uTex, vM * ls * 0.8 * lod.x, mn), inkTri(uTex, vM * ls * 0.8 * lod.y, mn), lod.z), grain, curved);
      // rope lay: strands spiral round the rope, about one turn per rope diameter
      // rope lay: the twisted-strand tile laid along the rope (diagonal strokes = the twist), ~1 strand per width
      float lay = max(inkOf(uTex2, tube * 3.0), inkOf(uTex2, tube * 3.0 + vec2(0.0021, 0.0)));
      float ink = mix(grain, lay, isRope) * (1.0 - isBlock * 0.6);
      // a rope too thin to show its fill reads as a thin dark line, like the TARGET's far rigging (by screen size)
      float thin = (1.0 - smoothstep(1.5, 4.0, radius / max(length(dp), 1e-4))) * isRope;
      vec3 ropeFar = mix(uRopeS, uInk, 0.5);
      light = mix(light, ropeFar, thin); shade = mix(shade, ropeFar, thin);`,
    uv: /* glsl */ `
      // the v4 ship: one material per mesh, its hand-drawn tile laid on the model's own UVs (model units)
      vec3 light = uMatL, shade = uMatS;
      ${L.flag ? `// the Prince's flag: orange, white, blue bands down the hoist (uv 0..1)
      light = vUv.y < 0.333 ? uFlagO : (vUv.y < 0.667 ? light : uFlagB); shade = light * 0.86;` : ''}
      ${L.lod
        ? 'vec3 lod = strokeLod(dist); float ink = mix(inkOf(uTex, vUv * ls * lod.x), inkOf(uTex, vUv * ls * lod.y), lod.z);'
        : 'float ink = inkOf(uTex, vUv * ls);'}`,
    sail: /* glsl */ `
      vec3 light = uSailL, shade = uSailS;
      float ink = inkTri(uTex, vM * ls, mn);`,
    sailsheet: /* glsl */ `
      vec3 light = uSailL, shade = uSailS;
      bool alt = vUv.y > 1.5;
      float ink = alt ? inkOf(uTex2, vUv - vec2(0.0, 2.0)) : inkOf(uTex, vUv); // one whole drawn sail: seams, tension folds from the corners, gathers at the yard
      // fine canvas strokes in loose patches (the TARGET sails' weave), lighter than the seams
      vec2 suv = vec2(vUv.x * 3.0, fract(vUv.y) * 2.4);
      float canvas = inkOf(uHatch, suv) * smoothstep(0.5, 0.7, vnoise(suv * 1.6 + 3.0)) * 0.6 * (1.0 - smoothstep(4.0, 12.0, dist));
      ink = max(ink, canvas * 0.0); // canvas strokes off: read as scattered scratches`,
    sea: /* glsl */ `
      // flat colour in bands, not a gradient: near blue, broken mid-blue patches, a pale far band
      float far = smoothstep(6.0, 50.0, dist) * 0.85; // the sea stays blue to the horizon (TARGET_s01), paler and quieter
      vec2 sp = vPos.xz * vec2(0.1, 0.7);
      vec3 light, shade;
      // drawn wave groups (swells, stacked dashes, small crests), thinned by a slow mask so some water stays empty
      float keep = smoothstep(0.22, 0.4, vnoise(vPos.xz * vec2(0.35, 1.2) + 11.0));
      // an illustrator draws wave strokes level on the page and about the same size everywhere, smaller only
      // towards the horizon: lay the strokes out in (azimuth, log distance) around the viewer. Pans move them with
      // the world; when the camera travels the water drifts along a little, which water does anyway.
      // Azimuth is measured from the camera's own heading plus that heading, so the atan seam sits behind the
      // viewer; 24 tiles to the circle keeps it continuous anyway.
      vec2 q = vPos.xz - cameraPosition.xz;
      vec2 fw = -normalize(vec2(viewMatrix[0][2], viewMatrix[2][2]));
      float yaw = atan(fw.x, fw.y);
      vec2 qr = vec2(q.x * cos(yaw) - q.y * sin(yaw), q.x * sin(yaw) + q.y * cos(yaw));
      vec2 wv = vec2((atan(qr.x, qr.y) + yaw) * 3.8197, log(max(length(q), 0.05)) * 0.6) / ls + vec2(0.0, uTime * 0.02 / ls);
      vec2 wu = wv * ls * vec2(1.0, 1.3);
      // the sea is one hand-drawn colour tile (ChatGPT, from TARGET_s01): flat blue wave shapes, dark-blue ink
      // strokes, white crest breaks. Far off it settles into the pale far blue.
      vec3 seaTile = texture2D(uTex2, wu).rgb;
      seaTile = mix(seaTile, vec3(0.19, 0.38, 0.52), 0.22); // calm the white crest streaks a little (linear rgb, tile mean)
      light = mix(seaTile, uSeaF, far); shade = light;
      float ink = 0.0;
      // break the tile's repetition: irregular regions switch to a second, offset and rescaled copy of it
      float alt = step(0.5, vnoise(wu * vec2(1.3, 2.2) + 4.0));
      vec3 seaTile2 = texture2D(uTex2, wu * vec2(1.27, 1.13) + vec2(0.43, 0.61)).rgb;
      seaTile2 = mix(seaTile2, vec3(0.19, 0.38, 0.52), 0.22);
      light = mix(light, mix(seaTile2, uSeaF, far), alt); shade = light;
      float glint = inkOf(uTex, wv * ls * vec2(1.0, 1.1) + 0.37) * (1.0 - keep);
      // lens-shaped flat patches of a lighter blue, laid out like the strokes (level, smaller towards the horizon)
      float patchy = step(0.66, vnoise(wv * ls * vec2(6.0, 20.0)) * 0.75 + vnoise(wv * ls * vec2(17.0, 50.0)) * 0.25);
      light = mix(light, uSeaM, patchy * (1.0 - far) * 0.0); // patches off: read as camouflage // the same strokes, offset: white crests
`,
  }[L.kind];
  return new THREE.ShaderMaterial({
    side,
    extensions: { derivatives: true },
    uniforms: {
      ...WIPE,
      uPaint: { value: paint },
      uTex: { value: L.ink },
      uTex2: { value: L.ink2 ?? L.ink },
      uHatch: { value: L.hatch },
      uGrain: { value: L.grain ?? L.ink },
      uScale: { value: scale },
      uLScale: { value: L.scale },
      uTintP: { value: new THREE.Vector3(...tintPaint) },
      uLit: { value: lit },
      uInk: { value: INK },
      uInkK: { value: L.inkK ?? 0.85 },
      uHatchK: { value: L.hatchK ?? 0.5 },
      uInkNear: { value: L.near ?? 1.2 },
      uInkFar: { value: L.far ?? 9 },
      uToModel: { value: toModel ?? new THREE.Matrix4() },
      uTime: { value: 0 },
      uRailY: { value: L.railY ?? 99 },
      uHullL: { value: lin(P.hullSide[0]) }, uHullS: { value: lin(P.hullSide[1]) },
      uDeckL: { value: lin(P.deck[0]) }, uDeckS: { value: lin(P.deck[1]) },
      uRailL: { value: lin(P.rail[0]) }, uRailS: { value: lin(P.rail[1]) },
      uSparL: { value: lin(P.spar[0]) }, uSparS: { value: lin(P.spar[1]) },
      uRopeL: { value: lin(P.rope[0]) }, uRopeS: { value: lin(P.rope[1]) },
      uBlockL: { value: lin(P.block[0]) }, uBlockS: { value: lin(P.block[1]) },
      uSailL: { value: lin(P.sail[0]) }, uSailS: { value: lin(P.sail[1]) },
      uSeaN: { value: lin(P.sea[0]) }, uSeaM: { value: lin(P.sea[1]) }, uSeaF: { value: lin(P.sea[2]) },
      uSeaInk: { value: lin(P.seaInk) },
      uMatL: { value: lin(L.light ?? 0xffffff) }, uMatS: { value: lin(L.shade ?? 0xffffff) },
      uFlagO: { value: lin(0xe0773c) }, uFlagB: { value: lin(0x3f68a8) },
    },
    vertexShader: /* glsl */ `
      uniform mat4 uToModel; uniform float uTime; attribute float aKind; attribute vec3 aAxis;
      ${HAND_WOBBLE}
      ${LINES_VARYINGS}
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec3 wn = normalize(mat3(modelMatrix) * normal);
        ${swell}
        ${wobble ? 'wp.xyz += handWobble(wp.xyz, wn, aKind);' : ''}
        vPos = wp.xyz; vN = wn; vUv = uv; vKind = aKind; vAxis = aAxis;
        vM = (uToModel * wp).xyz; vMN = normalize(mat3(uToModel) * wn);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uPaint; uniform sampler2D uTex; uniform sampler2D uTex2; uniform sampler2D uHatch; uniform sampler2D uGrain;
      uniform float uScale; uniform float uLScale; uniform vec3 uTintP; uniform float uLit;
      uniform float uInkK; uniform float uHatchK; uniform float uRailY; uniform float uTime;
      uniform vec3 uHullL, uHullS, uDeckL, uDeckS, uRailL, uRailS, uSparL, uSparS, uRopeL, uRopeS, uBlockL, uBlockS, uSailL, uSailS, uSeaN, uSeaM, uSeaF, uSeaInk, uMatL, uMatS, uFlagO, uFlagB;
      ${LINES_VARYINGS}
      ${WIPE_GLSL}
      ${DRAWN}
      vec3 triP(sampler2D t, vec3 p, vec3 n, float s) {
        vec3 w = pow(abs(n), vec3(4.0)); w /= (w.x + w.y + w.z);
        return texture2D(t, p.zy * s).rgb * w.x + texture2D(t, p.xz * s).rgb * w.y + texture2D(t, p.xy * s).rgb * w.z;
      }
      void main() {
        vec3 n = normalize(vN), mn = normalize(vMN);
        if (!gl_FrontFacing) { n = -n; mn = -mn; }
        float dist = length(cameraPosition - vPos);
        vec2 w = wipeMask(vPos);

        // painterly (Vroom oil)
        ${mode === 'tri' ? 'vec3 cp = triP(uPaint, vPos, n, uScale);' : 'vec3 cp = texture2D(uPaint, vUv * uScale).rgb;'}
        float l0 = clamp(dot(n, uSun), 0.0, 1.0);
        cp *= uTintP * mix(1.0, 0.45 + 0.75 * l0, uLit);
        ${extraPaint}

        // History Lines: flat fill + hand-drawn ink, fading with distance
        float ls = uLScale;
        ${kindGLSL}
        // wood is one flat colour (no faceted light bands); only the undersides (beneath tops, beams, rails) go
        // to the shade colour and get the shadow hatching, like the TARGET's mast top. Cloth keeps a soft light step.
        float litv = ${L.kind === 'uv' ? LIT[L.lit ?? 'under'] : L.kind === 'wood' || L.kind === 'spar' ? (L.kind === 'wood' ? 'smoothstep(-0.47, -0.43, mn.y)' : '1.0') : 'litStep(n)'};
        // round timber: a flat darker band where the surface turns away from the eye (the TARGET mast's sides)
        ${L.kind === 'spar' ? 'litv = min(litv, smoothstep(0.3, 0.36, abs(dot(n, normalize(cameraPosition - vPos)))) + isBlock);' : ''}
        vec3 fill = mix(shade, light, litv);
        float fade = drawnFade(dist);
        // shadow hatching: only on faces turned well away from the sun, hard-edged, strokes kept fine by the LOD
        vec3 hl = strokeLod(dist);
        float away = 1.0 - smoothstep(-0.35, -0.25, dot(n, uSun));
        float hatch = mix(inkTri(uHatch, vM * ls * 0.7 * hl.x, mn), inkTri(uHatch, vM * ls * 0.7 * hl.y, mn), hl.z);
        hatch = smoothstep(0.3, 0.6, hatch) * max(1.0 - litv, away) * uHatchK;
        // drawn texture in clusters with clean wood between them, the way an inker groups grain
        float cl0 = ${L.cluster ? 'smoothstep(0.12, 0.22, vnoise(vM.xz * 0.5 + vM.y * 0.37) * 0.7 + vnoise(vM.zy * 1.3) * 0.3)' : '1.0'};
        // drawn marks are ink or paper, not grey: a filtered (far, small) stroke fades out instead of greying the fill
        ink = mix(smoothstep(0.3, 0.6, ink), ink * 0.8, smoothstep(2.0, 6.0, dist)); // far: mip-averaged strokes must not sharpen into blobs
        ${L.kind === 'uv' && L.lit === 'round' ? 'ink = max(ink, smoothstep(0.3, 0.6, inkOf(uTex, vUv * ls * vec2(1.0, 2.3) + 0.37)) * (1.0 - litv));' : ''}
        float k = max(ink * uInkK * cl0, hatch) * fade;
        ${L.kind === 'sea' ? 'vec3 cl = mix(fill, uSeaInk, k);' : 'vec3 cl = mix(fill, uInk, k);'}

        vec3 c = mix(cp, cl, w.x);
        c = mix(c, uInk, w.y * 0.85);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

// A card (cut-out) with a painterly and a History Lines texture. Without a lines texture the card is "inked" in the
// shader (lighter, a pencil edge from the alpha) so far painting cut-outs follow the wipe too. Without a paint
// texture (History Lines crew) the painterly look is derived: darker, warmer, varnished.
export function cardMaterial(paint, lines = null) {
  const base = paint ?? lines;
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: { ...WIPE, uPaint: { value: base }, uLines: { value: lines ?? base }, uHasLines: { value: lines ? 1 : 0 }, uHasPaint: { value: paint ? 1 : 0 }, uTexel: { value: new THREE.Vector2(1 / base.image.width, 1 / base.image.height) }, uInk: { value: INK },
      uCardDark: { value: lin(PALETTE.hullSide[0]) }, uCardMid: { value: lin(PALETTE.rail[0]) }, uCardLight: { value: lin(PALETTE.sail[0]) } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vWP;
      void main() { vUv = uv; vec4 wp = modelMatrix * vec4(position, 1.0); vWP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWP;
      uniform sampler2D uPaint; uniform sampler2D uLines; uniform float uHasLines; uniform float uHasPaint; uniform vec2 uTexel; uniform vec3 uInk;
      uniform vec3 uCardDark, uCardMid, uCardLight;
      varying vec2 vUv;
      ${WIPE_GLSL}
      void main() {
        vec4 p = texture2D(uPaint, vUv);
        vec4 l = texture2D(uLines, vUv);
        if (uHasLines < 0.5) {
          // auto History Lines for the painting's other ships: the oil's tones mapped onto the flat palette (dark =
          // hull brown, mid = honey wood, light = sail cream), ink where the outline or the painted value jumps
          // the cut-out's alpha is ragged (a depth-map cut): blur it and re-threshold for a smooth drawn outline
          vec3 Y = vec3(0.3, 0.59, 0.11);
          float aSum = 0.0, lum = 0.0;
          for (int i = 0; i < 9; i++) {
            vec2 o = vec2(float(i - (i / 3) * 3 - 1), float(i / 3 - 1)) * uTexel * 4.0;
            vec4 s = texture2D(uPaint, vUv + o);
            aSum += s.a; lum += dot(s.rgb, Y);
          }
          aSum /= 9.0; lum /= 9.0;
          float alpha = smoothstep(0.45, 0.55, aSum);
          float edge = 1.0 - smoothstep(0.08, 0.2, abs(aSum - 0.5)); // a band around the smoothed outline
          // two flat tones only: dark hull brown, light sail cream
          vec3 fill = mix(uCardDark, uCardLight, smoothstep(0.17, 0.23, lum));
          l = vec4(mix(fill, uInk, edge * 0.85), max(alpha, edge));
        }
        if (uHasPaint < 0.5) {
          float g = dot(l.rgb, vec3(0.3, 0.59, 0.11));
          p = vec4(mix(l.rgb, vec3(g), 0.35) * vec3(0.78, 0.68, 0.52), l.a);
        }
        vec2 w = wipeMask(vWP);
        // the drawn figures: shading quantised into flat tones (3 levels of value, hue kept), so they sit with the
        // flat-filled world instead of looking airbrushed
        if (uHasLines > 0.5 && uHasPaint < 0.5) {
          float v = max(max(l.r, l.g), l.b);
          float q = (floor(v * 3.0 + 0.5) / 3.0);
          l.rgb = v > 0.02 ? l.rgb * mix(1.0, clamp(q / v, 0.6, 1.4), 0.6) : l.rgb;
        }
        vec4 c = mix(p, l, w.x);
        if (c.a < 0.05) discard;
        c.rgb = mix(c.rgb, uInk, w.y * 0.6);
        gl_FragColor = c;
        #include <colorspace_fragment>
      }`,
  });
}
