<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The title screen's bottom rail at 390 px (pair test 2026-10-24): "Start de les" wrapped onto two
 * lines and a second chevron stood beside the language's own caret. The measured layout is checked
 * in tests/playwright/title-screen-layout.spec.ts; this guards the markup.
 */
class LessonPlayerTitleRailTest extends TestCase
{
    use RefreshDatabase;

    public function test_start_never_wraps_and_no_second_chevron_stands_in_the_rail(): void
    {
        $lesson = Lesson::factory()->create([
            'teacher_id' => User::factory()->teacher(),
            'status' => LessonStatus::Published->value,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $this->assertStringNotContainsString('data-title-piece="chevron"', $html);
        $this->assertMatchesRegularExpression('/@click="startLesson\(\)" data-title-rail-item\s+class="[^"]*whitespace-nowrap/', $html);
    }
}
