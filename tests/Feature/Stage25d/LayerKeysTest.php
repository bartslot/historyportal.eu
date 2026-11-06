<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\LayerKeys;
use App\Services\Stage25d\LessonImporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class LayerKeysTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string,mixed> */
    private function stage(): array
    {
        return [
            'bundle' => 'nl-prehistory',
            'set' => ['layers' => [
                ['asset' => 'stone', 'depth' => 'mid', 'x' => 0.6],
                ['asset' => 'fig-a', 'depth' => 'fg', 'x' => 0.4, 'figure' => 'meisje'],
            ]],
            'figures' => [['char' => 'meisje', 'x' => 0.4]],
            'motion' => [
                ['target' => 'figure:0', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 0.4], ['time' => 6, 'value' => 0.5]]],
                ['target' => 'figure:0', 'property' => 'y', 'keyframes' => [['time' => 0, 'value' => 0], ['time' => 3, 'value' => 0]]],
                ['target' => 'figure:5', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 0.1], ['time' => 2, 'value' => 0.9]]],
            ],
        ];
    }

    public function test_motion_tracks_become_keys_on_the_matching_figure_layer(): void
    {
        [$stage, $r] = LayerKeys::fromMotion($this->stage());

        $this->assertSame(['converted' => 1, 'flat' => 1, 'unmatched' => 1], $r);
        $this->assertSame([['t' => 0.0, 'x' => 0.4], ['t' => 6.0, 'x' => 0.5]], $stage['set']['layers'][1]['keys']);
        $this->assertArrayNotHasKey('keys', $stage['set']['layers'][0]);
        $this->assertCount(1, $stage['motion'], 'only the unmatched track stays');
    }

    public function test_converting_twice_changes_nothing(): void
    {
        [$once] = LayerKeys::fromMotion($this->stage());
        [$twice, $r] = LayerKeys::fromMotion($once);

        $this->assertSame($once, $twice);
        $this->assertSame(0, $r['converted']);
    }

    public function test_sanitize_keeps_finite_numbers_once_per_moment_in_order(): void
    {
        $keys = LayerKeys::sanitize([
            ['t' => 4, 'x' => 0.9, 'junk' => 1],
            ['t' => 1, 'x' => 0.1],
            ['t' => 1, 'y' => 0.5],
            ['t' => 'no', 'x' => 1],
            ['t' => 2, 'x' => 'abc'],
            ['t' => 99, 'scale' => 2],
        ], 8.0);

        $this->assertSame([['t' => 1.0, 'x' => 0.1, 'y' => 0.5], ['t' => 4.0, 'x' => 0.9], ['t' => 8.0, 'scale' => 2.0]], $keys);
    }

    public function test_the_importer_emits_the_same_keys(): void
    {
        Storage::fake('public');
        $lesson = json_decode((string) file_get_contents(base_path('tests/Fixtures/stage25d/mini-lesson.json')), true);
        $lesson['scenes'][0]['motion'] = [['target' => 'figure:0', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 0.4], ['time' => 5, 'value' => 0.3]]]];

        $r = app(LessonImporter::class)->import($lesson, User::factory()->create());

        $this->assertSame(1, $r['keys']);
        $scene = Scene::where('lesson_id', $r['lesson_id'])->orderBy('order')->first();
        $this->assertEquals([['t' => 0, 'x' => 0.4], ['t' => 5, 'x' => 0.3]], $scene->config['stage25d']['set']['layers'][1]['keys']);
        $this->assertArrayNotHasKey('motion', $scene->config['stage25d']);
    }

    public function test_the_command_converts_and_dry_run_writes_nothing(): void
    {
        $scene = $this->sceneWith($this->stage());

        $this->artisan('lessons:keys-25d', ['--dry-run' => true])->assertSuccessful();
        $this->assertArrayHasKey('motion', $scene->fresh()->config['stage25d']);

        $this->artisan('lessons:keys-25d')->assertSuccessful();
        $this->assertCount(2, $scene->fresh()->config['stage25d']['set']['layers'][1]['keys']);
    }

    public function test_the_editor_saves_keys_onto_the_layers_and_undoes_them(): void
    {
        $scene = $this->sceneWith($this->stage());
        $teacher = $scene->lesson->teacher;
        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);

        $editor->call('setTimeline', ['duration' => 8, 'sceneId' => $scene->id, 'targets' => [], 'tracks' => [], 'stage25dKeys' => [
            'layer-0' => [['t' => 0, 'x' => 0.2], ['t' => 3, 'x' => 0.8]],
            'layer-1' => [],
            'layer-9' => [['t' => 1, 'x' => 1]],
        ]])->assertNotDispatched('scene:load');

        $layers = $scene->fresh()->config['stage25d']['set']['layers'];
        $this->assertEquals([['t' => 0, 'x' => 0.2], ['t' => 3, 'x' => 0.8]], $layers[0]['keys']);
        $this->assertArrayNotHasKey('keys', $layers[1]);
        $this->assertCount(2, $layers, 'an unknown layer adds nothing');

        $editor->call('undoLastEdit');
        $this->assertArrayNotHasKey('keys', $scene->fresh()->config['stage25d']['set']['layers'][0]);
    }

    public function test_keys_meant_for_another_scene_are_ignored_and_values_are_held_to_range(): void
    {
        $scene = $this->sceneWith($this->stage());
        $editor = Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);

        $editor->call('setTimeline', ['duration' => 8, 'sceneId' => $scene->id + 1, 'targets' => [], 'tracks' => [], 'stage25dKeys' => ['layer-0' => [['t' => 1, 'x' => 0.5]]]]);
        $this->assertArrayNotHasKey('keys', $scene->fresh()->config['stage25d']['set']['layers'][0]);

        $editor->call('setTimeline', ['duration' => 4, 'sceneId' => $scene->id, 'targets' => [], 'tracks' => [], 'stage25dKeys' => ['layer-0' => [['t' => 1, 'x' => 1e9, 'opacity' => 50], ['t' => 6, 'scale' => -5]]]]);
        $keys = $scene->fresh()->config['stage25d']['set']['layers'][0]['keys'];
        $this->assertEquals([['t' => 1, 'x' => 3, 'opacity' => 1], ['t' => 6, 'scale' => 0.01]], $keys, 'x and opacity held to range; 6s survives a 4s panel because the scene is longer');
        $editor->call('saveStage25dLayer', 0, ['x' => 0.1], $scene->id + 1);
        $this->assertSame(0.6, $scene->fresh()->config['stage25d']['set']['layers'][0]['x'], 'a save for another scene changes nothing');
    }

    public function test_a_base_value_is_saved_on_its_layer_and_nothing_else_is(): void
    {
        $scene = $this->sceneWith($this->stage());
        Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('saveStage25dLayer', 0, ['x' => 0.7, 'y' => 0.25, 'asset' => 'hacked', 'rotation' => 'x'], $scene->id)
            ->call('saveStage25dLayer', 7, ['x' => 1], $scene->id);

        $layer = $scene->fresh()->config['stage25d']['set']['layers'][0];
        $this->assertSame(0.7, $layer['x']);
        $this->assertSame(0.25, $layer['y']);
        $this->assertSame('stone', $layer['asset']);
        $this->assertArrayNotHasKey('rotation', $layer);
    }

    public function test_an_animation_saves_its_speed_and_start_held_to_range_and_undo_takes_it_back(): void
    {
        $scene = $this->sceneWith($this->stage());
        $editor = Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('saveStage25dLayer', 0, ['play' => ['speed' => 1.5, 'offset' => 2]], $scene->id);
        $this->assertEquals(['speed' => 1.5, 'offset' => 2.0], $scene->fresh()->config['stage25d']['set']['layers'][0]['play']);

        $editor->call('undoLastEdit');
        $this->assertArrayNotHasKey('play', $scene->fresh()->config['stage25d']['set']['layers'][0]);

        $editor->call('saveStage25dLayer', 0, ['play' => ['speed' => 99, 'offset' => -4, 'loop' => 'x']], $scene->id);
        $this->assertEquals(['speed' => 5.0, 'offset' => 0.0], $scene->fresh()->config['stage25d']['set']['layers'][0]['play'], 'held to range, unknown keys dropped');

        $editor->call('saveStage25dLayer', 0, ['play' => ['speed' => 'fast']], $scene->id);
        $this->assertEquals(5.0, $scene->fresh()->config['stage25d']['set']['layers'][0]['play']['speed'], 'a non-number changes nothing');
    }

    public function test_a_bone_is_a_field_of_a_layer_and_of_its_keys(): void
    {
        $scene = $this->sceneWith(['bundle' => 'nl-prehistory', 'set' => ['layers' => [['asset' => 'a', 'depth' => 'mid', 'keys' => [['t' => 1, 'x' => 0.2]]]]]]);
        $editor = Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('saveStage25dLayer', 0, ['bone:head' => 12, 'bone:forearm_n' => 999, 'bone:nope' => 3, 'keys' => [['t' => 2, 'bone:chest' => -5, 'bone:nope' => 1], ['t' => 'x']]], $scene->id);
        $layer = $scene->fresh()->config['stage25d']['set']['layers'][0];
        $this->assertEquals(12.0, $layer['bone:head']);
        $this->assertEquals(180.0, $layer['bone:forearm_n'], 'held to a turn');
        $this->assertArrayNotHasKey('bone:nope', $layer);
        $this->assertEquals([['t' => 2.0, 'bone:chest' => -5.0]], $layer['keys']);

        $editor->call('saveStage25dLayer', 0, ['keys' => []], $scene->id);
        $this->assertArrayNotHasKey('keys', $scene->fresh()->config['stage25d']['set']['layers'][0], 'an empty list takes the keys away');
    }

    public function test_an_undo_keeps_a_layer_that_is_still_there_selected(): void
    {
        $scene = $this->sceneWith(['bundle' => 'nl-prehistory', 'set' => ['layers' => [['asset' => 'a', 'depth' => 'mid']]]]);
        Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('selectInspectorTarget', 's25_layer-0')
            ->call('saveStage25dLayer', 0, ['x' => 0.2], $scene->id)
            ->call('undoLastEdit')
            ->assertDispatched('timeline-restored', fn (string $name, array $params) => $params['keepSelection'] === true)
            ->assertSet('activeStage25dLayer', 'layer-0');
    }

    public function test_an_undo_lets_go_of_a_layer_that_is_gone(): void
    {
        $scene = $this->sceneWith(['bundle' => 'nl-prehistory', 'set' => ['layers' => [['asset' => 'a', 'depth' => 'mid']]]]);
        Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('duplicateStage25dLayers', [0])
            ->call('selectInspectorTarget', 's25_layer-1')
            ->call('undoLastEdit')
            ->assertDispatched('timeline-restored', fn (string $name, array $params) => $params['keepSelection'] === false)
            ->assertSet('activeStage25dLayer', null);
    }

    public function test_play_reads_only_numbers(): void
    {
        $this->assertNull(LayerKeys::play(null));
        $this->assertNull(LayerKeys::play(['speed' => 'x']));
        $this->assertSame(['offset' => 600.0], LayerKeys::play(['offset' => 1e9]));
        $this->assertSame(['speed' => 0.0], LayerKeys::play(['speed' => 0]));
    }

    public function test_play_keeps_a_list_of_frames_on_the_sheet_and_a_real_loop(): void
    {
        $this->assertSame(['frames' => [3, 3, 0]], LayerKeys::play(['frames' => [3, 3, 0]], 48));
        $this->assertSame(['frames' => [47]], LayerKeys::play(['frames' => [48, -1, '2', 1.5, 47]], 48), 'only frames on the sheet');
        $this->assertNull(LayerKeys::play(['frames' => [99]], 48));
        $this->assertNull(LayerKeys::play(['frames' => 'all']));
        $this->assertCount(LayerKeys::PLAY_FRAMES_MAX, LayerKeys::play(['frames' => array_fill(0, 5000, 1)])['frames']);
        $this->assertSame(['loop' => false], LayerKeys::play(['loop' => false]));
        $this->assertNull(LayerKeys::play(['loop' => 'no']));
    }

    /** @param  array<string,mixed>  $stage */
    private function sceneWith(array $stage): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'duration_seconds' => 8,
            'config' => ['stage25d' => $stage], 'status' => 'ready',
        ]);
    }
}
