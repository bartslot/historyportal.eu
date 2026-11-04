<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * PageSpeed mobile, 2026-11-04: LCP 6.3 s on slow 4G. The home page shipped livewire.min.js with no
 * Livewire component and no Alpine on it, and gave fetchpriority=high to pictures the demo keeps
 * hidden, so they raced the sprite sheets the demo actually waits on.
 */
class HomeMobilePerformanceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_the_home_page_does_not_load_livewire(): void
    {
        $this->get('/')->assertOk()->assertDontSee('livewire.min.js', false);
    }

    public function test_the_about_page_still_loads_livewire_for_its_product_tour(): void
    {
        $this->get('/about')->assertOk()->assertSee('livewire.min.js', false);
    }

    public function test_only_the_demo_sprite_sheets_are_high_priority(): void
    {
        $html = $this->get('/')->getContent();

        preg_match_all('/<img[^>]*fetchpriority="high"[^>]*>/', $html, $matches);

        foreach ($matches[0] as $img) {
            $this->assertMatchesRegularExpression('/data-timewarp-(lesson-)?atlas/', $img);
        }
    }
}
