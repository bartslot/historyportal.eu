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

    public function test_a_voyage_lesson_takes_a_decision_point(): void
    {
        $lesson = $this->voyageLesson();

        $this->editor($lesson)->call('addScene', 'branch');

        $this->assertSame(3, $lesson->scenes()->whereNotNull('branch_role')->count());
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

    public function test_the_add_scene_menu_offers_voyage_decision_point_and_3d_in_every_lesson(): void
    {
        foreach ([$this->lesson(), $this->voyageLesson()] as $lesson) {
            $editor = $this->editor($lesson)->set('addSceneOpen', true);
            $editor->assertSeeHtml('data-add-voyage')->assertSeeHtml("addScene('branch')");
            if ($editor->instance()->eraStageBundle !== null) {
                $editor->assertSeeHtml('data-add-stage25d');
            }
        }
    }

    public function test_adding_a_decision_point_leaves_the_type_arc_and_meters_alone(): void
    {
        $lesson = $this->lesson(['game_type' => 'quiz', 'include_game' => true, 'narrative_framework' => 'heros_journey']);

        $this->editor($lesson)->call('addScene', 'branch');
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
        $this->editor($lesson)->call('addScene', 'branch');
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

    public function test_two_voyages_coexist_in_one_lesson_each_with_its_own_route(): void
    {
        $lesson = $this->lesson();

        $this->editor($lesson)->call('insertVoyage', 'tasman-1642');
        $this->editor($lesson)->call('insertVoyage', 'columbus-1492');

        $defs = $lesson->fresh()->game_config['voyage_defs'] ?? [];
        $this->assertArrayHasKey('tasman-1642', $defs);
        $this->assertArrayHasKey('columbus-1492', $defs);
        $this->assertSame(
            ['columbus-1492', 'tasman-1642'],
            $lesson->scenes()->where('kind', 'voyage')->get()->pluck('config.voyage')->unique()->sort()->values()->all(),
        );
    }

    public function test_a_voyage_already_in_the_lesson_is_not_inserted_twice(): void
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
