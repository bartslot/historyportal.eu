<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Scene;
use App\Services\Lessons\ChoicePrompt;
use App\Services\Support\PronunciationLexicon;
use App\Services\TtsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * Records what the narrator says when a scene's choices fade in (App\Services\Lessons\ChoicePrompt), in the
 * same voice as the scene's own narration (GenerateSceneAudio::narratorVoice). Stored next to it as
 * lessons/{lesson}/scenes/{scene}/choices.{ext}, and noted in config.links_audio = {path, hash, text, locale, voice}.
 * GenerateSceneAudio queues it after each narration, so a new voice reads the choices too.
 *
 * It reads the scene when it runs, not when it was queued: five quick edits queue five jobs, the first
 * records the latest words and the other four find them already recorded. A failure leaves the scene as
 * it was; the player then shows the choices without a voice.
 */
class GenerateChoicesAudio implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 240;

    public function __construct(public readonly int $sceneId) {}

    public function handle(TtsService $tts): void
    {
        $scene = Scene::with('lesson.narrator')->find($this->sceneId);
        if ($scene === null || $scene->lesson === null) {
            return;
        }
        $locale = ChoicePrompt::locale($scene->lesson);
        $spoken = ChoicePrompt::spoken($scene->config, $locale);
        $hash = ChoicePrompt::hash($spoken);
        if ($spoken === '') {
            return;
        }
        $text = PronunciationLexicon::apply($tts->prepareSpeechText($spoken), $scene->lesson->teacher?->locale);
        ['provider' => $provider, 'voice' => $voice, 'locale' => $voiceLocale] = GenerateSceneAudio::narratorVoice($scene, $text);
        // Already recorded, in this voice: the same words after a new narrator voice are recorded again.
        $have = ($scene->config ?? [])['links_audio'] ?? null;
        if (is_array($have) && ($have['hash'] ?? null) === $hash && ($have['voice'] ?? null) === $provider.':'.$voice
            && Storage::disk('public')->exists((string) ($have['path'] ?? ''))) {
            return;
        }
        $timing = null;
        $audio = $tts->generateAudioRaw($text, $voice, (float) ($scene->lesson->narrator?->voice_speed ?? 1.0), $provider, $timing, $voiceLocale);
        if ($audio === null) {
            throw new \RuntimeException('TTS service returned no audio for the choices.');
        }
        $path = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/choices.{$tts->lastExtension()}";
        Storage::disk('public')->put($path, $audio);

        // Written onto the scene as it is NOW: the teacher may have edited something else meanwhile.
        // A recording of words the scene no longer says is not kept: a later job records those.
        $scene->refresh();
        $config = $scene->config ?? [];
        if (ChoicePrompt::hash(ChoicePrompt::spoken($config, $locale)) !== $hash) {
            return;
        }
        $config['links_audio'] = ['path' => $path, 'hash' => $hash, 'text' => $spoken, 'locale' => $locale, 'voice' => $provider.':'.$voice];
        $scene->config = $config;
        // Quietly: a recording is not an edit the teacher can undo, nor a new lesson version. The
        // player's cached copy of the lesson is let go by hand, so the class hears it at once.
        $scene->saveQuietly();
        Cache::forget('lesson.player.'.strtoupper((string) $scene->lesson->lesson_code));
    }
}
