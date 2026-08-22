// Lazy-loaded bundle for the 3D lesson-scene system (three.js). app.js exposes
// window.loadLessonScene() which dynamically imports this module, so three (~1.7 MB) is only
// downloaded on the lesson-creation wizard — never on the landing page or other app pages.
export { SceneOverlay } from './SceneOverlay.js';
export { SceneTimelinePlayer } from './SceneTimelinePlayer.js';
export { GameTimerOverlay } from './GameTimerOverlay.js';
export { QuizOverlay } from './QuizOverlay.js';
export { TextOverlayLayer } from './TextOverlayLayer.js';
// layersIdentity belongs on the PUBLIC surface, not just in the module: step3-scene-configurator
// reaches for it through window.LessonScene (which is this module), and a function that exists in
// the file but not here is a TypeError at the call site with a perfectly good definition sitting
// three files away.
export { ArtworkOverlay, artObjId, layersSignature, layersIdentity, normalizeLayer } from './ArtworkOverlay.js';
export { mountWizardScene } from './wizard-bridge.js';
export { BackgroundMusic, createBackgroundMusic } from './background-music.js';
export { Sfx } from './sfx.js';
