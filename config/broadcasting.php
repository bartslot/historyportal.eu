<?php

declare(strict_types=1);

/*
 * Realtime for the lesson editor (several accounts in one lesson: cursors, instant Take over notices).
 *
 * The "reverb" connection speaks the Pusher protocol. In production it points at our own relay on
 * Cloudflare (cloudflare/realtime), not at a Reverb server: SiteGround cannot keep Reverb running, and
 * the relay is free. Locally it can point at `php artisan reverb:start` or at `npx wrangler dev`.
 * With BROADCAST_CONNECTION=log or null the editor simply keeps to its pings (LessonCollaboration).
 */
return [

    'default' => env('BROADCAST_CONNECTION', 'null'),

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST'),
                'port' => env('REVERB_PORT', 443),
                'scheme' => env('REVERB_SCHEME', 'https'),
                'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            ],
            'client_options' => [
                // A slow relay must never hold up a teacher's click: the ping catches up anyway.
                'timeout' => 3,
            ],
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
