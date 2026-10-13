// Storybook look (target: Figma "History Portal" 1915:111, a watercolour night sea).
// One post chain over the WHOLE frame, so sky, silhouette planes and 3D models share one style:
//   1 wash        flat colour washes; edges wobble with world-anchored noise
//   2 ink         pen lines from depth/normal/colour edges; thinner and lighter with distance
//   3 watercolour wet edges, stains, blooms, granulation, paper fibre (all 3D Perlin on world positions),
//                 an optional texture projected triplanar in world space, one palette, a ragged paper border
// Nothing texture-like is tied to the screen, so camera moves never make the paint slide. GLSL: look-shaders.js.
/* global BABYLON */
'use strict';

(() => {
  const mvp = window.__mvp;
  const scene = mvp.scene;
  const camera = mvp.camera;
  const SKY_DEPTH = 450; // metres assumed where nothing was drawn

  // ---------- controls ----------
  const $ = (id) => document.getElementById(id);
  const ui = {
    on: $('lookOn'), toon: $('lookToon'), time: $('lookTime'), darkness: $('lookInkDark'), outline: $('lookOutline'),
    inkOpacity: $('lookInkOpacity'), inkBlend: $('lookInkBlend'), paintOver: $('lookPaintOver'),
    wash: $('lookWash'), wobble: $('lookWobble'),
    ink: $('lookInk'), width: $('lookWidth'), colorInk: $('lookColorInk'), nearDist: $('lookNear'), farInk: $('lookFarInk'),
    wetEdge: $('lookWet'), granulation: $('lookGrain'), stains: $('lookStains'), blooms: $('lookBlooms'), dark: $('lookDark'),
    texAmount: $('lookTex'), texScale: $('lookTexScale'), blendMode: $('lookBlend'), texUpload: $('lookTexUpload'),
    palette: $('lookPalette'), paletteMode: $('lookPaletteMode'),
    paper: $('lookPaper'), paperEdge: $('lookEdge'),
  };
  const val = (el) => Number(el.value);
  let aquarelTex = null;
  const blankTex = new BABYLON.RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene);
  function useTexture(url) {
    if (aquarelTex) aquarelTex.dispose();
    aquarelTex = null;
    if (url) {
      aquarelTex = new BABYLON.Texture(url, scene);
      aquarelTex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
      aquarelTex.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
    }
    document.querySelectorAll('#texList img, #texList span').forEach((el) => el.classList.toggle('on', (el.dataset.url || '') === (url || '')));
  }
  ui.texUpload.onchange = (e) => { const file = e.target.files[0]; if (file) useTexture(URL.createObjectURL(file)); };

  // texture picker: "None" (procedural paint only) plus every texture prepared by tools/make_textures.py
  const texList = $('texList');
  const builtIn = document.createElement('span');
  builtIn.textContent = 'None';
  builtIn.dataset.url = '';
  builtIn.className = 'tex-chip on';
  builtIn.onclick = () => useTexture(null);
  texList.appendChild(builtIn);
  fetch('assets/textures/textures.json').then((r) => (r.ok ? r.json() : [])).then((names) => {
    names.forEach((name) => {
      const img = document.createElement('img');
      img.src = 'assets/textures/' + name + '.png';
      img.dataset.url = img.src;
      img.title = name;
      img.onclick = () => useTexture(img.src);
      texList.appendChild(img);
    });
  }).catch(() => { /* no prepared textures yet: the built-in one stays */ });

  // ---------- post chain ----------
  let chain = [];
  let gbrFilter = null;
  function buildChain() {
    chain.forEach((pp) => pp.dispose(camera));
    chain = [];
    if (!ui.on.checked) { scene.disableGeometryBufferRenderer(); return; }
    const gbr = scene.enableGeometryBufferRenderer();
    // sky cards (clouds) and painted plates (metadata.noGBuffer) stay out of depth/normals: their edges would get ink
    if (!gbrFilter) gbrFilter = scene.onBeforeRenderObservable.add(() => {
      if (scene.geometryBufferRenderer) scene.geometryBufferRenderer.renderList = scene.meshes.filter((m) => m.name !== 'sky-cloud' && !(m.metadata && m.metadata.noGBuffer));
    });
    const gb = gbr.getGBuffer().textures;
    const depth = gb[gbr.getTextureIndex(BABYLON.GeometryBufferRenderer.DEPTH_TEXTURE_TYPE)];
    const normal = gb[gbr.getTextureIndex(BABYLON.GeometryBufferRenderer.NORMAL_TEXTURE_TYPE)];
    const texel = (pp) => new BABYLON.Vector2(1 / pp.width, 1 / pp.height);
    // what every pass needs to rebuild world positions from depth
    const invView = new BABYLON.Matrix();
    const WORLD_UNIFORMS = ['invView', 'tanHalf', 'resolution', 'skyDepth'];
    const WORLD_SAMPLERS = ['depthSampler', 'normalSampler'];
    function setWorld(fx, pp) {
      camera.getViewMatrix().invertToRef(invView);
      const ty = Math.tan(camera.fov / 2);
      fx.setMatrix('invView', invView);
      fx.setVector2('tanHalf', new BABYLON.Vector2(ty * pp.width / pp.height, ty));
      fx.setVector2('resolution', new BABYLON.Vector2(pp.width, pp.height));
      fx.setFloat('skyDepth', SKY_DEPTH);
      fx.setTexture('depthSampler', depth);
      fx.setTexture('normalSampler', normal);
    }

    const wash = new BABYLON.PostProcess('wash', 'wash', ['texel', 'radius', ...WORLD_UNIFORMS], WORLD_SAMPLERS, 1, camera);
    wash.onApply = (fx) => {
      setWorld(fx, wash);
      fx.setVector2('texel', texel(wash));
      fx.setFloat('radius', val(ui.wash));
    };


    const PAINT = ['texScale', 'texAmount', 'blendMode', 'stains', 'blooms', 'dark', 'wetEdge', 'granulation', 'palette', 'paletteMode', 'paper', 'paperEdge'];
    const wc = new BABYLON.PostProcess('watercolor', 'watercolor', ['texel', 'useTex', ...PAINT, ...WORLD_UNIFORMS],
      ['aquarelSampler', ...WORLD_SAMPLERS], 1, camera);
    wc.onApply = (fx) => {
      setWorld(fx, wc);
      fx.setVector2('texel', texel(wc));
      fx.setFloat('useTex', aquarelTex ? 1 : 0);
      fx.setTexture('aquarelSampler', aquarelTex || blankTex);
      PAINT.forEach((k) => fx.setFloat(k, val(ui[k])));
    };
    // ink last: over the finished watercolour, so lines stay black; colour edges come from the clean wash
    const inkPP = new BABYLON.PostProcess('ink', 'ink',
      ['texel', 'ink', 'width', 'colorInk', 'nearDist', 'farInk', 'inkColor', 'wobble', 'darkness', 'outline', 'paperEdge', 'inkOpacity', 'inkBlend', 'paintOver', ...WORLD_UNIFORMS],
      ['washSampler', ...WORLD_SAMPLERS], 1, camera);
    inkPP.onApply = (fx) => {
      setWorld(fx, inkPP);
      fx.setTextureFromPostProcessOutput('washSampler', wash);
      fx.setVector2('texel', texel(inkPP));
      fx.setFloat('ink', val(ui.ink)); fx.setFloat('width', val(ui.width)); fx.setFloat('colorInk', val(ui.colorInk));
      fx.setFloat('nearDist', val(ui.nearDist)); fx.setFloat('farInk', val(ui.farInk)); fx.setFloat('wobble', val(ui.wobble));
      fx.setFloat('darkness', val(ui.darkness)); fx.setFloat('outline', val(ui.outline));
      fx.setFloat('paperEdge', val(ui.paperEdge));
      fx.setFloat('inkOpacity', val(ui.inkOpacity)); fx.setFloat('inkBlend', val(ui.inkBlend)); fx.setFloat('paintOver', val(ui.paintOver));
      fx.setColor3('inkColor', new BABYLON.Color3(0.16, 0.17, 0.22));
    };
    chain = [wash, wc, inkPP];
  }

  // ---------- toon (cel) materials on every 3D model, including ones added later ----------
  // backdrop silhouettes and the sky stay flat: they are cut-out planes, not lit objects
  const skip = (m) => m.name === 'hitbox' || m.name === 'ground' || m.name.startsWith('sky') || m.name.startsWith('backdrop') || m.name === 'decal'
    || !m.material || m.material instanceof BABYLON.ShaderMaterial || m.getTotalVertices() === 0; // buildings: own toon shader
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
    'Night': { time: 0, inkOpacity: 0.85, inkBlend: 2, paintOver: 0.3, wash: 2, wobble: 0.6, ink: 0.9, width: 1.1, colorInk: 0.45, nearDist: 14, farInk: 0.3, wetEdge: 0.7, stains: 0.8, dark: 0.6, blooms: 0.6, granulation: 0.7, texAmount: 0.6, texScale: 4, blendMode: 0, paper: 0.6, paperEdge: 0.6 },
    'Day': { time: 1, inkOpacity: 0.85, inkBlend: 2, paintOver: 0.35, wash: 2, wobble: 0.5, ink: 0.9, width: 1.1, colorInk: 0.4, nearDist: 14, farInk: 0.3, wetEdge: 0.55, stains: 0.6, dark: 0.45, blooms: 0.5, granulation: 0.5, texAmount: 0.5, texScale: 4, blendMode: 0, paper: 0.5, paperEdge: 0.5 },
    'Indigo night (Figma)': { wash: 2, wobble: 0.6, ink: 0.9, width: 1.1, colorInk: 0.45, nearDist: 14, farInk: 0.3, wetEdge: 0.7, stains: 0.8, dark: 0.6, blooms: 0.6, granulation: 0.7, texAmount: 0.6, texScale: 4, blendMode: 0, palette: 0.85, paletteMode: 1, paper: 0.6, paperEdge: 0.6 },
    'Sepia day': { wash: 2, wobble: 0.5, ink: 1, width: 1.2, colorInk: 0.5, nearDist: 14, farInk: 0.3, wetEdge: 0.6, stains: 0.7, dark: 0.5, blooms: 0.5, granulation: 0.6, texAmount: 0.6, texScale: 4, blendMode: 2, palette: 0.6, paletteMode: 2, paper: 0.6, paperEdge: 0.4 },
    'Natural colour': { wash: 2, wobble: 0.4, ink: 0.9, width: 1, colorInk: 0.4, nearDist: 14, farInk: 0.35, wetEdge: 0.5, stains: 0.6, dark: 0.45, blooms: 0.4, granulation: 0.5, texAmount: 0.5, texScale: 4, blendMode: 0, palette: 0, paletteMode: 0, paper: 0.5, paperEdge: 0.3 },
  };
  // ---------- time of day: night (indigo wash, dim) <-> day (natural greens, blue sky, bright sun) ----------
  const NIGHT = { palette: 0.85, sun: 0.55, hemi: 0.28, ground: '#4c5466' };
  const DAY = { palette: 0, sun: 1.7, hemi: 0.7, ground: '#6f8f4e' };
  const lerp = (a, b, t) => a + (b - a) * t;
  const sunLight = scene.lights.find((l) => l instanceof BABYLON.DirectionalLight);
  const hemiLight = scene.lights.find((l) => l instanceof BABYLON.HemisphericLight);
  function applyTime(t) {
    ui.time.value = t;
    ui.paletteMode.value = 1;                                   // indigo ramp, faded out towards day
    ui.palette.value = lerp(NIGHT.palette, DAY.palette, t);
    if (sunLight) {
      sunLight.intensity = lerp(NIGHT.sun, DAY.sun, t);
      sunLight.diffuse = BABYLON.Color3.Lerp(new BABYLON.Color3(0.65, 0.72, 1), new BABYLON.Color3(1, 0.97, 0.9), t); // moonlight -> sun
    }
    if (hemiLight) hemiLight.intensity = lerp(NIGHT.hemi, DAY.hemi, t);
    const g = BABYLON.Color3.Lerp(BABYLON.Color3.FromHexString(NIGHT.ground), BABYLON.Color3.FromHexString(DAY.ground), t);
    const grid = scene.getMaterialByName('grid');
    const plain = scene.getMaterialByName('plain');
    if (grid) { grid.mainColor = g; grid.lineColor = g.scale(1.25); }
    if (plain) plain.diffuseColor = g;
    if (window.__backdrop) window.__backdrop.setDayness(t);
    if (window.__clouds) window.__clouds.setDayness(t);
  }
  let fade = null;
  function fadeTime(to, ms = 2000) {
    if (fade) scene.onBeforeRenderObservable.remove(fade);
    const from = val(ui.time);
    const start = performance.now();
    fade = scene.onBeforeRenderObservable.add(() => {
      const k = Math.min(1, (performance.now() - start) / ms);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease in-out: dusk/dawn, not a switch
      applyTime(lerp(from, to, e));
      if (k >= 1) { scene.onBeforeRenderObservable.remove(fade); fade = null; }
    });
  }
  // a time set by hand (or by a saved scene, or the crew) wins over a preset's fade still running
  ui.time.oninput = () => {
    if (fade) { scene.onBeforeRenderObservable.remove(fade); fade = null; }
    applyTime(val(ui.time));
  };

  const presetSel = $('lookPreset');
  Object.keys(PRESETS).forEach((name) => presetSel.add(new Option(name, name)));
  presetSel.onchange = () => {
    const p = PRESETS[presetSel.value];
    Object.entries(p).forEach(([k, v]) => { if (k !== 'time') ui[k].value = v; });
    if ('time' in p) fadeTime(p.time); // night and day fade into each other
  };

  ui.on.onchange = () => { buildChain(); applyToon(); };
  ui.toon.onchange = applyToon;
  presetSel.value = 'Night';
  presetSel.onchange();
  buildChain();
  applyToon();
  window.__look = { buildChain, applyToon, PRESETS };
})();
