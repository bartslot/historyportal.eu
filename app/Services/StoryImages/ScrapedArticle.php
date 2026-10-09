<?php

declare(strict_types=1);

namespace App\Services\StoryImages;

/**
 * A scraped history article, split into scene-sized sections with their images.
 *
 * The narration budget is the hard ceiling on lesson length: a lesson caps at
 * ~11 min of kid-paced narration (~130 wpm → ~1,430 words). Sections are handed a
 * word budget proportional to their length, so long articles compress harder while
 * the total stays within the cap. Images swap every ~9s inside a scene.
 */
final class ScrapedArticle
{
    /** Narration budget for an ~11-minute lesson (words), at ~130 wpm. */
    public const DEFAULT_NARRATION_WORDS = 1430;

    /** Seconds of narration a single image covers before the next swaps in. */
    public const SECONDS_PER_IMAGE = 9;

    /** @param list<ScrapedSection> $sections */
    public function __construct(
        public readonly string $url,
        public readonly string $source,   // 'worldhistory' | 'historiek'
        public readonly string $lang,     // 'en' | 'nl'
        public readonly string $title,
        public readonly array $sections,
    ) {}

    public function totalWords(): int
    {
        return array_sum(array_map(fn (ScrapedSection $s) => $s->wordCount, $this->sections));
    }

    /** @return list<ScrapedImage> */
    public function images(): array
    {
        return array_merge(...array_map(fn (ScrapedSection $s) => $s->images, $this->sections)) ?: [];
    }

    /** article words ÷ narration budget, e.g. 2.9 means "compress ~3:1". */
    public function shrinkRatio(int $narrationWords = self::DEFAULT_NARRATION_WORDS): float
    {
        return round($this->totalWords() / max(1, $narrationWords), 1);
    }
}
