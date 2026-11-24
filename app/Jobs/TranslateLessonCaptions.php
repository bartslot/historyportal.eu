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

/**
 * Translate a lesson's missing subtitle lines into one language. LessonCaptionsController queues
 * it once per lesson + language (statusKey): a class of thirty phones asking at once makes one
 * batch, not thirty. A rate limit is retried inside the run (CaptionTranslator::translateMissing)
 * and whatever was translated is saved; see handle() for how the key is released.
 *
 * When the provider is still busy after that (a 429 or 503 that outlasts the in-run wait), the
 * job goes back on the queue a few minutes later instead of landing in failed_jobs: prod logged
 * four such failures on 2026-11-24. Only a refusal that waiting cannot fix (an empty quota, a
 * 4xx) or the last try fails the job, so ops:check shows something worth a look.
 */
class TranslateLessonCaptions implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    /** One run plus up to RELEASE_DELAYS.length re-queues on a busy provider. */
    public int $tries = 4;

    /** Seconds before each re-queue after a retryable refusal: 2, 5 and 15 minutes. */
    public const RELEASE_DELAYS = [120, 300, 900];

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
        try {
            if ($lesson) {
                $captions->translateMissing($lesson, $this->language);
            }
        } catch (LlmHttpException $e) {
            $delay = self::RELEASE_DELAYS[$this->attempts() - 1] ?? null;
            if ($e->retryable() && $delay !== null && $this->attempts() < $this->tries && $this->onRealQueue()) {
                // Keep the language marked as translating while it waits, so a class's polls do
                // not queue a second copy; the key outlives the delay in case no worker is free.
                Cache::put(self::statusKey($this->lessonId, $this->language), 'running', now()->addSeconds($delay + 600));
                Log::notice('[TranslateLessonCaptions] provider still refusing, re-queued', [
                    'lesson' => $this->lessonId, 'to' => $this->language, 'status' => $e->status, 'in_seconds' => $delay, 'attempt' => $this->attempts(),
                ]);
                $this->release($delay);

                return;
            }
            $this->releaseKey($captions, $lesson);
            throw $e;
        }
        $this->releaseKey($captions, $lesson);
    }

    /**
     * Done: release the key. Lines still missing: hold it a minute ("retry", which the player
     * still shows as translating and keeps polling), so the next request after that tries again,
     * without every poll of a whole class hitting the provider.
     */
    private function releaseKey(CaptionTranslator $captions, ?Lesson $lesson): void
    {
        $key = self::statusKey($this->lessonId, $this->language);
        if ($lesson && $captions->cached($lesson, $this->language)['missing'] > 0) {
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
