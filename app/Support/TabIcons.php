<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Icons for the inspector's icon tabs (<x-ui.segmented>): ['ui' => name] is a file in resources/ui-icons
 * (App\Support\UiIcon); ['mask' => …] is a picture drawn in Figma, kept as is.
 */
final class TabIcons
{
    /** The scene's look (resources/ui-icons/look.svg). */
    public const FORMAT = ['ui' => 'look'];

    /** A ball on its dashed path over the ground: motion (Figma 2559:1977). */
    /** Bart's Motion icon (Figma 2607:2626) as drawn: the file is a mask, so it takes the tab's colour. */
    public const MOTION = ['mask' => 'images/icons/motion.svg', 'class' => 'h-3.5 w-[23px]'];

    /** Its sound (resources/ui-icons/sound.svg). */
    public const MUSIC = ['ui' => 'sound'];
}
