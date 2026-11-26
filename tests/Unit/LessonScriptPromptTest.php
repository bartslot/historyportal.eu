<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonScriptPrompt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LessonScriptPromptTest extends TestCase
{
    use RefreshDatabase;

    private function makeLesson(array $attributes = [], string $teacherLocale = 'en'): Lesson
    {
        $teacher = User::factory()->create(['locale' => $teacherLocale]);

        return Lesson::create(array_merge([
            'teacher_id' => $teacher->id,
            'topic' => 'Julius Caesar',
            'subject' => 'history',
            'grade_level' => '8',
            'tone' => 'dramatic',
            'outline' => [
                'learning_objectives' => [
                    ['id' => 'LO1', 'text' => 'Explain why the senators feared Caesar.', 'bloom' => 'understand'],
                ],
            ],
        ], $attributes));
    }

    public function test_system_prompt_carries_the_story_hard_rules_and_exemplar(): void
    {
        $system = LessonScriptPrompt::system($this->makeLesson());

        $this->assertStringContainsString('NAMED historical person', $system);
        $this->assertStringContainsString('"but" or "therefore"', $system);
        $this->assertStringContainsString('NO bracket tags', $system);
        $this->assertStringContainsString('BAD (never write this', $system);
        $this->assertStringContainsString('GOOD (write this', $system);
        $this->assertStringContainsString('Write all narration in English', $system);
    }

    public function test_system_prompt_switches_content_language_with_teacher_locale(): void
    {
        $system = LessonScriptPrompt::system($this->makeLesson(teacherLocale: 'nl'));

        $this->assertStringContainsString('Write all narration in Dutch', $system);
    }

    public function test_user_prompt_lists_objectives_scenes_and_briefs_by_position(): void
    {
        $lesson = $this->makeLesson();
        $scenes = collect([
            new Scene(['order' => 2, 'kind' => 'narration', 'year' => '44 BC', 'location' => 'Rome']),
            new Scene(['order' => 3, 'kind' => 'game']),
        ]);
        $briefs = [
            ['beat' => 'Caesar enters the Senate', 'conflict' => 'The conspirators wait', 'characters' => ['Caesar', 'Brutus'], 'objective_ids' => ['LO1']],
            ['beat' => 'Checkpoint quiz'],
        ];

        $user = LessonScriptPrompt::user($lesson, $scenes, $briefs, 'Caesar was assassinated in 44 BC.');

        $this->assertStringContainsString('LO1: Explain why the senators feared Caesar.', $user);
        $this->assertStringContainsString('Scene order=2', $user);
        $this->assertStringContainsString('conflict: The conspirators wait', $user);
        $this->assertStringContainsString('characters: Caesar, Brutus', $user);
        $this->assertStringContainsString('Scene order=3 (GAME — 40-80 word setup only)', $user);
        $this->assertStringContainsString('Caesar was assassinated in 44 BC.', $user);
        $this->assertStringNotContainsString('previous draft was rejected', $user);
    }

    public function test_user_prompt_appends_critique_issues_on_revision(): void
    {
        $lesson = $this->makeLesson();
        $scenes = collect([new Scene(['order' => 2, 'kind' => 'narration'])]);

        $user = LessonScriptPrompt::user($lesson, $scenes, [[]], 'source', ['Scene 2: nobody acts']);

        $this->assertStringContainsString('previous draft was rejected', $user);
        $this->assertStringContainsString('Scene 2: nobody acts', $user);
    }

    public function test_the_narration_is_written_for_this_classs_age_with_the_story_writer_rules(): void
    {
        $young = LessonScriptPrompt::system($this->makeLesson(['grade_level' => 'Age 8']));
        $this->assertStringContainsString('The class is about 8: sentences under 12 words', $young);
        $this->assertStringContainsString('HARD WORDS', $young);
        $this->assertStringContainsString('LEGENDS stay legends', $young);
        $this->assertStringContainsString('last sentence is one open question', $young);

        $older = LessonScriptPrompt::system($this->makeLesson(['grade_level' => 'Age 16']));
        $this->assertStringContainsString('The class is about 16: sentences under 25 words', $older);
    }

    public function test_the_critique_judges_the_reading_level_of_this_class(): void
    {
        $this->assertStringContainsString('cap it at 2', \App\Services\ScriptCritiquePrompt::system());
        $this->assertStringNotContainsString('12-year-old', \App\Services\ScriptCritiquePrompt::system());
        $user = \App\Services\ScriptCritiquePrompt::user($this->makeLesson(['grade_level' => 'Age 10']), collect([1 => 'Dante wakes.']));
        $this->assertStringContainsString('Reading level: The class is about 10', $user);
    }

    public function test_the_outline_asks_for_the_cast_and_its_signature_colours(): void
    {
        $system = \App\Services\LessonOutlinePrompt::system(false);
        $this->assertStringContainsString('"cast": [', $system);
        $this->assertStringContainsString('owns white', $system);
        $this->assertStringContainsString('Reading level: The class is about 14', \App\Services\LessonOutlinePrompt::user($this->makeLesson(['grade_level' => 'Age 14']), 'Source.'));
    }
}
