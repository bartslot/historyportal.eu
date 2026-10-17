<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Services\Support\LayerAmbient;
use App\Services\Support\ShotCamera;
use InvalidArgumentException;

/**
 * The one shape of a power-meter moment (scene config.moment on a story panel), and the one place it
 * is cleaned. The composer runs a spec entry through here, the editor runs the teacher's draft through
 * here: both arrive from outside and are never trusted.
 *
 * A moment is a stuck point in the story (no wind, the anchor down, the bridge up). The panel's
 * narration reaches it, the player holds, and the class fills a meter: by shouting the right words
 * the teacher taps (input "words"), by cheering, blowing, clapping in rhythm or keeping still (the
 * microphone), or by shaking a pupil's own phone (motion). A right word fills the meter one step and the
 * world reacts (one layer's ambient motion swells for a moment); a wrong word only shakes. A full
 * meter plays the payoff (a layer sails off, or a camera move), then the narrator's `after` line, and
 * the lesson goes on. Skip is always there; there is no timer unless the teacher sets one.
 *
 * Layers are referred to by asset_id: the key the player (data-layer-id="art_<id>") and the editor
 * already use. A spec writes the asset ref; the composer resolves it before calling normalize().
 *
 * Unknown keys are dropped; numbers are clamped; strings are tag-stripped, trimmed and capped. The
 * player renders every string with textContent.
 */
final class MomentSpec
{
    /**
     * How the class fills the meter: shouting words (the teacher taps), cheering, blowing, clapping in
     * rhythm or keeping quiet (the microphone), or shaking / tilting a pupil's own phone (motion).
     * The skill's list: woorden, luider, blazen, ritme, stilte, schudden. No pitch: nobody asked for it.
     */
    public const INPUTS = ['words', 'loudness', 'blow', 'rhythm', 'silence', 'motion'];

    /** The inputs the microphone plays (resources/js/scene/meter-inputs/sound.js MIC_INPUTS). */
    public const MIC_INPUTS = ['loudness', 'blow', 'rhythm', 'silence'];

    /** Inputs that need no words: the meter has its own size (1..RIGHT_MAX steps). */
    public const WORDLESS_INPUTS = ['loudness', 'blow', 'rhythm', 'silence', 'motion'];

    /** With teams: one meter the teams fill in turn, or a meter per team. */
    public const TEAM_METERS = ['shared', 'each'];

    public const PAYOFFS = ['move', 'camera', 'none'];

    public const RIGHT_MAX = 8;

    public const WRONG_MAX = 6;

    public const TEAMS_MAX = 8;

    /** Seconds; 0 = no timer. */
    public const TIMER_MAX = 300;

    /** Seconds into the narration a moment may start at. */
    public const AT_MAX = 600;

    /** Where a payoff may move a layer, in stage % like a layer's x/y: off-stage on every side. */
    public const POSITION = [-50, 150];

    public const DURATION = [0.3, 30];

    /** Seconds the 1642 fleet (the solo race's ghost) takes to fill its meter. */
    public const GHOST_SECONDS = [5, 120];

    private const WORD_MAX = 40;

    private const NAME_MAX = 80;

    private const LINE_MAX = 300;

    private const TEXT_MAX = 1200;

    private const URL_MAX = 2048;

    /** input_options: [key => [min, max]] or a list of allowed strings. */
    private const OPTIONS = [
        'threshold' => [0.05, 1],
        'hold_seconds' => [1, 30],
        'bpm' => [30, 200],
        'beats' => [2, 32],
        'gesture' => ['shake', 'tilt'],
    ];

