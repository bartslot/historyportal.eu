<?php

declare(strict_types=1);

namespace Tests\Feature\Player;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\SceneArrow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A published lesson with a vector arrow: the player page must carry the arrow to the client, or the
 * class never sees it (the editor draws it, the player must draw the same thing from the same data).
 */
class ArrowPlayerTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_player_page_carries_the_arrow_layer_to_the_client(): void
    {
        $teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id,
            'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::Published,
        ]);
        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'bay.png',
            'shots' => [['order' => 0, 'image_path' => 'bay.png', 'layers' => [
                ['path' => 'bay.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => 9001, 'kind' => 'arrow', 'x' => 20.0, 'y' => 50.0, 'end_x' => 80.0, 'end_y' => 40.0,
                    'bend' => 0.2, 'shaft' => 1.5, 'head' => 6.0, 'arrow_style' => 'block'],
            ]]],
        ]);

        $response = $this->get(route('lesson.play', ['lessonCode' => $lesson->fresh()->lesson_code]));

        $response->assertOk();
        $response->assertSee('"kind":"'.SceneArrow::KIND.'"', false);
        $response->assertSee('"arrow_style":"block"', false);
        $response->assertSee('"asset_id":9001', false);
    }
}
