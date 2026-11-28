// The scene picture's moving version (a looping video, SceneLoop.php) as a clip on the timeline's
// background row (Bart, 2026-11-23: "we should see the video bar here when the video is loaded in
// the background shot"). It plays from 0 and loops until the scene ends, so the bar spans the whole
// scene and is cut where each pass of the video starts again.

/**
 * Where each pass of a `loopSeconds` video starts inside a scene of `sceneSeconds`, after the first
 * (that one starts at 0). Empty while the video's length is unknown, or for a video at least as long
 * as the scene (it never gets to loop). Capped so a broken tiny duration cannot draw a thousand lines.
 */
export const loopRestarts = (sceneSeconds, loopSeconds, max = 200) => {
  const scene = Number(sceneSeconds)
  const loop = Number(loopSeconds)
  if (!(scene > 0) || !(loop > 0.05) || loop >= scene) return []
  const out = []
  for (let t = loop; t < scene - 1e-6 && out.length < max; t += loop) out.push(Math.round(t * 1000) / 1000)
  return out
}

/** "8 s" / "7.5 s": the length a teacher reads on the bar. */
export const videoLengthLabel = (seconds) => {
  const s = Number(seconds)
  if (!(s > 0)) return ''
  return `${Math.round(s * 10) / 10} s`
}

/** Read a video's length without playing it. Resolves null when it will not load. */
export const probeVideoLength = (url) => new Promise((resolve) => {
  if (!url || typeof document === 'undefined') return resolve(null)
  const video = document.createElement('video')
  video.preload = 'metadata'
  video.muted = true
  const done = (value) => {
    video.removeAttribute('src')
    try { video.load() } catch (_) { /* jsdom */ }
    resolve(value)
  }
  video.addEventListener('loadedmetadata', () => done(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null), { once: true })
  video.addEventListener('error', () => done(null), { once: true })
  video.src = url
})
