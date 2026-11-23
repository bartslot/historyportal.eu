import { describe, it, expect } from 'vitest'
import { createHash, createHmac, webcrypto } from 'node:crypto'
import {
  channelKind, eventsOf, hmacHex, memberOf, presenceData, sameHex, verifyRestRequest, verifySubscription,
} from '../src/protocol.js'

const subtle = webcrypto.subtle
const secret = 's3cret'
const appKey = 'hp-editor'
const sign = (text) => createHmac('sha256', secret).update(text).digest('hex')
const md5Hex = async (t) => createHash('md5').update(t).digest('hex')

describe('the realtime relay speaks the part of the Pusher protocol Echo needs', () => {
  it('signs like Laravel does', async () => {
    expect(await hmacHex(secret, '1.2:private-x', subtle)).toBe(sign('1.2:private-x'))
  })

  it('tells channel kinds apart and refuses encrypted ones', () => {
    expect(channelKind('presence-lesson.4')).toBe('presence')
    expect(channelKind('private-lesson.4')).toBe('private')
    expect(channelKind('lesson.4')).toBe('public')
    expect(channelKind('private-encrypted-x')).toBeNull()
  })

  it('accepts a presence subscription Laravel signed, and nothing else', async () => {
    const channelData = JSON.stringify({ user_id: 7, user_info: { name: 'Joey' } })
    const auth = `${appKey}:${sign(`1.2:presence-lesson.4:${channelData}`)}`
    const base = { appKey, secret, socketId: '1.2', channel: 'presence-lesson.4', channelData }
    expect(await verifySubscription({ ...base, auth })).toBe(true)
    expect(await verifySubscription({ ...base, auth, socketId: '9.9' })).toBe(false)
    expect(await verifySubscription({ ...base, auth, channelData: channelData.replace('Joey', 'Bart') })).toBe(false)
    expect(await verifySubscription({ ...base, auth: `other:${auth.split(':')[1]}` })).toBe(false)
  })

  it('lists each user once on a presence channel', () => {
    const m = memberOf(JSON.stringify({ user_id: 7, user_info: { name: 'Joey' } }))
    expect(m).toEqual({ user_id: '7', user_info: { name: 'Joey' } })
    expect(presenceData([m, m]).presence.count).toBe(1)
    expect(memberOf('nonsense')).toBeNull()
  })

  it('accepts Laravel\'s signed REST post and refuses a forged or stale one', async () => {
    const body = JSON.stringify({ name: 'room.changed', channels: ['presence-lesson.4'], data: '{}' })
    const now = 1_700_000_000_000
    const params = { auth_key: appKey, auth_timestamp: String(now / 1000), auth_version: '1.0', body_md5: await md5Hex(body) }
    const path = '/apps/historyportal/events'
    const qs = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&')
    const query = new URLSearchParams({ ...params, auth_signature: sign(`POST\n${path}\n${qs}`) })
    const args = { method: 'POST', path, query, body, appKey, secret, now, md5Hex }

    expect(await verifyRestRequest(args)).toBe(true)
    expect(await verifyRestRequest({ ...args, body: body.replace('room', 'evil') })).toBe(false)
    expect(await verifyRestRequest({ ...args, now: now + 11 * 60 * 1000 })).toBe(false)
  })

  it('reads single and batch events, keeping the sender to skip', () => {
    expect(eventsOf('/apps/a/events', { name: 'x', channel: 'c', data: { a: 1 }, socket_id: '1.2' }))
      .toEqual([{ name: 'x', channels: ['c'], data: '{"a":1}', except: '1.2' }])
    expect(eventsOf('/apps/a/batch_events', { batch: [{ name: 'x', channel: 'c', data: '{}' }, { nope: 1 }] })).toHaveLength(1)
  })

  it('compares signatures without short-circuiting on length games', () => {
    expect(sameHex('abcd', 'abcd')).toBe(true)
    expect(sameHex('abcd', 'abce')).toBe(false)
    expect(sameHex('abc', 'abcd')).toBe(false)
  })
})
