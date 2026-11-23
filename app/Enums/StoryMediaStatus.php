<?php

declare(strict_types=1);

namespace App\Enums;

enum StoryMediaStatus: string
{
    /** Planned from the script, nothing spent yet. */
    case Planned = 'planned';
    case Queued = 'queued';
    case Generating = 'generating';
    /** Made, waiting for the teacher. */
    case Ready = 'ready';
    case Approved = 'approved';
    case Failed = 'failed';

    public function isBusy(): bool
    {
        return $this === self::Queued || $this === self::Generating;
    }

    public function label(): string
    {
        return match ($this) {
            self::Planned => __('Not made yet'),
            self::Queued => __('Waiting'),
            self::Generating => __('Making…'),
            self::Ready => __('Ready to check'),
            self::Approved => __('Approved'),
            self::Failed => __('Failed'),
        };
    }
}
