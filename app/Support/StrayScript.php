<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Letters from a writing system a line has no business containing: "Toen Marco终于 terugkeerde"
 * (lesson 129, Nov 2026) is a Dutch subtitle where the model slipped into Chinese for one word.
 * Models do this now and then, mostly the small and cheap ones, and nothing downstream notices:
 * the line is cached and every class reads it.
 *
 * A line may use the scripts of its own language, punctuation, digits and accents (Unicode's
 * Common and Inherited), and any script its source line already uses, so a Chinese name the
 * English narration quotes may stay in the Dutch subtitle. Everything else is stray.
 */
final class StrayScript
{
    /** The scripts each language writes in. A language not listed is taken to write in Latin. */
    private const SCRIPTS = [
        'ar' => ['Arabic', 'Latin'],
        'zh' => ['Han', 'Latin'],
        'ja' => ['Han', 'Hiragana', 'Katakana', 'Latin'],
        'ko' => ['Hangul', 'Han', 'Latin'],
        'ru' => ['Cyrillic', 'Latin'],
        'uk' => ['Cyrillic', 'Latin'],
        'el' => ['Greek', 'Latin'],
        'he' => ['Hebrew', 'Latin'],
    ];

    /** The scripts worth checking for; a letter from any of these that the language does not use is stray. */
    private const KNOWN = [
        'Latin', 'Han', 'Hiragana', 'Katakana', 'Hangul', 'Cyrillic', 'Arabic', 'Greek', 'Hebrew',
        'Thai', 'Devanagari', 'Bengali', 'Tamil', 'Georgian', 'Armenian', 'Ethiopic', 'Khmer', 'Lao', 'Myanmar',
    ];

    /**
     * The stray runs in `$text`, in order, e.g. ["终于"]. Empty when the line is clean.
     *
     * @return list<string>
     */
    public static function find(string $text, string $language, string $source = ''): array
    {
        $allowed = self::SCRIPTS[strtolower(substr($language, 0, 2))] ?? ['Latin'];
        foreach (self::KNOWN as $script) {
            if ($source !== '' && preg_match('/\p{'.$script.'}/u', $source) === 1) {
                $allowed[] = $script;
            }
        }
        $foreign = array_diff(self::KNOWN, $allowed);
        if ($foreign === []) {
            return [];
        }

        // The katakana middle dot is the separator Chinese and Japanese both write between the parts of a foreign name.
        $text = str_replace('・', '·', $text);
        $class = implode('', array_map(fn (string $s) => '\p{'.$s.'}', $foreign));
        preg_match_all('/['.$class.']+/u', $text, $m);

        return array_values($m[0]);
    }

    public static function has(string $text, string $language, string $source = ''): bool
    {
        return self::find($text, $language, $source) !== [];
    }
}
