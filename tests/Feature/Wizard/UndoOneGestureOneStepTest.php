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
 * One gesture is one undo step (11-13: three bone drags a second apart were all undone by one Cmd-Z).
 * The editor's client calls startEditStep at the start of every press or typing burst (resources/js/editor/edit-steps.js).
 */
class UndoOneGestureOneStepTest extends TestCase
{
    use RefreshDatabase;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'fig-ana-stand-01', 'layer' => 'figure', 'file' => 'a.webp'],
        ]]));
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => ['layers' => [
                ['asset' => 'fig-ana-stand-01', 'depth' => 'mid', 'x' => 0.1],
            ]]]],
        ]);
    }

    private function editor()
    {
        return Livewire::actingAs($this->scene->lesson->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->scene->lesson])
            ->call('selectScene', $this->scene->id);
    }

    private function x(): float
    {
        return (float) $this->scene->fresh()->config['stage25d']['set']['layers'][0]['x'];
    }

    private function move($editor, float $x): void
    {
        $editor->call('saveStage25dLayer', 0, ['x' => $x], $this->scene->id);
    }

    public function test_two_separate_edits_half_a_second_apart_are_two_undo_steps(): void
    {
        $editor = $this->editor();

        $editor->call('startEditStep');
        $this->move($editor, 0.3);
        $this->travel(500)->milliseconds();
        $editor->call('startEditStep');
        $this->move($editor, 0.5);
        $this->assertSame(0.5, $this->x());

        $editor->call('undoLastEdit');
        $this->assertSame(0.3, $this->x(), 'the first undo takes back only the second edit');
        $editor->call('undoLastEdit');
        $this->assertSame(0.1, $this->x(), 'the second undo takes back the first');
    }

    public function test_one_gestures_several_saves_are_one_undo_step(): void
    {
        $editor = $this->editor();

        $editor->call('startEditStep');
        foreach ([0.2, 0.3, 0.4] as $x) {   // a drag or a typing burst that saves as it goes
            $this->move($editor, $x);
            $this->travel(300)->milliseconds();
        }
        $this->assertSame(0.4, $this->x());

        $editor->call('undoLastEdit');
        $this->assertSame(0.1, $this->x(), 'one undo takes the whole gesture back');
        $editor->call('undoLastEdit');
        $this->assertSame(0.1, $this->x(), 'and there was nothing before it');
    }

    public function test_a_bone_keyed_at_the_playhead_saves_without_a_render_so_the_undo_after_it_does_not_wait(): void
    {
        $editor = $this->editor();
        $timeline = fn (array $keys, array $tracks = []) => ['duration' => 8, 'targets' => [], 'tracks' => $tracks, 'sceneId' => $this->scene->id, 'stage25dKeys' => ['layer-0' => $keys]];
        $editor->call('setTimeline', $timeline([['t' => 0, 'bone:upperarm_n' => -40]]));

        $editor->call('setTimeline', $timeline([['t' => 0, 'bone:upperarm_n' => -80]]));
        $this->assertSame(-80.0, (float) $this->scene->fresh()->config['stage25d']['set']['layers'][0]['keys'][0]['bone:upperarm_n']);
        $this->assertEmpty($editor->effects['html'] ?? null, 'only the stage keys changed: the stage shows them already');

        $text = [['target' => 'text:0', 'property' => 'opacity', 'keyframes' => [['time' => 1, 'value' => 0.5]]]];
        $editor->call('setTimeline', $timeline([['t' => 0, 'bone:upperarm_n' => -80]], $text));
        $this->assertNotEmpty($editor->effects['html'] ?? null, 'a track of the timeline itself still renders');
    }
}
