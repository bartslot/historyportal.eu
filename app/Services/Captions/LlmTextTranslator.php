<?php

declare(strict_types=1);

namespace App\Services\Captions;

use App\Services\Llm\LlmRouter;

/**
 * Subtitle translation on the app's own language model (config/llm.php, role "translate", which
 * falls back to the mechanical role). Chosen because it is already configured and paid for:
 * the Azure key in .env is a Speech key, which Azure Translator refuses.
 */
final class LlmTextTranslator implements TextTranslator
{
    /** Lines per request: keeps each answer well under the output-token cap. */
    private const BATCH = 40;

    public function __construct(private readonly LlmRouter $router) {}

    public function translate(array $lines, string $from, string $to): array
    {
        $out = [];
        foreach (array_chunk($lines, self::BATCH, true) as $batch) {
            // Short ids ("1", "2", …) instead of the caller's keys: a 64-char hash per line is
            // tokens paid for nothing.
            $keys = array_keys($batch);
            $ids = [];
            foreach (array_values($batch) as $i => $line) {
                $ids[(string) ($i + 1)] = $line;
            }
            $answer = $this->router->for('translate')->json(
                $this->system($from, $to),
                json_encode($ids, JSON_UNESCAPED_UNICODE | JSON_FORCE_OBJECT | JSON_THROW_ON_ERROR),
                maxTokens: 8192,
            );
            foreach ($keys as $i => $key) {
                $text = $answer[(string) ($i + 1)] ?? null;
                if (is_string($text) && trim($text) !== '') {
                    $out[$key] = trim($text);
                }
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
        Markers like ⟦0⟧ stand for names and placeholders: copy every marker unchanged, once, into the
        translated line where it belongs grammatically.
        TXT;
    }
}
