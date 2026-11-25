<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Services\Support\NarrationTiming;
use App\Services\Support\SpeechBalloons;

/**
 * The cut tool (Bart, 2026-11-24: "there should be a cut tool, splitting up clips. for example if
 * there is a video, that you can cut it in pieces and use different backgrounds").
 *
 * A cut at the playhead splits ONE scene into two scenes straight after each other: the first runs
 * up to the cut, the second from it. Each piece is a whole scene, so it takes its own background,
 * video, layers and timing with every tool the editor already has, and the player plays the two
 * back to back as it plays any two scenes. Nothing new is drawn or played: the cut only divides
 * what the scene already had between the two pieces.
 *
 *   narration  the words before the cut stay, the words after it move on; the audio is cut at the
 *              same moment (NarrationCutter), so the voice is the one already paid for and nothing
 *              is narrated again
 *   timeline   the keys on each side, with a key at the cut holding the value there (the browser
 *              samples it with the same code that plays it: timeline-cut.js)
 *   balloons   each keeps its own times; the second piece counts from the cut
 *   layers     an appear delay counts from the cut in the second piece
 *
 * Pure: arrays in, arrays out. The scene rows and the audio files are the caller's.
 */
final class SceneCut
{
    /** No piece shorter than this, in seconds: a cut this near either end is a slip of the hand. */
    public const MIN_PIECE_S = 0.5;

    /** Scenes that are not one stretch of time: a game waits for the class, a voyage sails its own route. */
    public const UNCUTTABLE_KINDS = ['game', 'voyage'];

    /**
     * The word gap nearest `$at`: the narration is never cut inside a word. Null without timings, or
     * when no gap leaves words on both sides.
     *
     * @return array{index: int, time: float}|null  index: the whitespace character the cut falls on
     */
    public static function wordGap(mixed $alignment, float $at): ?array
    {
        $chars = NarrationTiming::fromStored($alignment)->toArray();
        $n = count($chars);
        $best = null;
        $seenWord = false;
        for ($i = 0; $i < $n; $i++) {
            if (! self::isSpace($chars[$i]['character'])) {
                $seenWord = true;

                continue;
            }
            if (! $seenWord) {
                continue;
            }
            $next = self::nextWord($chars, $i);
            if ($next === null) {
                break;
            }
            $prevEnd = (float) $chars[$i - 1]['end_time'];
            $time = round(($prevEnd + (float) $chars[$next]['start_time']) / 2, 3);
            if ($best === null || abs($time - $at) < abs($best['time'] - $at)) {
                $best = ['index' => $i, 'time' => $time];
            }
        }

        return $best;
    }

    /**
     * The timings of each piece: the first keeps everything before the gap, the second everything
     * after it, counted from the cut.
     *
     * @return array{0: list<array<string, mixed>>, 1: list<array<string, mixed>>}
     */
    public static function splitAlignment(mixed $alignment, int $index, float $cut): array
    {
        $chars = NarrationTiming::fromStored($alignment)->toArray();
        $first = array_slice($chars, 0, $index);
        $second = array_map(fn (array $c): array => [
            'character' => $c['character'],
            'start_time' => round(max(0.0, $c['start_time'] - $cut), 3),
            'end_time' => round(max(0.0, $c['end_time'] - $cut), 3),
        ], array_slice($chars, $index + 1));

        // Leading spaces belong to neither word.
        while ($second !== [] && self::isSpace($second[0]['character'])) {
            array_shift($second);
        }

        return [array_values($first), array_values($second)];
    }

    /**
     * The script divided where the narration is cut. `$share` (0..1) is how far into the SPOKEN text
     * the cut falls; the script is usually that very text, but a respelt word (PronunciationLexicon)
     * makes it a little longer or shorter, so the share is mapped onto the script and moved to the
     * nearest space, or to a sentence end close by, so no word is ever split. `$exact`: the script IS
     * the timed text, so the share already falls on the gap the audio is cut at; only a space counts.
     *
     * @return array{0: string, 1: string}
     */
    public static function splitScript(string $script, float $share, bool $exact = false): array
    {
        $len = mb_strlen($script);
        if ($len === 0) {
            return ['', ''];
        }
        $want = (int) round(max(0.0, min(1.0, $share)) * $len);
        $at = self::nearestBreak($script, $want, $len, $exact);
        if ($at === null) {
            return $share < 0.5 ? ['', trim($script)] : [trim($script), ''];
        }

        return [trim(mb_substr($script, 0, $at)), trim(mb_substr($script, $at))];
    }

