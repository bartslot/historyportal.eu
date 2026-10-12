<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Lesson;
use App\Models\Scene;
use Tests\TestCase;

class SceneTimelineSecondsTest extends TestCase
{
    private function scene(array $attributes): Scene
    {
        return new Scene($attributes);
    }

    public function test_a_narrated_scene_shows_its_exact_length(): void
    {
        $timeline = $this->scene(['kind' => 'narration', 'duration_seconds' => 42])->timelineSeconds();

        $this->assertSame(['seconds' => 42, 'estimated' => false, 'type' => 'narration'], $timeline);
    }

    public function test_a_narrated_scene_without_a_length_is_estimated_from_its_words(): void
    {
        $script = implode(' ', array_fill(0, 50, 'woord'));

        $timeline = $this->scene(['kind' => 'narration', 'script_segment' => $script])->timelineSeconds();

        $this->assertSame(20, $timeline['seconds']);
        $this->assertTrue($timeline['estimated']);
    }

    public function test_a_quiz_takes_the_duration_the_teacher_set_on_it(): void
    {
        $timeline = $this->scene(['kind' => 'game', 'game_type' => 'quiz', 'quiz_question_count' => 4, 'duration_seconds' => 240])
            ->timelineSeconds();

        $this->assertSame(['seconds' => 240, 'estimated' => true, 'type' => 'quiz'], $timeline);
    }

    public function test_a_quiz_without_a_duration_is_estimated_per_question(): void
    {
        $timeline = $this->scene(['kind' => 'game', 'game_type' => 'quiz', 'quiz_question_count' => 4])->timelineSeconds();

        $this->assertSame(120, $timeline['seconds']);
    }

    public function test_a_teacher_estimate_wins_over_the_default(): void
    {
        $timeline = $this->scene(['kind' => 'gallery', 'duration_seconds' => 30, 'config' => ['estimate_seconds' => 300]])
            ->timelineSeconds();

        $this->assertSame(300, $timeline['seconds']);
        $this->assertTrue($timeline['estimated']);
    }

    public function test_a_strategy_game_takes_its_timer(): void
    {
        $timeline = $this->scene(['kind' => 'game', 'game_type' => 'strategy', 'duration_seconds' => 900])->timelineSeconds();

        $this->assertSame(['seconds' => 900, 'estimated' => true, 'type' => 'game'], $timeline);
    }

    public function test_an_interactive_map_waits_on_the_student_so_it_is_estimated(): void
    {
        $short = $this->scene(['kind' => 'map', 'duration_seconds' => 24, 'config' => ['playback_mode' => 'interactive']])->timelineSeconds();
        $long = $this->scene(['kind' => 'map', 'duration_seconds' => 95])->timelineSeconds();

        $this->assertSame(['seconds' => 60, 'estimated' => true, 'type' => 'map'], $short);
        $this->assertSame(95, $long['seconds']);
    }

    public function test_a_timed_map_plays_itself_out_so_it_is_exact(): void
    {
        $timeline = $this->scene(['kind' => 'map', 'duration_seconds' => 24, 'config' => ['playback_mode' => 'timed']])->timelineSeconds();

        $this->assertSame(['seconds' => 24, 'estimated' => false, 'type' => 'map'], $timeline);
    }

    public function test_only_scenes_that_wait_on_the_student_take_a_teacher_estimate(): void
    {
        $this->assertTrue($this->scene(['kind' => 'video'])->takesTeacherEstimate());
        $this->assertTrue($this->scene(['kind' => 'map'])->takesTeacherEstimate());
        $this->assertFalse($this->scene(['kind' => 'map', 'config' => ['playback_mode' => 'timed']])->takesTeacherEstimate());
        // A game already has its own duration field in the editor; it does not get a second one.
        $this->assertFalse($this->scene(['kind' => 'game', 'game_type' => 'quiz'])->takesTeacherEstimate());
        $this->assertFalse($this->scene(['kind' => 'narration'])->takesTeacherEstimate());
    }

    public function test_a_lesson_rounds_its_total_up_to_whole_minutes(): void
    {
        $lesson = new Lesson;
        $lesson->setRelation('scenes', collect([
            $this->scene(['kind' => 'narration', 'duration_seconds' => 100]),
            $this->scene(['kind' => 'game', 'game_type' => 'quiz', 'quiz_question_count' => 3]),
        ]));

        $this->assertSame(4, $lesson->estimatedMinutes());
    }
}
