<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Livewire\Features\SupportAutoInjectedAssets\SupportAutoInjectedAssets;
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
        // A static: an earlier test's Livewire component would otherwise inject the assets here.
        SupportAutoInjectedAssets::$hasRenderedAComponentThisRequest = false;
    }

    public function test_the_home_page_does_not_load_livewire(): void
    {
        $this->get('/')->assertOk()->assertDontSee('livewire.min.js', false);
    }

    public function test_the_about_page_still_loads_livewire_for_its_product_tour(): void
    {
        $this->get('/about')->assertOk()->assertSee('livewire.min.js', false);
    }

    public function test_a_phone_gets_a_small_copy_of_the_hour_picture(): void
    {
        // 453 KB and 2880 wide on a 375 wide screen (PageSpeed, 2026-11-06).
        $this->get('/')->assertSee('tour-scene-828.webp 828w', false);
    }

    public function test_nothing_hidden_is_requested_before_the_first_paint(): void
    {
        // PageSpeed 2026-11-06: whatever starts before the first paint counts against LCP.
        $this->get('/')
            ->assertDontSee(' src="'.asset('assets/timewarp-cards.webp').'"', false)
            ->assertSee('data-src="'.asset('assets/timewarp-cards.webp').'"', false)
            ->assertSee('<img src="'.asset('assets/videocards.webp').'" alt="" loading="lazy"', false);
    }

    public function test_the_home_page_has_a_main_landmark(): void
    {
        $this->get('/')->assertSee('<main>', false);
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
