<?php

declare(strict_types=1);

namespace App\Enums;

/** The three steps of story to video, in the order they run. */
enum StoryMediaKind: string
{
    case CharacterSheet = 'character_sheet';
    case WorldShot = 'world_shot';
    case Clip = 'clip';

    public function label(): string
    {
        return match ($this) {
            self::CharacterSheet => __('Characters'),
            self::WorldShot => __('Places'),
            self::Clip => __('Video'),
        };
    }

    /** The step that has to be approved first, or null for the first step. */
    public function previous(): ?self
    {
        return match ($this) {
            self::CharacterSheet => null,
            self::WorldShot => self::CharacterSheet,
            self::Clip => self::WorldShot,
        };
    }

    public function isVideo(): bool
    {
        return $this === self::Clip;
    }
}
