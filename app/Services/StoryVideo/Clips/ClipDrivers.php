<?php

declare(strict_types=1);

namespace App\Services\StoryVideo\Clips;

use InvalidArgumentException;

/** The clip driver named by story_video.clip_driver. Add a driver here and in config/story_video.php. */
final class ClipDrivers
{
    /** @var array<string, class-string<ClipDriver>> */
    private const DRIVERS = [
        'elevenlabs' => ElevenLabsClipDriver::class,
        'render_pc' => RenderPcClipDriver::class,
        'studio' => StudioClipDriver::class,
    ];

    public static function make(?string $name = null): ClipDriver
    {
        $name ??= (string) config('story_video.clip_driver', 'elevenlabs');
        $class = self::DRIVERS[$name] ?? throw new InvalidArgumentException("Unknown clip driver [{$name}].");

        return app($class);
    }
}
