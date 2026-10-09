<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One lesson generation, snapshotted for the Phase 0 experiment: which code/config produced
 * it, which visual path each scene took, and what it cost. Counters are incremented
 * best-effort by GenerationRunRecorder — instrumentation must never fail a lesson.
 */
class GenerationRun extends Model
{
    protected $fillable = [
        'lesson_id', 'experiment_label', 'git_commit', 'snapshot', 'generation_paths',
        'llm_calls', 'vision_calls', 'image_calls', 'image_retries',
        'llm_input_tokens', 'llm_cached_tokens', 'llm_output_tokens',
        'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'generation_paths' => 'array',
            'finished_at' => 'datetime',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
