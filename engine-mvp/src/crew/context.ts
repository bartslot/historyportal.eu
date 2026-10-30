// What the client is doing, for the crew: an activity log, the context object sent with every request
// (docs/crew-stream.md, "Context") and the live greeting / "Sees" line built from it. No model call.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import * as L from '../lesson/store'
import * as Tree from '../lesson/tree'
import * as TL from '../timeline/model'
import { readSettings } from './settings'
import { __ } from '../i18n'

const LOG_MAX = 10
const OBJECTS_MAX = 40
const SCENES_MAX = 40
const STR_MAX = 80
const POLL_MS = 400
const GREETING_EVERY_MS = 1500
const TITLE_DEBOUNCE_MS = 1000
const SCRIPT_DEBOUNCE_MS = 2000
const CREW_QUIET_MS = 2000
const LOAD_QUIET_MS = 3000 // a lesson or scene loading puts objects on the stage: not the client's doing
const START_QUIET_MS = 8000

export type Action = { at: number; what: string; key?: string }
export type Sel = { name: string; kind: string; x: number; z: number; yaw: number }
export type Facts = {
  title: string; scenes: { id: string; title: string }[]; current: string; scriptWords: number
  selected: Sel | null; objects: string[]; time: number; step?: string
}
export type Lang = 'en' | 'nl' | 'de'

const cap = (s: string, n = STR_MAX) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

// ---------- activity log (pure) ----------
/** Newest first. A repeated `key` (the same control moving) replaces the newest entry instead of adding one. */
export function logAction(log: Action[], what: string, now: number, key?: string): Action[] {
  const entry = { at: now, what: cap(what), ...(key ? { key } : {}) }
  const rest = key && log[0]?.key === key ? log.slice(1) : log
  return [entry, ...rest].slice(0, LOG_MAX)
}

export function diffObjects(prev: { id: string; name: string }[], next: { id: string; name: string }[]): string[] {
  const had = new Set(prev.map((o) => o.id)), has = new Set(next.map((o) => o.id))
  const say = (verb: string, list: { name: string }[]) =>
    list.length === 0 ? [] : list.length <= 2 ? list.map((o) => `${verb} ${o.name}`) : [`${verb} ${list.length} objects`]
  return [...say('added', next.filter((o) => !had.has(o.id))), ...say('removed', prev.filter((o) => !has.has(o.id)))]
}

// ---------- context object (pure) ----------
export function buildContextFrom(f: Facts, log: Action[], now: number) {
  const idx = f.scenes.findIndex((s) => s.id === f.current)
  return {
    lesson: {
      title: cap(f.title, 120),
      scenes: f.scenes.slice(0, SCENES_MAX).map((s) => ({ id: s.id, title: cap(s.title) })),
      current: f.current, currentTitle: cap(f.scenes[idx]?.title ?? ''), scriptWords: f.scriptWords,
    },
    ...(f.step ? { step: cap(f.step, 40) } : {}),
    selected: f.selected ? { ...f.selected, name: cap(f.selected.name) } : null,
    objects: f.objects.slice(0, OBJECTS_MAX).map((n) => cap(n)),
    time: f.time,
    recent: log.map((a) => ({ ago: Math.max(0, Math.round((now - a.at) / 1000)), what: a.what })),
  }
}

// ---------- language and greeting (pure) ----------
const WORDS: Record<Lang, RegExp> = {
  nl: /\b(de|het|een|ik|je|wil|maak|niet|dit|dat|voor|met|van|ook|kun|kan|wat|is|zijn|naar|hoe|wie)\b/gi,
  de: /\b(der|die|das|und|ich|nicht|ein|eine|mit|für|ist|wie|kannst|mach|bitte|auch|zum|einen)\b/gi,
  en: /\b(the|and|is|this|to|you|make|what|can|how|please|with|for|it|are)\b/gi,
}
/** The language of a piece of text, or null when it does not say. */
export function detectLang(text: string): Lang | null {
  const score = (Object.keys(WORDS) as Lang[]).map((l) => [l, (text.match(WORDS[l]) ?? []).length] as const).sort((a, b) => b[1] - a[1])
  return score[0][1] > 0 && score[0][1] > score[1][1] ? score[0][0] : null
}
export function browserLang(nav = typeof navigator !== 'undefined' ? navigator.language : 'en'): Lang {
  const l = nav.slice(0, 2).toLowerCase()
  return l === 'nl' || l === 'de' ? l : 'en'
}

