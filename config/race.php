<?php

declare(strict_types=1);

/*
 * The harbour race on team devices (short polling, no websockets: SiteGround shared hosting).
 * The intervals are the knobs if SiteGround's anti-bot ever throttles a school's one IP address:
 * RACE_PUSH_MS=2000 halves the controllers' writes without changing anything else.
 */
return [
    // How often a team device sends what it has gained (ms). At most one request per interval.
    'push_ms' => (int) env('RACE_PUSH_MS', 1000),
    // How often the class screen reads the race while it runs, and in the lobby (ms).
    'screen_poll_ms' => (int) env('RACE_SCREEN_POLL_MS', 1000),
    'lobby_poll_ms' => (int) env('RACE_LOBBY_POLL_MS', 2000),
    // How often a team device reads the race when it has nothing to send (ms).
    'device_poll_ms' => (int) env('RACE_DEVICE_POLL_MS', 2000),
    // A team not heard from for this long shows "no signal" on the class screen (s).
    'signal_seconds' => 6,
    // Hours a race may live at most; it is normally deleted as soon as it ends.
    'ttl_hours' => 24,
];
