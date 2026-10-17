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
 * The lesson-type badges on the title screen: each is shown only when true of the lesson's scenes
 * (LessonTypes, the one place the rules live), in every language, and the teacher can hide them.
 */
class LessonTypesTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    /** @param list<array<string, mixed>> $scenes */
    private function lesson(array $scenes, array $extra = []): Lesson
    {
        $lesson = Lesson::create($extra + [
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman: De reis', 'topic' => 'X', 'subject' => 'history',
            'grade_level' => '9th', 'language' => 'nl', 'image_style' => 'cinematic', 'status' => LessonStatus::Published,
            'include_game' => false,
        ]);
        foreach ($scenes as $i => $scene) {
            Scene::create($scene + ['lesson_id' => $lesson->id, 'order' => $i + 1, 'kind' => 'narration', 'status' => 'ready']);
        }

        return $lesson;
    }

    private function moment(array $extra = []): array
    {
        return ['config' => ['moment' => $extra + ['enabled' => true, 'teams' => 0, 'race' => ['enabled' => false]]]];
    }

    public function test_a_plain_narrated_lesson_has_no_badge(): void
    {
        $this->assertSame([], LessonTypes::of($this->lesson([['script_segment' => 'Eens.'], ['config' => ['lines' => [['speaker' => 'narrator', 'text' => 'Eens.']]]]])));
    }

    public function test_interactive_is_any_game_story_game_or_switched_on_moment(): void
    {
        $this->assertSame(['interactive'], LessonTypes::of($this->lesson([['kind' => 'game', 'game_type' => 'quiz']])));
        $this->assertSame(['interactive'], LessonTypes::of($this->lesson([$this->moment()])));
        $this->assertSame([], LessonTypes::of($this->lesson([$this->moment(['enabled' => false])])));
        $this->assertSame(['interactive'], LessonTypes::of($this->lesson([['script_segment' => 'Eens.']], ['game_type' => 'story_game'])));
    }

    public function test_a_slideshow_of_voyage_legs_galleries_and_stories_is_not_interactive(): void
    {
        $lesson = $this->lesson([
            ['kind' => 'voyage', 'config' => ['voyage' => 'tasman-1642', 'leg' => 1]],
            ['kind' => 'gallery', 'config' => ['images' => [['url' => '/a.webp'], ['url' => '/b.webp']]]],
            ['script_segment' => 'Eens.'],
            ['kind' => 'video', 'config' => ['bg_embed' => ['src' => 'https://www.youtube.com/embed/x']]],
        ], ['game_type' => 'voyage']);

        $this->assertSame([], LessonTypes::of($lesson));
    }

    public function test_an_older_lessons_closing_quiz_is_interactive(): void
    {
        $lesson = $this->lesson([['script_segment' => 'Eens.']], ['include_game' => true, 'game_type' => 'quiz']);
        $this->assertSame([], LessonTypes::of($lesson));

        $lesson->quizQuestions()->create(['order' => 0, 'question' => 'Wie?', 'options' => ['A', 'B'], 'correct_index' => 0, 'points' => 10]);
        $this->assertSame(['interactive'], LessonTypes::of($lesson->fresh()));
    }

    public function test_comic_is_a_speech_balloon_never_a_narrator_line(): void
    {
        $lines = [['speaker' => 'narrator', 'text' => 'Hij keek.'], ['speaker' => 'tasman', 'text' => 'Land!']];

        $this->assertSame(['comic'], LessonTypes::of($this->lesson([['config' => ['lines' => $lines]]])));
    }

    public function test_teams_is_a_team_game_or_a_moment_with_teams_or_a_race(): void
    {
        $this->assertSame(['interactive', 'teams'], LessonTypes::of($this->lesson([['kind' => 'game', 'game_type' => 'team']])));
        $this->assertSame(['interactive', 'teams'], LessonTypes::of($this->lesson([$this->moment(['teams' => 3])])));
        $this->assertSame(['interactive', 'teams'], LessonTypes::of($this->lesson([$this->moment(['race' => ['enabled' => true]])])));
        $this->assertSame(['interactive'], LessonTypes::of($this->lesson([['kind' => 'game', 'game_type' => 'quiz'], $this->moment()])));
    }

    public function test_the_title_screen_shows_the_true_badges_in_the_lessons_language_and_the_teacher_can_hide_them(): void
    {
        $lesson = $this->lesson([
            ['config' => ['lines' => [['speaker' => 'tasman', 'text' => 'Land!']]]],
            ['kind' => 'game', 'game_type' => 'team'],
        ]);
        $play = fn () => $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $html = $play();
        $this->assertStringContainsString('data-lesson-types', $html);
        $this->assertStringContainsString('"lesson_types":["interactive","comic","teams"]', $html);
        foreach (['Interactief', 'Stripverhaal', 'Teams'] as $label) {
            $this->assertStringContainsString("<span>{$label}</span>", $html);
        }
        $this->assertStringContainsString('images/lesson-types/comic.svg', $html);

        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('openSettings')   // with "About this lesson", where the labels are (LessonTypeLabelsTest)
            ->assertSee('data-lesson-types-toggle', false)
            ->assertDontSee('data-lesson-types-reset', false);
        $before = $component->get('titleFrameSrc');
        $component->call('setShowLessonTypes', false);
        $this->assertFalse($lesson->fresh()->show_lesson_types);
        $this->assertNotSame($before, $component->get('titleFrameSrc'));
        $component->assertSee('data-lesson-types-reset', false);
        $this->assertStringNotContainsString('data-lesson-types ', $play());
        $this->assertStringContainsString('"lesson_types":[]', $play());

        $component->call('setShowLessonTypes', true);
        $this->assertTrue($lesson->fresh()->show_lesson_types);
    }

    public function test_every_badge_label_is_translated(): void
    {
        $expected = [
            'nl' => ['Interactief', 'Stripverhaal', 'Teams'],
            'de' => ['Interaktiv', 'Comic', 'Teams'],
            'fr' => ['Interactif', 'BD', 'Équipes'],
            'it' => ['Interattivo', 'Fumetto', 'Squadre'],
        ];
        foreach ($expected as $locale => $labels) {
            app()->setLocale($locale);
            $this->assertSame($labels, [__('Interactive'), __('Comic story'), __('Teams')], $locale);
        }
    }
}