    /**
     * The speech balloons (config.lines) of each piece. A balloon over before the cut leaves the
     * second piece; one that starts after it leaves the first; the rest stay in both, the second
     * counting from the cut. The timeline rows that animate a balloon (bal:<n>) follow its index.
     *
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public static function linesFor(array $config, float $cut, bool $second): array
    {
        $lines = array_values((array) ($config['lines'] ?? []));
        if ($lines === []) {
            return $config;
        }
        $timeline = is_array($config['timeline'] ?? null) ? $config['timeline'] : null;
        for ($i = count($lines) - 1; $i >= 0; $i--) {
            $line = is_array($lines[$i]) ? $lines[$i] : [];
            $start = (float) ($line['start'] ?? 0);
            $end = is_numeric($line['end'] ?? null) ? (float) $line['end'] : null;
            $gone = $second ? ($end !== null && $end <= $cut) : ($start >= $cut);
            if ($gone) {
                array_splice($lines, $i, 1);
                $timeline = SpeechBalloons::timelineWithout($timeline, $i);

                continue;
            }
            if ($second) {
                $line['start'] = round(max(0.0, $start - $cut), 3);
                if ($end !== null) {
                    $line['end'] = round($end - $cut, 3);
                }
            } elseif ($end !== null && $end > $cut) {
                $line['end'] = null;   // up to the piece's end, which is the cut
            }
            $lines[$i] = $line;
        }
        $config['lines'] = $lines;
        if ($timeline !== null) {
            $config['timeline'] = $timeline;
        }

        return $config;
    }

    /**
     * The second piece's layers: an appear delay counts from the cut, so a figure that came on at
     * 6 s in a scene cut at 4 s comes on at 2 s.
     *
     * @param  array<int, mixed>|null  $shots
     * @return array<int, mixed>|null
     */
    public static function shotsAfter(?array $shots, float $cut): ?array
    {
        if ($shots === null) {
            return null;
        }
        foreach ($shots as $s => $shot) {
            if (! is_array($shot) || ! is_array($shot['layers'] ?? null)) {
                continue;
            }
            foreach ($shot['layers'] as $l => $layer) {
                if (is_array($layer) && is_numeric($layer['anim_delay'] ?? null)) {
                    $shots[$s]['layers'][$l]['anim_delay'] = round(max(0.0, (float) $layer['anim_delay'] - $cut), 1);
                }
            }
        }

        return $shots;
    }

    /**
     * The silence nearest `$at` from ffmpeg's silencedetect, for narration with no timings (Azure
     * returns audio only). Null when no silence is within `$reach` seconds: the cut then stays
     * where the playhead is.
     *
     * @param  list<array{0: float, 1: float}>  $silences  [start, end] pairs in seconds
     */
    public static function nearestSilence(array $silences, float $at, float $reach = 1.5): ?float
    {
        $best = null;
        foreach ($silences as [$from, $to]) {
            $mid = round(($from + $to) / 2, 3);
            $time = $at >= $from && $at <= $to ? round($at, 3) : $mid;
            if (abs($time - $at) <= $reach && ($best === null || abs($time - $at) < abs($best - $at))) {
                $best = $time;
            }
        }

        return $best;
    }

    private static function isSpace(string $c): bool
    {
        return $c === '' || preg_match('/^\s+$/u', $c) === 1;
    }

    /** @param list<array{character: string}> $chars */
    private static function nextWord(array $chars, int $from): ?int
    {
        for ($j = $from + 1, $n = count($chars); $j < $n; $j++) {
            if (! self::isSpace($chars[$j]['character'])) {
                return $j;
            }
        }

        return null;
    }

    /** The character offset to cut the script at: a sentence end within reach, else the nearest space. */
    private static function nearestBreak(string $script, int $want, int $len, bool $exact): ?int
    {
        $chars = mb_str_split($script);
        $space = null;
        $sentence = null;
        for ($i = 1; $i < $len; $i++) {
            if (! self::isSpace($chars[$i]) || self::isSpace($chars[$i - 1])) {
                continue;
            }
            if ($space === null || abs($i - $want) < abs($space - $want)) {
                $space = $i;
            }
            if (! $exact && preg_match('/[.!?…]["\'”’»)\]]*$/u', mb_substr($script, max(0, $i - 3), min(3, $i))) === 1
                && abs($i - $want) <= 12
                && ($sentence === null || abs($i - $want) < abs($sentence - $want))) {
                $sentence = $i;
            }
        }

        return $sentence ?? $space;
    }
}
