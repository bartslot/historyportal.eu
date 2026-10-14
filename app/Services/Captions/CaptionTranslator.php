<?php

declare(strict_types=1);

namespace App\Services\Captions;

use App\Models\CaptionTranslation;
use App\Models\Lesson;
use Illuminate\Support\Facades\Log;

/**
 * Subtitles in another language than the narration.
 *
 * A translated caption is a translation of the narration line (and of a speech balloon), never of
 * a cue: the player cuts the translated line into cues over the original line's own time span, so
 * timing is reused exactly. Lines are cached per lesson + language + hash of the line's spoken
 * text, translated once in a batch and read by every class after that. A teacher correction sits
 * beside the machine text and wins until it is reset.
 */
final class CaptionTranslator
{
    /** The subtitle languages a class can pick, each in its own name (endonym). */
    public const LANGUAGES = [
        'nl' => 'Nederlands',
        'en' => 'English',
        'de' => 'Deutsch',
        'fr' => 'Français',
        'it' => 'Italiano',
        'es' => 'Español',
        'ar' => 'العربية',
        'zh' => '中文',
        'ja' => '日本語',
    ];

    public const RTL = ['ar'];

    public function __construct(private readonly TextTranslator $translator) {}

    /** The spoken text of a line: direction tags out, whitespace collapsed (captions.js spokenText). */
    public static function normalize(?string $text): string
    {
        $spoken = preg_replace('/\[[^\]]*\]/u', '', (string) $text) ?? '';

        return trim(preg_replace('/\s+/u', ' ', $spoken) ?? '');
    }

    public static function hash(string $normalized): string
    {
        return hash('sha256', $normalized);
    }

    public static function sourceLanguage(Lesson $lesson): string
    {
        return strtolower(substr((string) ($lesson->language ?: 'en'), 0, 2));
    }

    /**
     * Every line the player can caption or put in a balloon, by hash, in lesson order.
     *
     * @return array<string, string> hash => spoken text
     */
    public function sources(Lesson $lesson): array
    {
        $out = [];
        foreach ($lesson->scenes()->ordered()->get() as $scene) {
            $texts = [$scene->script_segment, ...array_map(fn ($l) => $l['text'] ?? null, $scene->config['lines'] ?? [])];
            foreach ($texts as $text) {
                $clean = self::normalize(is_string($text) ? $text : null);
                if ($clean !== '') {
                    $out[self::hash($clean)] = $clean;
                }
            }
        }

        return $out;
    }

    /**
     * The lesson's caption set in one language as far as it is cached: source text => what to show.
     *
     * @return array{texts: array<string, string>, missing: int}
     */
    public function cached(Lesson $lesson, string $language): array
    {
        $sources = $this->sources($lesson);
        if ($language === self::sourceLanguage($lesson)) {
            return ['texts' => [], 'missing' => 0];
        }

        $rows = $this->rows($lesson, $language, array_keys($sources));
        $texts = [];
        foreach ($rows as $hash => $row) {
            $texts[$sources[$hash]] = $row->text();
        }

        return ['texts' => $texts, 'missing' => count($sources) - count($texts)];
    }

    /**
     * Translate whatever this lesson is missing in one language. A line another lesson already
     * has (a copy, a re-composed lesson) is reused; the rest go to the translator in one batch.
     *
     * @return int lines newly cached
     */
    public function translateMissing(Lesson $lesson, string $language): int
    {
        $from = self::sourceLanguage($lesson);
        if ($language === $from || ! isset(self::LANGUAGES[$language])) {
            return 0;
        }

        $sources = $this->sources($lesson);
        $missing = array_diff_key($sources, $this->rows($lesson, $language, array_keys($sources)));
        if ($missing === []) {
            return 0;
        }

        $made = CaptionTranslation::query()
            ->where('language', $language)
            ->whereIn('source_hash', array_keys($missing))
            ->pluck('machine_text', 'source_hash')
            ->all();

        $todo = array_diff_key($missing, $made);
        if ($todo !== []) {
            $made += $this->translateProtected($todo, $from, $language);
        }

        $now = now();
        $rows = [];
        foreach (array_intersect_key($made, $missing) as $hash => $text) {
            $rows[] = [
                'lesson_id' => $lesson->id, 'source_hash' => $hash, 'language' => $language,
                'source_text' => $missing[$hash], 'machine_text' => $text,
                'created_at' => $now, 'updated_at' => $now,
            ];
        }
        CaptionTranslation::query()->insertOrIgnore($rows);

        return count($rows);
    }