type Who = 'sofie' | 'daan'
type Tx = {
  empty: Record<Who, string>; working: (t: string, n: number, m: number) => string; loose: (n: number, m: number, k: number) => string
  sel: (s: string) => string; selOnly: (s: string) => string
  askSel: Record<Who, string>; askNone: Record<Who, string>; askSelOnly: Record<Who, string>
}
const TEXT: Record<Lang, Tx> = {
  en: {
    empty: {
      sofie: "Hi, I'm Sofie, your set assistant. What lesson or story shall we make? Tell me the topic, your class's age, and story or game.",
      daan: "Hi, I'm Daan, your set assistant. What are we making? Topic, class age, story or game.",
    },
    working: (t, n, m) => `You are working on '${t}', scene ${n} of ${m}.`,
    loose: (n, m, k) => `Scene ${n} of ${m}, ${k} ${k === 1 ? 'object' : 'objects'} on stage.`,
    sel: (s) => `${s} is selected:`, selOnly: (s) => `${s} is selected.`,
    askSel: { sofie: 'what shall we do with it?', daan: 'what do you want with it?' },
    askNone: { sofie: 'What shall we do next?', daan: 'What do you need?' },
    askSelOnly: { sofie: 'What shall we do with it?', daan: 'What do you want with it?' },
  },
  nl: {
    empty: {
      sofie: 'Hoi, ik ben Sofie, je set assistent. Welke les of welk verhaal maken we? Geef me het onderwerp, de leeftijd van je klas en of het een verhaal of een spel wordt.',
      daan: 'Hoi, ik ben Daan, je set assistent. Wat gaan we maken? Onderwerp, leeftijd van de klas, verhaal of spel.',
    },
    working: (t, n, m) => `Je werkt aan '${t}', scène ${n} van ${m}.`,
    loose: (n, m, k) => `Scène ${n} van ${m}, ${k} ${k === 1 ? 'object' : 'objecten'} op het toneel.`,
    sel: (s) => `${s} is geselecteerd:`, selOnly: (s) => `${s} is geselecteerd.`,
    askSel: { sofie: 'wat gaan we ermee doen?', daan: 'wat wil je ermee?' },
    askNone: { sofie: 'Wat gaan we nu doen?', daan: 'Wat heb je nodig?' },
    askSelOnly: { sofie: 'Wat gaan we ermee doen?', daan: 'Wat wil je ermee?' },
  },
  de: {
    empty: {
      sofie: 'Hallo, ich bin Sofie, deine Set-Assistentin. Welche Lektion oder Geschichte machen wir? Thema, Alter der Klasse, Geschichte oder Spiel?',
      daan: 'Hallo, ich bin Daan, dein Set-Assistent. Was machen wir? Thema, Alter der Klasse, Geschichte oder Spiel?',
    },
    working: (t, n, m) => `Du arbeitest an '${t}', Szene ${n} von ${m}.`,
    loose: (n, m, k) => `Szene ${n} von ${m}, ${k} ${k === 1 ? 'Objekt' : 'Objekte'} auf der Bühne.`,
    sel: (s) => `${s} ist ausgewählt:`, selOnly: (s) => `${s} ist ausgewählt.`,
    askSel: { sofie: 'was machen wir damit?', daan: 'was willst du damit?' },
    askNone: { sofie: 'Was machen wir als Nächstes?', daan: 'Was brauchst du?' },
    askSelOnly: { sofie: 'Was machen wir damit?', daan: 'Was willst du damit?' },
  },
}
/** The greeting on screen, in the teacher's UI language (the crew is sent the English one). */
const UI: Tx = {
  empty: {
    sofie: __("Hi, I'm Sofie, your set assistant. What lesson or story shall we make? Tell me the topic, your class's age, and story or game."),
    daan: __("Hi, I'm Daan, your set assistant. What are we making? Topic, class age, story or game."),
  },
  working: (t, n, m) => __("You are working on ':title', scene :scene of :total.", { title: t, scene: n, total: m }),
  loose: (n, m, k) => (k === 1 ? __('Scene :scene of :total, 1 object on stage.', { scene: n, total: m }) : __('Scene :scene of :total, :count objects on stage.', { scene: n, total: m, count: k })),
  sel: (s) => __(':name is selected:', { name: s }), selOnly: (s) => __(':name is selected.', { name: s }),
  askSel: { sofie: __('what shall we do with it?'), daan: __('what do you want with it?') },
  askNone: { sofie: __('What shall we do next?'), daan: __('What do you need?') },
  askSelOnly: { sofie: __('What shall we do with it?'), daan: __('What do you want with it?') },
}

export const hasRealTitle = (t: string) => !!t.trim() && !/^(untitled|naamloos|unbenannt)/i.test(t.trim())

