<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * The lesson's content version: one number up per request (or queued job, or command run) that
 * changes the lesson, a scene, its layers and lines (scene config) or its quiz, however many rows
 * that request writes. Shown small under the join QR (player.blade.php), from the payload the
 * device loaded, so a stale tablet shows a lower number than the editor (Bart, 2026-10-17).
 *
 * Bound scoped (AppServiceProvider): Laravel forgets it between requests and between queue jobs.
 */
final class LessonVersion
{
    /** Lesson columns that are bookkeeping, not content: changing them is not a new version. */
    public const LESSON_IGNORED = [
        'updated_at', 'content_version', 'content_version_at', 'status', 'wizard_step', 'scheduled_publish_at',
        'narration_edit_characters', 'generation_attempts', 'error_message',
    ];

    /** Scene columns that are bookkeeping: a job saying "generating" or "failed" changes nothing yet. */
    public const SCENE_IGNORED = ['updated_at', 'status', 'error_message'];

    /** @var array<int, true> */
    private array $bumped = [];

    /** A change to lesson $lessonId's content in this request: the version goes up, once. */
    public static function changed(?int $lessonId): void
    {
        if ($lessonId) {
            app(self::class)->bump($lessonId);
        }
    }

    /** Whether a save changed more than bookkeeping. */
    public static function contentChanged(array $changes, array $ignored): bool
    {
        return array_diff_key($changes, array_flip($ignored)) !== [];
    }

    public function bump(int $lessonId): void
    {
        if (isset($this->bumped[$lessonId])) {
            return;
        }
        $this->bumped[$lessonId] = true;
        // Straight to the table: no model events, no updated_at, no second bump.
        DB::table((new Lesson)->getTable())->where('id', $lessonId)->update([
            'content_version' => DB::raw('content_version + 1'),
            'content_version_at' => now(),
        ]);
        // The player's payload is cached (LessonPlayerController): the new number must reach it.
        $code = DB::table((new Lesson)->getTable())->where('id', $lessonId)->value('lesson_code');
        if ($code) {
            Cache::forget('lesson.player.'.strtoupper((string) $code));
        }
    }
}
