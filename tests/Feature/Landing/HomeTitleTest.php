<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * The home page's <title> says what a teacher searches for, then the brand (Bart, 2026-10-15: option A).
 * It was "History Portal" alone in every language: 14 characters, no search word, five identical titles.
 */
class HomeTitleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_the_english_home_title_leads_with_what_teachers_search_for(): void
    {
        $this->get('/')->assertSee('<title>History lessons your class wants to finish · History Portal</title>', false);
    }

    public function test_the_dutch_home_title_is_dutch(): void
    {
        $this->get('/nl')->assertSee('<title>Geschiedenislessen die je klas wil afmaken · History Portal</title>', false);
    }

    public function test_every_language_has_its_own_home_title(): void
    {
        $titles = collect(['/', '/nl', '/de', '/fr', '/it'])
            ->map(fn ($path) => preg_match('#<title>(.*?)</title>#', $this->get($path)->getContent(), $m) ? $m[1] : null);

        $this->assertCount(5, $titles->unique());
    }
}
