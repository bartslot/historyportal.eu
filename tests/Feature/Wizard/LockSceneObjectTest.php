<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** The layer menu's Lock (LocksSceneObjects): on the layer's own record, one undo step, gone again on unlock. */
class LockSceneObjectTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.webp'],
        ]]));
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Amsterdam', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
    }

    public function test_an_artwork_layer_locks_on_its_own_record_and_unlocks_again(): void
    {
        $scene = $this->scene(['shots' => [['order' => 0, 'image_path' => 'bg.png', 'layers' => [
            ['path' => 'bg.png', 'kind' => 'cover'],
            ['asset_id' => 7, 'path' => 'a.svg', 'kind' => 'figure', 'x' => 40.0, 'y' => 60.0],
        ]]]]);

        $editor = $this->editor($scene)->call('lockObject', 'art_7', true);
        $this->assertSame(1, $scene->fresh()->shots[0]['layers'][1]['locked']);

        $editor->call('lockObject', 'art_7', false);
        $this->assertArrayNotHasKey('locked', $scene->fresh()->shots[0]['layers'][1]);
    }

    public function test_the_editor_payload_tells_the_canvas_a_layer_is_locked(): void
    {
        $scene = $this->scene(['shots' => [['order' => 0, 'image_path' => 'bg.png', 'layers' => [
            ['asset_id' => 7, 'path' => 'a.svg', 'kind' => 'figure', 'locked' => 1],
        ]]]]);

        $this->editor($scene)->assertDispatched('scene:load', fn (string $e, array $p) => (collect($p['payload']['shots'][0]['layers'] ?? [])->firstWhere('asset_id', 7)['locked'] ?? false) === true);
    }

    public function test_a_stage_layer_locks_and_one_undo_takes_it_back(): void
    {
        $scene = $this->scene(['kind' => 'stage25d', 'image_path' => null, 'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'beat' => 'hook', 'set' => ['layers' => [
            ['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6],
        ]]]]]);

        $editor = $this->editor($scene)->call('lockObject', 's25_layer-0', true);
        $this->assertSame(1, $scene->fresh()->config['stage25d']['set']['layers'][0]['locked']);

        $editor->call('undoLastEdit');
        $this->assertArrayNotHasKey('locked', $scene->fresh()->config['stage25d']['set']['layers'][0]);
    }

    public function test_text_boxes_keep_their_lock_through_the_canvas_save(): void
    {
        $scene = $this->scene();

        $this->editor($scene)->call('saveSceneTexts', $scene->id, [
            ['id' => 'txt_a', 'text' => 'Dam Square', 'x' => 10, 'y' => 10, 'locked' => 1],
            ['id' => 'rect_b', 'kind' => 'rect', 'side' => 'left', 'locked' => true],
            ['id' => 'txt_c', 'text' => 'Free', 'x' => 10, 'y' => 30],
        ]);

        $texts = collect($scene->fresh()->config['texts'])->keyBy('id');
        $this->assertSame(1, $texts['txt_a']['locked']);
        $this->assertSame(1, $texts['rect_b']['locked']);
        $this->assertArrayNotHasKey('locked', $texts['txt_c']);
    }

    public function test_the_background_and_unknown_ids_are_ignored(): void
    {
        $scene = $this->scene();
        $before = $scene->shots;

        $this->editor($scene)->call('lockObject', '__bg__', true)->call('lockObject', 's25_sky', true);

        $this->assertSame($before, $scene->fresh()->shots);
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
    }

    private function scene(array $attrs = []): Scene
    {
        return Scene::create(array_merge([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration',
            'year' => '1650', 'location' => 'Amsterdam', 'script_segment' => 'Script.',
            'image_path' => 'bg.png', 'audio_path' => 'a.mp3', 'audio_script_hash' => sha1('Script.'),
            'status' => 'ready',
        ], $attrs));
    }
}
