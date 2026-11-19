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

/**
 * Cmd-Z takes back the NEWEST edit, whichever kind it is (Bart 11-19: "I deleted an asset, on top of the
 * other asset, and it didn't bring it back with Cmd+Z, but it brought back the scene I deleted prior").
 * A deleted scene and a scene's own edits are kept in two places; undoLastEdit has to compare their ages.
 */
class UndoNewestEditFirstTest extends TestCase
{
    use RefreshDatabase;

    private Scene $stage;

    private Scene $other;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'fig-ana-stand-01', 'layer' => 'figure', 'file' => 'a.webp'],
            ['id' => 'fig-bob-stand-01', 'layer' => 'figure', 'file' => 'b.webp'],
        ]]));
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->stage = Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => ['layers' => [
                ['asset' => 'fig-ana-stand-01', 'depth' => 'mid', 'x' => 0.1],
                ['asset' => 'fig-bob-stand-01', 'depth' => 'mid', 'x' => 0.1],   // on top of the first
            ]]]],
        ]);
        $this->other = Scene::create([
            'lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'stage25d', 'script_segment' => 'y', 'status' => 'ready',
        ]);
    }

    private function editor()
    {
        return Livewire::actingAs($this->stage->lesson->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->stage->lesson]);
    }

    /** @return list<string> */
    private function assets(): array
    {
        return array_column($this->stage->fresh()->config['stage25d']['set']['layers'], 'asset');
    }

    public function test_a_layer_deleted_after_a_scene_comes_back_first_then_the_scene(): void
    {
        $editor = $this->editor()->call('selectScene', $this->other->id);
        $editor->call('startEditStep')->call('deleteScene', $this->other->id);
        $this->travel(2)->seconds();
        $editor->call('selectScene', $this->stage->id);
        $editor->call('startEditStep')->call('deleteObject', 's25_layer-1');
        $this->assertSame(['fig-ana-stand-01'], $this->assets());

        $editor->call('undoLastEdit');
        $this->assertSame(['fig-ana-stand-01', 'fig-bob-stand-01'], $this->assets(), 'the first Cmd-Z puts the layer back');
        $this->assertNull(Scene::find($this->other->id), 'and leaves the scene deleted');

        $editor->call('undoLastEdit');
        $this->assertNotNull(Scene::find($this->other->id), 'the second Cmd-Z restores the scene');
        $this->assertSame(['fig-ana-stand-01', 'fig-bob-stand-01'], $this->assets());
    }

    public function test_a_scene_deleted_after_a_layer_edit_comes_back_first(): void
    {
        $editor = $this->editor()->call('selectScene', $this->stage->id);
        $editor->call('startEditStep')->call('deleteObject', 's25_layer-1');
        $this->travel(2)->seconds();
        $editor->call('startEditStep')->call('deleteScene', $this->other->id);

        $editor->call('undoLastEdit');
        $this->assertNotNull(Scene::find($this->other->id), 'the newest edit was the scene delete');
        $this->assertSame(['fig-ana-stand-01'], $this->assets(), 'the older layer delete is still in place');

        $editor->call('selectScene', $this->stage->id)->call('undoLastEdit');
        $this->assertSame(['fig-ana-stand-01', 'fig-bob-stand-01'], $this->assets());
    }

    public function test_an_undone_layer_edit_no_longer_outranks_the_scene_delete(): void
    {
        // Delete scene, move the layer twice, undo both moves: the next Cmd-Z must reach the scene,
        // not stop because the stage's history once held newer steps.
        $editor = $this->editor();
        $editor->call('startEditStep')->call('deleteScene', $this->other->id);
        $this->travel(2)->seconds();
        $editor->call('selectScene', $this->stage->id);
        foreach ([0.3, 0.5] as $x) {
            $editor->call('startEditStep')->call('saveStage25dLayer', 0, ['x' => $x], $this->stage->id);
            $this->travel(1)->seconds();
        }

        $editor->call('undoLastEdit')->call('undoLastEdit');
        $this->assertSame(0.1, (float) $this->stage->fresh()->config['stage25d']['set']['layers'][0]['x']);
        $this->assertNull(Scene::find($this->other->id), 'two Cmd-Z, two moves: the scene waits its turn');

        $editor->call('undoLastEdit');
        $this->assertNotNull(Scene::find($this->other->id));
    }
}
