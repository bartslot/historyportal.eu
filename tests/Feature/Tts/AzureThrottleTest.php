<?php

declare(strict_types=1);

namespace Tests\Feature\Tts;

use App\Services\Support\AudioEncoder;
use App\Services\TtsService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Tests\TestCase;

/**
 * PM, 2026-10-18: Azure answered HTTP 429 "Downstream Service Throttled" after ~25 quick clips in a
 * row during a bulk re-narrate, and each of those scenes failed. A throttle is a "wait", not a
 * "no": it is retried with a pause (Azure's Retry-After when it sends one), then given up.
 */
class AzureThrottleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.azure_speech.key' => 'test-key', 'services.azure_speech.region' => 'westeurope']);
        Sleep::fake();
    }

    private function audio(): string
    {
        if (! AudioEncoder::available()) {
            return 'mp3-bytes';
        }
        $data = str_repeat("\0\0", 24000);

        return 'RIFF'.pack('V', 36 + strlen($data)).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, 24000, 48000, 2, 16).'data'.pack('V', strlen($data)).$data;
    }

    public function test_a_throttled_request_is_retried_after_a_pause(): void
    {
        Http::fake(['*.tts.speech.microsoft.com/*' => Http::sequence()
            ->push('Downstream Service Throttled', 429, ['Retry-After' => '3'])
            ->push('Downstream Service Throttled', 429)
            ->push($this->audio(), 200)]);

        $tts = app(TtsService::class);
        $this->assertNotNull($tts->generateAudioRaw('Land in zicht.', 'nl-NL-MaartenNeural', 1.0, 'azure'));
        $this->assertSame('azure', $tts->lastProvider());
        Http::assertSentCount(3);
        Sleep::assertSleptTimes(2);
    }

    public function test_it_gives_up_after_a_few_tries_and_never_retries_other_errors(): void
    {
        // (Past Azure the chain falls through to other providers; what matters here is Azure's own tries.)
        Http::fake(['*.tts.speech.microsoft.com/*' => Http::response('Downstream Service Throttled', 429)]);
        $tts = app(TtsService::class);
        $tts->generateAudioRaw('Land in zicht.', 'nl-NL-MaartenNeural', 1.0, 'azure');
        $this->assertNotSame('azure', $tts->lastProvider());
        Http::assertSentCount(3);
    }

    public function test_a_refusal_is_not_retried(): void
    {
        Http::fake(['*.tts.speech.microsoft.com/*' => Http::response('Unauthorized', 401)]);
        app(TtsService::class)->generateAudioRaw('Land in zicht.', 'nl-NL-MaartenNeural', 1.0, 'azure');
        Http::assertSentCount(1);
        Sleep::assertNeverSlept();
    }
}
