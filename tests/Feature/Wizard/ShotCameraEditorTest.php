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
 * Bart, 2026-10-13: a teacher must be able to change everything and change it back. The panel
 * camera and the world-motion modes are edited in the Animate / Format tabs, validated by
 * ShotCamera / LayerAmbient, reset to their defaults, undone, and forwarded to the canvas.
 */
class ShotCameraEditorTest extends TestCase
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
            'source' => 'commons', 'source_ref' => 'sea-1',
            'source_url' => 'https://example.com/sea.png',
            'title' => 'Sea', 'license' => 'CC0', 'svg_path' => 'assets/sea.png',
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id,
            'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'bg.png',
            'shots' => [['order' => 0, 'image_path' => 'bg.png', 'layers' => [
                ['path' => 'bg.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $this->asset->id, 'path' => 'assets/sea.png', 'kind' => 'figure', 'x' => 50.0, 'y' => 80.0, 'scale' => 1.0, 'height' => 30],
            ]]],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    private function shot(): array
    {
        return $this->scene->refresh()->shots[0];
    }

    public function test_a_panel_remembers_its_camera_and_entry(): void
    {
        $this->wizard()
            ->call('setShotCamera', 0, 'move', 'push')
            ->call('setShotCamera', 0, 'amount', '1.5')
            ->call('setShotCamera', 0, 'duration', '6')
            ->call('setShotCamera', 0, 'ease', 'enter')
            ->call('setShotCamera', 0, 'delay', '0.5')
            ->call('setShotCamera', 0, 'entry', 'reveal');

        $shot = $this->shot();
        $this->assertSame('push', $shot['camera']['move']);
        $this->assertEquals(1.5, $shot['camera']['amount']);
        $this->assertEquals(6, $shot['camera']['duration']);
        $this->assertSame('enter', $shot['camera']['ease']);
        $this->assertEquals(0.5, $shot['camera']['delay']);
        $this->assertSame('reveal', $shot['entry']);
        $this->assertCount(2, $shot['layers'], 'the layers are untouched');
    }

    public function test_values_the_player_cannot_play_are_refused_or_clamped(): void
    {
        $this->wizard()
            ->call('setShotCamera', 0, 'move', 'barrel-roll')
            ->call('setShotCamera', 0, 'entry', 'explode')
            ->call('setShotCamera', 0, 'ease', 'bouncy')
            ->call('setShotCamera', 0, 'colour', 'red')
            ->call('setShotCamera', 0, 'amount', '50')
            ->call('setShotCamera', 0, 'duration', '0');

        $shot = $this->shot();
        $this->assertArrayNotHasKey('entry', $shot);
        $this->assertSame(['amount' => 2.0, 'duration' => 0.3], array_map('floatval', $shot['camera']));
    }

    public function test_reset_takes_one_setting_or_the_whole_camera_back_to_its_default(): void
    {
        $wizard = $this->wizard()
            ->call('setShotCamera', 0, 'move', 'pan-r')
            ->call('setShotCamera', 0, 'amount', '2')
            ->call('setShotCamera', 0, 'entry', 'slide')
            ->call('resetShotCamera', 0, 'amount');

        $this->assertSame(['move' => 'pan-r'], $this->shot()['camera']);

        $wizard->call('resetShotCamera', 0);
        $shot = $this->shot();
        $this->assertArrayNotHasKey('camera', $shot);
        $this->assertArrayNotHasKey('entry', $shot);
    }

    public function test_undo_takes_a_camera_change_back(): void
    {
        $wizard = $this->wizard()->call('setShotCamera', 0, 'move', 'shake');
        $this->assertSame('shake', $this->shot()['camera']['move']);

        $wizard->call('undoLastEdit');
        $this->assertArrayNotHasKey('camera', $this->shot());
    }

    public function test_a_scene_with_only_a_picture_gets_its_panel_when_the_camera_is_set(): void
    {
        $this->scene->update(['shots' => null]);

        $this->wizard()->call('setShotCamera', 0, 'move', 'push');

        $shot = $this->shot();
        $this->assertSame('push', $shot['camera']['move']);
        $this->assertSame('bg.png', $shot['layers'][0]['path']);
    }

    /** A flat scene (Dante, quiz, story game...) must play exactly as before after Hold / fade / reset. */
    public function test_hold_fade_timing_and_reset_leave_a_flat_scene_untouched(): void
    {
        $this->scene->update(['shots' => null]);
        $before = $this->scene->refresh()->updated_at;

        $this->wizard()
            ->call('setShotCamera', 0, 'move', 'hold')
            ->call('setShotCamera', 0, 'entry', 'fade')
            ->call('setShotCamera', 0, 'amount', '1.5')
            ->call('setShotCamera', 0, 'duration', '4')
            ->call('resetShotCamera', 0)
            ->call('resetShotCamera', 0, 'amount');

        $scene = $this->scene->refresh();
        $this->assertNull($scene->shots);
        $this->assertEquals($before, $scene->updated_at);
    }

    public function test_a_real_entry_on_a_flat_scene_gets_its_panel(): void
    {
        $this->scene->update(['shots' => null]);

        $this->wizard()->call('setShotCamera', 0, 'entry', 'slide');

        $this->assertSame('slide', $this->shot()['entry']);
        $this->assertArrayNotHasKey('camera', $this->shot());
    }

    public function test_the_editor_payload_forwards_the_camera_validated(): void
    {
        $shots = $this->scene->shots;
        $shots[0]['camera'] = ['move' => 'truck-l', 'amount' => 9];
        $shots[0]['entry'] = 'match';
        $this->scene->update(['shots' => $shots]);

        $shot = $this->wizard()->instance()->serializeShots($this->scene->refresh())[0];

        $this->assertSame(['move' => 'truck-l', 'amount' => 2.0, 'duration' => 10.0, 'ease' => 'move', 'delay' => 0.0], $shot['camera']);
        $this->assertSame('match', $shot['entry']);
    }

    public function test_the_animate_tab_shows_the_camera_controls(): void
    {
        $this->scene->update(['shots' => array_map(fn ($s) => $s + ['camera' => ['move' => 'push']], $this->scene->shots)]);

        $this->wizard()
            ->assertSeeHtml('data-camera-panel')
            ->assertSeeHtml('data-camera-move')
            ->assertSeeHtml('data-camera-entry')
            ->assertSeeHtml('data-camera-advanced')
            ->assertSeeHtml('data-camera-reset')
            ->assertSee(__('Push in'));
    }

    public function test_every_world_motion_mode_is_accepted_on_a_layer_and_reset_keeps_the_mode(): void
    {
        $wizard = $this->wizard();
        foreach (['swell', 'roll', 'billow', 'rain', 'flash', 'spray', 'flicker', 'rise', 'oars'] as $mode) {
            $wizard->call('updateArtworkLayer', $this->asset->id, 'ambient', $mode);
            $this->assertSame($mode, collect($this->shot()['layers'])->firstWhere('asset_id', $this->asset->id)['ambient']);
        }

        $wizard->call('updateArtworkLayer', $this->asset->id, 'ambient_speed', '2.5')
            ->call('updateArtworkLayer', $this->asset->id, 'ambient_amount', '1.7')
            ->call('resetLayerMotion', $this->asset->id);

        $layer = collect($this->shot()['layers'])->firstWhere('asset_id', $this->asset->id);
        $this->assertSame('oars', $layer['ambient']);
        $this->assertNull($layer['ambient_speed']);
        $this->assertNull($layer['ambient_amount']);
    }
}
