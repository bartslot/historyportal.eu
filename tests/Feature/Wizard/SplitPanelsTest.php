<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Support\SceneSplit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-10-16: Parallax and Drawing go (everything is layered now, drawing is discontinued);
 * a scene is Standard or Split, two comic panels. The panel clicked on the stage is the one the
 * inspector edits, and every change undoes through the scene history.
 */
class SplitPanelsTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    private SvgAsset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->asset = SvgAsset::create([
            'user_id' => $this->teacher->id,
            'source' => 'commons', 'source_ref' => 'tasman-1',
            'source_url' => 'https://example.com/tasman.png',
            'title' => 'Tasman', 'license' => 'CC0', 'svg_path' => 'assets/tasman.png',
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id,
            'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'bay.png',
            'config' => ['slideshow_mode' => 'parallax', 'parallax' => true],
            'shots' => [['order' => 0, 'image_path' => 'bay.png', 'layers' => [
                ['path' => 'bay.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $this->asset->id, 'path' => 'assets/tasman.png', 'kind' => 'figure', 'x' => 30.0, 'y' => 70.0, 'scale' => 1.0, 'height' => 40],
            ]]],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    private function split()
    {
        return $this->wizard()->call('setSplitLayout', 'rows2');
    }

    public function test_the_retired_parallax_and_drawing_modes_read_as_standard(): void
    {
        $this->assertSame('standard', SceneSplit::mode(['slideshow_mode' => 'parallax', 'parallax' => true]));
        $this->assertSame('standard', SceneSplit::mode(['slideshow_mode' => 'drawing']));
        $this->assertSame('standard', SceneSplit::mode(null));
        $this->assertSame('split', SceneSplit::mode(['slideshow_mode' => 'drawing', 'split' => ['dir' => 'v']]));

        // The editor shows Standard | Split, never the old three.
        $this->wizard()
            ->assertSeeHtml('data-split-controls')
            ->assertSeeHtml('data-split-layout="single"')
            ->assertDontSeeHtml('Ink draw-on')
            ->assertDispatched('scene:load', fn ($name, $params) => array_key_exists('split', $params['payload'])
                && $params['payload']['split'] === null
                && ! array_key_exists('slideshowMode', $params['payload'])
                && ! array_key_exists('parallax', $params['payload']));
    }

    public function test_split_makes_two_panels_and_keeps_the_first_as_it_was(): void
    {
        $before = $this->scene->shots[0];
        $this->split();

        $scene = $this->scene->refresh();
        $this->assertSame(['layout' => 'rows2', 'at' => [0.5]], $scene->config['split']);
        $this->assertCount(2, $scene->shots);
        $this->assertSame($before, $scene->shots[0]);
        // The second panel starts on the same picture, with no figures of its own yet.
        $this->assertSame('bay.png', $scene->shots[1]['image_path']);
        $this->assertSame([null], array_column($scene->shots[1]['layers'], 'asset_id') ?: [null]);
        // The old mode keys stay where they were: no data is lost.
        $this->assertSame('parallax', $scene->config['slideshow_mode']);
    }

    public function test_direction_and_position_are_set_and_clamped(): void
    {
        $this->split()->call('setSplitLayout', 'cols2')->call('setSplitAt', 0, 0.9);

        $this->assertSame(['layout' => 'cols2', 'at' => [0.8]], $this->scene->refresh()->config['split']);
    }

    public function test_a_figure_added_with_panel_two_active_goes_on_panel_two_only(): void
    {
        $other = SvgAsset::create([
            'user_id' => $this->teacher->id, 'source' => 'commons', 'source_ref' => 'boy-1',
            'source_url' => 'https://example.com/boy.png', 'title' => 'Boy', 'license' => 'CC0', 'svg_path' => 'assets/boy.png',
        ]);
        $this->split()->call('selectPanel', 1)->call('attachArtwork', $other->id);

        $shots = $this->scene->refresh()->shots;
        $this->assertNotContains($other->id, array_column($shots[0]['layers'], 'asset_id'));
        $this->assertContains($other->id, array_column($shots[1]['layers'], 'asset_id'));
    }

    public function test_the_same_figure_in_both_panels_is_moved_and_edited_per_panel(): void
    {
        $wizard = $this->split()->call('selectPanel', 1)->call('attachArtwork', $this->asset->id);
        // A drag in panel two, reported by the stage before the click made it active.
        $wizard->call('selectPanel', 0)->call('moveArtworkLayer', $this->asset->id, 80.0, 60.0, 1.5, null, null, null, null, 1);
        $wizard->call('updateArtworkLayer', $this->asset->id, 'opacity', 0.5);

        $shots = $this->scene->refresh()->shots;
        $first = collect($shots[0]['layers'])->firstWhere('asset_id', $this->asset->id);
        $second = collect($shots[1]['layers'])->firstWhere('asset_id', $this->asset->id);
        $this->assertSame(30.0, (float) $first['x']);
        $this->assertSame(80.0, (float) $second['x']);
        $this->assertSame(0.5, (float) $second['opacity']);
        $this->assertArrayNotHasKey('opacity', $first);
    }

    public function test_a_new_picture_on_panel_two_leaves_panel_one_and_the_scene_card_alone(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('lessons/1/uploads/deck.png', 'png');
        $wizard = $this->split()->call('selectPanel', 1)->call('setPanelFocus', 'x', 30.0);
        $wizard->call('useLessonImageBackground', '/storage/lessons/1/uploads/deck.png');

        $scene = $this->scene->refresh();
        $this->assertSame('bay.png', $scene->image_path, 'the scene card keeps panel one');
        $this->assertSame('bay.png', $scene->shots[0]['image_path']);
        $this->assertContains($this->asset->id, array_column($scene->shots[0]['layers'], 'asset_id'));
        $this->assertSame('lessons/1/uploads/deck.png', $scene->shots[1]['image_path']);
        $this->assertEquals(['x' => 30, 'y' => 50], $scene->shots[1]['focus'], 'the panel keeps its crop');
        $this->assertSame(['layout' => 'rows2', 'at' => [0.5]], $scene->config['split']);
    }

    public function test_panel_focus_is_stored_and_reset_to_absent(): void
    {
        $wizard = $this->split()->call('selectPanel', 1)->call('setPanelFocus', 'y', 20.0);
        $this->assertEquals(['x' => 50, 'y' => 20], $this->scene->refresh()->shots[1]['focus']);
        $this->assertArrayNotHasKey('focus', $this->scene->shots[0]);

        $wizard->call('setPanelFocus', 'y', null);
        $this->assertArrayNotHasKey('focus', $this->scene->refresh()->shots[1]);
    }

    public function test_back_to_standard_keeps_a_filled_second_panel_and_undo_brings_the_split_back(): void
    {
        $wizard = $this->split()->call('selectPanel', 1);
        $this->travel(2)->seconds();   // its own undo step, not merged with the split

        $wizard->call('setSplitLayout', 'single');
        $scene = $this->scene->refresh();
        $this->assertArrayNotHasKey('split', $scene->config);
        // Panel two has a picture: it stays, and plays as the scene's second shot. No data lost.
        $this->assertCount(2, $scene->shots);
        $this->assertSame(0, $wizard->get('activePanel'));

        $wizard->call('undoLastEdit');
        $this->assertSame(['layout' => 'rows2', 'at' => [0.5]], $this->scene->refresh()->config['split']);
    }

    public function test_a_colour_fills_the_second_panel_only_even_the_colour_already_shown(): void
    {
        // Bart, prod scene 1591: the scene was already black, so picking black on panel 2 changed nothing.
        $this->scene->update(['background_color' => '#000000']);
        $wizard = $this->split()->call('selectPanel', 1);
        $before = $this->scene->refresh()->shots[0];
        $this->travel(2)->seconds();
        // Panel 2 still shows its picture: Image is what reads, and an explicit button applies a colour.
        $wizard->assertSeeHtml('data-bg-apply-color');

        $wizard->call('setBackgroundColor', '#000000');

        $scene = $this->scene->refresh();
        $this->assertSame($before, $scene->shots[0], 'panel one keeps its picture and figure');
        $this->assertSame('bay.png', $scene->image_path, 'the scene card is panel one');
        $this->assertArrayNotHasKey('image_path', $scene->shots[1]);
        $this->assertSame([], $scene->shots[1]['layers']);
        $this->assertSame('#000000', $scene->shots[1]['background_color']);
        // The stage gets panel two even with no picture or figures left: its colour IS the panel.
        $wizard->assertDontSeeHtml('data-bg-apply-color')
            ->assertDispatched('scene:load', fn ($name, $params) => ($params['payload']['shots'][1]['background_color'] ?? null) === '#000000');

        $wizard->call('undoLastEdit');
        $this->assertSame('bay.png', $this->scene->refresh()->shots[1]['image_path']);
    }

    public function test_a_quiz_scene_cannot_be_split(): void
    {
        // Bart: "the split is not possible in a quiz screen". The player plays a game scene its own way.
        $quiz = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 2, 'kind' => 'game', 'game_type' => 'quiz',
            'status' => 'ready', 'image_path' => 'bay.png', 'config' => [],
        ]);
        $wizard = $this->wizard()->call('selectScene', $quiz->id)
            ->assertDontSeeHtml('data-split-controls');

        $wizard->call('setSplitLayout', 'rows2');

        $this->assertArrayNotHasKey('split', $quiz->refresh()->config ?? []);
        $this->assertTrue(SceneSplit::allowedFor('narration'));
    }

    public function test_back_to_standard_drops_an_empty_second_panel(): void
    {
        $this->scene->update(['image_path' => null, 'shots' => null]);

        $wizard = $this->split();
        $this->assertCount(2, $this->scene->refresh()->shots);
        $wizard->call('setSplitLayout', 'single');

        $this->assertCount(1, $this->scene->refresh()->shots);
    }

    public function test_the_stage_gets_the_split_and_the_active_panel(): void
    {
        $this->split()->call('selectPanel', 1)
            ->assertDispatched('scene:load', fn ($name, $params) => $params['payload']['split'] === ['layout' => 'rows2', 'at' => [0.5]]
                && $params['payload']['activePanel'] === 1
                && count($params['payload']['shots']) === 2);
    }

    // Bart 2026-10-16: the divider on the stage IS the Position setting; drag it there.
    public function test_the_divider_dragged_on_the_stage_moves_the_split(): void
    {
        $this->split()->dispatch('split:at', at: [0.613])->dispatch('split:at', at: [0.1]);

        $this->assertSame(['layout' => 'rows2', 'at' => [0.2]], $this->scene->refresh()->config['split']);
    }

    // Bart 2026-10-16: wheel over a pane zooms its picture, a drag moves it. The stage reports the
    // panel it happened in, which need not be the active one.
    public function test_a_pane_pan_and_zoom_from_the_stage_is_stored_on_that_panel(): void
    {
        $wizard = $this->split()->dispatch('split:view', panel: 1, x: 30.0, y: 140.0, zoom: 2.25);

        $this->assertEquals(['x' => 30, 'y' => 100, 'zoom' => 2.25], $this->scene->refresh()->shots[1]['focus']);
        $this->assertArrayNotHasKey('focus', $this->scene->shots[0]);

        // Zoom clamps, and the default view is the absence of the key.
        $wizard->dispatch('split:view', panel: 1, x: 50.0, y: 50.0, zoom: 0.2);
        $this->assertArrayNotHasKey('focus', $this->scene->refresh()->shots[1]);
    }

    public function test_the_zoom_slider_and_undo(): void
    {
        $wizard = $this->split()->call('selectPanel', 1);
        $this->travel(2)->seconds();
        $wizard->call('setPanelFocus', 'zoom', 1.5);
        $this->assertEquals(['x' => 50, 'y' => 50, 'zoom' => 1.5], $this->scene->refresh()->shots[1]['focus']);

        $wizard->call('undoLastEdit');
        $this->assertArrayNotHasKey('focus', $this->scene->refresh()->shots[1]);
    }

    public function test_the_stage_payload_carries_the_zoom(): void
    {
        $this->assertSame(['x' => 40.0, 'y' => 50.0, 'zoom' => 4.0], SceneSplit::focus(['x' => 40, 'zoom' => 9]));
        $this->assertSame(['x' => 40.0, 'y' => 50.0], SceneSplit::focus(['x' => 40, 'zoom' => 1]));
    }

    // Bart 2026-10-16: "instead of horizontal/vertical there are more options ... 3 rows, 3 columns".
    public function test_four_squares_make_four_panels_each_its_own(): void
    {
        $wizard = $this->wizard()->call('setSplitLayout', 'grid4');

        $scene = $this->scene->refresh();
        $this->assertSame(['layout' => 'grid4', 'at' => [0.5, 0.5]], $scene->config['split']);
        $this->assertCount(4, $scene->shots);
        $this->assertContains($this->asset->id, array_column($scene->shots[0]['layers'], 'asset_id'), 'panel one keeps the scene');

        $wizard->call('selectPanel', 3)->call('setPanelFocus', 'x', 20.0);
        $this->assertSame(3, $wizard->get('activePanel'));
        $this->assertEquals(['x' => 20, 'y' => 50], $this->scene->refresh()->shots[3]['focus']);

        $wizard->call('selectPanel', 9);
        $this->assertSame(3, $wizard->get('activePanel'), 'never a panel the layout does not have');
    }

    public function test_fewer_panels_keep_the_others_and_single_drops_only_empty_ones(): void
    {
        $wizard = $this->wizard()->call('setSplitLayout', 'rows3')->call('selectPanel', 2)->call('setPanelFocus', 'y', 10.0);
        $wizard->call('setSplitLayout', 'cols2');
        $this->assertSame(0, $wizard->get('activePanel'));
        $this->assertCount(3, $this->scene->refresh()->shots, 'a third panel the layout no longer shows is kept, not deleted');

        $wizard->call('setSplitLayout', 'single');
        $scene = $this->scene->refresh();
        $this->assertArrayNotHasKey('split', $scene->config);
        // Panels two and three still carry the picture they were given, so nothing is lost.
        $this->assertCount(3, $scene->shots);
    }

    public function test_each_divider_moves_on_its_own_and_an_unknown_layout_is_ignored(): void
    {
        $wizard = $this->wizard()->call('setSplitLayout', 'l1r2')
            ->dispatch('split:at', at: [0.4, 0.7])
            ->call('setSplitAt', 1, 0.3)
            ->call('setSplitLayout', 'hexagon');

        $this->assertSame(['layout' => 'l1r2', 'at' => [0.4, 0.3]], $this->scene->refresh()->config['split']);
    }

    public function test_a_scene_split_the_old_way_reads_as_rows_or_columns(): void
    {
        $this->assertSame(['layout' => 'cols2', 'at' => [0.6]], SceneSplit::normalize(['dir' => 'v', 'at' => 0.6]));
        $this->assertSame(['layout' => 'rows2', 'at' => [0.5]], SceneSplit::normalize(['dir' => 'h']));
        $this->assertSame(3, SceneSplit::panes(['layout' => 'l2r1']));
    }

    public function test_the_picker_shows_every_layout_with_its_name(): void
    {
        $wizard = $this->wizard();
        foreach (array_keys(SceneSplit::LAYOUTS) as $layout) {
            $wizard->assertSeeHtml('data-split-layout="'.$layout.'"');
        }
        $wizard->assertSeeHtml('data-split-layout="single"')->assertSee(__('Three columns'));
    }
}
