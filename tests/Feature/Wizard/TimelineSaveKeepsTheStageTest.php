<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * A Timeline edit (its length, a keyframe) must not reload the stage. It did: the timeline lives
 * in config, any config change re-fired scene:load, and a quiz scene started its quiz over on
 * every change. Other config edits (a map's year) still have to reload it.
 */
class TimelineSaveKeepsTheStageTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Amsterdam', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration',
            'year' => '1650', 'location' => 'Amsterdam', 'script_segment' => 'Script.',
            'image_path' => 'bg.png', 'audio_path' => 'a.mp3', 'audio_script_hash' => sha1('Script.'),
            'status' => 'ready',
        ]);
    }

    public function test_changing_the_timeline_length_saves_without_reloading_the_stage(): void
    {
        $this->editor()
            ->call('setTimeline', ['duration' => 12.5, 'targets' => [], 'tracks' => []])
            ->assertNotDispatched('scene:load');

        $this->assertEquals(12.5, $this->scene->fresh()->config['timeline']['duration']);
    }

    public function test_any_other_config_change_still_reloads_the_stage(): void
    {
        $this->editor()
            ->set('selectedScene.config.map_year', 1300)
            ->call('saveSelected')
            ->assertDispatched('scene:load');
    }

    public function test_undo_and_redo_of_a_removed_keyframe_reach_the_timeline_panel(): void
    {
        $key = ['time' => 1.5, 'value' => 40, 'easing' => 'hold'];
        $with = ['duration' => 8, 'targets' => [], 'tracks' => [
            ['target' => 'art:5', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 25], $key, ['time' => 3, 'value' => 80]]],
            ['target' => 'art:5', 'property' => 'y', 'keyframes' => [['time' => 0, 'value' => 50], ['time' => 3, 'value' => 10]]],
        ]];
        $without = $with;
        array_splice($without['tracks'][0]['keyframes'], 1, 1);

        $editor = $this->editor()->call('setTimeline', $with);
        $this->travel(5)->seconds();   // its own undo step, not merged with the next save
        $editor->call('setTimeline', $without);
        $this->assertCount(2, $this->scene->fresh()->config['timeline']['tracks'][0]['keyframes']);

        $editor->call('undoLastEdit')
            ->assertDispatched('timeline-restored', fn (string $name, array $params) => ($params['timeline']['tracks'][0]['keyframes'][1] ?? null) == $key);
        $tracks = $this->scene->fresh()->config['timeline']['tracks'];
        $this->assertEquals($key, $tracks[0]['keyframes'][1]);
        $this->assertCount(2, $tracks[1]['keyframes'], 'the other property is untouched');

        $editor->call('redoLastEdit')
            ->assertDispatched('timeline-restored', fn (string $name, array $params) => count($params['timeline']['tracks'][0]['keyframes']) === 2);
        $this->assertCount(2, $this->scene->fresh()->config['timeline']['tracks'][0]['keyframes']);
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }
}
