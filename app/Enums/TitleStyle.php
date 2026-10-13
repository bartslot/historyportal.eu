<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * How the title screen draws the lesson's name. Comic, Cover and Logo need series artwork
 * (public/lesson-titles/{group}/poster.json, public/lesson-titles/{group}/cover/poster.json,
 * public/lesson-logos/{group}.svg); Plain always works.
 */
enum TitleStyle: string
{
    case Comic = 'comic';
    case Cover = 'cover';
    case Logo = 'logo';
    case Plain = 'plain';

    public function label(): string
    {
        return match ($this) {
            self::Comic => __('Comic poster'),
            self::Cover => __('Comic cover'),
            self::Logo => __('Logo'),
            self::Plain => __('Plain title'),
        };
    }

    /** The poster folder under public/lesson-titles/{group}/ ('' = that folder), or null for no poster. */
    public function posterVariant(): ?string
    {
        return match ($this) {
            self::Comic => '',
            self::Cover => 'cover',
            self::Logo, self::Plain => null,
        };
    }
}
