<?php

declare(strict_types=1);

namespace App\Services\Captions;

use Throwable;

/**
 * Stands in for the real translator in tests and offline runs (captions:translate --fake): it
 * prefixes each line with the target language, so a cached line is easy to tell from the original.
 * Counts its calls, which is how the tests prove the cache keeps a second request from paying.
 * `failures` scripts a provider that refuses: each call takes the next entry, and an exception
 * there is thrown instead of answering (null answers normally).
 */
final class FakeTextTranslator implements TextTranslator
{
    /** @var list<array<string, string>> */
    public array $calls = [];

    /** @var list<Throwable|null> */
    public array $failures = [];

    public function translate(array $lines, string $from, string $to): array
    {
        $this->calls[] = $lines;
        $failure = array_shift($this->failures);
        if ($failure instanceof Throwable) {
            throw $failure;
        }

        return array_map(fn (string $line): string => "[{$to}] {$line}", $lines);
    }
}
