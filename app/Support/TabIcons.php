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

    /** A sheet with a ragged painted edge: the picture's mask (paper edge). */
    public const MASK = 'M4.5 6.5c1.6-.9 3 .4 4.6-.3s2.7-.8 4.2-.1 2.9.6 4.4-.2c.9.7 1 2 .6 3.2-.5 1.5.4 2.6 0 4.1-.4 1.4.5 2.4-.1 3.9-1.5.9-2.9-.3-4.5.3s-2.7.7-4.2.1-3 .5-4.6-.2c-.7-1.4.3-2.6-.1-4s-.5-2.6.1-4c.4-1 .1-1.9-.4-2.8Z';
}
