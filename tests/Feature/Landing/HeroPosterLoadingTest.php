<?php

declare(strict_types=1);

namespace Tests\Feature\Landing;

use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The hero poster is above the fold: it loads at once, never lazily. Carousel posters further down
 * stay lazy (pair test 2026-10-24). Not high priority: the demo hides it until the end, and on
 * mobile it starved the sprite sheets the demo waits on (PageSpeed 2026-11-04).
 */
class HeroPosterLoadingTest extends TestCase
{
    use RefreshDatabase;

    private function card(bool $bare): string
    {
        $lesson = Lesson::factory()->create([
            'teacher_id' => User::factory()->teacher(),
            'title_bg_path' => 'https://res.cloudinary.com/demo/image/upload/poster.jpg',
        ]);

        return (string) $this->blade('<x-lesson-poster-card :lesson="$lesson" :bare="$bare" />', compact('lesson', 'bare'));
    }

    public function test_the_hero_poster_loads_eagerly_without_jumping_the_queue(): void
    {
        $html = $this->card(true);

        $this->assertStringContainsString('loading="eager"', $html);
        $this->assertStringNotContainsString('fetchpriority', $html);
    }

    public function test_a_carousel_poster_stays_lazy(): void
    {
        $html = $this->card(false);

        $this->assertStringContainsString('loading="lazy"', $html);
        $this->assertStringNotContainsString('fetchpriority', $html);
    }
}
