<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * History Portal is a European product: prices are in euros, written the way each language writes
 * money (Bart, 2026-10-13: "yes euros"). The page used to show "$1,680" to Dutch teachers.
 */
class PricingCurrencyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_the_dutch_page_writes_euros_the_dutch_way(): void
    {
        $html = $this->get('/nl')->assertOk()->getContent();

        $this->assertStringContainsString('€ 1.680', $this->text($html));
        $this->assertStringNotContainsString('$', $this->pricing($html));
    }

    public function test_the_english_page_writes_euros_the_english_way(): void
    {
        $html = $this->get('/')->assertOk()->getContent();

        $this->assertStringContainsString('€1,680', $this->text($html));
        $this->assertStringNotContainsString('$', $this->pricing($html));
    }

    /** The pricing section only: Alpine and Livewire put `$` in scripts elsewhere on the page. */
    private function pricing(string $html): string
    {
        preg_match('#<section id="pricing".*?</section>#s', $html, $m);
        $section = preg_replace('#<(script|style)[^>]*>.*?</\1>#s', '', $m[0] ?? '');

        return $this->text(preg_replace('#\s(x-[a-z:.-]+|@[a-z.]+|:[a-z-]+)="[^"]*"#', '', $section));
    }

    private function text(string $html): string
    {
        return preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5));
    }
}
