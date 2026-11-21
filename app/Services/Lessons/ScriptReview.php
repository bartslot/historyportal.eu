<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Enums\LessonStatus;
use App\Jobs\GenerateLessonAssets;
use App\Jobs\ReviseLessonScript;
use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Support\Collection;

/**
 * The teacher reads the script before pictures and narration are made, and approves it or asks the
 * assistant for changes (Bart, 2026-11-21). Text only for now: images and scenes need no approval.
 *
 * State lives in lessons.script_review: {state, messages}. States:
 *   writing   the pipeline is still on its way to a script
 *   ready     the script waits for the teacher (lesson status ScriptReview)
 *   revising  ReviseLessonScript is rewriting it on the teacher's request
 *   approved  the teacher said yes; GenerateLessonAssets makes the pictures and narration
 * A lesson whose script_review is null runs straight through, as every lesson did before.
 */
final class ScriptReview
{
    public const MAX_MESSAGES = 40;

    public static function wanted(Lesson $lesson): bool
    {
        $review = $lesson->script_review;

        return is_array($review) && ($review['state'] ?? null) !== 'approved';
    }

    /**
     * The script is written: park the lesson until the teacher has read it.
     *
     * @param  Collection<int, Scene>  $scenes
     */
    public static function hold(Lesson $lesson, Collection $scenes): void
    {
        $scenes->each(fn (Scene $scene) => $scene->update(['status' => 'pending', 'error_message' => null]));

        $lesson->update([
            'status' => LessonStatus::ScriptReview,
            'script_review' => [...(array) $lesson->script_review, 'state' => 'ready'],
        ]);
    }

    public static function isRevising(Lesson $lesson): bool
    {
        return ($lesson->script_review['state'] ?? null) === 'revising';
    }

    /** The teacher asks for a change. The rewrite runs on the queue; the page polls until it lands. */
    public static function requestChanges(Lesson $lesson, string $request): void
    {
        if ($lesson->status !== LessonStatus::ScriptReview || self::isRevising($lesson)) {
            return;
        }

        $lesson->update(['script_review' => self::withMessage($lesson, 'teacher', $request, ['state' => 'revising'])]);

        ReviseLessonScript::dispatch($lesson->id, $request);
    }

    /** The teacher edited one scene's text by hand. */
    public static function saveScene(Lesson $lesson, int $sceneId, string $text): void
    {
        if ($lesson->status !== LessonStatus::ScriptReview || self::isRevising($lesson)) {
            return;
        }

        $text = trim($text);
        if ($text === '') {
            return;
        }

        Scene::where('lesson_id', $lesson->id)->whereKey($sceneId)->update(['script_segment' => $text]);
    }

    /** The teacher approves the text: pictures and narration start now. */
    public static function approve(Lesson $lesson): void
    {
        if ($lesson->status !== LessonStatus::ScriptReview || self::isRevising($lesson)) {
            return;
        }

        $lesson->update([
            'status' => LessonStatus::ScenesGenerating,
            'script_review' => [...(array) $lesson->script_review, 'state' => 'approved'],
        ]);

        GenerateLessonAssets::dispatch($lesson->id);
    }

    /**
     * The review with one more chat line, oldest lines dropped past MAX_MESSAGES.
     *
     * @param  array<string, mixed>  $set  other keys to set at the same time
     * @return array<string, mixed>
     */
    public static function withMessage(Lesson $lesson, string $role, string $text, array $set = []): array
    {
        $review = (array) $lesson->script_review;
        $messages = (array) ($review['messages'] ?? []);
        $messages[] = ['role' => $role, 'text' => $text, 'at' => now()->toIso8601String()];

        return [...$review, ...$set, 'messages' => array_slice($messages, -self::MAX_MESSAGES)];
    }
}
