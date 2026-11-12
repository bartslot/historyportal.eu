/**
 * The player's chapter bar (Spotify-style): one segment per chapter, width ∝ its time.
 *
 * A chapter is a run of scenes (shots) with the same `chapter` (the name the lesson gave it); a scene
 * without one (a quiz, a discussion card, a map) joins the chapter before it. A lesson whose scenes
 * carry no chapter at all keeps one chapter per scene, as before chapters existed, each named by its
 * `chapter_name` (the server's display name: the chapter, else the place, else "Chapter n").
 *
 * Each scene's time comes from the server (Scene::timelineSeconds) — this module only lays the
 * segments out and decides where a student may jump. A student goes back anywhere they have been,
 * never past the furthest point they reached; the teacher previewing their lesson goes anywhere.
 */

/**
 * @typedef {{ index:number, start:number, seconds:number }} Part  a scene inside a chapter; start = seconds into the chapter
 * @typedef {{ index:number, last:number, key:string|null, name:string, type:string, seconds:number, estimated:boolean, start:number, afterEstimate:boolean, parts:Part[] }} Chapter
 *   index/last = its first and last scene; key = the chapter name the lesson gave it (null = numbered)
 * @typedef {{ index:number, time:number }} Point  scene index + seconds into that scene
 */

/**
 * @param {Array<{chapter?:string|null, chapter_name?:string|null, timeline?:{seconds:number, estimated:boolean, type:string}}>} queue
 * @param {(n:number) => string} fallbackName name of the n-th chapter (0-based) when the lesson gave none
 * @returns {Chapter[]}
 */
export function buildChapters (queue, fallbackName) {
  const grouped = queue.some(scene => scene.chapter)
  const chapters = []
  let start = 0
  let afterEstimate = false
  queue.forEach((scene, index) => {
    const t = scene.timeline ?? { seconds: 0, estimated: true, type: 'narration' }
    const seconds = Math.max(0, Number(t.seconds) || 0)
    const estimated = !!t.estimated
    const last = chapters.at(-1)
    if (grouped && last && (!scene.chapter || scene.chapter === last.key)) {
      last.parts.push({ index, start: last.seconds, seconds })
      last.last = index
      last.seconds += seconds
      last.estimated = last.estimated && estimated   // a story chapter with a quiz in it still has a clock
    } else {
      const key = scene.chapter || null
      chapters.push({
        index, last: index, key,
        name: key || scene.chapter_name || fallbackName(chapters.length),
        type: t.type, seconds, estimated, start, afterEstimate,
        parts: [{ index, start: 0, seconds }],
      })
    }
    start += seconds
    afterEstimate = afterEstimate || estimated
  })
  return chapters
}

/** The chapter scene `index` belongs to. */
export function chapterOf (chapters, index) {
  return chapters.find(c => index >= c.index && index <= c.last) ?? null
}

/** The scene and the seconds into it at `offset` seconds into the chapter (a click on its segment). */
export function pointInChapter (chapter, offset) {
  const part = chapter.parts.findLast(p => p.start <= offset) ?? chapter.parts[0]
  return { index: part.index, time: Math.max(0, Math.min(offset - part.start, part.seconds)) }
}

/** How far (0-1) `point` is through the chapter: 0 before it, 1 after it. */
export function chapterProgress (chapter, point) {
  if (point.index < chapter.index) return 0
  if (point.index > chapter.last) return 1
  if (!chapter.seconds) return 0
  const part = chapter.parts.find(p => p.index === point.index)
  return Math.min(1, (part.start + Math.min(Math.max(0, point.time), part.seconds)) / chapter.seconds)
}

/**
 * The chapter whose card shows as playback enters scene `index`, or null.
 *
 * Only a chapter the lesson named, only on its first scene, and only when the class arrives from
 * outside it: not right after the title screen (`from` null: the lesson's title just showed), not
 * on a step back inside the chapter, not on a seek into the middle of a scene (`at` > 0).
 *
 * @param {Chapter[]} chapters
 * @param {number} index the scene about to play
 * @param {{ from:number|null, at?:number }} arrival the scene played before, and the seek into this one
 */
export function chapterCardFor (chapters, index, { from, at = 0 }) {
  const chapter = chapters.find(c => c.index === index)
  if (!chapter?.key || from == null || at > 0) return null
  if (from >= chapter.index && from <= chapter.last) return null
  return chapter
}

const CARD_LETTERS_PER_S = 15
const CARD_BASE_S = 1.5
const CARD_MIN_S = 2.5
const CARD_MAX_S = 4.5

/** How long a chapter card holds before it fades: its reading time, 2.5 to 4.5 s. */
export function chapterCardHoldMs (text) {
  const s = String(text ?? '').length / CARD_LETTERS_PER_S + CARD_BASE_S
  return Math.round(Math.min(CARD_MAX_S, Math.max(CARD_MIN_S, s)) * 1000)
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
