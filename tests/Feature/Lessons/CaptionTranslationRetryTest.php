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
        $lesson = $this->lesson(44);   // 45 lines: 40 per request
        $this->fake->failures = [new LlmHttpException(429)];

        $this->assertSame(45, $this->captions()->translateMissing($lesson, 'es'));

        $this->assertSame([40, 20, 20, 5], array_map('count', $this->fake->calls));
    }

    public function test_a_batch_that_keeps_failing_keeps_the_batches_before_it_and_is_never_resent(): void
    {
        $lesson = $this->lesson(44);
        $this->fake->failures = [null, ...array_fill(0, 4, new LlmHttpException(503))];

        try {
            $this->captions()->translateMissing($lesson, 'ja');
            $this->fail('the last refusal reaches the caller');
        } catch (LlmHttpException $e) {
            $this->assertSame(503, $e->status);
        }
        $this->assertSame(40, CaptionTranslation::where('language', 'ja')->count());

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
}
