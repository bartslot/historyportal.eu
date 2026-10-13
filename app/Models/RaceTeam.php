<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One team of a harbour race: the name is the teacher's, never a pupil's. */
class RaceTeam extends Model
{
    protected $fillable = ['race_run_id', 'position', 'name', 'progress', 'finished_ms', 'last_seen_at'];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'progress' => 'float',
            'finished_ms' => 'integer',
            'last_seen_at' => 'datetime',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(RaceRun::class, 'race_run_id');
    }
}
