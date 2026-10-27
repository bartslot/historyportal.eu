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

    /**
     * No shadow utility in any view (PM, 2026-10-17): dropdowns, popovers and modals separate from
     * the page by a 1px hairline and their own background, never a shadow. Comments and translated
     * text are left out of the scan; `shadow-none` removes one and is fine.
     *
     * The allowlist is exact (file => tokens), each with its reason:
     */
    private const SHADOW_ALLOWLIST = [
        // The spotlight: a huge spread shadow is the dimmed page around a cut-out. A scrim, not depth.
        'livewire/onboarding/welcome-tour.blade.php' => ['shadow-[0_0_0_9999px_rgba(2,6,23,0.85)]'],
        'components/landing/product-tour-panel.blade.php' => ['shadow-[0_0_0_9999px_rgb(2_6_23/var(--tour-dim))]'],
        // White text and icons over a picture nobody chose for contrast (the stage, a scene thumb):
        // the drop-shadow keeps them readable on a light painting. Legibility, not depth.
        'components/lesson/timeline.blade.php' => ['drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'],
        'components/lesson/scene-thumb.blade.php' => ['drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'],
        'components/wizard/style-picker.blade.php' => ['drop-shadow'],
        'components/lesson-player.blade.php' => ['drop-shadow-lg'],
        'lesson/player.blade.php' => [
            // The centre play/pause glyph has no plate (Bart 2026-10-21: "add some shadow").
            'drop-shadow-[0_6px_24px_rgba(0,0,0,0.6)]', 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]',
            'drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]', 'drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)]',
        ],
    ];

    public function test_no_view_uses_a_shadow_utility(): void
    {
        $found = [];
        foreach ((new Finder)->files()->in(dirname(__DIR__, 2).'/resources/views')->name('*.blade.php') as $file) {
            $code = preg_replace(['/\{\{--.*?--\}\}/s', '/<!--.*?-->/s', "/__\\('(?:[^'\\\\]|\\\\.)*'/s"], '', $file->getContents());
            preg_match_all('/(?<![\w-])(?:[a-z-]+:)*((?:drop-)?shadow(?:-[^\s"\'}]+)?)(?=[\s"\'}]|$)/', (string) $code, $m);
            $allowed = self::SHADOW_ALLOWLIST[$file->getRelativePathname()] ?? [];
            $bad = array_values(array_diff(array_unique($m[1]), ['shadow-none'], $allowed));
            if ($bad !== []) {
                $found[] = $file->getRelativePathname().': '.implode(' ', $bad);
            }
        }

        $this->assertSame([], $found);
    }

    /** DaisyUI gives .modal-box a 25px shadow; ours is a hairline instead. */
    public function test_a_modal_box_has_a_hairline_and_no_shadow(): void
    {
        $css = (string) file_get_contents(dirname(__DIR__, 2).'/resources/css/app.css');
        $this->assertMatchesRegularExpression('/\.modal-box\s*\{[^}]*box-shadow:\s*none[^}]*border:\s*1px solid var\(--color-panel-hairline\)/', $css);
    }

    /** Our stylesheets, comments left out. */
    private function css(): string
    {
        $css = '';
        foreach (['app.css', 'brand-kit.css'] as $file) {
            $css .= (string) file_get_contents(dirname(__DIR__, 2).'/resources/css/'.$file);
        }

        return (string) preg_replace('#/\*.*?\*/#s', '', $css);
    }

    /** No box-shadow in our CSS but `none` (PM, 2026-10-17): no glows, no depth, white or amber. */
    public function test_the_stylesheets_cast_no_shadow(): void
    {
        preg_match_all('/(?<![\w-])box-shadow\s*:\s*([^;}]+)/', $this->css(), $m);
        // The one allowed: the landing hero's typing caret is a zero-width box whose 2px line is
        // this offset (no blur, no spread). A border would give the caret width, and a caret with
        // width can wrap onto the next line by itself. A line, not a shadow.
        $allowed = ['2px 0 0 rgba(255, 255, 255, 0.85)'];
        $cast = array_values(array_filter(array_map('trim', $m[1]),
            fn (string $v) => ! preg_match('/^none(\s*!important)?$/', $v) && ! in_array($v, $allowed, true)));

        $this->assertSame([], $cast);
        // No hover lift in CSS either.
        $this->assertDoesNotMatchRegularExpression('/:hover\s*\{[^}]*transform:\s*translateY\(-/', $this->css());
    }

    /**
     * Keyboard focus stays VISIBLE (WCAG 2.4.7), flat: a field's focus is its border turning amber
     * (well over 3:1 on the dark panel), never a glow; nothing hides a :focus-visible outline.
     */
    public function test_focus_is_visible_and_flat(): void
    {
        $css = $this->css();
        $this->assertMatchesRegularExpression('/\.input:focus,\s*\.select:focus,\s*\.textarea:focus,\s*\.input:focus-within[^{]*\{[^}]*border-color:\s*var\(--color-primary\)/', $css);
        $this->assertDoesNotMatchRegularExpression('/:focus-visible[^{]*\{[^}]*outline:\s*(none|0)\b/', $css);
    }
}
