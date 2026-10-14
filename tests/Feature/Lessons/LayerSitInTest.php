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
use App\Services\Support\LayerSitIn;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Blend into the scene (waterline, reflection, contact shadow, colour match) plus mirror and tilt:
 * data on the layer that a teacher sets, resets and undoes in the editor, that a spec sets, that
 * the player receives clamped and that lessons:export writes back. Off unless set.
 */
class LayerSitInTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
        foreach (['history-line/backdrops/tasman/tonga_lagoon' => 'webp', 'history-line/props/tasman/tongan_canoes' => 'webp', 'history-line/figures/tasman/sailor_a' => 'webp'] as $ref => $ext) {
            $path = "svg-assets/bundled/{$ref}.{$ext}";
            Storage::disk('public')->put($path, "bytes-of-{$ref}");
            SvgAsset::factory()->create([
                'user_id' => null, 'source' => 'bundled', 'source_ref' => "{$ref}.{$ext}",
                'svg_path' => $path, 'title' => basename($ref),
            ]);
        }
    }

    private function canoes(array $over = []): array
    {
        return array_merge(['asset' => 'history-line/props/tasman/tongan_canoes', 'x' => 42, 'y' => 74, 'ambient' => 'bob',
            'waterline' => 0.15, 'reflection' => 0.35, 'contact_shadow' => 0.4, 'color_match' => 0.35, 'foam' => 0.5, 'speed' => 0.7,
            'flip_x' => true, 'rotation' => -4.0], $over);
    }

    private function compose(array $layers): Lesson
    {
        return app(LessonComposer::class)->build(['key' => 'Sit in test', 'scenes' => [[
            'type' => 'story', 'script' => 'Tonga.', 'backdrop' => 'history-line/backdrops/tasman/tonga_lagoon', 'layers' => $layers,
        ]]], $this->teacher, narrate: false);
    }

    private function storedLayer(Lesson $lesson, int $i = 1): array
    {
        return $lesson->scenes()->firstOrFail()->shots[0]['layers'][$i];
    }

    public function test_a_spec_stores_them_clamped_and_a_typo_fails(): void
    {
        $layer = $this->storedLayer($this->compose([$this->canoes(['reflection' => 3, 'color_match' => -1])]));

        $this->assertEquals(0.15, $layer['waterline']);
        $this->assertEquals(1.0, $layer['reflection']);
        $this->assertEquals(0.0, $layer['color_match']);
        $this->assertTrue($layer['flip_x']);
        $this->assertEquals(-4.0, $layer['rotation']);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('waterline must be a number from 0 to 1');
        $this->compose([$this->canoes(['waterline' => 'veel'])]);
    }

    public function test_the_player_receives_them_and_an_old_layer_receives_none(): void
    {
        $lesson = $this->compose([$this->canoes(), ['asset' => 'history-line/figures/tasman/sailor_a']]);
        $lesson->update(['status' => LessonStatus::Published->value]);

        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $this->assertStringContainsString('"waterline":0.15,"reflection":0.35,"contact_shadow":0.4,"color_match":0.35,"foam":0.5,"speed":0.7', $html);
        $this->assertStringContainsString('"rotation":-4,"flip_x":true', $html);
        $this->assertStringContainsString('"waterline":null,"reflection":null,"contact_shadow":null,"color_match":null,"foam":null,"speed":null', $html);
    }

    public function test_export_writes_them_back_and_they_rebuild_the_same(): void
    {
        $lesson = $this->compose([$this->canoes()]);
        $spec = app(LessonExporter::class)->toSpec($lesson->fresh());
        $entry = $spec['scenes'][0]['layers'][0];

        $this->assertArrayNotHasKey('shots', $spec['scenes'][0]);
        foreach (['waterline' => 0.15, 'reflection' => 0.35, 'contact_shadow' => 0.4, 'color_match' => 0.35, 'foam' => 0.5, 'speed' => 0.7, 'rotation' => -4.0] as $k => $v) {
            $this->assertEquals($v, $entry[$k], $k);
        }
        $this->assertTrue($entry['flip_x']);

        $rebuilt = $this->storedLayer(app(LessonComposer::class)->build($spec, $this->teacher, narrate: false));
        $this->assertEquals(array_diff_key($this->storedLayer($lesson), ['asset_id' => 1, 'path' => 1]), array_diff_key($rebuilt, ['asset_id' => 1, 'path' => 1]));
    }

    public function test_the_preset_picks_a_boat_or_a_figure(): void
    {
        $this->assertSame(LayerSitIn::BOAT, LayerSitIn::preset(['ambient' => 'roll'], 'history-line/figures/x.webp'));
        $this->assertSame(LayerSitIn::BOAT, LayerSitIn::preset([], 'history-line/props/tasman/waka_pair.webp'));
        $this->assertSame(LayerSitIn::FIGURE, LayerSitIn::preset([], 'history-line/figures/tasman/sailor_bootsman.webp'));
        $this->assertSame(['waterline' => null, 'reflection' => 0.5, 'contact_shadow' => null, 'color_match' => 1.0, 'foam' => 0.25, 'speed' => null],
            LayerSitIn::payload(['waterline' => 0, 'reflection' => '0.5', 'contact_shadow' => 'x', 'color_match' => 7, 'foam' => 0.25, 'speed' => -2]));
        $this->assertSame(0.5, LayerSitIn::BOAT['foam']);
        $this->assertSame(0.5, LayerSitIn::BOAT['speed']);
        $this->assertNull(LayerSitIn::FIGURE['foam']);
    }

    public function test_the_editor_sets_the_preset_in_one_step_resets_it_and_undo_brings_it_back(): void
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $canoes = SvgAsset::query()->where('source_ref', 'like', '%tongan_canoes%')->firstOrFail();
        $scene = Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready', 'image_path' => 'bg.png',
            'shots' => [['order' => 0, 'image_path' => 'bg.png', 'layers' => [
                ['path' => 'bg.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $canoes->id, 'path' => $canoes->svg_path, 'kind' => 'figure', 'x' => 42.0, 'y' => 74.0, 'scale' => 1.0, 'height' => 22],
            ]]],
        ]);
        $layer = fn () => collect($scene->refresh()->shots[0]['layers'])->firstWhere('asset_id', $canoes->id);
        $wizard = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id);

        $wizard->call('blendLayerIntoScene', $canoes->id);
        $this->assertSame(LayerSitIn::BOAT, array_intersect_key($layer(), LayerSitIn::BOAT));

        $wizard->call('updateArtworkLayer', $canoes->id, 'reflection', '4')
            ->call('updateArtworkLayer', $canoes->id, 'foam', '-1');
        $this->assertEquals(0.0, $layer()['foam']);
        $this->assertEquals(1.0, $layer()['reflection']);
        $this->assertEquals(1.0, $wizard->instance()->serializeShots($scene->refresh())[0]['layers'][1]['reflection']);

        $this->travel(5)->seconds();   // its own undo step
        $wizard->call('resetLayerSitIn', $canoes->id);
        $this->assertSame([], array_intersect_key($layer(), array_flip(LayerSitIn::KEYS)));

        $wizard->call('undoLastEdit');
        $this->assertEquals(0.15, $layer()['waterline']);
    }

    public function test_the_layer_panel_offers_the_button_and_the_advanced_values(): void
    {
        $scene = new Scene(['kind' => 'narration', 'config' => []]);
        $html = $this->blade('<x-lesson.settings-map-panel :layer="$layer" :scene="$scene" />', [
            'layer' => ['asset_id' => 7, 'reflection' => 0.35], 'scene' => $scene,
        ]);

        $html->assertSee('data-sit-in', false)
            ->assertSee('data-sit-advanced', false)
            ->assertSee('blendLayerIntoScene(7)', false)
            ->assertSee('resetLayerSitIn(7)', false)
            ->assertSee('updateArtworkLayer(7, &#039;contact_shadow&#039;', false)
            ->assertSee('updateArtworkLayer(7, &#039;foam&#039;', false)
            ->assertSee('updateArtworkLayer(7, &#039;speed&#039;', false);
    }
}
