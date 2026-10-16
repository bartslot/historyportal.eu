<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * Balloons a teacher adds in the editor: entries in the scene's config.lines, the same list
 * SceneDialogue writes and BalloonLayer.js draws. A balloon is silent text, never spoken (only the
 * narrator speaks) and carries no name.
 *
 * The editor addresses a line as `bal_<index in config.lines>`. What it adds beside the
 * SceneDialogue shape (speaker, text, start, end, figure):
 *   kind   'speech' | 'thought' (a cloud with a trail of circles)
 *   at     [x, y] 0..1 of the stage (a split scene: of its panel), the balloon's middle
 *   tail   {tip: [x, y] 0..1, bend} where the tail points, dragged out on the stage
 *   panel  0|1 on a split scene, the panel it sits in
 * end null = up to the scene's end.
 */
final class SpeechBalloons
{
    /** The speaker of a balloon added in the editor: not the narrator, not a cast member. */
    public const SPEAKER = 'balloon';

    public const KINDS = ['speech', 'thought'];

    /** What a new balloon says until the teacher types: no words to translate, plainly a stand-in. */
    public const PLACEHOLDER = '…';

    public const MAX_TEXT = 300;

    /** A tail bends at most this share of its length (balloon-shape.js MAX_BEND). */
    public const MAX_BEND = 0.35;

    /** A tip may sit a little past the panel edge: the renderer runs it to the edge. */
    private const TIP_MIN = -0.5;

    private const TIP_MAX = 1.5;

    /** Where a new balloon's middle goes: centred, high, clear of the faces below. */
    private const NEW_AT = [0.5, 0.22];

    /** A speaker's mouth on its picture when the figure has no mouth metadata: the head's middle. */
    public const DEFAULT_MOUTH = [0.5, 0.18];

    /** @return array<string, mixed> */
    public static function make(string $kind, ?int $panel): array
    {
        return [
            'speaker' => self::SPEAKER,
            'text' => self::PLACEHOLDER,
            'kind' => in_array($kind, self::KINDS, true) ? $kind : 'speech',
            'start' => 0,
            'end' => null,
            'figure' => null,
            'at' => self::NEW_AT,
            ...($panel === null ? [] : ['panel' => $panel]),
        ];
    }

    /**
     * The index a `bal_<n>` id names, when that line exists and is a balloon (a narrator line is a
     * caption, never edited as one).
     *
     * @param  list<mixed>  $lines
     */
    public static function index(string $id, array $lines): ?int
    {
        if (! preg_match('/^bal_(\d{1,4})$/', $id, $m)) {
            return null;
        }
        $i = (int) $m[1];
        $line = $lines[$i] ?? null;

        return is_array($line) && ($line['speaker'] ?? 'narrator') !== 'narrator' ? $i : null;
    }

    /**
     * A line with the editor's changes, each validated. Unknown keys and bad values are dropped;
     * empty text keeps the old words (an emptied balloon is deleted, not blanked).
     *
     * @param  array<string, mixed>  $line
     * @param  array<string, mixed>  $patch
     * @return array<string, mixed>
     */
    public static function patch(array $line, array $patch): array
    {
        if (array_key_exists('text', $patch)) {
            $text = trim(preg_replace('/\s+/u', ' ', (string) $patch['text']) ?? '');
            if ($text !== '') {
                $line['text'] = mb_substr($text, 0, self::MAX_TEXT);
            }
        }
        if (array_key_exists('kind', $patch) && in_array($patch['kind'], self::KINDS, true)) {
            $line['kind'] = $patch['kind'];
        }
        if (array_key_exists('at', $patch)) {
            $at = self::point($patch['at'], 0.0, 1.0);
            if ($at !== null) {
                $line['at'] = $at;
            }
        }
        if (array_key_exists('tail', $patch)) {
            $line = self::withTail($line, $patch['tail']);
        }

        return $line;
    }

    /**
     * The balloon pointed at a figure (or at nobody): its tail then follows that figure's mouth,
     * so a tail the teacher dragged earlier goes.
     *
     * @param  array<string, mixed>  $line
     * @param  array<string, mixed>|null  $layer  the figure's layer on the balloon's panel
     * @return array<string, mixed>
     */
    public static function withSpeaker(array $line, ?array $layer): array
    {
        unset($line['tail']);
        $line['figure'] = $layer === null ? null : [
            'asset_id' => (int) $layer['asset_id'],
            'mouth' => self::point($layer['mouth'] ?? null, 0.0, 1.0) ?? self::DEFAULT_MOUTH,
            'facing' => in_array($layer['facing'] ?? 0, [-1, 1], true) ? $layer['facing'] : 0,
        ];

        return $line;
    }

    /** @param  array<string, mixed>  $line */
    private static function withTail(array $line, mixed $tail): array
    {
        if ($tail === null) {
            unset($line['tail']);

            return $line;
        }
        $tip = is_array($tail) ? self::point($tail['tip'] ?? null, self::TIP_MIN, self::TIP_MAX) : null;
        if ($tip === null) {
            return $line;
        }
        $bend = is_numeric($tail['bend'] ?? null) ? (float) $tail['bend'] : 0.12;
        $line['tail'] = ['tip' => $tip, 'bend' => round(max(-self::MAX_BEND, min(self::MAX_BEND, $bend)), 3)];

        return $line;
    }

    /** @return array{0: float, 1: float}|null */
    private static function point(mixed $p, float $lo, float $hi): ?array
    {
        if (! is_array($p) || count($p) !== 2 || ! is_numeric($p[0] ?? null) || ! is_numeric($p[1] ?? null)) {
            return null;
        }

        return [round(max($lo, min($hi, (float) $p[0])), 4), round(max($lo, min($hi, (float) $p[1])), 4)];
    }
}