export function buildGreeting(f: Facts, lang: Lang | 'ui', who: Who): string {
  const t = lang === 'ui' ? UI : TEXT[lang]
  const titled = hasRealTitle(f.title)
  const n = Math.max(1, f.scenes.findIndex((s) => s.id === f.current) + 1)
  const m = Math.max(1, f.scenes.length)
  const sel = f.selected?.name
  if (!titled && !f.objects.length && !f.scriptWords) return t.empty[who]
  if (!titled && sel) return `${t.selOnly(sel)} ${t.askSelOnly[who]}`
  const head = titled ? t.working(f.title.trim(), n, m) : t.loose(n, m, f.objects.length)
  if (!sel) return `${head} ${t.askNone[who]}`
  return `${head} ${t.sel(sel)} ${t.askSel[who]}`
}

/** "Scene 2 of 3 · Tree (Ghibli, round) selected" */
export function seesLine(f: Facts): string {
  const n = Math.max(1, f.scenes.findIndex((s) => s.id === f.current) + 1)
  const what = f.selected ? __(':name selected', { name: f.selected.name }) : f.objects.length === 1 ? __('1 object, none selected') : f.objects.length ? __(':count objects, none selected', { count: f.objects.length }) : __('empty stage')
  return __('Scene :scene of :total · :what', { scene: n, total: Math.max(1, f.scenes.length), what })
}

function ago(s: number) { return s < 10 ? __('just now') : s < 60 ? __('under a minute ago') : __(':minutes min ago', { minutes: Math.round(s / 60) }) }
export function seesTip(f: Facts, log: Action[], now: number): string {
  const last = log.slice(0, 3).map((a) => `${a.what} (${ago(Math.max(0, Math.round((now - a.at) / 1000)))})`)
  return [seesLine(f), hasRealTitle(f.title) ? __('Lesson: :title', { title: f.title }) : null, __(':count script words', { count: f.scriptWords }), last.length ? __('Recently: :list', { list: last.join('; ') }) : null].filter(Boolean).join('. ')
}

// ---------- live facts (reads the studio) ----------
const mvp = (): any => (window as any).__mvp
function words(doc: any): number {
  let n = 0
  const walk = (x: any) => { if (x?.text) n += String(x.text).split(/\s+/).filter(Boolean).length; (x?.content ?? []).forEach(walk) }
  walk(doc)
  return n
}
const kindOf = (a: any) => (a.metadata?.opening ? 'door' : a.metadata?.cloud ? 'cloud' : a.metadata?.decal ? 'picture' : 'model')

function stage() {
  const m = mvp()
  if (!m?.getSelected || !m.actors) return { selected: null as Sel | null, selId: '', objects: [] as { id: string; name: string }[] }
  const a = m.getSelected()
  const ok = a && !a.isDisposed()
  return {
    selected: ok ? ({ name: a.name, kind: kindOf(a), x: +a.position.x.toFixed(2), z: +a.position.z.toFixed(2), yaw: Math.round(((a.rotationQuaternion?.toEulerAngles().y ?? 0) * 180 / Math.PI + 360) % 360) } as Sel) : null,
    selId: ok ? String(a.metadata?.id ?? a.name) : '',
    objects: m.actors.filter((x: any) => !x.isDisposed() && !x.metadata?.cloud).map((x: any) => ({ id: String(x.metadata?.id ?? x.name), name: String(x.name) })),
  }
}

export function readFacts(): Facts {
  const { lesson, current } = L.getLesson()
  const s = stage()
  const step = L.stepOf(lesson) // Script, Visual or Animate: one source of truth, the lesson store
  return {
    title: lesson.title, scenes: Tree.scenesInOrder(lesson.tree).map(({ id, title }) => ({ id, title })), current,
    scriptWords: words(lesson.script), selected: s.selected, objects: s.objects.map((o: { name: string }) => o.name),
    time: +TL.getState().time.toFixed(2), ...(step ? { step } : {}),
  }
}

// ---------- tracking ----------
let log: Action[] = []
let quietUntil = 0
let crewRunning = 0
const note = (what: string, key?: string) => { log = logAction(log, what, Date.now(), key) }
export const noteCardOpened = (name: string) => note(`opened ${name}'s card`)
const quiet = () => crewRunning > 0 || Date.now() < quietUntil

/** Run a crew change: what it does to the stage, title and settings is not the client's own action. */
export async function asCrew<T>(run: () => Promise<T>): Promise<T> {
  crewRunning++
  try { return await run() } finally { crewRunning--; quietUntil = Date.now() + CREW_QUIET_MS }
}

