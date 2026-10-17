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

    /**
     * The save keeps every property the timeline offers (resources/js/anim/properties.js): the
     * background's crop and opacity (Bart, 2026-10-17: "i would like to animate it just like any
     * other layer"), and a text's look, which this list used to drop as X and Y only.
     */
    public function test_the_save_keeps_background_and_text_look_tracks(): void
    {
        $keys = [['time' => 0, 'value' => 1], ['time' => 2, 'value' => 2]];
        $tracks = [];
        foreach (['x', 'y', 'zoom', 'opacity'] as $property) {
            $tracks[] = ['target' => 'bg:1', 'property' => $property, 'keyframes' => $keys];
        }
        foreach (['w', 'scale', 'rotation', 'blur', 'opacity', 'colorOpacity'] as $property) {
            $tracks[] = ['target' => 'text:t1', 'property' => $property, 'keyframes' => $keys];
        }
        $tracks[] = ['target' => 'text:t1', 'property' => 'color', 'keyframes' => [['time' => 0, 'value' => '#AABBCC'], ['time' => 1, 'value' => '#112233']]];
        $tracks[] = ['target' => 'bg:1', 'property' => 'rotation', 'keyframes' => $keys];   // not a background row

        $this->editor()->call('setTimeline', ['duration' => 8, 'targets' => [], 'tracks' => $tracks]);

        $saved = collect($this->scene->fresh()->config['timeline']['tracks'])->map(fn ($t) => $t['target'].'.'.$t['property'])->all();
        $this->assertSame([
            'bg:1.x', 'bg:1.y', 'bg:1.zoom', 'bg:1.opacity',
            'text:t1.w', 'text:t1.scale', 'text:t1.rotation', 'text:t1.blur', 'text:t1.opacity', 'text:t1.colorOpacity',
            'text:t1.color',
        ], $saved);
        $this->assertSame('#aabbcc', $this->scene->fresh()->config['timeline']['tracks'][10]['keyframes'][0]['value']);
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

    public function test_a_keyframed_track_keeps_its_base_its_colours_and_only_chosen_easings(): void
    {
        $this->editor()->call('setTimeline', ['duration' => 8, 'targets' => [], 'tracks' => [
            ['target' => 'art:5', 'property' => 'x', 'base' => 25, 'keyframes' => [
                ['time' => 0, 'value' => 25], ['time' => 3, 'value' => 80, 'easing' => 'hold'],
            ]],
            ['target' => 'art:5', 'property' => 'tint', 'base' => '', 'keyframes' => [
                ['time' => 0, 'value' => '#AABBCC'], ['time' => 2, 'value' => 'red'],
            ]],
            ['target' => 'art:5', 'property' => 'blend', 'keyframes' => [['time' => 0, 'value' => 1]]],
            ['target' => 'art:5', 'property' => 'y', 'keyframes' => []],
        ]]);

        $tracks = $this->scene->fresh()->config['timeline']['tracks'];

        $this->assertCount(2, $tracks, 'an unknown property and an empty track are dropped');
        $this->assertEquals(25, $tracks[0]['base']);
        $this->assertEquals([['time' => 0, 'value' => 25], ['time' => 3, 'value' => 80, 'easing' => 'hold']], $tracks[0]['keyframes']);
        $this->assertSame(['#aabbcc', ''], array_column($tracks[1]['keyframes'], 'value'));
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    /** Bart, 2026-10-17: the loop button's refresh arrows "looks odd": it is Heroicons' repeat icon. */
    public function test_the_loop_button_shows_the_repeat_icon(): void
    {
        $html = $this->editor()->html();
        $loop = substr($html, strpos($html, 'data-timeline-loop'), 1500);

        $this->assertStringContainsString('M19.5 12c0-1.232-.046-2.453-.138-3.662', $loop);   // arrow-path-rounded-square
        $this->assertStringNotContainsString('M16.023 9.348', $loop);                         // arrow-path, a refresh
    }
}
