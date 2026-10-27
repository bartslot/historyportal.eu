// The storybook post chain (wash -> watercolour -> ink, GLSL in look-shaders.js) as one function, so the studio
// (look.js, values from its sliders) and the 2.5D stage (src/stage25d, values from the lesson) draw the same look.
//   createLookChain(scene, camera, { num(name), inkColor(), texture() })  ->  { dispose() }
//   num(name): the current value of a look number (read every frame, so live edits show at once)
/* global BABYLON */
'use strict';
import { animeMask } from './anime-cast';

const SKY_DEPTH = 450; // metres assumed where nothing was drawn
export const PAINT = ['texScale', 'texAmount', 'blendMode', 'stains', 'blooms', 'dark', 'wetEdge', 'granulation', 'palette', 'paletteMode', 'paper', 'paperEdge'];
export const INK = ['ink', 'width', 'colorInk', 'nearDist', 'farInk', 'wobble', 'darkness', 'outline', 'paperEdge', 'inkOpacity', 'inkBlend', 'paintOver'];
// line colours before 'Ink darkness' pulls them toward black; 'pencil' = STYLE.md's thin brown-grey pencil
export const INK_COLORS = { 'blue-grey': [0.16, 0.17, 0.22], pencil: [0.42, 0.35, 0.29], sepia: [0.35, 0.24, 0.16], graphite: [0.3, 0.3, 0.32] };

export function createLookChain(scene, camera, src) {
  const blankTex = new BABYLON.RawTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene);
  const blankBlack = new BABYLON.RawTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, BABYLON.Engine.TEXTUREFORMAT_RGBA, scene); // no anime actors
  const gbr = scene.enableGeometryBufferRenderer();
  // sky cards (clouds) and painted plates/layers (metadata.noGBuffer) stay out of depth/normals: their edges would get ink
  const gbrFilter = scene.onBeforeRenderObservable.add(() => {
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
    fx.setFloat('radius', src.num('wash'));
  };
  const wc = new BABYLON.PostProcess('watercolor', 'watercolor', ['texel', 'useTex', ...PAINT, ...WORLD_UNIFORMS],
    ['aquarelSampler', ...WORLD_SAMPLERS], 1, camera);
  wc.onApply = (fx) => {
    setWorld(fx, wc);
    fx.setVector2('texel', texel(wc));
    const tex = src.texture();
    fx.setFloat('useTex', tex ? 1 : 0);
    fx.setTexture('aquarelSampler', tex || blankTex);
    PAINT.forEach((k) => fx.setFloat(k, src.num(k)));
  };
  // ink last: over the finished watercolour, so lines stay black; colour edges come from the clean wash
  const inkPP = new BABYLON.PostProcess('ink', 'ink', ['texel', 'inkColor', ...INK, ...WORLD_UNIFORMS],
    ['washSampler', 'animeSampler', ...WORLD_SAMPLERS], 1, camera);
  inkPP.onApply = (fx) => {
    setWorld(fx, inkPP);
    fx.setTextureFromPostProcessOutput('washSampler', wash);
    fx.setTexture('animeSampler', animeMask(scene) || blankBlack);
    fx.setVector2('texel', texel(inkPP));
    INK.forEach((k) => fx.setFloat(k, src.num(k)));
    fx.setColor3('inkColor', BABYLON.Color3.FromArray(INK_COLORS[src.inkColor()] || INK_COLORS['blue-grey']));
  };
  const chain = [wash, wc, inkPP];
  return {
    dispose() {
      chain.forEach((pp) => pp.dispose(camera));
      scene.onBeforeRenderObservable.remove(gbrFilter);
      scene.disableGeometryBufferRenderer();
      blankTex.dispose(); blankBlack.dispose();
    },
  };
}
