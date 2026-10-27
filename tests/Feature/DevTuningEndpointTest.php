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
 * Error scan 2026-10-18: every anonymous page view on prod asked for /dev/tuning (404), a route
 * that exists only on a local install. The page names the endpoint only where it exists
 * (<meta name="dev-tuning">), and resources/js/dev/tuner.js asks only then.
 */
class DevTuningEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_no_page_outside_a_local_install_names_the_presets_endpoint(): void
    {
        $lesson = Lesson::create(['teacher_id' => User::factory()->create()->id, 'title' => 'X', 'topic' => 'X', 'subject' => 'history',
            'grade_level' => '9th', 'status' => LessonStatus::Published]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready', 'audio_path' => 'a.mp3']);

        $this->assertFalse(\Illuminate\Support\Facades\Route::has('dev.tuning.index'), 'the route exists only locally');
        foreach (['/', route('lesson.play', $lesson->lesson_code)] as $url) {
            $this->get($url)->assertOk()->assertDontSee('name="dev-tuning"', false);
        }
    }
}
