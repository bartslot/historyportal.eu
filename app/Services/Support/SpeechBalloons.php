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
 *   tail   {tip: [x, y], bend} where the tail points, dragged out on the stage (past the panel is fine)
 *   panel  0|1 on a split scene, the panel it sits in
 *   scale  size factor (corner handle); opacity 0..1 (keyframed); anim  its entrance
 *   tail.root  where the tail leaves the outline (0..1, clockwise from the top-left), pinned by
 *          the teacher; without it the root snaps to the edge nearest the tip
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

    /** A balloon's size as a factor of the house size (BalloonLayer.js MIN_SCALE / MAX_SCALE). */
    public const MIN_SCALE = 0.3;

    public const MAX_SCALE = 4.0;

    /** How a balloon may arrive: the layers' entrances (resources/js/scene/animations.js). */
    public const ENTRANCES = ['none', 'fade', 'slide-left', 'slide-right', 'slide-up', 'slide-down', 'zoom', 'pop'];

    /** What the timeline may key on a balloon (resources/js/anim/properties.js `bal`). */
    public const TIMELINE_PROPERTIES = ['x', 'y', 'scale', 'opacity', 'tip_x', 'tip_y', 'root', 'bend'];

    /** The longest a scene runs, s: a balloon's start and end stay inside it. */
    private const MAX_TIME = 3600.0;

    /**
     * How far past its panel a balloon's middle and its tail tip may sit, in the panel's own
     * fractions. On a split scene both may cross the panel border into the next panel, the way
     * comic lettering breaks the frame (Bart, 2026-10-16); a quarter panel reaches three widths
     * across the stage. The renderer bounds them by the whole stage.
     */
    private const REACH_MIN = -4.0;

    private const REACH_MAX = 5.0;

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
            $at = self::point($patch['at'], self::REACH_MIN, self::REACH_MAX);
            if ($at !== null) {
                $line['at'] = $at;
            }
        }
        if (array_key_exists('tail', $patch)) {
            $line = self::withTail($line, $patch['tail']);
        }
        if (is_numeric($patch['scale'] ?? null)) {
            $line['scale'] = round(max(self::MIN_SCALE, min(self::MAX_SCALE, (float) $patch['scale'])), 3);
        }
        if (is_numeric($patch['opacity'] ?? null)) {
            $line['opacity'] = round(max(0.0, min(1.0, (float) $patch['opacity'])), 3);
        }
        if (array_key_exists('anim', $patch) && in_array($patch['anim'], self::ENTRANCES, true)) {
            $line['anim'] = $patch['anim'];
        }

        return self::withSpan($line, $patch);
    }

    /**
     * The scene's timeline after line $removed is gone: that balloon's tracks go with it, and the
     * tracks of every balloon after it follow its new place (`bal:<index>` names a place in the list).
     *
     * @param  array<string, mixed>|null  $timeline
     * @return array<string, mixed>|null
     */
    public static function timelineWithout(?array $timeline, int $removed): ?array
    {
        if (! is_array($timeline['tracks'] ?? null)) {
            return $timeline;
        }
        $tracks = [];
        foreach ($timeline['tracks'] as $track) {
            if (is_array($track) && preg_match('/^bal:(\d+)$/', (string) ($track['target'] ?? ''), $m)) {
                $n = (int) $m[1];
                if ($n === $removed) {
                    continue;
                }
                if ($n > $removed) {
                    $track['target'] = 'bal:'.($n - 1);
                }
            }
            $tracks[] = $track;
        }
        $timeline['tracks'] = $tracks;

        return $timeline;
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

    /**
     * When the balloon is on screen: start (s) and end (s, or null = to the scene's end). An end
     * at or before the start is dropped.
     *
     * @param  array<string, mixed>  $line
     * @param  array<string, mixed>  $patch
     * @return array<string, mixed>
     */
    private static function withSpan(array $line, array $patch): array
    {
        if (is_numeric($patch['start'] ?? null)) {
            $line['start'] = round(max(0.0, min(self::MAX_TIME, (float) $patch['start'])), 3);
        }
        if (array_key_exists('end', $patch)) {
            $end = is_numeric($patch['end']) ? round(min(self::MAX_TIME, (float) $patch['end']), 3) : null;
            $line['end'] = $end !== null && $end > (float) ($line['start'] ?? 0) ? $end : null;
        }

        return $line;
    }

    /**
     * The tail with the editor's change merged in: its tip, its bend, and its root (null = snap
     * to the edge nearest the tip again). `null` for the whole tail removes it.
     *
     * @param  array<string, mixed>  $line
     * @return array<string, mixed>
     */
    private static function withTail(array $line, mixed $tail): array
    {
        if ($tail === null) {
            unset($line['tail']);

            return $line;
        }
        if (! is_array($tail)) {
            return $line;
        }
        $next = (array) ($line['tail'] ?? []);
        $tip = self::point($tail['tip'] ?? null, self::REACH_MIN, self::REACH_MAX);
        if ($tip !== null) {
            $next['tip'] = $tip;
        }
        if (is_numeric($tail['bend'] ?? null)) {
            $next['bend'] = round(max(-self::MAX_BEND, min(self::MAX_BEND, (float) $tail['bend'])), 3);
        }
        if (array_key_exists('root', $tail)) {
            if (is_numeric($tail['root'])) {
                $next['root'] = round(fmod(fmod((float) $tail['root'], 1.0) + 1.0, 1.0), 4);
            } else {
                unset($next['root']);
            }
        }
        if ($next === []) {
            unset($line['tail']);
        } else {
            $line['tail'] = $next;
        }

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
