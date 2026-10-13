<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A harbour race on team devices (App\Services\Lessons\HarbourRace). Lives for one race: deleted
 * when the teacher's player closes it, and at the latest 24 hours after it was opened.
 */
class RaceRun extends Model
{
    public const STATES = ['lobby', 'running', 'finished'];

    protected $fillable = ['lesson_id', 'scene_id', 'code', 'state', 'goal', 'roles', 'started_at', 'finished_at', 'expires_at'];

    protected function casts(): array
    {
        return [
            'roles' => 'array',
            'goal' => 'integer',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function scene(): BelongsTo
    {
        return $this->belongsTo(Scene::class);
    }

    public function teams(): HasMany
    {
        return $this->hasMany(RaceTeam::class)->orderBy('position');
    }
}