    /**
     * Clean a raw moment from a spec. Throws on an unknown input or payoff type: an authoring mistake
     * that would otherwise play a different moment than the one written.
     *
     * @param  array<string,mixed>  $raw
     * @return array<string,mixed>
     */
    public static function normalize(array $raw): array
    {
        $input = (string) ($raw['input'] ?? 'words');
        if (! in_array($input, self::INPUTS, true)) {
            throw new InvalidArgumentException("Moment input '{$input}' is not one of: ".implode(', ', self::INPUTS).'.');
        }
        $payoffType = (string) (($raw['payoff'] ?? [])['type'] ?? 'none');
        if (! in_array($payoffType, self::PAYOFFS, true)) {
            throw new InvalidArgumentException("Moment payoff '{$payoffType}' is not one of: ".implode(', ', self::PAYOFFS).'.');
        }

        $right = self::words($raw['words']['right'] ?? [], self::RIGHT_MAX);
        $teams = self::int($raw['teams'] ?? 0, 0, self::TEAMS_MAX, 0);
        // A sound meter needs no words: its size is its own, up to as many steps as a word meter.
        $wordless = in_array($input, self::WORDLESS_INPUTS, true);
        $goalMax = $wordless ? self::RIGHT_MAX : max(1, count($right));
        $goalDefault = $wordless && $right === [] ? 4 : max(1, count($right));

        return [
            'enabled' => (bool) ($raw['enabled'] ?? true),
            'name' => self::text($raw['name'] ?? '', self::NAME_MAX),
            'meter_label' => self::text($raw['meter_label'] ?? '', self::NAME_MAX),
            'prompt' => self::text($raw['prompt'] ?? '', self::LINE_MAX),
            'input' => $input,
            'input_options' => self::options($raw['input_options'] ?? []),
            'words' => [
                'right' => $right,
                'wrong' => self::words($raw['words']['wrong'] ?? [], self::WRONG_MAX),
            ],
            'goal' => self::int($raw['goal'] ?? $goalDefault, 1, $goalMax, min($goalDefault, $goalMax)),
            'after' => self::text($raw['after'] ?? '', self::TEXT_MAX),
            'after_audio' => self::url($raw['after_audio'] ?? ''),
            'why' => self::text($raw['why'] ?? '', self::TEXT_MAX),
            'at' => self::at($raw['at'] ?? 'end'),
            'seconds' => self::int($raw['seconds'] ?? 0, 0, self::TIMER_MAX, 0),
            // One team is no team: 0 (off) or 2..8.
            'teams' => $teams === 1 ? 2 : $teams,
            'team_meter' => in_array($raw['team_meter'] ?? null, self::TEAM_METERS, true) ? $raw['team_meter'] : 'shared',
            'react' => self::react($raw['react'] ?? []),
            'payoff' => self::payoff($raw['payoff'] ?? [], $payoffType),
            'race' => self::race($raw['race'] ?? []),
        ];
    }

    /**
     * normalize() for data from the browser: an input or payoff it made up becomes the stored one
     * instead of an exception, so a tampered request saves a sound moment rather than a 500.
     *
     * @param  array<string,mixed>  $raw
     * @param  array<string,mixed>  $stored  the moment as saved (already normalized)
     * @return array<string,mixed>
     */
    public static function clean(array $raw, array $stored = []): array
    {
        if (! in_array($raw['input'] ?? null, self::INPUTS, true)) {
            $raw['input'] = $stored['input'] ?? 'words';
        }
        $type = is_array($raw['payoff'] ?? null) ? ($raw['payoff']['type'] ?? null) : null;
        if (! in_array($type, self::PAYOFFS, true)) {
            $raw['payoff'] = array_merge(is_array($raw['payoff'] ?? null) ? $raw['payoff'] : [], [
                'type' => $stored['payoff']['type'] ?? 'none',
            ]);
        }

        return self::normalize($raw);
    }

    /** A blank moment for a panel that never had one: off until the teacher turns it on. */
    public static function blank(): array
    {
        return self::normalize(['enabled' => false]);
    }

    /**
     * The spec's layer refs (asset refs) swapped for asset ids, via $resolve(string $ref): ?int.
     * A ref the panel does not carry fails the compose: a payoff that moves nothing is a typo.
     *
     * @param  array<string,mixed>  $raw
     * @return array<string,mixed>
     */
    public static function resolveLayers(array $raw, callable $resolve, string $where): array
    {
        foreach (['react', 'payoff'] as $part) {
            $ref = is_array($raw[$part] ?? null) ? ($raw[$part]['layer'] ?? null) : null;
            if (! is_string($ref) || is_numeric($ref)) {
                continue;
            }
            $raw[$part]['layer'] = $resolve($ref)
                ?? throw new InvalidArgumentException("{$where}: moment {$part} layer '{$ref}' is not a layer of this panel.");
        }

        return $raw;
    }

