<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * Pair test round 4: the homepage carousel arrows said "Previous"/"Next" on /nl. The landing
 * layout never published the JS dictionary, so every t() on a public page fell back to English.
 */
class JsLangOnPublicPagesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_the_dutch_homepage_publishes_the_js_dictionary_with_the_carousel_arrows(): void
    {
        $html = $this->get('/nl')->assertOk()->getContent();

        $dict = $this->dictionary($html);
        $this->assertSame('Vorige', $dict['Previous'] ?? null);
        $this->assertSame('Volgende', $dict['Next'] ?? null);
    }

    /** @return array<string,string> the dictionary as the browser receives it */
    private function dictionary(string $html): array
    {
        $this->assertMatchesRegularExpression("/window\\.__lpLang = JSON\\.parse\\('(.*?)'\\)/", $html);
        preg_match("/window\\.__lpLang = JSON\\.parse\\('(.*?)'\\)/", $html, $m);

        return json_decode(json_decode('"'.$m[1].'"'), true) ?? [];
    }

    public function test_the_guest_layout_publishes_it_too(): void
    {
        $this->assertStringContainsString('window.__lpLang', $this->get(route('login'))->assertOk()->getContent());
    }
}
