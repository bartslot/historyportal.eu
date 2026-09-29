<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One anonymous player event (Phase 0 experiment). See the migration's privacy contract:
 * per-page-load session uuid only, no user id, no IP, pruned after the retention window.
 */
class LessonTelemetryEvent extends Model
{
    public const UPDATED_AT = null;

    /** The complete event vocabulary — the controller rejects anything else. */
    public const EVENTS = [
        'lesson_started',
        'scene_started',
        'scene_completed',
        'pause',
        'resume',
        'seek_backward',
        'seek_forward',
        'quiz_started',
        'lesson_completed',
        'lesson_exited',
    ];

    protected $fillable = [
        'lesson_id', 'session_uuid', 'event', 'scene_index', 'scene_id',
        'playback_position', 'client_ts',
    ];

    protected function casts(): array
    {
        return [
            'client_ts' => 'datetime',
            'playback_position' => 'float',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
