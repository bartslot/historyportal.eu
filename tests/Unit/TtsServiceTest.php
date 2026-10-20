<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\TtsService;
use Tests\TestCase;

class TtsServiceTest extends TestCase
{
    public function test_prepare_speech_text_strips_markdown_headers_and_labels(): void
    {
        $service = new TtsService();

        $input = <<<TEXT
## Opening Hook
I am speaking as Cleopatra.

**[Key Event 1: Ancient Egyptian Society]**
The kingdom was shaped by trade, power, and culture.

## Reflection
What can we learn today?
TEXT;

        $output = $service->prepareSpeechText($input);

        $this->assertStringNotContainsString('Opening Hook', $output);
        $this->assertStringNotContainsString('Key Event 1', $output);
        $this->assertStringContainsString('I am speaking as Cleopatra.', $output);
        $this->assertStringContainsString('The kingdom was shaped by trade, power, and culture.', $output);
        $this->assertStringContainsString('What can we learn today?', $output);
    }

    /** Prod 2026-10-16: a script with a line break crashed the generated edge-tts script ("unterminated string literal"). */
    public function test_edge_tts_text_literal_survives_line_breaks_and_quotes(): void
    {
        $text = "Tasman leest zijn opdracht:\nkusten 'onderzoeken', \\ \"handel\" é";
        $literal = (new \ReflectionMethod(TtsService::class, 'pythonStringLiteral'))->invoke(new TtsService(), $text);

        exec('python3 -c '.escapeshellarg('import sys; sys.stdout.write('.$literal.')'), $out, $rc);

        $this->assertSame(0, $rc, 'python3 could not parse '.$literal);
        $this->assertSame($text, implode("\n", $out));
    }

    public function test_single_newline_is_soft_but_blank_line_is_a_paragraph_break(): void
    {
        $service = new TtsService();

        // Soft newline (single \n) within a thought → one continuous topic (space, no break).
        // Blank line (\n\n) between thoughts → a real paragraph break (kept as \n\n for TTS).
        $input = "First line\nsecond line of the same idea.\n\nA brand new topic entirely.";

        $output = $service->prepareSpeechText($input);

        $this->assertSame(
            "First line second line of the same idea.\n\nA brand new topic entirely.",
            $output,
        );
        // Exactly one paragraph boundary (the blank line), not two.
        $this->assertSame(1, substr_count($output, "\n\n"));
    }
}
