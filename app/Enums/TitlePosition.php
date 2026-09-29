<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Where the lesson title block sits on the title screen. Presets, not free placement: every one
 * of them stays readable at any screen size. Bottom-right is not offered, the join QR lives there.
 */
enum TitlePosition: string
{
    case TopLeft = 'top-left';
    case TopCenter = 'top-center';
    case TopRight = 'top-right';
    case Center = 'center';
    case BottomLeft = 'bottom-left';
    case BottomCenter = 'bottom-center';

    public function label(): string
    {
        return match ($this) {
            self::TopLeft => __('Top left'),
            self::TopCenter => __('Top centre'),
            self::TopRight => __('Top right'),
            self::Center => __('Centre'),
            self::BottomLeft => __('Bottom left'),
            self::BottomCenter => __('Bottom centre'),
        };
    }

    /** The block is centred horizontally (text and rows centre with it). */
    public function isCentred(): bool
    {
        return in_array($this, [self::TopCenter, self::Center, self::BottomCenter], true);
    }
}
