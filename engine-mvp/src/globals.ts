// The engine modules were written against Babylon's CDN globals (BABYLON, earcut, Mp4Muxer). The same
// packages now come from npm at pinned versions and are exposed under the same names, so the engine
// runs unchanged while React takes over the chrome around it.
// The lab/studio entries import this file; the stage itself only needs globals-core.ts.
import './globals-core'
import '@babylonjs/loaders/glTF'
import * as Mp4Muxer from 'mp4-muxer'

Object.assign(window, { Mp4Muxer })
