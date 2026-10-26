<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One typed answer at a predict moment (see the create_prediction_answers migration). A prediction
 * is never graded (it only gets the "you thought X, this happened" card); a WHY is graded by
 * GradePredictionAnswer. The teacher's override wins over the grader's level everywhere it is read.
 */
class PredictionAnswer extends Model
{
    use MassPrunable;

    /** One school year (Bart, 2026-10-19), then model:prune deletes it. */
    public const RETENTION_DAYS = 365;

    public const PHASES = ['predict', 'why'];

    public const ANSWERERS = ['pupil', 'class', 'team'];

    public const LEVELS = [0, 1, 2, 3];

    protected $fillable = [
        'lesson_id', 'scene_id', 'classroom_id', 'classroom_member_id',
        'child_id', 'session_hash', 'answerer', 'label', 'phase', 'question', 'text',
        'status', 'level', 'concepts', 'misconception', 'confidence', 'feedback', 'model',
        'graded_at', 'teacher_override',
    ];

    protected $hidden = ['session_hash'];

    protected function casts(): array
    {
        return [
            'level' => 'integer',
            'concepts' => 'array',
            'confidence' => 'float',
            'graded_at' => 'datetime',
            'teacher_override' => 'integer',
        ];
    }

    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays(self::RETENTION_DAYS));
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class)->withTrashed();
    }

    public function member(): BelongsTo
    {
        return $this->belongsTo(ClassroomMember::class, 'classroom_member_id');
    }

    /** The level the teacher sees and counts: their override, else the grader's. */
    public function effectiveLevel(): ?int
    {
        return $this->teacher_override ?? $this->level;
    }

    /** A browser's run token, as stored: the raw token never is. */
    public static function hashSession(string $token): string
    {
        return hash('sha256', $token);
    }
}
