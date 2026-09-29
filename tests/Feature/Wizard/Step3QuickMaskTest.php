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
 * Quick mask → Save: the masked PNG replaces the layer's picture in THIS scene only; the shared
 * library icon it came from is never touched.
 */
class Step3QuickMaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_saving_a_mask_swaps_the_layer_to_a_copy_and_leaves_the_library_icon_alone(): void
    {
        Storage::fake('public');
        $teacher = User::create(['name' => 'T', 'email' => 't@example.com', 'password' => 'secret-password', 'role' => 'teacher']);
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'title' => 'Mask', 'topic' => 'Mask', 'subject' => 'history',
            'grade_level' => '7', 'status' => LessonStatus::Configuring,
        ]);
        $icon = SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => 'history-line/props/medieval/bisaccia.webp',
            'source_url' => '', 'title' => 'Bisaccia', 'license' => 'own', 'svg_path' => 'svg-assets/library/history-line/props/medieval/bisaccia.webp',
        ]);
        $scene = Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready', 'script' => 'x',
            'shots' => [['layers' => [['asset_id' => $icon->id, 'path' => $icon->svg_path, 'x' => 40]]]],
        ]);

        Livewire::actingAs($teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id)
            ->set('maskedImage', UploadedFile::fake()->image('mask.png', 40, 30))
            ->call('saveMaskedLayer', $icon->id)
            ->assertSet('activeLayerId', fn ($id) => $id !== $icon->id);

        $layer = $scene->refresh()->shots[0]['layers'][0];
        $copy = SvgAsset::findOrFail($layer['asset_id']);
        $this->assertNotSame($icon->id, $copy->id);
        $this->assertSame($teacher->id, $copy->user_id);
        $this->assertSame('Bisaccia', $copy->title);
        $this->assertSame($copy->svg_path, $layer['path']);
        $this->assertSame(40, $layer['x']);                                   // placement kept
        Storage::disk('public')->assertExists($copy->svg_path);
        $this->assertSame('svg-assets/library/history-line/props/medieval/bisaccia.webp', $icon->refresh()->svg_path);
    }
}
