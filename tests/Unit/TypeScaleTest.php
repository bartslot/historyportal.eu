<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * Nothing outside the theme sets a font size.
 *
 * Tailwind stops at `text-xs` (12px) and this UI needs smaller, so for a long time every author
 * invented their own bottom of the scale in a bracket. It sprawled quietly: the ~10px band ended up
 * spelled four ways in 189 places, the ~11px band four ways in 108, a ~9px band three ways in 33 —
 * and one wizard screen rendered SIX different sizes under 12px at once. None of it was visible in
 * review, because each individual `text-[10px]` looks perfectly reasonable on its own line. That is
 * exactly the kind of drift a test catches and a human does not, which is why this exists.
 *
 * Two rules, deliberately different in strength:
 *
 *   1. The small-text scale is CLOSED. No arbitrary size at or below 12px, anywhere in scope. Use
 *      `text-2xs` (11px), `text-3xs` (8px) or `text-xs` (12px). This is a hard zero.
 *   2. The display scale above 12px is a RATCHET. What is left is listed in BASELINE below and may
 *      shrink, never grow. It is unresolved rather than approved — see the note on the constant.
 *
 * Excluded, each because it is a rendering target that never loads the Tailwind theme: the dompdf
 * templates, the mail templates (clients strip <style> and do not support custom properties) and
 * the printable answer sheet. Literal sizes are correct in all three.
 */
class TypeScaleTest extends TestCase
{
    /** Paths that never load app.css, so a theme token could not resolve even if we wrote one. */
    private const EXCLUDED = [
        'resources/views/pdf/',
        'resources/views/emails/',
        'resources/views/teacher/answer-sheet.blade.php',
    ];

    /** Below this, a bracketed size is always wrong: the scale has named steps for it. */
    private const SMALL_TEXT_CEILING_PX = 12.0;

    /**
     * The display sizes still written as literals, frozen so they cannot spread.
     *
     * These are NOT blessed. They are a second scale problem on a different surface — mostly the
     * student quiz overlay, which is read across a classroom and so has its own ladder — and
     * collapsing them changes what a class sees on a projector. That is a design decision worth
     * making deliberately rather than smuggling into a small-text cleanup. Listed here so the count
     * is visible and can only go down.
     *
     * Format: value => number of occurrences allowed across all in-scope files.
     */
    private const BASELINE = [
        '13px' => 10,
        '15px' => 9,
        '22px' => 1,
        '26px' => 1,
        '96px' => 1,
        '2.5rem' => 1,
        '0.95rem' => 1,
    ];

    /** Values that had no Tailwind step and now have a token — writing them raw is a regression. */
    private const TOKENISED = [
        'tracking-[0.18em]' => 'tracking-eyebrow',
        'tracking-[0.1em]' => 'tracking-widest',
        'leading-[1.05]' => 'leading-display',
        'leading-[0.95]' => 'leading-history',
    ];

    /** @return list<string> absolute paths of every blade/js file the theme actually reaches */
    private function filesInScope(): array
    {
        $root = dirname(__DIR__, 2);
        $found = [];

        foreach (['resources/views' => 'blade.php', 'resources/js' => 'js'] as $dir => $ext) {
            $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator("{$root}/{$dir}"));
            foreach ($it as $file) {
                if (! $file->isFile() || ! str_ends_with($file->getFilename(), $ext)) {
                    continue;
                }
                $relative = str_replace("{$root}/", '', $file->getPathname());
                foreach (self::EXCLUDED as $skip) {
                    if (str_starts_with($relative, $skip)) {
                        continue 2;
                    }
                }
                $found[] = $file->getPathname();
            }
        }

        sort($found);

