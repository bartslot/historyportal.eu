<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\LessonTypes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-10-17 on lesson 63 (banner): "lestype does nothing". Since the calm title screen
 * (2cc82674, 2026-10-15) the lesson-type labels stand in "About this lesson" below the title,
 * in every style, while their switch stayed in the title screen's panel, where the stage never
 * shows them. The switch now lives with what it changes, previews its labels, and is not there
 * for a lesson that has none.
 */
class LessonTypeLabelsTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    /** Like lesson 63: a comic scene with a character's line and a team game. */
    private function lesson(bool $withTypes = true, array $extra = []): Lesson
    {
        $lesson = Lesson::create($extra + [
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman: De reis', 'topic' => 'X', 'subject' => 'history',
            'grade_level' => '9th', 'language' => 'nl', 'image_style' => 'cinematic', 'status' => LessonStatus::Published,
            'translation_group' => 'tasman-standard', 'title_style' => 'banner',
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready',
            'config' => $withTypes ? ['lines' => [['speaker' => 'tasman', 'text' => 'Land!']]] : null]);
        if ($withTypes) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'game', 'game_type' => 'team', 'status' => 'ready']);
        }

        return $lesson;
    }

    public function test_c_a_lesson_like_63_has_its_types(): void
    {
        $this->assertSame([LessonTypes::INTERACTIVE, LessonTypes::COMIC, LessonTypes::TEAMS], LessonTypes::of($this->lesson()));
        $this->assertSame([], LessonTypes::of($this->lesson(false)));
    }

    public function test_b_the_player_shows_them_in_about_this_lesson_in_every_style_and_hides_them_when_off(): void
    {
        foreach (['poster', 'banner', 'cover', 'logo', 'plain'] as $style) {
            $lesson = $this->lesson(true, ['title_style' => $style]);
            $html = $this->get(route('lesson.play', $lesson->lesson_code))->assertOk()->getContent();
            $this->assertStringContainsString('data-lesson-types', $html, $style);
            $this->assertGreaterThan(strpos($html, 'data-title-about'), strpos($html, 'data-lesson-types'), "{$style}: in About this lesson");

            $lesson->update(['show_lesson_types' => false]);
            $this->assertStringNotContainsString('data-lesson-types ', $this->get(route('lesson.play', $lesson->lesson_code))->getContent(), "{$style}: off");
        }
    }

    public function test_a_the_switch_lives_in_the_lesson_panel_with_its_labels_and_changes_them_at_once(): void
    {
        $lesson = $this->lesson();
        $component = Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $this->assertStringNotContainsString('data-lesson-types-toggle', $component->html(), 'not in the title screen panel');

        $component->call('openSettings');
        $html = $component->html();
        $this->assertStringContainsString('data-lesson-types-setting', $html);
        $this->assertMatchesRegularExpression('#data-lesson-types-preview="on"#', $html);
        $this->assertSame(3, substr_count($html, 'data-type-chip='));

        $component->call('setShowLessonTypes', false);
        $this->assertFalse($lesson->fresh()->show_lesson_types);
        $this->assertMatchesRegularExpression('#data-lesson-types-preview="off"#', $component->html());
    }

    public function test_no_switch_for_a_lesson_without_types(): void
    {
        Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson(false)])
            ->call('openSettings')
            ->assertDontSee('data-lesson-types-setting', false);
    }
}
