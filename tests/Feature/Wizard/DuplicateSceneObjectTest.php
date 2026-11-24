<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class DuplicateSceneObjectTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    private Scene $otherScene;

    private SvgAsset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = $this->makeLesson($this->teacher);
        $this->asset = SvgAsset::create([
            'user_id' => $this->teacher->id, 'source' => 'commons', 'source_ref' => 'w',
            'source_url' => 'https://example.com/w.svg', 'title' => 'Windmill',
            'license' => 'CC0', 'svg_path' => 'assets/windmill.svg',
        ]);

        $this->scene = $this->makeScene($this->lesson, 1, [
            'shots' => [[
                'order' => 0,
                'image_path' => 'bg.png',
                'layers' => [
                    ['path' => 'bg.png', 'kind' => 'cover', 'depth' => 0.4],
                    ['asset_id' => $this->asset->id, 'path' => 'assets/windmill.svg', 'kind' => 'figure', 'x' => 40.0, 'y' => 60.0, 'tint' => '#aa0000'],
                    ['asset_id' => 1_500_000_000, 'kind' => 'embed', 'embed' => ['type' => 'video', 'src' => 'https://www.youtube.com/embed/x'], 'x' => 50.0, 'y' => 50.0],
                ],
            ]],
            'config' => ['texts' => [
                ['id' => 'txt_title', 'text' => 'Dam Square', 'x' => 10.0, 'y' => 10.0, 'size' => 'xl', 'anchor' => 'screen'],
                ['id' => 'rect_panel', 'kind' => 'rect', 'side' => 'left', 'color' => '#0f172a', 'opacity' => 0.5],
            ]],
        ]);
        $this->otherScene = $this->makeScene($this->lesson, 2, ['image_path' => null, 'shots' => null, 'config' => null]);
    }

    public function test_duplicating_an_image_layer_adds_an_offset_copy_in_front_that_shares_the_file(): void
    {
        $this->editor()->call('duplicateObjects', ['art_'.$this->asset->id])
            ->assertDispatched('scene:objects-duplicated');

        $layers = $this->scene->fresh()->shots[0]['layers'];
        $this->assertCount(4, $layers);
        $copy = $layers[2];   // right after the original, so one step in front of it
        $this->assertNotSame($this->asset->id, $copy['asset_id']);
        $this->assertSame($this->asset->id, $copy['src_asset_id']);
        $this->assertSame('assets/windmill.svg', $copy['path']);
        $this->assertSame('#aa0000', $copy['tint']);
        $this->assertEquals(43.0, $copy['x']);
        $this->assertEquals(63.0, $copy['y']);
        $this->assertSame(1, SvgAsset::count(), 'no library row is cloned');
    }

    public function test_a_duplicated_image_keeps_its_title_and_opens_in_the_inspector(): void
    {
        $component = $this->editor()->call('duplicateObjects', ['art_'.$this->asset->id]);
        $copyId = $this->scene->fresh()->shots[0]['layers'][2]['asset_id'];

        $component->call('selectInspectorTarget', 'art_'.$copyId)
            ->assertSet('activeLayerId', $copyId);
        $titles = collect($component->instance()->serializeShots($this->scene->fresh())[0]['layers'])->pluck('title');
        $this->assertSame(['Windmill', 'Windmill'], $titles->filter()->values()->all());
    }

    public function test_the_copy_is_its_own_layer(): void
    {
        $component = $this->editor()->call('duplicateObjects', ['art_'.$this->asset->id]);
        $copyId = $this->scene->fresh()->shots[0]['layers'][2]['asset_id'];

        $component->call('deleteObject', 'art_'.$copyId);

        $ids = collect($this->scene->fresh()->shots[0]['layers'])->pluck('asset_id')->filter()->values()->all();
        $this->assertSame([$this->asset->id, 1_500_000_000], $ids, 'deleting the copy leaves the original');
    }

    public function test_duplicating_an_embed_gives_a_new_synthetic_id_and_no_source_asset(): void
    {
        $this->editor()->call('duplicateObjects', ['art_1500000000']);

        $copy = $this->scene->fresh()->shots[0]['layers'][3];
        $this->assertSame('embed', $copy['kind']);
        $this->assertNotSame(1_500_000_000, $copy['asset_id']);
        $this->assertNull($copy['src_asset_id']);
    }

    public function test_duplicating_a_text_box_and_a_panel_gives_fresh_ids_next_to_the_originals(): void
    {
        $this->editor()->call('duplicateObjects', ['txt_title', 'rect_panel']);

        $texts = $this->scene->fresh()->config['texts'];
        $this->assertCount(4, $texts);
        $this->assertSame('txt_title', $texts[0]['id']);
        $this->assertStringStartsWith('txt_', $texts[1]['id']);
        $this->assertNotSame('txt_title', $texts[1]['id']);
        $this->assertSame('Dam Square', $texts[1]['text']);
        $this->assertEquals(13.0, $texts[1]['x']);
        $this->assertStringStartsWith('rect_', $texts[3]['id']);
        $this->assertSame('left', $texts[3]['side']);
    }

    public function test_pasting_into_another_scene_keeps_the_position_and_builds_its_first_shot(): void
    {
        $this->editor()
            ->call('selectScene', $this->otherScene->id)
            ->call('duplicateObjects', ['art_'.$this->asset->id, 'txt_title'], $this->scene->id);

        $other = $this->otherScene->fresh();
        $this->assertEquals(40.0, $other->shots[0]['layers'][0]['x'], 'a paste lands where it was');
        $this->assertSame($this->asset->id, $other->shots[0]['layers'][0]['src_asset_id']);
        $this->assertSame('Dam Square', $other->config['texts'][0]['text']);
        $this->assertCount(3, $this->scene->fresh()->shots[0]['layers'], 'the source scene is untouched');
    }

    public function test_a_paste_into_another_scene_brings_the_timeline_keys_along(): void
    {
        $this->keyScene();

        $this->editor()
            ->call('selectScene', $this->otherScene->id)
            ->call('duplicateObjects', ['art_'.$this->asset->id, 'txt_title'], $this->scene->id);

        $other = $this->otherScene->fresh();
        $artId = $other->shots[0]['layers'][0]['asset_id'];
        $textId = $other->config['texts'][0]['id'];
        $tracks = collect($other->config['timeline']['tracks'])->keyBy(fn ($t) => $t['target'].'/'.$t['property']);
        $this->assertEquals(12.0, $other->config['timeline']['duration'], 'a scene with no timeline takes the source length');
        $this->assertEquals([['time' => 0.0, 'value' => 40.0], ['time' => 4.0, 'value' => 70.0, 'easing' => 'linear']], $tracks["art:{$artId}/x"]['keyframes'], 'the same keys, not moved');
        $this->assertEquals(0.5, $tracks["art:{$artId}/opacity"]['base']);
        $this->assertArrayHasKey("text:{$textId}/opacity", $tracks->all());
        $this->assertCount(3, $tracks, 'the other object\'s keys stay where they were');
    }

    public function test_a_paste_adds_its_keys_to_the_tracks_already_there(): void
    {
        $this->keyScene();
        $this->otherScene->update(['config' => ['timeline' => ['duration' => 6.0, 'targets' => ['camera:main'], 'tracks' => [
            ['target' => 'text:txt_own', 'property' => 'y', 'keyframes' => [['time' => 1.0, 'value' => 5.0]]],
        ]]]]);

        $this->editor()
            ->call('selectScene', $this->otherScene->id)
            ->call('duplicateObjects', ['txt_title'], $this->scene->id);

        $timeline = $this->otherScene->fresh()->config['timeline'];
        $this->assertEquals(6.0, $timeline['duration'], 'the scene keeps its own length');
        $this->assertSame(['camera:main'], $timeline['targets']);
        $this->assertSame(['text:txt_own', 'text:'.$this->otherScene->fresh()->config['texts'][0]['id']], array_column($timeline['tracks'], 'target'));
    }

    public function test_a_duplicate_keeps_its_keys_moved_along_with_it(): void
    {
        $this->keyScene();

        $this->editor()->call('duplicateObjects', ['art_'.$this->asset->id]);

        $scene = $this->scene->fresh();
        $copyId = $scene->shots[0]['layers'][2]['asset_id'];
        $track = collect($scene->config['timeline']['tracks'])->firstWhere('target', "art:{$copyId}");
        $this->assertSame('x', $track['property']);
        $this->assertEquals([43.0, 73.0], array_column($track['keyframes'], 'value'), 'its path runs beside the original\'s');
        $this->assertCount(6, $scene->config['timeline']['tracks'], 'the original keeps its keys, the copy gets its own two');
    }

    public function test_several_objects_keep_their_stacking_in_the_other_scene(): void
    {
        $this->editor()
            ->call('selectScene', $this->otherScene->id)
            ->call('duplicateObjects', ['art_1500000000', 'art_'.$this->asset->id], $this->scene->id);

        $srcIds = array_column($this->otherScene->fresh()->shots[0]['layers'], 'src_asset_id');
        $this->assertSame([$this->asset->id, null], $srcIds, 'the windmill stays behind the video');
    }

    public function test_a_paste_is_one_undo_step(): void
    {
        $this->editor()
            ->call('selectScene', $this->otherScene->id)
            ->call('duplicateObjects', ['txt_title'], $this->scene->id)
            ->call('undoLastEdit');

        $this->assertEmpty($this->otherScene->fresh()->config['texts'] ?? []);
    }

    /** Keys on the windmill and the title (the ones copied) and on the panel (not copied). */
    private function keyScene(): void
    {
        $config = $this->scene->config;
        $config['timeline'] = ['duration' => 12.0, 'targets' => [], 'tracks' => [
            ['target' => 'art:'.$this->asset->id, 'property' => 'x', 'keyframes' => [['time' => 0.0, 'value' => 40.0], ['time' => 4.0, 'value' => 70.0, 'easing' => 'linear']]],
            ['target' => 'art:'.$this->asset->id, 'property' => 'opacity', 'keyframes' => [['time' => 2.0, 'value' => 1.0]], 'base' => 0.5],
            ['target' => 'text:txt_title', 'property' => 'opacity', 'keyframes' => [['time' => 1.0, 'value' => 0.0]]],
            ['target' => 'rect:rect_panel', 'property' => 'opacity', 'keyframes' => [['time' => 1.0, 'value' => 0.2]]],
        ]];
        $this->scene->update(['config' => $config]);
    }

    public function test_a_scene_from_another_lesson_cannot_be_pasted_from(): void
    {
        $stranger = User::factory()->create();
        $foreign = $this->makeScene($this->makeLesson($stranger), 1, [
            'config' => ['texts' => [['id' => 'txt_secret', 'text' => 'Not yours', 'x' => 1.0, 'y' => 1.0]]],
        ]);

        $this->editor()->call('duplicateObjects', ['txt_secret'], $foreign->id)
            ->assertNotDispatched('scene:objects-duplicated');

        $this->assertCount(2, $this->scene->fresh()->config['texts']);
    }

    public function test_the_background_and_unknown_ids_are_ignored(): void
    {
        $this->editor()->call('duplicateObjects', ['__bg__', 'art_999', 'txt_nope'])
            ->assertNotDispatched('scene:objects-duplicated');

        $this->assertCount(3, $this->scene->fresh()->shots[0]['layers']);
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    private function makeLesson(User $teacher): Lesson
    {
        return Lesson::create([
            'teacher_id' => $teacher->id,
            'topic' => 'Amsterdam', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
    }

    private function makeScene(Lesson $lesson, int $order, array $attrs = []): Scene
    {
        return Scene::create(array_merge([
            'lesson_id' => $lesson->id, 'order' => $order, 'kind' => 'narration',
            'year' => '1650', 'location' => 'Amsterdam', 'script_segment' => 'Script.',
            'image_path' => 'bg.png', 'audio_path' => 'a.mp3', 'audio_script_hash' => sha1('Script.'),
            'status' => 'ready',
        ], $attrs));
    }
}
