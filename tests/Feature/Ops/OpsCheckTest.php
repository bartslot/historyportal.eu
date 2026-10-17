<?php

declare(strict_types=1);

namespace Tests\Feature\Ops;

use App\Mail\OpsAlertMail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Infra audit 2026-10-17 (opus.2): the queue outage of June/July and the 500s of 10-16 were found by
 * a person, days later. ops:check mails the admin when prod is broken.
 */
class OpsCheckTest extends TestCase
{
    use RefreshDatabase;

    private string $log;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Storage::fake('local');
        config(['services.alerts.email' => 'alerts@example.test']);
        $this->log = storage_path('framework/testing/ops-laravel.log');
        File::ensureDirectoryExists(dirname($this->log));
        File::put($this->log, "[2026-10-17 09:00:00] production.INFO: fine\n");
        config(['ops.log_path' => $this->log]);
    }

    protected function tearDown(): void
    {
        File::delete($this->log);
        parent::tearDown();
    }

    private function queueJob(int $waitingMinutes): void
    {
        DB::table('jobs')->insert([
            'queue' => 'default', 'payload' => '{}', 'attempts' => 0, 'reserved_at' => null,
            'available_at' => now()->subMinutes($waitingMinutes)->timestamp, 'created_at' => now()->subMinutes($waitingMinutes)->timestamp,
        ]);
    }

    public function test_a_healthy_prod_sends_nothing(): void
    {
        $this->queueJob(2);

        $this->artisan('ops:check')->assertSuccessful();

        Mail::assertNothingSent();
    }

    public function test_a_stalled_queue_is_reported(): void
    {
        $this->queueJob(20);

        $this->artisan('ops:check')->assertFailed();

        Mail::assertSent(OpsAlertMail::class, fn (OpsAlertMail $mail) => str_contains(implode(' ', $mail->problems), 'queue'));
    }

    public function test_new_errors_in_the_log_are_reported_once(): void
    {
        $this->artisan('ops:check')->assertSuccessful();   // learns where the log ends
        File::append($this->log, "[2026-10-17 09:05:00] production.ERROR: TTS service returned no audio.\n");

        $this->artisan('ops:check')->assertFailed();
        Mail::assertSent(OpsAlertMail::class, fn (OpsAlertMail $mail) => str_contains(implode(' ', $mail->problems), 'TTS service returned no audio'));

        Mail::fake();
        $this->artisan('ops:check')->assertSuccessful();   // nothing new since
        Mail::assertNothingSent();
    }

    public function test_new_failed_jobs_are_reported(): void
    {
        $this->artisan('ops:check')->assertSuccessful();
        DB::table('failed_jobs')->insert([
            'uuid' => (string) \Illuminate\Support\Str::uuid(), 'connection' => 'database', 'queue' => 'default',
            'payload' => json_encode(['displayName' => 'App\\Jobs\\GenerateSceneAudio']), 'exception' => 'RuntimeException: boom', 'failed_at' => now(),
        ]);

        $this->artisan('ops:check')->assertFailed();

        Mail::assertSent(OpsAlertMail::class, fn (OpsAlertMail $mail) => str_contains(implode(' ', $mail->problems), 'GenerateSceneAudio'));
    }

    public function test_the_same_problem_mails_at_most_once_an_hour(): void
    {
        $this->queueJob(20);

        $this->artisan('ops:check')->assertFailed();
        $this->artisan('ops:check')->assertFailed();

        Mail::assertSentCount(1);
    }
}
