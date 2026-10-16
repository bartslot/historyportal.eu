<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * How a scene text looks beyond its font: colour, scale, rotation, blur, blend, opacity and
 * grayscale (Figma 1674:4695, the text layer's Appearance and Layer sections).
 *
 * ONE place for the fields and their ranges, because two server paths write a text: the Format
 * panel (updateSceneText) and the canvas's own save (sceneTextsChanged), which rebuilds every item
 * from a field list. A field only one of them knew would be wiped by the other.
 * resources/js/scene/TextOverlayLayer.js draws them, in the editor and the player alike.
 */
final class TextLayerStyle
{
    public const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];

    /** @var array<string, array{0: float, 1: float}> */
    public const RANGES = [
        'colorOpacity' => [0.0, 1.0],
        'scale' => [0.2, 4.0],
        'rotation' => [-180.0, 180.0],
        'blur' => [0.0, 2.5],
        'opacity' => [0.05, 1.0],
    ];

    public const FIELDS = ['color', 'colorOpacity', 'scale', 'rotation', 'blur', 'blend', 'opacity', 'grayscale'];

    /** A field's clean value, or null when the input is not one (the caller keeps what it had). */
    public static function value(string $field, mixed $value): string|float|bool|null
    {
        return match (true) {
            $field === 'color' => is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) ? strtolower($value) : null,
            $field === 'blend' => in_array($value, self::BLENDS, true) ? $value : null,
            $field === 'grayscale' => filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE),
            isset(self::RANGES[$field]) => is_numeric($value)
                ? round(max(self::RANGES[$field][0], min(self::RANGES[$field][1], (float) $value)), 3)
                : null,
            default => null,
        };
    }

    /**
     * The style fields an item carries, cleaned. Absent stays absent: the defaults (white, 1×,
     * upright, sharp, normal, opaque, in colour) are the absence of the key.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, string|float|bool>
     */
    public static function of(array $item): array
    {
        $out = [];
        foreach (self::FIELDS as $field) {
            if (array_key_exists($field, $item) && ($v = self::value($field, $item[$field])) !== null) {
                $out[$field] = $v;
            }
        }

        return $out;
    }
}
