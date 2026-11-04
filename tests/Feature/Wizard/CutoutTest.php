<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\IconPanel;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Editor\Cutouts;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** Uitknippen: a part of a picture saved as the teacher's own asset, for normal and 3D scenes and the player. */
class CutoutTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'meadow-band-01', 'layer' => 'mid', 'file' => 'm.webp', 'w' => 1536, 'h' => 600, 'height_m' => 20],
        ]]));
    }

    private static function png(int $w = 6, int $h = 4): string
    {
        $img = imagecreatetruecolor($w, $h);
        ob_start();
        imagepng($img);

        return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
    }

    private function scene(User $teacher, array $attrs = []): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'X', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready', ...$attrs]);
    }

    public function test_a_cut_out_becomes_the_teachers_own_asset_with_its_real_size(): void
    {
        $teacher = User::factory()->create();
        $scene = $this->scene($teacher);

        Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('saveCutout', self::png(), 'Grass', ['bundle' => 'nl-prehistory', 'asset' => 'meadow-band-01', 'box_h' => 150, 'height' => 600])
            ->assertReturned(fn ($r) => $r['ok'] === true)
            ->assertDispatched('cutouts-changed');

        $asset = SvgAsset::where('source', Cutouts::SOURCE)->sole();
        $this->assertSame($teacher->id, $asset->user_id);
        $this->assertSame('Grass', $asset->title);
        $this->assertSame(5.0, $asset->height_m, '150 of 600 px of a 20 m band');
        Storage::disk('public')->assertExists($asset->svg_path);
        $this->assertStringStartsWith("cutouts/{$teacher->id}/", $asset->svg_path);
    }

    public function test_a_bad_picture_saves_nothing(): void
    {
        $teacher = User::factory()->create();
        $scene = $this->scene($teacher);

        Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('saveCutout', 'data:image/svg+xml;base64,PHN2Zz4=', 'x')
            ->assertReturned(['ok' => false]);
        $this->assertSame(0, SvgAsset::count());
    }

    public function test_my_cut_outs_is_a_tab_of_the_assets_panel_for_its_owner_only(): void
    {
        $teacher = User::factory()->create();
        $other = User::factory()->create();
        Cutouts::save($teacher, self::png(), 'Tree line');

        Livewire::actingAs($teacher)->test(IconPanel::class)
            ->assertSet('collection', IconPanel::CUTOUTS)   // the only collection there is here
            ->assertSee('Tree line');
        $this->assertNotContains(IconPanel::CUTOUTS, Livewire::actingAs($other)->test(IconPanel::class)->instance()->collections());
    }

    public function test_a_3d_scene_takes_the_teachers_own_cut_out_and_not_someone_elses(): void
    {
        $teacher = User::factory()->create();
        $mine = Cutouts::save($teacher, self::png(), 'Grass');
        $theirs = Cutouts::save(User::factory()->create(), self::png(), 'Rocks');
        $scene = $this->scene($teacher, ['kind' => 'stage25d', 'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => ['layers' => []]]]]);
        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);

        $editor->call('saveStage25dLayer', 0, ['add' => ['asset' => 'cut-'.$theirs->id, 'depth' => 'mid']], $scene->id);
        $editor->call('saveStage25dLayer', 0, ['add' => ['asset' => 'cut-'.$mine->id, 'depth' => 'mid']], $scene->id);

        $layers = $scene->fresh()->config['stage25d']['set']['layers'];
        $this->assertCount(1, $layers);
        $this->assertSame('cut-'.$mine->id, $layers[0]['asset']);
    }

    public function test_the_player_knows_every_cut_out_its_3d_scenes_use(): void
    {
        $teacher = User::factory()->create();
        $used = Cutouts::save($teacher, self::png(), 'Grass');
        Cutouts::save($teacher, self::png(), 'Not used');
        $scene = $this->scene($teacher, ['kind' => 'stage25d', 'config' => ['stage25d' => ['bundle' => 'nl-prehistory',
            'set' => ['layers' => [['asset' => 'cut-'.$used->id, 'depth' => 'mid']]]]]]);

        $rows = Cutouts::forStage(null, $scene->lesson);
        $this->assertSame(['cut-'.$used->id], array_column($rows, 'id'));
        $this->assertSame('../../'.$used->svg_path, $rows[0]['file'], 'relative to the bundle folder');
        $this->assertCount(2, Cutouts::forStage($teacher, $scene->lesson), 'the editor: all of the teacher\'s own');
    }
}
