// The engine modules were written against Babylon's CDN globals (BABYLON, earcut, Mp4Muxer). The same
// packages now come from npm at pinned versions and are exposed under the same names, so the engine
// runs unchanged while React takes over the chrome around it.
// The lab/studio entries import this file; the stage itself only needs globals-core.ts.
import './globals-core'
import * as core from '@babylonjs/core'
import * as materials from '@babylonjs/materials'
// Babylon 9 loads material shaders on demand; under Vite that fetch gets index.html and the grid never compiles
import '@babylonjs/materials/grid/grid.vertex'
import '@babylonjs/materials/grid/grid.fragment'
import '@babylonjs/loaders/glTF'
import * as Mp4Muxer from 'mp4-muxer'

Object.assign(window, { BABYLON: { ...core, ...materials }, Mp4Muxer })
