/** Where the stage25d bundles are served from: storage/app/public/library/<bundle>/ (never touched by deploys). */
export const LIBRARY_BASE = '/storage/library'

// ?v= from the page's <meta name="library-version"> (LibraryBundle::version): the host's proxy cache ignores no-cache
const libraryVersion = () => (typeof document !== 'undefined' && document.querySelector('meta[name="library-version"]')?.content) || ''
export const libraryUrl = (bundle) => `${LIBRARY_BASE}/${encodeURIComponent(bundle)}/library.json${libraryVersion() ? `?v=${libraryVersion()}` : ''}`

/** A scene that plays the Babylon stage: kind 'stage25d' with its block. */
export const isStage25d = (scene) => scene?.kind === 'stage25d' && !!scene.config?.stage25d
