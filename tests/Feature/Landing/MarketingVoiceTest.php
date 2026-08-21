<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The public surfaces, held to the voice Bart set.
 *
 * He rejected the old tagline outright: "this looks like AI slop. The typical title and subtitle
 * with a subheading. Companies with good UX don't use that. I don't like that catchphrase either
 * on the email templates."
 *
 * Then he wrote the standard himself, in Dutch: "Verhalen waarvan je klas wil weten hoe het
 * afloopt. Wat als geschiedenis niet voelt als een les? Ontdek echte schilderijen, meeslepende
 * verhalen en een spel waarmee je klas zelf verder gaat."
 *
 * These are absolutes, not relative checks. A test that only asserted the new lines were present
 * would still pass with the old tagline sitting next to them, which is exactly the regression
 * worth catching: nobody deletes a tagline on purpose, it gets pasted back from a stale doc.
 * Asserting on RENDERED html rather than on the view files is deliberate too, so that
 * docs/brand-guidelines.md and CLAUDE.md can keep naming the banned line in order to forbid it.
 */
class MarketingVoiceTest extends TestCase
{
    use RefreshDatabase;

    /** Every public marketing page, by path. */
    private const PUBLIC_PAGES = ['/', '/about', '/launch', '/hero-preview'];

    /**
     * The rejected tagline, in every casing it was found in. Matched case-insensitively on a
     * fragment rather than the whole line, so a reworded variant ("Where Storytelling Meets
     * Teaching") is caught as well.
     */
    private const REJECTED_TAGLINE = [
        'storytelling meets',
        'meets learning',
        'teacher-centric',
        'results-driven',
    ];

    /**
     * Words that mark copy as interchangeable with any other EdTech homepage. Bart's test: "if it
     * could sit on any EdTech homepage, it is wrong." Note "learners" and "educators" — the copy
     * says "your class" and "you", because a teacher has a class, not a user base.
     */
    private const GENERIC_EDTECH = [
        'learners',
        'educators',
        'empowering',
        'cutting-edge',
        'seamless',
        'revolutionis',
        'revolutioniz',
        'supercharge',
        'game-changing',
        'transforms k-12',
        'come alive',
    ];

    /** @return array<string, array{string}> */
    public static function publicPages(): array
    {
        return array_combine(
            self::PUBLIC_PAGES,
            array_map(fn (string $path) => [$path], self::PUBLIC_PAGES),
        );
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('publicPages')]
    public function test_the_rejected_tagline_appears_on_no_public_page(string $path): void
    {
        $html = $this->get($path)->assertOk()->getContent();

        foreach (self::REJECTED_TAGLINE as $fragment) {
            $this->assertStringNotContainsStringIgnoringCase(
                $fragment,
                $html,
                "The rejected tagline fragment '{$fragment}' is back on {$path}."
            );
        }
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('publicPages')]
    public function test_no_public_page_uses_generic_edtech_vocabulary(string $path): void
    {
        $html = $this->get($path)->assertOk()->getContent();

        foreach (self::GENERIC_EDTECH as $word) {
            $this->assertStringNotContainsStringIgnoringCase(
                $word,
                $html,
                "'{$word}' is copy any EdTech homepage could run. Say what this product actually does on {$path}."
            );
        }
    }

    public function test_the_landing_page_promises_an_experience_rather_than_a_category(): void
    {
        $html = $this->get('/')->assertOk()->getContent();

        // The meta description is the line a search result shows, so it carries the promise
        // rather than naming the category.
        $this->assertStringContainsString('wants to see the end of', $html);
    }

    public function test_the_landing_page_speaks_to_the_teachers_own_class(): void
    {
        $html = $this->get('/')->assertOk()->getContent();

        $this->assertStringContainsString('your class', strtolower($html));
    }
}
