// What the stage and its look chain need on window: Babylon core + materials and earcut. No glTF loader and no
// mp4 muxer (those are the lab's: globals.ts), so the Laravel editor/player chunk does not carry them.
import * as core from '@babylonjs/core'
import * as materials from '@babylonjs/materials'
import earcut from 'earcut'

Object.assign(window, { BABYLON: { ...core, ...materials }, earcut })
