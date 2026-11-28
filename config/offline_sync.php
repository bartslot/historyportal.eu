<?php

declare(strict_types=1);

/*
 * Editing lessons offline (App\Services\OfflineSync). The live site needs nothing here but hold_days; the
 * laptop that keeps local copies sets OFFLINE_SYNC_REMOTE to the live site and signs in once
 * (php artisan lessons:offline-login, or Offline lessons in the menu).
 */
return [
    // The live site this laptop copies lessons from. Empty on the live site itself: no Offline menu there.
    'remote' => rtrim((string) env('OFFLINE_SYNC_REMOTE', ''), '/'),

    // How long scenes taken offline stay held for their editor on the live site.
    'hold_days' => (int) env('OFFLINE_SYNC_HOLD_DAYS', 14),

    // Where the laptop keeps its sign-in to the live site (the private disk; never in git).
    'token_file' => 'offline-sync/token.json',
];
