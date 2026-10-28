<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Raw Tailwind slate and sky text colours may only go down in the teacher-facing views.
 *
 * Raw shades are not theme tokens, so nothing stops a new grey from landing below 4.5:1 on the dark
 * panels. The 2026-10-28 check measured 261 raw greys failing AA, and it found them by hand. This
 * keeps the count honest: a text colour should be a token (`text-panel-hint`, `text-panel-label`,
 * `text-panel-link`, `text-panel-value`) or a DaisyUI semantic class.
 *
 * The count is a RATCHET. BASELINE is what is left today. It can only fall. When you convert a use,
 * lower BASELINE in the same change. Raising it to make a failure go away is the thing this exists
 * to stop.
 */
class TextColourRatchetTest extends TestCase
{
    /** Raw `text-slate-*` and `text-sky-*` left in the teacher-facing views. Lower it, never raise it. */
    private const BASELINE = 294;

    private const SCOPE = [
        'resources/views/components/lesson',
        'resources/views/components/ui',
        'resources/views/components/wizard',
        'resources/views/livewire',
        'resources/views/teacher',
        'resources/views/lesson',
    ];

    public function test_raw_slate_and_sky_text_colours_only_go_down(): void
    {
        $root = dirname(__DIR__, 2);
        $count = 0;

        foreach (self::SCOPE as $dir) {
            $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator("{$root}/{$dir}"));
            foreach ($iterator as $file) {
                if (! $file->isFile() || ! str_ends_with($file->getFilename(), '.blade.php')) {
                    continue;
                }
                $count += preg_match_all('/\btext-(?:slate|sky)-\d+\b/', (string) file_get_contents($file->getPathname()));
            }
        }

        $this->assertLessThanOrEqual(
            self::BASELINE,
            $count,
            "Raw text-slate/text-sky went UP to {$count} (baseline ".self::BASELINE.'). Use a panel token instead: text-panel-hint, text-panel-label, text-panel-link or text-panel-value.',
        );
    }
}
