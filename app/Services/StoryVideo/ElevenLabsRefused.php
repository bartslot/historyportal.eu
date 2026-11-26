<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use RuntimeException;

/** ElevenLabs would not start a generation. Nothing was charged. `retryable` is true only when busy (429 / 5xx). */
final class ElevenLabsRefused extends RuntimeException
{
    public function __construct(string $message, public readonly bool $retryable = false)
    {
        parent::__construct($message);
    }
}
