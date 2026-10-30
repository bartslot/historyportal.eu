<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SvgAsset;

/**
 * A vector arrow layer: the server's half of resources/js/scene/arrow-shape.js, which draws it. Its
 * start is the layer's x / y, and the rest is here. The bounds are the canvas's (ARROW_LIMITS), so a
 * value the editor cannot make cannot be saved either.
 */
final class SceneArrow
{
    public const KIND = 'arrow';

    public const STYLES = ['block', 'stroke'];

    /** Every value an arrow stores, with its bounds: the start, the end, the bend, width and head. */
    public const LIMITS = [
        'x' => [0, 100],
        'y' => [0, 100],
        'end_x' => [0, 100],
        'end_y' => [0, 100],
        'bend' => [-0.5, 0.5],
        'shaft' => [0.2, 6],
        'head' => [1, 20],
    ];

    /** The arrow keys a layer carries, the ones a keyframe can move, and the style. */
    public const KEYS = ['end_x', 'end_y', 'bend', 'shaft', 'head'];

    /**
     * The library arrows that have a vector form, by file name. Every other arrow picture (dashed,
     * double, elbow, loop) stays a picture layer, as it always was.
     */
    public const PRESETS = [
        'arrow-straight' => ['arrow_style' => 'stroke', 'bend' => 0.0],
        'arrow-curved' => ['arrow_style' => 'stroke', 'bend' => 0.22],
        'arrow-block' => ['arrow_style' => 'block', 'bend' => 0.0],
    ];

    /** The arrow's values from a request, clamped to LIMITS. A key that is absent or not numeric is left out. */
    public static function clamp(array $fields): array
    {
        $out = [];
        foreach (self::LIMITS as $key => [$min, $max]) {
            if (array_key_exists($key, $fields) && is_numeric($fields[$key])) {
                $out[$key] = round(max((float) $min, min((float) $max, (float) $fields[$key])), 3);
            }
        }

        return $out;
    }

    /**
     * The layer's arrow values for the composer and the payload to the editor: null for a layer that
     * is not an arrow, so every other kind is untouched.
     *
     * @param  array<string,mixed>  $layer
     * @return array<string,mixed>
     */
    public static function payload(array $layer): array
    {
        if (($layer['kind'] ?? null) !== self::KIND) {
            return [];
        }

        $values = self::clamp($layer);

        return [
            'kind' => self::KIND,
            'end_x' => $values['end_x'] ?? 70.0,
            'end_y' => $values['end_y'] ?? 50.0,
            'bend' => $values['bend'] ?? 0.0,
            'shaft' => $values['shaft'] ?? 1.2,
            'head' => $values['head'] ?? 5.5,
            'arrow_style' => in_array($layer['arrow_style'] ?? null, self::STYLES, true) ? $layer['arrow_style'] : 'stroke',
        ];
    }

    /** The preset for a library arrow the teacher placed, or null for every other asset. */
    public static function presetFor(SvgAsset $asset): ?array
    {
        if ($asset->collection !== 'arrows') {
            return null;
        }

        // The library ref carries the file's extension (arrows/arrow-straight.svg), so the name is the stem.
        $name = pathinfo((string) $asset->source_ref, PATHINFO_FILENAME);

        return self::PRESETS[$name] ?? null;
    }
}
