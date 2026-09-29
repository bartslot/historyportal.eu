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
