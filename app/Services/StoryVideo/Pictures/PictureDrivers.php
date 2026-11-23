<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Pictures;

use InvalidArgumentException;

/** The picture driver named by story_video.picture_driver. */
final class PictureDrivers
{
    /** @var array<string, class-string<PictureDriver>> */
    private const DRIVERS = [
        'chatgpt' => ChatGptPictureDriver::class,
        'elevenlabs' => ElevenLabsPictureDriver::class,
    ];

    public static function make(?string $name = null): PictureDriver
    {
        $name ??= (string) config('story_video.picture_driver', 'chatgpt');
        $class = self::DRIVERS[$name] ?? throw new InvalidArgumentException("Unknown picture driver [{$name}].");

        return app($class);
    }
}
