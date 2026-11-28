<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * On a laptop only: a local lesson that is a copy of a live one (App\Services\OfflineSync\LocalCopy).
 *
 * `base` is what both sides looked like at the last sync:
 *   lesson: {remote_hash, local_hash}
 *   scenes: {<local scene id>: {remote_id, remote_hash, local_hash}}
 * A local hash that moved is an edit made here; the remote hash goes to the live site with the push, which
 * compares it with its own scene to see whether anybody changed that one meanwhile.
 */
final class OfflineCopy extends Model
{
    protected $fillable = ['lesson_id', 'remote_url', 'remote_lesson_id', 'remote_code', 'base', 'holds_claims', 'synced_at'];

    protected function casts(): array
    {
        return [
            'base' => 'array',
            'holds_claims' => 'boolean',
            'synced_at' => 'datetime',
            'remote_lesson_id' => 'integer',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
