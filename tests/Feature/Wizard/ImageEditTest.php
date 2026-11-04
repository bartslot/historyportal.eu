<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Editor\EditedImages;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** Edited pictures (the earlier image editor): a new file per edit, the original kept, one Cmd-Z, Reset points back. */
class ImageEditTest extends TestCase
{
    use RefreshDatabase;

    private const STATE = ['finetunes' => ['Warmth'], 'finetunesProps' => ['warmth' => 40], 'imgSrc' => 'data:image/png;base64,AAAA'];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private static function png(int $w = 4, int $h = 3): string
    {
        $img = imagecreatetruecolor($w, $h);
        ob_start();
        imagepng($img);

        return 'data:image/png;base64,'.base64_encode((string) ob_get_clean());
    }

    private function lesson(): Lesson
    {
        return Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
    }

    private function editor(Scene $scene, ?User $as = null)
    {
        return Livewire::actingAs($as ?? $scene->lesson->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id);
    }

    public function test_a_picture_layer_gets_a_new_file_keeps_its_original_and_resets_and_undoes(): void
    {
        $layer = ['asset_id' => 7, 'kind' => 'figure', 'path' => 'assets/ship.png', 'x' => 50, 'y' => 50];
        $scene = Scene::create([
            'lesson_id' => $this->lesson()->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready',
            'shots' => [['layers' => [$layer]]],
        ]);
        $editor = $this->editor($scene);

        $editor->call('saveEditedImage', 'art_7', self::png(), self::STATE)->assertReturned(['ok' => true]);
        $saved = $scene->fresh()->shots[0]['layers'][0];
        $this->assertStringStartsWith("lessons/{$scene->lesson_id}/edits/", $saved['path']);
        Storage::disk('public')->assertExists($saved['path']);
        $this->assertSame('assets/ship.png', $saved['original_path']);
        $this->assertSame(['finetunes' => ['Warmth'], 'finetunesProps' => ['warmth' => 40]], $saved['edit_state'], 'without the picture itself');

        // a second edit replaces the edit, never the original
        $this->travel(2)->seconds();
        $editor->call('saveEditedImage', 'art_7', self::png(), self::STATE);
        $second = $scene->fresh()->shots[0]['layers'][0];
        $this->assertNotSame($saved['path'], $second['path']);
        $this->assertSame('assets/ship.png', $second['original_path']);

        $this->travel(2)->seconds();
        $editor->call('resetEditedImage', 'art_7');
        $this->assertSame($layer, $scene->fresh()->shots[0]['layers'][0], 'Back to the original: the layer reads like one never edited');
        Storage::disk('public')->assertExists($second['path']);   // files stay, so undo can bring an edit back

        $editor->call('undoLastEdit');
        $this->assertSame($second['path'], $scene->fresh()->shots[0]['layers'][0]['path'], 'one Cmd-Z per save');
    }

    public function test_a_stage25d_layer_band_and_sky_draw_the_edited_file_and_reset(): void
    {
        $scene = Scene::create([
            'lesson_id' => $this->lesson()->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => [
                'layers' => [['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6]],
                'groundBands' => [['asset' => 'meadow-band-01', 'z' => 30]],
                'sky' => 'sky-summer-01',
            ]]],
        ]);
        $editor = $this->editor($scene);

        foreach (['s25_layer-0', 's25_band-0', 's25_sky'] as $target) {
            $editor->call('saveEditedImage', $target, self::png(), self::STATE)->assertReturned(['ok' => true]);
        }
        $set = $scene->fresh()->config['stage25d']['set'];
        foreach ([$set['layers'][0], $set['groundBands'][0], $set['skyLayer']] as $row) {
            $this->assertMatchesRegularExpression('#^/storage/lessons/\d+/edits/[0-9a-f-]+\.png$#', $row['src'], 'a host-free URL');
            $this->assertArrayHasKey('edit_state', $row);
        }
        $this->assertSame('stone-chamber-01', $set['layers'][0]['asset'], 'the library picture stays the original');

        $editor->call('resetEditedImage', 's25_layer-0')->call('resetEditedImage', 's25_band-0')->call('resetEditedImage', 's25_sky');
        $set = $scene->fresh()->config['stage25d']['set'];
        $this->assertSame(['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6], $set['layers'][0]);
        $this->assertSame(['asset' => 'meadow-band-01', 'z' => 30], $set['groundBands'][0]);
        $this->assertSame([], $set['skyLayer']);
    }

    public function test_a_bad_picture_or_target_saves_nothing(): void
    {
        $scene = Scene::create([
            'lesson_id' => $this->lesson()->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready',
            'shots' => [['layers' => [['asset_id' => 7, 'path' => 'a.png']]]],
        ]);
        $editor = $this->editor($scene);

        $editor->call('saveEditedImage', 'art_7', 'data:image/png;base64,bm90IGFuIGltYWdl', [])->assertReturned(['ok' => false]);
        $editor->call('saveEditedImage', 'art_7', 'data:image/svg+xml;base64,PHN2Zz4=', [])->assertReturned(['ok' => false]);
        $editor->call('saveEditedImage', 'art_8', self::png(), [])->assertReturned(['ok' => false]);
        $editor->call('saveEditedImage', '../../etc', self::png(), [])->assertReturned(['ok' => false]);
        $editor->call('saveEditedImage', 's25_layer-0', self::png(), [])->assertReturned(['ok' => false]);
        $this->assertSame('a.png', $scene->fresh()->shots[0]['layers'][0]['path']);
    }

    public function test_another_teachers_lesson_cannot_be_edited(): void
    {
        $scene = Scene::create([
            'lesson_id' => $this->lesson()->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready',
            'shots' => [['layers' => [['asset_id' => 7, 'path' => 'a.png']]]],
        ]);

        $this->expectException(\Throwable::class);
        $this->editor($scene, User::factory()->create())->call('saveEditedImage', 'art_7', self::png(), []);
    }

    public function test_the_editor_state_is_kept_small_and_without_the_picture(): void
    {
        $this->assertNull(EditedImages::state([]));
        $this->assertNull(EditedImages::state(['annotations' => str_repeat('x', EditedImages::MAX_STATE_BYTES)]));
        $this->assertSame(['a' => 1], EditedImages::state(['a' => 1, 'imgSrc' => 'x']));
        $this->assertSame(['art', 12], EditedImages::target('art_12'));
        $this->assertSame(['s25', 'band-2'], EditedImages::target('s25_band-2'));
        $this->assertNull(EditedImages::target('s25_camera'));
    }
}
