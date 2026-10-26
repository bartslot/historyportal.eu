<?php

declare(strict_types=1);

namespace App\Services\Predict;

/**
 * Children's names out of a child's text, before anything leaves our database (Bart, 2026-10-19:
 * JEV yes, "with every name replaced by a child ID"). The same replacement covers the feedback model.
 *
 * What is a name, in order:
 *   1. the names we know: the pupil's own, and the class roster's (first names too), anywhere,
 *      whatever the case: "tim" is Tim;
 *   2. a capitalised word after a family or friend word ("my brother Tim", "mijn zus Noor");
 *   3. any other capitalised word that the lesson itself never uses ("then Sanne said"): the
 *      lesson's own words (Tasman, Batavia, water, salt) are history, not classmates, so they stay
 *      and the grader can still read the answer. At the start of a sentence the everyday words a
 *      child starts with (The, Because, Ik, Omdat, Je, Perché) stay too. Not in German, where every
 *      noun is capitalised; there rules 1 and 2 do the work.
 * A word found by rule 2 or 3 is replaced wherever it appears, the start of a sentence included.
 * E-mail addresses and phone numbers go too.
 *
 * A name becomes `child_` + six hex characters: an HMAC of the lowercased name with the app key, so
 * the same name is the same id in every answer and nobody outside can reverse it. The map back
 * (id => name) stays in this process: restore() puts the names back into the feedback a child reads.
 *
 * ponytail: an ordinary word that starts a sentence, is not in STARTERS and not in the lesson
 * ("Evaporation leaves salt") is replaced too: privacy before a perfect grade. A frequency list
 * per language is the upgrade if the calibration set shows it hurts the grading.
 */
final class NamePseudonymizer
{
    private const CUES = [
        // en
        'brother', 'sister', 'friend', 'mum', 'mom', 'dad', 'mother', 'father', 'cousin', 'uncle', 'aunt', 'grandma', 'grandpa', 'neighbour', 'neighbor', 'teacher',
        // nl
        'broer', 'broertje', 'zus', 'zusje', 'vriend', 'vriendin', 'vriendje', 'moeder', 'vader', 'mama', 'papa', 'neef', 'nicht', 'oom', 'tante', 'oma', 'opa', 'buurman', 'buurvrouw', 'juf', 'meester',
        // de
        'bruder', 'schwester', 'freund', 'freundin', 'mutter', 'vater', 'mama', 'papa', 'cousin', 'cousine', 'onkel', 'tante', 'oma', 'opa', 'nachbar', 'lehrer', 'lehrerin',
        // fr
        'frère', 'sœur', 'soeur', 'ami', 'amie', 'copain', 'copine', 'mère', 'père', 'maman', 'papa', 'cousin', 'cousine', 'oncle', 'tante', 'mamie', 'papi', 'voisin', 'voisine',
        // it
        'fratello', 'sorella', 'amico', 'amica', 'madre', 'padre', 'mamma', 'papà', 'cugino', 'cugina', 'zio', 'zia', 'nonna', 'nonno', 'vicino', 'vicina', 'maestra', 'maestro',
    ];

    /** Words a child starts a sentence with that are never a name (lowercase; en, nl, fr, it). */
    private const STARTERS = [
        'the', 'a', 'an', 'because', 'they', 'he', 'she', 'it', 'we', 'you', 'when', 'if', 'so', 'but', 'and', 'then',
        'maybe', 'there', 'that', 'this', 'those', 'these', 'their', 'his', 'her', 'its', 'my', 'our', 'in', 'on', 'at',
        'after', 'before', 'since', 'all', 'no', 'not', 'yes', 'too', 'more', 'less', 'some', 'many', 'people', 'what',
        'why', 'how', 'who', 'probably', 'perhaps', 'also', 'first', 'later', 'now',
        'de', 'het', 'een', 'ik', 'zij', 'hij', 'ze', 'we', 'wij', 'jij', 'je', 'omdat', 'want', 'dan', 'als', 'er',
        'die', 'dat', 'dit', 'deze', 'hun', 'zijn', 'haar', 'mijn', 'ons', 'onze', 'misschien', 'daarna', 'toen', 'nu',
        'en', 'maar', 'dus', 'door', 'na', 'voor', 'in', 'op', 'bij', 'met', 'geen', 'niet', 'ja', 'nee', 'meer', 'minder',
        'mensen', 'wat', 'waarom', 'hoe', 'wie', 'eerst', 'ook', 'alle', 'veel',
        'le', 'la', 'les', 'un', 'une', 'des', 'parce', 'je', 'il', 'elle', 'ils', 'elles', 'nous', 'vous', 'on', 'quand',
        'si', 'mais', 'et', 'alors', 'puis', 'peut-être', 'ce', 'cette', 'ces', 'leur', 'leurs', 'mon', 'ma', 'mes', 'dans',
        'après', 'avant', 'car', 'donc', 'pas', 'oui', 'non', 'plus', 'moins', 'les', 'pourquoi', 'comment', 'qui', 'quoi',
        'il', 'lo', 'gli', 'i', 'le', 'una', 'uno', 'perché', 'io', 'lui', 'lei', 'loro', 'noi', 'voi', 'quando', 'se',
        'ma', 'e', 'poi', 'allora', 'forse', 'questo', 'questa', 'quel', 'quella', 'suo', 'sua', 'mio', 'mia', 'nel',
        'dopo', 'prima', 'quindi', 'non', 'sì', 'più', 'meno', 'come', 'chi', 'cosa', 'anche', 'tutti', 'molti',
    ];

