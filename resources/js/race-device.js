/**
 * A team's phone in the harbour race (/race/{code}, opened by the race QR on the class screen).
 *
 *   pick     the teams the teacher named; a phone that joined before goes straight back to its team
 *   wait     the lobby: the teacher starts the race on the class screen
 *   race     the moment's meter (words, tap, mic, shake: the PowerMeter itself) as this phone's input;
 *            a right word is sent as that word (it counts once per team: a word a teammate found
 *            shows as used here), a sensor's gain as an amount; the team's ship sails its progress
 *   done     which ship the team crews, or that the race is over
 *
 * Every string is set with textContent. Nothing about the pupil is sent: a team id, a gain, and a
 * random device id for the rate limit.
 */
import './i18n.js'
import { t } from './i18n.js'
import { el } from './scene/dom.js'
import { PowerMeter } from './scene/PowerMeter.js'
import { RaceClient, crewOf, deviceId } from './scene/race-sync.js'
import { safeStorage } from './scene/progress-store.js'
import { teamColour } from './scene/race-stage.js'

const cfg = window.RACE_DEVICE
const root = document.querySelector('[data-race-view]')
const store = safeStorage('localStorage')
const teamKey = `lp:race:${cfg.code}`

let race = cfg.race
let teamId = null
let token = null
let meter = null
let lastLevel = 0
let client = null
let view = ''
const wordsMode = !['loudness', 'blow', 'rhythm', 'silence', 'motion'].includes(cfg.moment.input)

const button = (label, cls, onClick) => {
  const b = el('button', `btn shadow-none ${cls}`, label)
  b.type = 'button'
  b.addEventListener('click', onClick)
  return b
}

function myTeam () {
  return (race.teams || []).find(tm => tm.id === teamId) ?? null
}

function setView (name, build) {
  view = name
  root.replaceChildren(...build().filter(Boolean))
}

function pick () {
  setView('pick', () => {
    const list = el('div', 'grid grid-cols-1 gap-3')
    for (const team of race.teams) list.appendChild(button(team.name, 'btn-outline btn-lg justify-start', () => join(team.id)))
    return [el('h1', 'text-2xl font-bold', t('Which team are you in?')), list]
  })
}

async function join (id) {
  try {
    const res = await fetch(cfg.urls.join, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-Race-Device': deviceId(store), 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '' },
      body: JSON.stringify({ team_id: id }),
    })
    if (!res.ok) throw new Error(String(res.status))
    const body = await res.json()
    teamId = body.team.id
    token = body.token
    race = body.race
    try { store?.setItem(teamKey, JSON.stringify({ team: teamId, token })) } catch (_) { /* fine: the phone asks again */ }
    follow()
  } catch (_) {
    root.prepend(el('div', 'alert alert-warning', t('That did not work. Try again.')))
  }
}

/** Follow the race on the polling clock; re-render only when the phase changes. */
function follow () {
  client?.stop()
  client = new RaceClient({
    urls: cfg.urls, teamId, token, pushMs: cfg.push_ms, pollMs: cfg.poll_ms, cap: race.goal / 4, device: deviceId(store),
    onState: (next) => { race = next; render() },
    onGone: () => setView('gone', () => [el('p', 'text-xl', t('This race has ended. Look at the class screen.'))]),
  })
  client.start()
  render()
}

function teamBar () {
  const team = myTeam()
  const row = el('div', 'flex flex-col gap-1')
  const bar = el('progress', 'progress progress-primary h-4 w-full')
  bar.max = race.goal
  bar.value = team?.progress ?? 0
  bar.dataset.teamBar = ''
  bar.setAttribute('aria-label', team?.name ?? '')
  row.append(el('span', 'text-sm font-semibold uppercase tracking-wider text-base-content/70', team?.name ?? ''), bar)
  return row
}

