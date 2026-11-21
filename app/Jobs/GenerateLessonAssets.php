<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Services\Lessons\LessonAssetFanOut;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Throwable;

/** The teacher approved the script (ScriptReview::approve): make the pictures, narration and quiz. */
class GenerateLessonAssets implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    /** Only dispatches; a story pack's scene mapping is one short model call. */
    public int $timeout = 300;

    public function __construct(public readonly int $lessonId) {}

    public function handle(LessonAssetFanOut $fanOut): void
    {
        $lesson = Lesson::with(['scenes', 'story'])->findOrFail($this->lessonId);
        \App\Services\Support\GenerationRunRecorder::activate($lesson->id);

        try {
            $fanOut->run($lesson);
        } catch (Throwable $e) {
            $lesson->update(['status' => LessonStatus::Failed, 'error_message' => $e->getMessage()]);
            throw $e;
        }
    }
}
