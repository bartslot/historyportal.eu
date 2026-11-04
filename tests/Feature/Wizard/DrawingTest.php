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

/** Tekenen: every line drawn over a scene is its own picture layer, selectable and deletable. */
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

    public function test_two_lines_are_two_layers_and_one_can_be_deleted(): void
    {
        [$scene, $editor] = $this->editor();
        $editor->call('addDrawing', ['tool' => 'pen', 'colour' => '#111827', 'width' => 4, 'points' => [[10, 10], [12, 14], [16, 15], [20, 20]]])
            ->call('addDrawing', ['tool' => 'line', 'colour' => '#ef4444', 'width' => 16, 'points' => [[60, 60], [80, 70]]]);
        $layers = $scene->fresh()->shots[0]['layers'];
        $this->assertCount(2, $layers);

        $editor->call('deleteObject', 'art_'.$layers[0]['asset_id']);
        $this->assertSame([$layers[1]['asset_id']], array_column($scene->fresh()->shots[0]['layers'], 'asset_id'));
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
}
