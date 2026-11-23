/**
 * History Portal's realtime relay: a Pusher-protocol server on a Cloudflare Worker + one Durable Object.
 *
 * Laravel's own realtime stack (Broadcasting on the server, Echo + pusher-js in the browser) talks to it
 * exactly as it would talk to Reverb, so the app only changes its .env (REVERB_HOST and the key, see
 * cloudflare/realtime/README.md). Reverb itself is a long-running PHP server, which neither SiteGround nor
 * a Worker can run; this does the small part of its job the editor needs, on the free plan.
 *
 * It is a convenience, never the authority: who holds a scene is decided in Laravel
 * (LessonCollaboration), and the editor keeps pinging. If this relay is down or over its free daily
 * limit, cursors and instant notices stop and nothing else does.
 *
 * One Durable Object holds every connection. It uses the WebSocket Hibernation API, so idle sockets cost
 * nothing, and Pusher's ping is answered by the runtime without waking it.
 */
import {
  ACTIVITY_TIMEOUT, channelKind, errorFrame, eventsOf, frame, memberOf, newSocketId, presenceData,
  verifyRestRequest, verifySubscription,
} from './protocol.js'

const PING = JSON.stringify({ event: 'pusher:ping', data: {} })
const PONG = JSON.stringify({ event: 'pusher:pong', data: {} })
const MAX_MESSAGE = 10_000       // Pusher's own limit for one event
const MAX_CHANNELS = 20          // one editor needs one or two

export default {
  async fetch (request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/' || url.pathname === '/up') return new Response('ok')

    const ws = url.pathname.match(/^\/app\/([^/]+)$/)
    const rest = url.pathname.match(/^\/apps\/([^/]+)\/(events|batch_events)$/)
    if (ws && ws[1] !== env.APP_KEY) return new Response('unknown app', { status: 404 })
    if (rest && rest[1] !== env.APP_ID) return new Response('unknown app', { status: 404 })
    if (!ws && !rest) return new Response('not found', { status: 404 })

    const id = env.RELAY.idFromName(env.APP_ID)
    return env.RELAY.get(id).fetch(request)
  },
}

export class Relay {
  constructor (ctx, env) {
    this.ctx = ctx
    this.env = env
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG))
  }

  async fetch (request) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/app/')) return this.connect(request)
    return this.restEvents(request, url)
  }

  connect (request) {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('expected a websocket', { status: 426 })
    const [client, server] = Object.values(new WebSocketPair())
    const socketId = newSocketId()
    this.ctx.acceptWebSocket(server)
    server.serializeAttachment({ socketId, channels: {} })
    server.send(frame('pusher:connection_established', { socket_id: socketId, activity_timeout: ACTIVITY_TIMEOUT }))

    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage (ws, raw) {
    if (typeof raw !== 'string' || raw.length > MAX_MESSAGE) return ws.send(errorFrame('Message too large', 4009))
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    const state = ws.deserializeAttachment()
    const data = typeof msg.data === 'string' && msg.event?.startsWith('pusher:') ? safeJson(msg.data) : msg.data

    if (msg.event === 'pusher:ping') return ws.send(PONG)
    if (msg.event === 'pusher:subscribe') return this.subscribe(ws, state, data ?? {})
    if (msg.event === 'pusher:unsubscribe') return this.unsubscribe(ws, state, data?.channel)
    if (typeof msg.event === 'string' && msg.event.startsWith('client-')) return this.clientEvent(ws, state, msg)
  }

  async subscribe (ws, state, { channel, auth, channel_data: channelData }) {
    const kind = channelKind(channel)
    const ok = kind !== null && Object.keys(state.channels).length < MAX_CHANNELS && await verifySubscription({
      appKey: this.env.APP_KEY, secret: this.env.APP_SECRET, socketId: state.socketId, channel, auth, channelData,
    })
    if (!ok) {
      return ws.send(frame('pusher:subscription_error', { type: 'AuthError', error: 'Invalid signature', status: 401 }, channel))
    }

    const member = kind === 'presence' ? memberOf(channelData) : null
    if (kind === 'presence' && !member) {
      return ws.send(frame('pusher:subscription_error', { type: 'AuthError', error: 'No user', status: 401 }, channel))
    }

    const wasHere = member ? this.members(channel).some((m) => m.user_id === member.user_id) : false
    state.channels[channel] = member ?? true
    ws.serializeAttachment(state)

    const payload = kind === 'presence' ? presenceData(this.members(channel)) : {}
    ws.send(frame('pusher_internal:subscription_succeeded', payload, channel))
    if (member && !wasHere) this.send(channel, frame('pusher_internal:member_added', member, channel), ws)
  }

  unsubscribe (ws, state, channel) {
    if (!(channel in state.channels)) return
    const member = state.channels[channel]
    delete state.channels[channel]
    ws.serializeAttachment(state)
    this.memberLeft(channel, member, ws)
  }

  /** client-* between browsers: only on private and presence channels the sender joined, as Pusher does. */
  clientEvent (ws, state, msg) {
    const channel = msg.channel
    const kind = channelKind(channel)
    if (kind === 'public' || kind === null || !(channel in state.channels)) {
      return ws.send(errorFrame('Client events need a private or presence channel you joined', 4301))
    }
    const member = state.channels[channel]
    const out = { event: msg.event, channel, data: msg.data }
    if (member && member !== true) out.user_id = member.user_id
    this.send(channel, JSON.stringify(out), ws)
  }

  webSocketClose (ws) { this.drop(ws) }
  webSocketError (ws) { this.drop(ws) }

  drop (ws) {
    const state = ws.deserializeAttachment()
    if (!state) return
    for (const [channel, member] of Object.entries(state.channels)) this.memberLeft(channel, member, ws)
    ws.serializeAttachment({ socketId: state.socketId, channels: {} })
  }

  memberLeft (channel, member, ws) {
    if (!member || member === true) return
    const stillHere = this.members(channel, ws).some((m) => m.user_id === member.user_id)
    if (!stillHere) this.send(channel, frame('pusher_internal:member_removed', { user_id: member.user_id }, channel), ws)
  }

  /** The members of a presence channel, from every socket's attachment (survives hibernation). */
  members (channel, except = null) {
    const out = []
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue
      const member = ws.deserializeAttachment()?.channels?.[channel]
      if (member && member !== true) out.push(member)
    }
    return out
  }

  send (channel, text, except = null, exceptSocketId = null) {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue
      const state = ws.deserializeAttachment()
      if (!state || !(channel in state.channels) || state.socketId === exceptSocketId) continue
      try { ws.send(text) } catch { /* closing */ }
    }
  }

  /** Laravel's broadcast (Pusher REST API): POST /apps/{id}/events, signed with the shared secret. */
  async restEvents (request, url) {
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
    const body = await request.text()
    const ok = await verifyRestRequest({
      method: 'POST', path: url.pathname, query: url.searchParams, body,
      appKey: this.env.APP_KEY, secret: this.env.APP_SECRET, md5Hex,
    })
    if (!ok) return new Response('invalid signature', { status: 401 })

    const payload = safeJson(body)
    for (const event of eventsOf(url.pathname, payload)) {
      for (const channel of event.channels) {
        this.send(channel, JSON.stringify({ event: event.name, channel, data: event.data }), null, event.except)
      }
    }

    return Response.json({})
  }
}

function safeJson (text) {
  try { return JSON.parse(text) } catch { return null }
}

/** MD5 is not in Web Crypto, but the Workers runtime offers it (body_md5 in Pusher's REST signature). */
async function md5Hex (text) {
  const digest = await crypto.subtle.digest('MD5', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
