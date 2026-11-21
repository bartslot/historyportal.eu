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
 * Decision points (question + two options) in the editor: their effects panel, meters and publish gate.
 * Adding one from the editor is gone; a choice is now the Choices layer (tests/Feature/Editor/SceneLinksTest).
 *
 * BuildLessonOutline used to be the only code that ever wrote branch_group/branch_role, so a
 * branching story was impossible without a working LLM — and with the writing service out of credit,
 * impossible full stop. These cover the manual route.
 */
class AddBranchSceneTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'The Dutch Revolt', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
        ]);
        Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration',
            'script_segment' => 'Opening.', 'image_path' => 'a.png', 'audio_path' => 'a.mp3',
            'status' => 'ready',
        ]);
    }

    /**
     * A Decision point as the generator writes one: a question and two options. The editor no longer adds these
     * (Bart 2026-11-21: a choice is a layer on a scene, EditsSceneLinks), but generated lessons still carry them.
     */
    private function addBranch(): void
    {
        $next = (int) $this->lesson->scenes()->max('order') + 1;
        foreach (['question' => null, 'option_a' => 'First choice', 'option_b' => 'Second choice'] as $role => $label) {
            Scene::create([
                'lesson_id' => $this->lesson->id, 'order' => $next++, 'kind' => 'narration', 'status' => 'pending',
                'branch_group' => 1, 'branch_role' => $role, 'branch_choice_label' => $label,
            ]);
        }
    }

    private function addMeters(): void
    {
        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson->fresh()])
            ->call('addStoryMeters');
    }



    /**
     * A Decision point is content: the lesson keeps the type it was made as and brings no meters
     * along (Bart 2026-11-17). Meters are the teacher's own "Add class meters"; once added they
     * are well-formed, and choices without them are publishable (both options simply play).
     */
    public function test_adding_a_branch_leaves_the_lesson_type_and_meters_to_the_teacher(): void
    {
        $this->addBranch();
        $lesson = $this->lesson->fresh();

        $this->assertNull($lesson->game_type);
        $this->assertFalse($lesson->hasMeters());

        $this->addMeters();
        $lesson = $this->lesson->fresh();
        $this->assertNotEmpty($lesson->game_config['meters'] ?? []);

        foreach ($lesson->game_config['meters'] as $meter) {
            $this->assertArrayHasKey('key', $meter);
            $this->assertArrayHasKey('label', $meter);
            $this->assertIsInt($meter['start']);
        }
    }

    /** The effects panel must actually be reachable for the options that were just created. */
    public function test_the_game_effects_panel_opens_for_a_hand_made_option_scene(): void
    {
        $this->addBranch();

        $option = $this->lesson->scenes()->where('branch_role', 'option_a')->firstOrFail();
        $question = $this->lesson->scenes()->where('branch_role', 'question')->firstOrFail();

        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson->fresh()]);

        $this->assertTrue($component->instance()->showsGameEffectsPanel($option));
        $this->assertFalse($component->instance()->showsGameEffectsPanel($question));
        // No meters until the teacher adds them: the panel offers "Add class meters" instead.
        $this->assertFalse($component->instance()->showsMetersPanel());
    }

    /** Effects saved on a hand-made option persist — the panel is wired end to end. */
    public function test_effects_can_be_saved_on_a_hand_made_option(): void
    {
        $this->addBranch();
        $this->addMeters();
        $option = $this->lesson->scenes()->where('branch_role', 'option_a')->firstOrFail();
        $meterKey = $this->lesson->fresh()->game_config['meters'][0]['key'];

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson->fresh()])
            ->call('saveBranchEffects', $option->id, [
                'deltas' => [$meterKey => 10],
                'consequence_line' => 'The city holds.',
                'branch_choice_label' => 'Hold the city',
            ]);

        $effects = $option->fresh()->config['branch_effects'] ?? [];
        $this->assertSame(10, $effects['deltas'][$meterKey] ?? null);
    }




    /**
     * The payoff: a branch built entirely by hand must be publishable once the teacher fills it in.
     * If it were not, the Add-scene tile would just be a new way to make a permanently blocked
     * lesson. Blocked first (options have no deltas), then live after both are set.
     */
    public function test_a_hand_built_branching_lesson_can_be_published(): void
    {
        $this->addBranch();
        $this->addMeters();
        $lesson = $this->lesson->fresh();
        $meterKey = $lesson->game_config['meters'][0]['key'];

        // The teacher writes and narrates the three scenes.
        $lesson->scenes()->whereNotNull('branch_group')->get()
            ->each(fn (Scene $s) => $s->update([
                'script_segment' => 'Written by hand.', 'image_path' => 'b.png',
                'audio_path' => 'b.mp3', 'status' => 'ready',
            ]));

        $preview = fn () => Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson->fresh()]);

        // Options still carry no meter effects → the story-game gate holds the lesson back.
        $blocked = $preview()->call('publish');
        $this->assertNotSame(LessonStatus::Published, $lesson->fresh()->status);
        $blocked->assertSet('publishNotice', fn ($e) => str_contains((string) $e, 'Story game incomplete'));

        // Fill both options in, exactly as the effects panel does.
        $configurator = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson->fresh()]);
        foreach (['option_a', 'option_b'] as $role) {
            $scene = $lesson->scenes()->where('branch_role', $role)->firstOrFail();
            $configurator->call('saveBranchEffects', $scene->id, [
                'deltas' => [$meterKey => $role === 'option_a' ? 10 : -10],
                'consequence_line' => 'A consequence.',
                'branch_choice_label' => 'A choice',
            ]);
        }

        $preview()->call('publish');
        $this->assertSame(LessonStatus::Published, $lesson->fresh()->status);
    }

}
