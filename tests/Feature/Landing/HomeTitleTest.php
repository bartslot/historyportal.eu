<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * The home page's <title> says what a teacher searches for, then the brand (Bart, 2026-10-15: option A).
 * Since 2026-11-04 it also names the year groups: teachers search topic + year group, not "storytelling".
 * Past 60 characters x-seo drops the brand, so these titles stand alone.
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
        $this->get('/')->assertSee('<title>KS2 and KS3 history lessons your class wants to finish</title>', false);
    }

    public function test_the_dutch_home_title_is_dutch(): void
    {
        $this->get('/nl')->assertSee('<title>Geschiedenislessen groep 5 t/m 8 die je klas wil afmaken</title>', false);
    }

    public function test_every_language_has_its_own_home_title(): void
    {
        $titles = collect(['/', '/nl', '/de', '/fr', '/it'])
            ->map(fn ($path) => preg_match('#<title>(.*?)</title>#', $this->get($path)->getContent(), $m) ? $m[1] : null);

        $this->assertCount(5, $titles->unique());
    }

    public function test_the_dutch_home_description_names_the_year_groups(): void
    {
        $this->get('/nl')->assertSee('Geschiedenis voor groep 5 t/m 8', false);
    }
}
