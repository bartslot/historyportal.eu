<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Lesson;

/**
 * Zero-tolerance visual policy for sensitive historical subjects (Phase 0 experiment design,
 * 2026-08-24). For topics like the Holocaust, slavery or genocide the pipeline must NOT
 * generate synthetic human reenactments for children. Instead those lessons take the
 * documentary path: real historical artwork/photographs/documents first (SceneImageSourcer),
 * and — only when nothing real is found — a restrained ENVIRONMENT image under the legacy
 * negative prompt that already excludes people and faces.
 *
 * This is deliberately a gate with a FALLBACK, not a hard failure: a sensitive lesson still
 * builds, it just never routes through the people-allowed narrative shot pipeline.
 *
 * Detection is two-layered:
 *  1. Explicit teacher/admin override — `visual_policy` key inside lesson.game_config
 *     ('documentary' forces the gate on, 'standard' forces it off).
 *  2. Keyword screen over topic/title/subject/details/outline against
 *     config('lessons.sensitive_topics'). Deliberately broad: a false positive costs one
 *     lesson its synthetic reenactments; a false negative puts a generated atrocity scene
 *     in front of a classroom.
 */
final class SensitiveTopicPolicy
{
    public const STANDARD = 'standard';

    public const DOCUMENTARY = 'documentary';

    /** Visual roles the documentary path may use (recorded in the generation run + rubric). */
    public const DOCUMENTARY_ALLOWED_ROLES = [
        'historical_artwork',
        'photograph',
        'document',
        'artifact',
        'map',
        'location',
        'restrained_environment',
    ];

    public static function policyFor(Lesson $lesson): string
    {
        $override = (string) (($lesson->game_config ?? [])['visual_policy'] ?? '');
        if (in_array($override, [self::STANDARD, self::DOCUMENTARY], true)) {
            return $override;
        }

        return self::matchesKeywords($lesson) ? self::DOCUMENTARY : self::STANDARD;
    }

    public static function isDocumentary(Lesson $lesson): bool
    {
        return self::policyFor($lesson) === self::DOCUMENTARY;
    }

    private static function matchesKeywords(Lesson $lesson): bool
    {
        $haystackParts = [
            (string) $lesson->topic,
            (string) $lesson->title,
            (string) $lesson->subject,
            (string) $lesson->details,
            (string) ($lesson->outline['story_question'] ?? ''),
        ];
        foreach ((array) ($lesson->outline['learning_objectives'] ?? []) as $objective) {
            $haystackParts[] = (string) (is_array($objective) ? ($objective['text'] ?? '') : $objective);
        }

        $haystack = mb_strtolower(implode(' ', $haystackParts));
        if (trim($haystack) === '') {
            return false;
        }

        foreach ((array) config('lessons.sensitive_topics', []) as $keyword) {
            $keyword = mb_strtolower(trim((string) $keyword));
            if ($keyword !== '' && str_contains($haystack, $keyword)) {
                return true;
            }
        }

        return false;
    }
}
