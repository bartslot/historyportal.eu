<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Articles that live in this app as a page of their own, listed on the articles page next to what
 * WordPress publishes. Same fields as WordPressContent::normalise, plus `url`.
 */
final class OwnArticles
{
    public const TIJDVAKKEN_EXCERPT = 'De basisschool gaat waarschijnlijk van tien naar zes tijdvakken. Welke tijdvakken samengaan, welke 16 ontwikkelingen erbij horen en wat er al vaststaat.';

    /** @return Collection<int,array<string,mixed>> */
    public static function all(): Collection
    {
        return collect([[
            'slug' => 'nieuwe-tijdvakken',
            'title' => 'Van tien naar zes tijdvakken',
            'excerpt' => self::TIJDVAKKEN_EXCERPT,
            'language' => 'nl',
            'image' => null,
            // ponytail: counted by hand (662 words), recount if the page grows much
            'reading_minutes' => 4,
            'published_at' => Carbon::parse('2026-11-04'),
            'url' => route('public.new-tijdvakken'),
        ]]);
    }
}
