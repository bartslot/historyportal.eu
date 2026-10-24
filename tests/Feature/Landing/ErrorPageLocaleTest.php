<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * Pair test round 5: a 404 under /nl/... was English. No route matched, so no locale middleware
 * ran; the error page now takes its language from the URL prefix, then the browser.
 */
class ErrorPageLocaleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_a_404_under_nl_is_dutch_with_a_dutch_lang_and_dictionary(): void
    {
        $html = $this->withHeader('Accept-Language', 'en-US,en;q=0.9')
            ->get('/nl/deze-pagina-bestaat-niet')
            ->assertNotFound()
            ->getContent();

        $this->assertStringContainsString('<html lang="nl"', $html);
        $this->assertStringContainsString('Die pagina bestaat niet', $html);
        $this->assertStringContainsString('window.__lpLang', $html);
        $this->assertStringContainsString('Vorige', json_decode('"'.(preg_match("/__lpLang = JSON\\.parse\\('(.*?)'\\)/", $html, $m) ? $m[1] : '').'"'));
    }

    public function test_an_unprefixed_404_follows_the_browser(): void
    {
        $html = $this->withHeader('Accept-Language', 'de-DE,de;q=0.9')
            ->get('/gibt-es-nicht')
            ->assertNotFound()
            ->getContent();

        $this->assertStringContainsString('<html lang="de"', $html);
    }

    public function test_an_english_404_stays_english(): void
    {
        $this->withHeader('Accept-Language', 'en-US,en;q=0.9')
            ->get('/does-not-exist')
            ->assertNotFound()
            ->assertSee('That page does not exist');
    }
}
