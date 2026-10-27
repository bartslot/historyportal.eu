<?php

declare(strict_types=1);

namespace App\Services\Lessons;

/**
 * The one shape of a predict moment (scene kind=game, game_type=predict, config.predict), and the one
 * place it is cleaned. The composer, the outline generator and the editor all run what they have
 * through here: a spec file, an LLM and a browser are never trusted.
 *
 * The narrator asks a cause-and-effect question at a turning point ("What happens to the harvest if
 * they let in more water?"). The class answers in its own words: on paper (nothing stored), typed by
 * the teacher on the board for the class or a team, or typed by a pupil on their own device. The
 * story then shows what happened, and a debrief asks WHY. Only the why is graded, against the rubric:
 *
 *   key_cause       the cause a level-2 answer names
 *   concepts        words and ideas that count (salt, the soil goes bad)
 *   misconceptions  known wrong causes ("the gods were angry"); feedback names them kindly
 *   levels          what 0..3 mean for this moment; blank = the general ladder (LEVELS)
 *
 * The prediction itself is never graded: it only gets "you thought X, this happened" (`outcome`).
 * Unknown keys are dropped, numbers clamped, strings tag-stripped, trimmed and capped. The player
 * renders every string with textContent.
 */
final class PredictSpec
{
    /** How the board starts: the writing time only (paper), or the teacher's text box open (typed). */
    public const MODES = ['paper', 'typed'];

    /** The general ladder, when a moment writes none of its own (plan §2). */
    public const LEVELS = [
        0 => 'No cause: the answer gives no reason, or only repeats what happened.',
        1 => 'Names a factor that played a part, but not the cause.',
        2 => 'Names the cause.',
        3 => 'Names the cause and explains how it works (the mechanism).',
    ];

    /** Seconds of writing time on the board; 0 = no clock. */
    public const SECONDS_MAX = 600;

    public const SECONDS_DEFAULT = 60;

    /** A typed answer: 1-2 sentences. */
    public const ANSWER_MAX = 200;

    public const CONCEPTS_MAX = 8;

    public const MISCONCEPTIONS_MAX = 6;

    private const LINE_MAX = 300;

    private const CONCEPT_MAX = 80;

    private const MISCONCEPTION_MAX = 200;

    /**
     * @param  array<string,mixed>  $raw
     * @return array{question: string, outcome: string, debrief: string, mode: string, seconds: int,
     *               rubric: array{key_cause: string, concepts: list<string>, misconceptions: list<string>, levels: array<int,string>}}
     */
    public static function normalize(array $raw): array
    {
        $rubric = is_array($raw['rubric'] ?? null) ? $raw['rubric'] : [];

        return [
            'question' => self::text($raw['question'] ?? '', self::LINE_MAX),
            'outcome' => self::text($raw['outcome'] ?? '', self::LINE_MAX),
            'debrief' => self::text($raw['debrief'] ?? '', self::LINE_MAX),
            'mode' => in_array($raw['mode'] ?? null, self::MODES, true) ? $raw['mode'] : 'paper',
            'seconds' => is_numeric($raw['seconds'] ?? null)
                ? max(0, min(self::SECONDS_MAX, (int) $raw['seconds']))
                : self::SECONDS_DEFAULT,
            'rubric' => [
                'key_cause' => self::text($rubric['key_cause'] ?? '', self::LINE_MAX),
                'concepts' => self::rows($rubric['concepts'] ?? [], self::CONCEPTS_MAX, self::CONCEPT_MAX),
                'misconceptions' => self::rows($rubric['misconceptions'] ?? [], self::MISCONCEPTIONS_MAX, self::MISCONCEPTION_MAX),
                'levels' => self::levels($rubric['levels'] ?? []),
            ],
        ];
    }

    /** What the player gets: everything but the rubric, which is the grader's business. */
    public static function forPlayer(array $predict): array
    {
        $clean = self::normalize($predict);
        unset($clean['rubric']);

        return $clean;
    }

    /** A level's description for this moment: its own, else the general ladder's. */
    public static function levelText(array $predict, int $level): string
    {
        $own = (string) (($predict['rubric']['levels'] ?? [])[$level] ?? '');

        return $own !== '' ? $own : self::LEVELS[$level];
    }

    /** A rubric with something to grade against: a key cause. Without one every answer is flagged. */
    public static function canGrade(array $predict): bool
    {
        return trim((string) ($predict['rubric']['key_cause'] ?? '')) !== '';
    }

    /**
     * The outline's scene briefs with a predict moment woven in after every brief that asks for one
     * (brief.predict). Briefs are matched to scenes by POSITION downstream (ShotListPrompt::briefFor,
     * GenerateLessonScript), so the moment gets a brief of its own rather than being added later.
     * At most $max moments; an unusable one (no question) is dropped.
     *
     * @param  list<array<string,mixed>>  $briefs
     * @return list<array<string,mixed>>
     */
    public static function weaveIntoBriefs(array $briefs, int $max = 4): array
    {
        $out = [];
        $woven = 0;
        foreach ($briefs as $brief) {
            $raw = is_array($brief['predict'] ?? null) ? $brief['predict'] : null;
            unset($brief['predict']);
            $out[] = $brief;
            if ($raw === null || $woven >= $max || ($brief['kind'] ?? 'narration') !== 'narration') {
                continue;
            }
            $predict = self::normalize($raw);
            if ($predict['question'] === '') {
                continue;
            }
            $woven++;
            $out[] = [
                'kind' => 'game',
                'game_type' => 'predict',
                'predict' => $predict,
                'phase' => $brief['phase'] ?? 'development',
                'scenePurpose' => 'The class predicts what happens next, before the story shows it.',
                'objective_ids' => $brief['objective_ids'] ?? [],
                'characters' => $brief['characters'] ?? [],
                'year' => $brief['year'] ?? null,
                'location' => $brief['location'] ?? null,
                'beat' => 'The narrator stops and asks the class: '.$predict['question'],
                'game_segment_index' => null,
            ];
        }

        return $out;
    }

    /** @return list<string> */
    private static function rows(mixed $rows, int $max, int $len): array
    {
        if (! is_array($rows)) {
            return [];
        }
        $out = [];
        foreach (array_values($rows) as $row) {
            if (! is_scalar($row)) {
                continue;
            }
            // An emptied row is kept: the editor needs a blank row to type into.
            $out[] = self::text($row, $len);
            if (count($out) >= $max) {
                break;
            }
        }

        return $out;
    }

    /** @return array<int,string> */
    private static function levels(mixed $raw): array
    {
        $raw = is_array($raw) ? $raw : [];
        $out = [];
        foreach (array_keys(self::LEVELS) as $level) {
            $out[$level] = self::text($raw[$level] ?? ($raw[(string) $level] ?? ''), self::LINE_MAX);
        }

        return $out;
    }

    private static function text(mixed $value, int $max): string
    {
        if (! is_scalar($value)) {
            return '';
        }

        return mb_substr(trim(strip_tags((string) $value)), 0, $max);
    }
}
