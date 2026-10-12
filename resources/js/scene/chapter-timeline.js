/**
 * The player's chapter bar (Spotify-style): one segment per scene, width ∝ its time.
 *
 * Each scene's time comes from the server (Scene::timelineSeconds) — this module only lays the
 * segments out and decides where a student may jump. A student goes back anywhere they have been,
 * never past the furthest point they reached; the teacher previewing their lesson goes anywhere.
 */

/**
 * @typedef {{ index:number, name:string, type:string, seconds:number, estimated:boolean, start:number, afterEstimate:boolean }} Chapter
 * @typedef {{ index:number, time:number }} Point  scene index + seconds into that scene
 */

/**
 * @param {Array<{chapter_name?:string|null, timeline?:{seconds:number, estimated:boolean, type:string}}>} queue
 * @param {(index:number) => string} fallbackName
 * @returns {Chapter[]}
 */
export function buildChapters (queue, fallbackName) {
  let start = 0
  let afterEstimate = false
  return queue.map((scene, index) => {
    const t = scene.timeline ?? { seconds: 0, estimated: true, type: 'narration' }
    const chapter = {
      index,
      name: scene.chapter_name || fallbackName(index),
      type: t.type,
      seconds: Math.max(0, Number(t.seconds) || 0),
      estimated: !!t.estimated,
      start,
      afterEstimate,
    }
    start += chapter.seconds
    afterEstimate = afterEstimate || chapter.estimated
    return chapter
  })
}

/**
 * @param {Point} target
 * @param {Point} furthest
 * @param {{ type:string, teacher?:boolean }} chapter the target's chapter
 */
export function canSeek (target, furthest, { type, teacher = false }) {
  if (teacher) return true
  // A played strategy game is history: the class played it once, as a class.
  if (type === 'game') return false
  if (target.index !== furthest.index) return target.index < furthest.index
  return target.time <= furthest.time
}

/** The later of two points; returns `furthest` itself when nothing moved, so callers can compare. */
export function reachedFurther (furthest, point) {
  const isLater = point.index > furthest.index || (point.index === furthest.index && point.time > furthest.time)
  return isLater ? { index: point.index, time: point.time } : furthest
}

export function formatClock (seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export function formatMinutes (seconds) {
  return `≈ ${Math.max(1, Math.ceil(seconds / 60))} min`
}

/**
 * "1:10 · Verhaal · De haven" for a point in a narrated scene, "Quiz · Toets · ≈ 2 min" for a block
 * the student paces. A clock time after any estimate can only be approximate, so it gets "≈" too.
 *
 * @param {Chapter} chapter
 * @param {number} offset seconds into the chapter under the pointer
 * @param {(type:string) => string} labelFor translated type label
 */
export function chapterTooltip (chapter, offset, labelFor) {
  const label = labelFor(chapter.type)
  if (chapter.estimated) return `${label} · ${chapter.name} · ${formatMinutes(chapter.seconds)}`
  const clock = formatClock(chapter.start + Math.min(offset, chapter.seconds))
  return `${chapter.afterEstimate ? '≈ ' : ''}${clock} · ${label} · ${chapter.name}`
}
