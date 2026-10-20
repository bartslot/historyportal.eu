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
 * Infra audit 2026-10-17 (opus.7): prod sent no security headers, so a teacher's dashboard could be
 * framed by another site (clickjacking on Publish or buying credits) and a first plain-http visit on
 * school wifi could be downgraded.
 */
class SecurityHeadersTest extends TestCase
{
    use RefreshDatabase;

    public function test_pages_send_the_security_headers(): void
    {
        $this->withoutVite();

        $this->get('/login')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    }

    public function test_the_lesson_player_may_be_embedded_in_another_site(): void
    {
        // Teachers put the player in their LMS, which is a cross-site iframe.
        $lesson = Lesson::factory()->for(User::factory()->teacher(), 'teacher')->create(['status' => LessonStatus::Published]);
        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'audio_path' => "lessons/{$lesson->id}/scenes/1/audio.mp3", 'config' => [],
        ]);

        $response = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]));

        $response->assertOk()->assertHeaderMissing('X-Frame-Options');
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
    }
}
