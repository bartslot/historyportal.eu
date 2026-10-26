<?php

declare(strict_types=1);

namespace Tests\Feature\Tts;

use App\Jobs\GenerateSceneAudio;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * PM, 2026-10-18, lesson 71 (an English copy of W24VRI, a Dutch teacher): "Behind them, Batavia
 * shrank to a thin line along the water." was read by a Dutch voice. Too short to call, so the
 * teacher's teaching language decided. For a short line the LESSON decides: the language its
 * script is written in, then its language column, and only then the teacher's.
 */
class NarrationLanguageFallbackTest extends TestCase
{
    use RefreshDatabase;

    private const SHORT = 'Behind them, Batavia shrank to a thin line along the water.';

    private function lesson(string $language, array $scripts): Lesson
    {
        $teacher = User::factory()->create(['teaching_locale' => 'nl', 'locale' => 'nl']);
        $lesson = Lesson::create(['teacher_id' => $teacher->id, 'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '9th', 'language' => $language]);
        foreach ($scripts as $i => $script) {
            Scene::create(['lesson_id' => $lesson->id, 'order' => $i + 1, 'kind' => 'narration', 'script_segment' => $script, 'status' => 'ready']);
        }

        return $lesson;
    }

    public function test_a_short_line_in_an_english_lesson_of_a_dutch_teacher_is_read_in_english(): void
    {
        $lesson = $this->lesson('en', [
            self::SHORT,
            'The two ships sailed out of the harbour in the summer of 1642, and the crew did not know where the voyage would end.',
        ]);

        $voice = GenerateSceneAudio::narratorVoice($lesson->scenes()->first(), self::SHORT);
        $this->assertSame('en', $voice['locale']);
    }

    public function test_a_lesson_written_in_dutch_keeps_dutch_even_if_its_column_says_en(): void
    {
        // Prod lessons 13 and 14: column en (the default), written in Dutch.
        $lesson = $this->lesson('en', [
            'Land in zicht.',
            'De twee schepen voeren in de zomer van 1642 de haven uit, en de bemanning wist niet waar de reis zou eindigen.',
        ]);

        $this->assertSame('nl', GenerateSceneAudio::narratorVoice($lesson->scenes()->first(), 'Land in zicht.')['locale']);
    }

    public function test_a_lesson_too_short_to_call_falls_back_to_its_language_column(): void
    {
        $lesson = $this->lesson('fr', ['Terre en vue.']);

        $this->assertSame('fr', GenerateSceneAudio::narratorVoice($lesson->scenes()->first(), 'Terre en vue.')['locale']);
    }
}