const fmtValue = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2))
function onControl(e: Event) {
  const el = e.target as HTMLInputElement | HTMLSelectElement | null
  if (!e.isTrusted || !el?.closest?.('[data-settings]') || !el.id) return
  const s = readSettings().find((x) => x.id === el.id)
  if (!s) return
  note(s.type === 'toggle' ? `turned ${s.label} ${s.value ? 'on' : 'off'}` : s.type === 'select' ? `set ${s.label} to ${s.options.find(([v]) => v === s.value)?.[1] ?? s.value}` : `set ${s.label} to ${fmtValue(s.value)}`, s.id)
}

let started = false
export function startContextTracking() {
  if (started || typeof window === 'undefined') return
  started = true
  quietUntil = Date.now() + START_QUIET_MS
  document.addEventListener('input', onControl, true)
  document.addEventListener('change', onControl, true)

  // lesson: scene switches, scene add/delete, title and script edits
  let prev = L.getLesson()
  let titleTimer: ReturnType<typeof setTimeout> | undefined
  let scriptTimer: ReturnType<typeof setTimeout> | undefined
  let scriptWords = words(prev.lesson.script)
  L.subscribe(() => {
    const cur = L.getLesson()
    const before = prev
    prev = cur
    if (cur.lesson.id !== before.lesson.id || cur.current !== before.current) quietUntil = Date.now() + LOAD_QUIET_MS
    if (cur.lesson.id !== before.lesson.id) return // a lesson was opened: nothing the client did to this one
    const ids = (t: Tree.TreeNode[]) => Tree.scenesInOrder(t)
    const was = ids(before.lesson.tree), now = ids(cur.lesson.tree)
    if (!quiet()) {
      for (const s of now.filter((x) => !was.some((w) => w.id === x.id))) note(`added scene ${now.indexOf(s) + 1} (${s.title})`)
      for (const s of was.filter((x) => !now.some((w) => w.id === x.id))) note(`deleted scene ${s.title}`)
      if (cur.current !== before.current && now.some((s) => s.id === cur.current) && !cur.busy)
        note(`switched to scene ${now.findIndex((s) => s.id === cur.current) + 1} (${now.find((s) => s.id === cur.current)?.title})`)
    }
    if (cur.lesson.title !== before.lesson.title && !quiet()) {
      clearTimeout(titleTimer)
      titleTimer = setTimeout(() => note(`renamed the lesson to ${L.getLesson().lesson.title}`, 'title'), TITLE_DEBOUNCE_MS)
    }
    if (cur.lesson.script !== before.lesson.script && !cur.busy && !quiet()) {
      clearTimeout(scriptTimer)
      scriptTimer = setTimeout(() => {
        const n = words(L.getLesson().lesson.script)
        if (n !== scriptWords) note(`edited the script (${n} words)`, 'script')
        scriptWords = n
      }, SCRIPT_DEBOUNCE_MS)
    }
  })

  // stage: selection and objects, polled (the engine has no event for it); silent while loading or while the crew works
  let base: ReturnType<typeof stage> | null = null
  let baseScene = L.getLesson().current
  setInterval(() => {
    const { busy, current } = L.getLesson()
    if (busy || quiet() || current !== baseScene || !mvp()?.actors) { base = null; baseScene = current; return }
    const next = stage()
    if (base) {
      const added = diffObjects(base.objects, next.objects)
      added.forEach((w) => note(w))
      if (next.selId !== base.selId) note(next.selected ? `selected ${next.selected.name}` : 'deselected')
    }
    base = next
  }, POLL_MS)
}

export function buildContext() {
  startContextTracking()
  return buildContextFrom(readFacts(), log, Date.now())
}

// ---------- the live greeting ----------
const cached: Record<string, { at: number; assistant: string; text: string }> = {}
/** The greeting as it stands now ('en' for the crew, 'ui' for the screen); recomputed at most every 1.5 s so it never jitters. */
export function currentGreeting(assistant: string, lang: 'en' | 'ui'): string {
  const now = Date.now()
  const c = cached[lang]
  if (c && c.assistant === assistant && now - c.at < GREETING_EVERY_MS) return c.text
  const who: Who = assistant === 'daan' ? 'daan' : 'sofie'
  cached[lang] = { at: now, assistant, text: buildGreeting(readFacts(), lang, who) }
  return cached[lang].text
}

/** For the panel: greeting, the Sees line and its tooltip; state changes only when the text does. */
export function useLiveContext(assistant: string) {
  const compute = () => { const f = readFacts(); return { greeting: currentGreeting(assistant, 'ui'), sees: seesLine(f), tip: seesTip(f, log, Date.now()) } }
  const [v, setV] = useState(compute)
  useEffect(() => {
    startContextTracking()
    const tick = () => setV((o) => { const n = compute(); return n.greeting === o.greeting && n.sees === o.sees && n.tip === o.tip ? o : n })
    tick()
    const id = setInterval(tick, GREETING_EVERY_MS)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistant])
  return v
}
