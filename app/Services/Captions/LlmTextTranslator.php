<?php

declare(strict_types=1);

namespace App\Services\Captions;

use App\Services\Llm\LlmRouter;
use App\Support\StrayScript;
use Illuminate\Support\Facades\Log;

/**
 * Subtitle translation on the app's own language model: config/llm.php role "translate"
 * (LLM_ROLE_TRANSLATE, else LLM_ROLE_MECHANICAL). There is no provider fallback chain: the role
 * names one provider, and OpenAiLlmService is simply the one OpenAI-wire-format client every
 * provider goes through (Gemini via its /v1beta/openai endpoint), hence "OpenAI API returned 429"
 * in a Gemini error. One request per call; CaptionTranslator does the batching and the backoff.
 */
final class LlmTextTranslator implements TextTranslator
{
    public function __construct(private readonly LlmRouter $router) {}

    public function translate(array $lines, string $from, string $to): array
    {
        $out = $this->ask($lines, $from, $to);

        // A line with letters from another writing system ("Toen Marco终于 terugkeerde", lesson 129)
        // is asked once more on its own; when it comes back mixed again it is left out, so it is
        // not cached and the player keeps showing the original line until a later run gets it right.
        $stray = array_filter($out, fn (string $text, $key) => StrayScript::has($text, $to, (string) $lines[$key]), ARRAY_FILTER_USE_BOTH);
        if ($stray !== []) {
            Log::warning('[LlmTextTranslator] stray script in translation, asking again', ['to' => $to, 'lines' => array_values($stray)]);
            $again = $this->ask(array_intersect_key($lines, $stray), $from, $to);
            foreach (array_keys($stray) as $key) {
                $text = $again[$key] ?? null;
                if ($text !== null && ! StrayScript::has($text, $to, (string) $lines[$key])) {
                    $out[$key] = $text;
                } else {
                    unset($out[$key]);
                }
            }
        }

        return $out;
    }

    /**
     * @param  array<array-key, string>  $lines
     * @return array<array-key, string>
     */
    private function ask(array $lines, string $from, string $to): array
    {
        // Short ids ("1", "2", …) instead of the caller's keys: a 64-char hash per line is
        // tokens paid for nothing.
        $keys = array_keys($lines);
        $ids = [];
        foreach (array_values($lines) as $i => $line) {
            $ids[(string) ($i + 1)] = $line;
        }
        $answer = $this->router->for('translate')->json(
            $this->system($from, $to),
            json_encode($ids, JSON_UNESCAPED_UNICODE | JSON_FORCE_OBJECT | JSON_THROW_ON_ERROR),
            maxTokens: 16384,   // 100 lines (CaptionTranslator::BATCH), CJK included
        );

        $out = [];
        foreach ($keys as $i => $key) {
            $text = $answer[(string) ($i + 1)] ?? null;
            if (is_string($text) && trim($text) !== '') {
                $out[$key] = trim($text);
            }
        }

        return $out;
    }

    private function system(string $from, string $to): string
    {
        return <<<TXT
        You translate the subtitles of a narrated history lesson for school classes from {$from} into {$to}.
        The input is a JSON object of id => subtitle line. Answer with a JSON object with exactly the same ids,
        each holding the translated line. Translate meaning and tone for pupils of 10 to 14; keep it as short
        as the original, it is read while it is spoken. Never add, explain or drop anything.
        Write every line entirely in {$to}, in its own alphabet: never a word of another language or writing
        system, unless the original line already has it (a name, a quoted word).
        Markers like ⟦0⟧ stand for names and placeholders: copy every marker unchanged, once, into the
        translated line where it belongs grammatically.
        TXT;
    }
}
