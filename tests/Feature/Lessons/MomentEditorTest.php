<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\TtsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Mockery;
use Tests\TestCase;

/**
 * Bart's rule for the power-meter moment: a teacher can change everything and change it back.
 */
class MomentEditorTest extends TestCase
{
    use RefreshDatabase;

    private const SHIP = 'history-line/props/tasman/ships_pair_far';

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
        $path = 'svg-assets/bundled/'.self::SHIP.'.webp';
        Storage::disk('public')->put($path, 'ship');
        SvgAsset::factory()->create(['user_id' => null, 'source' => 'bundled', 'source_ref' => self::SHIP.'.webp', 'svg_path' => $path, 'title' => 'Two ships']);
    }

    private function compose(?array $moment = null): Scene
    {
        $panel = ['type' => 'story', 'script' => 'Er staat geen zuchtje wind.', 'layers' => [['asset' => self::SHIP]]];

        return app(LessonComposer::class)->build([
            'key' => 'Moment editor', 'language' => 'nl',
            'scenes' => [$moment ? $panel + ['moment' => $moment] : $panel],
        ], $this->teacher, narrate: false)->scenes()->firstOrFail();
    }

    private function wind(): array
    {
        return [
            'meter_label' => 'Windmeter', 'prompt' => 'Roep de woorden!',
            'words' => ['right' => ['westenwind', 'zeilen'], 'wrong' => ['motor']],
            'after' => 'De Heemskerck vaart weer.', 'after_audio' => '/storage/lessons/1/after.mp3',
            'payoff' => ['type' => 'move', 'layer' => self::SHIP, 'to_x' => 120],
        ];
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id);
    }

    public function test_a_panel_without_a_moment_can_turn_one_on_and_fill_it_in(): void
    {
        $scene = $this->compose();

        $this->editor($scene)
            ->assertSeeHtml('data-moment-inspector')
            ->assertSet('momentDraft.enabled', false)
            ->call('toggleMoment')
            ->assertSeeHtml('data-moment-words="right"')
            ->set('momentDraft.meter_label', '<b>Ankermeter</b>')
            ->call('saveMomentDraft')
            ->call('addMomentWord', 'right')
            ->set('momentDraft.words.right.0', 'ankerlier')
            ->set('momentDraft.teams', 1)
            ->set('momentDraft.payoff.to_x', 900)
            ->call('saveMomentDraft')
            ->call('setMomentPayoff', 'camera')
            ->call('setMomentPayoff', 'teleport');

        $moment = $scene->fresh()->config['moment'];
        $this->assertTrue($moment['enabled']);
        $this->assertSame('Ankermeter', $moment['meter_label']);
        $this->assertSame(['ankerlier'], $moment['words']['right']);
        $this->assertSame(2, $moment['teams']);
        $this->assertEquals(150.0, $moment['payoff']['to_x']);
        $this->assertSame('camera', $moment['payoff']['type']);
    }

    public function test_editing_the_after_line_drops_its_recording_and_reset_puts_everything_back(): void
    {
        $scene = $this->compose($this->wind());
        $original = $scene->config['moment'];
        $this->assertSame('/storage/lessons/1/after.mp3', $original['after_audio']);

        $editor = $this->editor($scene)
            ->assertSee('Two ships')
            ->set('momentDraft.words.wrong.0', 'stoommachine')
            ->set('momentDraft.after_audio', '/storage/forged.mp3')
            ->call('saveMomentDraft');
        $this->assertSame('/storage/lessons/1/after.mp3', $scene->fresh()->config['moment']['after_audio']);   // never from the browser

        $editor->set('momentDraft.after', 'Daar gaan ze.')->call('saveMomentDraft');
        $this->assertSame('', $scene->fresh()->config['moment']['after_audio']);

        $editor->call('removeMomentWord', 'right', 0)->call('resetMoment')->assertDispatched('toast');
        $this->assertSame($original, $scene->fresh()->config['moment']);
        $this->assertTrue($editor->instance()->momentIsDefault());
    }

    public function test_renarrate_records_the_after_line_only_when_asked(): void
    {
        $scene = $this->compose($this->wind());
        $provider = null;
        $tts = Mockery::mock(TtsService::class)->makePartial();
        $tts->shouldReceive('generateAudioRaw')->once()->andReturnUsing(function (string $text, string $voice, float $speed, string $p) use (&$provider): string {
            $provider = $p;

            return 'mp3-bytes';
        });
        $tts->shouldReceive('lastProvider')->andReturnUsing(function () use (&$provider): ?string {
            return $provider;
        });
        $this->app->instance(TtsService::class, $tts);

        $this->editor($scene)
            ->set('momentDraft.after', 'Daar gaan ze.')
            ->call('saveMomentDraft')
            ->call('renarrateMomentAfter')
            ->assertDispatched('toast');

        $audio = $scene->fresh()->config['moment']['after_audio'];
        $this->assertStringStartsWith("/storage/lessons/{$scene->lesson_id}/narration-cache/lines/", $audio);
        Storage::disk('public')->assertExists(substr($audio, strlen('/storage/')));
    }

    public function test_the_teacher_switches_a_moment_to_the_microphone_and_its_meter_needs_no_words(): void
    {
        $scene = $this->compose($this->wind());

        $this->editor($scene)
            ->set('momentDraft.input', 'silence')
            ->call('saveMomentDraft')
            ->assertSee('Quiet for (seconds)')
            ->set('momentDraft.words.right', [])
            ->set('momentDraft.goal', 6)
            ->set('momentDraft.input_options.threshold', 5)
            ->set('momentDraft.input_options.hold_seconds', 8)
            ->call('saveMomentDraft')
            ->set('momentDraft.input', 'telepathy')
            ->call('saveMomentDraft');

        $moment = $scene->fresh()->config['moment'];
        $this->assertSame('silence', $moment['input']);
        $this->assertSame([], $moment['words']['right']);
        $this->assertSame(6, $moment['goal']);
        $this->assertEquals(['threshold' => 1.0, 'hold_seconds' => 8.0], $moment['input_options']);
    }

    public function test_rhythm_and_phone_motion_have_their_own_settings_and_pitch_is_gone(): void
    {
        $scene = $this->compose($this->wind());

        $editor = $this->editor($scene)
            ->set('momentDraft.input', 'rhythm')
            ->call('saveMomentDraft')
            ->assertSee('Tempo (beats per minute)')
            ->set('momentDraft.input_options.bpm', 500)
            ->set('momentDraft.input_options.beats', 6)
            ->call('saveMomentDraft');
        $this->assertEquals(['bpm' => 200.0, 'beats' => 6.0], $scene->fresh()->config['moment']['input_options']);

        $editor->set('momentDraft.input', 'motion')
            ->set('momentDraft.input_options.gesture', 'tilt')
            ->call('saveMomentDraft')
            ->assertSee('Hold the tilt (seconds)')
            ->set('momentDraft.input', 'pitch')
            ->call('saveMomentDraft');
        $moment = $scene->fresh()->config['moment'];
        $this->assertSame('motion', $moment['input']);           // a made-up input keeps the stored one
        $this->assertSame('tilt', $moment['input_options']['gesture']);
        $this->assertNotContains('pitch', \App\Services\Lessons\MomentSpec::INPUTS);
    }

    public function test_the_whole_scene_save_cleans_the_moment_and_never_rewrites_its_default(): void
    {
        $scene = $this->compose($this->wind());
        $default = $scene->config['moment_default'];

        $this->editor($scene)
            ->set('selectedScene.config.moment.input', 'mindreading')
            ->set('selectedScene.config.moment.prompt', '<script>x</script>Roep!')
            ->set('selectedScene.config.moment.goal', 99)
            ->set('selectedScene.config.moment_default.prompt', 'Hacked')
            ->call('saveSelected');

        $config = $scene->fresh()->config;
        $this->assertSame('words', $config['moment']['input']);
        $this->assertSame('xRoep!', $config['moment']['prompt']);
        $this->assertSame(2, $config['moment']['goal']);
        $this->assertSame($default, $config['moment_default']);
    }
}
