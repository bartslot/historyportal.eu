<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use InvalidArgumentException;

/**
 * The one shape of a team game (scene kind=game, game_type=team, config.team), and the one place
 * it is cleaned. The composer runs a spec entry through here, the editor runs the teacher's draft
 * through here: both arrive from outside (a spec file, an LLM, a browser) and are never trusted.
 *
 * A team game plays on the CLASS SCREEN. Teams of 3-4 decide aloud or on paper and the teacher
 * taps each team's choice in; nothing is scored and nothing is stored per child. Three modes, one
 * engine (resources/js/scene/TeamGame.js):
 *
 *   budget   items with a cost, a hold capacity, fixed items always on board; then a reveal and a
 *            comparison of what the teams loaded
 *   choose   a situation, dossier cards (each with a "but" counter-line), 2-4 options, a timer,
 *            one vote per team; the tally shows once every team is in, then the real decision
 *   discuss  one question, a few prompts, up to two evidence images, a timer, a closing line
 *
 * EVERY field is kept whatever the mode, so a teacher who switches budget -> choose -> budget gets
 * their items back. Unknown keys are dropped; numbers are clamped; strings are tag-stripped, trimmed
 * and capped. The player renders every string with textContent.
 */
final class TeamGameSpec
{
    public const MODES = ['budget', 'choose', 'discuss'];

    public const TEAMS_MIN = 2;

    public const TEAMS_MAX = 8;

    public const MINUTES_MAX = 30;

    public const COST_MAX = 99;

    public const CAPACITY_MAX = 999;

    private const NAME_MAX = 80;

    private const LINE_MAX = 300;

    private const TEXT_MAX = 1200;

    private const ROLE_MAX = 40;

    private const IMAGE_MAX = 2048;

    /** List caps: [field => max rows]. */
    private const ROWS = [
        'roles' => 6, 'fixed' => 8, 'items' => 24, 'cards' => 6, 'options' => 4, 'prompts' => 4, 'evidence' => 2,
    ];

    /**
     * Clean a raw team game. Throws only on an unknown mode: that is an authoring mistake, and a
     * guessed mode would play a different game than the one written.
     *
     * @param  array<string,mixed>  $raw
     * @return array<string,mixed>
     */
    public static function normalize(array $raw): array
    {
        $mode = (string) ($raw['mode'] ?? 'budget');
        if (! in_array($mode, self::MODES, true)) {
            throw new InvalidArgumentException("Team game mode '{$mode}' is not one of: ".implode(', ', self::MODES).'.');
        }

        $options = self::rows($raw['options'] ?? [], 'options', fn (array $o): array => [
            'label' => self::text($o['label'] ?? '', self::NAME_MAX),
            'text' => self::text($o['text'] ?? '', self::LINE_MAX),
            'image' => self::image($o['image'] ?? ''),
        ]);

        return [
            'mode' => $mode,
            'title' => self::text($raw['title'] ?? '', self::NAME_MAX),
            'intro' => self::text($raw['intro'] ?? '', self::TEXT_MAX),
            'rules' => self::text($raw['rules'] ?? '', self::TEXT_MAX),
            'roles' => self::rows($raw['roles'] ?? [], 'roles', fn ($r): string => self::text($r, self::ROLE_MAX)),
            'teams' => self::int($raw['teams'] ?? 4, self::TEAMS_MIN, self::TEAMS_MAX, 4),
            'minutes' => self::int($raw['minutes'] ?? 0, 0, self::MINUTES_MAX, 0),

            'capacity' => self::int($raw['capacity'] ?? 10, 1, self::CAPACITY_MAX, 10),
            'fixed' => self::rows($raw['fixed'] ?? [], 'fixed', self::item(...)),
            'items' => self::rows($raw['items'] ?? [], 'items', self::item(...)),

            'situation' => self::text($raw['situation'] ?? '', self::TEXT_MAX),
            'cards' => self::rows($raw['cards'] ?? [], 'cards', fn (array $c): array => [
                'title' => self::text($c['title'] ?? '', self::NAME_MAX),
                'text' => self::text($c['text'] ?? '', self::TEXT_MAX),
                'but' => self::text($c['but'] ?? '', self::LINE_MAX),
            ]),
            'options' => $options,
            'map' => self::image($raw['map'] ?? ''),
            'question' => self::text($raw['question'] ?? '', self::LINE_MAX),
            'answer' => self::answer($raw['answer'] ?? null, count($options)),

            'prompts' => self::rows($raw['prompts'] ?? [], 'prompts', fn ($p): string => self::text($p, self::LINE_MAX)),
            'evidence' => self::rows($raw['evidence'] ?? [], 'evidence', fn (array $e): array => [
                'image' => self::image($e['image'] ?? ''),
                'caption' => self::text($e['caption'] ?? '', self::LINE_MAX),
            ]),

            'reveal' => self::text($raw['reveal'] ?? '', self::TEXT_MAX),
            'needs' => self::text($raw['needs'] ?? '', self::TEXT_MAX),
            'source' => self::text($raw['source'] ?? '', self::LINE_MAX),
            'followup' => self::text($raw['followup'] ?? '', self::LINE_MAX),
            'closing' => self::text($raw['closing'] ?? '', self::TEXT_MAX),
        ];
    }

