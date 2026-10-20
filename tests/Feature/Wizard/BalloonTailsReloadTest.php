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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-10-20: "I saw tails disappearing when I opened a lesson again." On prod, lesson 63
 * scene 1599: the bootsman's balloon points at figure 100 ("Sailor front") while the scene now
 * shows 286, a quick-masked copy of it. The mask swapped the layer's asset id and left the balloon
 * pointing at a figure that is no longer on the stage, so its tail had nobody to point at.
 */
class BalloonTailsReloadTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private SvgAsset $sailor;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->sailor = SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => 'history-line/figures/tasman/sailor-front.webp',
            'source_url' => '', 'title' => 'Sailor front', 'license' => 'own', 'svg_path' => 'svg-assets/library/history-line/figures/tasman/sailor-front.webp',
        ]);
    }

    private function scene(array $lines, int $order = 1): Scene
    {
        return Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => $order, 'kind' => 'narration', 'status' => 'ready', 'image_path' => 'deck.png',
            'config' => ['lines' => $lines],
            'shots' => [['image_path' => 'deck.png', 'layers' => [
                ['path' => 'deck.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $this->sailor->id, 'path' => $this->sailor->svg_path, 'kind' => 'figure', 'x' => 40, 'y' => 70, 'height' => 50],
            ]]],
        ]);
    }

    public function test_masking_a_speaking_figure_keeps_its_balloon_pointing_at_it(): void
    {
        $scene = $this->scene([
            ['speaker' => 'narrator', 'text' => 'Aan dek.', 'start' => 0, 'end' => 2, 'figure' => null],
            ['speaker' => 'bootsman', 'text' => 'Alle hens!', 'start' => 0, 'end' => 4,
                'figure' => ['asset_id' => $this->sailor->id, 'mouth' => [0.52, 0.14], 'facing' => -1]],
        ]);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id)
            ->set('maskedImage', UploadedFile::fake()->image('mask.png', 40, 30))
            ->call('saveMaskedLayer', $this->sailor->id);

        $scene->refresh();
        $masked = $scene->shots[0]['layers'][1]['asset_id'];
        $this->assertNotSame($this->sailor->id, $masked);
        // The balloon follows the figure to its masked copy: same mouth, same facing.
        $this->assertSame(['asset_id' => $masked, 'mouth' => [0.52, 0.14], 'facing' => -1], $scene->config['lines'][1]['figure']);
        $this->assertNull($scene->config['lines'][0]['figure']);
    }

    public function test_the_relink_command_repairs_a_balloon_masked_before_the_fix_and_reports_the_rest(): void
    {
        $mask = SvgAsset::create([
            'user_id' => $this->teacher->id, 'source' => 'mask', 'source_ref' => 'm1', 'source_url' => '/storage/m.webp',
            'title' => 'Sailor front', 'license' => 'own', 'svg_path' => 'lessons/1/uploads/m.webp',
        ]);
        $speaks = fn (int $id) => ['speaker' => 'bootsman', 'text' => 'Alle hens!', 'start' => 0, 'end' => 4,
            'figure' => ['asset_id' => $id, 'mouth' => [0.52, 0.14], 'facing' => -1]];
        // Prod scene 1599: the line points at the library figure, the stage shows its masked copy.
        $scene = $this->scene([$speaks($this->sailor->id)]);
        $shots = $scene->shots;
        $shots[0]['layers'][1]['asset_id'] = $mask->id;
        $scene->update(['shots' => $shots]);
        // Prod scene 1594: the speaker is not on the scene at all. Nothing to relink to.
        $gone = $this->scene([$speaks(999)], 2);

        $this->artisan('balloons:relink', ['lesson' => $this->lesson->id])->assertSuccessful();
        $this->assertSame($this->sailor->id, $scene->refresh()->config['lines'][0]['figure']['asset_id']);   // dry run

        $this->artisan('balloons:relink', ['lesson' => $this->lesson->id, '--apply' => true])
            ->expectsOutputToContain("figure {$this->sailor->id} -> {$mask->id}")
            ->expectsOutputToContain('figure 999 is not on the scene')
            ->assertSuccessful();
        $this->assertSame($mask->id, $scene->refresh()->config['lines'][0]['figure']['asset_id']);
        $this->assertSame(999, $gone->refresh()->config['lines'][0]['figure']['asset_id']);
    }

    public function test_a_balloons_place_and_tail_survive_every_save_and_reload(): void
    {
        // Scene 1594's edited balloon, exactly as prod stores it.
        $edited = ['speaker' => 'raadsheer', 'text' => 'Je krijgt 2 schepen', 'start' => 0, 'end' => 4.09, 'figure' => null,
            'at' => [0.2542, 0.2229], 'tail' => ['tip' => [0.3023, 0.3741], 'bend' => 0.12]];
        $scene = $this->scene([$edited]);

        $wizard = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
        // Edits that touch other things on the scene: a figure moved, the words, the timeline.
        $wizard->dispatch('artwork:move', assetId: $this->sailor->id, x: 45.0, y: 70.0, scale: 1.0, rotation: 0.0)
            ->call('updateBalloon', 'bal_0', 'text', 'Je krijgt 2 schepen!')
            ->call('setTimeline', ['duration' => 8, 'tracks' => []]);

        $line = $scene->refresh()->config['lines'][0];
        $this->assertEquals([0.2542, 0.2229], $line['at']);
        $this->assertEquals(['tip' => [0.3023, 0.3741], 'bend' => 0.12], $line['tail']);

        // A fresh editor (a reload) hands the stage the same line, untouched.
        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id)
            ->assertDispatched('scene:load', fn ($name, $p) => ($p['payload']['config']['lines'][0]['at'] ?? null) == [0.2542, 0.2229]
                && ($p['payload']['config']['lines'][0]['tail']['tip'] ?? null) == [0.3023, 0.3741]);
    }
}
