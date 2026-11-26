<?php

declare(strict_types=1);

namespace App\Services\Lessons;

/**
 * The story-writing rules of the history-story-writer skill (Bart, 2026-11-23), shared by the prompts quick lesson
 * creation runs: the outline (LessonOutlinePrompt), the narration (LessonScriptPrompt), its critique
 * (ScriptCritiquePrompt) and the storyboard (ShotListPrompt). One place, so the skill and the app say the same thing.
 *
 * - The class's age is never assumed: it comes from the lesson's grade_level, and the words scale with it.
 * - Hard words are explained in passing the first time, legends are told as legends, the story ends on wonder.
 * - Every character owns one signature colour for life; at most one owns white.
 */
final class StoryCraft
{
    /** Legacy US grade strings the wizard still converts ("7th grade" is 12). */
    private const GRADE_AGES = [
        '3rd grade' => 8, '4th grade' => 9, '5th grade' => 10, '6th grade' => 11,
        '7th grade' => 12, '8th grade' => 13, '9th grade' => 14,
    ];

    /**
     * The class's age from a lesson's grade_level ("Age 12", "7th grade"), or null when it names no age (a local
     * school year such as "groep 8" or "K-7"): then the prompts follow the grade level as written.
     */
    public static function age(?string $gradeLevel): ?int
    {
        $level = trim((string) $gradeLevel);
        if (preg_match('/^age\s*(\d{1,2})$/i', $level, $m) === 1) {
            return (int) $m[1];
        }

        return self::GRADE_AGES[strtolower($level)] ?? null;
    }

    /** How the narration reads for this class: sentence length, hard words and how heavy the themes may be. */
    public static function readingRules(?string $gradeLevel): string
    {
        $age = self::age($gradeLevel);
        $band = match (true) {
            $age === null => 'The class is in '.trim((string) $gradeLevel).': write for that school year.',
            $age <= 7 => "The class is about {$age}: sentences under 10 words, everyday words only, one idea per sentence. Death and punishment are named in a few words, never described.",
            $age <= 11 => "The class is about {$age}: sentences under 12 words, almost no hard words. Death and punishment are named, never described.",
            $age <= 14 => "The class is about {$age}: sentences under 18 words. Politics, injustice and loss are told plainly; violence stays off screen.",
            default => "The class is about {$age}: sentences under 25 words. Motives, sources and doubt may be weighed openly; violence stays off screen.",
        };

        return $band.' Write for the weakest reader in that class, and for children whose first language is not the lesson\'s language.';
    }

    /** The skill's word and truth rules, for the narration prompt. */
    public static function narrationRules(): string
    {
        return <<<'RULES'
- HARD WORDS: explain every hard word in passing the first time it appears ("an envoy, someone sent to speak
  for the city"), or swap it for a plain one. Check titles and offices, money and law words, religious terms,
  foreign phrases and names of genres (say "chapter", not "canto").
- NUMBERS a child can hold: "twenty years", "as thick as a book", never "approximately 14,233 lines".
- LEGENDS stay legends: when the source tells something as a story or a later account, the narration says so
  ("so the writer Boccaccio tells us, thirty years later") and lets the class wonder whether it is true.
- RELIGION is told as what people then believed or imagined, never as something the class is asked to believe.
- Something strange in the source (an odd dream, a strange custom) stays when the age allows it, but the
  narrator names it as strange, so a giggle becomes a question.
- The first scene opens on a question or a mystery in its first two sentences, never an introduction.
- The last scene ends on one open question the class can wonder about, never on a summary sentence.
RULES;
    }

    /** What makes a reading-level failure, for the critique. */
    public static function critiqueRules(): string
    {
        return 'grade_fit also fails (cap it at 2) when a hard word (an office, a law or money word, a religious term, '
            .'a foreign phrase) appears without being explained, or when a legend is told as plain fact.';
    }

    /** The outline's cast: every recurring person and their signature colour. */
    public static function castRules(): string
    {
        return <<<'RULES'
- CAST: list every person who appears in two or more scene briefs in top-level "cast". Each owns ONE signature
  colour for the whole lesson, as a child and as an adult, worn in their largest garment (cloak, dress, coat).
  No two people share a colour. At most one person (the most important woman or child, if the story has one)
  owns white; nobody else wears white. Pick colours that read as watercolour: red, blue, turquoise, ochre,
  terracotta, plum, green, brown, gold. A source colour that breaks this rule is left out of the pictures.
RULES;
    }

    /**
     * The colour line for a storyboard: the people of this scene (or the whole cast when the brief names nobody)
     * with their signature colours, so every shot dresses them the same.
     *
     * @param  array<string, mixed>  $outline  the lesson's stored outline
     * @param  list<string>  $names  the scene brief's characters
     */
    public static function castColours(array $outline, array $names = []): string
    {
        $cast = array_values(array_filter((array) ($outline['cast'] ?? []), fn ($c) => is_array($c)
            && trim((string) ($c['name'] ?? '')) !== '' && trim((string) ($c['colour'] ?? '')) !== ''));
        if ($cast === []) {
            return '';
        }
        $keys = array_map(fn ($n) => self::key((string) $n), $names);
        $here = array_values(array_filter($cast, function (array $c) use ($keys): bool {
            $name = self::key((string) $c['name']);
            foreach ($keys as $k) {
                if ($k !== '' && (str_contains($name, $k) || str_contains($k, $name))) {
                    return true;
                }
            }

            return false;
        }));

        $lines = array_map(fn (array $c) => '- '.trim((string) $c['name']).': '.trim((string) $c['colour'])
            .(trim((string) ($c['look'] ?? '')) !== '' ? ' ('.trim((string) $c['look']).')' : ''), $here !== [] ? $here : $cast);

        return "Signature colours — every shot that shows one of these people dresses them in their own colour and names it in the description; nobody else wears it:\n"
            .implode("\n", $lines);
    }

    private static function key(string $name): string
    {
        return trim(mb_strtolower($name));
    }
}
