// A scene picture that moves: a muted MP4 loop laid over the still it starts from (SceneLoop.php).
// The still stays underneath and shows until the video plays, so a slow school network shows the
// picture, never a black box. Reduced motion keeps the still.

const LOOP_CLASS = 'scene-picture-loop'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// A loop URL ending in "#av1" has an AV1 copy beside it ("x.loop.mp4" → "x.loop.av1.mp4",
// SceneLoop.php): about a third smaller, but older Safari cannot play it, so it is only used where
// the browser says it can, and the H.264 file stays the loop for everyone else.
const AV1_TYPE = 'video/mp4; codecs="av01.0.05M.08"'

/** The file a browser should fetch for a loop URL: the AV1 copy when it plays AV1, else H.264. */
export function loopSource (url, video = null) {
  if (!url || !url.endsWith('#av1')) return url
  const h264 = url.slice(0, -'#av1'.length)
  const probe = video ?? (typeof document !== 'undefined' ? document.createElement('video') : null)
  const can = probe?.canPlayType?.(AV1_TYPE) ?? ''
  return can === 'probably' || can === 'maybe' ? h264.replace(/\.mp4(\?.*)?$/, '.av1.mp4$1') : h264
}

// Every loop this page made, so one call can hold or release them all: the player's pause button
// and the editor's timeline are the scene's clock, and a picture still moving while the class is
// paused is a second clock nobody can stop (Bart, 2026-11-26). Stopped loops (src removed) drop out.
const LIVE = new Set()
let held = false

const live = () => {
  for (const v of LIVE) if (!v.getAttribute('src')) LIVE.delete(v)
  return [...LIVE]
}

/** Hold (pause) or release every loop on the page, including ones made while held. */
export function setLoopsPaused (pause) {
  held = !!pause
  for (const v of live()) {
    if (held) v.pause()
    else v.play?.()?.catch(() => { /* autoplay refused: the frame stays */ })
  }
}

/** Put every loop at `seconds` into the scene, wrapped to its length: a scrub, or a lap restart. */
export function seekLoops (seconds) {
  const t = Number(seconds)
  if (!(t >= 0)) return
  for (const v of live()) {
    const d = v.duration
    if (Number.isFinite(d) && d > 0) v.currentTime = t % d
  }
}

/** A muted, looping, inline video element for a loop URL. */
export function loopVideo (url) {
  const video = document.createElement('video')
  LIVE.add(video)
  // Made while held: it still has to reach 'playing' once (callers wait for that to know it plays,
  // and the first frame shows), then it stops where the clock is.
  video.addEventListener('playing', () => { if (held) video.pause() })
  video.className = LOOP_CLASS
  video.src = loopSource(url, video)
  video.muted = true          // muted BEFORE play: browsers only autoplay silent video
  video.defaultMuted = true
  video.loop = true
  video.autoplay = true
  video.playsInline = true
  video.preload = 'auto'
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('aria-hidden', 'true')
  video.disablePictureInPicture = true
  return video
}

/**
 * Lay a loop over the picture in `host` (replacing any loop there before), or just clear it when
 * `url` is empty. `fit` is 'cover' or 'contain', like the still under it. Returns the video or null.
 */
export function attachLoop (host, url, { fit = 'cover', objectPosition = '' } = {}) {
  detachLoop(host)
  if (!host || !url || prefersReducedMotion()) return null
  const video = loopVideo(url)
  video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;'
    + `object-fit:${fit === 'contain' ? 'contain' : 'cover'};pointer-events:none;`
    + 'opacity:0;transition:opacity 300ms ease-out;'
  if (objectPosition) video.style.objectPosition = objectPosition
  video.addEventListener('playing', () => { video.style.opacity = '1' }, { once: true })
  host.appendChild(video)
  video.play?.()?.catch(() => { /* autoplay refused: the still stays, which is fine */ })
  return video
}

/** Stop every loop anywhere inside `root` (a layered panel being torn down), so none lingers in the page's set. */
export function stopLoopsIn (root) {
  root?.querySelectorAll?.(`video.${LOOP_CLASS}`).forEach(v => {
    v.pause()
    v.removeAttribute('src')
    v.load()
  })
}

/** Remove the loop from `host` and stop it downloading. */
export function detachLoop (host) {
  host?.querySelectorAll?.(`:scope > video.${LOOP_CLASS}`).forEach(v => {
    v.pause()
    v.removeAttribute('src')
    v.load()
    v.remove()
  })
}
