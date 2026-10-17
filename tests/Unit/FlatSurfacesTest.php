<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Finder\Finder;

/**
 * The layout is flat (Bart, 2026-10-02: "site is flat layout, mostly. no shadow or rings. that
 * came from ai slop."; again 2026-10-17 on the card glow). Separation is surface steps and
 * hairlines; a card's hover only brightens its border. No hover lift, no hover shadow, no glow.
 */
class FlatSurfacesTest extends TestCase
{
    /** A hover lift, a hover shadow, or a hover halo (a ring that grows): a tile's hover only brightens its hairline. */
    private const LIFT_OR_SHADOW = '/(?:group-)?hover:(?:-translate-y-[\w.\[\]]+|shadow(?:-[\w\[\](),.%\/]+)?|ring-[2-8])(?=[\s"\'])/';

    public function test_no_view_lifts_or_shadows_on_hover(): void
    {
        $found = [];
        foreach ((new Finder)->files()->in(dirname(__DIR__, 2).'/resources/views')->name('*.blade.php') as $file) {
            if (preg_match_all(self::LIFT_OR_SHADOW, $file->getContents(), $m)) {
                $found[] = $file->getRelativePathname().': '.implode(' ', array_unique($m[0]));
            }
        }

        $this->assertSame([], $found);
    }

    public function test_a_card_has_no_shadow_or_glow(): void
    {
        $css = (string) file_get_contents(dirname(__DIR__, 2).'/resources/css/app.css');
        preg_match_all('/^\s*\.card(?::hover)?\s*\{[^}]*\}/m', $css, $rules);

        $this->assertNotEmpty($rules[0]);
        foreach ($rules[0] as $rule) {
            $this->assertStringNotContainsString('box-shadow', $rule, $rule);
        }
    }

    public function test_no_card_is_given_a_drop_shadow_in_markup(): void
    {
        $found = [];
        foreach ((new Finder)->files()->in(dirname(__DIR__, 2).'/resources/views')->name('*.blade.php') as $file) {
            if (preg_match_all('/class="[^"]*\bcard\b[^"]*\bshadow-(?:sm|md|lg|xl|2xl)\b[^"]*"/', $file->getContents(), $m)) {
                $found[] = $file->getRelativePathname();
            }
        }

        $this->assertSame([], $found);
    }
}
