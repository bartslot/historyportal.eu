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
 * batch, not thirty. The status reads "done" afterwards, so the player stops waiting even if a
 * line failed, and a later request may try that line again once the status expires.
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

    public function handle(CaptionTranslator $captions): void
    {
        try {
            $lesson = Lesson::find($this->lessonId);
            if ($lesson) {
                $captions->translateMissing($lesson, $this->language);
            }
        } finally {
            Cache::put(self::statusKey($this->lessonId, $this->language), 'done', now()->addMinutes(30));
        }
    }
}
