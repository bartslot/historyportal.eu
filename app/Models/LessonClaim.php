<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** See App\Services\Collaboration\LessonCollaboration. */
final class LessonClaim extends Model
{
    public $timestamps = false;

    protected $table = 'lesson_claims';

    protected $fillable = ['lesson_id', 'user_id', 'target', 'seen_at'];

    protected function casts(): array
    {
        return ['seen_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
