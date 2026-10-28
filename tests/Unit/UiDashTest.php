<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/**
 * No em dash in anything a user reads as UI (PM copy rule, 2026-10-28).
 *
 * Bart's rule: no "—" in labels, options, placeholders, helper text or slider titles. The dash
 * reads as AI copy in an English-style UI, and each language has its own punctuation for the same
 * break. This test fails if a dash reaches a translation file or a user-visible Blade string.
 *
 * Scope, deliberately narrow so the test stays honest:
 *   - every value and key in lang/*.json (translations and the English source keys),
 *   - __() literals in Blade,
 *   - Blade text between tags and UI attributes (placeholder, aria-label, title, data-tooltip, alt).
 * Code comments are not UI and are ignored. So is the lone "—" used as an empty-value marker,
 * which reads as "none" and is not prose.
 */
class UiDashTest extends TestCase
{
    private const DASH = '—';

    /** Printed or mailed; the copy there is not in the teacher app. */
    private const EXCLUDED_BLADE = [
        'resources/views/emails/',
        'resources/views/pdf/',
        'resources/views/components/landing/',
        'resources/views/landing/',
    ];

    public function test_no_dash_in_any_translation_key_or_value(): void
    {
        $root = dirname(__DIR__, 2);
        $offenders = [];

        foreach (glob("{$root}/lang/*.json") ?: [] as $file) {
            $data = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);

            foreach ($data as $key => $value) {
                if (str_contains((string) $key, self::DASH) || (is_string($value) && str_contains($value, self::DASH))) {
                    $offenders[] = basename($file).': '.(string) $key;
                }
            }
        }

        $this->assertSame([], $offenders, "An em dash reached a translation. Rephrase with a colon, comma or full stop:\n".implode("\n", $offenders));
    }

    public function test_no_dash_in_a_blade_ui_string(): void
    {
        $root = dirname(__DIR__, 2);
        $offenders = [];

        foreach ($this->bladeFiles($root) as $relative => $path) {
            $text = $this->withoutComments((string) file_get_contents($path));

            foreach ($this->uiStrings($text) as $string) {
                if (str_contains($string, self::DASH) && ! preg_match('/[;{}]|\/\//', $string)) {
                    $offenders[] = "{$relative}: ".trim(preg_replace('/\s+/', ' ', $string));
                }
            }
        }

        $this->assertSame([], $offenders, "An em dash is in a user-visible Blade string:\n".implode("\n", $offenders));
    }

    /** @return list<string> the Blade-visible strings: __() literals, UI attributes and text between tags */
    private function uiStrings(string $text): array
    {
        $text = str_replace("'".self::DASH."'", '', $text);

        $patterns = [
            "/__\\((?:'[^']*'|\"[^\"]*\")/",
            '/\b(?:placeholder|aria-label|title|data-tooltip|alt)="[^"]*"/',
            '/>([^<>{}]*)</s',
        ];

        $strings = [];
        foreach ($patterns as $pattern) {
            preg_match_all($pattern, $text, $matches);
            array_push($strings, ...$matches[0]);
        }

        return $strings;
    }

    private function withoutComments(string $text): string
    {
        $text = preg_replace('/\{\{--.*?--\}\}/s', '', $text) ?? $text;
        $text = preg_replace('/<!--.*?-->/s', '', $text) ?? $text;

        return preg_replace('/<script.*?<\/script>|<style.*?<\/style>/s', '', $text) ?? $text;
    }

    /** @return array<string, string> relative path => absolute path, for Blade views in scope */
    private function bladeFiles(string $root): array
    {
        $files = [];
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator("{$root}/resources/views"));

        foreach ($iterator as $file) {
            if (! $file->isFile() || ! str_ends_with($file->getFilename(), '.blade.php')) {
                continue;
            }

            $relative = str_replace("{$root}/", '', $file->getPathname());
            foreach (self::EXCLUDED_BLADE as $skip) {
                if (str_starts_with($relative, $skip)) {
                    continue 2;
                }
            }

            $files[$relative] = $file->getPathname();
        }

        ksort($files);

        return $files;
    }
}
