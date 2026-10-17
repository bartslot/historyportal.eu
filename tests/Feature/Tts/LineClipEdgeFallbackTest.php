<?php

declare(strict_types=1);

namespace Tests\Feature\Tts;

use App\Models\Lesson;
use App\Models\Narrator;
use App\Models\Scene;
use App\Models\User;
use App\Services\Lessons\SceneDialogue;
use App\Services\TtsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

/**
 * PM, 2026-10-18, re-narrating lesson 63 on prod: "Line 0 (narrator) came from azure, not
 * edge_tts". Microsoft refuses edge-tts from the server, and TtsService reads the same voice
 * (nl-NL-MaartenNeural) through Azure. A plain scene accepts that (GenerateSceneAudio,
 * Scene::narrationWasDowngraded); a line clip refused it. Same rule now: the narrator's own voice
 * through Azure is the narrator. Any other voice or provider is still refused.
 */
class LineClipEdgeFallbackTest extends TestCase
{
    use RefreshDatabase;

    private function scene(): Scene
    {
        Storage::fake('public');
        $narrator = Narrator::create(['name' => 'Ron', 'slug' => 'ron', 'gender' => 'male', 'voice_provider' => 'edge_tts',
            'voice_id' => 'nl-NL-MaartenNeural', 'voice_speed' => 1.0, 'is_active' => true, 'sort_order' => 1]);
        $lesson = Lesson::create(['teacher_id' => User::factory()->create()->id, 'avatar_id' => $narrator->id, 'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th']);

        return Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready']);
    }

    private function tts(string $provider, string $voice): void
    {
        $this->mock(TtsService::class, function ($mock) use ($provider, $voice): void {
            $mock->shouldReceive('prepareSpeechText')->andReturnUsing(fn ($t) => $t);
            $mock->shouldReceive('generateAudioRaw')->andReturn('mp3-bytes');
            $mock->shouldReceive('lastProvider')->andReturn($provider);
            $mock->shouldReceive('lastVoice')->andReturn($voice);
        });
    }

    public function test_an_edge_voice_read_by_azure_in_the_same_voice_is_the_narrator(): void
    {
        $scene = $this->scene();
        $this->tts('azure', 'nl-NL-MaartenNeural');

        $path = app(SceneDialogue::class)->narratorClip($scene, 'Land in zicht.', 'nl');

        Storage::disk('public')->assertExists($path);
    }

    public function test_another_voice_through_azure_is_still_refused(): void
    {
        $scene = $this->scene();
        $this->tts('azure', 'en-US-JennyNeural');

        $this->expectException(RuntimeException::class);
        app(SceneDialogue::class)->narratorClip($scene, 'Land in zicht.', 'nl');
    }

    /**
     * PM, 2026-10-18: a re-recorded line scene kept the audio_voice of its old recording, so it
     * read as a stand-in voice (W24VRI scene 6). The track records the narrator voice that spoke.
     */
    public function test_a_recorded_line_track_stores_the_narrator_voice_that_spoke(): void
    {
        if (! (new \Symfony\Component\Process\ExecutableFinder)->find('ffmpeg')) {
            $this->markTestSkipped('ffmpeg is needed to join the clips.');
        }
        $scene = $this->scene();
        $scene->update(['audio_voice' => 'an-OLD-VoiceNeural']);
        $tmp = tempnam(sys_get_temp_dir(), 'clip').'.m4a';
        (new \Symfony\Component\Process\Process(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.4', '-c:a', 'aac', '-f', 'ipod', $tmp]))->mustRun();
        $bytes = (string) file_get_contents($tmp);
        @unlink($tmp);
        $this->mock(TtsService::class, function ($mock) use ($bytes): void {
            $mock->shouldReceive('prepareSpeechText')->andReturnUsing(fn ($t) => $t);
            $mock->shouldReceive('generateAudioRaw')->andReturn($bytes);
            $mock->shouldReceive('lastProvider')->andReturn('azure');
            $mock->shouldReceive('lastVoice')->andReturn('nl-NL-MaartenNeural');
        });

        $record = new \ReflectionMethod(SceneDialogue::class, 'record');
        $record->invoke(app(SceneDialogue::class), $scene->fresh('lesson.narrator'), [['speaker' => 'narrator', 'text' => 'Land in zicht.']], [], 'nl');

        $this->assertSame('nl-NL-MaartenNeural', $scene->fresh()->audio_voice);
        $this->assertFalse($scene->fresh()->narrationWasDowngraded());
    }
}
