<?php

declare(strict_types=1);

namespace Tests\Feature\Narration;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\Support\NarrationEta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The Script panel asks narrationState while it waits for a re-narration (Bart 11-24: the audio was back in two
 * seconds and the panel kept spinning for minutes).
 */
class NarrationStateTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_script_panel_hears_when_the_new_recording_matches_the_words(): void
    {
        Storage::fake('public');
        $teacher = User::factory()->create();
        $scene = app(LessonComposer::class)->build([
            'key' => 'Narration state', 'language' => 'nl',
            'scenes' => [['type' => 'story', 'script' => 'Dante schrijft in Ravenna.']],
        ], $teacher, narrate: false)->scenes()->firstOrFail();

        $component = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson]);

        $scene->update(['status' => 'generating']);
        $this->assertSame('generating', $component->instance()->narrationState($scene->id)['status']);

        $scene->update(['status' => 'ready', 'audio_path' => "lessons/{$scene->lesson_id}/scenes/{$scene->id}/audio.mp3", 'audio_script_hash' => sha1((string) $scene->script_segment)]);
        $state = $component->instance()->narrationState($scene->id);
        $this->assertSame('ready', $state['status']);
        $this->assertTrue($state['audioFresh']);
        $this->assertNotNull($state['audioUrl']);

        $scene->update(['script_segment' => 'Dante schrijft in Florence.']);
        $this->assertFalse($component->instance()->narrationState($scene->id)['audioFresh']);

        $this->assertSame('gone', $component->instance()->narrationState(999999)['status']);
    }

    public function test_a_punctuation_only_edit_keeps_the_recording_and_a_new_word_does_not(): void
    {
        Storage::fake('public');
        $teacher = User::factory()->create();
        $scene = app(LessonComposer::class)->build([
            'key' => 'Punctuation edit', 'language' => 'nl',
            'scenes' => [['type' => 'story', 'script' => 'Dante schrijft in Ravenna']],
        ], $teacher, narrate: false)->scenes()->firstOrFail();
        $scene->update(['audio_path' => "lessons/{$scene->lesson_id}/scenes/{$scene->id}/audio.mp3", 'audio_script_hash' => sha1((string) $scene->script_segment), 'status' => 'ready']);

        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);

        $editor->dispatch('scene:update-script', text: 'Dante schrijft, in Ravenna.', sceneId: $scene->id)->assertDispatched('scene:audio-still-fresh');
        $this->assertTrue($scene->fresh()->hasFreshAudio());

        $editor->dispatch('scene:update-script', text: 'Dante schrijft, in Florence.', sceneId: $scene->id);
        $this->assertFalse($scene->fresh()->hasFreshAudio());
    }

    public function test_re_narrate_starts_a_countdown_from_measured_recordings_and_it_ends_with_the_job(): void
    {
        Storage::fake('public');
        Queue::fake();
        Cache::flush();
        config(['services.tts.provider_override' => 'elevenlabs']);
        $teacher = User::factory()->create();
        $scene = app(LessonComposer::class)->build([
            'key' => 'Countdown', 'language' => 'en',
            'scenes' => [['type' => 'story', 'script' => str_repeat('In Hormuz the Polos look for a ship. ', 6)]],
        ], $teacher, narrate: false)->scenes()->firstOrFail();
        $chars = mb_strlen((string) $scene->script_segment);

        // Recordings so far: no wait, one second per hundred characters.
        Cache::forever('narration-eta:stats:elevenlabs', ['wait' => 2.0, 'rate' => 0.01]);
        $expected = (int) ceil(2.0 + 0.01 * $chars);

        $component = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson]);
        $clickedAt = microtime(true);
        $component->call('regenerate', $scene->id, 'audio');

        $state = $component->instance()->narrationState($scene->id);
        // The call re-renders the editor, which can take a few seconds on a cold run: the clock runs meanwhile.
        $spent = (int) ceil(microtime(true) - $clickedAt);
        $this->assertSame('generating', $state['status']);
        $this->assertSame($expected, $state['etaTotal']);
        $this->assertLessThanOrEqual($expected, $state['etaSeconds']);
        $this->assertGreaterThanOrEqual($expected - $spent - 1, $state['etaSeconds']);

        // A worker picked the job up half a second after the click and it finishes now: the countdown is
        // gone and the averages moved towards what was measured.
        NarrationEta::finished($scene->id, 'elevenlabs', $chars, $clickedAt + 0.5);
        $scene->update(['status' => 'ready']);
        $this->assertNull($component->instance()->narrationState($scene->id)['etaSeconds']);
        $stats = NarrationEta::stats('elevenlabs');
        $this->assertLessThan(2.0, $stats['wait']);
        $this->assertNotSame(0.01, $stats['rate']);
    }

    public function test_the_estimate_learns_and_ignores_a_worker_that_was_down(): void
    {
        Cache::flush();
        $this->assertSame((int) ceil(4.0 + 0.02 * 300), NarrationEta::estimate('elevenlabs', 300));

        // Five quick recordings pull the estimate down.
        foreach (range(1, 5) as $i) {
            NarrationEta::requested(1, 'elevenlabs', 300);
            NarrationEta::finished(1, 'elevenlabs', 300, microtime(true) - 1.0);
        }
        $this->assertLessThan((int) ceil(4.0 + 0.02 * 300), NarrationEta::estimate('elevenlabs', 300));

        // A job that waited ten minutes for a dead worker leaves the wait alone.
        $before = NarrationEta::stats('elevenlabs')['wait'];
        Cache::put('narration-eta:request:2', ['at' => microtime(true) - 600, 'estimate' => 9], 60);
        NarrationEta::finished(2, 'elevenlabs', 300, microtime(true) - 1.0);
        $this->assertSame($before, NarrationEta::stats('elevenlabs')['wait']);

        // A failed job stops its countdown.
        NarrationEta::requested(3, 'elevenlabs', 300);
        NarrationEta::forget(3);
        $this->assertNull(NarrationEta::remaining(3));
    }

    public function test_spoken_words_ignore_punctuation_capitals_and_spacing(): void
    {
        $this->assertSame('ravenna 1321 dante', Step3SceneConfigurator::spokenWords('Ravenna,  1321. Dante!'));
        $this->assertNotSame(Step3SceneConfigurator::spokenWords('Dante schrijft'), Step3SceneConfigurator::spokenWords('Dante schreef'));
    }
}
