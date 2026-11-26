<?php

declare(strict_types=1);

namespace App\Services\Support;

use Illuminate\Support\Facades\Cache;

/**
 * How long a re-narration will take, measured, not guessed (Bart 11-26: the panel counted 0:50 for a
 * 22 second paragraph that was back in seconds; he wants a countdown he can trust).
 *
 * Two parts, each a running average per narration provider, learned from every finished job:
 *   · the wait: from the teacher's click until a worker picks the job up;
 *   · the recording: seconds per character of text, from the job's start to the stored file.
 * estimate = wait + rate × characters. Until a provider has history the defaults below hold; each
 * job then moves the average a fifth of the way towards what it measured, so one slow run (a cold
 * worker, a busy ElevenLabs) nudges the countdown without throwing it off.
 */
final class NarrationEta
{
    /** Weight of the newest measurement in the running average. */
    private const WEIGHT = 0.2;

    /** Starting points before any job has been measured: seconds of wait, seconds per character. */
    private const DEFAULT_WAIT = 4.0;

    private const DEFAULT_RATE = ['elevenlabs' => 0.02, 'azure' => 0.012];

    private const FALLBACK_RATE = 0.02;

    /** Never promise less than this: a request, a worker pass and a file write. */
    private const MIN_SECONDS = 3;

    public static function estimate(string $provider, int $characters): int
    {
        $stats = self::stats($provider);

        return max(self::MIN_SECONDS, (int) ceil($stats['wait'] + $stats['rate'] * max(0, $characters)));
    }

    /** The teacher pressed Re-narrate: remember when, and what we promised, for the countdown and the measurement. */
    public static function requested(int $sceneId, string $provider, int $characters): void
    {
        Cache::put(self::requestKey($sceneId), ['at' => microtime(true), 'estimate' => self::estimate($provider, $characters)], now()->addHour());
    }

    /**
     * Seconds left on the countdown for a scene being narrated, and the whole estimate; null when the
     * request was not made from the editor (a lesson being built, a console command).
     *
     * @return array{remaining: int, total: int}|null
     */
    public static function remaining(int $sceneId): ?array
    {
        $req = Cache::get(self::requestKey($sceneId));
        if (! is_array($req) || ! isset($req['at'], $req['estimate'])) {
            return null;
        }
        $spent = microtime(true) - (float) $req['at'];

        return ['remaining' => max(0, (int) ceil((int) $req['estimate'] - $spent)), 'total' => (int) $req['estimate']];
    }

    /** A job finished: learn from it. $startedAt is microtime(true) when the job began. */
    public static function finished(int $sceneId, string $provider, int $characters, float $startedAt): void
    {
        $now = microtime(true);
        $stats = self::stats($provider);

        if ($characters > 0) {
            $rate = max(0.0, $now - $startedAt) / $characters;
            $stats['rate'] = $stats['rate'] + self::WEIGHT * ($rate - $stats['rate']);
        }

        $req = Cache::pull(self::requestKey($sceneId));
        if (is_array($req) && isset($req['at'])) {
            $wait = max(0.0, $startedAt - (float) $req['at']);
            // A job that sat behind a worker which was down for minutes says nothing about the next click.
            if ($wait < 120) {
                $stats['wait'] = $stats['wait'] + self::WEIGHT * ($wait - $stats['wait']);
            }
        }

        Cache::forever(self::statsKey($provider), $stats);
    }

    /** A job failed: the countdown for that scene ends. */
    public static function forget(int $sceneId): void
    {
        Cache::forget(self::requestKey($sceneId));
    }

    /** @return array{wait: float, rate: float} */
    public static function stats(string $provider): array
    {
        $stored = Cache::get(self::statsKey($provider));
        $default = ['wait' => self::DEFAULT_WAIT, 'rate' => self::DEFAULT_RATE[$provider] ?? self::FALLBACK_RATE];

        return is_array($stored) && isset($stored['wait'], $stored['rate'])
            ? ['wait' => (float) $stored['wait'], 'rate' => (float) $stored['rate']]
            : $default;
    }

    private static function requestKey(int $sceneId): string
    {
        return "narration-eta:request:{$sceneId}";
    }

    private static function statsKey(string $provider): string
    {
        return 'narration-eta:stats:'.($provider !== '' ? $provider : 'default');
    }
}
