<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\UiIcon;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * The editor's interface icons: one file per meaning in resources/ui-icons, each drawn in the colour
 * of the text around it, and no new icon pasted inline into the editor's views.
 */
class UiIconTest extends TestCase
{
    /**
     * Inline <svg> elements left in the editor's views. A RATCHET: lower it when you move an icon into
     * resources/ui-icons, never raise it. Interface icons are <x-ui.icon name="…" /> (or uiIcon() in JS).
     * What stays inline is drawing, not icons: rulers, curves, thumbnails, the status dot.
     */
    private const INLINE_SVG_BASELINE = 114;

    private const EDITOR_VIEWS = [
        'resources/views/livewire/wizard',
        'resources/views/components/lesson',
        'resources/views/components/ui',
    ];

    public function test_every_icon_file_is_one_svg_in_the_text_colour(): void
    {
        $names = UiIcon::names();
        $this->assertNotEmpty($names);

        foreach ($names as $name) {
            $this->assertMatchesRegularExpression('/^[a-z0-9]+(-[a-z0-9]+)*$/', $name, "{$name}: icon names are kebab-case meanings.");

            $svg = UiIcon::svg($name);
            $this->assertStringStartsWith('<svg', $svg, "{$name}.svg must start with its <svg> element.");
            $this->assertSame(1, substr_count($svg, '<svg'), "{$name}.svg holds one <svg>.");
            $this->assertMatchesRegularExpression('/\bviewBox="/', $svg, "{$name}.svg needs a viewBox to scale.");
            $this->assertStringNotContainsString('class=', $svg, "{$name}.svg carries no size: the caller sets it.");
            $this->assertDoesNotMatchRegularExpression('/(?:fill|stroke)="#/', $svg, "{$name}.svg draws in currentColor, never a fixed colour.");
            $this->assertStringNotContainsStringIgnoringCase('<text', $svg, "{$name}.svg has text in it (a Noun Project credit line?).");
        }
    }

    public function test_attributes_go_on_the_root_and_win_over_the_files_own(): void
    {
        $svg = UiIcon::svg('check', ['class' => 'h-5 w-5', 'stroke-width' => '2.5', 'aria-hidden' => 'true']);

        $this->assertStringStartsWith('<svg class="h-5 w-5" stroke-width="2.5" aria-hidden="true"', $svg);
    }

    public function test_an_unknown_or_unsafe_name_is_refused(): void
    {
        $this->assertFalse(UiIcon::exists('../composer'));
        $this->expectException(InvalidArgumentException::class);
        UiIcon::svg('no-such-icon');
    }

    public function test_the_blade_component_draws_the_file(): void
    {
        $html = $this->blade('<x-ui.icon name="draw" class="h-5 w-5" />');

        $html->assertSee('data-icon="draw"', false);
        $html->assertSee('class="h-5 w-5"', false);
        $html->assertDontSee('h-4 w-4', false);
    }

    public function test_inline_svgs_in_the_editor_views_only_go_down(): void
    {
        $count = 0;
        foreach (self::EDITOR_VIEWS as $dir) {
            foreach (glob(base_path($dir).'/*.blade.php') ?: [] as $file) {
                $count += preg_match_all('/<svg\b/', (string) file_get_contents($file));
            }
        }

        $this->assertLessThanOrEqual(
            self::INLINE_SVG_BASELINE,
            $count,
            "Inline <svg> in the editor views went UP to {$count} (baseline ".self::INLINE_SVG_BASELINE.'). Add the icon to resources/ui-icons and draw it with <x-ui.icon name="…" />.',
        );
    }
}
