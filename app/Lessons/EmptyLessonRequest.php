<?php

declare(strict_types=1);

namespace App\Lessons;

use Illuminate\Support\Str;

/**
 * "Cartografie, empty lesson" typed in the lesson chat: the teacher wants a blank lesson with that
 * title, to fill by hand in the editor (a YouTube video, their own pictures), not the lesson maker.
 * Bart, 2026-11-25. Recognised in the six interface languages; no LLM call, so it is instant.
 */
final class EmptyLessonRequest
{
    private const TITLE_LIMIT = 120;

    /** "empty lesson" and its siblings. Matched case-insensitively, on word boundaries. */
    private const PHRASES = [
        '(?:empty|blank)\s+(?:lesson|class)',
        '(?:lege|blanco)\s+les(?:je)?',
        'leere[n]?\s+(?:lektion|stunde|unterrichtsstunde)',
        '(?:leçon|cours)\s+vide',
        'lezione\s+vuota',
        '(?:lección|clase)\s+vacía',
    ];

    /** Words that can sit before the phrase or the title and are never part of it. */
    private const FILLER = '(?:please|just|make|create|start|give\s+me|i\s+want|a|an|new|'
        .'graag|maak|ik\s+wil|een|nieuwe|'
        .'bitte|mach|erstelle|eine|neue|'
        .'crée|créer|une|nouvelle|'
        .'crea|creare|una|nuova|'
        .'haz|crear|nueva|'
        .'called|named|titled|genaamd|getiteld|met\s+de\s+titel|namens|mit\s+dem\s+titel|'
        .'intitulée|appelée|chiamata|intitolata|llamada|titulada|'
        .'about|over|über|sur|sobre|for|voor|für|pour|para)';

    /** The lesson title when the goal names an empty lesson, else null (the normal chat runs). */
    public static function title(string $goal): ?string
    {
        $pattern = '/(?<![\pL\pN])(?:'.implode('|', self::PHRASES).')(?![\pL\pN])/iu';
        if (preg_match($pattern, $goal) !== 1) {
            return null;
        }

        $rest = (string) preg_replace($pattern, "\n", $goal, 1);
        // The title is the first line with words left on it: "Cartografie" from
        // "Cartografie, empty lesson\nI just want to add a video myself."
        $title = '';
        foreach (preg_split('/\R|(?<=[.!?])\s+/u', $rest) ?: [] as $line) {
            $line = self::trim($line);
            for ($previous = null; $previous !== $line;) {
                $previous = $line;
                $line = self::trim((string) preg_replace('/^'.self::FILLER.'(?![\pL\pN])|(?<![\pL\pN])'.self::FILLER.'$/iu', '', $line));
            }
            if ($line !== '') {
                $title = $line;
                break;
            }
        }

        $title = Str::limit($title, self::TITLE_LIMIT, '');

        return $title !== '' ? Str::ucfirst($title) : __('New lesson');
    }

    private static function trim(string $text): string
    {
        return (string) preg_replace('/^[\s\p{P}]+|[\s\p{P}]+$/u', '', $text);
    }
}
