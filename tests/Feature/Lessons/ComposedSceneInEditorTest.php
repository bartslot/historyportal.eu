<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\LessonComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * A composed scene is an ordinary CMS scene: the editor opens it with its backdrop and every
 * figure as a layer it can edit, and the rows match what the editor itself writes.
 */
class ComposedSceneInEditorTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private SvgAsset $dante;

    private SvgAsset $virgil;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
        $this->libraryAsset('history-line/backdrops/interiors/scrittoio', 'webp');
        $this->dante = $this->libraryAsset('history-line/figures/dante/dante-scrive', 'webp');
        $this->virgil = $this->libraryAsset('history-line/figures/power/virgilio', 'webp');
    }

    private function libraryAsset(string $ref, string $ext): SvgAsset
    {
        $path = "svg-assets/library/{$ref}.{$ext}";
        Storage::disk('public')->put($path, "bytes-of-{$ref}");

        return SvgAsset::factory()->create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => "{$ref}.{$ext}",
            'svg_path' => $path, 'title' => basename($ref),
        ]);
    }

    private function composeScene(): Scene
    {
        $lesson = app(LessonComposer::class)->build([
            'key' => 'Composed in the editor',
            'scenes' => [[
                'type' => 'story',
                'script' => 'Dante scrive.',
                'backdrop' => 'history-line/backdrops/interiors/scrittoio',
                'layers' => [
                    ['asset' => 'history-line/figures/dante/dante-scrive', 'x' => 40, 'y' => 65],
                    ['asset' => 'history-line/figures/power/virgilio', 'x' => 76, 'y' => 62],
                ],
            ]],
        ], $this->teacher, narrate: false);

        return $lesson->scenes()->firstOrFail();
    }

    public function test_the_editor_opens_a_composed_scene_with_its_backdrop_and_every_figure_as_a_layer(): void
    {
        $scene = $this->composeScene();

        $editor = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->assertDispatched('scene:load', function (string $event, array $params) use ($scene) {
                $shot = $params['payload']['shots'][0];
                $figures = array_values(array_filter($shot['layers'], fn ($l) => $l['asset_id'] !== null));

                return $params['payload']['sceneId'] === $scene->id
                    && str_contains((string) $params['payload']['imageUrl'], "scenes/{$scene->id}/bg.webp")
                    && $shot['layers'][0]['kind'] === 'cover'
                    && array_column($figures, 'asset_id') === [$this->dante->id, $this->virgil->id];
            });

        $this->assertSame([$this->dante->id, $this->virgil->id], array_column($editor->instance()->sceneArtworkLayers(), 'asset_id'));

        // Each figure is editable on its own, through the editor's own methods.
        $editor->call('updateArtworkLayer', $this->dante->id, 'opacity', 0.5)
            ->call('updateArtworkLayer', $this->virgil->id, 'height', 30)
            ->call('moveArtworkLayer', $this->virgil->id, 70.0, 60.0, 1.2);

        $layers = collect($scene->fresh()->shots[0]['layers'])->keyBy('asset_id');
        $this->assertEquals(0.5, $layers[$this->dante->id]['opacity']);
        $this->assertArrayNotHasKey('opacity', $layers[$this->virgil->id]);
        $this->assertEquals(30, $layers[$this->virgil->id]['height']);
        $this->assertEquals([70.0, 60.0, 1.2], [$layers[$this->virgil->id]['x'], $layers[$this->virgil->id]['y'], $layers[$this->virgil->id]['scale']]);
    }

    public function test_composed_layers_are_the_rows_the_editor_itself_writes(): void
    {
        $composed = $this->composeScene();

        // The same scene built by hand in the editor: same backdrop, attach both figures, drag them.
        $byHand = Scene::create([
            'lesson_id' => $composed->lesson_id, 'order' => 2, 'kind' => 'narration',
            'script_segment' => 'Dante scrive.', 'status' => 'ready', 'image_path' => $composed->image_path,
        ]);
        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $composed->lesson])
            ->call('selectScene', $byHand->id)
            ->call('attachArtwork', $this->dante->id, 40.0, 65.0)
            ->call('attachArtwork', $this->virgil->id, 76.0, 62.0);

        $figures = fn (Scene $s) => array_slice($s->fresh()->shots[0]['layers'], 1);
        $this->assertEquals($figures($byHand), $figures($composed));
        $this->assertSame(
            array_diff_key($byHand->fresh()->shots[0], ['layers' => true]),
            array_diff_key($composed->fresh()->shots[0], ['layers' => true]),
        );
    }
}
