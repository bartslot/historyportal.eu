<?php

declare(strict_types=1);

namespace App\Services\Captions;

/**
 * Turns a batch of subtitle lines into another language. Keys in, same keys out; a line the
 * provider could not translate is left out of the result rather than returned untranslated.
 *
 * Lines arrive with their protected spans already swapped for ⟦n⟧ markers (proper names, crew
 * placeholders); an implementation must hand every marker back unchanged.
 */
interface TextTranslator
{
    /**
     * @param  array<string, string>  $lines  key => text
     * @return array<string, string> key => translated text
     */
    public function translate(array $lines, string $from, string $to): array;
}
