/** Where the stage25d bundles are served from: storage/app/public/library/<bundle>/ (never touched by deploys). */
export const LIBRARY_BASE = '/storage/library'

export const libraryUrl = (bundle) => `${LIBRARY_BASE}/${encodeURIComponent(bundle)}/library.json`

/** A scene that plays the Babylon stage: kind 'stage25d' with its block. */
export const isStage25d = (scene) => scene?.kind === 'stage25d' && !!scene.config?.stage25d
