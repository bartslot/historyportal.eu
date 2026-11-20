<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * The "Space intro" of a voyage scene as a CAMERA on its timeline (Bart 2026-11-20: "I would like to
 * see the camera automatically when intro is on, and the camera should also do the angle").
 *
 * The fly-in used to be hard-coded in voyage-tour.js, so a teacher could neither see it nor change
 * it. Now it is ordinary camera keys: hold in orbit, dive, tilt towards the horizon on the way down,
 * level out on the scene's own framing. Every key is editable like any other.
 */
final class VoyageIntroCamera
{
    /** Zoom of the "from space" opening shot: the whole globe. */
    public const ORBIT_ZOOM = 1.05;

    /** Seconds the class looks at the planet before the dive starts. */
    public const HOLDS_UNTIL = 0.9;

    /** Seconds into the scene when the tilt is steepest. */
    public const TILTS_AT = 2.5;

    /** The angle of the dive, in degrees of pitch. MapLibre allows up to 60. */
    public const DIVE_TILT = 50.0;

    /** Seconds into the scene when the camera lands on the scene's framing. */
    public const LANDS_AT = 4.1;

    /**
     * The scene's resting framing from the browser, or null when it is not one.
     *
     * @return array{lng: float, lat: float, zoom: float, heading: float}|null
     */
    public static function pose(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        foreach (['lng', 'lat', 'zoom'] as $field) {
            if (! is_numeric($raw[$field] ?? null)) {
                return null;
            }
        }

        return [
            'lng' => (float) $raw['lng'],
            'lat' => (float) $raw['lat'],
            'zoom' => max(self::ORBIT_ZOOM, min(22.0, (float) $raw['zoom'])),
            'heading' => is_numeric($raw['heading'] ?? null) ? (float) $raw['heading'] : 0.0,
        ];
    }

    /**
     * The timeline with the intro camera added. A camera that already has keys is the teacher's
     * and is never overwritten.
     *
     * @param  array<string, mixed>  $timeline
     * @param  array<string, mixed>  $pose
     * @return array<string, mixed>
     */
    public static function withIntro(array $timeline, array $pose): array
    {
        $pose = self::pose($pose);
        $tracks = (array) ($timeline['tracks'] ?? []);
        if ($pose === null || self::hasCameraKeys($tracks)) {
            return $timeline;
        }

        $at = fn (float $time, float $value): array => ['time' => $time, 'value' => $value];
        $flat = fn (float $value): array => [$at(0.0, $value), $at(self::LANDS_AT, $value)];
        $camera = [
            'lng' => $flat($pose['lng']),
            'lat' => $flat($pose['lat']),
            'heading' => $flat($pose['heading']),
            // No key half way down: a zoom that stops at a key would stutter mid-dive.
            'zoom' => [$at(0.0, self::ORBIT_ZOOM), $at(self::HOLDS_UNTIL, self::ORBIT_ZOOM), $at(self::LANDS_AT, $pose['zoom'])],
            'tilt' => [$at(0.0, 0.0), $at(self::HOLDS_UNTIL, 0.0), $at(self::TILTS_AT, self::DIVE_TILT), $at(self::LANDS_AT, 0.0)],
        ];
        foreach ($camera as $property => $keyframes) {
            $tracks[] = ['target' => 'camera', 'property' => $property, 'keyframes' => $keyframes];
        }

        return [
            ...$timeline,
            'duration' => max(self::LANDS_AT, (float) ($timeline['duration'] ?? 0)),
            'targets' => array_values(array_unique([...(array) ($timeline['targets'] ?? []), 'camera'])),
            'tracks' => $tracks,
        ];
    }

    /**
     * The timeline without its camera: with the intro off nothing flies in.
     *
     * @param  array<string, mixed>  $timeline
     * @return array<string, mixed>
     */
    public static function withoutIntro(array $timeline): array
    {
        $notCamera = fn (mixed $target): bool => $target !== 'camera';

        return [
            ...$timeline,
            'targets' => array_values(array_filter((array) ($timeline['targets'] ?? []), $notCamera)),
            'tracks' => array_values(array_filter((array) ($timeline['tracks'] ?? []), fn ($t) => $notCamera($t['target'] ?? null))),
        ];
    }

    /** @param  array<int, mixed>  $tracks */
    private static function hasCameraKeys(array $tracks): bool
    {
        foreach ($tracks as $track) {
            if (($track['target'] ?? null) === 'camera' && ! empty($track['keyframes'])) {
                return true;
            }
        }

        return false;
    }
}
