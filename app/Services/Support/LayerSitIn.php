<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * "Blend into the scene": what makes a cut-out (a ship, a canoe, a figure) sit IN the painted
 * backdrop instead of on top of it. All four are a share 0..1 and all default to off (absent), so
 * every lesson made before them looks exactly as it did.
 *
 *   waterline       share of the layer's height, from the bottom, that is under water (wavy edge)
 *   reflection      opacity of the mirrored, rippled copy under the waterline
 *   contact_shadow  strength of the flat shadow patch under the layer's bottom
 *   color_match     how far the layer's colours are washed toward the backdrop around it
 *
 * Mirroring and a small tilt (so one sprite placed twice never looks like twins) are the layer's
 * existing `flip_x` and `rotation`.
 *
 * resources/js/scene/sit-in-scene.js draws them; the editor whitelist, both serializers (wizard +
 * player) and the lesson composer read the keys and ranges from here.
 */
final class LayerSitIn
{
    public const KEYS = ['waterline', 'reflection', 'contact_shadow', 'color_match'];

    /** Every key is a share. */
    public const RANGE = [0, 1];

    /** The editor's "Blend into scene" preset for a boat or ship. */
    public const BOAT = ['waterline' => 0.15, 'reflection' => 0.35, 'contact_shadow' => 0.4, 'color_match' => 0.35];

    /** ... and for anything else that stands on something (a figure on a deck). */
    public const FIGURE = ['waterline' => null, 'reflection' => null, 'contact_shadow' => 0.5, 'color_match' => 0.3];

    /** Motions only a floating thing has. */
    private const FLOATING_MOTIONS = ['bob', 'roll', 'swell'];

    private const BOAT_WORDS = '/ship|boat|canoe|waka|sloep|vessel|schip|kano|galley/i';

    /**
     * The keys as the renderers receive them: clamped to 0..1, and null for off (absent, junk or 0).
     *
     * @param  array<string, mixed>  $layer
     * @return array<string, ?float>
     */
    public static function payload(array $layer): array
    {
        $out = [];
        foreach (self::KEYS as $key) {
            $v = self::clamp($layer[$key] ?? null);
            $out[$key] = $v ?: null;
        }

        return $out;
    }

    public static function clamp(mixed $value): ?float
    {
        if (! is_numeric($value)) {
            return null;
        }

        return max((float) self::RANGE[0], min((float) self::RANGE[1], (float) $value));
    }

    /**
     * The preset for this layer: a boat when it moves like one or its library name says so.
     *
     * @param  array<string, mixed>  $layer
     * @return array<string, ?float>
     */
    public static function preset(array $layer, ?string $sourceRef): array
    {
        $boat = in_array($layer['ambient'] ?? null, self::FLOATING_MOTIONS, true)
            || ($sourceRef !== null && preg_match(self::BOAT_WORDS, $sourceRef) === 1);

        return $boat ? self::BOAT : self::FIGURE;
    }
}
