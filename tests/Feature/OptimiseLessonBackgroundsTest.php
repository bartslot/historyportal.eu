<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OptimiseLessonBackgroundsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_poster_picked_from_a_scene_follows_the_re_encoded_file(): void
    {
        Storage::fake('public');

        $lesson = Lesson::factory()->for(User::factory()->teacher(), 'teacher')->create();
        $path = "lessons/{$lesson->id}/scenes/1/bg.jpg";

        $image = imagecreatetruecolor(640, 360);
        imagefilledrectangle($image, 0, 0, 639, 359, imagecolorallocate($image, 30, 60, 90));
        ob_start();
        imagejpeg($image, null, 100);
        Storage::disk('public')->put($path, (string) ob_get_clean());

        $scene = Scene::create([
            'lesson_id' => $lesson->id,
            'order' => 1,
            'kind' => 'narration',
            'status' => 'ready',
            'image_path' => $path,
            'config' => [],
        ]);
        $lesson->update(['poster_image' => $path]);

        $this->artisan('lessons:optimise-backgrounds', ['--apply' => true, '--min-kb' => 0])->assertSuccessful();

        $newPath = $scene->fresh()->image_path;
        $this->assertNotSame($path, $newPath);
        $this->assertSame($newPath, $lesson->fresh()->poster_image);
        Storage::disk('public')->assertExists($newPath);
    }
}
