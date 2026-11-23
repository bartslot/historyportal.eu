<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Whether a voyage stop shows the button the class can open (the stop's pill on the map).
 *
 * Bart, 2026-11-23: "I have nothing in the stop sometimes, but it keeps showing the button where the
 * children can click on. I want this behind a switch." The switch is config.gallery.button. Left unset it
 * follows the stop: on once it has a story or a picture, off while it has neither. A title alone is only the
 * button's label, not content. Mirrors resources/js/scene/stop-button.js, which the map draws from.
 */
final class VoyageStopButton
{
    /** @param array<string, mixed> $config a voyage scene's config */
    public static function hasContent(array $config): bool
    {
        $gallery = (array) ($config['gallery'] ?? []);
        $filled = fn ($s): bool => is_string($s) && trim($s) !== '';
        $hasImage = function ($list) use ($filled): bool {
            foreach ((array) $list as $im) {
                if ($filled(is_array($im) ? ($im['url'] ?? null) : $im)) {
                    return true;
                }
            }

            return false;
        };

        return $filled($gallery['story'] ?? null) || $hasImage($gallery['images'] ?? []) || $hasImage($config['stop_images'] ?? []);
    }

    /** @param array<string, mixed> $config a voyage scene's config */
    public static function isOn(array $config): bool
    {
        $button = $config['gallery']['button'] ?? null;

        return is_bool($button) ? $button : self::hasContent($config);
    }
}
