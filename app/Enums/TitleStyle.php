<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How the title screen draws the lesson's name. Comic and Logo need series artwork
 * (public/lesson-titles/{group}/poster.json, public/lesson-logos/{group}.svg); Plain always works.
 */
enum TitleStyle: string
{
    case Comic = 'comic';
    case Logo = 'logo';
    case Plain = 'plain';

    public function label(): string
    {
        return match ($this) {
            self::Comic => __('Comic poster'),
            self::Logo => __('Logo'),
            self::Plain => __('Plain title'),
        };
    }
}
