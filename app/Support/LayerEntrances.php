<?php

declare(strict_types=1);

namespace App\Support;

/**
 * How a layer arrives on a scene, as the editor names them. The movements themselves are in
 * resources/js/scene/animations.js (ENTRANCES), which plays them in the editor and the player; a
 * figure's Animate tab and a speech balloon's inspector both offer this one list.
 */
final class LayerEntrances
{
    /** @return array<string, string> key => label in the teacher's language */
    public static function labels(): array
    {
        return [
            'none' => __('None'),
            'fade' => __('Fade in'),
            'slide-left' => __('In from left'),
            'slide-right' => __('In from right'),
            'slide-up' => __('In from below'),
            'slide-down' => __('In from above'),
            'zoom' => __('Zoom in'),
            'pop' => __('Pop'),
        ];
    }
}
