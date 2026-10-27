<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\StrategyGame;
use App\Models\User;
use App\Services\VoyageLessonBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Pair test 2026-10-24: a Dutch teacher still read English in the editor ("Strategy game",
 * "Decision point" in Add a scene, "Gallery" in the object list) and in the player's strategy
 * brief ("Strategy Challenge", "10 minutes").
 */
class DutchEditorLabelsTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_add_a_scene_tiles_and_object_list_rows_are_dutch(): void
    {
        $teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'Tasman', 'subject' => 'history',
            'grade_level' => '9th', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);
        app()->setLocale('nl');

        $html = Livewire::actingAs($teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->html();

        foreach (['Verhaal', 'Strategiespel', 'Debat', 'Kaart', 'Galerij', 'Keuzemoment'] as $dutch) {
            $this->assertStringContainsString(">{$dutch}</span>", $html);
        }
        foreach (['Story', 'Strategy game', 'Debate', 'Map', 'Gallery', 'Decision point'] as $english) {
            $this->assertStringNotContainsString(">{$english}</span>", $html);
        }
        // Object-list rows built in Alpine: never a bare English literal.
        foreach (["label: 'Gallery'", "label: 'Waypoint'", "? 'Slideshow'", "' half'"] as $literal) {
            $this->assertStringNotContainsString($literal, $html);
        }
    }

    public function test_the_strategy_brief_fallback_title_and_duration_follow_the_lesson_language(): void
    {
        app()->setLocale('en');
        $lesson = Lesson::factory()->create([
            'teacher_id' => User::factory()->teacher(),
            'status' => LessonStatus::Published->value,
            'language' => 'nl',
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        $html = $this->withHeader('Accept-Language', 'en')
            ->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))
            ->assertOk()
            ->getContent();

        $this->assertStringContainsString('Strategie-uitdaging', $html);
        $this->assertStringContainsString(':count minuten', $html);
        $this->assertStringNotContainsString("'Strategy Challenge'", $html);
        $this->assertStringNotContainsString("+ ' minutes'", $html);
        $this->assertStringNotContainsString("+ ' teams'", $html);
    }

    /** The html of the scene settings panel for `$scene`, rendered in a Dutch session. */
    private function panelHtml(User $teacher, Lesson $lesson, Scene $scene): string
    {
        app()->setLocale('nl');

        return Livewire::actingAs($teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id)
            ->html();
    }

    /** English that was on screen in the Dutch editor (pair test round 3). */
    private function assertNoEnglish(string $html, array $english): void
    {
        foreach ($english as $text) {
            $this->assertDoesNotMatchRegularExpression('/>\s*'.preg_quote($text, '/').'\s*</u', $html, "\"{$text}\" is still English");
            $this->assertStringNotContainsString('placeholder="'.$text.'"', $html, "placeholder \"{$text}\" is still English");
        }
    }

    private function plainLesson(User $teacher): Lesson
    {
        return Lesson::create([
            'teacher_id' => $teacher->id, 'topic' => 'Caesar', 'subject' => 'history', 'language' => 'nl',
            'grade_level' => '9th', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
    }

    public function test_the_voyage_panel_is_dutch(): void
    {
        $teacher = User::factory()->create();
        $lesson = app(VoyageLessonBuilder::class)->build('columbus-1492', $teacher);
        $scene = $lesson->scenes()->where('kind', 'voyage')->ordered()->get()
            ->first(fn ($s) => empty($s->config['overview']));

        $html = $this->panelHtml($teacher, $lesson, $scene);

        $this->assertMatchesRegularExpression('/>\s*Tussenstop \d+ \/ \d+\s*</u', $html);
        $this->assertNoEnglish($html, [
            // ("Route" is Dutch too, so it is not listed.)
            'Waypoint', 'Map', 'Stop title', 'Dates', 'Travelled by', 'By sea', 'Overland', 'Ship', 'Horse',
            'Gallery / description', 'Projection', 'Flat', 'Globe', 'Visible detail', 'Undiscovered land',
            'Fleet', 'Route line', 'Curved', 'Straight', 'Reset route to original', 'Delete waypoint',
            'or paste an image URL', 'Add image',
        ]);
        $this->assertStringNotContainsString('Waypoint 1 /', $html);
        // Round 4: "0 painted" under Onontdekt land, and hints on `title` instead of data-tooltip.
        $this->assertMatchesRegularExpression('/>\s*\d+ geschilderd\s*</u', $html);
        $this->assertStringNotContainsString(' painted<', $html);
        $this->assertStringContainsString('data-tooltip="Vlieg vanuit de ruimte in', $html);
        $this->assertStringContainsString('data-tooltip="Kleur titels"', $html);
        $this->assertStringNotContainsString('title="Vlieg vanuit', $html);
        $this->assertStringNotContainsString('title="Kleur titels"', $html);
    }

    public function test_the_gallery_map_and_game_panels_are_dutch(): void
    {
        $teacher = User::factory()->create();
        $lesson = $this->plainLesson($teacher);
        $gallery = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'gallery', 'status' => 'ready',
            'config' => ['images' => [['url' => 'https://example.org/a.jpg'], ['url' => 'https://example.org/b.jpg']]]]);
        $map = Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'map', 'status' => 'ready']);
        $quiz = Scene::create(['lesson_id' => $lesson->id, 'order' => 3, 'kind' => 'game', 'game_type' => 'quiz', 'status' => 'ready']);
        $debate = Scene::create(['lesson_id' => $lesson->id, 'order' => 4, 'kind' => 'game', 'game_type' => 'debate', 'status' => 'ready']);

        $galleryHtml = $this->panelHtml($teacher, $lesson, $gallery);
        $this->assertNoEnglish($galleryHtml, ['Cover', 'Fit', 'Add image', 'or paste an image URL']);
        foreach (['Sleep om te ordenen', 'Verwijderen', 'Omhoog', 'Omlaag'] as $hint) {
            $this->assertStringContainsString('data-tooltip="'.$hint.'"', $galleryHtml);
            $this->assertStringNotContainsString(' title="'.$hint.'"', $galleryHtml);
        }
        $this->assertNoEnglish($this->panelHtml($teacher, $lesson, $map), [
            'Map block', 'Shows the territory on the historical map, fit to its borders at the chosen year.',
            "Negative = BCE. Sets the map's time slider.", 'or drop a pin on the map',
        ]);

        $quizHtml = $this->panelHtml($teacher, $lesson, $quiz);
        $this->assertStringContainsString('>Quizscène</h3>', $quizHtml);
        $this->assertStringNotContainsString(' Scene</h3>', $quizHtml);
        $this->assertNoEnglish($quizHtml, ['Add question', 'Spoken intro']);
        $this->assertStringNotContainsString('(optional — narrated before the quiz)', $quizHtml);

        $debateHtml = $this->panelHtml($teacher, $lesson, $debate);
        $this->assertStringContainsString('>Debatscène</h3>', $debateHtml);
        $this->assertNoEnglish($debateHtml, ['Debate prompt']);
    }

    private function rubicon(): StrategyGame
    {
        return StrategyGame::create([
            'slug' => 'rubicon', 'title' => 'Cross the Rubicon', 'description' => 'Caesar at the river.', 'subject' => 'history',
            'topic_keywords' => ['caesar'], 'grade_min' => 1, 'grade_max' => 12,
            'team_size_min' => 2, 'team_size_max' => 4, 'duration_minutes' => 8,
            'instructions' => 'Decide as a team.', 'is_active' => true,
        ]);
    }

    /** Demo risk: a new Strategiespel scene arrived with "Cross the Rubicon" already chosen. */
    public function test_a_new_strategy_scene_starts_with_no_game_chosen(): void
    {
        $this->rubicon();
        $teacher = User::factory()->create();
        $lesson = $this->plainLesson($teacher);
        $lesson->update(['language' => 'en']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        $html = Livewire::actingAs($teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('addScene', 'game', 'strategy')
            ->html();

        $scene = $lesson->scenes()->where('game_type', 'strategy')->sole();
        $this->assertNull($scene->strategy_game_id);
        // Offered (the lesson is English), never preselected.
        $this->assertStringContainsString('Cross the Rubicon', $html);
        $this->assertDoesNotMatchRegularExpression('/<option[^>]*selected[^>]*>\s*Cross the Rubicon/', $html);
    }

    /** A Dutch class never meets the English Caesar card unasked: not in the editor, not in the player. */
    public function test_a_dutch_lesson_is_offered_no_english_strategy_game(): void
    {
        $game = $this->rubicon();
        $teacher = User::factory()->create();
        $lesson = $this->plainLesson($teacher);
        $strategy = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'game', 'game_type' => 'strategy', 'status' => 'ready']);

        $html = $this->panelHtml($teacher, $lesson, $strategy);
        $this->assertStringNotContainsString('Cross the Rubicon', $html);
        $this->assertStringContainsString('data-no-strategy-games', $html);

        // The player neither matches it nor shows one pinned before games had a language.
        $lesson->update(['status' => LessonStatus::Published->value]);
        $player = fn () => $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();
        $this->assertStringNotContainsString('Cross the Rubicon', $player());
        $this->assertNull($lesson->fresh()->strategy_game_id);

        $lesson->update(['strategy_game_id' => $game->id]);
        $this->assertStringNotContainsString('Cross the Rubicon', $player());
    }
}
