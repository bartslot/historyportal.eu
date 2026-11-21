<?php

declare(strict_types=1);

namespace Tests\Feature\Editor;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/** Choices that link a scene to any other scene, Twine-style (Bart 2026-11-21: "links to other scenes is not yet added"). */
class SceneLinksTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    /** @var list<Scene> */
    private array $scenes = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        foreach (['Venice', 'Destination', 'Cargo', 'Embark'] as $i => $name) {
            $this->scenes[] = Scene::create([
                'lesson_id' => $this->lesson->id, 'order' => $i + 1, 'kind' => 'narration', 'chapter_name' => $name,
                'script_segment' => $name.'.', 'status' => 'ready', 'config' => ['show_caption' => true],
            ]);
        }
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
    }

    public function test_a_teacher_adds_two_choices_that_jump_to_other_scenes(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;

        $this->editor($venice)
            ->assertDontSeeHtml('data-scene-links-inspector')   // no layer until one is added
            ->call('addSceneLink', $venice->id)
            ->call('saveSceneLink', $venice->id, 0, 'label', '  Ask <b>Niccolò</b>  where you are headed ')
            ->call('addSceneLink', $venice->id)
            ->call('saveSceneLink', $venice->id, 1, 'to', (string) $cargo->id)
            ->call('saveSceneLink', $venice->id, 1, 'label', 'Watch the sailors')
            ->assertSeeHtml('data-scene-links-inspector')
            ->assertSee('Ask Niccolò where you are headed');

        $config = $venice->fresh()->config;
        $this->assertSame([
            ['label' => 'Ask Niccolò where you are headed', 'to' => $destination->id],   // a new choice starts at the next scene
            ['label' => 'Watch the sailors', 'to' => $cargo->id],
        ], $config['links']);
        $this->assertTrue($config['show_caption']);   // the rest of the scene is left alone
    }

    public function test_editing_the_scene_afterwards_keeps_its_choices(): void
    {
        [$venice] = $this->scenes;
        $editor = $this->editor($venice)->call('addSceneLink', $venice->id);
        $editor->set('selectedScene.script_segment', 'New words.')->call('saveSelected');

        $this->assertCount(1, $venice->fresh()->config['links']);
        $this->assertSame('New words.', $venice->fresh()->script_segment);
    }

    public function test_a_choice_cannot_point_outside_the_lesson_and_can_be_removed(): void
    {
        [$venice] = $this->scenes;
        $other = Scene::create(['lesson_id' => Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Other', 'subject' => 'history', 'grade_level' => '9th', 'image_style' => 'cinematic',
        ])->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        $editor = $this->editor($venice)
            ->call('addSceneLink', $venice->id)
            ->call('saveSceneLink', $venice->id, 0, 'to', (string) $other->id);
        $this->assertNull($venice->fresh()->config['links'][0]['to']);

        $editor->call('removeSceneLink', $venice->id, 0);
        $this->assertArrayNotHasKey('links', $venice->fresh()->config);
    }

    public function test_an_ending_has_no_choices(): void
    {
        [, , $cargo] = $this->scenes;
        $this->editor($cargo)
            ->call('addSceneLink', $cargo->id)
            ->call('setSceneEnding', $cargo->id, true)
            ->assertDontSee('Add choice');

        $config = $cargo->fresh()->config;
        $this->assertTrue($config['ending']);
        $this->assertArrayNotHasKey('links', $config);
    }

    public function test_add_choices_puts_the_layer_on_the_current_scene_instead_of_adding_scenes(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;

        // Add > Choices, and the old Decision point entry, both land here (Bart 2026-11-21: "it should become a layer")
        $this->editor($venice)->call('addScene', 'branch')->assertSeeHtml('data-scene-links-inspector');

        $this->assertSame(4, $this->lesson->scenes()->count());
        $this->assertSame(0, $this->lesson->scenes()->whereNotNull('branch_role')->count());
        $this->assertSame([['label' => '', 'to' => $destination->id], ['label' => '', 'to' => $cargo->id]], $venice->fresh()->config['links']);
    }

    public function test_the_scene_picker_no_longer_offers_a_decision_point_and_add_offers_choices(): void
    {
        $this->editor($this->scenes[0])
            ->assertDontSeeHtml("addScene('branch')")
            ->assertSeeHtml('data-add-choices');
    }

    public function test_the_player_gets_the_links(): void
    {
        [$venice, , $cargo] = $this->scenes;
        $venice->update(['config' => ['links' => [['label' => 'Watch the sailors', 'to' => $cargo->id]]]]);

        $html = $this->actingAs($this->teacher)->get(route('lesson.play', ['lessonCode' => $this->lesson->fresh()->lesson_code]))->assertOk()->getContent();
        preg_match('/window\.LESSON = (\{.*?\});\n/s', $html, $m);
        $first = json_decode($m[1], true)['scenes'][0];

        $this->assertSame([['label' => 'Watch the sailors', 'to' => $cargo->id]], $first['config']['links']);
    }
}
