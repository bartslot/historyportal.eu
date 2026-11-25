<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\LayerKeys;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** Group / Ungroup on a 2.5D stage (GroupsStage25dLayers): a group with its own values and keys, undoable. */
class GroupLayersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.webp'],
            ['id' => 'tree-birch-01', 'layer' => 'mid', 'file' => 'b.webp'],
        ]]));
    }

    private function scene(): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'beat' => 'hook', 'set' => ['layers' => [
                ['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.4, 'z' => 20.0],
                ['asset' => 'tree-birch-01', 'depth' => 'mid', 'x' => 0.6, 'z' => 20.0],
                ['asset' => 'tree-birch-01', 'depth' => 'mid', 'x' => 0.9],
            ]]]],
        ]);
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);
    }

    public function test_group_makes_one_group_round_the_layers_and_selects_it(): void
    {
        $scene = $this->scene();

        $this->editor($scene)->call('groupStage25dLayers', [0, 1])
            ->assertDispatched('stage25d:select', id: 'group-g1')
            ->assertSet('activeStage25dLayer', 'group-g1');

        $set = $scene->fresh()->config['stage25d']['set'];
        $this->assertSame('g1', $set['groups'][0]['id']);
        $this->assertEqualsWithDelta(0.5, $set['groups'][0]['rest']['x'], 1e-6);
        $this->assertSame(['g1', 'g1'], [$set['layers'][0]['group'], $set['layers'][1]['group']]);
        $this->assertArrayNotHasKey('group', $set['layers'][2]);
    }

    public function test_a_groups_values_and_keys_save_on_the_group_and_one_undo_takes_a_group_back(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene)->call('groupStage25dLayers', [0, 1]);

        $editor->call('saveStage25dLayer', 0, ['group' => ['id' => 'g1', 'x' => 0.7, 'scale' => 99, 'name' => ' Hut <b>and</b> tree ']], $scene->id);
        $group = $scene->fresh()->config['stage25d']['set']['groups'][0];
        $this->assertSame(0.7, $group['x']);
        $this->assertSame(20.0, $group['scale']);   // held to its range
        $this->assertSame('Hut and tree', $group['name']);

        // the timeline's keys for the group's row land on the group (LayerKeys::applyTo, as saveStage25dKeys uses it)
        $config = LayerKeys::applyTo($scene->fresh()->config, ['group-g1' => [['t' => 0, 'x' => 0.5], ['t' => 2, 'x' => 0.7]], 'group-gone' => [['t' => 0, 'x' => 0.1]]], 8.0);
        $this->assertCount(2, $config['stage25d']['set']['groups'][0]['keys']);
        $this->assertCount(1, $config['stage25d']['set']['groups']);

        $fresh = $this->scene();
        $this->editor($fresh)->call('groupStage25dLayers', [0, 1])->call('undoLastEdit');
        $this->assertArrayNotHasKey('groups', $fresh->fresh()->config['stage25d']['set']);
    }

    public function test_ungroup_leaves_each_layer_where_the_group_put_it(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene)->call('groupStage25dLayers', [0, 1])
            ->call('saveStage25dLayer', 0, ['group' => ['id' => 'g1', 'x' => 0.6]], $scene->id)
            ->call('ungroupStage25d', 'g1');

        $set = $scene->fresh()->config['stage25d']['set'];
        $this->assertArrayNotHasKey('groups', $set);
        $this->assertArrayNotHasKey('group', $set['layers'][0]);
        $this->assertEqualsWithDelta(0.5, $set['layers'][0]['x'], 1e-4);
        $this->assertEqualsWithDelta(0.7, $set['layers'][1]['x'], 1e-4);
        $editor->assertDispatched('stage25d:deselect');
    }

    public function test_deleting_a_group_deletes_its_layers_and_the_last_layer_takes_its_group_along(): void
    {
        $scene = $this->scene();
        $this->editor($scene)->call('groupStage25dLayers', [0, 1])->call('deleteObject', 's25_group-g1');
        $set = $scene->fresh()->config['stage25d']['set'];
        $this->assertCount(1, $set['layers']);
        $this->assertArrayNotHasKey('groups', $set);

        $other = $this->scene();
        $this->editor($other)->call('groupStage25dLayers', [2])->call('deleteObject', 's25_layer-2');
        $this->assertArrayNotHasKey('groups', $other->fresh()->config['stage25d']['set']);
    }

    public function test_a_member_pasted_into_another_scene_keeps_the_place_its_moved_group_gave_it(): void
    {
        $from = $this->scene();
        $config = $from->config;
        $config['stage25d']['set']['groups'] = [['id' => 'g1', 'rest' => ['x' => 0.5, 'z' => 20.0], 'x' => 0.6, 'opacity' => 0.5]];
        $config['stage25d']['set']['layers'][1]['group'] = 'g1';
        $from->update(['config' => $config]);
        $to = Scene::create([
            'lesson_id' => $from->lesson_id, 'order' => 2, 'kind' => 'stage25d', 'script_segment' => 'y', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'beat' => 'hook', 'set' => ['layers' => []]]],
        ]);

        $this->editor($to)->call('duplicateObjects', ['s25_layer-1'], $from->id);

        $pasted = $to->fresh()->config['stage25d']['set']['layers'][0];
        $this->assertArrayNotHasKey('group', $pasted);
        $this->assertEqualsWithDelta(0.7, $pasted['x'], 1e-4);
        $this->assertEqualsWithDelta(0.5, $pasted['opacity'], 1e-6);
    }
}
