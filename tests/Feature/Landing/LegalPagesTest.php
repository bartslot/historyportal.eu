<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * Privacy and terms have to be reachable at stable URLs: the Google, Microsoft and Apple sign-in
 * consent screens link to them, and a sign-up form without them cannot ask for consent.
 */
class LegalPagesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    public function test_the_privacy_policy_renders_at_a_stable_url(): void
    {
        $this->get('/privacy')
            ->assertOk()
            ->assertSee('Privacy policy')
            ->assertSee('We do not sell your data')
            ->assertSee('info@historyportal.eu');
    }

    public function test_the_terms_render_and_link_to_the_privacy_policy(): void
    {
        $this->get('/terms')
            ->assertOk()
            ->assertSee('Terms of use')
            ->assertSee(route('privacy'), false);
    }

    public function test_the_landing_footer_links_both_pages(): void
    {
        $this->get('/privacy')
            ->assertSee('href="'.route('privacy').'"', false)
            ->assertSee('href="'.route('terms').'"', false);
    }

    public function test_the_legal_text_uses_no_dashes_as_punctuation(): void
    {
        // Copy rule: never an em dash in text a visitor reads.
        foreach (['privacy', 'terms'] as $page) {
            $text = strip_tags((string) file_get_contents(resource_path("views/legal/{$page}.blade.php")));
            $this->assertStringNotContainsString('—', $text, "{$page} contains an em dash");
        }
    }
}
