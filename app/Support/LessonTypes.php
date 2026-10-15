<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;
use App\Models\Scene;

/**
 * What kind of lesson this is, for the badges on the title screen (Figma 2321:1423/1427/1431).
 * The ONE place the rules live; each badge shows only when it is true of the lesson's scenes.
 *
 *   interactive  the class does something: a quiz or team game, a story game, a power-meter
 *                moment or race, or an older lesson's closing quiz. A voyage, gallery, story or
 *                video is watched, not played: those play themselves out, so they never count.
 *                (Bart 2026-10-14, on the Tasman lesson: "interactief, but it's just a slideshow".)
 *   comic        it is told in comic panels: a scene with a speech balloon (a non-narrator line)
 *   teams        the class plays in teams: a team game, or a moment with teams or a race
 */
final class LessonTypes
{
    public const INTERACTIVE = 'interactive';

    public const COMIC = 'comic';

    public const TEAMS = 'teams';

    /** The badges in the order the title screen draws them. */
    public const ALL = [self::INTERACTIVE, self::COMIC, self::TEAMS];

    /** @return list<string> */
    public static function of(Lesson $lesson): array
    {
        $scenes = $lesson->relationLoaded('scenes') ? $lesson->scenes : $lesson->scenes()->get(['id', 'kind', 'game_type', 'config']);

        $found = [
            // An older lesson's quiz is no scene: it plays at the end from the lesson's own questions.
            self::INTERACTIVE => $scenes->contains(fn (Scene $s): bool => self::isInteractive($s))
                || $lesson->game_type === 'story_game'
                || ($lesson->include_game && $lesson->game_type === 'quiz' && $lesson->quizQuestions->whereNull('scene_id')->isNotEmpty()),
            self::COMIC => $scenes->contains(fn (Scene $s): bool => self::isComic($s)),
            self::TEAMS => $scenes->contains(fn (Scene $s): bool => self::isTeams($s)),
        ];

        return array_values(array_filter(self::ALL, fn (string $type): bool => $found[$type]));
    }

    private static function isInteractive(Scene $s): bool
    {
        return $s->kind === 'game' || self::moment($s) !== null;
    }

    private static function isComic(Scene $s): bool
    {
        foreach ((array) ($s->config['lines'] ?? []) as $line) {
            if (is_array($line) && ($line['speaker'] ?? 'narrator') !== 'narrator') {
                return true;
            }
        }

        return false;
    }

    private static function isTeams(Scene $s): bool
    {
        if ($s->kind === 'game' && $s->game_type === 'team') {
            return true;
        }
        $moment = self::moment($s);

        return $moment !== null && ((int) ($moment['teams'] ?? 0) >= 2 || (bool) ($moment['race']['enabled'] ?? false));
    }

    /** @return array<string, mixed>|null the scene's power-meter moment, when it has one switched on */
    private static function moment(Scene $s): ?array
    {
        $moment = $s->config['moment'] ?? null;

        return is_array($moment) && ($moment['enabled'] ?? true) ? $moment : null;
    }
}
