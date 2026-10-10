// The studio's help: short answers in the teacher's words. This is the ONE place how-to text lives;
// the editor itself carries none (copy rules). Never "—" in UI text.
export type Faq = { q: string; a: string; keywords?: string }

export const FAQ: Faq[] = [
  { q: 'How do I add something to the scene?', a: 'Open Assets at the bottom, or Add in the top bar, and drag a tile onto the stage. Things stand on the floor grid; doors go on walls and pictures on any surface.', keywords: 'add drag drop asset library' },
  { q: 'How do I move, turn or push something further away?', a: 'Drag it to move it. Drag along the ring under it to turn it. Drag the dot above it up to push it further away, or down to bring it closer: its real size never changes.', keywords: 'move turn rotate depth ring dot size' },
  { q: 'Why can I not put it there?', a: 'Everything stands on its own squares of the grid. Hatched squares mean something already stands there. Let go and it goes back to where it stood.', keywords: 'hatched no room overlap grid' },
  { q: 'How do I make something move?', a: 'Open Timeline. Click the diamond next to X, Z or Turn to set a keyframe. Move the playhead, then move the object: a second keyframe is added. Press Play.', keywords: 'animate animation keyframe timeline play' },
  { q: 'How do I find an object?', a: 'Open Objects on the left. Hover a row to see the object boxed on the stage, and double click to fly the camera to it. The eye hides it while you work.', keywords: 'objects layers find hide eye' },
  { q: 'How do I add a scene or group scenes?', a: 'In Scenes, press Add scene or Add group, and drag a scene onto a group to put it inside. The two buttons at the top switch between pictures and a list.', keywords: 'scenes rail group order' },
  { q: 'How do I write what is said?', a: 'Open Script in the top bar. Each paragraph is one spoken line of the scene above it. Select words and press Subtitle to show them on screen.', keywords: 'script narration text subtitle caption' },
  { q: 'Why do I hear a computer voice?', a: 'Read aloud and Play use your browser\'s own voice, only so you can hear the timing. The real narration is made later.', keywords: 'voice speech tts read aloud' },
  { q: 'Where is my lesson saved?', a: 'In this browser, automatically. Use Lesson, then Export lesson file, to keep a copy or to open it on another computer.', keywords: 'save export import file' },
  { q: 'Which keys can I use?', a: 'Space plays and pauses. Delete removes the selected keyframes, or the selected object. [ and ] turn the object one step. K sets keyframes. Esc closes a menu.', keywords: 'keyboard shortcuts keys' },
]

/** Case- and accent-insensitive search over question, answer and keywords (as the help centre does). */
const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
export const searchFaq = (query: string, list = FAQ) => {
  const words = fold(query).split(/\s+/).filter(Boolean)
  return words.length ? list.filter((f) => words.every((w) => fold(`${f.q} ${f.a} ${f.keywords ?? ''}`).includes(w))) : list
}
