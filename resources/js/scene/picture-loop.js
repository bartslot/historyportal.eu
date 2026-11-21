// A scene picture that moves: a muted MP4 loop laid over the still it starts from (SceneLoop.php).
// The still stays underneath and shows until the video plays, so a slow school network shows the
// picture, never a black box. Reduced motion keeps the still.

const LOOP_CLASS = 'scene-picture-loop'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** A muted, looping, inline video element for a loop URL. */
export function loopVideo (url) {
  const video = document.createElement('video')
  video.className = LOOP_CLASS
  video.src = url
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

/** Remove the loop from `host` and stop it downloading. */
export function detachLoop (host) {
  host?.querySelectorAll?.(`:scope > video.${LOOP_CLASS}`).forEach(v => {
    v.pause()
    v.removeAttribute('src')
    v.load()
    v.remove()
  })
}
