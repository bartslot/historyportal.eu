<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\GroundDistance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class GroundDistanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        // its own bundle name: LibraryBundle caches a bundle's library per process
        Storage::disk('public')->put('library/nl-groundtest/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.webp'],
            ['id' => 'fig-meisje', 'layer' => 'figure', 'file' => 'b.webp'],
            ['id' => 'hills-far', 'layer' => 'bg', 'file' => 'c.webp'],
            ['id' => 'cloud-01', 'layer' => 'mid', 'file' => 'd.webp'],
        ]]));
    }

    private function stage(): array
    {
        return ['bundle' => 'nl-groundtest', 'set' => ['layers' => [
            ['asset' => 'hills-far', 'depth' => 'bg', 'x' => 0.5],
            ['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.75, 'scale' => 0.6],
            ['asset' => 'fig-meisje', 'depth' => 'fg', 'figure' => 'meisje', 'keys' => [['t' => 0, 'x' => 0.2], ['t' => 3, 'x' => 0.8]]],
            ['asset' => 'cloud-01', 'depth' => 'sky', 'x' => 0.3],
        ]]];
    }

    private function scene(array $stage): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready', 'config' => ['stage25d' => $stage]]);
    }

    public function test_ground_pictures_get_their_band_distance_and_nothing_else_changes(): void
    {
        $before = $this->stage();
        [$stage, $report] = GroundDistance::fill($before);
        [$hills, $stone, $girl, $cloud] = $stage['set']['layers'];

        $this->assertSame($before['set']['layers'][0], $hills);   // a backdrop: not on the ground
        $this->assertSame($before['set']['layers'][3], $cloud);   // a sky picture: not on the ground
        $this->assertSame([...$before['set']['layers'][1], 'z' => 22.0], $stone);   // x, scale, everything else as it was
        $this->assertSame([...$before['set']['layers'][2], 'z' => 7.0], $girl);     // keys untouched
        $this->assertSame(['filled' => 2, 'skipped' => 2], $report);
    }

    public function test_a_second_run_changes_nothing(): void
    {
        [$once] = GroundDistance::fill($this->stage());
        [$twice, $report] = GroundDistance::fill($once);

        $this->assertSame($once, $twice);
        $this->assertSame(0, $report['filled']);
    }

    public function test_the_command_reports_on_a_dry_run_then_writes_and_is_safe_to_repeat(): void
    {
        $scene = $this->scene($this->stage());

        $this->artisan('lessons:distance-25d', ['lesson' => $scene->lesson_id, '--dry-run' => true])
            ->expectsOutputToContain('[dry run] 1 of 1 scenes changed: 2 layers given a distance, 2 backdrops and sky pictures kept')
            ->assertSuccessful();
        $this->assertArrayNotHasKey('z', $scene->fresh()->config['stage25d']['set']['layers'][1]);

        $this->artisan('lessons:distance-25d', ['lesson' => $scene->lesson_id])->assertSuccessful();
        $this->assertEquals(22, $scene->fresh()->config['stage25d']['set']['layers'][1]['z']);
        $this->artisan('lessons:distance-25d', ['lesson' => $scene->lesson_id])->expectsOutputToContain('0 of 1 scenes changed')->assertSuccessful();
    }

    public function test_the_editor_saves_a_distance_held_to_the_ground_and_keys_it(): void
    {
        $scene = $this->scene($this->stage());
        $editor = Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);

        $editor->call('saveStage25dLayer', 1, ['z' => 9.5, 'x' => 0.4], $scene->id);
        $editor->call('saveStage25dLayer', 2, ['z' => 9999], $scene->id);
        $editor->call('setTimeline', ['duration' => 8, 'sceneId' => $scene->id, 'targets' => [], 'tracks' => [], 'stage25dKeys' => ['layer-2' => [['t' => 0, 'z' => 5], ['t' => 2, 'z' => 30]]]]);
        $layers = $scene->fresh()->config['stage25d']['set']['layers'];

        $this->assertEquals([0.4, 9.5], [$layers[1]['x'], $layers[1]['z']]);
        $this->assertEquals(120, $layers[2]['z']);   // never off the far end of the ground
        $this->assertEquals([['t' => 0, 'z' => 5], ['t' => 2, 'z' => 30]], $layers[2]['keys']);
    }

    public function test_a_list_drag_on_the_ground_saves_the_distance_and_its_band_follows(): void
    {
        $scene = $this->scene($this->stage());
        $editor = Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);

        // the stone (22 m) dragged to the front, ahead of the girl (7 m): the browser sends 5.5 m and the x and scale
        // that keep its column and size on screen
        $editor->call('reorderStage25dLayers', [1, 2, 3, 0], 1, $scene->id, 0.75, 5.5, 0.15);
        $stone = collect($scene->fresh()->config['stage25d']['set']['layers'])->firstWhere('asset', 'stone-chamber-01');

        $this->assertEquals([0.75, 5.5, 0.15, 'fg'], [$stone['x'], $stone['z'], $stone['scale'], $stone['depth']]);
    }
}
