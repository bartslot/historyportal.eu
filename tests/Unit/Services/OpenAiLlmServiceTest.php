<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\OpenAiLlmService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\TestCase;

class OpenAiLlmServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Sleep::fake();

        config()->set('services.openai', [
            'api_key'  => 'test-key',
            'model'    => 'gpt-4o-mini',
            'base_url' => 'https://api.openai.com/v1',
            'timeout'  => 30,
        ]);
    }

    public function test_returns_parsed_json_when_called_with_json_mode(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [[
                    'message' => ['content' => json_encode([
                        'title'        => 'Napoleonic Campaigns',
                        'scene_briefs' => [
                            ['order' => 1, 'kind' => 'narration', 'year' => '1810', 'location' => 'Paris', 'beat' => 'intro'],
                        ],
                    ])],
                ]],
            ], 200),
        ]);

        $result = app(OpenAiLlmService::class)->json(
            system: 'You are a curriculum writer.',
            user:   'Outline a lesson on the Napoleonic Campaigns.',
        );

        $this->assertIsArray($result);
        $this->assertSame('Napoleonic Campaigns', $result['title']);
        $this->assertSame('1810', $result['scene_briefs'][0]['year']);
    }

    public function test_returns_a_string_when_called_with_text_mode(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => 'In 1810, Napoleon ruled France.']]],
            ], 200),
        ]);

        $text = app(OpenAiLlmService::class)->text(
            system: 'You write tight, vivid history.',
            user:   'Write one paragraph for Scene 1.',
        );

        $this->assertSame('In 1810, Napoleon ruled France.', $text);
    }

    public function test_throws_when_the_response_status_is_5xx(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response('boom', 503),
        ]);

        $this->expectException(\RuntimeException::class);
        app(OpenAiLlmService::class)->text(system: 's', user: 'u');
    }

    public function test_a_busy_model_is_retried_with_growing_waits(): void
    {
        // Prod 2026-10-23: "This model is currently experiencing high demand" (503) three times
        // in a row a second apart, and a teacher's lesson failed with 0 of 11 scenes.
        Http::fakeSequence('https://api.openai.com/v1/chat/completions')
            ->push('busy', 503)
            ->push('busy', 503)
            ->push(['choices' => [['message' => ['content' => 'ok'], 'finish_reason' => 'stop']]], 200);

        $this->assertSame('ok', app(OpenAiLlmService::class)->text(system: 's', user: 'u'));
        Sleep::assertSequence([Sleep::for(2000)->milliseconds(), Sleep::for(8000)->milliseconds()]);
    }

    // ── Truncated-JSON recovery (a large outline that hit the token cap) ───

    private function fakeTruncated(string $content): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => $content], 'finish_reason' => 'length']],
            ], 200),
        ]);
    }

    public function test_json_recovers_a_response_truncated_mid_array(): void
    {
        $this->fakeTruncated('{"scenes":[{"title":"A","year":1789},{"title":"B","year":179');

        $out = app(OpenAiLlmService::class)->json('sys', 'user');

        // Best-effort: the complete first scene always survives; the truncated tail is salvaged
        // (its number closed) rather than crashing the whole outline.
        $this->assertSame('A', $out['scenes'][0]['title']);
        $this->assertGreaterThanOrEqual(1, count($out['scenes']));
    }

    public function test_json_recovers_a_response_truncated_mid_string(): void
    {
        $this->fakeTruncated('{"a":1,"b":"an unterminated string that ran out of tok');

        $out = app(OpenAiLlmService::class)->json('sys', 'user');

        $this->assertSame(1, $out['a']);
        $this->assertArrayHasKey('b', $out);
    }

    public function test_json_recovers_a_response_truncated_after_a_dangling_key(): void
    {
        $this->fakeTruncated('{"a":1,"scenes":[{"x":1}],"next":');

        $out = app(OpenAiLlmService::class)->json('sys', 'user');

        $this->assertSame(1, $out['a']);
        $this->assertSame([['x' => 1]], $out['scenes']);
        $this->assertArrayNotHasKey('next', $out, 'the dangling key with no value is dropped');
    }
}
