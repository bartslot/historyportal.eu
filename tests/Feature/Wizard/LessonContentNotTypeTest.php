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
 * Bart 2026-11-17: "the lesson should always be a voyage lesson, game lesson, branching story lesson".
 * The editor offers every kind in every lesson and never rewrites the type or arc a lesson was born with.
 */
class LessonContentNotTypeTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.cloudinary.url' => null]);
        $this->teacher = User::factory()->create();
    }

    private function lesson(array $attrs = []): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'The Dutch Revolt', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
            ...$attrs,
        ]);
        foreach (['Opening.', 'Middle.', 'End.'] as $i => $text) {
            Scene::create([
                'lesson_id' => $lesson->id, 'order' => $i + 1, 'kind' => 'narration',
                'script_segment' => $text, 'status' => 'ready',
            ]);
        }

        return $lesson;
    }

    private function voyageLesson(): Lesson
    {
        $lesson = $this->lesson(['game_type' => 'voyage', 'game_config' => ['voyage' => 'tasman-1642']]);
        $lesson->scenes()->forceDelete();
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'voyage', 'status' => 'ready',
            'config' => ['voyage' => 'tasman-1642', 'leg' => 0, 'view' => 'flat']]);

        return $lesson->fresh();
    }

    private function editor(Lesson $lesson)
    {
        return Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson->fresh()]);
    }

    /** A Decision point as the generator writes it: the editor adds choices as a layer now (EditsSceneLinks). */
    private function decisionPoint(Lesson $lesson): void
    {
        $next = (int) $lesson->scenes()->max('order') + 1;
        foreach (['question' => null, 'option_a' => 'First choice', 'option_b' => 'Second choice'] as $role => $label) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => $next++, 'kind' => 'narration', 'status' => 'pending',
                'branch_group' => 1, 'branch_role' => $role, 'branch_choice_label' => $label]);
        }
    }

    public function test_a_voyage_lesson_takes_a_decision_point(): void
    {
        $lesson = $this->voyageLesson();

        // Add > Choices: a layer on the scene, so the voyage keeps its scenes and its type
        $before = $lesson->scenes()->count();
        $this->editor($lesson)->call('addScene', 'branch');

        $this->assertSame($before, $lesson->scenes()->count());
        $this->assertSame('voyage', $lesson->fresh()->game_type);
    }

    public function test_a_voyage_lesson_takes_a_3d_scene(): void
    {
        $lesson = $this->voyageLesson();
        $editor = $this->editor($lesson);
        if ($editor->instance()->eraStageBundle === null) {
            $this->markTestSkipped('No painted stage bundle on this machine.');
        }

        $editor->call('addScene', 'stage25d');

        $this->assertSame(1, $lesson->scenes()->where('kind', 'stage25d')->count());
    }

    public function test_a_plain_lesson_with_a_voyage_takes_another_route_leg(): void
    {
        $lesson = $this->lesson();
        $this->editor($lesson)->call('insertVoyage', 'tasman-1642');
        $legs = $lesson->scenes()->where('kind', 'voyage')->count();

        $last = $lesson->scenes()->where('kind', 'voyage')->ordered()->get()->last();
        $this->editor($lesson)->set('selectedSceneId', $last->id)->call('selectScene', $last->id)->call('addScene', 'voyage');

        $this->assertSame($legs + 1, $lesson->scenes()->where('kind', 'voyage')->count());
    }

    public function test_the_add_scene_menu_offers_voyage_and_3d_in_every_lesson_and_choices_are_a_layer(): void
    {
        foreach ([$this->lesson(), $this->voyageLesson()] as $lesson) {
            $editor = $this->editor($lesson)->set('addSceneOpen', true);
            $editor->assertDontSeeHtml("addScene('branch')")->assertSeeHtml('data-add-choices');
            if ($editor->instance()->eraStageBundle !== null) {
                $editor->assertSeeHtml('data-add-stage25d');
            }
        }
        $this->editor($this->lesson())->set('addSceneOpen', true)
            ->assertSeeHtml('data-add-voyage')->assertSeeHtml('data-insert-voyage')->assertDontSeeHtml('data-add-voyage-leg');
    }

    /** One voyage per lesson: once it sails, the same Voyage tile adds a leg or the overview. Nothing is shown switched off (Bart 2026-11-19). */
    public function test_a_lesson_that_sails_offers_a_next_leg_and_the_whole_voyage_under_one_tile(): void
    {
        $this->editor($this->voyageLesson())->set('addSceneOpen', true)
            ->assertSeeHtml('data-add-voyage')
            ->assertSeeHtml('data-add-voyage-leg')
            ->assertSeeHtml('data-add-voyage-overview')
            ->assertDontSeeHtml('data-insert-voyage')
            ->assertDontSeeHtml('aria-disabled="true"');
    }

    public function test_adding_a_decision_point_leaves_the_type_arc_and_meters_alone(): void
    {
        $lesson = $this->lesson(['game_type' => 'quiz', 'include_game' => true, 'narrative_framework' => 'heros_journey']);

        $this->decisionPoint($lesson);
        $fresh = $lesson->fresh();

        $this->assertSame('quiz', $fresh->game_type);
        $this->assertSame('heros_journey', $fresh->narrative_framework->value);
        $this->assertFalse($fresh->hasMeters());
        $this->assertTrue($fresh->hasChoices());
    }

    public function test_adding_a_game_scene_never_names_the_lessons_game_type(): void
    {
        $lesson = $this->lesson();

        $this->editor($lesson)->call('addScene', 'game', 'strategy');

        $this->assertNull($lesson->fresh()->game_type);
        $this->assertSame('strategy', $lesson->scenes()->where('kind', 'game')->value('game_type'));
    }

    public function test_a_game_scene_added_without_a_type_is_a_quiz_whatever_the_lesson_was(): void
    {
        $lesson = $this->lesson(['game_type' => 'debate']);

        $this->editor($lesson)->call('addScene', 'game');

        $this->assertSame('quiz', $lesson->scenes()->where('kind', 'game')->value('game_type'));
        $this->assertSame('debate', $lesson->fresh()->game_type);
    }

    public function test_choices_get_the_effects_panel_and_meters_only_when_the_teacher_adds_them(): void
    {
        $lesson = $this->lesson();
        $this->decisionPoint($lesson);
        $option = $lesson->scenes()->where('branch_role', 'option_a')->firstOrFail();

        $editor = $this->editor($lesson);
        $this->assertTrue($editor->instance()->showsGameEffectsPanel($option));
        $this->assertFalse($editor->instance()->showsMetersPanel());
        $this->assertSame([], $lesson->fresh()->incompleteStoryGameGroups());

        $editor->call('addStoryMeters');
        $this->assertTrue($lesson->fresh()->hasMeters());
        $this->assertTrue($editor->instance()->showsMetersPanel());
        $this->assertSame([1], $lesson->fresh()->incompleteStoryGameGroups());

        $editor->call('removeStoryMeters');
        $this->assertFalse($lesson->fresh()->hasMeters());
    }

    public function test_class_meters_need_a_decision_point(): void
    {
        $lesson = $this->lesson();

        $this->editor($lesson)->call('addStoryMeters');

        $this->assertFalse($lesson->fresh()->hasMeters());
    }

    public function test_a_voyage_inserts_its_route_into_a_story_lesson_at_the_chosen_spot(): void
    {
        $lesson = $this->lesson(['game_type' => 'quiz', 'narrative_framework' => 'heros_journey']);
        $opening = $lesson->scenes()->ordered()->first();

        $this->editor($lesson)
            ->call('openAddSceneAfter', $opening->id)
            ->call('insertVoyage', 'tasman-1642')
            ->assertRedirect();

        $kinds = $lesson->scenes()->ordered()->get();
        $this->assertSame('Opening.', $kinds->first()->script_segment);
        $this->assertSame('End.', $kinds->last()->script_segment);
        $voyage = $kinds->slice(1, $kinds->count() - 3)->values();
        $this->assertNotEmpty($voyage);
        $this->assertTrue($voyage->every(fn (Scene $s) => $s->kind === 'voyage' && $s->config['voyage'] === 'tasman-1642'));
        $this->assertTrue((bool) ($voyage->first()->config['overview'] ?? false));
        $this->assertSame('Middle.', $kinds[$kinds->count() - 2]->script_segment);

        $fresh = $lesson->fresh();
        $this->assertSame('quiz', $fresh->game_type);
        $this->assertNotEmpty($fresh->game_config['voyage_defs']['tasman-1642']['legs'] ?? null);
        $this->assertTrue($fresh->hasVoyage());
    }

    /** PM 11-17: one voyage per lesson, so the structure stays easy to read. */
    public function test_a_lesson_refuses_a_second_voyage(): void
    {
        $lesson = $this->lesson();
        $this->editor($lesson)->call('insertVoyage', 'columbus-1492');
        $count = $lesson->scenes()->count();

        $this->editor($lesson)->call('insertVoyage', 'magellan-1519')
            ->assertDispatched('toast', type: 'error', message: __('A lesson sails one voyage. Delete its voyage scenes first to sail another.'));

        $this->assertSame($count, $lesson->scenes()->count());
        $this->assertSame(['columbus-1492'], array_keys($lesson->fresh()->game_config['voyage_defs'] ?? []));
    }

    /** One Cmd-Z on the landing scene takes the whole insert back: every scene and the route. */
    public function test_one_undo_takes_an_inserted_voyage_back(): void
    {
        $lesson = $this->lesson(['game_config' => ['meters' => [['key' => 'food', 'label' => 'Food', 'start' => 50]]]]);
        $before = $lesson->scenes()->ordered()->pluck('id')->all();
        $this->editor($lesson)->call('openAddSceneAfter', $before[0])->call('insertVoyage', 'tasman-1642');
        $landing = $lesson->scenes()->where('kind', 'voyage')->ordered()->first();

        // The insert reloads the editor on its landing scene: a fresh component, as in the browser.
        $this->editor($lesson)->call('selectScene', $landing->id)->call('undoLastEdit')
            ->assertDispatched('toast', type: 'info', message: __('Voyage taken back.'));

        $fresh = $lesson->fresh();
        $this->assertSame($before, $fresh->scenes()->ordered()->pluck('id')->all());
        $this->assertSame([1, 2, 3], $fresh->scenes()->ordered()->pluck('order')->map(fn ($o) => (int) $o)->all());
        $this->assertFalse($fresh->hasVoyage());
        $this->assertArrayNotHasKey('voyage_defs', $fresh->game_config ?? []);
        $this->assertArrayNotHasKey('voyage_fog', $fresh->game_config ?? []);
        $this->assertTrue($fresh->hasMeters(), 'the rest of game_config stays');
        $this->assertSame(0, Scene::withTrashed()->where('lesson_id', $lesson->id)->where('kind', 'voyage')->count());
    }

    public function test_a_route_edit_after_the_insert_is_undone_before_the_insert(): void
    {
        $lesson = $this->lesson();
        $this->editor($lesson)->call('insertVoyage', 'tasman-1642');
        $landing = $lesson->scenes()->where('kind', 'voyage')->ordered()->first();
        $gc = $lesson->fresh()->game_config;
        $lesson->update(['game_config' => $gc + ['voyage_undo' => [null]]]);   // one route edit on the stack

        $this->editor($lesson)->call('selectScene', $landing->id)->call('undoLastEdit');

        $this->assertTrue($lesson->fresh()->hasVoyage(), 'the first Cmd-Z takes back the route edit');
        $this->editor($lesson)->call('selectScene', $landing->id)->call('undoLastEdit');
        $this->assertFalse($lesson->fresh()->hasVoyage(), 'the next one takes back the insert');
    }

    public function test_a_newer_structural_edit_drops_the_voyage_undo(): void
    {
        $lesson = $this->lesson();
        $this->editor($lesson)->call('insertVoyage', 'tasman-1642');
        $landing = $lesson->scenes()->where('kind', 'voyage')->ordered()->first();

        $this->editor($lesson)->call('selectScene', $landing->id)->call('addScene', 'gallery')
            ->call('selectScene', $landing->id)->call('undoLastEdit');

        $this->assertTrue($lesson->fresh()->hasVoyage());
    }

    public function test_the_same_voyage_is_not_inserted_twice(): void
    {
        $lesson = $this->lesson();
        $this->editor($lesson)->call('insertVoyage', 'tasman-1642');
        $count = $lesson->scenes()->count();

        $this->editor($lesson)->call('insertVoyage', 'tasman-1642');

        $this->assertSame($count, $lesson->scenes()->count());
    }

    public function test_an_unknown_voyage_inserts_nothing(): void
    {
        $lesson = $this->lesson();

        $this->editor($lesson)->call('insertVoyage', 'not-a-voyage');

        $this->assertSame(3, $lesson->scenes()->count());
    }

    /** Two voyages in one lesson legitimately reuse leg numbers: the legacy repair must not touch them. */
    public function test_the_unique_leg_repair_counts_legs_per_voyage(): void
    {
        $lesson = $this->lesson();
        $lesson->scenes()->forceDelete();
        foreach ([['tasman-1642', 0], ['tasman-1644', 0]] as $i => [$voyage, $leg]) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => $i + 1, 'kind' => 'voyage', 'status' => 'ready',
                'config' => ['voyage' => $voyage, 'leg' => $leg, 'view' => 'flat']]);
        }

        $this->editor($lesson);

        $this->assertSame([0, 0], $lesson->scenes()->ordered()->get()->map(fn (Scene $s) => (int) $s->config['leg'])->all());
    }
}
