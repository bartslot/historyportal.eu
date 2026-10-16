<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * One recorded test: an adult tester opted in with ?test=CODE. The create_test_sessions_tables
 * migration has the shape, resources/js/test-session/ the recorder.
 *
 * @property int $id
 * @property string $code
 * @property ?string $label
 * @property ?int $user_id
 * @property ?\Illuminate\Support\Carbon $started_at
 * @property ?\Illuminate\Support\Carbon $ended_at
 */
class TestSession extends Model
{
    use MassPrunable;

    /** Kept this long, then model:prune deletes the session and (by cascade) all it recorded. */
    public const RETENTION_DAYS = 30;

    protected $fillable = ['code', 'label', 'user_id', 'started_at', 'ended_at'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime', 'ended_at' => 'datetime'];
    }

    /** An unguessable code: it is the only key the recorder holds. */
    public static function newCode(): string
    {
        return strtoupper(Str::random(8));
    }

    /** Open = consent given and not stopped. Only an open session accepts data. */
    public function isOpen(): bool
    {
        return $this->started_at !== null && $this->ended_at === null;
    }

    public function readableBy(?User $user): bool
    {
        return $user !== null && ($user->isAdmin() || (int) $this->user_id === (int) $user->id);
    }

    public function prunable(): Builder
    {
        return static::where('created_at', '<', now()->subDays(self::RETENTION_DAYS));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(TestEvent::class);
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(TestRrwebChunk::class);
    }
}
