// What the stage's look chain (engine/look-chain.js, look-shaders.js) reads from window.BABYLON, plus earcut, each
// from its own module path: `import * as core from '@babylonjs/core'` here put the whole engine in the editor and
// player's Babylon chunk (8.4 MB). The lab and studio (globals.ts) add the rest of Babylon on top.
import { Engine } from '@babylonjs/core/Engines/engine'
import { Effect } from '@babylonjs/core/Materials/effect'
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { Matrix, Vector2 } from '@babylonjs/core/Maths/math.vector'
import { PostProcess } from '@babylonjs/core/PostProcesses/postProcess'
import { GeometryBufferRenderer } from '@babylonjs/core/Rendering/geometryBufferRenderer'
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent'   // scene.enableGeometryBufferRenderer()
import earcut from 'earcut'

const w = window as any
w.BABYLON = { ...w.BABYLON, Color3, Effect, Engine, GeometryBufferRenderer, Matrix, PostProcess, RawTexture, Vector2 }
w.earcut = earcut
