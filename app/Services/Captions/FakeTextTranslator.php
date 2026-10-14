<?php

declare(strict_types=1);

namespace App\Services\Captions;

/**
 * Stands in for the real translator in tests and offline runs (captions:translate --fake): it
 * prefixes each line with the target language, so a cached line is easy to tell from the original.
 * Counts its calls, which is how the tests prove the cache keeps a second request from paying.
 */
final class FakeTextTranslator implements TextTranslator
{
    /** @var list<array<string, string>> */
    public array $calls = [];

    public function translate(array $lines, string $from, string $to): array
    {
        $this->calls[] = $lines;

        return array_map(fn (string $line): string => "[{$to}] {$line}", $lines);
    }
}
