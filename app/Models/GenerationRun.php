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

    /**
     * Rough USD cost from the counters and config('lessons.cost_rates') — recomputed live so
     * historical rows re-price when rates are corrected. An estimate for A/B decisions
     * ("references cut identity errors 23%→6% but add €0.42/lesson — worth it?"), not billing.
     */
    public function estimatedCostUsd(): float
    {
        $rates = (array) config('lessons.cost_rates', []);
        $perMtok = fn (string $key) => (float) ($rates[$key] ?? 0) / 1_000_000;

        // Cached input tokens are also counted inside input_tokens by OpenAI-style usage
        // payloads — price the cached share at the cached rate, the rest at the full rate.
        $uncachedInput = max(0, (int) $this->llm_input_tokens - (int) $this->llm_cached_tokens);

        return round(
            $uncachedInput * $perMtok('llm_input_per_mtok')
            + (int) $this->llm_cached_tokens * $perMtok('llm_cached_per_mtok')
            + (int) $this->llm_output_tokens * $perMtok('llm_output_per_mtok')
            + (int) $this->image_calls * (float) ($rates['image_per_call'] ?? 0)
            + (int) $this->vision_calls * (float) ($rates['vision_per_call'] ?? 0),
            4,
        );
    }
}
