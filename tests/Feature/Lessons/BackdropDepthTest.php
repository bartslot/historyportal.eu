<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * A depth map per backdrop (art:depth -> icons:import -> the scene's config.backdrop_depth) and the
 * layer's `occlude` (0/1): set by a spec, toggled, reset and undone in the editor, received by the
 * player, written back by lessons:export. Off unless set.
 */
class BackdropDepthTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private string $library;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
        // A throwaway icon set: never the real resources/icons.
        $this->library = storage_path('framework/testing/depth-icons-'.getmypid());
        File::ensureDirectoryExists($this->library.'/history-line/backdrops/tasman');
        File::ensureDirectoryExists($this->library.'/history-line/figures/tasman');
        config(['art.library_path' => $this->library]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->library);
        parent::tearDown();
    }

    private function png(string $rel): void
    {
        $img = imagecreatetruecolor(4, 2);
        ob_start();
        imagepng($img);
        File::put($this->library.'/'.$rel, (string) ob_get_clean());
    }

    public function test_art_depth_runs_the_script_once_per_backdrop_that_lacks_a_depth_map(): void
    {
        $this->png('history-line/backdrops/tasman/deck_harbour.png');
        $this->png('history-line/backdrops/tasman/deck_sea_day.png');
        $this->png('history-line/backdrops/tasman/deck_sea_day.depth.webp');   // already has one
        $this->png('history-line/figures/tasman/sailor.png');                   // not a backdrop
        Process::fake();

        $this->artisan('art:depth', ['collection' => 'history-line', '--only' => 'tasman'])
            ->expectsOutputToContain('Wrote 1 depth map(s)')
            ->assertSuccessful();

        Process::assertRanTimes(fn ($p) => str_contains(implode(' ', (array) $p->command), 'depth_map.py'), 1);
        Process::assertRan(fn ($p) => str_ends_with(implode(' ', (array) $p->command), 'tasman/deck_harbour.png'));
    }

    public function test_art_depth_reports_a_failing_script_and_skips_what_it_was_not_asked(): void
    {
        $this->png('history-line/backdrops/tasman/deck_harbour.png');
        Process::fake(['*' => Process::result(errorOutput: 'No module named torch', exitCode: 1)]);

        $this->artisan('art:depth', ['collection' => 'history-line'])
            ->expectsOutputToContain('No module named torch')
            ->assertFailed();

        $this->artisan('art:depth', ['collection' => 'history-line', '--only' => 'dante'])
            ->expectsOutputToContain('already has a depth map')
            ->assertSuccessful();
        Process::assertRanTimes(fn ($p) => true, 1);   // only the first, failing, run
    }

    public function test_icons_import_stores_the_depth_map_beside_its_picture_and_never_as_an_icon(): void
    {
        $this->png('history-line/backdrops/tasman/deck_harbour.png');
        $this->png('history-line/backdrops/tasman/deck_harbour.depth.webp');
        $this->png('history-line/figures/tasman/sailor.png');

        $this->artisan('icons:import', ['--path' => $this->library])->assertSuccessful();

        $this->assertSame(2, SvgAsset::query()->bundled()->count());
        $deck = SvgAsset::query()->where('source_ref', 'history-line/backdrops/tasman/deck_harbour.png')->firstOrFail();
        $this->assertSame('svg-assets/library/history-line/backdrops/tasman/deck-harbour.depth.webp', $deck->depth_path);
        Storage::disk('public')->assertExists($deck->depth_path);
        $this->assertSame('/storage/'.$deck->depth_path, $deck->depthUrl());
        $this->assertNull(SvgAsset::query()->where('source_ref', 'like', '%sailor%')->value('depth_path'));
    }

    private function composed(array $layer = []): Lesson
    {
        $this->png('history-line/backdrops/tasman/deck_harbour.png');
        $this->png('history-line/backdrops/tasman/deck_harbour.depth.webp');
        $this->png('history-line/figures/tasman/sailor.png');
        $this->artisan('icons:import', ['--path' => $this->library])->assertSuccessful();

        return app(LessonComposer::class)->build(['key' => 'Depth test', 'scenes' => [[
            'type' => 'story', 'script' => 'Aan dek.', 'backdrop' => 'history-line/backdrops/tasman/deck_harbour',
            'layers' => [['asset' => 'history-line/figures/tasman/sailor', 'x' => 40, 'y' => 50] + $layer],
        ]]], $this->teacher, narrate: false);
    }

    public function test_a_composed_backdrop_carries_its_depth_map_and_occlude_round_trips_through_export(): void
    {
        $lesson = $this->composed(['occlude' => 1]);
        $scene = $lesson->scenes()->firstOrFail();

        $this->assertSame($scene->image_path, $scene->config['backdrop_depth']['src']);
        $this->assertStringEndsWith('deck-harbour.depth.webp', $scene->config['backdrop_depth']['url']);
        $this->assertSame(1, $scene->shots[0]['layers'][1]['occlude']);

        $spec = app(LessonExporter::class)->toSpec($lesson->fresh());
        $this->assertSame(1, $spec['scenes'][0]['layers'][0]['occlude']);
        $this->assertArrayNotHasKey('extra_config', $spec['scenes'][0]);   // the depth is the backdrop's, not the teacher's

        $rebuilt = app(LessonComposer::class)->build($spec, $this->teacher, narrate: false)->scenes()->firstOrFail();
        $this->assertSame(1, $rebuilt->shots[0]['layers'][1]['occlude']);
        $this->assertNotEmpty($rebuilt->config['backdrop_depth']);
    }

    public function test_a_spec_rejects_an_occlude_that_is_not_0_or_1_and_an_old_layer_exports_none(): void
    {
        $spec = app(LessonExporter::class)->toSpec($this->composed()->fresh());
        $this->assertArrayNotHasKey('occlude', $spec['scenes'][0]['layers'][0]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('occlude must be 0 or 1');
        app(LessonComposer::class)->build(['key' => 'Bad', 'scenes' => [[
            'type' => 'story', 'script' => 'x', 'layers' => [['asset' => 'history-line/figures/tasman/sailor', 'occlude' => 'ja']],
        ]]], $this->teacher, narrate: false);
    }

    public function test_the_player_receives_occlude_and_the_depth_map(): void
    {
        $lesson = $this->composed(['occlude' => 1]);
        $lesson->update(['status' => LessonStatus::Published->value]);

        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $this->assertStringContainsString('"occlude":true', $html);
        $this->assertStringContainsString('deck-harbour.depth.webp', $html);
    }

    public function test_the_editor_toggles_it_resets_it_and_undo_brings_it_back(): void
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $sailor = SvgAsset::factory()->create(['user_id' => null, 'source' => 'bundled', 'source_ref' => 'history-line/figures/tasman/sailor.png', 'svg_path' => 'x.png', 'title' => 'Sailor', 'height_m' => 1.75]);
        $scene = Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready', 'image_path' => 'bg.png',
            'shots' => [['order' => 0, 'image_path' => 'bg.png', 'layers' => [
                ['path' => 'bg.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $sailor->id, 'path' => 'x.png', 'kind' => 'figure', 'x' => 40.0, 'y' => 50.0, 'scale' => 1.0, 'height' => 30],
            ]]],
        ]);
        $layer = fn () => collect($scene->refresh()->shots[0]['layers'])->firstWhere('asset_id', $sailor->id);
        $wizard = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id);

        $wizard->call('setLayerOcclude', $sailor->id, true);
        $this->assertSame(1, $layer()['occlude']);
        $payload = $wizard->instance()->serializeShots($scene->refresh())[0]['layers'][1];
        $this->assertTrue($payload['occlude']);
        $this->assertSame(1.75, $payload['height_m']);

        $this->travel(5)->seconds();   // its own undo step
        $wizard->call('setLayerOcclude', $sailor->id, false);
        $this->assertArrayNotHasKey('occlude', $layer());

        $wizard->call('undoLastEdit');
        $this->assertSame(1, $layer()['occlude']);
    }

    public function test_the_panel_offers_the_toggle_and_fit_only_on_a_backdrop_with_a_depth_map(): void
    {
        $render = fn (array $config, array $layer) => $this->blade('<x-lesson.settings-map-panel :layer="$layer" :scene="$scene" />', [
            'layer' => ['asset_id' => 7] + $layer, 'scene' => new Scene(['kind' => 'narration', 'config' => $config]),
        ]);

        $render(['backdrop_depth' => ['src' => 'a.webp', 'url' => '/storage/a.depth.webp']], ['occlude' => 1])
            ->assertSee('data-occlude', false)
            ->assertSee('setLayerOcclude(7, $event.target.checked)', false)
            ->assertSee('setLayerOcclude(7, false)', false)
            ->assertSee('data-fit-spot', false);

        $render([], [])->assertDontSee('data-occlude', false)->assertDontSee('data-fit-spot', false);
    }
}