    /** A capitalised word: one capital, then at least one lowercase letter (VOC and "I" are not names). */
    private const CAPITALISED = '(?<![\p{L}\p{N}_])\p{Lu}\p{Ll}[\p{L}\p{M}\'’-]*';

    public function __construct(private readonly string $secret) {}

    public static function make(): self
    {
        return new self((string) config('app.key'));
    }

    /** The stable pseudonymous id of a name or a session. */
    public function childId(string $seed): string
    {
        return 'child_'.substr(hash_hmac('sha256', mb_strtolower(trim($seed)), $this->secret), 0, 6);
    }

    /**
     * @param  list<string>  $knownNames  the pupil's own name and the roster's
     * @param  list<string>  $keep  the lesson's own words (any case): never a classmate
     * @return array{text: string, map: array<string, string>} the text to send, and child id => name
     */
    public function replace(string $text, array $knownNames = [], array $keep = [], string $language = 'en'): array
    {
        $text = preg_replace('/[\w.+-]+@[\w-]+(\.[\w-]+)+/u', '[email]', $text) ?? $text;
        $text = preg_replace('/\+?\d[\d \-().]{6,}\d/u', '[number]', $text) ?? $text;

        $keepSet = array_flip(array_map(fn ($w) => mb_strtolower($w), $keep));
        $names = [];
        foreach ($knownNames as $name) {
            foreach ([trim($name), ...preg_split('/[\s.]+/u', trim($name))] as $part) {
                if (mb_strlen($part) >= 2 && preg_match('/\p{L}/u', $part)) {
                    $names[mb_strtolower($part)] = true;
                }
            }
        }
        foreach ($this->cued($text) as $word) {
            $names[mb_strtolower($word)] = true;
        }
        if (! str_starts_with(strtolower($language), 'de')) {
            $starters = array_flip(self::STARTERS);
            foreach ($this->capitalised($text) as [$word, $startsSentence]) {
                $lower = mb_strtolower($word);
                if (! isset($keepSet[$lower]) && ! ($startsSentence && isset($starters[$lower]))) {
                    $names[$lower] = true;
                }
            }
        }

        // Longest first, so "Jan Willem" goes before "Jan".
        $names = array_keys($names);
        usort($names, fn ($a, $b) => mb_strlen($b) <=> mb_strlen($a));
        $map = [];
        foreach ($names as $name) {
            $id = $this->childId($name);
            $pattern = '/(?<![\p{L}\p{N}_])'.preg_quote($name, '/').'(?![\p{L}\p{N}_])/iu';
            $text = preg_replace_callback($pattern, function (array $m) use ($id, &$map) {
                // A name reads back capitalised: "sanne" typed fast is still Sanne.
                $map[$id] = isset($map[$id]) && preg_match('/^\p{Lu}/u', $map[$id])
                    ? $map[$id]
                    : mb_strtoupper(mb_substr($m[0], 0, 1)).mb_substr($m[0], 1);

                return $id;
            }, $text) ?? $text;
        }

        return ['text' => $text, 'map' => $map];
    }

    /** Put the names back into a text the model wrote (its feedback). */
    public static function restore(string $text, array $map): string
    {
        return strtr($text, $map);
    }

    /** @return list<string> capitalised words straight after a family or friend word */
    private function cued(string $text): array
    {
        $cues = implode('|', array_map(fn ($c) => preg_quote($c, '/'), array_unique(self::CUES)));
        preg_match_all('/(?<![\p{L}])(?i:'.$cues.')\s+('.self::CAPITALISED.')/u', $text, $m);

        return $m[1];
    }

    /** @return list<array{0: string, 1: bool}> capitalised words, and whether each starts a sentence */
    private function capitalised(string $text): array
    {
        preg_match_all('/'.self::CAPITALISED.'/u', $text, $m, PREG_OFFSET_CAPTURE);
        $out = [];
        foreach ($m[0] as [$word, $offset]) {
            $before = rtrim(substr($text, 0, $offset));
            // The start of the text or of a sentence: after . ! ? : ; or an opening quote.
            $out[] = [$word, $before === '' || (bool) preg_match('/[.!?:;"“«(\n]$/u', $before)];
        }

        return $out;
    }

    /**
     * The words a lesson itself uses (title, topic, every scene's script, chapter and place, the
     * moment's own texts): history, never a classmate.
     *
     * @param  array<string,mixed>  $predict
     * @return list<string>
     */
    public static function lessonWords(\App\Models\Lesson $lesson, array $predict = []): array
    {
        $texts = [$lesson->title, $lesson->topic, json_encode($predict, JSON_UNESCAPED_UNICODE)];
        foreach ($lesson->scenes()->get(['script_segment', 'chapter_name', 'location']) as $scene) {
            $texts[] = $scene->script_segment.' '.$scene->chapter_name.' '.$scene->location;
        }
        preg_match_all('/\p{L}[\p{L}\p{M}\'’-]*/u', implode(' ', array_filter($texts)), $m);

        return array_values(array_unique($m[0]));
    }
}
