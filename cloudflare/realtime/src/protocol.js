/**
 * The parts of the Pusher protocol (v7) that History Portal uses, as pure functions: Laravel's Broadcasting
 * and Echo speak it, and so does Reverb. Kept free of Worker APIs so vitest can run it
 * (cloudflare/realtime/test/protocol.test.js); the Durable Object in index.js only moves bytes.
 *
 * What is covered: connect, ping, subscribe to public, private-* and presence-* channels (signed by Laravel's
 * /broadcasting/auth with the shared secret), client-* events between browsers (cursors), and the HTTP
 * events API Laravel posts server events to. Nothing else: no webhooks, no user authentication, no
 * encrypted channels.
 */

export const ACTIVITY_TIMEOUT = 30

const enc = new TextEncoder()

export async function hmacHex (secret, text, subtle = crypto.subtle) {
  const key = await subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await subtle.sign('HMAC', key, enc.encode(text))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time compare of two hex strings, so a wrong signature does not leak how much of it was right. */
export function sameHex (a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function channelKind (channel) {
  if (typeof channel !== 'string' || channel === '' || channel.length > 200) return null
  if (channel.startsWith('presence-')) return 'presence'
  if (channel.startsWith('private-encrypted-')) return null
  if (channel.startsWith('private-')) return 'private'
  return 'public'
}

/** "123.456", as Pusher writes a socket id. */
export function newSocketId (random = Math.random) {
  const part = () => Math.floor(random() * 1e9) + 1
  return `${part()}.${part()}`
}

/**
 * Is this subscription signed by Laravel? auth is "key:hex", the hex being HMAC-SHA256 of
 * "socket_id:channel" (private) or "socket_id:channel:channel_data" (presence) under the app secret.
 */
export async function verifySubscription ({ appKey, secret, socketId, channel, auth, channelData }) {
  const kind = channelKind(channel)
  if (kind === 'public') return true
  if (kind === null || typeof auth !== 'string') return false
  const [key, sig] = auth.split(':')
  if (key !== appKey) return false
  const text = kind === 'presence' ? `${socketId}:${channel}:${channelData ?? ''}` : `${socketId}:${channel}`
  return sameHex(sig, await hmacHex(secret, text))
}

/** The member a presence subscription announces, from the channel_data Laravel signed. */
export function memberOf (channelData) {
  try {
    const data = JSON.parse(channelData)
    if (data?.user_id === undefined || data.user_id === null) return null
    return { user_id: String(data.user_id), user_info: data.user_info ?? {} }
  } catch {
    return null
  }
}

/** Everyone on a presence channel, one entry per user however many tabs they have open. */
export function presenceData (members) {
  const hash = {}
  for (const m of members) hash[m.user_id] = m.user_info
  const ids = Object.keys(hash)
  return { presence: { ids, hash, count: ids.length } }
}

export const frame = (event, data, channel) => JSON.stringify(
  channel === undefined ? { event, data: typeof data === 'string' ? data : JSON.stringify(data) }
    : { event, channel, data: typeof data === 'string' ? data : JSON.stringify(data) },
)

export const errorFrame = (message, code) => JSON.stringify({ event: 'pusher:error', data: { message, code } })

/**
 * Is this POST to /apps/{id}/events signed by Laravel? Pusher's REST signature: HMAC-SHA256 under the
 * secret of "POST\n<path>\n<query without auth_signature, keys sorted>", plus body_md5 of the body and a
 * timestamp no older than ten minutes.
 */
export async function verifyRestRequest ({ method, path, query, body, appKey, secret, now = Date.now(), md5Hex }) {
  if (query.get('auth_key') !== appKey) return false
  const ts = Number(query.get('auth_timestamp'))
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 600) return false
  if (body && query.get('body_md5') !== await md5Hex(body)) return false

  const params = [...query.entries()]
    .filter(([k]) => k !== 'auth_signature')
    .map(([k, v]) => [k.toLowerCase(), v])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')

  return sameHex(query.get('auth_signature') ?? '', await hmacHex(secret, `${method}\n${path}\n${params}`))
}

/** The events one POST carries: { name, channels | channel, data, socket_id } or a batch of them. */
export function eventsOf (path, payload) {
  const list = path.endsWith('/batch_events') ? (payload?.batch ?? []) : [payload]
  return list
    .filter((e) => e && typeof e.name === 'string')
    .map((e) => ({
      name: e.name,
      channels: Array.isArray(e.channels) ? e.channels : (e.channel ? [e.channel] : []),
      data: typeof e.data === 'string' ? e.data : JSON.stringify(e.data ?? {}),
      except: e.socket_id ?? null,
    }))
}
