<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\User;
use App\Services\LessonComposer;
use App\Services\Support\AudioEncoder;
use App\Services\TtsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Narration ships as AAC-LC 32k mono 24 kHz .m4a: Azure is asked for PCM and compressed once, and
 * the composer's cache is keyed on the encode too, so changing it actually re-renders — except an
 * old high-bitrate (ElevenLabs) file, which is converted rather than paid for again.
 */
class NarrationEncodeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (! AudioEncoder::available()) {
            $this->markTestSkipped('No AAC encoder (afconvert/ffmpeg) on this machine.');
        }
        Storage::fake('public');
    }

    /** One second of 24 kHz 16-bit mono silence as a RIFF WAV, what Azure returns for PCM. */
    private function wav(): string
    {
        $data = str_repeat("\0\0", 24000);

        return 'RIFF'.pack('V', 36 + strlen($data)).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, 24000, 48000, 2, 16)
            .'data'.pack('V', strlen($data)).$data;
    }

    /** @return array{codec:string,profile:string,channels:int,rate:int} */
    private function probe(string $bytes): array
    {
        $file = tempnam(sys_get_temp_dir(), 'probe').'.m4a';
        file_put_contents($file, $bytes);
        $out = Process::run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,profile,channels,sample_rate', '-of', 'json', $file])->output();
        @unlink($file);
        $s = json_decode($out, true)['streams'][0] ?? [];

        return ['codec' => $s['codec_name'] ?? '', 'profile' => $s['profile'] ?? '', 'channels' => (int) ($s['channels'] ?? 0), 'rate' => (int) ($s['sample_rate'] ?? 0)];
    }

    public function test_azure_is_asked_for_pcm_and_the_narration_comes_back_as_aac_lc_mono_24k(): void
    {
        config(['services.azure_speech.key' => 'test-key', 'services.azure_speech.region' => 'westeurope']);
        Http::fake(['*.tts.speech.microsoft.com/*' => Http::response($this->wav())]);
        $tts = app(TtsService::class);

        $audio = $tts->generateAudioRaw('Firenze, 1265.', 'en-GB-OllieNeural', 1.0, 'azure');

        Http::assertSent(fn (Request $r) => $r->header('X-Microsoft-OutputFormat')[0] === 'riff-24khz-16bit-mono-pcm');
        $this->assertSame('m4a', $tts->lastExtension());
        $this->assertSame(['codec' => 'aac', 'profile' => 'LC', 'channels' => 1, 'rate' => 24000], $this->probe((string) $audio));
    }

    public function test_an_old_high_bitrate_narration_is_converted_without_calling_any_tts(): void
    {
        $teacher = User::factory()->create();
        $spec = ['key' => 'Encode test', 'scenes' => [['type' => 'story', 'script' => 'Nel mezzo del cammin di nostra vita.']]];
        $lesson = app(LessonComposer::class)->build($spec, $teacher, narrate: false);

        // What ElevenLabs left in the cache before the encode was part of the key: 128k MP3.
        $mp3 = tempnam(sys_get_temp_dir(), 'el').'.mp3';
        Process::run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=2', '-ac', '1', '-b:a', '128k', $mp3])->throw();
        $old = "lessons/{$lesson->id}/narration-cache/".sha1('Nel mezzo del cammin di nostra vita.').'.mp3';
        Storage::disk('public')->put($old, (string) file_get_contents($mp3));
        @unlink($mp3);
        Http::fake();

        $scene = app(LessonComposer::class)->build($spec, $teacher, narrate: true)->scenes()->firstOrFail();

        Http::assertNothingSent();
        $this->assertStringEndsWith('/narration.m4a', $scene->audio_path);
        $this->assertSame(['codec' => 'aac', 'profile' => 'LC', 'channels' => 1, 'rate' => 24000], $this->probe(Storage::disk('public')->get($scene->audio_path)));
        $key = sha1('Nel mezzo del cammin di nostra vita.|'.AudioEncoder::FINGERPRINT);
        Storage::disk('public')->assertExists("lessons/{$lesson->id}/narration-cache/{$key}.m4a");
    }
}
