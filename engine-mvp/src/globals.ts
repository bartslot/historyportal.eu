// The engine modules were written against Babylon's CDN globals (BABYLON, earcut, Mp4Muxer). The same
// packages now come from npm at pinned versions and are exposed under the same names, so the engine
// runs unchanged while React takes over the chrome around it.
import * as core from '@babylonjs/core'
import * as materials from '@babylonjs/materials'
import '@babylonjs/loaders/glTF'
import earcut from 'earcut'
import * as Mp4Muxer from 'mp4-muxer'

Object.assign(window, { BABYLON: { ...core, ...materials }, earcut, Mp4Muxer })
