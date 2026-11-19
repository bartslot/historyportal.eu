<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
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

/** Make a layer: a part of a stage picture becomes the teacher's cut-out AND a layer over its own pixels, in one undo step. */
class MakeLayerTest extends TestCase
{
    use RefreshDatabase;

    private const FROM = ['bundle' => 'nl-prehistory', 'asset' => 'bg-farmland-01', 'box_h' => 150, 'height' => 600];

    /** Where the stage worked out the new layer stands (scene/stage25d/cut-layer.js). */
    private const AT = ['depth' => 'bg', 'x' => 0.6123, 'y' => 1.25, 'z' => 70.1, 'rotation' => 0, 'height_m' => 2.5, 'ink_level' => 0.31, 'land_top' => 0.19];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'bg-farmland-01', 'layer' => 'bg', 'file' => 'f.webp', 'w' => 1536, 'h' => 600, 'height_m' => 20],
            ['id' => 'sky-summer-01', 'layer' => 'sky', 'file' => 's.webp', 'w' => 1536, 'h' => 1024, 'height_m' => 0],
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'c.webp', 'w' => 400, 'h' => 300, 'height_m' => 3],
        ]]));
    }

    private static function png(int $w = 6, int $h = 4): string
    {
        $img = imagecreatetruecolor($w, $h);
        ob_start();
        imagepng($img);

        return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
    }

    private function scene(User $teacher, array $set): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'X', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => $set]]]);
    }

    public function test_the_part_becomes_a_cut_out_and_a_layer_over_its_own_pixels_with_the_picture_behind_filled(): void
    {
        $teacher = User::factory()->create();
        $farm = ['asset' => 'bg-farmland-01', 'depth' => 'bg', 'x' => 0.5, 'edit_state' => ['crop' => [4, 2]]];
        $scene = $this->scene($teacher, ['layers' => [$farm, ['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6]]]);

        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('makeCutoutLayer', self::png(), 'Boat', self::FROM, $scene->id, 'layer-0', self::AT, self::png())
            ->assertReturned(fn ($r) => $r['ok'] === true && $r['index'] === 2 && str_starts_with($r['url'], '/storage/lessons/'))
            ->assertDispatched('cutouts-changed');

        $asset = SvgAsset::where('source', Cutouts::SOURCE)->sole();
        $this->assertSame(5.0, $asset->height_m, '150 of 600 px of a 20 m strip: saveCutout\'s own save');
        $layers = $scene->fresh()->config['stage25d']['set']['layers'];
        $this->assertCount(3, $layers);
        $this->assertSame(['asset' => 'cut-'.$asset->id, 'depth' => 'bg', 'x' => 0.6123, 'z' => 70.1, 'y' => 1.25, 'scale' => 0.5, 'shadow' => 0, 'ink_level' => 0.31], $layers[2],
            'at the place the stage gave, Size = 2.5 m of a 5 m cut-out, appended after (so drawn over) its picture, drawn with its lines and no shadow of its own');
        $this->assertSame(0.19, $layers[0]['land_top'], 'the filled picture keeps where its land starts: the horizon does not move');
        $this->assertSame(0.31, $layers[0]['ink_level'], 'and its line weight');
        $this->assertStringStartsWith("/storage/lessons/{$scene->lesson_id}/edits/", $layers[0]['src'], 'the picture draws a filled copy');
        $this->assertSame(['crop' => [4, 2]], $layers[0]['edit_state'], 'the copy has the very pixels it was opened on');
        $this->assertSame('bg-farmland-01', $layers[0]['asset'], 'the library picture itself is kept');

        $editor->call('undoLastEdit');
        $this->assertSame([$farm, ['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6]], $scene->fresh()->config['stage25d']['set']['layers'],
            'one Cmd-Z takes the layer and the fill back together');
    }

    public function test_without_fill_behind_the_picture_is_untouched_and_a_cut_off_the_sky_stays_at_sky_depth(): void
    {
        $teacher = User::factory()->create();
        $scene = $this->scene($teacher, ['sky' => 'sky-summer-01', 'layers' => []]);

        Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id)
            ->call('makeCutoutLayer', self::png(), 'Cloud', ['bundle' => 'nl-prehistory', 'asset' => 'sky-summer-01', 'box_h' => 100, 'height' => 1024], $scene->id, 'sky', [...self::AT, 'depth' => 'sky', 'z' => 120, 'height_m' => 6], null)
            ->assertReturned(fn ($r) => $r['ok'] === true && ! isset($r['url']));

        $set = $scene->fresh()->config['stage25d']['set'];
        $this->assertSame('sky', $set['layers'][0]['depth']);
        $this->assertEquals(3.0, $set['layers'][0]['scale'], 'a sky has no metres: 6 m of a cut-out at the default 2 m');
        $this->assertArrayNotHasKey('skyLayer', $set);
    }

    public function test_a_stale_scene_or_a_row_that_is_gone_makes_nothing(): void
    {
        $teacher = User::factory()->create();
        $scene = $this->scene($teacher, ['layers' => [['asset' => 'bg-farmland-01', 'depth' => 'bg']]]);
        $editor = Livewire::actingAs($teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);

        $editor->call('makeCutoutLayer', self::png(), 'x', self::FROM, $scene->id + 1, 'layer-0', self::AT, null)->assertReturned(fn ($r) => $r['ok'] === false);
        $editor->call('makeCutoutLayer', self::png(), 'x', self::FROM, $scene->id, 'layer-5', self::AT, null)->assertReturned(fn ($r) => $r['ok'] === false);
        $editor->call('makeCutoutLayer', self::png(), 'x', self::FROM, $scene->id, 'layer-0', [...self::AT, 'height_m' => 0], null)->assertReturned(fn ($r) => $r['ok'] === false);
        $editor->call('makeCutoutLayer', self::png(), 'x', self::FROM, $scene->id, 'layer-0', self::AT, 'data:image/svg+xml;base64,PHN2Zz4=')->assertReturned(fn ($r) => $r['ok'] === false);

        $this->assertSame(0, SvgAsset::count(), 'no cut-out saved for a layer that was not made');
        $this->assertCount(1, $scene->fresh()->config['stage25d']['set']['layers']);
    }
}
