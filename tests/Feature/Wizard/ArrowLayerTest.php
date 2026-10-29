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

/**
 * A vector arrow layer (SceneArrow, resources/js/scene/arrow-shape.js): a library arrow the teacher
 * places becomes one, its handles save as one step, and no value leaves the canvas's bounds.
 */
class ArrowLayerTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    private SvgAsset $arrow;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->arrow = SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_url' => 'https://example.com/arrow.svg', 'license' => 'CC0', 'source_ref' => 'arrows/arrow-straight',
            'collection' => 'arrows', 'title' => 'Arrow', 'svg_path' => 'icons/arrows/arrow-straight.svg',
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'bay.png',
            'shots' => [['order' => 0, 'image_path' => 'bay.png', 'layers' => [
                ['path' => 'bay.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $this->arrow->id, 'kind' => 'arrow', 'x' => 20.0, 'y' => 50.0, 'end_x' => 80.0, 'end_y' => 50.0,
                    'bend' => 0.0, 'shaft' => 1.2, 'head' => 5.5, 'arrow_style' => 'stroke'],
            ]]],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    private function arrowLayer(): array
    {
        return collect($this->scene->fresh()->shots[0]['layers'])->firstWhere('asset_id', $this->arrow->id);
    }

    public function test_a_drag_of_the_handles_saves_every_value_in_one_step_within_bounds(): void
    {
        $this->wizard()->call('moveArrowLayer', $this->arrow->id, [
            'x' => 25.0, 'y' => 40.0, 'end_x' => 150.0, 'end_y' => 60.0, 'bend' => -2.0, 'shaft' => 9.0, 'head' => 4.0,
        ]);

        $layer = $this->arrowLayer();
        $this->assertEquals(25.0, $layer['x']);
        $this->assertEquals(100.0, $layer['end_x'], 'the end cannot leave the stage');
        $this->assertEquals(-0.5, $layer['bend']);
        $this->assertEquals(6.0, $layer['shaft']);
        $this->assertEquals(4.0, $layer['head']);
        $this->assertArrayNotHasKey('path', $layer, 'a vector arrow stays a vector arrow');
    }

    public function test_the_style_and_the_kind_are_checked_like_every_other_layer_field(): void
    {
        $wizard = $this->wizard();

        $wizard->call('updateArtworkLayer', $this->arrow->id, 'arrow_style', 'block');
        $this->assertSame('block', $this->arrowLayer()['arrow_style']);

        $wizard->call('updateArtworkLayer', $this->arrow->id, 'arrow_style', 'wiggle');
        $this->assertSame('block', $this->arrowLayer()['arrow_style'], 'an unknown style is refused');
    }

    public function test_placing_a_library_arrow_with_a_vector_form_makes_an_arrow_layer(): void
    {
        $straight = SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_url' => 'https://example.com/arrow.svg', 'license' => 'CC0', 'source_ref' => 'arrows/arrow-block',
            'collection' => 'arrows', 'title' => 'Block', 'svg_path' => 'icons/arrows/arrow-block.svg',
        ]);

        $this->wizard()->call('attachArtwork', $straight->id, 40.0, 40.0);

        $placed = collect($this->scene->fresh()->shots[0]['layers'])->firstWhere('asset_id', $straight->id);
        $this->assertSame('arrow', $placed['kind']);
        $this->assertSame('block', $placed['arrow_style']);
        $this->assertArrayNotHasKey('path', $placed);
    }

    public function test_an_arrow_dropped_over_a_map_stays_on_the_stage(): void
    {
        $straight = SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_url' => 'https://example.com/arrow.svg', 'license' => 'CC0',
            'source_ref' => 'arrows/arrow-straight.svg', 'collection' => 'arrows', 'title' => 'Straight',
            'svg_path' => 'icons/arrows/arrow-straight.svg',
        ]);

        $this->wizard()->call('attachArtwork', $straight->id, 40.0, 40.0, 12.0, 45.0);

        $placed = collect($this->scene->fresh()->shots[0]['layers'])->firstWhere('asset_id', $straight->id);
        $this->assertSame('arrow', $placed['kind']);
        $this->assertNotSame('map', $placed['anchor'] ?? null, 'a place cannot carry both ends of an arrow');
    }

    public function test_an_arrow_keyframe_track_is_kept_on_the_timeline(): void
    {
        $this->wizard()->call('setTimeline', [
            'duration' => 8,
            'targets' => [],
            'tracks' => [[
                'target' => 'arw:'.$this->arrow->id,
                'property' => 'end_x',
                'keyframes' => [['time' => 0, 'value' => 60], ['time' => 3.175, 'value' => 80]],
            ]],
        ]);

        $tracks = $this->scene->fresh()->config['timeline']['tracks'];
        $this->assertCount(1, $tracks, 'an arrow track must not be dropped on save');
        $this->assertSame('arw:'.$this->arrow->id, $tracks[0]['target']);
        $this->assertSame('end_x', $tracks[0]['property']);
        $this->assertCount(2, $tracks[0]['keyframes']);
    }
}
