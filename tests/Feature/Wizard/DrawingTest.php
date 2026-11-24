<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Editor\Drawings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** Tekenen: the lines of one drawing session are one picture layer, selectable and deletable; the eraser rubs out. */
class DrawingTest extends TestCase
{
    use RefreshDatabase;

    private function editor(): array
    {
        Storage::fake('public');
        $teacher = User::factory()->create();
        $lesson = Lesson::create(['teacher_id' => $teacher->id, 'topic' => 'X', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady]);
        $scene = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready']);

        return [$scene, Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])->call('selectScene', $scene->id)];
    }

    public function test_a_drawn_arrow_becomes_its_own_layer_where_it_was_drawn(): void
    {
        [$scene, $editor] = $this->editor();

        $editor->call('addDrawing', ['tool' => 'arrow', 'colour' => '#F59E0B', 'width' => 8, 'points' => [[10, 20], [30, 20], [50, 20]]], 16 / 9)
            ->assertReturned(fn ($r) => $r['ok'] === true);

        $layer = $scene->fresh()->shots[0]['layers'][0];
        $asset = SvgAsset::findOrFail($layer['asset_id']);
        $this->assertSame(Drawings::SOURCE, $asset->source);
        $this->assertEqualsWithDelta(30, $layer['x'], 1.5, 'centred on the arrow');
        $this->assertEqualsWithDelta(20, $layer['y'], 0.01);
        $this->assertGreaterThan(40, $layer['width'], 'as wide as the arrow plus its head');
        $svg = Storage::disk('public')->get($asset->svg_path);
        $this->assertStringContainsString('stroke="#f59e0b"', $svg);
        $this->assertSame(2, substr_count($svg, '<path'), 'the shaft and the head');
    }

    public function test_the_lines_of_one_session_go_onto_one_layer_and_it_can_be_deleted(): void
    {
        [$scene, $editor] = $this->editor();
        $first = ['id' => $editor->call('addDrawing', ['tool' => 'pen', 'colour' => '#111827', 'width' => 4, 'points' => [[10, 10], [12, 14], [16, 15], [20, 20]]])->get('activeLayerId')];
        $editor->call('addDrawing', ['tool' => 'line', 'colour' => '#ef4444', 'width' => 16, 'points' => [[60, 60], [80, 70]]], 16 / 9, $first['id'])
            ->assertReturned(['ok' => true, 'id' => $first['id']])
            ->assertSet('activeLayerId', $first['id']);

        $layers = $scene->fresh()->shots[0]['layers'];
        $this->assertCount(1, $layers, 'one layer for the whole session');
        $this->assertCount(2, $layers[0]['strokes']);
        $this->assertEqualsWithDelta(45, $layers[0]['x'], 2, 'the box grew around both lines');
        $this->assertGreaterThan(65, $layers[0]['width']);
        $svg = Storage::disk('public')->get($layers[0]['path']);
        $this->assertSame(2, substr_count($svg, '<path'));
        $this->assertStringContainsString('stroke="#ef4444"', $svg);

        // a new session (after Klaar) starts a layer of its own
        $editor->call('addDrawing', ['tool' => 'line', 'colour' => '#ffffff', 'width' => 8, 'points' => [[5, 90], [30, 90]]]);
        $this->assertCount(2, $scene->fresh()->shots[0]['layers']);

        $editor->call('deleteObject', 'art_'.$first['id']);
        $this->assertNotContains($first['id'], array_column($scene->fresh()->shots[0]['layers'], 'asset_id'));
    }

    public function test_each_line_is_its_own_undo_step(): void
    {
        [$scene, $editor] = $this->editor();
        $id = $editor->call('addDrawing', ['tool' => 'line', 'colour' => '#111827', 'width' => 8, 'points' => [[10, 10], [30, 10]]])->get('activeLayerId');
        // the editor marks every stroke as a step of its own (draw-layer.js), as edit-steps.js does for a press
        $editor->call('startEditStep')->call('addDrawing', ['tool' => 'line', 'colour' => '#111827', 'width' => 8, 'points' => [[10, 50], [30, 50]]], 16 / 9, $id);
        $this->assertCount(2, $scene->fresh()->shots[0]['layers'][0]['strokes']);

        $editor->call('undoLastEdit');
        $layer = $scene->fresh()->shots[0]['layers'][0];
        $this->assertCount(1, $layer['strokes'], 'only the second line went');
        $this->assertTrue(Storage::disk('public')->exists($layer['path']), 'the earlier picture is still there');

        // drawing on after the undo goes onto the same layer again
        $editor->call('startEditStep')->call('addDrawing', ['tool' => 'line', 'colour' => '#111827', 'width' => 8, 'points' => [[10, 80], [30, 80]]], 16 / 9, $id);
        $this->assertCount(1, $scene->fresh()->shots[0]['layers']);
        $this->assertCount(2, $scene->fresh()->shots[0]['layers'][0]['strokes']);
    }

    public function test_a_moved_and_scaled_drawing_keeps_its_lines_where_they_are_when_drawn_on(): void
    {
        [$scene, $editor] = $this->editor();
        $id = $editor->call('addDrawing', ['tool' => 'line', 'colour' => '#111827', 'width' => 8, 'points' => [[10, 50], [30, 50]]])->get('activeLayerId');
        $shots = $scene->fresh()->shots;
        $shots[0]['layers'][0]['x'] = 70.0;     // dragged to the right and made twice as big
        $shots[0]['layers'][0]['scale'] = 2.0;
        $scene->update(['shots' => $shots]);

        $editor->call('addDrawing', ['tool' => 'line', 'colour' => '#111827', 'width' => 8, 'points' => [[10, 90], [12, 90]]], 16 / 9, $id);
        $old = $scene->fresh()->shots[0]['layers'][0]['strokes'][0]['points'];
        $this->assertEqualsWithDelta([[50, 50], [90, 50]], $old, 0.01, 'the first line is where the teacher sees it');
        $this->assertEquals(1, $scene->fresh()->shots[0]['layers'][0]['scale'], 'drawn again at scale 1');
    }

    public function test_the_eraser_rubs_out_part_of_a_pen_line_and_a_whole_arrow(): void
    {
        [$scene, $editor] = $this->editor();
        $pen = ['tool' => 'pen', 'colour' => '#111827', 'width' => 4, 'points' => array_map(fn ($x) => [$x, 30], range(10, 50, 2))];
        $id = $editor->call('addDrawing', $pen)->get('activeLayerId');
        $editor->call('addDrawing', ['tool' => 'arrow', 'colour' => '#ef4444', 'width' => 8, 'points' => [[10, 70], [50, 70]]], 16 / 9, $id);

        // rub across the middle of the pen line: it comes apart in two
        $editor->call('eraseDrawing', [[30, 20], [30, 40]], 40)->assertReturned(['ok' => true]);
        $strokes = $scene->fresh()->shots[0]['layers'][0]['strokes'];
        $this->assertCount(3, $strokes);
        $this->assertLessThan(30, max(array_column($strokes[0]['points'], 0)));
        $this->assertGreaterThan(30, min(array_column($strokes[1]['points'], 0)));

        // touch the arrow: it goes whole; rub out the rest: the layer goes
        $editor->call('eraseDrawing', [[50, 70]], 24);
        $this->assertCount(2, $scene->fresh()->shots[0]['layers'][0]['strokes']);
        $editor->call('eraseDrawing', [[5, 30], [55, 30]], 80)->assertSet('activeLayerId', null);
        $this->assertSame([], $scene->fresh()->shots[0]['layers']);

        // nothing to rub out: no save
        $editor->call('eraseDrawing', [[5, 5]], 24)->assertReturned(['ok' => false]);
    }

    public function test_nothing_but_clean_points_becomes_a_drawing(): void
    {
        [$scene, $editor] = $this->editor();
        foreach ([
            ['tool' => 'brush', 'colour' => '#ffffff', 'width' => 4, 'points' => [[1, 1], [2, 2]]],
            ['tool' => 'pen', 'colour' => 'red" onload="x', 'width' => 4, 'points' => [[1, 1], [2, 2]]],
            ['tool' => 'pen', 'colour' => '#ffffff', 'width' => 4, 'points' => [[1, 1]]],
        ] as $bad) {
            $editor->call('addDrawing', $bad)->assertReturned(['ok' => false]);
        }
        $this->assertSame(0, SvgAsset::count());
        $this->assertNull(Drawings::clean(['tool' => 'pen', 'colour' => '#fff', 'width' => 4, 'points' => [[0, 0], [1, 1]]]));
    }

    public function test_a_drawing_on_a_map_is_pinned_to_its_place_and_the_eraser_still_rubs_it_out(): void
    {
        [$scene, $editor] = $this->editor();
        // drawn at zoom 5 on a 600 px tall stage, the line's middle over Venice
        $map = ['zoom' => 5, 'px' => 600, 'pins' => [], 'centre' => ['x' => 30, 'y' => 30, 'lng' => 12.33, 'lat' => 45.44]];
        $pen = ['tool' => 'pen', 'colour' => '#111827', 'width' => 4, 'points' => array_map(fn ($x) => [$x, 30], range(10, 50, 2))];
        $id = $editor->call('addDrawing', $pen, 16 / 9, null, $map)->get('activeLayerId');

        $layer = $scene->fresh()->shots[0]['layers'][0];
        $this->assertSame('map', $layer['anchor']);
        $this->assertEqualsWithDelta([12.33, 45.44], [$layer['lng'], $layer['lat']], 0.0001);
        $this->assertEqualsWithDelta([30, 30], [$layer['x'], $layer['y']], 0.01, 'the layer is centred on that place');
        $this->assertEquals([5, 600], [$layer['geo_zoom'], $layer['geo_px']]);

        // without the map's view the server cannot tell where the pinned drawing is: left alone
        $editor->call('eraseDrawing', [[30, 20], [30, 40]], 40)->assertReturned(['ok' => false]);

        // the map zoomed in one step and moved the place to (40, 50): the drawing shows twice as big there
        $view = ['zoom' => 6, 'px' => 600, 'pins' => [$id => ['x' => 40, 'y' => 50, 'f' => 2]]];
        $editor->call('eraseDrawing', [[40, 40], [40, 60]], 40, 16 / 9, $view)->assertReturned(['ok' => true]);
        $layer = $scene->fresh()->shots[0]['layers'][0];
        $this->assertCount(2, $layer['strokes'], 'rubbed through the middle: two pieces');
        $this->assertLessThan(40, max(array_column($layer['strokes'][0]['points'], 0)));
        $this->assertLessThan(5, min(array_column($layer['strokes'][0]['points'], 0)), 'twice as long as drawn, around (40, 50)');
        $this->assertSame('map', $layer['anchor']);
        $this->assertEqualsWithDelta([12.33, 45.44], [$layer['lng'], $layer['lat']], 0.0001, 'still on Venice');
        $this->assertEqualsWithDelta([40, 50], [$layer['x'], $layer['y']], 0.01, 'its middle stays on the place');
        $this->assertEquals([6, 600, 1], [$layer['geo_zoom'], $layer['geo_px'], $layer['scale']], 'measured afresh at this zoom');

        // a next line goes onto the same pinned layer
        $editor->call('addDrawing', ['tool' => 'line', 'colour' => '#111827', 'width' => 8, 'points' => [[60, 50], [70, 50]]], 16 / 9, $id,
            ['zoom' => 6, 'px' => 600, 'pins' => [$id => ['x' => 40, 'y' => 50, 'f' => 1]]])->assertReturned(['ok' => true, 'id' => $id]);
        $this->assertCount(1, $scene->fresh()->shots[0]['layers']);
        $this->assertCount(3, $scene->fresh()->shots[0]['layers'][0]['strokes']);
    }
}
