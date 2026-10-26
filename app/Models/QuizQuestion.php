<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\LessonVersion;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizQuestion extends Model
{
    protected $fillable = [
        'lesson_id',
        'scene_id',
        'order',
        'question',
        'options',
        'correct_index',
        'asks_ahead',
        'explanation',
        'points',
    ];

    protected function casts(): array
    {
        return [
            'options'       => 'array',
            'correct_index' => 'integer',
            'points'        => 'integer',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    /** The quiz segment (game scene) this question belongs to; null = legacy lesson-level pool. */
    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class);
    }

    public function isCorrect(int $answerIndex): bool
    {
        return $answerIndex === $this->correct_index;
    }

    public function correctAnswer(): string
    {
        return $this->options[$this->correct_index] ?? '';
    }

    protected static function booted(): void
    {
        // A quiz question is lesson content: its lesson's version goes up (LessonVersion).
        static::saved(fn (QuizQuestion $q) => LessonVersion::changed($q->lesson_id));
        static::deleted(fn (QuizQuestion $q) => LessonVersion::changed($q->lesson_id));
    }
}
