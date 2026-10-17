<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('elevenlabs:warm')->cron('*/50 * * * *');

// Drain the queue without a dedicated daemon. SiteGround shared hosting has no long-running
// worker and no SSH crontab, but `schedule:run` already fires every minute (it runs the warm
// command above), so process the queue here each minute. --stop-when-empty exits when idle;
// withoutOverlapping prevents two workers stacking; runInBackground keeps schedule:run snappy.
// The overlap lock expires after 15 minutes, not Laravel's default 24 hours: when SiteGround kills a
// worker the lock stays behind, and lesson generation used to stop for a day (infra audit 2026-10-17).
// 15 minutes is above the longest job (the WorldLabs skybox, 720 s), so a live worker is never doubled.
Schedule::command('queue:work --stop-when-empty --max-time=55 --tries=2')
    ->everyMinute()
    ->withoutOverlapping(15)
    ->runInBackground();

// Publish lessons whose scheduled publish time has arrived (schedule:run fires every minute).
Schedule::command('lessons:publish-due')->everyMinute()->withoutOverlapping(5);

// Email the admin when AI provider credits run low (ElevenLabs narration quota).
Schedule::command('tokens:check')->dailyAt('08:00');

// Is prod broken? A stalled queue, new failed jobs or new log errors are mailed to the admin (infra
// audit 2026-10-17: outages used to be found by a person, days later).
Schedule::command('ops:check')->everyFiveMinutes()->withoutOverlapping(5);

// Pull kerndoelen and the Canon from the official sources; mail what changed (Bart, 2026-10-17).
Schedule::command('curriculum:sync')->weeklyOn(1, '06:00')->withoutOverlapping(30);

// Sweep the throwaway accounts behind the landing-page "Configure" demo (config/demo.php).
Schedule::command('demo:prune-guests')->hourly()->withoutOverlapping(30);

// Harbour races older than config race.ttl_hours (24 h). Each new race prunes too, so this is the
// backstop, not the only guard.
// Test sessions (and everything they recorded, by cascade) after TestSession::RETENTION_DAYS (30).
Schedule::command('model:prune', ['--model' => [\App\Models\TestSession::class]])->dailyAt('03:30')->withoutOverlapping(30);

Schedule::call(fn () => app(\App\Services\Lessons\HarbourRace::class)->prune())->hourly()->name('races:prune')->withoutOverlapping(30);
