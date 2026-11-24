<?php

declare(strict_types=1);

namespace Tests\Feature\Narration;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
