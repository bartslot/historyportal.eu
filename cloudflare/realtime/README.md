# Realtime relay (Cloudflare)

Live cursors and instant "took over this scene" notices for several accounts in one lesson's editor.

It is a small Pusher-protocol server on a Cloudflare Worker with one Durable Object. Laravel Broadcasting
and Echo talk to it exactly as they would talk to Reverb, so the app only changes its `.env`. Reverb itself
needs a PHP process running all day, which SiteGround does not allow.

The relay is never the authority. Scene locks live in Laravel (`LessonCollaboration`) and the editor keeps
pinging every 3 s, so if the relay is down or over its free limit, cursors stop and everything else works.

## Free plan

Durable Objects run on the Workers Free plan (SQLite-backed only). Limits that matter: 100,000 requests a
day, and incoming WebSocket messages count 20 to 1. Idle sockets hibernate and cost nothing. Cursors are
sent at most 10 times a second per person, so three people editing for an hour is about 5,400 requests.
Over the limit, live updates stop until 00:00 UTC.

## Deploy (once)

```bash
cd cloudflare/realtime
npm install
npx wrangler login                       # opens the browser, signs in to the Cloudflare account
openssl rand -hex 32                     # the shared secret, keep it for the next two steps
npx wrangler secret put APP_SECRET       # paste it
npx wrangler deploy                      # prints https://hp-realtime.<account>.workers.dev
```

Then in the app's `.env` (production on SiteGround, and locally if wanted), followed by `php artisan config:cache`:

```
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=historyportal
REVERB_APP_KEY=hp-editor
REVERB_APP_SECRET=<the same secret>
REVERB_HOST=hp-realtime.<account>.workers.dev
REVERB_PORT=443
REVERB_SCHEME=https
```

`APP_ID` and `APP_KEY` in `wrangler.toml` must match `REVERB_APP_ID` and `REVERB_APP_KEY`.

To check it is up: `curl https://hp-realtime.<account>.workers.dev/up` answers `ok`.

## What it speaks

Connect (`/app/{key}`), ping, subscribe to public, `private-` and `presence-` channels signed by Laravel's
`/broadcasting/auth`, `client-` events between browsers (cursors), and the REST events API Laravel posts to
(`/apps/{id}/events`, `/apps/{id}/batch_events`). Not covered: webhooks, user sign-in, encrypted channels.

Protocol helpers are pure functions in `src/protocol.js`, tested by `test/protocol.test.mjs` (root `npm test`).
