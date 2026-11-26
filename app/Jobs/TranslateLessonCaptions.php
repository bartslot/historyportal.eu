<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Lesson;
use App\Services\Captions\CaptionTranslator;
use App\Services\Llm\LlmHttpException;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Jobs\SyncJob;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Translate a lesson's missing subtitle lines into one language. LessonCaptionsController queues
 * it once per lesson + language (statusKey): a class of thirty phones asking at once makes one
 * batch, not thirty. A rate limit is retried inside the run (CaptionTranslator::translateMissing)
 * and whatever was translated is saved; see handle() for how the key is released.
 *
 * When the provider is still busy after that (a 429 or 503 that outlasts the in-run wait), the
 * job goes back on the queue a few minutes later instead of landing in failed_jobs: prod logged
 * four such failures on 2026-11-24. Anything else (an empty quota, a 4xx, a connection error) or
 * the last try fails the job at once, so ops:check shows something worth a look.
 */
class TranslateLessonCaptions implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    /** One run plus up to RELEASE_DELAYS.length re-queues on a busy provider. */
    public int $tries = 4;

    /** Seconds before each re-queue after a retryable refusal: 2, 5 and 15 minutes. */
    public const RELEASE_DELAYS = [120, 300, 900];

    /**
     * When the provider asks for a longer wait than the last re-queue (Gemini's free daily quota:
     * "retry in 11h57m", prod 2026-11-24), the language is paused this long at most, so an open
     * player stops queuing a job every two minutes that can only be refused again.
     */
    public const MAX_PAUSE_SECONDS = 6 * 3600;

    /** After a run that ended cleanly but translated nothing new, the next try waits this long. */
    public const STALL_PAUSE_SECONDS = 3600;

    public function __construct(public int $lessonId, public string $language) {}

    public static function statusKey(int $lessonId, string $language): string
    {
        return "captions:{$lessonId}:{$language}";
    }

    /** After a run that left lines missing (rate limit, a mangled name), the next try may start this soon. */
    public const RETRY_AFTER_SECONDS = 60;

    public function handle(CaptionTranslator $captions): void
    {
        $lesson = Lesson::find($this->lessonId);
        $saved = 0;
        try {
            if ($lesson) {
                $saved = $captions->translateMissing($lesson, $this->language);
            }
        } catch (Throwable $e) {
            $delay = self::RELEASE_DELAYS[$this->attempts() - 1] ?? null;
            $longWait = $e instanceof LlmHttpException && $e->retryAfter !== null && $e->retryAfter > max(self::RELEASE_DELAYS);
            if ($e instanceof LlmHttpException && $e->retryable() && ! $longWait && $delay !== null && $this->attempts() < $this->tries && $this->onRealQueue()) {
                // Keep the language marked as translating while it waits, so a class's polls do
                // not queue a second copy; the key outlives the delay in case no worker is free.
                Cache::put(self::statusKey($this->lessonId, $this->language), 'running', now()->addSeconds($delay + 600));
                Log::notice('[TranslateLessonCaptions] provider still refusing, re-queued', [
                    'lesson' => $this->lessonId, 'to' => $this->language, 'status' => $e->status, 'in_seconds' => $delay, 'attempt' => $this->attempts(),
                ]);
                $this->release($delay);

                return;
            }

            // Anything else ends this job for good: an empty quota, a 4xx, a connection error,
            // garbled output, or the last re-queue spent. Fail it explicitly, since with tries
            // left the worker would otherwise run it again at once, sending the same request to
            // a provider that just refused it.
            $this->releaseKey($captions, $lesson, progressed: true);
            if ($longWait) {
                // 'paused' blocks a new dispatch (the controller's Cache::add) but is not shown
                // as translating: the player keeps the original lines until the quota is back.
                Cache::put(self::statusKey($this->lessonId, $this->language), 'paused', now()->addSeconds(min($e->retryAfter, self::MAX_PAUSE_SECONDS)));
            }
            if (! $this->onRealQueue()) {
                throw $e;
            }
            report($e);
            $this->fail($e);

            return;
        }
        $this->releaseKey($captions, $lesson, progressed: $saved > 0);
    }

    /**
     * Done: release the key. Lines still missing: hold it a minute ("retry", which the player
     * still shows as translating and keeps polling), so the next request after that tries again,
     * without every poll of a whole class hitting the provider.
     *
     * A run that finished without an error yet saved nothing (a line whose protected name or
     * script never survives translation) would otherwise be asked again every minute for as long
     * as a player stays open: 'paused' for STALL_PAUSE_SECONDS instead.
     */
    private function releaseKey(CaptionTranslator $captions, ?Lesson $lesson, bool $progressed): void
    {
        $key = self::statusKey($this->lessonId, $this->language);
        if ($lesson && $captions->cached($lesson, $this->language)['missing'] > 0) {
            if (! $progressed) {
                Cache::put($key, 'paused', now()->addSeconds(self::STALL_PAUSE_SECONDS));

                return;
            }
            Cache::put($key, 'retry', now()->addSeconds(self::RETRY_AFTER_SECONDS));
        } else {
            Cache::forget($key);
        }
    }

    /** A sync queue (tests, a local .env) cannot put a job back; there the run simply ends. */
    private function onRealQueue(): bool
    {
        return $this->job !== null && ! $this->job instanceof SyncJob;
    }
}
