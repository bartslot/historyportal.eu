/**
 * lesson-player.js — Game loop engine for /lesson/{code}
 *
 * Phases:  LOADING → TITLE_SCREEN → INTRO → GAME_BRIEF → GAME_ACTIVE → TIME_UP
 * Special: INTEL_DROP overlays during GAME_ACTIVE and extends the timer.
 *
 * LLM script tags parsed from lesson.script:
 *   [position:bottom-right]  — move avatar to preset
 *   [position:left-centre]
 *   [position:middle]
 *   [position:right-centre]
 *   [game]                   — transition to GAME_BRIEF → GAME_ACTIVE
 *   [intel_drop]             — trigger INTEL_DROP mid-game
 */

import Alpine from 'alpinejs'
import QRCode from 'qrcode'
import { resolveAnchorTime, pickShotIndex } from './scene/shot-sync.js'
import { buildChapters, canSeek, reachedFurther, chapterTooltip, formatClock, formatMinutes } from './scene/chapter-timeline.js'
import { createTelemetry } from './lesson-telemetry.js'
import { renderGallery } from './gallery-scene.js'
import { stageAdvance, stageFloorMs } from './scene/stage-auto.js'
import { isTopAnchored, normalizeFit, PORTRAIT_TOP_CSS } from './scene/background-fit.js'
import { isClipartLayer } from './scene/layer-filters.js'
import { fitToPlate, plateAspect } from './scene/plate-box.js'
import { mountEmbedBg } from './scene/embed-bg.js'
import { sameOriginMediaUrl } from './media-url.js'
import { sceneTransitionFrames, easingBezier, EASINGS } from './scene/animations.js'
import { readProgress, saveProgress, clearProgress, canResume, safeStorage } from './scene/progress-store.js'
import { crewText, readCrew, saveCrew, clearCrew, readBest, saveBest } from './scene/race.js'

// Easing key → cubic-bezier, for the scene transition set in the wizard's Animate tab.
// Player chrome idle timing (Bart 2026-10-14: "auto hide when the mouse doesn't move after 1
// second"). Fade in fast, fade out slower: appearing answers the hand, leaving should not snap.
// The bands are where the top bar and the deck sit. Live knobs: Test tools → Settings → Player.
const CHROME_IDLE = { idleMs: 1000, fadeInMs: 150, fadeOutMs: 400, topBandPx: 88, bottomBandPx: 176 }

const SCENE_EASINGS = Object.fromEntries(EASINGS.map(e => [e.key, easingBezier(e.key)]))

// How long the challenge clock owns the middle of the stage before it shrinks to the corner HUD.
const BIG_TIMER_MS = 5000
// Two minutes left turns the clock red. `text-warning` IS amber-400, the shade the corner HUD
// uses — the same number in the same colour, whichever of the two places it is being read in.
const BIG_TIMER_RED_FROM_SECS = 120
const BIG_TIMER_DIGIT = (secs) =>
  `font-history text-[20vw] ${secs <= BIG_TIMER_RED_FROM_SECS ? 'text-error' : 'text-warning'}`
import { cueAt } from './scene/captions.js'
import { translatedCues } from './scene/caption-menu.js'
import { captionPanel } from './scene/caption-panel.js'
import { createBackgroundMusic } from './scene/background-music.js'
import { Sfx } from './scene/sfx.js'
import { captionVisible } from './scene/SceneOverlay.js'
import { gradientCss } from './scene/background-gradient.js'
import { t } from './i18n.js'
import { mountBigCountdown } from './big-countdown.js'
import { mountTitlePoster as mountPoster, posterFit } from './title-poster.js'
import { QR, qrOptions, layoutTitleQr, drawQrDebug, coverRect, frameRect, pictureSize } from './title-qr.js'
import { placeExpectStrip, fitExpectLines } from './title-expect.js'
import { FIT, FIT_START, collisions, nextFit, bandHeight, barShift, scaleBoxAbout, titlePieces } from './title-fit.js'

/**
 * Where the drawing in an image starts and ends across, as fractions of its width ([0, 1] when it
 * cannot be read). For fitting text to a wordmark's letters rather than to its file's box.
 */
function inkSpan (img) {
  return new Promise((resolve) => {
    const read = () => {
      try {
        const w = 400
        const h = Math.max(1, Math.round(w * img.naturalHeight / img.naturalWidth))
        const c = Object.assign(document.createElement('canvas'), { width: w, height: h })
        const g = c.getContext('2d')
        g.drawImage(img, 0, 0, w, h)
        const px = g.getImageData(0, 0, w, h).data
        let lo = w
        let hi = -1
        for (let x = 0; x < w; x++) {
          for (let y = 0; y < h; y++) {
            if (px[(y * w + x) * 4 + 3] > 32) { lo = Math.min(lo, x); hi = Math.max(hi, x); break }
          }
        }
        resolve(hi > lo ? [lo / w, (hi + 1) / w] : [0, 1])
      } catch (_) { resolve([0, 1]) }
    }
    if (img?.complete && img.naturalWidth) read()
    else if (img) img.addEventListener('load', read, { once: true })
    else resolve([0, 1])
  })
}

// The 3D avatar CHARACTER is retired — the narrator is a flat 2D portrait badge (player.blade.php).
// The 3D SKYBOX background stays an OPT-IN: a lesson with any scene_view:'skybox' scene lazy-loads
// the Three.js chunk (avatar-3d.js, via the dynamic import in _initBgScene) for the skybox; pure-2D
// lessons never download it. `this._usesSkybox` (set in init from the scenes) is that runtime switch.

// ── Avatar canvas position presets ───────────────────────────────────────────
// Each preset is a CSS class set applied to the #avatar-wrap element.
// The inner Three.js scene always fills the wrapper; we just move the wrapper.
const AVATAR_POSITIONS = {
  'bottom-right':  'absolute bottom-0 right-0 w-[38vw] max-w-[500px] translate-y-4',
  'left-centre':   'absolute top-1/2 left-0 w-[32vw] max-w-[420px] -translate-y-1/2',
  'middle':        'absolute top-1/2 left-1/2 w-[32vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2',
  'right-centre':  'absolute top-1/2 right-0 w-[32vw] max-w-[420px] -translate-y-1/2',
}

const DEFAULT_POSITION = 'bottom-right'

// Longest a scene will wait for its layers to animate out. A layer may carry a 10s delay, and a
// class must not sit on a finished scene that long because one icon leaves late.
const MAX_EXIT_WAIT_MS = 4000

// ── Ken Burns helper ──────────────────────────────────────────────────────────
// Ken Burns: scale from 110% → 105% while panning corner-to-corner.
// Using CSS scale() + translate() so background-size stays 'cover' (no black bars).
// Each direction pair: start scale/position → end scale/position.
const KB_DIRECTIONS = [
  { fromScale: 1.10, fromX:  2, fromY:  2, toScale: 1.05, toX: -2, toY: -2 }, // top-right → bottom-left
  { fromScale: 1.10, fromX: -2, fromY:  2, toScale: 1.05, toX:  2, toY: -2 }, // top-left  → bottom-right
  { fromScale: 1.10, fromX:  2, fromY: -2, toScale: 1.05, toX: -2, toY:  2 }, // bottom-right → top-left
  { fromScale: 1.10, fromX: -2, fromY: -2, toScale: 1.05, toX:  2, toY:  2 }, // bottom-left  → top-right
  { fromScale: 1.10, fromX:  0, fromY:  2, toScale: 1.05, toX:  0, toY: -2 }, // top-centre  → bottom-centre
]

// Teacher-selectable Ken Burns moves (scenes.kb_direction). null/'auto' rotates the classic set.
const KB_NAMED = {
  left_right: { fromScale: 1.08, fromX: -2.5, fromY: 0, toScale: 1.08, toX:  2.5, toY: 0 },
  right_left: { fromScale: 1.08, fromX:  2.5, fromY: 0, toScale: 1.08, toX: -2.5, toY: 0 },
  zoom_in:    { fromScale: 1.02, fromX:  0,   fromY: 0, toScale: 1.12, toX:  0,   toY: 0 },
  zoom_out:   { fromScale: 1.12, fromX:  0,   fromY: 0, toScale: 1.02, toX:  0,   toY: 0 },
}

function pickKbDirection (index, named = null) {
  if (named && KB_NAMED[named]) return KB_NAMED[named]
  return KB_DIRECTIONS[index % KB_DIRECTIONS.length]
}

// ── Script tag parser ─────────────────────────────────────────────────────────
// Returns sorted array of { time: seconds, type, value }
function parseScriptTags (script, audioDuration) {
  if (!script || !audioDuration) return []

  const events = []
  // Strip tags and count plain chars to estimate timestamp
  const plainText = script.replace(/\[[^\]]+\]/g, '')
  const totalChars = plainText.length

  let charPos = 0
  const tokenRegex = /(\[[^\]]+\]|[^\[]+)/g
  let m

  while ((m = tokenRegex.exec(script)) !== null) {
    const token = m[1]
    if (token.startsWith('[')) {
      const inner = token.slice(1, -1)
      const estimatedTime = (charPos / totalChars) * audioDuration

      if (inner.startsWith('position:')) {
        events.push({ time: estimatedTime, type: 'position', value: inner.replace('position:', '') })
      } else if (inner === 'game') {
        events.push({ time: estimatedTime, type: 'game', value: null })
      } else if (inner === 'intel_drop') {
        events.push({ time: estimatedTime, type: 'intel_drop', value: null })
      }
    } else {
      charPos += token.replace(/\s+/g, '').length
    }
  }

  return events.sort((a, b) => a.time - b.time)
}

// ── Module-level Avatar3D instance ───────────────────────────────────────────
// Three.js objects contain non-configurable properties (modelViewMatrix etc.) that
// break when stored inside Alpine's reactive Proxy. Keep the instance here, outside
// Alpine's data object, and access it via closure.
let _bgInstance     = null   // background-only Avatar3DPlayer (skybox, no character)
let _bgCanvas       = null   // module-level ref so both Alpine instances share it
let _sceneQueue     = []   // [{kind, config, audio_url, script, image_url, alignment}] for scene-based playback
let _mapInstance    = null   // MapLibre map block instance (lives outside Alpine's proxy)
let _mapTimer       = null   // timed-mode auto-advance timer
let _voyageInstance = null   // voyage tour instance (kind 'voyage'; outside Alpine's proxy)
let _galleryInstance = null  // gallery slideshow instance (kind 'gallery'; outside Alpine's proxy)
const FURTHEST_STEP_SECONDS = 0.5  // how far narration runs before the chapter bar's furthest point moves
let _autoAdvanceRaf = null    // voyage auto-advance progress loop
let _music          = null   // BackgroundMusic bed (owns its own Audio elements; outside Alpine's proxy)
let _initDone       = false  // guard: prevent double-init from Vite HMR / Alpine re-mount
let _parallax       = null   // live ParallaxScene instance (layered bg+hero shot, E3b)
let _parallaxMod    = null   // cached ./scene/ParallaxScene.js module (lazy-loaded once)
let _diorama        = null   // live DioramaStage (a scene with config.diorama)
let _dioramaMod     = null   // cached ./scene/diorama/DioramaStage.js module

