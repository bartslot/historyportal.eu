<?php

declare(strict_types=1);

namespace Tests\Feature\Predict;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonComposer;

/** A published lesson about salt in the fields of Ur, with one predict moment. */
trait BuildsPredictLesson
{
    protected ?User $teacher = null;

    protected function predictLesson(array $predict = [], string $language = 'en'): Lesson
    {
        $this->teacher ??= User::factory()->create();
        $lesson = app(LessonComposer::class)->build([
            'key' => 'Predict moment '.uniqid(),
            'language' => $language,
            'scenes' => [
                ['type' => 'story', 'script' => 'The farmers of Ur let more water from the Euphrates onto their fields.'],
                ['type' => 'predict'] + $predict + [
                    'question' => 'What happens to the harvest if they let in even more water?',
                    'outcome' => 'The harvest fell year after year, and the fields turned white.',
                    'debrief' => 'Why did the harvest fall?',
                    'rubric' => [
                        'key_cause' => 'Too much irrigation water leaves salt in the soil.',
                        'concepts' => ['salt', 'the soil goes bad', 'water evaporates'],
                        'misconceptions' => ['The gods were angry.'],
                    ],
                ],
                ['type' => 'story', 'script' => 'Year after year the harvest of Ur grew smaller.'],
            ],
        ], $this->teacher, narrate: false);
        $lesson->update(['status' => LessonStatus::Published]);

        return $lesson->fresh();
    }

    protected function predictScene(Lesson $lesson): Scene
    {
        return $lesson->scenes()->where('game_type', 'predict')->firstOrFail();
    }
}
