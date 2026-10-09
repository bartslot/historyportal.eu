// Storybook look (target: Figma "History Portal" 1915:111, a watercolour night sea).
// One post chain over the WHOLE frame, so sky images, silhouette planes and 3D models share one style:
//   1 wash        flat colour washes with slightly wobbly edges (Kuwahara + hand tremor)
//   2 ink         thin pen lines from depth/normal/colour edges; thinner and lighter with distance
//   3 watercolour wet-edge pooling, pigment granulation, an aquarelle texture blended over everything
//                 (built-in or your own scan), one palette, paper grain and a deckled paper edge
// 3D models also get toon (cel) shading. Every value lives in a slider; nothing below restates one.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const camera = mvp.camera;

  const NOISE = `
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
    float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }`;

  BABYLON.Effect.ShadersStore.washFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform vec2 texel;
    uniform vec2 resolution;
    uniform float radius;
    uniform float wobble;
    ${NOISE}
    void main(void) {
      vec2 p = vUV * resolution;
      vec2 uv = vUV + (vec2(fbm(p / 22.0), fbm(p / 22.0 + 7.3)) - 0.5) * wobble * texel * 8.0;
      int r = int(radius);
      if (r < 1) { gl_FragColor = texture2D(textureSampler, uv); return; }
      vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
      vec3 s0 = vec3(0.0), s1 = vec3(0.0), s2 = vec3(0.0), s3 = vec3(0.0);
      for (int j = -5; j <= 5; j++) {
        for (int i = -5; i <= 5; i++) {
          if (i < -r || i > r || j < -r || j > r) continue;
          vec3 c = texture2D(textureSampler, uv + vec2(float(i), float(j)) * texel).rgb;
          vec3 cc = c * c;
          if (i <= 0 && j <= 0) { m0 += c; s0 += cc; }
          if (i >= 0 && j <= 0) { m1 += c; s1 += cc; }
          if (i <= 0 && j >= 0) { m2 += c; s2 += cc; }
          if (i >= 0 && j >= 0) { m3 += c; s3 += cc; }
        }
      }
      float n = float((r + 1) * (r + 1));
      m0 /= n; m1 /= n; m2 /= n; m3 /= n;
      float v0 = dot(abs(s0 / n - m0 * m0), vec3(1.0));
      float v1 = dot(abs(s1 / n - m1 * m1), vec3(1.0));
      float v2 = dot(abs(s2 / n - m2 * m2), vec3(1.0));
      float v3 = dot(abs(s3 / n - m3 * m3), vec3(1.0));
      vec3 best = m0; float bv = v0;
      if (v1 < bv) { best = m1; bv = v1; }
      if (v2 < bv) { best = m2; bv = v2; }
      if (v3 < bv) { best = m3; bv = v3; }
      gl_FragColor = vec4(best, 1.0);
    }`;

  BABYLON.Effect.ShadersStore.inkFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform sampler2D depthSampler;
    uniform sampler2D normalSampler;
    uniform vec2 texel;
    uniform float ink;
    uniform float width;
    uniform float colorInk;
    uniform float nearDist;
    uniform float farInk;
    uniform vec3 inkColor;
    ${NOISE}
    void main(void) {
      vec3 col = texture2D(textureSampler, vUV).rgb;
      // depth = linear view z in metres; 0 means nothing drawn there (treat as far)
      float d = texture2D(depthSampler, vUV).r;
      float near = d > 0.0 ? clamp(nearDist / d, 0.0, 1.0) : 0.0;
      float w = mix(0.6, width, near);                 // line width shrinks with distance
      vec2 o = texel * w;
      vec3 nC = texture2D(normalSampler, vUV).rgb;
      float geo = 0.0;
      vec2 offs[4];
      offs[0] = vec2(o.x, 0.0); offs[1] = vec2(-o.x, 0.0); offs[2] = vec2(0.0, o.y); offs[3] = vec2(0.0, -o.y);
      for (int k = 0; k < 4; k++) {
        float dk = texture2D(depthSampler, vUV + offs[k]).r;
        vec3 nk = texture2D(normalSampler, vUV + offs[k]).rgb;
        float dd = (d > 0.0 && dk > 0.0) ? abs(dk - d) / min(d, dk) : (d > 0.0 || dk > 0.0 ? 1.0 : 0.0);
        geo = max(geo, smoothstep(0.03, 0.08, dd));
        geo = max(geo, smoothstep(0.35, 0.8, length(nk - nC)));
      }
      float tl = lum(texture2D(textureSampler, vUV + vec2(-o.x,  o.y)).rgb);
      float t  = lum(texture2D(textureSampler, vUV + vec2( 0.0,  o.y)).rgb);
      float tr = lum(texture2D(textureSampler, vUV + vec2( o.x,  o.y)).rgb);
      float l  = lum(texture2D(textureSampler, vUV + vec2(-o.x,  0.0)).rgb);
      float r  = lum(texture2D(textureSampler, vUV + vec2( o.x,  0.0)).rgb);
      float bl = lum(texture2D(textureSampler, vUV + vec2(-o.x, -o.y)).rgb);
      float b  = lum(texture2D(textureSampler, vUV + vec2( 0.0, -o.y)).rgb);
      float br = lum(texture2D(textureSampler, vUV + vec2( o.x, -o.y)).rgb);
      float sob = smoothstep(0.2, 0.5, length(vec2(-tl - 2.0 * l - bl + tr + 2.0 * r + br, -bl - 2.0 * b - br + tl + 2.0 * t + tr)));
      // a pen line is never perfectly even: break it up a little
      float pen = 0.75 + 0.25 * noise(vUV / texel / 3.0);
      float e = clamp(max(geo, sob * colorInk), 0.0, 1.0) * ink * mix(farInk, 1.0, near) * pen;
      gl_FragColor = vec4(mix(col, inkColor, clamp(e, 0.0, 1.0)), 1.0);
    }`;

  BABYLON.Effect.ShadersStore.watercolorFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    uniform sampler2D textureSampler;
    uniform sampler2D aquarelSampler;
    uniform vec2 resolution;
    uniform vec2 texel;
    uniform float useTex;
    uniform float texScale;
    uniform float texAmount;
    uniform float blendMode;
    uniform float wetEdge;
    uniform float granulation;
    uniform float palette;
    uniform float paletteMode;
    uniform float paper;
    uniform float paperEdge;
    ${NOISE}
    vec3 blendWith(vec3 base, vec3 t, float mode) {
      if (mode < 0.5) return base * t;                                            // multiply
      if (mode < 1.5) return mix(2.0 * base * t, 1.0 - 2.0 * (1.0 - base) * (1.0 - t), step(0.5, base)); // overlay
      return mix(2.0 * base * t + base * base * (1.0 - 2.0 * t), sqrt(base) * (2.0 * t - 1.0) + 2.0 * base * (1.0 - t), step(0.5, t)); // soft light
    }
    vec3 ramp(float l, float mode) {
      vec3 a, b, c;
      if (mode < 1.5) { a = vec3(0.08, 0.12, 0.20); b = vec3(0.23, 0.35, 0.49); c = vec3(0.88, 0.91, 0.93); } // indigo night
      else { a = vec3(0.18, 0.12, 0.08); b = vec3(0.52, 0.40, 0.28); c = vec3(0.95, 0.91, 0.82); }            // sepia day
      return l < 0.5 ? mix(a, b, smoothstep(0.0, 0.5, l)) : mix(b, c, smoothstep(0.5, 1.0, l));
    }
    void main(void) {
      vec2 p = vUV * resolution;
      vec3 c = texture2D(textureSampler, vUV).rgb;
      float lc = lum(c);

      // wet edges: pigment pools where a wash meets lighter paper -> darker rim just inside the darker area
      float lb = 0.0;
      for (int k = 0; k < 8; k++) {
        float a = float(k) * 0.785398;
        lb += lum(texture2D(textureSampler, vUV + vec2(cos(a), sin(a)) * texel * 6.0).rgb);
      }
      lb /= 8.0;
      c *= 1.0 - wetEdge * 0.45 * smoothstep(0.01, 0.12, lb - lc);

      // granulation: pigment settles in the paper's tooth, most visible in the darker washes
      float g = fbm(p / 1.7) - 0.5;
      c *= 1.0 + granulation * 0.5 * g * (1.0 - lc);

      // aquarelle texture: your scan (tiled) or the built-in stains + blooms
      vec3 t;
      if (useTex > 0.5) {
        t = texture2D(aquarelSampler, p / (512.0 * texScale)).rgb;
      } else {
        vec2 q = p / texScale;
        float stains = fbm(q / 160.0);
        float blooms = smoothstep(0.55, 0.75, fbm(q / 60.0 + 3.1)) * 0.5;
        float fibre = fbm(q / 3.0);
        t = vec3(0.80 + 0.22 * stains - 0.10 * blooms + 0.06 * (fibre - 0.5));
      }
      // overlay / soft light expect 0.5 = no change; a scan is ~0.9 on bare paper, so centre it there
      vec3 tb = blendMode < 0.5 ? t : clamp(t - 0.40, 0.0, 1.0);
      c = mix(c, blendWith(c, tb, blendMode), texAmount);

      // one palette over everything (2D and 3D alike)
      if (paletteMode > 0.5) c = mix(c, ramp(lum(c), paletteMode), palette);

      // paper grain
      c *= mix(1.0, 0.9 + 0.14 * fbm(p / 2.5), paper);

      // deckled paper edge: the wash stops short of the frame with a ragged border, like the reference
      if (paperEdge > 0.0) {
        float aspect = resolution.x / resolution.y;
        float e = min(min(vUV.x * aspect, (1.0 - vUV.x) * aspect), min(vUV.y, 1.0 - vUV.y));
        float rag = paperEdge * (0.02 + 0.03 * fbm(p / 14.0));
        c = mix(vec3(0.95, 0.94, 0.91), c, smoothstep(rag, rag + 0.004, e));
      }
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`;

  // ---------- controls ----------
  const $ = (id) => document.getElementById(id);
  const ui = {
    on: $('lookOn'), toon: $('lookToon'),
    wash: $('lookWash'), wobble: $('lookWobble'),
    ink: $('lookInk'), width: $('lookWidth'), colorInk: $('lookColorInk'), nearDist: $('lookNear'), farInk: $('lookFarInk'),
    wetEdge: $('lookWet'), granulation: $('lookGrain'),
    texAmount: $('lookTex'), texScale: $('lookTexScale'), blendMode: $('lookBlend'), texUpload: $('lookTexUpload'),
    palette: $('lookPalette'), paletteMode: $('lookPaletteMode'),
    paper: $('lookPaper'), paperEdge: $('lookEdge'),
  };
  const val = (el) => Number(el.value);
  let aquarelTex = null;
  const blankTex = new BABYLON.RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene);
  ui.texUpload.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (aquarelTex) aquarelTex.dispose();
    aquarelTex = new BABYLON.Texture(URL.createObjectURL(file), scene);
    aquarelTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
    aquarelTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  };

  // ---------- post chain ----------
  let chain = [];
  function buildChain() {
    chain.forEach((pp) => pp.dispose(camera));
    chain = [];
    if (!ui.on.checked) { scene.disableGeometryBufferRenderer(); return; }
    const gbr = scene.enableGeometryBufferRenderer();
    const gb = gbr.getGBuffer().textures;
    const depth = gb[gbr.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)];
    const normal = gb[gbr.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)];
    const texel = (pp) => new BABYLON.Vector2(1 / pp.width, 1 / pp.height);
    const res = (pp) => new BABYLON.Vector2(pp.width, pp.height);

    const wash = new BABYLON.PostProcess('wash', 'wash', ['texel', 'resolution', 'radius', 'wobble'], null, 1, camera);
    wash.onApply = (fx) => {
      fx.setVector2('texel', texel(wash)); fx.setVector2('resolution', res(wash));
      fx.setFloat('radius', val(ui.wash)); fx.setFloat('wobble', val(ui.wobble));
    };

    const inkPP = new BABYLON.PostProcess('ink', 'ink', ['texel', 'ink', 'width', 'colorInk', 'nearDist', 'farInk', 'inkColor'], ['depthSampler', 'normalSampler'], 1, camera);
    inkPP.onApply = (fx) => {
      fx.setVector2('texel', texel(inkPP));
      fx.setFloat('ink', val(ui.ink)); fx.setFloat('width', val(ui.width)); fx.setFloat('colorInk', val(ui.colorInk));
      fx.setFloat('nearDist', val(ui.nearDist)); fx.setFloat('farInk', val(ui.farInk));
      fx.setColor3('inkColor', new BABYLON.Color3(0.12, 0.13, 0.17));
      fx.setTexture('depthSampler', depth); fx.setTexture('normalSampler', normal);
    };

    const wc = new BABYLON.PostProcess('watercolor', 'watercolor',
      ['resolution', 'texel', 'useTex', 'texScale', 'texAmount', 'blendMode', 'wetEdge', 'granulation', 'palette', 'paletteMode', 'paper', 'paperEdge'],
      ['aquarelSampler'], 1, camera);
    wc.onApply = (fx) => {
      fx.setVector2('resolution', res(wc)); fx.setVector2('texel', texel(wc));
      fx.setFloat('useTex', aquarelTex ? 1 : 0);
      fx.setTexture('aquarelSampler', aquarelTex || blankTex);
      ['texScale', 'texAmount', 'blendMode', 'wetEdge', 'granulation', 'palette', 'paletteMode', 'paper', 'paperEdge']
        .forEach((k) => fx.setFloat(k, val(ui[k])));
    };
    chain = [wash, inkPP, wc];
  }

  // ---------- toon (cel) materials on every 3D model, including ones added later ----------
  // backdrop silhouettes and the sky stay flat: they are cut-out planes, not lit objects
  const skip = (m) => m.name === 'hitbox' || m.name === 'ground' || m.name.startsWith('sky') || m.name.startsWith('backdrop') || m.name === 'decal'
    || !m.material || m.getTotalVertices() === 0;
  function toCel(mesh) {
    if (mesh.metadata && mesh.metadata.cel) { mesh.material = mesh.metadata.cel; return; }
    const old = mesh.material;
    const cel = new BABYLON.CellMaterial(old.name + '_cel', scene);
    cel.computeHighLevel = true;
    cel.diffuseTexture = old.albedoTexture || old.diffuseTexture || null;
    const color = old.albedoColor || old.diffuseColor;
    if (color) cel.diffuseColor = color.clone();
    cel.backFaceCulling = old.backFaceCulling;
    mesh.metadata = { ...(mesh.metadata || {}), original: old, cel };
    mesh.material = cel;
  }
  function applyToon() {
    const want = ui.on.checked && ui.toon.checked;
    scene.meshes.forEach((m) => {
      if (skip(m)) return;
      const isCel = m.material instanceof BABYLON.CellMaterial;
      if (want && !isCel) toCel(m);
      if (!want && isCel && m.metadata && m.metadata.original) m.material = m.metadata.original;
    });
  }
  let tick = 0;
  scene.onAfterRenderObservable.add(() => { if (++tick % 20 === 0) applyToon(); });

  // ---------- presets ----------
  const PRESETS = {
    'Indigo night (Figma)': { wash: 2, wobble: 0.6, ink: 0.9, width: 1.1, colorInk: 0.45, nearDist: 14, farInk: 0.3, wetEdge: 0.7, granulation: 0.7, texAmount: 0.8, texScale: 1, blendMode: 0, palette: 0.85, paletteMode: 1, paper: 0.5, paperEdge: 0.6 },
    'Sepia day': { wash: 2, wobble: 0.5, ink: 1, width: 1.2, colorInk: 0.5, nearDist: 14, farInk: 0.3, wetEdge: 0.6, granulation: 0.6, texAmount: 0.7, texScale: 1, blendMode: 2, palette: 0.6, paletteMode: 2, paper: 0.5, paperEdge: 0.4 },
    'Natural colour': { wash: 2, wobble: 0.4, ink: 0.9, width: 1, colorInk: 0.4, nearDist: 14, farInk: 0.35, wetEdge: 0.5, granulation: 0.5, texAmount: 0.6, texScale: 1, blendMode: 0, palette: 0, paletteMode: 0, paper: 0.4, paperEdge: 0.3 },
  };
  const presetSel = $('lookPreset');
  Object.keys(PRESETS).forEach((name) => presetSel.add(new Option(name, name)));
  presetSel.onchange = () => {
    const p = PRESETS[presetSel.value];
    Object.entries(p).forEach(([k, v]) => { ui[k].value = v; });
  };

  ui.on.onchange = () => { buildChain(); applyToon(); };
  ui.toon.onchange = applyToon;
  presetSel.value = 'Indigo night (Figma)';
  presetSel.onchange();
  buildChain();
  applyToon();
  window.__look = { buildChain, applyToon, PRESETS };
})();
