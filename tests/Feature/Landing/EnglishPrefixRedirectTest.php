<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Tests\TestCase;

/**
 * English lives at the root, so /en was a 404. It is what a visitor types to get the English site
 * (and what Bart might type in a demo), so it leads home instead (2026-10-24).
 */
class EnglishPrefixRedirectTest extends TestCase
{
    public function test_en_goes_to_the_english_homepage(): void
    {
        $this->get('/en')->assertRedirect('/')->assertStatus(301);
    }

    public function test_an_en_path_keeps_its_path(): void
    {
        $this->get('/en/pricing')->assertRedirect('/pricing')->assertStatus(301);
    }
}
