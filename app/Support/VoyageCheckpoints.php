<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

/**
 * The checkpoints a teacher drops on a voyage leg's route (config.checkpoints on the leg's scene).
 *
 * Each one: { id, lng, lat, title, story, images: [{url, credit}], button }. `button` false (the default) shows
 * the card by itself as the traveller passes; true puts a bubble on the map that the class opens. The map
 * (resources/js/voyage-checkpoints.js) snaps the point onto the route, so it is kept as a plain coordinate.
 */
final class VoyageCheckpoints
{
    public const MAX = 12;

    public const IMAGES_MAX = 12;

    public static function validPoint(mixed $lng, mixed $lat): bool
    {
        if (! is_numeric($lng) || ! is_numeric($lat)) {
            return false;
        }

        // Longitudes past ±180 are kept: a Pacific route is drawn unwrapped (Tonga at 185°E).
        return is_finite((float) $lng) && abs((float) $lng) <= 540 && (float) $lat >= -90 && (float) $lat <= 90;
    }

    /** @return array<string,mixed> */
    public static function make(float $lng, float $lat): array
    {
        return [
            'id' => 'cp_'.Str::lower(Str::random(8)),
            'lng' => round($lng, 4),
            'lat' => round($lat, 4),
            'title' => '',
            'story' => '',
            'images' => [],
            'button' => false,
        ];
    }

    /**
     * Coerce a stored list to the shape above, dropping anything without an id or a valid point.
     *
     * @return array<int,array<string,mixed>>
     */
    public static function clean(mixed $list): array
    {
        $out = [];
        foreach ((array) $list as $cp) {
            if (count($out) >= self::MAX) {
                break;
            }
            if (! is_array($cp) || ! is_string($cp['id'] ?? null) || $cp['id'] === '' || ! self::validPoint($cp['lng'] ?? null, $cp['lat'] ?? null)) {
                continue;
            }
            $images = [];
            foreach ((array) ($cp['images'] ?? []) as $im) {
                $url = is_array($im) ? ($im['url'] ?? '') : $im;
                if (is_string($url) && trim($url) !== '' && count($images) < self::IMAGES_MAX) {
                    $images[] = ['url' => trim($url), 'credit' => is_array($im) ? trim((string) ($im['credit'] ?? '')) : ''];
                }
            }
            $out[] = [
                'id' => mb_substr($cp['id'], 0, 40),
                'lng' => round((float) $cp['lng'], 4),
                'lat' => round((float) $cp['lat'], 4),
                'title' => mb_substr((string) ($cp['title'] ?? ''), 0, 120),
                'story' => mb_substr((string) ($cp['story'] ?? ''), 0, 2000),
                'images' => $images,
                'button' => (bool) ($cp['button'] ?? false),
            ];
        }

        return $out;
    }
}
