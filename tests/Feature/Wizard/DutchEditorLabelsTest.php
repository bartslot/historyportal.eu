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
}
