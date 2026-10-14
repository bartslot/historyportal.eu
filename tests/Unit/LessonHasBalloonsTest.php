<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Database\Eloquent\Collection;
use Tests\TestCase;

/** The player preloads the balloon font only for a lesson whose scenes carry balloon lines. */
class LessonHasBalloonsTest extends TestCase
{
    private function lessonWith(array ...$configs): Lesson
    {
        $lesson = new Lesson;
        $lesson->setRelation('scenes', new Collection(array_map(fn (array $c) => new Scene(['config' => $c]), $configs)));

        return $lesson;
    }

    public function test_a_scene_with_lines_means_balloons(): void
    {
        $this->assertTrue($this->lessonWith([], ['lines' => [['text' => 'Wat betekent dat?']]])->hasBalloons());
    }

    public function test_no_lines_or_empty_lines_means_no_balloons(): void
    {
        $this->assertFalse($this->lessonWith([], ['lines' => []], ['title' => 'x'])->hasBalloons());
        $this->assertFalse($this->lessonWith()->hasBalloons());
    }
}
