<?php

declare(strict_types=1);

// ops:check, the "is prod broken?" mail (infra audit 2026-10-17). Recipient: services.alerts.email.
return [
    // The log ops:check reads for new ERROR lines.
    'log_path' => storage_path('logs/laravel.log'),

    // A job waiting longer than this means the cron-driven worker has stopped.
    'stalled_queue_minutes' => 15,

    // The same kind of alert is mailed at most once per this many minutes.
    'quiet_minutes' => 60,
];