    /** The teacher's own wording for one line; an empty text resets it to the machine version. */
    public function correct(Lesson $lesson, string $language, string $hash, ?string $text): void
    {
        $clean = trim((string) $text);
        CaptionTranslation::query()
            ->where(['lesson_id' => $lesson->id, 'language' => $language, 'source_hash' => $hash])
            ->update(['teacher_text' => $clean === '' ? null : $clean]);
    }

    /**
     * Every line of one language for the editor, in lesson order.
     *
     * @return list<array{hash: string, source: string, machine: ?string, teacher: ?string}>
     */
    public function editorRows(Lesson $lesson, string $language): array
    {
        $sources = $this->sources($lesson);
        $rows = $this->rows($lesson, $language, array_keys($sources));

        return array_values(array_map(fn (string $hash, string $source) => [
            'hash' => $hash,
            'source' => $source,
            'machine' => $rows[$hash]->machine_text ?? null,
            'teacher' => $rows[$hash]->teacher_text ?? null,
        ], array_keys($sources), $sources));
    }

    /** @return array<string, CaptionTranslation> */
    private function rows(Lesson $lesson, string $language, array $hashes): array
    {
        return CaptionTranslation::query()
            ->where('lesson_id', $lesson->id)
            ->where('language', $language)
            ->whereIn('source_hash', $hashes)
            ->get()
            ->keyBy('source_hash')
            ->all();
    }

    /**
     * Names and {placeholders} are swapped for ⟦n⟧ markers before the translator sees a line, and
     * put back after. A line whose markers did not all come back is dropped (it stays in the
     * original language and is tried again next time) rather than shown with a name mangled.
     *
     * @param  array<string, string>  $lines
     * @return array<string, string>
     */
    private function translateProtected(array $lines, string $from, string $to): array
    {
        $kept = [];
        $masked = [];
        foreach ($lines as $hash => $line) {
            [$masked[$hash], $kept[$hash]] = $this->mask($line);
        }

        $done = [];
        foreach ($this->translator->translate($masked, $from, $to) as $hash => $text) {
            $restored = $this->unmask((string) $text, $kept[$hash] ?? []);
            if ($restored === null) {
                Log::warning('[CaptionTranslator] a protected name did not survive translation', compact('hash', 'to'));

                continue;
            }
            $done[$hash] = $restored;
        }

        return $done;
    }

    /** @return array{0: string, 1: list<string>} */
    private function mask(string $line): array
    {
        $terms = array_map(fn (string $t) => preg_quote($t, '/'), (array) config('captions.no_translate', []));
        usort($terms, fn ($a, $b) => strlen($b) <=> strlen($a));
        $pattern = '/\{[^}]*\}'.($terms ? '|\b(?:'.implode('|', $terms).')\b' : '').'/u';

        $kept = [];
        $masked = preg_replace_callback($pattern, function (array $m) use (&$kept): string {
            $kept[] = $m[0];

            return '⟦'.(count($kept) - 1).'⟧';
        }, $line) ?? $line;

        return [$masked, $kept];
    }

    /** @param list<string> $kept */
    private function unmask(string $text, array $kept): ?string
    {
        foreach ($kept as $i => $original) {
            $marker = '⟦'.$i.'⟧';
            if (substr_count($text, $marker) !== 1) {
                return null;
            }
            $text = str_replace($marker, $original, $text);
        }

        return str_contains($text, '⟦') ? null : $text;
    }
}
