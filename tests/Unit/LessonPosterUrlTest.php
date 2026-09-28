<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Lesson;
use PHPUnit\Framework\TestCase;

/** A poster the teacher picked must keep working when the app's address changes. */
class LessonPosterUrlTest extends TestCase
{
    private function poster(string $stored): ?string
    {
        return (new Lesson)->forceFill(['poster_image' => $stored])->posterOverrideUrl();
    }

    public function test_our_own_storage_saved_as_a_full_url_becomes_a_same_site_path(): void
    {
        $this->assertSame('/storage/lessons/41/scenes/400/bg.avif', $this->poster('http://localhost:8000/storage/lessons/41/scenes/400/bg.avif'));
        $this->assertSame('/storage/lessons/7/a.webp', $this->poster('https://thelearningportal.us/storage/lessons/7/a.webp'));
    }

    public function test_images_hosted_elsewhere_are_left_alone(): void
    {
        $cdn = 'https://res.cloudinary.com/x/image/upload/v1/covers/dante.webp';
        $this->assertSame($cdn, $this->poster($cdn));
        $this->assertSame('/storage/lessons/7/a.webp', $this->poster('/storage/lessons/7/a.webp'));
    }
}