    /** @return array{layer: ?int, ambient: ?string, amount: float} */
    private static function react(mixed $raw): array
    {
        $raw = is_array($raw) ? $raw : [];
        $mode = $raw['ambient'] ?? null;

        return [
            'layer' => self::layer($raw['layer'] ?? null),
            'ambient' => in_array($mode, LayerAmbient::MODES, true) && $mode !== 'none' ? $mode : null,
            'amount' => self::float($raw['amount'] ?? null, LayerAmbient::AMOUNT, 1.6),
        ];
    }

    /** @return array<string,mixed> */
    private static function payoff(mixed $raw, string $type): array
    {
        $raw = is_array($raw) ? $raw : [];

        // Every field is kept whatever the type, so switching move -> camera -> move loses nothing.
        return [
            'type' => $type,
            'layer' => self::layer($raw['layer'] ?? null),
            'to_x' => self::float($raw['to_x'] ?? null, self::POSITION, 120.0),
            'to_y' => self::float($raw['to_y'] ?? null, self::POSITION, 50.0),
            'duration' => self::float($raw['duration'] ?? null, self::DURATION, 4.0),
            'camera' => ShotCamera::payload($raw['camera'] ?? null),
        ];
    }

    /**
     * The harbour race: a meter per team (or a pupil against the 1642 fleet), the reacting layer's
     * ship sailing one lane per team from start_x to finish_x. `after` is the narrator's line when a
     * race was run (it may name the crews: {crew:heemskerck}); without a race the moment's own
     * `after` plays.
     *
     * `after_solo` is that line for a pupil who raced the 1642 fleet alone (no Zeehaen crew to name).
     *
     * @return array{enabled: bool, ghost_seconds: float, start_x: float, finish_x: float, after: string, after_solo: string}
     */
    private static function race(mixed $raw): array
    {
        $raw = is_array($raw) ? $raw : [];

        return [
            'enabled' => (bool) ($raw['enabled'] ?? false),
            'ghost_seconds' => self::float($raw['ghost_seconds'] ?? null, self::GHOST_SECONDS, 25.0),
            'start_x' => self::float($raw['start_x'] ?? null, self::POSITION, 25.0),
            // In frame: the finishers wait at the line with their crew named, then the payoff sails all out.
            'finish_x' => self::float($raw['finish_x'] ?? null, self::POSITION, 85.0),
            'after' => self::text($raw['after'] ?? '', self::TEXT_MAX),
            'after_solo' => self::text($raw['after_solo'] ?? '', self::TEXT_MAX),
        ];
    }

    /** @return array<string, float|string> */
    private static function options(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }
        $out = [];
        foreach (self::OPTIONS as $key => $rule) {
            if (! array_key_exists($key, $raw)) {
                continue;
            }
            $value = $raw[$key];
            if (is_string($rule[0])) {
                if (in_array($value, $rule, true)) {
                    $out[$key] = $value;
                }
            } elseif (is_numeric($value)) {
                $out[$key] = max((float) $rule[0], min((float) $rule[1], (float) $value));
            }
        }

        return $out;
    }

    /** @return list<string> */
    private static function words(mixed $rows, int $max): array
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
            $out[] = self::text($row, self::WORD_MAX);
            if (count($out) >= $max) {
                break;
            }
        }

        return $out;
    }

    private static function at(mixed $value): string|float
    {
        return is_numeric($value) ? max(0.0, min((float) self::AT_MAX, (float) $value)) : 'end';
    }

    private static function layer(mixed $value): ?int
    {
        return is_numeric($value) && (int) $value > 0 ? (int) $value : null;
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

    /** @param array{0: int|float, 1: int|float} $range */
    private static function float(mixed $value, array $range, float $fallback): float
    {
        return is_numeric($value) ? max((float) $range[0], min((float) $range[1], (float) $value)) : $fallback;
    }

    /** A path on this site ("/storage/...") only: the after line's recording is always ours. */
    private static function url(mixed $value): string
    {
        $url = is_string($value) ? trim($value) : '';

        // A backslash is a slash to a browser: "/\\evil.example" would leave the site.
        return $url !== '' && mb_strlen($url) <= self::URL_MAX && str_starts_with($url, '/') && ! str_starts_with($url, '//')
            && ! str_contains($url, '\\') ? $url : '';
    }
}
