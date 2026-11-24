<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Jobs\TranslateLessonCaptions;
use App\Models\CaptionTranslation;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Captions\CaptionTranslator;
use App\Services\Captions\FakeTextTranslator;
use App\Services\Captions\TextTranslator;
use App\Services\Llm\LlmHttpException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\TestCase;

/**
 * A rate-limited or failing provider (prod hit Gemini's free tier, 15 requests a minute): retry
 * with backoff, save what is done, never re-send it, and never lock a language for long.
 */
class CaptionTranslationRetryTest extends TestCase
{
    use RefreshDatabase;

    private FakeTextTranslator $fake;

    protected function setUp(): void
    {
        parent::setUp();
        Sleep::fake();
        $this->fake = new FakeTextTranslator;
        $this->app->instance(TextTranslator::class, $this->fake);
    }

    /** A lesson of one scene with $count narrator lines (+ its script): $count + 1 lines to translate. */
    private function lesson(int $count): Lesson
    {
        $lesson = Lesson::factory()->create(['teacher_id' => User::factory()->create()->id, 'status' => LessonStatus::Published->value, 'language' => 'nl']);
        $lines = array_map(fn (int $i) => ['speaker' => 'narrator', 'text' => "Regel {$i} van de reis.", 'start' => $i, 'end' => $i + 1], range(1, $count));
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'De reis begint.', 'config' => ['lines' => $lines]]);

        return $lesson->refresh();
    }

    private function captions(): CaptionTranslator
    {
        return app(CaptionTranslator::class);
    }

    public function test_a_429_is_waited_out_for_as_long_as_the_provider_asks_then_retried(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = [new LlmHttpException(429, retryAfter: 56)];

        $this->assertSame(3, $this->captions()->translateMissing($lesson, 'de'));

        $this->assertCount(2, $this->fake->calls);
        Sleep::assertSleptTimes(1);
        Sleep::assertSlept(fn ($d) => $d->totalSeconds >= 56 && $d->totalSeconds <= 57);
    }

    public function test_5xx_backs_off_5_15_45_seconds_and_a_4xx_is_not_retried(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = [new LlmHttpException(503), new LlmHttpException(500), new LlmHttpException(502)];

        $this->assertSame(3, $this->captions()->translateMissing($lesson, 'fr'));
        Sleep::assertSleptTimes(3);
        foreach ([5, 15, 45] as $base) {   // plus up to a second of jitter
            Sleep::assertSlept(fn ($d) => $d->totalMilliseconds >= $base * 1000 && $d->totalMilliseconds <= $base * 1000 + 1000, 1);
        }

        $this->fake->failures = [new LlmHttpException(400)];
        $this->expectException(LlmHttpException::class);
        $this->captions()->translateMissing($lesson, 'it');
    }

    public function test_a_429_halves_the_batch(): void
    {
        $lesson = $this->lesson(104);   // 105 lines: 100 per request
        $this->fake->failures = [new LlmHttpException(429)];

        $this->assertSame(105, $this->captions()->translateMissing($lesson, 'es'));

        $this->assertSame([100, 50, 50, 5], array_map('count', $this->fake->calls));
    }

    public function test_a_batch_that_keeps_failing_keeps_the_batches_before_it_and_is_never_resent(): void
    {
        $lesson = $this->lesson(104);
        $this->fake->failures = [null, ...array_fill(0, 4, new LlmHttpException(503))];

        try {
            $this->captions()->translateMissing($lesson, 'ja');
            $this->fail('the last refusal reaches the caller');
        } catch (LlmHttpException $e) {
            $this->assertSame(503, $e->status);
        }
        $this->assertSame(100, CaptionTranslation::where('language', 'ja')->count());

        $this->fake->calls = [];
        $this->assertSame(5, $this->captions()->translateMissing($lesson, 'ja'));
        $this->assertSame([5], array_map('count', $this->fake->calls), 'only the 5 missing lines are sent again');
    }

    public function test_waiting_stops_at_the_budget_rather_than_at_the_job_timeout(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = [new LlmHttpException(429, retryAfter: 120), new LlmHttpException(429, retryAfter: 120)];

        $this->expectException(LlmHttpException::class);
        try {
            $this->captions()->translateMissing($lesson, 'zh');
        } finally {
            Sleep::assertSleptTimes(1);   // 120 s once; a second 120 s would pass 180 s
        }
    }

    public function test_a_failed_run_holds_the_language_for_a_minute_only_and_a_finished_one_releases_it(): void
    {
        $lesson = $this->lesson(2);
        $key = TranslateLessonCaptions::statusKey($lesson->id, 'ar');
        $url = route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'ar']);
        $this->fake->failures = array_fill(0, 4, new LlmHttpException(429));

        $this->getJson($url)->assertOk()->assertJsonPath('pending', true)->assertJsonPath('translating', true);
        $this->assertSame('retry', Cache::get($key));

        $this->travel(TranslateLessonCaptions::RETRY_AFTER_SECONDS + 1)->seconds();
        $this->assertNull(Cache::get($key), 'released after a minute, not thirty');

        $this->getJson($url)->assertOk()->assertJsonPath('pending', false)->assertJsonPath('translating', false);
        $this->assertNull(Cache::get($key));
    }

    public function test_the_command_goes_on_to_the_next_language_after_one_fails(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = array_fill(0, 4, new LlmHttpException(429));

        $this->artisan('captions:translate', ['lesson' => $lesson->lesson_code, 'languages' => ['de', 'fr']])
            ->expectsOutputToContain('de: 0 translated, 3 still missing (OpenAI API returned 429; run again to finish)')
            ->expectsOutputToContain('fr: 3 translated, 0 still missing')
            ->expectsOutputToContain('Not finished: de')
            ->assertFailed();
    }

    public function test_the_llm_client_reads_gemini_retry_delay_and_does_not_burn_quota_retrying_a_429(): void
    {
        $body = [['error' => ['code' => 429, 'status' => 'RESOURCE_EXHAUSTED', 'details' => [['@type' => 'type.googleapis.com/google.rpc.RetryInfo', 'retryDelay' => '56s']]]]];
        Http::fake(['*' => Http::response($body, 429)]);
        config(['llm.roles.translate' => 'gemini']);

        try {
            app(\App\Services\Llm\LlmRouter::class)->for('translate')->json('s', 'u');
            $this->fail('a 429 throws');
        } catch (LlmHttpException $e) {
            $this->assertSame(429, $e->status);
            $this->assertSame(56, $e->retryAfter);
        }
        Http::assertSentCount(1);
    }

    public function test_a_busy_provider_puts_the_job_back_on_the_queue_instead_of_failing_it(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = array_fill(0, 4, new LlmHttpException(503));

        $job = (new TranslateLessonCaptions($lesson->id, 'de'))->withFakeQueueInteractions();
        $job->handle($this->captions());

        $job->assertReleased(delay: TranslateLessonCaptions::RELEASE_DELAYS[0]);
        $job->assertNotFailed();
        $this->assertSame('running', Cache::get(TranslateLessonCaptions::statusKey($lesson->id, 'de')), 'no second copy queued while it waits');
    }

    public function test_an_empty_openai_quota_fails_the_job_at_once(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = [new LlmHttpException(429, errorCode: LlmHttpException::QUOTA_EXHAUSTED)];

        $job = (new TranslateLessonCaptions($lesson->id, 'de'))->withFakeQueueInteractions();
        $job->handle($this->captions());

        $job->assertFailedWith(LlmHttpException::class);
        $job->assertNotReleased();
        Sleep::assertNeverSlept();
        $this->assertSame('retry', Cache::get(TranslateLessonCaptions::statusKey($lesson->id, 'de')));
        $this->assertSame('OpenAI API returned 429 (insufficient_quota)', (new LlmHttpException(429, errorCode: 'insufficient_quota'))->getMessage());
    }

    public function test_any_other_error_fails_the_job_at_once_and_still_frees_the_language(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = [new \RuntimeException('OpenAI API request failed: connection reset')];
        $key = TranslateLessonCaptions::statusKey($lesson->id, 'de');
        Cache::put($key, 'running', now()->addMinutes(10));

        $job = (new TranslateLessonCaptions($lesson->id, 'de'))->withFakeQueueInteractions();
        $job->handle($this->captions());

        $job->assertFailedWith(\RuntimeException::class);
        $job->assertNotReleased();
        $this->assertSame('retry', Cache::get($key), 'held a minute, not the ten the controller set');
    }

    public function test_the_last_try_fails_instead_of_re_queuing_again(): void
    {
        $lesson = $this->lesson(2);
        $this->fake->failures = array_fill(0, 4, new LlmHttpException(503));

        $job = (new TranslateLessonCaptions($lesson->id, 'de'))->withFakeQueueInteractions();
        $job->job->attempts = 4;
        $job->handle($this->captions());

        $job->assertFailedWith(LlmHttpException::class);
        $job->assertNotReleased();
    }

    /** Through a real database queue and worker: what prod's cron queue:work does. */
    private function work(): void
    {
        $this->artisan('queue:work', ['connection' => 'database', '--once' => true, '--stop-when-empty' => true])->assertSuccessful();
    }

    public function test_on_the_worker_a_busy_provider_waits_on_the_queue_and_an_empty_quota_fails_once(): void
    {
        config(['queue.default' => 'database']);
        $lesson = $this->lesson(2);

        $this->fake->failures = array_fill(0, 4, new LlmHttpException(503));
        TranslateLessonCaptions::dispatch($lesson->id, 'de');
        $this->work();
        $this->assertSame(1, DB::table('jobs')->count(), 'back on the queue');
        $this->assertSame(0, DB::table('failed_jobs')->count());
        $this->assertGreaterThan(now()->addSeconds(100)->getTimestamp(), (int) DB::table('jobs')->value('available_at'));
        DB::table('jobs')->delete();

        $this->fake->failures = [new LlmHttpException(429, errorCode: LlmHttpException::QUOTA_EXHAUSTED)];
        $this->fake->calls = [];
        TranslateLessonCaptions::dispatch($lesson->id, 'fr');
        $this->work();
        $this->work();   // nothing left to run: the worker must not try it again
        $this->assertSame(0, DB::table('jobs')->count());
        $this->assertSame(1, DB::table('failed_jobs')->count());
        $this->assertCount(1, $this->fake->calls, 'one request to a provider with no credit, not four');
    }

    public function test_the_llm_client_tells_an_openai_rate_limit_from_an_empty_quota(): void
    {
        Http::fake(['*' => Http::sequence()
            ->push(['error' => ['message' => 'Rate limit reached', 'type' => 'requests', 'code' => 'rate_limit_exceeded']], 429)
            ->push(['error' => ['message' => 'You exceeded your current quota', 'type' => 'insufficient_quota', 'code' => 'insufficient_quota']], 429)]);
        config(['llm.roles.translate' => 'openai']);

        $errors = [];
        foreach ([1, 2] as $_) {
            try {
                app(\App\Services\Llm\LlmRouter::class)->for('translate')->json('s', 'u');
            } catch (LlmHttpException $e) {
                $errors[] = $e;
            }
        }

        $this->assertSame('rate_limit_exceeded', $errors[0]->errorCode);
        $this->assertTrue($errors[0]->retryable());
        $this->assertTrue($errors[1]->quotaExhausted());
        $this->assertFalse($errors[1]->retryable());
    }

    public function test_a_daily_quota_pauses_the_language_instead_of_retrying_all_night(): void
    {
        $lesson = $this->lesson(2);
        $key = TranslateLessonCaptions::statusKey($lesson->id, 'de');
        $this->fake->failures = [new LlmHttpException(429, retryAfter: 43041)];   // Gemini free tier: "retry in 11h57m"

        $job = (new TranslateLessonCaptions($lesson->id, 'de'))->withFakeQueueInteractions();
        $job->handle($this->captions());

        $job->assertFailedWith(LlmHttpException::class);
        $job->assertNotReleased();
        Sleep::assertNeverSlept();
        $this->assertSame('paused', Cache::get($key));

        // An open player keeps polling: no new job, and it is not shown as translating.
        $this->fake->calls = [];
        $url = route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'de']);
        $this->getJson($url)->assertOk()->assertJsonPath('pending', true)->assertJsonPath('translating', false);
        $this->assertSame([], $this->fake->calls);

        $this->travel(TranslateLessonCaptions::MAX_PAUSE_SECONDS + 1)->seconds();
        $this->assertNull(Cache::get($key), 'paused for six hours at most');
    }

    public function test_a_line_that_never_translates_is_not_asked_again_every_minute(): void
    {
        $lesson = $this->lesson(2);
        $key = TranslateLessonCaptions::statusKey($lesson->id, 'de');
        $translator = new class implements TextTranslator
        {
            public int $calls = 0;

            public function translate(array $lines, string $from, string $to): array
            {
                $this->calls++;

                return array_slice(array_map(fn ($l) => "[{$to}] {$l}", $lines), 1, null, true);   // drops the first line every time
            }
        };
        $this->app->instance(TextTranslator::class, $translator);
        $this->app->forgetInstance(CaptionTranslator::class);

        (new TranslateLessonCaptions($lesson->id, 'de'))->handle(app(CaptionTranslator::class));
        $this->assertSame('retry', Cache::get($key), 'first run translated two lines: try the third again soon');

        $this->travel(TranslateLessonCaptions::RETRY_AFTER_SECONDS + 1)->seconds();
        (new TranslateLessonCaptions($lesson->id, 'de'))->handle(app(CaptionTranslator::class));
        $this->assertSame('paused', Cache::get($key), 'nothing new: wait an hour, not a minute');

        $url = route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'de']);
        $this->getJson($url)->assertOk()->assertJsonPath('pending', true)->assertJsonPath('translating', false);
        $this->assertSame(2, $translator->calls);
    }
}
