<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * The small-text floor for the teacher app (PM decision, 2026-10-28).
 *
 * Any text a teacher reads or clicks in panels, inspectors, toolbars, toggles, helper text, links,
 * menus and dialogs is at least 12px. Helper prose is at least 13px. The 8px step (`text-3xs`) is
 * for decorative micro-labels on stage art, posters or cards only.
 *
 * TypeScaleTest already forbids bracketed sizes at or below 12px. This test closes the other gap:
 * `text-3xs` is a named token, so TypeScaleTest never sees it, and that is how the 8px toggle labels
 * shipped. This test fails on any `text-3xs` in the teacher-facing scope that is not on the
 * allowlist below, and on any bracketed or inline size under 12px in the same scope.
 *
 * To allow a new decorative 8px label, add the file and the exact count here, with the reason.
 * Do not raise a count to make a failure go away: move the text up to `text-xs` instead.
 */
class SmallTextFloorTest extends TestCase
{
    /** Paths the floor applies to. Every teacher-facing panel, inspector, control and wizard view. */
    private const SCOPE = [
        'resources/views/components/ui',
        'resources/views/components/lesson',
        'resources/views/components/wizard',
        'resources/views/livewire',
        'resources/views/lesson/player.blade.php',
        'resources/views/teacher',
    ];

    /** Printed, not on screen: a literal size is correct there (see TypeScaleTest). */
    private const EXCLUDED = [
        'resources/views/teacher/answer-sheet.blade.php',
    ];

    /**
     * Decorative 8px labels that sit on stage art, a poster, or a card, never on a control.
     * Format: relative path => exact number of `text-3xs` occurrences allowed in that file.
     */
    private const ALLOWED_MICRO_LABELS = [
        // Scene number and "Title" tag painted on a thumbnail of the stage.
        'resources/views/components/lesson/scene-thumb.blade.php' => 2,
        'resources/views/components/lesson/timeline.blade.php' => 1,
        // "plan" and correctness badges on an art thumbnail in the wizard picker.
        'resources/views/livewire/wizard/step3-scene-configurator.blade.php' => 2,
    ];

    private const SIZE_CEILING_PX = 12.0;

    public function test_no_teacher_facing_view_uses_the_8px_step_outside_the_allowlist(): void
    {
        $offenders = [];

        foreach ($this->bladeFiles() as $relative => $path) {
            $count = substr_count((string) file_get_contents($path), 'text-3xs');
            $allowed = self::ALLOWED_MICRO_LABELS[$relative] ?? 0;

            $tagged = substr_count((string) file_get_contents($path), 'data-micro-label');
            $taggedAllowed = $allowed;
            if ($tagged !== $taggedAllowed) {
                $offenders[] = "{$relative}: {$tagged} data-micro-label, {$taggedAllowed} allowed (the label and its tag must match)";
            }

            if ($count > $allowed) {
                $offenders[] = "{$relative}: {$count} text-3xs, {$allowed} allowed";
            }
        }

        $this->assertSame([], $offenders, implode("\n", array_merge(
            ['text-3xs (8px) is for decorative micro-labels on stage art, posters or cards only.',
                'Use text-xs (12px) for labels, controls and helper text.'],
            $offenders,
        )));
    }

    public function test_no_stale_allowlist_entries(): void
    {
        $stale = [];

        foreach (self::ALLOWED_MICRO_LABELS as $relative => $allowed) {
            $path = dirname(__DIR__, 2).'/'.$relative;
            $count = is_file($path) ? substr_count((string) file_get_contents($path), 'text-3xs') : 0;

            if ($count !== $allowed) {
                $stale[] = "{$relative}: allowlist says {$allowed}, file has {$count}";
            }
        }

        $this->assertSame([], $stale, 'Keep the allowlist exact so it cannot hide new uses.');
    }

    /**
     * The sizes are declared in one place. A second @theme block redefined them at 11px and 8px
     * and silently won over brand-kit.css, so the floor fix did nothing until it was found in the
     * browser. This keeps the single source single.
     */
    public function test_the_small_text_sizes_are_declared_only_in_brand_kit(): void
    {
        $root = dirname(__DIR__, 2);

        foreach (['resources/css/app.css', 'resources/css/brand-kit.css'] as $file) {
            $css = (string) file_get_contents("{$root}/{$file}");
            $declarations = preg_match_all('/--text-(2xs|3xs):\s*[0-9.]+rem/', $css);

            $expected = $file === 'resources/css/brand-kit.css' ? 2 : 0;
            $this->assertSame($expected, $declarations, "{$file} must declare --text-2xs/--text-3xs only in brand-kit.css");
        }
    }

    public function test_no_size_below_12px_is_written_as_a_literal_in_scope(): void
    {
        $offenders = [];
        $patterns = [
            '/text-\[([0-9.]+)px\]/',
            '/font-size:\s*([0-9.]+)px\b/',
        ];

        foreach ($this->bladeFiles() as $relative => $path) {
            foreach (file($path) as $i => $line) {
                foreach ($patterns as $pattern) {
                    if (preg_match_all($pattern, $line, $m)) {
                        foreach ($m[1] as $px) {
                            if ((float) $px < self::SIZE_CEILING_PX) {
                                $offenders[] = "{$relative}:".($i + 1)." sets {$px}px";
                            }
                        }
                    }
                }
            }
        }

        $this->assertSame([], $offenders, 'Sizes under 12px are not allowed in teacher-facing views.');
    }

    /** @return array<string, string> relative path => absolute path, for every blade file in scope */
    private function bladeFiles(): array
    {
        $root = dirname(__DIR__, 2);
        $files = [];

        foreach (self::SCOPE as $entry) {
            $absolute = "{$root}/{$entry}";

            if (is_file($absolute)) {
                $files[$entry] = $absolute;

                continue;
            }

            $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($absolute));
            foreach ($iterator as $file) {
                if ($file->isFile() && str_ends_with($file->getFilename(), '.blade.php')) {
                    if (in_array(str_replace("{$root}/", '', $file->getPathname()), self::EXCLUDED, true)) {
                        continue;
                    }
                    $files[str_replace("{$root}/", '', $file->getPathname())] = $file->getPathname();
                }
            }
        }

        ksort($files);

        return $files;
    }
}
