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
Schedule::command('queue:work --stop-when-empty --max-time=55 --tries=2')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground();

// Publish lessons whose scheduled publish time has arrived (schedule:run fires every minute).
Schedule::command('lessons:publish-due')->everyMinute()->withoutOverlapping();

// Email the admin when AI provider credits run low (ElevenLabs narration quota).
Schedule::command('tokens:check')->dailyAt('08:00');

// Pull kerndoelen and the Canon from the official sources; mail what changed (Bart, 2026-10-17).
Schedule::command('curriculum:sync')->weeklyOn(1, '06:00')->withoutOverlapping(30);

// Sweep the throwaway accounts behind the landing-page "Configure" demo (config/demo.php).
Schedule::command('demo:prune-guests')->hourly()->withoutOverlapping();

// Harbour races older than config race.ttl_hours (24 h). Each new race prunes too, so this is the
// backstop, not the only guard.
// Test sessions (and everything they recorded, by cascade) after TestSession::RETENTION_DAYS (30).
Schedule::command('model:prune', ['--model' => [\App\Models\TestSession::class]])->dailyAt('03:30')->withoutOverlapping();

Schedule::call(fn () => app(\App\Services\Lessons\HarbourRace::class)->prune())->hourly()->name('races:prune')->withoutOverlapping();
