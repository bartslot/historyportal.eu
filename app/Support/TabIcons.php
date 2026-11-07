<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Icons for the inspector's icon tabs (<x-ui.segmented>). A string is a 24px outline path drawn at
 * stroke 1.5, like every Heroicon in the app; an array is a filled glyph copied from Figma as is.
 */
final class TabIcons
{
    /** A brush: the scene's look. */
    public const FORMAT = 'M11.1 11.1 18.1 4.1a1.3 1.3 0 0 1 1.8 1.8l-7 7M12.9 12.9a3.6 3.6 0 0 0-5.1 0c-1.3 1.3-.9 3.1-1.8 4.2-.5.6-1.3 1-1.8 1.2 1.5 1.5 4.6 2.2 7 .5 2.3-1.6 3-4.2 1.7-5.9';

    /** A ball on its dashed path over the ground: motion (Figma 2559:1977). */
    /** Bart's Motion icon (Figma 2607:2626) as drawn: the file is a mask, so it takes the tab's colour. */
    public const MOTION = ['mask' => 'images/icons/motion.svg', 'class' => 'h-3.5 w-[23px]'];

    /** Two beamed notes. */
    public const MUSIC = 'M8.5 18V6.5l11-2.5V16M8.5 9.5l11-2.5M3.5 18a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M14.5 16a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0';
}
