<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Lesson;
use App\Services\Captions\CaptionTranslator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;

/**
 * Translate a lesson's missing subtitle lines into one language. LessonCaptionsController queues
 * it once per lesson + language (statusKey): a class of thirty phones asking at once makes one
 * batch, not thirty. A rate limit is retried inside the run (CaptionTranslator::translateMissing)
 * and whatever was translated is saved; see handle() for how the key is released.
 */
class TranslateLessonCaptions implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 1;

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
        } finally {
            // Done: release the key. Lines still missing: hold it a minute ("retry", which the
            // player still shows as translating and keeps polling), so the next request after
            // that tries again, without every poll of a whole class hitting the provider.
            $key = self::statusKey($this->lessonId, $this->language);
            if ($lesson && $captions->cached($lesson, $this->language)['missing'] > 0) {
                Cache::put($key, 'retry', now()->addSeconds(self::RETRY_AFTER_SECONDS));
            } else {
                Cache::forget($key);
            }
        }
    }
}