// ── Alpine component ──────────────────────────────────────────────────────────
// Alpine is imported directly (no Livewire on this page) — register before start()
Alpine.data('lessonGame', (lesson) => ({
    // ── State ──────────────────────────────────────────────────────────
    phase:  'LOADING',          // LOADING | TITLE_SCREEN | WELCOME_VIDEO | INTRO | GAME_BRIEF | GAME_ACTIVE | TIME_UP | INTEL_DROP | ENDED
    canResumeAfterGame: false,  // shows the "Continue the lesson" button on the TIME_UP screen
    lesson: lesson,             // exposed to templates (title screen meta, etc.)
    prevPhase: null,            // phase before INTEL_DROP, to return to

    // Can the lesson start yet? Narration is still being made for a fresh lesson, but a scene that
    // carries itself — a map, a voyage leg, a gallery, a film — needs no audio to be playable.
    get canStart () {
      return !!(lesson.audio_url || (lesson.scenes || []).some(s =>
        s.audio_url || ['map', 'voyage', 'gallery', 'video'].includes(s.kind)
        // A team game plays on the class screen without a voice of its own.
        || (s.kind === 'game' && s.game_type === 'team')))
    },

    // Location/Year overlay

    // Countdown timer
    timerSeconds:       0,
    timerDisplay:       '10:00',
    _bigTimer:          null,   // handle from big-countdown.js while the clock is centre-stage
    _timerInterval:     null,
    _gameDurationSecs:  600,    // 10 min default; overridden by strategy_game.duration_minutes

    // Intel drop
    intelDropMessage: '',

    // Audio controls
    audioPlaying: false,
    audioMuted: false,
    volumeLevel: 1.0,  // narration volume (0..1) — the deck's slider; survives scene changes
    playbackPaused: false,  // student paused the stage (narration AND any scene animation)
    // The big centre play/pause glyph. It answers a press — it is not a state light. It used to
    // show whenever nothing happened to be playing, which on an interactive scene (a voyage
    // landfall waiting for the class) meant a 96px triangle parked over the map for as long as
    // anyone looked at it. Now: it flashes when the student presses play or pause, it stays up
    // while the lesson is actually paused, and while playing it rides with the idling chrome.
    playbackGlyph: false,
    // Player chrome idles the way Netflix and YouTube do: any pointer move, tap or key wakes it,
    // and while the lesson plays it fades away again after CHROME_IDLE.idleMs of stillness — the
    // cursor with it. It stays while the pointer rests on the top/bottom edge bands (that is where
    // the controls are), while keyboard focus is inside them, and while a menu is open. Paused,
    // waiting on the class, or reading: never hidden by idleness. See `chromeHidden`.
    chromeAwake: false,
    zoneHover: false,       // a mouse resting over the top or bottom band, where the controls live
    chromeFocus: false,     // keyboard focus is inside the player chrome
    chromeIdleMs: CHROME_IDLE.idleMs,
    chromeFadeInMs: CHROME_IDLE.fadeInMs,
    chromeFadeOutMs: CHROME_IDLE.fadeOutMs,
    _chromeTimer: null,
    readingOverlay: false,  // a gallery/reading surface owns the screen → the player shows no chrome
    // The stage-wide shade that darkens every backdrop (a painting or photo reads as a lit screen
    // without it). Line art is ink on white paper: shaded, it turns a flat grey while the figures
    // above the shade stay white and look pasted on. A scene opts out with config.backdrop_shade=false.
    backdropShade: true,
    // The bottom-left chapter line. A voyage leg reports its own place + date (they change as the
    // ship sails); everything else falls back to the scene's chapter name and year.
    infoPlace: '',
    infoDate: '',
    infoAtTop: false,
    sceneCaption: null,     // { place, year } when this scene opted into the caption, else null       // teacher chose the top date chip instead of the bottom line

    // Subtitles — the narration written along the bottom while it is spoken. The teacher sets
    // the starting state per lesson; a student toggling it (C) is remembered for this browser,
    // because someone who needs captions needs them in every lesson, not just this one.
    captionsOn:        false,
    // The title screen's join QR found no free spot (or is hidden, or this is a phone): the lesson
    // code then stands in the meta row instead, so the code is always on screen.
    titleCodeInMeta:   false,
    // The expect lines would reach a drawn title's letters: they stand in the strip along the top instead.
    expectInStrip:     false,
    // How the title screen gave way so nothing overlaps (resources/js/title-fit.js); reset on a resize.
    titleFit:          { ...FIT_START },
    // The top row stands on the white expect strip: the logo turns dark and, on a slim strip, fits it.
    titleChromeOnStrip: false,
    titleLogoH:        0,
    captionText:       '',
    _cues:             [],
    // The Audio & Subtitles panel and the subtitle language (scene/caption-panel.js).
    ...captionPanel(lesson),

    // Chapters (Spotify-style bar + list): one per scene, quizzes and games included. See
    // scene/chapter-timeline.js. A student jumps back anywhere they have been, never past `furthest`.
    chapters:          [],   // [{index, name, type, seconds, estimated, start, afterEstimate}]
    furthest:          { index: 0, time: 0 },
    // Played on a pupil's own device (the join QR opens ?play=solo): no teams, and where they got
    // to is kept in this browser so they can stop and carry on (scene/progress-store.js).
    playSolo:          new URLSearchParams(window.location.search).get('play') === 'solo',
    resumable:         null,  // saved progress worth offering "continue" for, else null
    _done:             [],    // scene ids whose power-meter moment has played (never replayed)
    // Who crews the Heemskerck and the Zeehaen after a harbour race, for this run only (race.js).
    _crew:             readCrew(safeStorage('sessionStorage'), lesson.lesson_code),
    currentIsGame:     false, // current scene is a quiz/game → hide the chapter bar
    sceneProgress:     0,    // 0-1 through the current chapter's audio
    chaptersOpen:      false,
    estimatedMinutes:  lesson.estimated_minutes ? formatMinutes(lesson.estimated_minutes * 60) : '',
    _quizRuns:         new Map(),  // queue index -> a finished quiz run, reopened read-only on return
    _pendingSeek:      0,          // seconds into the scene goToChapter is about to play (a click mid-segment)
    _seekOnStart:      0,          // …handed to that scene's narration, and dropped with the scene

    // Map block
    showMapContinue: false,  // stage slide waiting on the student (interactive map, gallery, video, landfall)
    autoAdvanceProgress: 0,  // 0..1 — voyage auto-advance progress line at the arrival

    // Internals
    _tel:               { log: () => {}, flush: () => {} }, // replaced in init(); stub keeps HMR re-mounts safe
    _audio:             null,
    _intelAudio:        null,   // intel-drop sfx — tracked so teardown can stop it
    _kbHandler:         null,   // keydown listener ref — removed on destroy()
    _navStop:           null,   // pagehide / livewire:navigating handler ref
    _scriptEvents:      [],
    _lastEventIndex:    0,
    _kbInterval:        null,
    _kbIndex:           0,
    _kbImages:          [],
    _usesSkybox:        false,  // true when any scene opts into scene_view:'skybox' → lazy-load 3D skybox
    _bgLayerA:          null,
    _bgLayerB:          null,
    _bgActive:          'A',
    _bgFadeDuration:    1000,   // ms
    _bgSlideMin:        8000,
    _bgSlideMax:        12000,
    _avatarWrap:        null,
    _currentPosition:   DEFAULT_POSITION,

    // ── Lifecycle ──────────────────────────────────────────────────────
    async init () {
      // Guard: Vite HMR re-registers Alpine.data which can trigger a second init()
      // on the same page load. Skip if already running.
      if (_initDone) return
      _initDone = true

      // Anonymous engagement telemetry (Phase 0 experiment) — per-page-load session id, no
      // identity, batched delivery. An inert stub when there is no lesson code, so every
      // call site below can log unconditionally. See resources/js/lesson-telemetry.js.
      this._tel = createTelemetry(lesson.lesson_code)
      if (this.playSolo) {
        const saved = readProgress(safeStorage('localStorage'), lesson.lesson_code)
        this.resumable = canResume(saved) ? saved : null
      }

      // Normalise OUR media URLs to the page origin so a localhost vs 127.0.0.1 mismatch doesn't
      // block audio. Anything on another host — a CDN-hosted cover, say — is left alone: rewriting
      // its origin turned https://res.cloudinary.com/<cloud>/… into a 404 on our own domain.
      const fixUrl = (u) => sameOriginMediaUrl(u, window.location.origin)
      if (lesson.audio_url)    lesson.audio_url    = fixUrl(lesson.audio_url)
      if (lesson.visemes_url)  lesson.visemes_url  = fixUrl(lesson.visemes_url)
      if (lesson.cover_image_url) lesson.cover_image_url = fixUrl(lesson.cover_image_url)
      lesson.scenes?.forEach(s => { s.audio_url = fixUrl(s.audio_url); s.image_url = fixUrl(s.image_url) })
      lesson.scene_images?.forEach(s => { s.url = fixUrl(s.url) })
      lesson.slideshow_images?.forEach(s => { s.url = fixUrl(s.url) })

      // Subtitles start where the teacher set them for this lesson — unless this browser has
      // already made its own choice, which wins: a pupil who needs captions should not have to
      // switch them back on in every lesson.
      const remembered = (() => { try { return localStorage.getItem('lp:captions') } catch (_) { return null } })()
      this.captionsOn = remembered === null ? !!lesson.subtitles : remembered === '1'
      this._initCaptionLanguage()

      // The quiz's right-answer chime obeys the deck from the first question, and is fetched now
      // so the first correct answer isn't waiting on a download.
      this._syncSoundLevels()
      Sfx.preload('correct')

      // Build image list: cover first, then slideshow images, then scene renders as fallback
      const coverImg    = lesson.cover_image_url ? [{ url: lesson.cover_image_url }] : []
      const slideshowImgs = lesson.slideshow_images ?? []
      const sceneImgs   = (slideshowImgs.length === 0) ? (lesson.scene_images ?? []) : []
      // The 3D skybox is opt-in per scene; if ANY scene uses it the lesson lazy-loads the
      // Three.js skybox engine (see _initBgScene). Pure-2D lessons never touch Three.js.
      this._usesSkybox = (lesson.scenes ?? []).some(s => s.scene_view === 'skybox')
      // For pure-2D lessons, fold each scene's panorama into the Ken-Burns slideshow so a
      // would-be skybox image still shows flat. Skybox lessons render those in 3D instead.
      const scenePanoramas = this._usesSkybox
        ? []
        : (lesson.scenes ?? [])
            .map(s => s.skybox_image_path || s.image_url)
            .filter(Boolean)
            .map(url => ({ url }))
      this._kbImages    = [...coverImg, ...slideshowImgs, ...sceneImgs, ...scenePanoramas]

      // Voyage/gallery lessons keep their imagery inside scene configs (gallery
      // slides), not on the lesson/scene rows — without this fallback their title
      // screen sits on a bare navy background.
      if (this._kbImages.length === 0) {
        const seen = new Set()
        this._kbImages = (lesson.scenes ?? [])
          .flatMap(s => s.config?.images ?? [])
          .filter(img => img?.url && !seen.has(img.url) && seen.add(img.url))
          .map(img => ({ url: img.url }))
      }

      this._buildBackgroundLayer()
      this._buildAvatarWrapper()

      // Start Ken Burns immediately for title screen — faster interval (4-7s) for drama
      if (this._kbImages.length > 0) {
        if (this._kbImages.length > 1) {
          this._bgSlideMin = 6000
          this._bgSlideMax = 6000
        }
        this._showBgImage(this._kbImages[0], 'A')
        // Also run for a SINGLE image. The drift is one CSS transition, so it ends after
        // _bgSlideMax and then sits perfectly still — which is what a lesson with one cover (every
        // voyage lesson) showed: twelve seconds of movement and then a frozen title screen. The
        // interval re-triggers the same drift instead of leaving it parked at its end frame.
        this._startKenBurns()
      }

      // Fire bg (skybox) init in background — should be ready by play time, but do
      // NOT block startLesson on it (Three.js chunk load has no timeout and can hang).
      this._initBgScene() // fire-and-forget

      // Only audio metadata is strictly required before lesson can start
      this._assetsReady = this._loadAudio()

      // Pick + preload the welcome video (full vs lite) while the title screen is up,
      // so it plays instantly on "Start lesson".
      if (lesson.narrator_welcome_url && this.$refs.welcomeVideo) {
        this.$refs.welcomeVideo.src = this._welcomeSrc()
      }

      this.phase = 'TITLE_SCREEN'

      // Render QR code into the canvas element
      this._renderQr()

      // Embedded autoplay (wizard "Play" preview): skip the title screen and play straight through,
      // optionally starting at a given scene index. Voyage lessons have no narration audio, so
      // starting without a click gesture is safe.
      try {
        const params = new URLSearchParams(window.location.search)
        this._embed = params.get('embed') === '1'
        const sc = parseInt(params.get('scene'), 10)
        this._startSceneIndex = Number.isFinite(sc) ? Math.max(0, sc) : 0
        // Autoplay only when a human actually asked for it in THIS visit.
        //
        // The wizard's Preview step embeds this player with autoplay=1, which is right when the
        // teacher clicks through to it — and wrong on a reload. A tab left parked on Preview
        // started narrating out loud every time it was refreshed, from a hidden iframe, with
        // nothing on screen to say where the voice was coming from.
        //
        // hasBeenActive is false on a cold load and true once the page has been clicked or typed
        // in, which is exactly the distinction. Browsers without it (Safari) keep the old
        // behaviour; their own autoplay policy is stricter anyway.
        if (params.get('autoplay') === '1') {
          const asked = window.navigator.userActivation?.hasBeenActive ?? true
          if (asked) {
            setTimeout(() => { if (this.phase === 'TITLE_SCREEN') this.startLesson() }, 300)
          }
        }
      } catch (_) { /* no params */ }

      // Attach keyboard listeners for audio controls
      this._attachKeyboardListeners()
      this._attachStagePause()
      this._registerChromeTuner()

      // new Audio() objects play independently of the DOM, so without explicit
      // teardown the narration keeps playing after the user leaves the page —
      // including the app's wire:navigate SPA transitions. Stop it on the way out.
      this._navStop = () => {
        // Exit telemetry BEFORE audio teardown, while position is still readable. Fires on
        // tab close, navigation and SPA transitions; skipped after a normal completion.
        if (this.phase !== 'ENDED') {
          this._tel.log('lesson_exited', {
            sceneIndex: this._sceneIndex,
            sceneId: _sceneQueue[this._sceneIndex]?.id,
            position: this._audio?.currentTime,
          })
        }
        this._tel.flush(true)
        this._stopAllAudio()
      }
      window.addEventListener('pagehide', this._navStop)
      document.addEventListener('livewire:navigating', this._navStop)

      // A landfall gallery (and any future reading surface) announces itself so the player can
      // clear its chrome out of the reader's way. See setReadingOverlayOpen in voyage-tour.js.
      this._readingOverlayHandler = (e) => { this.readingOverlay = !!e.detail?.open }
      window.addEventListener('lesson:reading-overlay', this._readingOverlayHandler)

      // A voyage leg owns the place and date on the chapter line while it sails. See publishInfo
      // in voyage-tour.js — the tour reports, the player is the only one that draws.
      this._chapterInfoHandler = (e) => {
        this.infoPlace = e.detail?.place || ''
        this.infoDate = e.detail?.date || ''
        this.infoAtTop = !!e.detail?.atTop
      }
      window.addEventListener('lesson:chapter-info', this._chapterInfoHandler)
    },

    _renderQr () {
      // A pupil who scans this plays the lesson themselves, on their own device.
      const url = `${window.location.origin}/lesson/${lesson.lesson_code}?play=solo`
      // Dark on the white plate (brand ink), drawn at twice the full size so every smaller size stays crisp.
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--color-brand-ink').trim() || undefined
      const opts = (width) => qrOptions(width, ink)

      const small = document.getElementById('title-qr-canvas')
      if (small) QRCode.toCanvas(small, url, opts(QR.sizes[0] * 2)).catch(() => {}).finally(() => this.relayoutTitle())
      else this.relayoutTitle()

      const large = document.getElementById('qr-modal-canvas')
      if (large) QRCode.toCanvas(large, url, opts(320)).catch(() => {})
    },

    // ── Title screen "Start lesson" button ─────────────────────────────
    /** Solo: carry on from where this device stopped. */
    resumeLesson () {
      const p = this.resumable
      if (!p) return this.startLesson()
      this._startSceneIndex = p.index
      this._pendingSeek = p.time
      this.furthest = { index: p.index, time: p.time }
      this._done = [...p.done]
      this._resuming = true
      return this.startLesson()
    },

    _saveProgress () {
      if (!this.playSolo) return
      saveProgress(safeStorage('localStorage'), lesson.lesson_code, { index: this.furthest.index, time: this.furthest.time, done: this._done })
    },

    async startLesson () {
      this._tel.log('lesson_started')
      // Solo "Start lesson" with progress saved = start over: what this device remembered goes.
      if (this.playSolo && !this._resuming) clearProgress(safeStorage('localStorage'), lesson.lesson_code)
      // A fresh start is a fresh run: last run's crews do not sail again until this class races.
      if (!this._resuming) { clearCrew(safeStorage('sessionStorage'), lesson.lesson_code); this._crew = {} }
      this._resuming = false
      this.resumable = null
      // Locked-mode (best effort): go fullscreen on the user's play gesture so tab/app
      // switching takes deliberate effort. Not supported on iPhone Safari — never block.
      // Skip when embedded (the wizard preview iframe) — no gesture, and fullscreen would be wrong.
      if (!this._embed) document.documentElement.requestFullscreen?.().catch(() => {})
      // Unlock browser audio NOW — must happen synchronously before any await breaks the gesture chain
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) { const ctx = new AudioCtx(); ctx.resume(); ctx.close() }
      } catch (_) {}

      // Narrator welcome video plays once, full-screen, before the first block. It runs
      // synchronously off this click gesture (so it keeps its sound), while lesson assets
      // keep preloading in the background. _endWelcomeVideo() advances into playback.
      if (lesson.narrator_welcome_url && !this._welcomePlayed) {
        this._welcomePlayed = true
        this.phase = 'WELCOME_VIDEO'
        // Play synchronously within the click gesture so autoplay-with-sound is allowed.
        // The overlay (x-show) becomes visible on Alpine's reactive flush a tick later.
        this._playWelcomeVideo()
        return
      }

      this._enterPlayback()
    },

    // ── Narrator welcome video ─────────────────────────────────────────
    _welcomePlayed: false,

    // Choose full vs lite source. Network Information API (Chrome/Android/Edge) is
    // authoritative when present; iOS Safari lacks it, so phones fall back to lite
    // (the clip renders ~390px wide there — the 480px lite file is plenty).
    _welcomeSrc () {
      const full = lesson.narrator_welcome_url
      const lite = lesson.narrator_welcome_lite_url
      if (!lite) return full

      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (c) {
        if (c.saveData) return lite
        if (['slow-2g', '2g', '3g'].includes(c.effectiveType)) return lite
        return full // 4g / wifi
      }

      // No connection API → can't detect cellular. Default phones to lite, desktops to full.
      const isPhone = /iPhone|Android.*Mobile/i.test(navigator.userAgent)
        || Math.min(window.innerWidth, window.innerHeight) <= 480
      return isPhone ? lite : full
    },

    _playWelcomeVideo () {
      const v = this.$refs.welcomeVideo
      if (!v) { this._enterPlayback(); return }
      if (!v.getAttribute('src')) v.src = this._welcomeSrc() // safety: ensure a source



      // Advance to the first block when the intro ends (or fails) — only once.
      v.addEventListener('ended', () => this._endWelcomeVideo(), { once: true })
      v.addEventListener('error', () => this._endWelcomeVideo(), { once: true })

      try { v.currentTime = 0 } catch (_) {}
      v.play().catch(e => {
        // Autoplay-with-sound blocked despite the gesture — don't strand the student.
        console.warn('lesson-player: welcome video autoplay blocked', e)
        this._endWelcomeVideo()
      })
    },

    _endWelcomeVideo () {
      if (this.phase !== 'WELCOME_VIDEO') return // guard against double-fire (ended + skip)
      const v = this.$refs.welcomeVideo
      try { if (v) { v.pause(); v.removeAttribute('src'); v.load() } } catch (_) {}
      this._enterPlayback()
    },

    // ── Load assets, then start the first block ────────────────────────
    async _enterPlayback () {
      this.phase = 'LOADING'
      try {
        await Promise.race([
          this._assetsReady,
          new Promise((_, rej) => setTimeout(() => rej(new Error('_assetsReady timeout after 15s')), 15000))
        ])
      } catch (e) {
        console.warn('lesson-player: assets load error (starting anyway):', e?.message)
      }

      // Skybox lessons: the 3D canvas takes over — stop Ken Burns and reveal the skybox.
      // Pure-2D lessons keep the Ken-Burns slideshow running the whole lesson (each scene's
      // image is fed into it by _playScene).
      if (this._usesSkybox) {
        clearInterval(this._kbInterval)
        this._kbInterval = null
        this._showBgScene()
      }

      // Story game (Spel-verhaal): lazy-load the branch/meter engine once. Without
      // meters the engine never constructs — plain branching keeps its pre-existing
      // behaviour (both options play sequentially; branching was never wired before).
      if (lesson.game_type === 'story_game' && lesson.game_config?.meters?.length && !this._storyGame) {
        try {
          const { StoryGameEngine } = await import('./scene/StoryGameEngine.js')
          const host = document.createElement('div')
          host.id = 'story-game-overlay'
          host.className = 'absolute inset-0 z-40 pointer-events-none'
          document.getElementById('lesson-stage')?.appendChild(host)
          this._storyGame = new StoryGameEngine(host, {
            meters: lesson.game_config.meters,
            failThreshold: lesson.game_config.fail_threshold ?? 0,
            scenes: _sceneQueue,
            onAdvanceTo: (i) => { this._sceneIndex = i; this._playScene(i) },
            onOverrideContinue: () => this._advanceScene(this._sceneIndex),
          })
        } catch (e) { console.warn('lesson-player: story game engine failed to load', e) }
      }

      // The music bed starts with the lesson, not with the title screen: the student pressed Play
      // a moment ago, so the browser will let it make a sound. It is created here rather than in
      // init() so a lesson opened and never started never downloads a track.
      this._startBackgroundMusic()

      this.phase = 'INTRO'
      this._playIntro()
    },

    // ── Background music ───────────────────────────────────────────────
    // A per-lesson choice by the teacher. The bed shuffles and crossfades on its own; all this
    // has to do is hand it the student's volume and stop it when the lesson does.
    _startBackgroundMusic () {
      if (_music) return
      _music = createBackgroundMusic(lesson.background_music)
      if (!_music) return
      _music.setMuted(this.audioMuted)
      _music.setVolume(this.volumeLevel)
      _music.start()
    },

    // ── Background / Ken Burns ─────────────────────────────────────────
    _buildBackgroundLayer () {
      const bg = document.getElementById('background-layer')
      if (!bg) return

      // Layer A
      const a = document.createElement('div')
      a.className = 'absolute inset-0 bg-cover bg-center transition-opacity ease-in-out overflow-hidden'
      a.style.transitionDuration = `${this._bgFadeDuration}ms`
      a.style.opacity = '1'
      bg.appendChild(a)
      this._bgLayerA = a

      // Layer B
      const b = document.createElement('div')
      b.className = 'absolute inset-0 bg-cover bg-center transition-opacity ease-in-out overflow-hidden'
      b.style.transitionDuration = `${this._bgFadeDuration}ms`
      b.style.opacity = '0'
      bg.appendChild(b)
      this._bgLayerB = b
    },

    // Longest a scene will wait for its layers to animate out before moving on.
    _exitTimer: null,

    // Per-scene motion settings, set by _playScene before each _showFlatScene call.
    _kbAnimated: true,
    _kbNamedDirection: null,
    _embedBg: null,   // mounted Sketchfab-3D / video background (see scene/embed-bg.js)

    _hideEmbedBg () {
      if (this._embedBg) { this._embedBg.destroy(); this._embedBg = null }
    },

    // A Sketchfab 3D model or a video (YouTube/Vimeo/…) as the full-bleed scene background.
    _showEmbedBg (embed) {
      const bg = document.getElementById('background-layer')
      if (!bg) return
      this._hideEmbedBg()
      this._embedBg = mountEmbedBg(bg, embed)
    },

    _showBgImage (img, layer) {
      const el = layer === 'A' ? this._bgLayerA : this._bgLayerB
      if (!el || !img?.url) return

      const fit = normalizeFit(this._bgFit)

      el.style.backgroundImage = `url(${img.url})`
      el.style.backgroundSize  = fit
      el.style.backgroundColor = ''

      // Crop anchor. Centre unless the scene is explicitly marked as having a face up top, in
      // which case the crop starts 20% down — the face, with a little headroom. (Same anchor the
      // wizard's 3D stage uses via PORTRAIT_TOP_BIAS, so both crop identically.)
      const anchor = (w, h) => {
        el.style.backgroundPosition = isTopAnchored(fit, this._bgFocus, w, h)
          ? PORTRAIT_TOP_CSS
          : 'center center'
      }

      // The stored hint is now the only signal, so this settles it in one go. There used to be a
      // second pass here that loaded the file to measure its shape and re-anchored tall images to
      // the top; that is exactly what cropped a ship down to its mast, and it cost an extra image
      // load per scene to do it.
      anchor(0, 0)

      // Motion off for this scene → a calm, static image. 'contain' is always static: the teacher
      // asked to see the whole work, and a Ken Burns zoom would crop straight back into it.
      if (this._kbAnimated === false || fit === 'contain') {
        el.style.transition = `opacity ${this._bgFadeDuration}ms ease-in-out`
        el.style.transform = 'none'
        return
      }

      const kbDir = pickKbDirection(this._kbPass ?? this._kbIndex, this._kbNamedDirection)
      el.style.transform = `scale(${kbDir.fromScale}) translate(${kbDir.fromX}%, ${kbDir.fromY}%)`

      // Animate Ken Burns — scale + pan simultaneously
      requestAnimationFrame(() => {
        el.style.transition = `opacity ${this._bgFadeDuration}ms ease-in-out, transform ${this._bgSlideMax}ms linear`
        el.style.transform  = `scale(${kbDir.toScale}) translate(${kbDir.toX}%, ${kbDir.toY}%)`
      })
    },

    /**
     * Apply the scene's transition (Animate tab) to the incoming background layer.
     *
     * Crossfade is what the player has always done and stays the default. A slide moves the
     * INCOMING layer only — sliding both at once reads as a shove rather than a change of scene —
     * and 'cut' means exactly that: no fade, no movement, straight to the next picture.
     */
    _applySceneTransition (scene) {
      const t = (scene?.config || {}).transition || {}
      const type = t.type || 'crossfade'
      const seconds = Number.isFinite(t.duration) ? t.duration : 0.8
      const ms = type === 'cut' ? 0 : Math.max(0, Math.min(3, seconds)) * 1000
      const ease = SCENE_EASINGS[t.ease] || SCENE_EASINGS.move

      this._bgFadeDuration = ms
      this._sceneTransition = { type, ms, ease }

      const incoming = this._bgActive === 'A' ? this._bgLayerB : this._bgLayerA
      if (!incoming) return

      const frames = sceneTransitionFrames(type)
      // Reset any transform left by the previous scene's slide before the next one starts, or the
      // layer begins its entrance from wherever the last transition happened to leave it.
      incoming.style.transition = 'none'
      incoming.style.transform = frames ? frames.from : 'none'

      if (!frames) return

      requestAnimationFrame(() => {
        incoming.style.transition = `opacity ${ms}ms ${ease}, transform ${ms}ms ${ease}`
        incoming.style.transform = frames.to
      })
    },

    // No image on this scene: a solid brand-navy backdrop instead of a stale leftover photo.
    _showFlatColor (color, gradient = null) {
      this._destroyParallax()
      if (_bgCanvas) _bgCanvas.style.opacity = '0'
      const bgLayer = document.getElementById('background-layer')
      if (bgLayer) { bgLayer.style.transition = 'opacity 1s ease-in-out'; bgLayer.style.opacity = '1' }
      if (this._kbInterval) { clearInterval(this._kbInterval); this._kbInterval = null }

      const el = this._bgActive === 'A' ? this._bgLayerB : this._bgLayerA
      if (!el) return
      // A gradient paints over the colour; without one it is the plain colour (brand navy by default).
      el.style.backgroundImage = gradientCss(gradient) || 'none'
      el.style.backgroundColor = color || '#0f172a'
      el.style.transform = 'none'
      el.style.opacity = '1'
      const other = this._bgActive === 'A' ? this._bgLayerA : this._bgLayerB
      if (other) other.style.opacity = '0'
      this._bgActive = this._bgActive === 'A' ? 'B' : 'A'
    },

    _startKenBurns () {
      const intervalMs = this._bgSlideMin + Math.random() * (this._bgSlideMax - this._bgSlideMin)
      this._kbInterval = setInterval(() => this._advanceBg(), intervalMs)
    },

    _advanceBg () {
      if (this._kbImages.length < 1) return
      this._kbIndex = (this._kbIndex + 1) % this._kbImages.length
      // Every drift gets the next direction. This used to key off _kbIndex, which is the IMAGE
      // index — fine while pictures kept changing, but with a single cover it stays 0, so each
      // repeat replayed the identical move and the picture snapped back to the start to do it.
      this._kbPass = (this._kbPass ?? 0) + 1
      const next = this._kbImages[this._kbIndex]

      if (this._bgActive === 'A') {
        this._showBgImage(next, 'B')
        this._bgLayerB.style.opacity = '1'
        this._bgLayerA.style.opacity = '0'
        this._bgActive = 'B'
      } else {
        this._showBgImage(next, 'A')
        this._bgLayerA.style.opacity = '1'
        this._bgLayerB.style.opacity = '0'
        this._bgActive = 'A'
      }
    },

    // ── Avatar wrapper & Three.js ──────────────────────────────────────
    _buildAvatarWrapper () {
      // Guard: if wrapper already exists (double-init from Vite HMR), reuse it
      const existing = document.getElementById('avatar-wrap')
      if (existing) { this._avatarWrap = existing; return }

      const canvas = document.getElementById('lesson-avatar-canvas')
      if (!canvas) return

      // Replace the full-screen blade canvas with a small positioned wrapper+canvas.
      // The avatar renders at bottom-right (portrait 9/16) with transparent background
      // so the 3D background scene shows through.
      const stage = document.getElementById('lesson-stage')
      canvas.remove()

      const wrap = document.createElement('div')
      wrap.id = 'avatar-wrap'
      wrap.className = `z-20 transition-all duration-700 ease-in-out ${AVATAR_POSITIONS[DEFAULT_POSITION]}`
      wrap.style.aspectRatio = '9/16'

      const newCanvas = document.createElement('canvas')
      newCanvas.id = 'lesson-avatar-canvas'
      newCanvas.className = 'w-full h-full'
      wrap.appendChild(newCanvas)
      stage.appendChild(wrap)

      this._avatarWrap = wrap
    },

    // ── Background 3D scene (skybox only, no character) ────────────────
    async _initBgScene () {
      // Skybox is opt-in — only lessons with a scene_view:'skybox' scene load the Three.js skybox.
      if (!this._usesSkybox) return

      // Destroy any stale instance (e.g. Vite HMR)
      if (_bgInstance) {
        try { _bgInstance.destroy?.() } catch (_) {}
        _bgInstance = null
      }

      const stage = document.getElementById('lesson-stage')
      if (!stage) return

      // Remove old bg canvas if present (re-init guard)
      document.getElementById('lesson-bg-canvas')?.remove()

      const canvas = document.createElement('canvas')
      canvas.id        = 'lesson-bg-canvas'
      // z-[1]: above Ken Burns (z-0), below gradient overlay (z-10) and avatar (z-20)
      // opacity-0: hidden during title screen — revealed when lesson starts via _showBgScene()
      canvas.className = 'absolute inset-0 w-full h-full pointer-events-none opacity-0 transition-opacity duration-1000 ease-in-out'
      canvas.style.zIndex = '1'
      stage.insertBefore(canvas, stage.firstChild)

      _bgCanvas = canvas   // module-level — set immediately (before any await) so _showBgScene never races

      // Wait a tick so the browser lays out the canvas (clientWidth/Height becomes non-zero).
      // Use setTimeout (not rAF) — rAF pauses in background/unfocused tabs.
      await new Promise(r => setTimeout(r, 50))

      try {
        // Dynamic import keeps the heavy Three.js skybox chunk out of the eager bundle.
        const { Avatar3DPlayer } = await import('./avatar-3d.js')
        _bgInstance = new Avatar3DPlayer(canvas, { characterUrl: null })
        await _bgInstance.init()

        // Disable user orbit — keep controls alive for autoRotate only
        if (_bgInstance._controls) {
          _bgInstance._controls.enableZoom   = false
          _bgInstance._controls.enablePan    = false
          _bgInstance._controls.enableRotate = false
          _bgInstance._controls.autoRotate   = true
          _bgInstance._controls.autoRotateSpeed = 0.12   // very slow pan
        }

        // Neutral dark bg while no skybox is loaded
        _bgInstance.setSceneBackground('#0c1a2e')

        // Pre-load first available image as initial skybox — fire-and-forget,
        // do NOT await here so this never blocks _assetsReady / startLesson
        const initialBg = lesson.cover_image_url
          || lesson.slideshow_images?.[0]?.url
          || lesson.scene_images?.[0]?.url
          || lesson.scenes?.[0]?.image_url
        if (initialBg) {
          _bgInstance.setSkyboxFromUrl(initialBg, 0.35).catch(() => {})
        }
      } catch (e) {
        console.warn('lesson-player: bg scene init failed', e)
      }
    },

    // Fade the 3D background scene in (called when lesson starts)
    _showBgScene () {
      // Pure-2D lesson: no 3D canvas — keep the Ken-Burns slideshow visible.
      if (!this._usesSkybox) return
      if (!_bgCanvas) return
      // Apply immediately (no rAF — rAF pauses in background/unfocused tabs)
      _bgCanvas.classList.remove('opacity-0')
      _bgCanvas.style.opacity = '1'

      // Fade out the CSS Ken Burns layers behind the 3D canvas
      const bgLayer = document.getElementById('background-layer')
      if (bgLayer) {
        bgLayer.style.transition = 'opacity 1.2s ease-in-out'
        bgLayer.style.opacity = '0'
      }
    },

    // Flat 2D scene render: the scene image on the CSS Ken Burns layers, 3D canvas hidden.
    // This is the default per scene (skybox is opt-in via scene_view).
    _showFlatScene (url) {
      if (!url) return
      this._destroyParallax()   // a flat shot replaces any live layered (parallax) scene
      if (_bgCanvas) _bgCanvas.style.opacity = '0'
      const bgLayer = document.getElementById('background-layer')
      if (bgLayer) {
        bgLayer.style.transition = 'opacity 1s ease-in-out'
        bgLayer.style.opacity = '1'
      }
      // Stop the title auto-slideshow so it doesn't fight the per-scene image.
      if (this._kbInterval) { clearInterval(this._kbInterval); this._kbInterval = null }
      // Crossfade to this scene's image with a fresh Ken Burns move.
      this._kbIndex = (this._kbIndex || 0) + 1
      const layer = this._bgActive === 'A' ? 'B' : 'A'
      this._showBgImage({ url }, layer)
      if (layer === 'B') {
        this._bgLayerB.style.opacity = '1'
        this._bgLayerA.style.opacity = '0'
        this._bgActive = 'B'
      } else {
        this._bgLayerA.style.opacity = '1'
        this._bgLayerB.style.opacity = '0'
        this._bgActive = 'A'
      }
    },

    // ── Storyboard shots: switch the flat image exactly when the narration reaches
    //    each shot's anchor sentence (via ElevenLabs character timings). ───────────
    _shotPlan: null,
    _shotCursor: 0,
    _parallaxReq: 0,   // async guard: only the latest layered-shot request may render

    // Route one shot to the right renderer: LAYERED (2-layer parallax) when it carries
    // a bg_url, otherwise today's flat Ken Burns path — every existing lesson stays flat.
    _showShot (shot, fallbackUrl = null) {
      if (shot?.bg_url || (Array.isArray(shot?.layers) && shot.layers.length)) { this._showLayeredShot(shot); return }
      this._showFlatScene(shot?.image_url || shot?.url || fallbackUrl)
    },

    // Layered shot (E3b): bg layer + optional transparent hero PNG, hero panning at
    // ~0.6× the background rate. Lazy-imports the ParallaxScene chunk once (same
    // pattern as the story-game engine) so flat-only lessons never download it.
    async _showLayeredShot (shot) {
      const req = ++this._parallaxReq
      try {
        if (!_parallaxMod) _parallaxMod = await import('./scene/ParallaxScene.js')
        if (req !== this._parallaxReq) return   // a newer shot superseded this one mid-import

        const host = document.getElementById('background-layer')
        if (!host) return

        // Same reveal path as _showFlatScene: hide the 3D canvas, show the 2D layer host.
        if (_bgCanvas) _bgCanvas.style.opacity = '0'
        host.style.transition = 'opacity 1s ease-in-out'
        host.style.opacity = '1'
        if (this._kbInterval) { clearInterval(this._kbInterval); this._kbInterval = null }

        // Derive pan/zoom from the same Ken Burns move a flat scene would have used.
        this._kbIndex = (this._kbIndex || 0) + 1
        let motion = { panX: 0, panY: 0, zoom: 1 }   // Motion off → calm static layers
        const fit = this._bgFit === 'contain' ? 'contain' : 'cover'
        if (this._kbAnimated !== false && fit !== 'contain') {   // 'contain' is always static
          const kb = pickKbDirection(this._kbIndex, this._kbNamedDirection)
          // Classic Ken Burns moves SHRINK (1.10 → 1.05); as a layer end-scale that would
          // dip below 1 and expose edges past the 6% bleed. Layers start at scale 1, so
          // express the move's zoom as magnitude-only, clamped to a gentle 1.0–1.12.
          const zoom = Math.min(1.12, 1 + Math.abs(kb.toScale - kb.fromScale))
          motion = { panX: kb.toX - kb.fromX, panY: kb.toY - kb.fromY, zoom }
        }

        // A panel that slides, wipes or dissolves in keeps the one before it underneath meanwhile.
        this._destroyParallax(_parallaxMod.entryLingerMs(shot.entry))
        // No camera on this panel: the figures go back to rest (the last panel's may have moved them).
        if (!shot.camera) this._artLayer?.setCamera(null)
        _parallax = new _parallaxMod.ParallaxScene(host)
        _parallax.show({
          // The panel's own camera move and entry (camera.js). The figures in the clipart overlay
          // get the same frame, so they stay on their spot of the plate through the move.
          camera: shot.camera || null,
          entry: shot.entry || null,
          entryAlong: [document.getElementById('lesson-voyage-art')],
          onCameraFrame: (frameFor) => this._artLayer?.setCamera(frameFor),
          bgUrl: shot.bg_url,
          heroUrl: shot.hero_url || null,
          // Multiplane shots (E3c): ordered back→front, each {url, depth, kind, …}.
          // Library clipart is ArtworkOverlay's (see _renderSceneArtwork), so it is left out here.
          layers: Array.isArray(shot.layers) && shot.layers.length ? shot.layers.filter(l => !isClipartLayer(l)) : null,
          motion,
          // Whole image: the plate shows whole, letterboxed on the scene's own colour.
          fit,
          matte: this._bgMatte || null,
          // Portrait stage: the crop centres on the scene's figures. Figures are ArtworkOverlay's,
          // so this reads the FULL layer list — the same one _renderSceneArtwork fits its host with.
          subject: shot.layers,
        })
      } catch (e) {
        console.warn('lesson-player: parallax scene failed, falling back to flat', e)
        this._showFlatScene(shot.image_url || shot.url || shot.bg_url)
      }
    },

    // A diorama scene (plate, occluders, items placed on floor grids) — the same DioramaStage the
    // editor uses, read-only. Drawn into the layer host like a layered shot.
    async _showDiorama (scene) {
      const req = ++this._parallaxReq
      try {
        if (!_dioramaMod) _dioramaMod = await import('./scene/diorama/DioramaStage.js')
        const assets = await _dioramaMod.loadDioramaAssets(scene.config.diorama)
        if (req !== this._parallaxReq) return
        const host = document.getElementById('background-layer')
        if (!host) return
        if (_bgCanvas) _bgCanvas.style.opacity = '0'
        host.style.opacity = '1'
        if (this._kbInterval) { clearInterval(this._kbInterval); this._kbInterval = null }
        this._destroyParallax()
        this._destroyDiorama()
        _diorama = new _dioramaMod.DioramaStage(host)
        _diorama.show(scene.config.diorama, { ...assets, ...(scene.diorama_assets ?? {}) })
        // Keyframes follow the narration clock, like the speech balloons.
        _diorama.play(() => this._audio?.currentTime ?? 0)
      } catch (e) {
        console.warn('lesson-player: diorama failed, falling back to flat', e)
        this._showFlatScene(scene.image_url)
      }
    },

    _destroyDiorama () {
      if (!_diorama) return
      try { _diorama.destroy() } catch (_) { /* already detached */ }
      _diorama = null
    },

    _destroyParallax (lingerMs = 0) {
      // The figures leave the camera pose with the picture, unless they stay under a slide/wipe.
      if (!lingerMs) this._artLayer?.setCamera(null)
      if (!_parallax) return
      try { _parallax.destroy(lingerMs) } catch (_) { /* already detached */ }
      _parallax = null
    },

    _startShotPlayback (scene) {
      const shots = scene.shots || []
      this._showShot(shots[0], scene.image_url)
      this._shotCursor = 0
      // time: seconds when the shot should appear; null = unresolved (even-split fallback).
      // resolveAnchorTime / pickShotIndex are pure + unit-tested in scene/shot-sync.js.
      // bg_url/hero_url (optional, E3b) mark a shot as layered — see _showShot.
      this._shotPlan = shots.map((shot, i) => ({
        url: shot.image_url,
        bg_url: shot.bg_url ?? null,
        hero_url: shot.hero_url ?? null,
        layers: shot.layers ?? null,
        camera: shot.camera ?? null,
        entry: shot.entry ?? null,
        time: i === 0 ? 0 : resolveAnchorTime(scene.alignment, shot.anchor_sentence)
      }))
    },

    // Called on every audio timeupdate (piggybacks on _processScriptEvents).
    _processShots () {
      if (!this._audio) return

      // Chapter progress (drives the active segment fill in the chapter bar).
      this.sceneProgress = this._audio.duration
        ? Math.min(1, this._audio.currentTime / this._audio.duration)
        : 0
      // Every segment's lock and fill read `furthest`, so move it in steps, not on every tick.
      const t = this._audio.currentTime
      if (this._sceneIndex !== this.furthest.index || t - this.furthest.time >= FURTHEST_STEP_SECONDS) {
        this.furthest = reachedFurther(this.furthest, { index: this._sceneIndex, time: t })
        this._saveProgress()
      }

      // Drive the layered-scene parallax from narration progress (same tick as anchors).
      if (_parallax && this._audio.duration) {
        _parallax.update(this._audio.currentTime / this._audio.duration)
      }

      this._updateCaptions()
      this._balloons?.update(this._audio.currentTime)

      if (!this._shotPlan || this._shotPlan.length < 2) return

      const target = pickShotIndex(this._shotPlan, this._audio.currentTime, this._audio.duration || 0)
      const next = this._shotPlan[target]
      if (target !== this._shotCursor && (next.url || next.bg_url || next.layers?.length)) {
        this._shotCursor = target
        this._showShot(next)
      }
    },

    _moveAvatarTo (position) {
      const posKey = position in AVATAR_POSITIONS ? position : DEFAULT_POSITION
      if (posKey === this._currentPosition) return
      this._currentPosition = posKey

      const wrap = this._avatarWrap
      if (!wrap) return

      // Swap CSS position classes on the small avatar wrapper
      Object.values(AVATAR_POSITIONS).forEach(cls =>
        cls.split(' ').forEach(c => wrap.classList.remove(c))
      )
      AVATAR_POSITIONS[posKey].split(' ').forEach(c => wrap.classList.add(c))
    },

    // ── Audio ──────────────────────────────────────────────────────────
    async _loadAudio () {
      // Build scene queue — use lesson-level audio if available, otherwise chain scenes
      if (lesson.audio_url) {
        _sceneQueue = [{ audio_url: lesson.audio_url, script: lesson.script, image_url: null }]
      } else if (lesson.scenes?.length) {
        // EVERY scene is playable — no kind filter. A quiz (or any element) can be attached to any
        // lesson and must never be silently dropped. Each kind renders via its branch in _playScene;
        // a plain scene with no narration audio holds briefly on its visual, then advances.
        _sceneQueue = lesson.scenes
          .map(s => ({
            id: s.id ?? null,   // needed by editSceneHref → deep-link "Edit scene" to THIS exact scene
            kind: s.kind, game_type: s.game_type ?? null, config: s.config ?? null, diorama_assets: s.diorama_assets ?? {}, scene_view: s.scene_view,
            branch_group: s.branch_group ?? null, branch_role: s.branch_role ?? null,
            branch_choice_label: s.branch_choice_label ?? null,
            audio_url: s.audio_url, script: s.script, image_url: s.image_url,
            image_credit: s.image_credit ?? null,   // shown under the deck — CC BY obliges us to
            chapter_name: s.chapter_name ?? null, year: s.year ?? null, location: s.location ?? null,
            duration_seconds: s.duration_seconds ?? null,
            timeline: s.timeline ?? null,
            // shots entries carry image_url + anchor_sentence, plus optional bg_url/hero_url
            // (layered parallax shots, E3b) — the whole array passes through untouched.
            shots: s.shots ?? null, alignment: s.alignment ?? null,
            background_color: s.background_color ?? null, background_gradient: s.background_gradient ?? null,
            kb_animated: s.kb_animated, kb_direction: s.kb_direction ?? null,
            quiz_questions: s.quiz_questions ?? null,
            quiz_shuffle: s.quiz_shuffle ?? 'per_player',
          }))
      }

      if (!_sceneQueue.length) return

      // Every scene is a chapter on the bar, quizzes and games too: the class sees what is coming.
      this.chapters = buildChapters(_sceneQueue, i => t('Chapter :number', { number: i + 1 }))

      // Warm every narrated scene up front, BEFORE the early return below — a lesson can open with
      // a quiz or map scene that has no audio of its own, and those lessons need warming most.
      this._warmNarration()

      // A map block can be first in the queue — only preload audio when the first scene has it.
      if (!_sceneQueue[0].audio_url) return

      // Pre-fetch visemes (only for single-audio lessons with visemes_url)
      if (lesson.visemes_url) {
        try {
          const res  = await fetch(lesson.visemes_url)
          const data = await res.json()
          this._pendingVisemes = data.mouthCues ?? []
        } catch (e) { /* optional */ }
      }

      // Pre-load the first scene so duration is known. 'auto', not 'metadata': narration is around
      // 750 KB per scene, and with metadata-only the audio data is not fetched until playback starts,
      // which stalled the opening of every scene.
      this._audio = new Audio(_sceneQueue[0].audio_url)
      this._audio.preload = 'auto'
      this._audio.load() // must call load() explicitly to start fetching
      await new Promise(resolve => {
        if (this._audio.readyState >= 1) { resolve(); return } // already loaded
        this._audio.addEventListener('loadedmetadata', resolve, { once: true })
        this._audio.addEventListener('error', resolve, { once: true })
        setTimeout(resolve, 3000) // safety timeout — never block indefinitely
      })
      this._scriptEvents = parseScriptTags(_sceneQueue[0].script, this._audio.duration)
    },

    /**
     * Warm every scene's narration into the HTTP cache, in order, one at a time.
     *
     * A lesson is roughly 750 KB of audio per scene. Fetched on demand, jumping to a chapter meant
     * waiting for that download — one to two seconds on classroom wifi, on a click that should feel
     * instant. Warming them while the first scene plays makes every later jump a cache hit.
     *
     * Deliberately sequential and started after the first scene is ready, so it never competes with
     * the audio the class is listening to right now. Failures are ignored: this is an optimisation,
     * and the player still fetches on demand if a warm never happened.
     */
    _warmNarration () {
      if (this._warmingNarration) return
      this._warmingNarration = true

      const urls = _sceneQueue
        .map(s => s.audio_url)
        .filter((url, i) => url && i > 0)

      const warmNext = () => {
        const url = urls.shift()
        if (!url) { this._warmingNarration = false; return }

        const probe = new Audio()
        probe.preload = 'auto'
        probe.src = url

        let settled = false
        const done = () => {
          if (settled) return
          settled = true
          probe.removeEventListener('canplaythrough', done)
          probe.removeEventListener('error', done)
          // Hold the reference until the fetch settles, then let it go; the bytes stay in the
          // browser's HTTP cache, which is what the next play reads from.
          setTimeout(warmNext, 150)
        }

        probe.addEventListener('canplaythrough', done, { once: true })
        probe.addEventListener('error', done, { once: true })
        // A stalled fetch must never halt the chain — move on and let that scene load on demand.
        setTimeout(done, 20000)
        probe.load()
      }

      // Give the first scene a moment of clear air before competing for bandwidth.
      setTimeout(warmNext, 1200)
    },

    // ── Script event processing ────────────────────────────────────────
    _processScriptEvents () {
      if (!this._audio) return
      this._processShots()
      const t = this._audio.currentTime

      while (this._lastEventIndex < this._scriptEvents.length) {
        const evt = this._scriptEvents[this._lastEventIndex]
        if (evt.time > t) break
        this._lastEventIndex++

        if (evt.type === 'position') {
          this._moveAvatarTo(evt.value)
        } else if (evt.type === 'game' && this.phase === 'GAME_BRIEF') {
          this._transitionToGameActive()
        } else if (evt.type === 'intel_drop' && this.phase === 'GAME_ACTIVE') {
          this._triggerIntelDrop()
        }
      }
    },

    // ── Phase transitions ──────────────────────────────────────────────
    _playIntro () {
      // Background is set per scene by _playScene (flat Ken Burns by default, skybox opt-in).
      this._moveAvatarTo('bottom-right')
      if (!_sceneQueue.length) return
      // Honour an embedded start-scene (wizard "Play" from the selected leg), once.
      const start = Math.min(Math.max(0, this._startSceneIndex || 0), _sceneQueue.length - 1)
      this._startSceneIndex = 0
      this._sceneIndex = start
      this._playScene(start)
    },

    _sceneIndex: 0,

    // The small grey line under the deck: where the words came from, and who made the picture.
    //
    // The image half is not decoration. Almost everything the sourcer finds on Wikimedia Commons is
    // CC BY or CC BY-SA, and both licences require naming the author wherever the work is shown —
    // so this has to follow the scene, not sit on a credits page nobody opens. Reads _sceneIndex
    // (reactive) so it changes with the picture.
    get attributionLine () {
      const scenes = (_sceneQueue && _sceneQueue.length) ? _sceneQueue : (this.lesson?.scenes || [])
      const credit = scenes[this._sceneIndex]?.image_credit
      return [this.lesson?.source_attribution, credit].filter(Boolean).join('  ·  ')
    },

    // Owner-preview "Edit scene": deep-link to the wizard scene editor (step 4) for the EXACT scene
    // being viewed, carrying whether the gallery/landfall modal is currently open so it can reopen.
    // Reads this._sceneIndex (reactive) so the link tracks the live scene.
    editSceneHref (base) {
      // Prefer the live play queue; before playback starts it's empty, so fall back to the lesson's
      // scene list (always present from window.LESSON) — both are the same ordered scenes.
      const scenes = (_sceneQueue && _sceneQueue.length) ? _sceneQueue : (this.lesson?.scenes || [])
      // _sceneIndex only becomes the embedded start scene once _playIntro runs. Reload a parked
      // Preview tab, where autoplay deliberately does not fire without a gesture, and the pill would
      // otherwise offer to edit scene 1 while the teacher is looking at the scene they selected.
      const index = this._sceneIndex || this._startSceneIndex || 0
      const scene = scenes[index]
      const params = new URLSearchParams({ step: '4' })
      if (scene?.id != null) params.set('scene', String(scene.id))
      params.set('modal', window.__voyageGalleryOpen ? '1' : '0')
      return `${base}?${params.toString()}`
    },

    /**
     * Follow "Edit scene" out of the player and into the editor.
     *
     * The wizard's Play step shows this player inside an iframe, and this pill is the teacher's only
     * way back to editing from there. `window.location` inside a frame is the FRAME, so assigning it
     * loaded the whole wizard into the player's own box and left the address bar on step=5 — after
     * which the router never moved again, because every step lived in the frame.
     */
    openEditor (base) {
      const href = this.editSceneHref(base)
      try {
        if (window.top && window.top !== window.self) {
          window.top.location.href = href
          return
        }
      } catch {
        // A cross-origin host forbids reaching its top document. Nothing to do but navigate here.
      }
      window.location.href = href
    },

    // ── Chapter bar ─────────────────────────────────────────────────────
    mayEnter (i, time = 0) {
      const chapter = this.chapters[i]
      if (!chapter) return false
      return canSeek({ index: i, time }, this.furthest, { type: chapter.type, teacher: !!lesson.can_skip_quiz })
    },

    // How full a segment is drawn: `played` up to the playhead, `reached` up to the furthest point.
    segmentFill (c) {
      const played = c.index < this._sceneIndex ? 1 : (c.index === this._sceneIndex ? this.sceneProgress : 0)
      const f = this.furthest
      const reached = c.index < f.index ? 1 : (c.index === f.index && c.seconds ? Math.min(1, f.time / c.seconds) : 0)
      return { played: played * 100, reached: Math.max(played, reached) * 100 }
    },

    // Seconds into chapter `c` under the pointer. Only a narrated scene has a time to land on.
    _offsetAt (c, e) {
      if (c.estimated || !_sceneQueue[c.index]?.audio_url) return 0
      const r = e.currentTarget.getBoundingClientRect()
      return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * c.seconds
    },

    typeLabel (type) {
      const label = { narration: t('Story'), quiz: t('Quiz'), game: t('Game'), map: t('Map'), gallery: t('Gallery'), video: t('Video'), voyage: t('Voyage') }
      return label[type] ?? label.narration
    },

    // The chapter list's right-hand column: "Quiz · ≈ 2 min", "Verhaal · 3:20".
    chapterMeta (c) {
      return `${this.typeLabel(c.type)} · ${c.estimated ? formatMinutes(c.seconds) : formatClock(c.seconds)}`
    },

    segmentTooltip (c, e) {
      const text = chapterTooltip(c, e ? this._offsetAt(c, e) : 0, type => this.typeLabel(type))
      return c.type === 'game' && c.index < this._sceneIndex ? `${text} · ${t('Played')}` : text
    },

    hoverSegment (c, e) {
      e.currentTarget.dataset.tooltip = this.segmentTooltip(c, e)
    },

    clickSegment (c, e) {
      this.goToChapter(c.index, this._offsetAt(c, e))
    },

    // Jump to a chapter from the bar / list, optionally `at` seconds into its narration.
    goToChapter (i, at = 0) {
      this.chaptersOpen = false
      if (i == null || i < 0 || i >= _sceneQueue.length || !this.mayEnter(i, at)) return
      this._tel.log(i > this._sceneIndex ? 'seek_forward' : 'seek_backward', {
        sceneIndex: this._sceneIndex,
        sceneId: _sceneQueue[this._sceneIndex]?.id,
        position: this._audio?.currentTime,
      })
      if (i === this._sceneIndex && this._audio && _sceneQueue[i].audio_url) {
        this._audio.currentTime = at
        return
      }
      this._pendingSeek = at
      this._sceneIndex = i
      this._playScene(i)
    },

    /**
     * Silence and release the current narration.
     *
     * `new Audio()` plays independently of the DOM, so simply assigning a new one to `this._audio`
     * leaves the previous track audible — every jump between chapters stacked another voice. Pausing
     * is not enough either: the old element's `ended`/`timeupdate` listeners stay live and a late
     * `ended` would advance the queue from a scene the student already left. So detach the handlers,
     * stop the fetch, and drop the reference.
     */
    _stopAudio () {
      const a = this._audio
      this._audio = null
      // A pending no-audio scene hold is the same kind of stale timer — cancel it too, along with
      // a scene waiting on its layers to leave: if the student jumps, that wait is now for a scene
      // nobody is looking at, and letting it fire would advance them a second time.
      clearTimeout(this._noAudioHold)
      clearTimeout(this._exitTimer)
      if (!a) return
      try {
        a.pause()
        a.removeAttribute('src')
        a.load()          // aborts any in-flight download
      } catch (_) { /* element already torn down */ }
      this.audioPlaying = false
    },

    _playScene (index) {
      // A mid-segment click is for THIS scene's narration only; a scene that never starts narration
      // must not hand its offset on to whichever scene does next.
      this._seekOnStart = this._pendingSeek
      this._pendingSeek = 0
      const scene = _sceneQueue[index]
      if (!scene) { this._onAudioEnded(); return }

      this._tel.log('scene_started', { sceneIndex: index, sceneId: scene.id })

      // A landfall gallery freezes this scene's auto-advance while it is open, and it is a GLOBAL
      // flag. If a tour is torn down with its modal still up, nothing ever clears it and every
      // later voyage scene sits on a frozen countdown with no visible modal to explain why. A new
      // scene means no modal is open by definition, so this is the one place it can be asserted.
      window.__voyageGalleryOpen = false
      this.readingOverlay = false

      // Moving to a new scene is an explicit "play" — never carry a pause across a chapter jump,
      // or the next scene would arrive frozen with no obvious reason why. Clear the flag directly
      // rather than through setPlaybackPaused: that would resume the OUTGOING scene's narration a
      // line before _stopAudio tears it down.
      if (this.playbackPaused) {
        this.playbackPaused = false
        try { _voyageInstance?.setPaused?.(false) } catch (_) { /* map gone */ }
      }

      // The outgoing scene's place/date must not linger on the next one — a voyage leg republishes
      // its own within the frame, anything else falls back to its chapter name and year.
      this.infoPlace = ''
      this.infoDate = ''
      this.sceneCaption = captionVisible(scene) ? { place: scene.location, year: scene.year || '' } : null
      this.backdropShade = scene.config?.backdrop_shade !== false

      // Whatever was narrating belongs to the scene we are leaving — silence it before anything
      // else, or jumping chapters layers voice over voice.
      this._stopAudio()

      // Same for a quiz card: it only clears itself on completion, so leaving a quiz scene
      // through a chapter jump left the card painted over every later scene.
      this._quizOverlay?.hide()
      this._teamGame?.hide()
      this._powerMeter?.hide()
      this._closeRace()
      this._stopMomentAudio()
      // A moment still running belongs to the scene we are leaving, even if we come straight back.
      this._playEpoch = (this._playEpoch || 0) + 1
      this._momentActive = false
      this._hideBalloons(false)

      // And the same again for the strategy challenge, which is a PHASE rather than an overlay
      // object. GAME_BRIEF waits for the teacher to tap "Begin the challenge" and nothing else
      // clears it, so jumping out of a game scene left a full-bleed briefing card — backdrop, blur
      // and all — over every scene that followed. The Silk Road's map opened underneath a Julius
      // Caesar challenge, correct in every respect except that nobody could see it.
      //
      // Any scene that is not a game is ordinary playback, so put the phase back. TIME_UP and
      // ENDED are terminal states the lesson has genuinely reached, not leftovers — leave those be.
      if (scene.kind !== 'game' && (this.phase === 'GAME_BRIEF' || this.phase === 'GAME_ACTIVE')) {
        this.phase = 'INTRO'
        this._hideBigTimer()
      }

      // Chapter caption + bar (Micrio serial-tour). Chapters are filtered (no games), so look the
      // current one up by its queue index. A game scene (quiz) is not a chapter → hide the bar.
      this.currentIsGame = scene.kind === 'game'
      this.sceneProgress = 0
      this.furthest = reachedFurther(this.furthest, { index, time: 0 })

      // Story game: 'hold' = engine shows its choice overlay and resumes via onAdvanceTo;
      // a number = skip a non-chosen branch option to the reconvergence index.
      if (this._storyGame) {
        const redirect = this._storyGame.beforePlay(index, scene)
        if (redirect === 'hold') return
        if (redirect != null && redirect !== index) { this._sceneIndex = redirect; return this._playScene(redirect) }
      }

      // Reset per-scene shot playback state (storyboard scenes rebuild it below).
      this._shotPlan = null
      this._shotCursor = 0

      // Subtitles follow the narration of THIS scene. Cues are built on the first timeupdate,
      // once the audio has reported its real length — every scene here goes on to play (or skip)
      // its own track, so resetting for all of them keeps the last scene's lines off this one.
      this._captionSource = { script: scene.script, alignment: scene.alignment || null, lines: scene.config?.lines || null }
      this._cues = []
      this._cueDuration = 0
      this.captionText = ''

      // The persistent voyage map is kept ALIVE only between voyage legs. A voyage lesson can now
      // open/close with standalone story slides (kind 'gallery'), so when this scene is NOT a voyage
      // leg, fully release the map first — otherwise its dead DOM lingers and backward nav replays a
      // torn-down instance.
      if (scene.kind !== 'voyage' && _voyageInstance) {
        try { _voyageInstance.destroy() } catch (_) { /* map already gone */ }
        _voyageInstance = null
        this._cancelVoyageAuto()
      }

      // Same for any other stage slide (map, gallery). Next/Previous tear the stage down on the way
      // out, but a chapter jump comes straight here, so a map left open covered the narration scene
      // after it and kept its "waiting on the student" state. Idempotent, and a voyage lesson's
      // persistent map survives it (see _teardownStageScene).
      this._teardownStageScene()
      this._destroyDiorama()

      // Teacher text annotations for this scene (URLs render as link chips → iframe modal).
      // Before the map early-return, so a map scene clears the previous scene's texts too.
      this._renderSceneTexts(scene)
      // Teacher clipart layers a voyage scene carries ON TOP of the map (read-only in playback).
      // Also before the early-returns, so leaving a decorated scene clears its clipart.
      this._renderSceneArtwork(scene)
      // Speech balloons of a scene told in lines; any other scene clears the last one's.
      this._renderSceneBalloons(scene)

      // Embed background (Sketchfab 3D / video) — a full-bleed iframe behind the scene overlay.
      // Works for flat AND game scenes (quiz/debate); map/voyage own their whole stage so skip them.
      const _embed = scene.config && scene.config.bg_embed
      if (_embed && _embed.src && scene.kind !== 'map' && scene.kind !== 'voyage') {
        this._showEmbedBg(_embed)
      } else {
        this._hideEmbedBg()
      }

      // Map block — render the historical atlas as a slide (no audio).
      if (scene.kind === 'map') { this._playMapScene(index, scene); return }

      // Voyage tour leg / image gallery — stage slides that move on by themselves (_startStageAuto).
      if (scene.kind === 'voyage') { this._playVoyageScene(index, scene); return }
      if (scene.kind === 'gallery') { this._playGalleryScene(index, scene); return }
      // Video scene — the film IS the scene, so nothing times it out from under the class.
      if (scene.kind === 'video') { this._playVideoScene(index, scene); return }
      // Game scene (quiz / strategy / debate) — may or may not have a narrated intro.
      if (scene.kind === 'game') { this._playGameScene(index, scene); return }

      // Per-scene background motion settings (Animated toggle + Ken Burns direction).
      this._kbAnimated = scene.kb_animated !== false
      this._kbNamedDirection = scene.kb_direction || null
      // Crop anchor for this scene's background ('top' for portraits — see _showBgImage).
      this._bgFocus = scene.config?.background_focus || scene.focus || 'center'
      // How the background fills the stage: 'cover' (fill, crop) or 'contain' (whole image, bars).
      this._bgFit = scene.config?.background_fit || scene.background_fit || 'cover'
      this._bgMatte = scene.background_color || null

      // How this scene replaces the one before it (Animate tab). Read before the swap below so
      // _showBgImage / _showFlatColor apply it to whichever layer is coming in.
      this._applySceneTransition(scene)

      // Swap background. Default scenes are a flat Ken Burns slide (2D); skybox is opt-in per
      // scene; no image at all = the scene's solid backdrop (brand navy by default).
      if (scene.config?.diorama) {
        this._showDiorama(scene)                              // plate + occluders + items on floor grids
      } else if (scene.image_url || scene.shots?.length) {
        if (scene.scene_view === 'skybox' && _bgInstance) {
          this._showBgScene()                                   // reveal the 3D canvas, fade out the flat layer
          _bgInstance.setSkyboxFromUrl(scene.image_url, 0.3).catch(() => {})
        } else if (scene.shots?.length > 1) {
          this._startShotPlayback(scene)                        // storyboard: images follow the narration
        } else {
          this._showShot(scene.shots?.[0], scene.image_url)     // flat 2D Ken Burns, or layered when the shot has bg_url
        }
      } else if (scene.kind !== 'map') {
        this._showFlatColor(scene.background_color, scene.background_gradient)
      }

      // No narration audio (e.g. a not-yet-narrated scene): hold on the visual for its set duration
      // (or a short default), then advance — never build `new Audio(null)`, which would hang the queue.
      if (!scene.audio_url) {
        const holdMs = (Number(scene.duration_seconds) > 0 ? Number(scene.duration_seconds) : 4) * 1000
        clearTimeout(this._noAudioHold)
        this._noAudioHold = setTimeout(() => this._afterSceneAudio(index, scene), holdMs)
        return
      }

      // Narrator is a flat 2D portrait badge — play the scene audio directly; its end moves on.
      this._startNarration(scene, { onEnded: () => this._afterSceneAudio(index, scene) })
    },

    /**
     * The ONE way a scene's narration starts, whatever the scene kind: a fresh track with the
     * chosen volume, subtitles/script tags wired to it, and every handler gated on the track still
     * being the CURRENT one — a student who jumps away mid-sentence discards it, and it must not
     * pace or advance anything behind them.
     *
     * @param {object} scene has audio_url + script
     * @param {{ onDuration?: (sec:number)=>void, onEnded?: ()=>void }} [hooks]
     *   onDuration: the track's real length is known (pace a map tour / slideshow against it).
     *   onEnded: the narration finished — only for scenes the VOICE paces (story, game intro).
     *   A voice-over (map, voyage, gallery) leaves it off: the stage itself decides when to move on.
     */
    _startNarration (scene, { onDuration = null, onEnded = null } = {}) {
      const a = this._audio = new Audio(scene.audio_url)
      this._attachAudioListeners()
      this._lastEventIndex = 0
      const seekTo = this._seekOnStart
      this._seekOnStart = 0
      a.addEventListener('loadedmetadata', () => {
        if (this._audio !== a) return
        if (seekTo > 0) a.currentTime = Math.min(seekTo, a.duration || seekTo)
        this._scriptEvents = parseScriptTags(scene.script, a.duration)
        if (onDuration) onDuration(a.duration)
      })
      a.addEventListener('timeupdate', () => {
        if (this._audio !== a) return
        this._processScriptEvents()
        this._momentAtTime(scene, a)
      })
      if (onEnded) a.addEventListener('ended', () => { if (this._audio === a) onEnded() }, { once: true })
      a.play().catch(e => console.warn('lesson-player: autoplay blocked', e))
      return a
    },

    // ── Game scene (quiz / strategy / debate) ──────────────────────────
    // Render the scene's backdrop like a normal slide, then run the challenge. If a spoken intro was
    // narrated we play it first and start the game when it ends (via _afterSceneAudio); with no audio
    // we go straight into the challenge — a quiz used to be silently skipped when its intro had no audio.
    _playGameScene (index, scene) {
      if (scene.image_url || scene.shots?.length) {
        this._showShot(scene.shots?.[0], scene.image_url)
      } else {
        this._showFlatColor(scene.background_color, scene.background_gradient)
      }
      if (scene.audio_url) {
        this._startNarration(scene, { onEnded: () => this._afterSceneAudio(index, scene) })
      } else {
        this._afterSceneAudio(index, scene)   // no narration → begin the quiz/challenge now
      }
    },

    // ── Map block slide ────────────────────────────────────────────────
    async _playMapScene (index, scene) {
      // Silence any narration carried over from the previous scene.
      if (this._audio && !this._audio.paused) { this._audio.pause(); this.audioPlaying = false }

      const cfg = scene.config || {}
      const mode = cfg.playback_mode === 'timed' ? 'timed' : 'interactive'

      // Load the MapLibre map block (+ its ~1 MB volcanoes/terrain chunk) on demand — it is no
      // longer eagerly bundled with the player. The module sets window.renderLessonMap on import.
      if (!window.renderLessonMap) {
        try {
          await import('./lesson-map.js')
        } catch (e) {
          console.warn('lesson-player: map block failed to load — skipping map scene', e)
          this._advanceScene(index)
          return
        }
      }

      const stage = document.getElementById('lesson-map-stage')
      if (stage && window.renderLessonMap) {
        stage.style.display = 'block'
        stage.innerHTML = ''
        // Inner child: MapLibre stamps position:relative on its container, which would collapse
        // a full-bleed host to height 0.
        const inner = document.createElement('div')
        inner.style.width = '100%'
        inner.style.height = '100%'
        stage.appendChild(inner)
        _mapInstance = window.renderLessonMap(inner, {
          qid: cfg.qid || null,
          fit: cfg.fit || null,                 // 'labels' → frame the pins, not the polity
          year: cfg.year ?? 1600,
          projection: cfg.projection || 'mercator',
          interactive: mode === 'interactive',
          annotations: cfg.annotations || [],   // read-only focus cities for students
        })

        // Map-pinned text labels follow the map as the student pans/zooms.
        const textHost = document.getElementById('lesson-text-overlay')
        if (this._textLayer && textHost) {
          this._textLayer.setProjector(_mapInstance.textProjector(textHost))
          _mapInstance.map.on('move', () => this._textLayer?.refreshPositions())
        }
      }

      // Narrate the map as a VOICE-OVER, exactly as a voyage leg does. A map scene is paced by the
      // map itself (interactive Continue, or the timed hold below), never by the length of the
      // audio, so this must not be wired to _afterSceneAudio or it would advance the queue twice.
      // Without this the script authored for a map scene was generated and stored but never heard.
      if (scene.audio_url) {
        // Walk the camera through the focus cities in the order the script names them, paced to
        // this narration. Started once the duration is known rather than at mount because the
        // pacing needs it, and MapLibre needs the style up before it will ease anywhere.
        this._startNarration(scene, { onDuration: (sec) => this._startMapItinerary(sec * 1000) })
      } else {
        this._startMapItinerary(null)   // no narration — the itinerary's own natural pace
      }

      this.showMapContinue = (mode === 'interactive')
      if (mode === 'timed') {
        const hold = Math.max(2, Number(cfg.hold_seconds) || 7) * 1000
        clearTimeout(_mapTimer)
        _mapTimer = setTimeout(() => this._advanceFromMap(index), hold)
      }
    },

    /**
     * Begin the focus-city tour for the map block now on screen.
     *
     * Waiting for the style is the map block's own business (see whenStyleReady in lesson-map.js) —
     * it is the only thing that knows when its style is up, and it has to get this right for the
     * palette too.
     *
     * @param {number|null} totalMs the narration duration to pace against, or null for the default
     */
    _startMapItinerary (totalMs) {
      try { _mapInstance?.startItinerary?.({ totalMs }) } catch (e) { console.warn('lesson-player: itinerary failed', e) }
    },

    // ── Voyage tour leg (kind 'voyage') ────────────────────────────────
    async _playVoyageScene (index, scene) {
      // (_playScene has already silenced the previous scene's narration.)
      const cfg = scene.config || {}

      // Narrate the leg as a VOICE-OVER while the ship sails. Deliberately not wired to
      // _afterSceneAudio: a voyage leg is paced by the map (onArrived → showMapContinue →
      // _startStageAuto), not by the length of the audio, so the track must never advance
      // the queue. Without this the narration authored for each leg was generated and stored
      // but never heard.
      if (scene.audio_url) this._startNarration(scene)
      if (!window.renderVoyageTour) {
        try {
          await import('./voyage-tour.js')
        } catch (e) {
          console.warn('lesson-player: voyage tour failed to load — skipping scene', e)
          this._advanceScene(index)
          return
        }
      }
      const stage = document.getElementById('lesson-map-stage')
      if (!stage || !window.renderVoyageTour) { this._advanceScene(index); return }
      stage.style.display = 'block'
      this.showMapContinue = false
      // ONE persistent map for the whole voyage — build it once, then play each leg on it (no
      // rebuild/re-fit between scenes). The map/ships/fog/trail survive; playLeg eases the camera.
      if (!_voyageInstance) {
        stage.innerHTML = ''
        const inner = document.createElement('div')
        inner.style.width = '100%'
        inner.style.height = '100%'
        stage.appendChild(inner)
        // Period place labels come from the landfalls themselves — each voyage scene's location
        // pinned at its leg's arrival. The teacher hides modern cities/borders via game_config.voyage_map.
        const legLabels = _sceneQueue
          .filter(s => s.kind === 'voyage' && s.location)
          .map(s => ({
            text: s.location,
            leg: Number((s.config || {}).leg) || 0,
            // Overview scene = the port the voyage leaves from; the rest = the leg's landfall.
            at: (s.config || {}).overview ? 'depart' : 'arrive',
          }))
        _voyageInstance = window.renderVoyageTour(inner, {
          voyage: cfg.voyage,
          // The editable copy for THIS scene's voyage. A lesson can hold several voyages, so the
          // per-voyage store is asked first; the older single copy is only good for its own id.
          def: lesson.game_config?.voyage_defs?.[cfg.voyage]
            || lesson.game_config?.voyage_def
            || null,
          view: cfg.view || 'globe',
          routeLine: lesson.game_config?.route_line || null, // styled/animated trail (lesson-wide)
          mapOptions: lesson.game_config?.voyage_map || null, // hide cities/borders, show place labels
          legLabels,
          paintedFog: lesson.game_config?.voyage_fog || null, // teacher-painted undiscovered regions
          overviewAnim: cfg.overview_anim || null,            // itinerary: draw the route on
          // On each arrival: show the carousel controls + start the 10s auto-advance.
          onArrived: () => { this.showMapContinue = true; this._startStageAuto(_sceneQueue[this._sceneIndex]) },
        })
      }
      // The itinerary scene: the whole voyage on one screen, no leg sailed. Same branch the editor
      // takes (see step3-scene-configurator) — without it the player sailed leg 0 instead, so a
      // scene the teacher had set to Overview arrived as just another waypoint.
      if (cfg.overview) {
        // Already fitted when it appears — no fly-in. A lesson that opens by panning across the
        // world before it settles reads as the map loading, not as the itinerary being presented.
        _voyageInstance.showOverview({ animate: false })
        // Nothing sails, so no arrival will ever fire: hand the class the same controls a landfall
        // gets — side arrows and the 10s auto-advance — or the lesson would stop here for good.
        this.showMapContinue = true
        this._startStageAuto(scene)
        return
      }
      _voyageInstance.playLeg(Number(cfg.leg) || 0, {
        intro: !!cfg.intro,
        stopImages: cfg.stop_images || [],
        gallery: cfg.gallery || null,
        hotspot: cfg.hotspot || null,
      })
    },

    // ── Stage slide auto-advance (voyage landfall, gallery) ─────────────
    //
    // A stage slide that asks nothing of the class moves on by itself once its narration and a
    // short look are done, like a story scene (rules + timing in scene/stage-auto.js). This used
    // to run on voyage lessons only, and a gallery never started it at all, so every gallery sat
    // on its last image until somebody pressed Next.
    //
    // It must outlast the narration: this used to advance on a flat ten seconds from the ship's
    // arrival, and a leg with thirty seconds to say was cut mid-sentence ("hij is om Australië
    // heen gevaren zonder het te zien,"). So the voice decides; the floor is for a silent slide.
    _startStageAuto (scene) {
      this._cancelVoyageAuto()
      const floorMs = stageFloorMs(scene)

      let elapsed = 0
      let last = performance.now()
      let silentAt = null        // when the narration finished, measured on the same clock

      const tick = (now) => {
        // Hold the countdown while the landfall gallery is open, or while the student has paused —
        // an auto-advance that fires on a paused stage is just a lost stop.
        if (!window.__voyageGalleryOpen && !this.playbackPaused) elapsed += now - last
        last = now

        // `ended` rather than `paused`: a student who pauses mid-sentence has not finished hearing
        // it, and must not have the stop taken away when they come back. `error` is here because a
        // track that fails to load never ends, and without it the lesson would simply stop.
        const audio = this._audio
        const speaking = audio && !audio.ended && !audio.error
        if (!speaking && silentAt === null) silentAt = elapsed

        const { progress, done } = stageAdvance({ elapsed, silentAt, floorMs })
        this.autoAdvanceProgress = progress
        if (done) { this.advanceMap(); return }
        _autoAdvanceRaf = requestAnimationFrame(tick)
      }
      _autoAdvanceRaf = requestAnimationFrame(tick)
    },
    _cancelVoyageAuto () {
      if (_autoAdvanceRaf) { cancelAnimationFrame(_autoAdvanceRaf); _autoAdvanceRaf = null }
      this.autoAdvanceProgress = 0
    },

    // ── Image gallery (kind 'gallery') — auto-cycling slideshow that moves on by itself ──
    //
    // Narrated like a map block: a VOICE-OVER (subtitles and all), not wired to _afterSceneAudio;
    // the stage countdown (_startStageAuto) moves on once the voice and the images are done. And paced like the map's itinerary: once the narration's length is known
    // the images spread across it, instead of a fixed 5 s cycle that ran out long before the voice.
    // It used to stop the audio and never start its own, so the narration was generated but unheard.
    _playGalleryScene (index, scene) {
      const cfg = scene.config || {}
      const stage = document.getElementById('lesson-map-stage')
      if (!stage) { this._advanceScene(index); return }
      stage.style.display = 'block'
      stage.innerHTML = ''
      const gallery = _galleryInstance = renderGallery(stage, cfg)
      if (scene.audio_url) {
        this._startNarration(scene, { onDuration: (sec) => { if (_galleryInstance === gallery) gallery.pace(sec * 1000) } })
      }
      // Next still leaves early; otherwise it moves on once the voice and the images are done.
      this.showMapContinue = true
      this._startStageAuto(scene)
    },

    // A whole scene that is one film. The embed is already full-bleed on the stage (see the
    // bg_embed block in _playScene), so all that is left is to stop any narration still running
    // and hand the pacing to the class: a video runs as long as it runs, and Continue moves on.
    _playVideoScene (index, scene) {
      if (this._audio && !this._audio.paused) { this._audio.pause(); this.audioPlaying = false }
      this._teardownStageScene()   // a map/gallery stage from the scene before would cover the film
      if (!scene.config?.bg_embed?.src) { this._showFlatColor(scene.background_color, scene.background_gradient) }
      this.showMapContinue = true
    },

    // Called by Next on a stage slide (interactive) and the timer (timed).
    advanceMap () {
      this._advanceFromMap(this._sceneIndex)
    },

    // The deck's skip controls. Prev / next work like a music player's: they are there on every
    // scene, greyed out on a quiz (a student answers it, never skips it) unless the viewer is the
    // teacher testing their own lesson.
    get _hasSlides () {
      return _sceneQueue.length > 1
    },
    get canSkip () {
      if (!this._hasSlides) return false
      const onQuiz = this.currentIsGame || this.phase === 'GAME_BRIEF'
      return !onQuiz || !!lesson.can_skip_quiz
    },
    // A stage slide's Next finishes the scene, so it is always allowed; a jump is only allowed into
    // a scene the student already reached.
    get hasNextSlide () {
      if (this._sceneIndex >= _sceneQueue.length - 1) return false
      return this.showMapContinue || lesson.game_type === 'voyage' || this.mayEnter(this._sceneIndex + 1)
    },

    // Next slide (→). A stage slide leaves through its own exits (Build Out, the voyage's persistent
    // map); a narrated scene jumps like a chapter click.
    nextSlide () {
      if (!this.canSkip) return
      if (this.showMapContinue || lesson.game_type === 'voyage') { this.advanceMap(); return }
      this.goToChapter(this._sceneIndex + 1)
    },

    // Previous slide (←). Replays the previous scene from its start.
    previousSlide () {
      // Step over a game the class already played: those are never replayed (mayEnter).
      let i = this._sceneIndex - 1
      while (i >= 0 && !this.mayEnter(i)) i--
      if (i < 0) return
      this._teardownStageScene()
      this._sceneIndex = i
      this._playScene(i)
    },

    _teardownStageScene (full = false) {
      clearTimeout(_mapTimer)
      _mapTimer = null
      this._cancelVoyageAuto()
      // Voyage lessons keep ONE persistent map across all legs — between scenes we only stop the
      // sail (playLeg re-drives it) and keep the map alive. Full teardown runs at lesson end /
      // player unmount (below), or when leaving voyage for a different scene kind.
      if (_voyageInstance && lesson.game_type === 'voyage' && !full) { this.showMapContinue = false; return }
      if (_galleryInstance) { try { _galleryInstance.destroy() } catch (_) {} _galleryInstance = null }
      this._textLayer?.setProjector(null)   // map gone — pinned labels fall back to screen spots
      if (_mapInstance) { try { _mapInstance.destroy() } catch (_) {} _mapInstance = null }
      if (_voyageInstance) { try { _voyageInstance.destroy() } catch (_) {} _voyageInstance = null }
      const stage = document.getElementById('lesson-map-stage')
      if (stage) { stage.style.display = 'none'; stage.innerHTML = '' }
      this.showMapContinue = false
    },

    _advanceFromMap (index) {
      // Exits BEFORE the teardown: tearing the stage down first removes the very layers that are
      // supposed to be leaving, so the teacher's Build Out would never be seen on a map scene.
      this._afterExits(() => {
        this._teardownStageScene()
        this._advanceSceneNow(index)
      })
    },

    /**
     * Let this scene's layers leave, then carry on.
     *
     * Runs `done` immediately when nothing is animating out, so an undecorated lesson keeps its
     * current pacing exactly. The wait is capped: a teacher can set a 10s delay on a layer, and a
     * class should not sit looking at a finished scene for that long because one icon is late.
     */
    _afterExits (done) {
      let wait = 0
      try { wait = this._artLayer?.playExits?.() || 0 } catch (_) { wait = 0 }

      clearTimeout(this._exitTimer)
      if (wait <= 0) { done(); return }
      this._exitTimer = setTimeout(done, Math.min(wait, MAX_EXIT_WAIT_MS))
    },

    // Advance to the next queued scene, or end the run — after the layers have left.
    _advanceScene (index) {
      this._afterExits(() => this._advanceSceneNow(index))
    },

    _advanceSceneNow (index) {
      this._tel.log('scene_completed', { sceneIndex: index, sceneId: _sceneQueue[index]?.id })
      const next = index + 1
      if (next < _sceneQueue.length) {
        this._sceneIndex = next
        this._playScene(next)
      } else {
        this._onAudioEnded()
      }
    },

    _onAudioEnded () {
      if (this.phase === 'GAME_BRIEF') {
        this._transitionToGameActive()
      } else {
        // End of the narrative. Games are now driven by their own kind='game' scene, so the
        // old end-of-narration team reveal is no longer the fallback — finish the lesson.
        this._endLesson()
      }
    },

    _transitionToGameBrief () {
      this.phase = 'GAME_BRIEF'
      this._moveAvatarTo('right-centre')

      // Narrate the setup if a brief-audio segment exists, but DON'T auto-advance — the challenge
      // stays on screen until the teacher taps "Begin the challenge" (beginGame), so students have
      // time to read the story-aligned scenario.
      if (lesson.game_brief_audio_url) {
        this._audio = new Audio(lesson.game_brief_audio_url)
        this._attachAudioListeners()
        this._audio.play().catch(() => {})
      }
    },

    _transitionToGameActive () {
      if (this.phase === 'TIME_UP') return
      this.phase = 'GAME_ACTIVE'

      if (this._audio && !this._audio.paused) this._audio.pause()
      this._moveAvatarTo('bottom-right')

      this.timerSeconds = lesson.game_duration_seconds ?? this._gameDurationSecs
      this._showBigTimer()

      // Show big timer for 5 seconds then shrink to HUD
      setTimeout(() => this._hideBigTimer(), BIG_TIMER_MS)

      this._startTimer()

      // Schedule intel drop if configured
      if (lesson.intel_drop_at_seconds) {
        const msUntilDrop = lesson.intel_drop_at_seconds * 1000
        setTimeout(() => this._triggerIntelDrop(), msUntilDrop)
      }
    },

    // ── Game flow (driven by a kind='game' scene) ──────────────────────
    // When narration reaches a game scene we play its intro audio, then show the
    // story-aligned challenge brief. The teacher taps "Begin the challenge" to start
    // the timer and "Continue the lesson" afterwards to return to the narrative.
    _afterSceneAudio (index, scene) {
      // Story game: branch scenes hand control to the engine (choice overlay after a
      // question, delta/consequence/game-over flow after a chosen option).
      if (this._storyGame?.handleSceneEnd(index, scene)) return
      // A power-meter moment the narration reached the end of (or one timed past the narration).
      if (this._momentDue(index, scene)) {
        this._beginMoment(index, scene, () => this._afterSceneAudio(index, scene))
        return
      }
      if (scene && scene.kind === 'game') {
        this._gameResumeIndex = index + 1
        this.canResumeAfterGame = this._gameResumeIndex < _sceneQueue.length
        // Quiz segments show the actual questions inline (navigable card overlay);
        // the timer/teams flow below belongs to strategy games only.
        const segmentQuestions = scene.quiz_questions?.length ? scene.quiz_questions : lesson.quiz_questions
        if (scene.game_type === 'quiz' && segmentQuestions?.length) {
          this._beginQuizFlow(segmentQuestions, scene.quiz_shuffle, scene.id ?? null)
          return
        }
        // Team game on the class screen: the teacher enters each team's choice, then the lesson goes on.
        if (scene.game_type === 'team' && scene.config?.team) {
          this._beginTeamFlow(scene)
          return
        }
        this._beginGameFlow(scene)
        return
      }
      this._tel.log('scene_completed', { sceneIndex: index, sceneId: _sceneQueue[index]?.id })
      const next = index + 1
      if (next < _sceneQueue.length) {
        this._sceneIndex = next
        this._playScene(next)
      } else {
        this._onAudioEnded()
      }
    },

    async _renderSceneTexts (scene) {
      const host = document.getElementById('lesson-text-overlay')
      if (!host) return
      const texts = scene?.config?.texts || []
      if (!texts.length && !this._textLayer) return
      const { TextOverlayLayer } = await import('./scene/TextOverlayLayer.js')
      this._textLayer = this._textLayer || new TextOverlayLayer(host, { editable: false })
      this._textLayer.setTexts(texts)
      // The map block may already be up (this import is async) — pin labels to it now.
      if (_mapInstance) {
        this._textLayer.setProjector(_mapInstance.textProjector(host))
        _mapInstance.map.on('move', () => this._textLayer?.refreshPositions())
      }
    },

    // Balloons sit in the plate's box, the same box as the figures, so a mouth given in % of it
    // lands on the drawn mouth at any screen shape.
    async _renderSceneBalloons (scene) {
      const req = this._balloonReq = (this._balloonReq || 0) + 1
      const host = document.getElementById('lesson-balloons')
      if (!host) return
      const lines = scene?.config?.lines || []
      if (!lines.length && !this._balloons) return
      const { BalloonLayer } = await import('./scene/BalloonLayer.js')
      this._balloons = this._balloons || new BalloonLayer(host)
      const layers = (scene.shots || [])[0]?.layers
      const cover = (layers || []).find(l => l?.url && !isClipartLayer(l))
      const aspect = (scene.config || {}).background_fit === 'contain' && cover ? await plateAspect(cover.url) : null
      if (req !== this._balloonReq) return
      fitToPlate(host, host.parentElement, aspect, layers)
      this._balloonSource = lines
      this._refreshBalloonText()
    },

    /** The balloons' words in the subtitle language when that is on and cached, else the original. */
    _refreshBalloonText () {
      const host = document.getElementById('lesson-balloons')
      if (!this._balloons || !host) return
      const cached = Object.keys(this.ccSets[this.captionLang]?.texts || {}).length > 0
      const lang = this.captionsOn && cached ? this.captionLang : lesson.source_language
      host.lang = lang
      host.dir = this.ccDir(lang)
      this._balloons.setLines((this._balloonSource || []).map(l => ({ ...l, text: this._crewed(this._ccLine(l.text)) })))
      if (this._audio) this._balloons.update(this._audio.currentTime)
    },

    // Read-only clipart layers a teacher placed ON TOP of a voyage map. Same %-coordinate box as
    // the text overlay (both full-bleed, above the map stage), so a layer sits where the editor
    // showed it. Any non-voyage scene has no such layers → the host hides itself.
    async _renderSceneArtwork (scene) {
      // A number, not the scene: Alpine hands back a reactive proxy, never the object stored.
      const req = this._artReq = (this._artReq || 0) + 1
      const host = document.getElementById('lesson-voyage-art')
      if (!host) return
      const layers = ((scene.shots || [])[0]?.layers || []).filter(l => (l?.url || l?.embed) && isClipartLayer(l))
      if (!layers.length && !this._artLayer) { host.style.display = 'none'; return }
      const { ArtworkOverlay } = await import('./scene/ArtworkOverlay.js')
      this._artLayer = this._artLayer || new ArtworkOverlay(host, { readonly: true })
      const onTop = !!(scene.config || {}).clipart_on_top
      this._artLayer.setOnTop(onTop)
      this._artLayer.setStackLevels(30, 32)   // on the nodes: a z-index on the host would kill blending
      host.style.display = layers.length ? '' : 'none'
      // Whole image: the figures share the backdrop plate's box (see ParallaxScene), so their x/y
      // land on the same spot of the drawn floor at any screen shape. Otherwise the whole stage.
      const cover = ((scene.shots || [])[0]?.layers || []).find(l => l?.url && !isClipartLayer(l))
      const aspect = (scene.config || {}).background_fit === 'contain' && cover ? await plateAspect(cover.url) : null
      if (req !== this._artReq) return   // a newer scene took the stage while the plate loaded
      fitToPlate(host, host.parentElement, aspect, (scene.shots || [])[0]?.layers)
      // Layers pinned to a place need the map before they are seeded, or the first paint puts
      // them at whatever x/y the editor's camera happened to leave behind. Same projector, same
      // host box, as the text labels above.
      if (_mapInstance && typeof _mapInstance.textProjector === 'function') {
        this._artLayer.setProjector(_mapInstance.textProjector(host))
        if (!_mapInstance.map.__artMoveBound) {
          _mapInstance.map.__artMoveBound = true
          _mapInstance.map.on('move', () => this._artLayer?.refreshPositions())
        }
      }
      // Blend-into-scene samples its colours here; occlusion reads the plate's depth map.
      this._artLayer.setBackdrop(cover?.url, (scene.config || {}).backdrop_depth)
      this._artLayer.setLayers(layers)
      // Each layer arrives the way the teacher set it in the Animate tab. Run after setLayers,
      // which rebuilds the nodes the animation targets.
      this._artLayer.playEntrances()
    },

    // Quiz segment: step through the lesson's questions in the card overlay, then
    // resume the story where it left off.
    async _beginQuizFlow (questions, shuffleMode = 'per_player', quizSceneId = null) {
      this._tel.log('quiz_started', { sceneIndex: this._sceneIndex, sceneId: quizSceneId ?? undefined })
      const host = document.getElementById('lesson-game-overlay')
      if (!host) { this._resumeAfterQuiz(); return }
      const { QuizOverlay } = await import('./scene/QuizOverlay.js')
      this._quizOverlay = this._quizOverlay || new QuizOverlay(host)
      // Back on a quiz they finished: show their answers, never a second go (the teacher may retry).
      const quizIndex = this._sceneIndex
      const finished = this._quizRuns.get(quizIndex)
      if (finished && !lesson.can_skip_quiz) {
        this._quizOverlay.review(finished, { onComplete: () => this._resumeAfterQuiz() })
        return
      }
      this._quizOverlay.show({
        questions: questions || lesson.quiz_questions,
        submitUrl: lesson.quiz_score_url || null,
        leaderboardUrl: lesson.leaderboard_url || null,
        hasClassroom: Boolean(lesson.has_classroom),
        shuffleMode,
        quizSceneId,
        onComplete: (run) => {
          if (run) this._quizRuns.set(quizIndex, run)
          this._resumeAfterQuiz()
        },
      })
    },

    async _beginTeamFlow (scene) {
      const host = document.getElementById('lesson-game-overlay')
      if (!host) { this._resumeAfterQuiz(); return }
      const index = this._sceneIndex
      const { TeamGame } = await import('./scene/TeamGame.js')
      // A chapter jump during the import has moved the class on; the game must not open over it.
      if (this._sceneIndex !== index) return
      this._teamGame = this._teamGame || new TeamGame(host)
      const team = scene.config.team
      const crewed = Object.fromEntries(['title', 'intro', 'rules', 'situation', 'question', 'reveal', 'closing']
        .filter(k => typeof team[k] === 'string').map(k => [k, this._crewed(team[k])]))
      this._teamGame.show({ config: { ...team, ...crewed }, solo: this.playSolo, onComplete: () => this._resumeAfterQuiz() })
    },

    /** A line with the crews' names put in ({crew:heemskerck}); "the crew" when there was no race. */
    _crewed (text) {
      return crewText(text, this._crew, t('the crew'))
    },

    // ── Power-meter moment (scene config.moment; scene/PowerMeter.js) ───────────────────
    // The panel's narration reaches the stuck point, the player holds, the class (or the pupil)
    // fills the meter, the payoff and the after line play, and the story goes on. A moment plays
    // once: jumping back to its panel plays the panel without it.

    /** A moment on this scene that has not played; `timed` asks for one set at a second mark. */
    _momentDue (index, scene, timed = false) {
      const m = scene?.kind !== 'game' ? scene?.config?.moment : null
      if (!m || m.enabled === false || this._momentActive || this._done.includes(scene.id)) return false
      // These fill without words (MomentSpec::WORDLESS_INPUTS).
      const sound = ['loudness', 'blow', 'rhythm', 'silence', 'motion'].includes(m.input)
      if (!sound && !(m.words?.right || []).some(w => String(w || '').trim())) return false
      const at = Number(m.at)
      return timed ? m.at !== 'end' && Number.isFinite(at) : true
    },

    _momentAtTime (scene, a) {
      const index = this._sceneIndex
      if (!this._momentDue(index, scene, true) || a.currentTime < Number(scene.config.moment.at)) return
      a.pause()
      this._beginMoment(index, scene, () => { if (this._audio === a) a.play().catch(() => {}) })
    },

    async _beginMoment (index, scene, resume) {
      const epoch = this._playEpoch
      const current = () => this._playEpoch === epoch
      this._momentActive = true
      const host = document.getElementById('lesson-game-overlay')
      if (!host) { this._momentActive = false; resume(); return }
      const mod = await import('./scene/PowerMeter.js')
      // A chapter jump during the import has moved the class on.
      if (!current()) return
      let cfg = scene.config.moment
      const art = document.getElementById('lesson-voyage-art')
      this._tel.log('moment_started', { sceneIndex: index, sceneId: scene.id })
      this._powerMeter = this._powerMeter || new mod.PowerMeter(host)
      const { figureRects } = await import('./scene/card-place.js')
      const race = cfg.race?.enabled ? await this._openRace(scene, cfg, art) : null
      if (!current()) { race?.close(); return }
      // No ship to race (its layer is gone): the moment plays as a single meter, no crews.
      if (cfg.race?.enabled && !race) cfg = { ...cfg, race: { ...cfg.race, enabled: false } }
      this._hideBalloons(true)
      const m = mod.readMoment(cfg)
      // In a race the pupil's own lane is the near one and the fleet's the far one.
      const lane = (meter) => (race && this.playSolo ? 1 : meter)
      // Skipped or full, the story still moves: history decides what happens, the game only when.
      // The race on the teams' phones ends here too, with the server's result.
      const finish = async (outcome) => {
        if (!current()) return
        this._done = [...this._done, scene.id]
        this._saveProgress()
        this._tel.log(outcome.skipped ? 'moment_skipped' : 'moment_completed', { sceneIndex: index, sceneId: scene.id })
        // The stage on the water now: the phones' lobby may have rebuilt it for another team count.
        const stage = race ? (this._race ?? race) : null
        const raced = stage && !outcome.skipped && outcome.crew
        if (raced) this._crownRace(stage, outcome, scene)
        await (stage
          ? stage.sailOut(Number(cfg.payoff?.to_x) || m.race.finishX + 10, Number(cfg.payoff?.duration) || 6)
          : this._momentPayoff(mod, cfg.payoff || {}, art))
        if (!current()) return
        // After a race the narrator names the crews; their names are only known now, so it is read.
        // A pupil who raced the fleet alone gets the solo line: there is no Zeehaen crew to name.
        const raceLine = this.playSolo ? (m.race.afterSolo || m.race.after) : m.race.after
        await this._momentAfterLine(mod, raced && raceLine ? { after: this._crewed(raceLine), afterAudio: '' } : m)
        if (!current()) return
        this._powerMeter.hide()
        this._closeRace()
        this._hideBalloons(false)
        this._momentActive = false
        this.playbackPaused = false
        resume()
      }
      const avoid = () => [...figureRects(art, host, [cfg.react?.layer, cfg.payoff?.layer].filter(Boolean)), ...(race ? race.band(host) : [])]
      this._powerMeter.show({
        config: { ...cfg, prompt: this._crewed(cfg.prompt) },
        solo: this.playSolo,
        best: race && this.playSolo ? readBest(safeStorage('localStorage'), `${lesson.lesson_code}:${scene.id}`) : null,
        avoid,
        onReact: (meter) => mod.gust(race ? race.node(lane(meter)) : mod.layerNode(art, cfg.react?.layer), cfg.react || {}),
        onProgress: race ? ({ levels, ghost }) => race.update(this.playSolo ? [ghost ?? 0, levels[0] ?? 0] : levels) : null,
        // A teacher's class race can move to the teams' phones before anyone has played.
        onPhones: race && !this.playSolo && lesson.race ? () => this._racePhones(scene, cfg, art, host, avoid, finish, current) : null,
        onDone: finish,
      })
    },

    /**
     * The race on the teams' phones: open it on the server, show the lobby (QR, code, team names),
     * follow it by polling, move the lanes with the server's progress, and finish with its crews.
     */
    async _racePhones (scene, cfg, art, host, avoid, finish, current) {
      if (this._raceRun || this._racePhonesOpening) return
      this._racePhonesOpening = true
      try {
        await this._racePhonesOpen(scene, cfg, art, host, avoid, finish, current)
      } finally {
        this._racePhonesOpening = false
      }
    },

    async _racePhonesOpen (scene, cfg, art, host, avoid, finish, current) {
      const send = (url, method, body) => fetch(url, {
        method,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '' },
        body: body ? JSON.stringify(body) : undefined,
      })
      const opened = await send(lesson.race.store_url, 'POST', { scene_id: scene.id }).catch(() => null)
      if (!opened?.ok) {
        if (!current()) return
        // The meter card is still up: say so in it, and the class plays the race on this screen.
        const note = document.createElement('div')
        note.className = 'alert alert-warning text-sm'
        note.textContent = t('The race could not be opened. Play it on this screen.')
        host.querySelector('.card-body')?.prepend(note)
        return
      }
      let state = await opened.json()
      // Recorded at once: whatever happens next (a chapter jump mid-await), _closeRace deletes it.
      const runUrl = this._raceRun = `${lesson.race.run_url}/${state.code}`
      const gone = () => { if (!current()) { this._closeRace(); return true } return false }
      const [{ RaceLobby }, { RaceClient }] = await Promise.all([import('./scene/race-lobby.js'), import('./scene/race-sync.js')])
      if (gone()) return
      this._powerMeter.hide()
      const lobby = this._raceLobby = new RaceLobby(host)
      let finished = false
      // The lanes follow the lobby's teams: renamed in place, rebuilt (the stage only) when the
      // teacher adds or removes a team.
      const lanesFor = async (teams) => {
        if (this._race?.laneCount === teams.length) return teams.forEach((team, i) => this._race.label(i, team.name))
        this._race = await this._openRace(scene, cfg, art, teams.map(team => team.name))
      }
      const apply = async (next) => {
        if (!current() || finished) return
        // Decided before any await: a PATCH answer and a poll can both bring the finish.
        if (next.state === 'finished') finished = true
        state = next
        await lanesFor(next.teams)
        if (gone()) return
        this._race?.update(next.teams.map(team => team.progress / next.goal))
        if (!finished) return lobby.update(next)
        this._raceClient?.stop()
        lobby.hide()
        const names = next.teams.map(team => team.name)
        const roles = next.roles || {}
        // The crews as the server decided them (an early end ranks teams that never finished too).
        const order = ['heemskerck', 'zeehaen'].map(ship => next.teams.findIndex(team => team.id === roles[ship])).filter(i => i >= 0)
        const crew = Object.fromEntries(order.map((i, place) => [place === 0 ? 'heemskerck' : 'zeehaen', names[i]]))
        finish({ skipped: false, order, names, crew })
      }
      const act = async (body) => {
        const res = await send(runUrl, 'PATCH', body).catch(() => null)
        if (res?.ok) apply(await res.json())
      }
      lobby.show({
        race: state,
        joinUrl: `${lesson.race.device_url}/${state.code}`,
        drawQr: (canvas, url) => QRCode.toCanvas(canvas, url, { width: 224, margin: 1 }).catch(() => {}),
        avoid,
        onNames: (names) => act({ names }),
        onStart: () => act({ action: 'start' }),
        onEnd: () => act({ action: 'end' }),
      })
      await lanesFor(state.teams)
      if (gone()) return
      this._raceClient = new RaceClient({
        urls: { state: `${lesson.race.device_url}/${state.code}/state` },
        pollMs: lesson.race.screen_poll_ms,
        onState: apply,
        onGone: () => { if (!finished) finish({ skipped: true }) },
      })
      this._raceClient.start()
    },

    /** The panel's ship once per team (or the pupil and the 1642 fleet), as the race's lanes. */
    async _openRace (scene, cfg, art, teamNames = null) {
      const shipId = cfg.react?.layer ?? cfg.payoff?.layer
      const layers = ((scene.shots || [])[0]?.layers || []).filter(l => (l?.url || l?.embed) && isClipartLayer(l))
      const ship = layers.find(l => String(l.asset_id) === String(shipId))
      if (!ship || !this._artLayer || !art) return null
      const { RaceStage } = await import('./scene/race-stage.js')
      const teams = Number(cfg.teams) >= 2 ? Number(cfg.teams) : 4
      const names = teamNames ?? (this.playSolo
        ? [t('The 1642 fleet'), t('You')]
        : Array.from({ length: teams }, (_, i) => t('Team :number', { number: i + 1 })))
      // Only the stage: a race on the phones keeps its server run and its polling.
      this._race?.close()
      this._race = new RaceStage({ overlay: this._artLayer, host: art })
      const race = cfg.race || {}
      this._race.open({ layers, ship, lanes: names.length, startX: Number(race.start_x ?? 25), finishX: Number(race.finish_x ?? 85), names })
      return this._race
    },

    /** The crews for the rest of this run, their ships named on the lanes, a pupil's best time kept. */
    _crownRace (race, outcome, scene) {
      this._crew = outcome.crew
      saveCrew(safeStorage('sessionStorage'), lesson.lesson_code, outcome.crew)
      if (this.playSolo) {
        race.label(1, `${t('You')} · Heemskerck`)
        if (outcome.seconds) saveBest(safeStorage('localStorage'), `${lesson.lesson_code}:${scene.id}`, outcome.seconds)
        return
      }
      // The phones' race names its own teams; the class-screen race uses the meter's.
      const names = outcome.names ?? this._powerMeter.names
      ;(outcome.order || []).slice(0, 2).forEach((team, place) => {
        race.label(team, `${names[team]} · ${place === 0 ? 'Heemskerck' : 'Zeehaen'}`)
      })
    },

    _closeRace () {
      this._race?.close()
      this._race = null
      this._raceClient?.stop()
      this._raceClient = null
      this._raceLobby?.hide()
      this._raceLobby = null
      // A race on the phones lives only as long as its moment: the server forgets it now.
      if (this._raceRun) {
        fetch(this._raceRun, { method: 'DELETE', credentials: 'same-origin', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '' } }).catch(() => {})
        this._raceRun = null
      }
    },

    /** A balloon left over from the panel's last line must not sit on the meter. */
    _hideBalloons (hidden) {
      document.getElementById('lesson-balloons')?.classList.toggle('invisible', hidden)
    },

    _momentPayoff (mod, payoff, art) {
      if (payoff.type === 'move') return mod.sail(mod.layerNode(art, payoff.layer), art, payoff)
      if (payoff.type === 'camera' && _parallax) return _parallax.runCamera(payoff.camera)
      return Promise.resolve()
    },

    /** The narrator's after line: recorded when the lesson was narrated, else shown to read. */
    async _momentAfterLine (mod, m) {
      if (!m.after) return
      this._powerMeter.say(m.after)
      if (m.afterAudio) {
        const a = this._momentAudio = new Audio(m.afterAudio)
        a.volume = this.audioMuted ? 0 : this.volumeLevel
        await new Promise((done) => {
          ['ended', 'error', 'pause'].forEach(e => a.addEventListener(e, done, { once: true }))
          a.play().catch(done)
        })
        this._momentAudio = null
      } else {
        await new Promise((done) => setTimeout(done, mod.readingMs(m.after)))
      }
    },

    _stopMomentAudio () {
      const a = this._momentAudio
      this._momentAudio = null
      if (a) { try { a.pause(); a.removeAttribute('src') } catch (_) { /* gone */ } }
    },

    _resumeAfterQuiz () {
      const next = this._gameResumeIndex ?? this._sceneIndex + 1
      if (next < _sceneQueue.length) {
        this._sceneIndex = next
        this._playScene(next)
      } else {
        this._onAudioEnded()
      }
    },

    _beginGameFlow (scene) {
      this._gameScene = scene
      if (scene.duration_seconds) this._gameDurationSecs = scene.duration_seconds
      this._transitionToGameBrief()
    },

    beginGame () {
      if (this._audio && !this._audio.paused) this._audio.pause()
      this._transitionToGameActive()
    },

    resumeAfterGame () {
      if (this._timerInterval) clearInterval(this._timerInterval)
      this.canResumeAfterGame = false
      const next = this._gameResumeIndex
      if (next != null && next < _sceneQueue.length) {
        this.phase = 'INTRO'
        this._sceneIndex = next
        this._playScene(next)
      } else {
        this._endLesson()
      }
    },

    _endLesson () {
      this._tel.log('lesson_completed', { sceneIndex: this._sceneIndex })
      this._tel.flush()
      if (this._audio && !this._audio.paused) this._audio.pause()
      // A pupil who reached the end starts at the title next time, not on the last panel.
      if (this.playSolo) clearProgress(safeStorage('localStorage'), lesson.lesson_code)
      // The crews belong to this run of the lesson; the next class races again.
      clearCrew(safeStorage('sessionStorage'), lesson.lesson_code)
      this._crew = {}
      if (this._timerInterval) clearInterval(this._timerInterval)
      // The bed fades away over the closing screen rather than cutting on the last word.
      try { _music?.stop() } catch (_) {}
      _music = null
      try { this._teardownStageScene(true) } catch (_) { /* tear down the persistent voyage map */ }
      this.phase = 'ENDED'
      this.audioPlaying = false
      // Story game: the blade has no ENDED markup (everything x-hides), so the run
      // summary rendered into the engine's overlay host IS the finale screen.
      if (this._storyGame) this._storyGame.showSummaryInto(document.getElementById('story-game-overlay'))
    },

    // ── Timer ──────────────────────────────────────────────────────────
    _startTimer () {
      this._timerInterval = setInterval(() => {
        if (this.timerSeconds <= 0) {
          clearInterval(this._timerInterval)
          this.phase = 'TIME_UP'
          this._moveAvatarTo('middle')
          return
        }
        this.timerSeconds--
        this._paintTimer()
      }, 1000)

      this._paintTimer()
    },

    /** The clock, in both places it is shown: the corner HUD and the big centre countdown. */
    _paintTimer () {
      const m = Math.floor(this.timerSeconds / 60)
      const s = String(this.timerSeconds % 60).padStart(2, '0')
      this.timerDisplay = `${m}:${s}`
      this._bigTimer?.setText(this.timerDisplay, BIG_TIMER_DIGIT(this.timerSeconds))
    },

    /**
     * The remaining time, across the middle of the stage, for the opening seconds of a challenge.
     * Shared with the quiz's read-gate — see resources/js/big-countdown.js.
     */
    _showBigTimer () {
      const host = this.$refs?.bigTimer
      if (!host || this._bigTimer) return
      this._bigTimer = mountBigCountdown(host, {
        text: this.timerDisplay,
        digitClass: BIG_TIMER_DIGIT(this.timerSeconds),
      })
    },

    /** Scale it away to the corner HUD. Safe to call when nothing is showing. */
    _hideBigTimer () {
      const timer = this._bigTimer
      this._bigTimer = null
      timer?.leave()
    },

    // ── Intel drop ─────────────────────────────────────────────────────
    _triggerIntelDrop () {
      if (this.phase !== 'GAME_ACTIVE') return

      this.prevPhase = this.phase
      this.phase = 'INTEL_DROP'
      this.intelDropMessage = lesson.intel_drop_message ?? 'New intelligence has come in. Adapt your strategy!'

      // Play intel drop audio if available
      if (lesson.intel_drop_audio_url) {
        this._intelAudio = new Audio(lesson.intel_drop_audio_url)
        this._intelAudio.play().catch(() => {})
        this._intelAudio.addEventListener('ended', () => this._endIntelDrop())
      } else {
        setTimeout(() => this._endIntelDrop(), 8000)
      }

      // Extend timer by 5 minutes
      this.timerSeconds += 5 * 60
    },

    _endIntelDrop () {
      this.phase = 'GAME_ACTIVE'
      this.prevPhase = null
      this.intelDropMessage = ''
    },

    // ── Playback control ───────────────────────────────────────────────
    /**
     * "Playing" for the overlay is broader than narration: on a voyage the ship sailing
     * between stops IS playback (showMapContinue only turns true at a landfall). The
     * player chrome hides while this is true and the pointer is away from the edges.
     * A stage slide (interactive map, video, a landfall or gallery counting down) never counts:
     * its Next stays in reach, so the deck stays up even while its narration plays.
     */
    get isPlaying () {
      if (this.playbackPaused || this.showMapContinue) return false
      if (this.audioPlaying) return true
      return lesson.game_type === 'voyage'
        && (this.phase === 'INTRO' || this.phase === 'GAME_ACTIVE')
        && !this.showMapContinue
    },

    /**
     * The one play/pause for the whole stage. A scene plays in more ways than narration —
     * a voyage leg sails, a landfall counts down to the next one — and every one of them has
     * to stop on a single press, whether it came from the deck button, Space, or a click on
     * the stage. Anything scene-specific hangs off this, never off the audio element alone.
     */
    togglePlayback () {
      this.setPlaybackPaused(!this.playbackPaused)
    },

    /**
     * Show the centre glyph for a moment, as feedback for a press.
     *
     * While paused it simply stays (setPlaybackPaused leaves `playbackGlyph` true and the view
     * keeps it on for as long as `playbackPaused` is). On resume it fades out on its own.
     */
    _flashPlaybackGlyph () {
      // Always on a timer, paused or not: the view keeps the glyph up for as long as
      // `playbackPaused` is true, so the flag never has to. Leaving it true on a pause is how the
      // pause bars got stuck over every later scene — a chapter jump clears `playbackPaused`
      // directly and nothing was left to clear this.
      this.playbackGlyph = true
      clearTimeout(this._glyphTimer)
      this._glyphTimer = setTimeout(() => { this.playbackGlyph = false }, 700)
    },

    /** True when the player chrome (top bar, deck, scrims, centre glyph) is faded out. */
    get chromeHidden () {
      if (this.readingOverlay) return true
      if (this.currentIsGame) return false     // a quiz or game card is on screen: the class is working
      return this.isPlaying && !this.chromeAwake && !this.zoneHover && !this.chromeFocus && !this.chaptersOpen && !this.ccOpen
    },

    /** The centre glyph: up while paused, for a moment after a press, and with the chrome while playing. */
    get centreGlyphShown () {
      if (this.readingOverlay) return false
      return this.playbackPaused || this.playbackGlyph || (this.isPlaying && !this.chromeHidden)
    },

    /** Any pointer move, tap or key: show the chrome and restart the idle countdown. */
    wakeChrome () {
      this.chromeAwake = true
      clearTimeout(this._chromeTimer)
      this._chromeTimer = setTimeout(() => { this.chromeAwake = false }, this.chromeIdleMs)
    },

    /** Mouse over the top or bottom band keeps the chrome up. A touch has no hover to end it, so it never counts. */
    probeZones (e) {
      this.wakeChrome()
      const z = e.pointerType !== 'touch'
        && (e.clientY <= CHROME_IDLE.topBandPx || e.clientY >= window.innerHeight - CHROME_IDLE.bottomBandPx)
      if (z !== this.zoneHover) this.zoneHover = z
    },

    _registerChromeTuner () {
      window.__tune?.register('Player chrome', [
        { key: 'idleMs', label: 'Hide after idle (ms)', min: 300, max: 5000, step: 100, value: CHROME_IDLE.idleMs,
          apply: (v) => { this.chromeIdleMs = v } },
        { key: 'fadeInMs', label: 'Fade in (ms)', min: 0, max: 1000, step: 10, value: CHROME_IDLE.fadeInMs,
          apply: (v) => { this.chromeFadeInMs = v } },
        { key: 'fadeOutMs', label: 'Fade out (ms)', min: 0, max: 1500, step: 10, value: CHROME_IDLE.fadeOutMs,
          apply: (v) => { this.chromeFadeOutMs = v } },
      ], { tab: 'Player' })
    },

    setPlaybackPaused (pause) {
      this.playbackPaused = !!pause
      this._flashPlaybackGlyph()

      this._tel.log(this.playbackPaused ? 'pause' : 'resume', {
        sceneIndex: this._sceneIndex,
        sceneId: _sceneQueue[this._sceneIndex]?.id,
        position: this._audio?.currentTime,
      })

      // During a power-meter moment the narration is held by the moment, not by this button: only
      // the after line's recording pauses and resumes.
      const voice = this._momentActive ? this._momentAudio : this._audio
      if (voice) {
        if (this.playbackPaused) {
          voice.pause()
        } else {
          voice.play().catch(e => console.warn('lesson-player: resume blocked', e))
        }
      }

      // The sailing ship freezes mid-ocean and picks up from the same spot; the landfall's
      // auto-advance countdown stops accumulating (see _startStageAuto).
      try { _voyageInstance?.setPaused?.(this.playbackPaused) } catch (_) { /* map gone */ }

      // Same for a map block touring its focus cities: a student who pauses on Constantinople must
      // not come back to find the camera two cities further on than the narrator.
      try {
        if (this.playbackPaused) _mapInstance?.pauseItinerary?.()
        else _mapInstance?.resumeItinerary?.()
      } catch (_) { /* map gone */ }

      // Pausing the lesson pauses everything the lesson is making, music included — a bed still
      // playing over a frozen picture is how you get a teacher hunting for a second stop button.
      if (this.playbackPaused) _music?.pause()
      else _music?.resume()
    },

    _attachAudioListeners () {
      if (!this._audio) return
      // Every scene builds a fresh Audio, so the chosen volume/mute must be re-applied here —
      // without this, a muted lesson came back at full volume on the next scene.
      this._audio.volume = this.audioMuted ? 0 : this.volumeLevel
      this._audio.addEventListener('play', () => { this.audioPlaying = true }, { once: false })
      this._audio.addEventListener('pause', () => { this.audioPlaying = false }, { once: false })
      this._audio.addEventListener('ended', () => { this.audioPlaying = false }, { once: false })
    },

    toggleAudio () {
      if (!this._audio) return
      if (this._audio.paused) {
        this._audio.play().catch(e => console.warn('audio play failed:', e))
        this.audioPlaying = true
      } else {
        this._audio.pause()
        this.audioPlaying = false
      }
    },

    stopAudio () {
      if (!this._audio) return
      this._audio.pause()
      this._audio.currentTime = 0
      this.audioPlaying = false
    },

    /**
     * Mute means the lesson, not just the narration: the music bed and the quiz's right-answer
     * chime go quiet with it. A teacher who pressed M in a quiet classroom expects silence, and
     * a chime arriving anyway reads as the button being broken.
     */
    toggleMute () {
      this.audioMuted = !this.audioMuted
      if (this._audio) this._audio.volume = this.audioMuted ? 0 : this.volumeLevel
      this._syncSoundLevels()
    },

    /** Deck volume slider. Dragging to 0 mutes; dragging up from 0 unmutes. */
    setVolume (v) {
      const level = Math.min(1, Math.max(0, Number(v) || 0))
      this.audioMuted = level === 0
      if (level > 0) this.volumeLevel = level
      if (this._audio) this._audio.volume = level
      this._syncSoundLevels()
    },

    /** Push the deck's mute + volume out to everything else that makes a sound. */
    _syncSoundLevels () {
      const level = this.audioMuted ? 0 : this.volumeLevel
      _music?.setMuted(this.audioMuted)
      _music?.setVolume(this.volumeLevel)
      Sfx.setMuted(this.audioMuted)
      Sfx.setVolume(level)
    },

    // ── Subtitles ──────────────────────────────────────────────────────
    // Cues are built from the scene script against the audio's REAL length, which only the client
    // knows — duration_seconds is often unset, and Azure (the current narrator) returns no word
    // timings at all. Built once per scene, on the first timeupdate that reports a duration.
    _updateCaptions () {
      if (!this.captionsOn || !this._audio) { this.captionText = ''; return }

      const duration = this._audio.duration
      if (!Number.isFinite(duration) || duration <= 0) return

      if (!this._cues.length || this._cueDuration !== duration) {
        // A scene in lines has exact times per line: only the narrator's become captions. In
        // another subtitle language each line is translated whole and cut over its own span.
        this._cues = translatedCues(this._captionSource, duration, this.ccSets[this.captionLang], this.captionLang, lesson.source_language)
        this._cueDuration = duration
      }

      const cue = cueAt(this._cues, this._audio.currentTime)
      this.captionText = cue?.text || ''
      if (cue && cue.lang !== this.captionShownLang) this.captionShownLang = cue.lang
      if (cue && cue.source !== this.ccLineSource) this.ccLineSource = cue.source
    },

    /** Pick a state outright (the subtitles menu); toggleCaptions is the keyboard's way in. */
    /**
     * The title's subtitle spans exactly the series logo's LETTERS: one line, its font scaled to
     * the ink, not the image box (a wordmark file has room around its letters). Again once the
     * lettering font has loaded and whenever the logo's box changes size.
     */
    /** A comic title candidate (TitlePoster) into its host; see resources/js/title-poster.js. */
    mountTitlePoster (host) {
      this._stopTitlePoster?.()
      this._stopTitlePoster = mountPoster(host, host.querySelector('[data-poster-stage]'), this.lesson.title_poster)
      setTimeout(() => this.relayoutTitle(), 0)
    },

    /**
     * The title screen's measured layout: the "what you can expect" strip in a candidate's slot,
     * then the join QR clear of faces, letters and every element (resources/js/title-qr.js). Again
     * on every resize and once the lettering fonts and the title picture are in.
     */
    /**
     * Lay the title screen out from scratch: everything tries its own place again before giving
     * way (title-fit.js). On every change of what is measured (a new size, the fonts, the QR, the
     * picture), so a step taken while something was still loading never sticks. Passes of an
     * older run stop.
     */
    relayoutTitle () {
      if (this.phase !== 'TITLE_SCREEN') return
      this._fitRun = (this._fitRun ?? 0) + 1
      this._fitPasses = 0
      this._fitConfirmed = false
      this.expectInStrip = false
      this.titleFit = { ...FIT_START }
      const run = this._fitRun
      this.$nextTick(() => this.layoutTitleScreen(run))
    },

    layoutTitleScreen (run = this._fitRun) {
      if (run !== this._fitRun) return
      const host = document.querySelector('[data-title-screen]')
      if (!host) return
      if (!this._titleRo && typeof ResizeObserver === 'function') {
        this._titleRo = new ResizeObserver(() => this.relayoutTitle())
        this._titleRo.observe(host)
        document.fonts?.ready.then(() => this.relayoutTitle())
        // A face first used later (the strip's comic lettering) loads after ready: lay out again then too.
        document.fonts?.addEventListener?.('loadingdone', () => this.relayoutTitle())
      }
      if (this.phase !== 'TITLE_SCREEN' || !host.clientWidth) return
      const poster = this.lesson.title_poster
      const stage = host.querySelector('[data-poster-stage]')
      const o = host.getBoundingClientRect()
      const strip = host.querySelector('[data-title-expect="strip"]')
      this._stopTitlePoster?.refit?.()
      if (strip && strip !== this._titleStrip && typeof ResizeObserver === 'function') {
        // The strip's lines re-wrap when their font arrives: the poster under it moves, so
        // measure again (the same run: a reset here would hide and show its lines in a loop).
        this._titleStripRo?.disconnect()
        let height = 0
        this._titleStripRo = new ResizeObserver(([e]) => {
          if (Math.abs(e.contentRect.height - height) < 1) return
          height = e.contentRect.height
          this._fitConfirmed = false
          setTimeout(() => this.layoutTitleScreen(), 30)
        })
        this._titleStripRo.observe(strip)
        this._titleStrip = strip
      }
      if (strip && stage && placeExpectStrip(strip, stage.getBoundingClientRect(), o, poster.expect?.box ?? { x: 0, y: 0, w: 100, h: 0 },
        stage.parentElement, !poster.expect, posterFit(o.width, o.height, poster).top).moved) {
        // The poster now starts under the strip: measure once it has been fitted there.
        setTimeout(() => this.layoutTitleScreen(run), 50)
        return
      }
      if (this._fitChromeToStrip(host, strip)) {
        this.$nextTick(() => this.layoutTitleScreen(run))
        return
      }
      if (this._shrinkTitlePicture(host, stage)) {
        // The picture refits on its own resize: measure once it has.
        setTimeout(() => this.layoutTitleScreen(run), 60)
        return
      }
      // The poster fitted to where it stands now, so the frame measured below is never a stale one.
      this._stopTitlePoster?.refit?.()

      let frame = null
      let keepClear = []
      if (poster && stage) {
        const r = stage.getBoundingClientRect()
        frame = () => ({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height })
        keepClear = poster.keep_clear ?? []
        // A painted candidate's lettering may be scaled down (title-fit.js): its letters boxes with it.
        const ls = Number(stage.dataset.letterScale ?? 1)
        if (poster.fit === 'cover' && ls !== 1) {
          const c = this._letteringCentre()
          keepClear = keepClear.map(k => (k.kind === 'letters' ? { ...k, box: scaleBoxAbout(k.box, c, ls) } : k))
        }
      } else if (this.lesson.title_bg_url && this.lesson.title_keep_clear?.length) {
        const size = pictureSize(this.lesson.title_bg_url, () => this.relayoutTitle())
        frame = () => size && coverRect(o.width, o.height, size.w, size.h)
        keepClear = this.lesson.title_keep_clear
      }
      if (poster) this._shiftTitleBar(host, keepClear, frame)
      const qrOpts = { keepClear, frame, override: this.lesson.qr_position, maxSize: FIT.qrSteps[this.titleFit.qrStep], qrHidden: this.titleFit.qrHidden }
      let result = layoutTitleQr(host, qrOpts)
      // With the QR out of its place the badges close up and may meet the expect lines: wrap them, measure again.
      const lines = host.querySelector('[data-title-expect="lines"]')
      if (fitExpectLines(lines, host.querySelector('[data-title-cluster]'))) result = layoutTitleQr(host, qrOpts)

      // Anything still overlapping (or lines squeezed into a column): the screen gives way one
      // step (title-fit.js nextFit) and is measured again.
      const pieces = titlePieces(host)
      const hits = collisions(pieces, result.keepClear ?? [])
      if (poster && lines?.offsetWidth && lines.dataset.cramped) hits.push({ a: 'lines', b: 'cramped' })
      const next = nextFit({ ...this.titleFit, linesInStrip: this.expectInStrip }, hits, { strip: !!poster, painted: poster?.fit === 'cover', badges: (this.lesson.lesson_types ?? []).length > 0 })
      const debug = new URLSearchParams(window.location.search).get('qr_debug') === '1'
      if (debug) (window.__titleFitLog ??= []).push({ run, fit: { ...this.titleFit }, hits, pieces: pieces.map(p => p.group).join(), t: Math.round(performance.now()) })
      if (next && (this._fitPasses = (this._fitPasses ?? 0) + 1) <= 3 * FIT.maxShrink) {
        const { linesInStrip, ...fit } = next
        this.expectInStrip = linesInStrip
        this.titleFit = fit
        this._fitConfirmed = false
        setTimeout(() => this.layoutTitleScreen(run), 60)
        return
      }
      // Clear once is not settled: a piece just shown again (a reset run) may not be laid out
      // yet. Measure once more a moment later before calling it done.
      if (!hits.length && !this._fitConfirmed) {
        this._fitConfirmed = true
        setTimeout(() => this.layoutTitleScreen(run), 60)
        return
      }
      this.titleCodeInMeta = !!result.hidden
      if (debug) {
        drawQrDebug(host, result)
        // run/latest: a proof waits until the newest run has settled.
        window.__titleQr = { ...result, fit: { ...this.titleFit, linesInStrip: this.expectInStrip }, hits, run, latest: () => this._fitRun }
      }
    },

    /**
     * The top row on the white strip: the logo's dark variant, and on a slim strip (not the phone's
     * stacked one) a logo that fits inside it. True when that changed, so the screen is measured again.
     */
    _fitChromeToStrip (host, strip) {
      const r = strip?.offsetHeight ? strip.getBoundingClientRect() : null
      const onStrip = !!r && r.top - host.getBoundingClientRect().top <= 4
      const slim = onStrip && strip.dataset.stacked !== '1' ? parseFloat(strip.style.minHeight) || r.height : 0
      const logoH = slim ? Math.round(Math.min(96, Math.max(32, slim - 12))) : 0
      if (onStrip === this.titleChromeOnStrip && logoH === this.titleLogoH) return false
      this.titleChromeOnStrip = onStrip
      this.titleLogoH = logoH
      return true
    },

    /**
     * Shrink step n (title-fit.js): a painted candidate's lettering scales down over its painting;
     * a flat poster's frame keeps a band at the bottom for the title bar (its own colour fills it);
     * a series logo gets narrower and always starts under the top row. True when a size changed.
     */
    _shrinkTitlePicture (host, stage) {
      const n = this.titleFit.shrink
      const poster = this.lesson.title_poster
      const o = host.getBoundingClientRect()
      let moved = false
      if (poster && stage && poster.fit === 'cover') {
        // A painting stays full-bleed: only its lettering scales, as one layer.
        moved = this._scaleTitleLettering(stage, n ? FIT.letterScale ** n : 1)
      } else if (poster && stage) {
        const bar = titlePieces(host).filter(p => ['lines', 'meta', 'cta'].includes(p.group))
        const barTop = bar.length ? Math.min(...bar.map(p => p.rect.y)) : o.height
        const band = Math.round(bandHeight(n, barTop, o.height))
        const bottom = band ? `${band}px` : ''
        moved = stage.parentElement.style.bottom !== bottom
        stage.parentElement.style.bottom = bottom
        // The flat poster's own colour under the band too: one colour, no letterbox.
        host.style.backgroundColor = band ? (poster.background ?? '') : ''
      }
      const logo = host.querySelector('[data-title-piece="logo"]')
      if (logo) {
        const top = document.querySelector('[data-player-chrome="top"]')?.getBoundingClientRect()
        logo.style.top = top?.height ? `${Math.max(96, Math.round(top.bottom - o.top + 8))}px` : ''
        const width = n ? `calc(clamp(18rem, 58vw, 68rem) * ${FIT.logoScale ** n})` : ''
        // Compared by step: the browser rewrites a calc() it is given, so the style never reads back the same.
        moved ||= (logo.dataset.shrink ?? '0') !== String(n)
        logo.dataset.shrink = String(n)
        logo.style.width = width
      }
      return moved
    },

    /** The point (% of the frame) a painted candidate's lettering scales about: the middle of its letters boxes. */
    _letteringCentre () {
      const boxes = (this.lesson.title_poster?.keep_clear ?? []).filter(k => k.kind === 'letters').map(k => k.box)
      if (!boxes.length) return { x: 50, y: 50 }
      const x0 = Math.min(...boxes.map(b => b.x))
      const y0 = Math.min(...boxes.map(b => b.y))
      return { x: (x0 + Math.max(...boxes.map(b => b.x + b.w))) / 2, y: (y0 + Math.max(...boxes.map(b => b.y + b.h))) / 2 }
    },

    /**
     * Scale every lettering layer of a painted candidate (all but the full-frame painting, and the
     * live subtitle) by `s` about the lettering's centre, with the `scale`/`translate` properties
     * so each layer's own rotation and motion stay as they are. True when the scale changed.
     */
    _scaleTitleLettering (stage, s) {
      if (String(s) === (stage.dataset.letterScale ?? '1')) return false
      stage.dataset.letterScale = String(s)
      const full = new Set((this.lesson.title_poster.layers ?? []).filter(l => (l.box?.w ?? 0) >= 100).map(l => l.id))
      const c = this._letteringCentre()
      const cx = c.x / 100 * stage.offsetWidth
      const cy = c.y / 100 * stage.offsetHeight
      const offset = (el) => {
        let x = 0
        let y = 0
        for (let e = el; e && e !== stage; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop }
        return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 }
      }
      const layers = [...stage.querySelectorAll('[data-poster-layer]')].filter(el => !full.has(el.dataset.posterLayer))
      for (const el of [...layers, ...stage.querySelectorAll(':scope > [data-title-avoid]')]) {
        const e = offset(el)
        el.style.scale = s === 1 ? '' : String(s)
        el.style.translate = s === 1 ? '' : `${(1 - s) * (cx - e.x)}px ${(1 - s) * (cy - e.y)}px`
      }
      return true
    },

    /** A comic candidate's title bar slides along the bottom to where it covers no face, letters or control. */
    _shiftTitleBar (host, keepClear, frame) {
      const bar = host.querySelector('[data-title-bar]')
      if (!bar) return
      bar.style.transform = ''
      const pieces = titlePieces(host)
      const own = pieces.filter(p => ['lines', 'meta', 'cta'].includes(p.group)).map(p => p.rect)
      if (!own.length) return
      const x = Math.min(...own.map(r => r.x))
      const y = Math.min(...own.map(r => r.y))
      const box = { x, y, w: Math.max(...own.map(r => r.x + r.w)) - x, h: Math.max(...own.map(r => r.y + r.h)) - y }
      const f = frame?.()
      const keep = f ? keepClear.filter(k => ['face', 'letters'].includes(k.kind)).map(k => frameRect(k.box, f)) : []
      const blocks = [...keep, ...pieces.filter(p => ['subtitle', 'badges', 'language', 'qr', 'top', 'strip'].includes(p.group)).map(p => p.rect)]
        .map(r => ({ x: r.x - FIT.gap / 2, y: r.y - FIT.gap / 2, w: r.w + FIT.gap, h: r.h + FIT.gap }))
      const dx = barShift(box, blocks, host.clientWidth, 32)
      if (dx) bar.style.transform = `translateX(${Math.round(dx)}px)`
    },

    fitSubtitle (el) {
      const box = el.parentElement
      const logo = box.querySelector('img')
      let ink = [0, 1]
      const fit = () => {
        const w = box.clientWidth
        if (!w) return
        el.style.marginLeft = `${ink[0] * w}px`
        el.style.fontSize = '100px'
        el.style.fontSize = `${(100 * (ink[1] - ink[0]) * w) / el.offsetWidth}px`
      }
      fit()
      document.fonts?.ready.then(fit)
      inkSpan(logo).then(span => { ink = span; fit() })
      if (typeof ResizeObserver === 'function') new ResizeObserver(fit).observe(box)
    },

    setCaptions (on) {
      this.captionsOn = !!on
      // Someone who needs captions needs them in every lesson, so the choice outlives this one.
      try { localStorage.setItem('lp:captions', this.captionsOn ? '1' : '0') } catch (_) { /* private mode */ }
      this._captionLanguageChanged()
    },

    toggleCaptions () {
      this.setCaptions(!this.captionsOn)
    },

    // ── Keyboard shortcuts ─────────────────────────────────────────────
    _attachKeyboardListeners () {
      this._kbHandler = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

        // The keys students already know from YouTube: K play/pause (Space too), M mute,
        // C subtitles, F fullscreen, ↑/↓ volume — plus ←/→ previous/next slide, as in any slide
        // deck (voyages keep A/B too). A modifier means the key belongs to the browser (⌘F is
        // Find), so leave those alone.
        if (e.metaKey || e.ctrlKey || e.altKey) return

        // The Audio & Subtitles panel owns the arrows, Enter and Esc while it is open (ccKeydown).
        if (this.ccOpen) { this.ccKeydown(e); return }

        const isVoyage = lesson.game_type === 'voyage'
        if (e.code === 'ArrowRight' || (isVoyage && e.code === 'KeyB')) {
          e.preventDefault()
          this.nextSlide()
          return
        }
        if (e.code === 'ArrowLeft' || (isVoyage && e.code === 'KeyA')) {
          e.preventDefault()
          if (this.canSkip) this.previousSlide()
          return
        }

        if (e.code === 'Space' || e.code === 'KeyK') {
          e.preventDefault()
          this.togglePlayback()
        } else if (e.code === 'Escape') {
          e.preventDefault()
          this.stopAudio()
        } else if (e.code === 'KeyM') {
          e.preventDefault()
          this.toggleMute()
        } else if (e.code === 'KeyC') {
          e.preventDefault()
          this.toggleCaptionPanel(true)
        } else if (e.code === 'KeyF') {
          e.preventDefault()
          this.toggleFullscreen()
        } else if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
          e.preventDefault()
          const step = e.code === 'ArrowUp' ? 0.05 : -0.05
          this.setVolume((this.audioMuted ? 0 : this.volumeLevel) + step)
        }
      }
      document.addEventListener('keydown', this._kbHandler)
    },

    /**
     * Fullscreen on the whole page, so the stage AND its controls go with it. Best effort:
     * iPhone Safari has no Element.requestFullscreen, and an embedded preview only gets it when
     * the host iframe allows it — never let either case throw at the student.
     */
    toggleFullscreen () {
      try {
        if (document.fullscreenElement) document.exitFullscreen?.()
        else document.documentElement.requestFullscreen?.().catch(() => {})
      } catch (_) { /* unsupported */ }
    },

    // ── Click the stage to pause ───────────────────────────────────────
    // Anywhere that isn't itself clickable acts as play/pause, the way a video does. Two things
    // must not be mistaken for that click: a control (button, link, map hotspot — everything
    // clickable in this player draws a pointer cursor, which is what we test for), and a map
    // pan or pinch, which is a pointerdown and a pointerup like any other.
    _attachStagePause () {
      const stage = document.getElementById('lesson-stage')
      if (!stage) return

      const DRAG_SLOP_PX = 6
      const HOLD_MS = 400

      let startX = 0
      let startY = 0
      let startT = 0

      const isControl = (el) => {
        for (let n = el; n && n !== stage; n = n.parentElement) {
          if (n.nodeType !== 1) continue
          if (n.matches('button, a, input, select, textarea, label, [role="button"], [data-no-pause]')) return true
          if (getComputedStyle(n).cursor === 'pointer') return true
        }
        return false
      }

      // A tap on a touch screen with the chrome faded out only brings the chrome back, the way a
      // phone video player does; the next tap (or the centre glyph) pauses. Read before the
      // window's own pointerdown wakes it — the stage listener runs first on the way up.
      let wakeOnly = false

      stage.addEventListener('pointerdown', (e) => {
        startX = e.clientX
        startY = e.clientY
        startT = performance.now()
        wakeOnly = e.pointerType === 'touch' && this.chromeHidden
      })

      stage.addEventListener('pointerup', (e) => {
        if (this.phase !== 'INTRO' && this.phase !== 'GAME_ACTIVE') return
        if (this.currentIsGame) return               // the quiz card owns its own clicks
        if (window.__voyageGalleryOpen) return       // so does an open landfall gallery
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > DRAG_SLOP_PX) return  // a map pan
        if (performance.now() - startT > HOLD_MS) return                               // a press-and-hold
        if (isControl(e.target)) return
        if (wakeOnly) return

        this.togglePlayback()
      })
    },

    // ── Teardown ───────────────────────────────────────────────────────
    // Fully stop every Audio object. They live outside the DOM, so nothing
    // else releases them when the page goes away.
    // Leaving the page: silence the narration AND the intel-drop overlay.
    _stopAllAudio () {
      this._stopAudio()
      const intel = this._intelAudio
      this._intelAudio = null
      if (intel) {
        try { intel.pause(); intel.removeAttribute('src'); intel.load?.() } catch (_) {}
      }
      try { _music?.destroy() } catch (_) {}
      _music = null
      this.audioPlaying = false
    },

    // Alpine lifecycle hook — runs when the component element is removed,
    // including Livewire wire:navigate transitions. Belt-and-suspenders with
    // the pagehide / livewire:navigating listeners wired in init().
    destroy () {
      this._stopAllAudio()
      if (this._navStop) {
        window.removeEventListener('pagehide', this._navStop)
        document.removeEventListener('livewire:navigating', this._navStop)
        this._navStop = null
      }
      if (this._kbHandler) {
        document.removeEventListener('keydown', this._kbHandler)
        this._kbHandler = null
      }
      if (this._readingOverlayHandler) {
        window.removeEventListener('lesson:reading-overlay', this._readingOverlayHandler)
        this._readingOverlayHandler = null
      }
      if (this._chapterInfoHandler) {
        window.removeEventListener('lesson:chapter-info', this._chapterInfoHandler)
        this._chapterInfoHandler = null
      }
      clearInterval(this._timerInterval); this._timerInterval = null
      clearInterval(this._kbInterval);    this._kbInterval = null
      try { _bgInstance?.destroy?.() } catch (_) {}
      try { _mapInstance?.destroy?.() } catch (_) {}
      try { _voyageInstance?.destroy?.() } catch (_) {}
      _bgInstance = null
      _mapInstance = null
      _voyageInstance = null
      _initDone = false  // allow a later mount (e.g. opening another lesson) to re-init
    },
  }))

Alpine.start()
