<?php

declare(strict_types=1);

namespace App\Services\Support;

/**
 * Per-language pronunciation fixes applied to narration text JUST before TTS.
 *
 * TTS voices read loanwords in their own phonetics — the Dutch voices read the
 * Roman "limes" as English "laims" (founder catch 2026-07-13). The lexicon
 * substitutes a phonetic respelling in the SPOKEN text only; the script text
 * shown on screen/PDF is untouched. Plain-text level, so it works identically
 * across Azure, edge-tts and ElevenLabs.
 *
 * Note: on providers that return character alignment (ElevenLabs), a respelled
 * word can no longer match a shot anchor_sentence verbatim — anchor resolution
 * then falls back to the even-split timing that already ships.
 */
final class PronunciationLexicon
{
    /**
     * locale => [written form => spoken respelling]. Word-boundary matched, case preserved. A
     * written form ending in `*` also matches as the start of a compound (reserve → reservezeil).
     */
    private const LEXICON = [
        'nl' => [
            'limes' => 'liemes',
            // Initialisms are read as words unless they are spelled out: the Dutch voices said
            // "vok" for the VOC. Respelt with the Dutch letter names (vee, oo, cee) so it comes out
            // the way a teacher says it in class; "vee oh see" sounded English (Bart, 2026-10-18).
            // Spaces rather than hyphens: a hyphen makes the voice run the letters together again.
            'VOC' => 'vee oo cee',
            'WIC' => 'wee ie cee',
            // The Dutch voice read "reserve" and "reservezeil" the English way (Bart, 2026-10-18).
            'reserve*' => 'rezerve',
        ],
        'en' => [
            'VOC' => 'vee oh see',
        ],
    ];

    public static function apply(string $text, ?string $locale): string
    {
        $entries = self::LEXICON[$locale ?? ''] ?? [];

        foreach ($entries as $written => $spoken) {
            $prefix = str_ends_with($written, '*');
            $text = (string) preg_replace_callback(
                '/\b'.preg_quote(rtrim($written, '*'), '/').($prefix ? '' : '\b').'/iu',
                fn (array $m) => self::matchCase($m[0], $spoken),
                $text,
            );
        }

        return $text;
    }

    /** Carry the original word's casing onto the respelling (Limes → Liemes, LIMES → LIEMES). */
    private static function matchCase(string $original, string $replacement): string
    {
        // A multi-word respelling is a pronunciation ("vee oh see"), not a word whose case means
        // anything. Upper-casing it would hand the voice "VEE OH SEE", which some engines then
        // spell out letter by letter — the very thing the entry exists to stop.
        if (str_contains($replacement, ' ')) {
            return $replacement;
        }

        if (mb_strtoupper($original) === $original) {
            return mb_strtoupper($replacement);
        }
        if (mb_strtoupper(mb_substr($original, 0, 1)) === mb_substr($original, 0, 1)) {
            return mb_strtoupper(mb_substr($replacement, 0, 1)).mb_substr($replacement, 1);
        }

        return $replacement;
    }
}
