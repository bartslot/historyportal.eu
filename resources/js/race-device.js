/**
 * A team's phone in the harbour race (/race/{code}, opened by the race QR on the class screen).
 *
 *   pick     the teams the teacher named; a phone that joined before goes straight back to its team
 *   wait     the lobby: the teacher starts the race on the class screen
 *   race     the moment's meter (words, tap, mic, shake: the PowerMeter itself) as this phone's input;
 *            what it gains is pushed to the team, and the team's bar shows what all its phones did
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

function render () {
  if (!myTeam()) return pick()
  if (race.state === 'lobby' && view !== 'wait') {
    return setView('wait', () => [teamBar(), el('p', 'text-xl', t('Wait for your teacher to start the race.'))])
  }
  if (race.state === 'running') {
    if (view !== 'race') startRacing()
    const bar = root.querySelector('[data-team-bar]')
    if (bar) bar.value = myTeam().progress
    return
  }
  if (race.state === 'finished' && view !== 'done') {
    meter?.hide()
    client?.stop()
    const ship = crewOf(race, teamId)
    const line = ship === 'heemskerck' ? t('Your team crews the Heemskerck!')
      : ship === 'zeehaen' ? t('Your team crews the Zeehaen!')
        : t('The race is over. Look at the class screen.')
    setView('done', () => [teamBar(), el('p', 'text-2xl font-bold', line)])
  }
}

/** The moment's own meter is this phone's instrument: every gain goes to the team. */
function startRacing () {
  setView('race', () => {
    const host = el('div', 'relative min-h-[28rem] flex-1')
    host.dataset.raceMeter = ''
    return [teamBar(), host]
  })
  const host = root.querySelector('[data-race-meter]')
  meter = new PowerMeter(host)
  lastLevel = 0
  meter.show({
    config: { ...cfg.moment, enabled: true, teams: 0, race: { enabled: false } },
    solo: true,
    skippable: false,
    onProgress: ({ levels }) => {
      const gained = ((levels[0] ?? 0) - lastLevel) * race.goal
      lastLevel = levels[0] ?? 0
      client?.gain(gained)
    },
    onDone: () => { /* this phone filled its whole meter; the team bar and the class screen go on */ },
  })
}

// A phone that joined before goes straight back to its team, with its proof of joining.
const saved = (() => { try { return JSON.parse(store?.getItem(teamKey) || 'null') } catch (_) { return null } })()
if (saved?.token && race.teams.some(tm => tm.id === saved.team)) { teamId = saved.team; token = saved.token; follow() } else pick()