        return $found;
    }

    /** Every font size written as a literal, as [relativePath, lineNumber, value]. */
    private function literalSizes(): array
    {
        $root = dirname(__DIR__, 2);
        $hits = [];

        // Two spellings of the same mistake: the Tailwind arbitrary utility, and a raw declaration
        // in an inline style or a JS-built CSS string. The utility form excludes a `/` suffix so a
        // size carrying a line-height (text-[13px]/[1.4]) is still reported by value, not skipped.
        $patterns = [
            '/text-\[([0-9.]+(?:px|rem))\]/',
            '/font-size:\s*([0-9.]+(?:px|rem))\b/',
        ];

        foreach ($this->filesInScope() as $path) {
            $relative = str_replace("{$root}/", '', $path);
            foreach (file($path) as $i => $line) {
                foreach ($patterns as $pattern) {
                    if (preg_match_all($pattern, $line, $m)) {
                        foreach ($m[1] as $value) {
                            $hits[] = [$relative, $i + 1, $value];
                        }
                    }
                }
            }
        }

        return $hits;
    }

    private static function toPx(string $value): float
    {
        return str_ends_with($value, 'rem')
            ? (float) $value * 16.0
            : (float) $value;
    }

    public function test_no_arbitrary_font_size_in_the_small_text_scale(): void
    {
        $offenders = [];

        foreach ($this->literalSizes() as [$file, $line, $value]) {
            if (self::toPx($value) <= self::SMALL_TEXT_CEILING_PX) {
                $offenders[] = "{$file}:{$line} sets {$value}";
            }
        }

        $this->assertSame([], $offenders, implode("\n", array_merge(
            ['A font size at or below 12px is written as a literal. The scale has a name for it:'],
            ['  11px and the whole ~9/10/11 band  ->  text-2xs   (or var(--text-2xs) in a style string)'],
            ['  8px, a micro-label on a tile      ->  text-3xs   (or var(--text-3xs))'],
            ['  12px                              ->  text-xs    (or var(--text-xs))'],
            [''],
            $offenders,
        )));
    }

    public function test_the_display_scale_above_12px_does_not_grow(): void
    {
        $counts = [];

        foreach ($this->literalSizes() as [, , $value]) {
            if (self::toPx($value) > self::SMALL_TEXT_CEILING_PX) {
                $counts[$value] = ($counts[$value] ?? 0) + 1;
            }
        }

        $grown = [];

        foreach ($counts as $value => $count) {
            $allowed = self::BASELINE[$value] ?? 0;
            if ($count > $allowed) {
                $grown[] = $allowed === 0
                    ? "{$value} is new ({$count}x) — give it a theme token rather than a bracket"
                    : "{$value} went from {$allowed} to {$count} uses";
            }
        }

        $this->assertSame([], $grown, implode("\n", array_merge(
            ['The display scale grew. These sizes are unresolved, not approved — do not add more:'],
            $grown,
        )));
    }

    public function test_tokenised_tracking_and_leading_are_not_written_raw(): void
    {
        $root = dirname(__DIR__, 2);
        $offenders = [];

        foreach ($this->filesInScope() as $path) {
            $relative = str_replace("{$root}/", '', $path);
            foreach (file($path) as $i => $line) {
                foreach (self::TOKENISED as $raw => $token) {
                    if (str_contains($line, $raw)) {
                        $offenders[] = "{$relative}:".($i + 1)." uses {$raw} — use {$token}";
                    }
                }
            }
        }

        $this->assertSame([], $offenders, implode("\n", array_merge(
            ['A value with a theme token is written as a bracket:'],
            $offenders,
        )));
    }

    /**
     * The tokens have to exist, and hold the values the rest of this suite assumes.
     *
     * Without this the other three tests pass happily against a theme where someone deleted
     * --text-2xs: every call site would say `text-2xs`, the utility would not be generated, and
     * every one of those 337 elements would silently fall back to inherited size. That failure is
     * invisible in markup and total on screen, which is the worst combination.
     */
    public function test_the_theme_declares_the_scale_it_is_measured_against(): void
    {
        $css = file_get_contents(dirname(__DIR__, 2).'/resources/css/brand-kit.css');

        $this->assertMatchesRegularExpression('/--text-2xs:\s*0\.6875rem/', $css, '--text-2xs must be 11px');
        $this->assertMatchesRegularExpression('/--text-3xs:\s*0\.5rem/', $css, '--text-3xs must be 8px');
        $this->assertMatchesRegularExpression('/--tracking-eyebrow:\s*0\.18em/', $css);
        $this->assertMatchesRegularExpression('/--leading-display:\s*1\.05/', $css);
        $this->assertMatchesRegularExpression('/--leading-history:\s*0\.95/', $css);

        // The card label is the same size wearing a semantic name. If it ever holds its own number
        // again, 11px has two sources of truth and they will drift.
        $this->assertMatchesRegularExpression('/--text-card-label:\s*var\(--text-2xs\)/', $css);
        $this->assertMatchesRegularExpression('/--text-card-label-sm:\s*var\(--text-3xs\)/', $css);
    }
}
