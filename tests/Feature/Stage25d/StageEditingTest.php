<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\SceneStill;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class StageEditingTest extends TestCase
{
    use RefreshDatabase;

    private const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBD';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.webp'],
            ['id' => 'tree-birch-01', 'layer' => 'mid', 'file' => 'b.webp'],
        ]]));
    }

    private function scene(array $extra = []): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'beat' => 'hook', 'set' => ['layers' => [
                ['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6],
            ]]]],
            ...$extra,
        ]);
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);
    }

    public function test_a_still_is_stored_per_scene_hash_and_marks_the_scene_fresh(): void
    {
        $scene = $this->scene();
        $this->assertFalse(SceneStill::isFresh($scene));

        $this->assertTrue(SceneStill::store($scene, self::JPEG.'AAAA', SceneStill::hash($scene)));

        $scene->refresh();
        $this->assertTrue(SceneStill::isFresh($scene));
        $this->assertTrue(Storage::disk('public')->exists($scene->image_path));
    }

    public function test_a_still_whose_file_is_gone_is_not_fresh(): void
    {
        $scene = $this->scene();
        SceneStill::store($scene, self::JPEG.'AAAA');
        $scene->refresh();
        Storage::disk('public')->delete($scene->image_path);   // what an undo leaves behind: the old path of a replaced picture

        $this->assertFalse(SceneStill::isFresh($scene));
    }

    public function test_a_layer_added_since_the_page_loaded_opens_in_the_panel(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene);
        $editor->call('saveStage25dLayer', 1, ['add' => ['asset' => 'tree-birch-01']], $scene->id)
            ->call('selectInspectorTarget', 's25_layer-1')->assertSet('activeStage25dLayer', 'layer-1');
    }

    public function test_a_stale_or_bad_picture_is_refused_and_a_change_makes_the_scene_stale_again(): void
    {
        $scene = $this->scene();
        $this->assertFalse(SceneStill::store($scene, self::JPEG.'AAAA', 'deadbeef'), 'drawn for an older version of the scene');
        $this->assertFalse(SceneStill::store($scene, 'data:image/png;base64,AAAA'));
        $this->assertFalse(SceneStill::store($scene, 'data:image/jpeg;base64,'.base64_encode('not a jpeg')));

        SceneStill::store($scene, self::JPEG.'AAAA');
        $scene->refresh();
        $config = $scene->config;
        $config['stage25d']['set']['layers'][0]['x'] = 0.2;
        $scene->update(['config' => $config]);
        $this->assertFalse(SceneStill::isFresh($scene->refresh()));
    }

    public function test_the_editor_takes_the_picture_without_an_undo_step_and_the_load_says_when_one_is_wanted(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene);

        $editor->call('saveStage25dStill', $scene->id, self::JPEG.'AAAA');
        $this->assertTrue(SceneStill::isFresh($scene->fresh()));
        $this->assertSame($scene->fresh()->image_path, $editor->get('selectedScene.image_path'), 'the open scene snapshot keeps the picture');
        $editor->call('selectScene', $scene->id)->assertDispatched('scene:load', fn ($name, $params) => $params['payload']['stillStale'] === false);
    }

    public function test_the_editor_lists_the_stage_scenes_without_a_thumbnail_for_the_rail_to_fill(): void
    {
        $scene = $this->scene();
        $other = Scene::create([
            'lesson_id' => $scene->lesson_id, 'order' => 2, 'kind' => 'stage25d', 'script_segment' => 'y', 'status' => 'ready',
            'config' => $scene->config,
        ]);
        Scene::create(['lesson_id' => $scene->lesson_id, 'order' => 3, 'kind' => 'game', 'script_segment' => 'z', 'status' => 'ready']);
        SceneStill::store($scene, self::JPEG.'AAAA');

        $stale = $this->editor($scene)->instance()->stage25dStaleStills();

        $this->assertSame([$other->id], array_column($stale, 'id'));   // not the one with a picture, not the game
        $this->assertSame(SceneStill::hash($other), $stale[0]['hash']);
        $this->assertSame($other->config['stage25d'], $stale[0]['config']);
    }

    public function test_a_ground_band_of_the_painted_landscape_opens_its_panel_and_takes_another_landscape_picture(): void
    {
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.webp'],
            ['id' => 'meadow-band-01', 'layer' => 'mid', 'file' => 'm.webp', 'tags' => ['meadow', 'ground'], 'height_m' => 22.8, 'w' => 1536, 'h' => 599],
            ['id' => 'ground-heath-01', 'layer' => 'fg', 'file' => 'h.webp', 'tags' => ['ground', 'heath'], 'height_m' => 6.9, 'w' => 1536, 'h' => 574],
            ['id' => 'reeds-01', 'layer' => 'fg', 'file' => 'r.webp', 'tags' => ['reeds', 'water'], 'height_m' => 2.5, 'w' => 500, 'h' => 600],
            ['id' => 'bg-farmland-01', 'layer' => 'bg', 'file' => 'b.webp', 'tags' => ['fields', 'farm'], 'height_m' => 78.1],
            ['id' => 'fig-meisje-stand-01', 'layer' => 'figure', 'file' => 'f.webp'],
        ]]));
        $scene = $this->scene();
        $config = $scene->config;
        $config['stage25d']['set']['groundBands'] = [['asset' => 'meadow-band-01', 'z' => 30]];
        $scene->update(['config' => $config]);
        $editor = $this->editor($scene);

        $editor->call('selectInspectorTarget', 's25_band-0')->assertSet('activeStage25dLayer', 'band-0');
        $editor->call('saveStage25dLayer', 0, ['band' => ['index' => 0, 'asset' => 'fig-meisje-stand-01']], $scene->id);   // no figure as landscape
        $editor->call('saveStage25dLayer', 0, ['band' => ['index' => 0, 'asset' => 'bg-farmland-01']], $scene->id);        // nor a far plate: a close-up of its land
        $editor->call('saveStage25dLayer', 0, ['band' => ['index' => 0, 'asset' => 'reeds-01']], $scene->id);              // nor a plant: as tall as the view
        $editor->call('saveStage25dLayer', 0, ['band' => ['index' => 3, 'asset' => 'ground-heath-01']], $scene->id);       // no such band
        $this->assertSame('meadow-band-01', $scene->fresh()->config['stage25d']['set']['groundBands'][0]['asset']);

        $editor->call('saveStage25dLayer', 0, ['band' => ['index' => 0, 'asset' => 'ground-heath-01']], $scene->id);
        $bands = $scene->fresh()->config['stage25d']['set']['groundBands'];
        $this->assertSame([['asset' => 'ground-heath-01', 'z' => 30]], $bands);
        $this->assertSame('stone-chamber-01', $scene->fresh()->config['stage25d']['set']['layers'][0]['asset'], 'the layers are untouched');

        $editor->call('undoLastEdit');   // one undo: the old picture, where it stood
        $this->assertSame([['asset' => 'meadow-band-01', 'z' => 30]], $scene->fresh()->config['stage25d']['set']['groundBands']);
    }

    public function test_a_ground_band_and_the_sky_take_size_distance_height_motion_and_keys_and_undo(): void
    {
        $scene = $this->scene();
        $config = $scene->config;
        $config['stage25d']['set']['groundBands'] = [['asset' => 'meadow-band-01', 'z' => 30]];
        $config['stage25d']['set']['sky'] = 'sky-summer-01';
        $scene->update(['config' => $config]);
        $editor = $this->editor($scene);

        $editor->call('saveStage25dLayer', 0, ['band' => ['index' => 0, 'z' => 45, 'scale' => 1.5, 'y' => 9, 'rotation' => 30]], $scene->id)
            ->call('saveStage25dLayer', 0, ['band' => ['index' => 0, 'motion' => ['kind' => 'sway', 'amount' => 0.5, 'speed' => 1]]], $scene->id)
            ->call('saveStage25dLayer', 0, ['skyLayer' => ['y' => 3, 'opacity' => 0.8, 'z' => 50]], $scene->id)
            ->call('setTimeline', ['duration' => 8, 'sceneId' => $scene->id, 'targets' => [], 'tracks' => [], 'stage25dKeys' => [
                'layer-0' => [], 'band-0' => [['t' => 0, 'z' => 30], ['t' => 4, 'z' => 60]], 'sky' => [['t' => 0, 'opacity' => 0], ['t' => 2, 'opacity' => 1]], 'band-7' => [['t' => 0, 'z' => 5]],
            ]]);
        $set = $scene->fresh()->config['stage25d']['set'];

        // a band stands on the floor: no Y, no angle; the sky spans the view: no distance
        $this->assertEquals(['asset' => 'meadow-band-01', 'z' => 45, 'scale' => 1.5, 'motion' => ['kind' => 'sway', 'amount' => 0.5, 'speed' => 1.0],
            'keys' => [['t' => 0, 'z' => 30], ['t' => 4, 'z' => 60]]], $set['groundBands'][0]);
        $this->assertEquals(['y' => 3, 'opacity' => 0.8, 'keys' => [['t' => 0, 'opacity' => 0], ['t' => 2, 'opacity' => 1]]], $set['skyLayer']);
        $this->assertCount(1, $set['groundBands'], 'an unknown band adds nothing');

        $editor->call('undoLastEdit');
        $this->assertArrayNotHasKey('keys', $scene->fresh()->config['stage25d']['set']['groundBands'][0], 'undo takes the keys back');
        $editor->call('undoLastEdit')->call('undoLastEdit')->call('undoLastEdit');
        $this->assertEquals(['asset' => 'meadow-band-01', 'z' => 30], $scene->fresh()->config['stage25d']['set']['groundBands'][0], 'and every value');
    }

    public function test_the_layer_panel_changes_picture_motion_and_adds_a_layer_from_the_library(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene);

        $editor->call('saveStage25dLayer', 0, ['asset' => 'tree-birch-01', 'motion' => ['kind' => 'sway', 'amount' => 9, 'speed' => 2]], $scene->id)
            ->call('saveStage25dLayer', 0, ['asset' => 'not-in-library'], $scene->id)
            ->call('saveStage25dLayer', 0, ['motion' => ['kind' => 'explode']], $scene->id)
            ->call('saveStage25dLayer', 0, ['add' => ['asset' => 'stone-chamber-01', 'depth' => 'fg', 'x' => 0.3]], $scene->id)
            ->call('saveStage25dLayer', 0, ['add' => ['asset' => 'nope']], $scene->id);

        $layers = $scene->fresh()->config['stage25d']['set']['layers'];
        $this->assertCount(2, $layers);
        $this->assertSame('tree-birch-01', $layers[0]['asset']);
        $this->assertEquals(['kind' => 'sway', 'amount' => 5, 'speed' => 2], $layers[0]['motion'], 'amount is held to range; an unknown kind changes nothing');
        $this->assertSame(['asset' => 'stone-chamber-01', 'depth' => 'fg', 'x' => 0.3], $layers[1]);
    }

    public function test_a_layer_can_be_deleted_and_duplicated_like_any_artwork_layer(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene);
        $editor->call('saveStage25dLayer', 1, ['add' => ['asset' => 'tree-birch-01', 'x' => 0.3]], $scene->id);

        $editor->call('duplicateObjects', ['s25_layer-1']);
        $layers = $scene->fresh()->config['stage25d']['set']['layers'];
        $this->assertCount(3, $layers);
        $this->assertSame('tree-birch-01', $layers[2]['asset']);
        $this->assertEqualsWithDelta(0.35, $layers[2]['x'], 0.0001);

        $editor->call('deleteObject', 's25_layer-0');
        $this->assertSame(['tree-birch-01', 'tree-birch-01'], array_column($scene->fresh()->config['stage25d']['set']['layers'], 'asset'));

        $editor->call('deleteObject', 's25_layer-0')->call('deleteObject', 's25_layer-0');
        $this->assertCount(1, $scene->fresh()->config['stage25d']['set']['layers'], 'the last layer stays');
    }

    public function test_a_layer_moves_to_another_depth_but_the_sky_and_unknown_depths_stay(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene);
        $editor->call('saveStage25dLayer', 0, ['depth' => 'fg'], $scene->id)->call('saveStage25dLayer', 0, ['depth' => 'sky'], $scene->id)->call('saveStage25dLayer', 0, ['depth' => 'moon'], $scene->id);
        $this->assertSame('fg', $scene->fresh()->config['stage25d']['set']['layers'][0]['depth']);
    }

    public function test_dragging_in_the_object_list_reorders_by_depth_and_keeps_keys_and_apparent_size(): void
    {
        $scene = $this->scene();
        $config = $scene->config;
        $config['stage25d']['set']['layers'] = [
            ['asset' => 'tree-birch-01', 'depth' => 'bg', 'x' => 0.5],
            ['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6, 'keys' => [['t' => 0, 'x' => 0.1], ['t' => 2, 'x' => 0.9]]],
            ['asset' => 'tree-birch-01', 'depth' => 'fg', 'x' => 0.2],
        ];
        $scene->update(['config' => $config]);
        $editor = $this->editor($scene);

        // front first: [2 (fg), 1 (mid), 0 (bg)]. Drag the stone (1) to the top: it joins the front tier.
        $editor->call('reorderStage25dLayers', [1, 2, 0], 1, $scene->id);
        $layers = $scene->fresh()->config['stage25d']['set']['layers'];
        $this->assertSame(['bg', 'fg', 'fg'], array_column($layers, 'depth'));
        $this->assertSame('stone-chamber-01', $layers[2]['asset'], 'in front of the other front picture');
        $this->assertCount(2, $layers[2]['keys'], 'its keys moved with it');
        $this->assertEqualsWithDelta(7.0 / 22.0, $layers[2]['scale'], 0.001, 'nearer: scaled down so it keeps its size on screen');

        $editor->call('reorderStage25dLayers', [0, 1], 0, $scene->id);   // a stale list changes nothing
        $this->assertCount(3, $scene->fresh()->config['stage25d']['set']['layers']);
    }

    public function test_the_sky_picture_can_be_swapped_for_another_sky_only(): void
    {
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.webp'],
            ['id' => 'sky-summer-01', 'layer' => 'sky', 'file' => 's.webp'],
            ['id' => 'sky-autumn-01', 'layer' => 'sky', 'file' => 't.webp'],
        ]]));
        $scene = $this->scene();
        $config = $scene->config;
        $config['stage25d']['set']['sky'] = 'sky-summer-01';
        $scene->update(['config' => $config]);

        $editor = $this->editor($scene);
        $editor->call('saveStage25dLayer', 0, ['sky' => 'sky-autumn-01'], $scene->id)->call('saveStage25dLayer', 0, ['sky' => 'stone-chamber-01'], $scene->id);
        $this->assertSame('sky-autumn-01', $scene->fresh()->config['stage25d']['set']['sky']);
        $editor->call('selectInspectorTarget', 's25_sky')->assertSet('activeStage25dLayer', 'sky');
    }

    public function test_look_sliders_save_inside_their_range_and_only_the_known_ones(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene);
        $editor->call('saveStage25dLook', 'smoke', 7, $scene->id)
            ->call('saveStage25dLook', 'housePitch', 4.5, $scene->id)
            ->call('saveStage25dLook', 'bogus', 1, $scene->id)
            ->call('saveStage25dLook', 'birds', 0.5, $scene->id + 1);

        $this->assertEquals(['smoke' => 1, 'housePitch' => 4.5], $scene->fresh()->config['stage25d']['look']);
    }

    public function test_selecting_a_layer_opens_its_panel_and_the_rail_names_a_scene_without_a_place(): void
    {
        $scene = $this->scene();
        $editor = $this->editor($scene);
        $editor->call('selectInspectorTarget', 's25_layer-0')->assertSet('activeStage25dLayer', 'layer-0')
            ->assertSeeHtml('data-stage25d-inspector="layer-0"');
        $editor->call('selectInspectorTarget', 's25_layer-9')->assertSet('activeStage25dLayer', null);
        $editor->call('selectInspectorTarget', '')->assertSeeHtml('data-stage25d-look')
            ->assertSeeHtml('data-stage25d-view')->assertDontSeeHtml('value="slideshow"')->assertSee('Scene details');
        $this->assertStringContainsString('hook', $this->editor($scene)->html(), 'the rail caption falls back to the beat');
    }
}
