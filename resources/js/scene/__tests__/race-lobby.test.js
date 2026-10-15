import { describe, it, expect, vi } from 'vitest'
import { RaceLobby } from '../race-lobby.js'

const race = (state, teams) => ({ code: 'K7QW', state, goal: 4, roles: {}, teams })
const team = (id, name, extra = {}) => ({ id, name, progress: 0, finished_ms: null, joined: false, signal: false, ...extra })

function mount (r) {
  const host = document.createElement('div')
  const lobby = new RaceLobby(host)
  const opts = { race: r, joinUrl: 'https://example.test/race/K7QW', drawQr: vi.fn(), onNames: vi.fn(), onStart: vi.fn(), onEnd: vi.fn() }
  lobby.show(opts)
  return { host, lobby, opts }
}

describe('the race lobby on the class screen', () => {
  it('shows the QR, the code and the teacher\'s team names; names go to the teacher\'s action', () => {
    const { host, opts } = mount(race('lobby', [team(1, 'Team 1'), team(2, '<b>Team 2</b>')]))
    expect(opts.drawQr).toHaveBeenCalledWith(expect.any(HTMLCanvasElement), 'https://example.test/race/K7QW')
    expect(host.textContent).toContain('K7QW')
    expect(host.querySelector('b')).toBeNull()
    const input = host.querySelector('[data-team-name="0"]')
    input.value = 'De Haaien'
    input.dispatchEvent(new Event('change'))
    expect(opts.onNames).toHaveBeenCalledWith(['De Haaien', '<b>Team 2</b>'])
  })

  it('refreshes who joined in place, so a name being typed is kept', () => {
    const { host, lobby } = mount(race('lobby', [team(1, 'Team 1'), team(2, 'Team 2')]))
    const input = host.querySelector('[data-team-name="1"]')
    input.value = 'Half getypt'
    lobby.update(race('lobby', [team(1, 'Team 1', { joined: true, signal: true }), team(2, 'Team 2', { joined: true, signal: false })]))
    expect(host.querySelector('[data-team-name="1"]')).toBe(input)
    expect(input.value).toBe('Half getypt')
    expect(host.querySelector('[data-signal="0"]').dataset.state).toBe('on')
    expect(host.querySelector('[data-signal="1"]').dataset.state).toBe('lost')
  })

  it('while racing: a bar per team, places by time over the line, and End the race', () => {
    const { host, lobby, opts } = mount(race('lobby', [team(1, 'A'), team(2, 'B'), team(3, 'C')]))
    lobby.update(race('running', [team(1, 'A', { progress: 4, finished_ms: 9000 }), team(2, 'B', { progress: 2 }), team(3, 'C', { progress: 4, finished_ms: 7000 })]))
    expect(host.querySelector('[data-race-bar="1"]').value).toBe(2)
    expect(host.querySelector('[data-place="2"]').textContent).toBe('1')
    expect(host.querySelector('[data-place="0"]').textContent).toBe('2')
    ;[...host.querySelectorAll('button')].find(b => b.textContent === 'End the race').click()
    expect(opts.onEnd).toHaveBeenCalledOnce()
  })
})