/** The team's own ship on a strip of sea, sailing the team's progress, its chip underneath. Flat. */
function shipStrip () {
  const team = myTeam()
  const sea = el('div', 'relative h-36 w-full overflow-hidden rounded-box bg-info/20')
  sea.dataset.sea = ''
  const boat = el('div', 'absolute bottom-3 left-0 flex flex-col items-center gap-1')
  boat.dataset.boat = ''
  boat.style.transition = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'translate 700ms cubic-bezier(0.22, 1, 0.36, 1)'
  if (cfg.ship) {
    const img = el('img', 'h-24 w-auto select-none')
    img.src = cfg.ship
    img.alt = ''
    img.draggable = false
    img.addEventListener('load', () => sail())
    boat.appendChild(img)
  }
  const index = (race.teams || []).findIndex(tm => tm.id === teamId)
  boat.appendChild(el('span', `badge badge-sm whitespace-nowrap ${teamColour(Math.max(0, index))}`, team?.name ?? ''))
  sea.appendChild(boat)
  return sea
}

/** Move the ship to the team's progress: from the left edge to the right edge of the strip. */
function sail () {
  const sea = root.querySelector('[data-sea]')
  const boat = root.querySelector('[data-boat]')
  if (!sea || !boat) return
  const level = Math.max(0, Math.min(1, (myTeam()?.progress ?? 0) / race.goal))
  boat.style.translate = `${Math.round(level * Math.max(0, sea.clientWidth - boat.offsetWidth))}px 0px`
}

function render () {
  if (!myTeam()) return pick()
  if (race.state === 'lobby' && view !== 'wait') {
    setView('wait', () => [shipStrip(), teamBar(), el('p', 'text-xl', t('Wait for your teacher to start the race.'))])
    return sail()
  }
  if (race.state === 'running') {
    if (view !== 'race' && view !== 'through') startRacing()
    const bar = root.querySelector('[data-team-bar]')
    if (bar) bar.value = myTeam().progress
    // The words this team found on any phone, and its fill, on this phone's meter too.
    if (wordsMode && view === 'race') meter?.syncTeam(myTeam().words, myTeam().progress)
    // Over the line (whichever phone found the last word): wait for the others.
    if (view === 'race' && myTeam().finished_ms != null) through()
    return sail()
  }
  if (race.state === 'finished' && view !== 'done') {
    meter?.hide()
    client?.stop()
    const ship = crewOf(race, teamId)
    const line = ship === 'heemskerck' ? t('Your team crews the Heemskerck!')
      : ship === 'zeehaen' ? t('Your team crews the Zeehaen!')
        : t('The race is over. Look at the class screen.')
    setView('done', () => [shipStrip(), teamBar(), el('p', 'text-2xl font-bold', line)])
    sail()
  }
}

/** The team is over the line: the meter makes way for a word to wait with; the ship stays. */
function through () {
  if (view === 'through') return
  view = 'through'
  meter?.hide()
  root.querySelector('[data-race-meter]')?.replaceChildren(el('p', 'text-xl', t('Your team is through! Wait for the others.')))
}

/** The moment's own meter is this phone's instrument: every gain goes to the team. */
function startRacing () {
  setView('race', () => {
    const host = el('div', 'relative min-h-[28rem] flex-1')
    host.dataset.raceMeter = ''
    return [shipStrip(), teamBar(), host]
  })
  const host = root.querySelector('[data-race-meter]')
  meter = new PowerMeter(host)
  lastLevel = 0
  meter.show({
    config: { ...cfg.moment, enabled: true, teams: 0, race: { enabled: false } },
    solo: true,
    skippable: false,
    // A right word goes as that word: the server counts it once for the whole team.
    onWord: wordsMode ? (index) => client?.word(index) : null,
    // A sensor (or the plain tap) goes as an amount gained.
    onProgress: wordsMode ? null : ({ levels }) => {
      const gained = ((levels[0] ?? 0) - lastLevel) * race.goal
      lastLevel = levels[0] ?? 0
      client?.gain(gained)
    },
    // The team's meter is full: this phone waits for the others, the ship stays in view.
    onDone: () => through(),
  })
}

// A phone that joined before goes straight back to its team, with its proof of joining.
const saved = (() => { try { return JSON.parse(store?.getItem(teamKey) || 'null') } catch (_) { return null } })()
if (saved?.token && race.teams.some(tm => tm.id === saved.team)) { teamId = saved.team; token = saved.token; follow() } else pick()