    /** A blank row for the editor's "Add" buttons, in the shape normalize() keeps. */
    public static function blankRow(string $field): array|string|null
    {
        return match ($field) {
            'fixed', 'items' => ['name' => '', 'why' => '', 'cost' => 1],
            'cards' => ['title' => '', 'text' => '', 'but' => ''],
            'options' => ['label' => '', 'text' => '', 'image' => ''],
            'evidence' => ['image' => '', 'caption' => ''],
            'roles', 'prompts' => '',
            default => null,
        };
    }

    public static function maxRows(string $field): int
    {
        return self::ROWS[$field] ?? 0;
    }

    /** @return array{name:string, why:string, cost:int} */
    private static function item(array $i): array
    {
        return [
            'name' => self::text($i['name'] ?? '', self::NAME_MAX),
            'why' => self::text($i['why'] ?? '', self::LINE_MAX),
            'cost' => self::int($i['cost'] ?? 0, 0, self::COST_MAX, 0),
        ];
    }

    /**
     * Keep at most ROWS[$field] rows; a row of the wrong type is skipped, an emptied row kept (the
     * editor needs a blank row to type into).
     *
     * @return list<mixed>
     */
    private static function rows(mixed $rows, string $field, callable $clean): array
    {
        if (! is_array($rows)) {
            return [];
        }
        $isTextList = in_array($field, ['roles', 'prompts'], true);
        $out = [];
        foreach (array_values($rows) as $row) {
            if ($isTextList ? ! is_scalar($row) : ! is_array($row)) {
                continue;
            }
            $out[] = $clean($row);
            if (count($out) >= self::ROWS[$field]) {
                break;
            }
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

    private static function int(mixed $value, int $min, int $max, int $fallback): int
    {
        return is_numeric($value) ? max($min, min($max, (int) $value)) : $fallback;
    }

    /**
     * An image is an http(s) URL or a path on this site ("/storage/..."); anything else (a
     * javascript: URL, a protocol-relative "//host") is dropped.
     */
    private static function image(mixed $value): string
    {
        $url = is_string($value) ? trim($value) : '';
        if ($url === '' || mb_strlen($url) > self::IMAGE_MAX) {
            return '';
        }
        $isSitePath = str_starts_with($url, '/') && ! str_starts_with($url, '//');
        $isHttp = (bool) preg_match('~^https?://[^\s]+$~i', $url);

        return $isSitePath || $isHttp ? $url : '';
    }

    /** The real option, as a 0-based index; a spec may also write the letter ("B"). */
    private static function answer(mixed $value, int $optionCount): ?int
    {
        if (is_string($value) && preg_match('/^[A-Da-d]$/', $value)) {
            $value = ord(strtoupper($value)) - ord('A');
        }
        if (! is_numeric($value)) {
            return null;
        }
        $index = (int) $value;

        return $index >= 0 && $index < $optionCount ? $index : null;
    }
}
