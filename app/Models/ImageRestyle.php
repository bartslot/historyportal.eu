<?php

declare(strict_types=1);

namespace App\Models;

use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One History Lines restyle of a scene image or a library asset. The original is never touched:
 * `before` remembers what the subject pointed at, `result_path` is the new file beside it, and
 * Keep / Back to original just swap which of the two the subject points at.
 *
 * @property int $id
 * @property int $user_id
 * @property string $status queued | running | ready | kept | failed | discarded
 * @property array{path: ?string, cdn_url: ?string}|null $before
 * @property int $step 0 queued, 1 ink pass, 2 colour pass
 * @property string|null $ink_path pass 1 output (black ink with hatching)
 * @property string|null $result_path pass 2 output (the final watercolour)
 * @property string|null $error_code credits | blocked | busy | failed
 */
class ImageRestyle extends Model
{
    public const QUEUED = 'queued';

    public const RUNNING = 'running';

    public const READY = 'ready';

    public const KEPT = 'kept';

    public const FAILED = 'failed';

    public const DISCARDED = 'discarded';

    protected $fillable = ['user_id', 'subject_type', 'subject_id', 'status', 'before', 'step', 'api_calls', 'cost_usd', 'ink_path', 'result_path', 'error_code', 'error_detail', 'notified_at'];

    protected $casts = ['before' => 'array', 'notified_at' => 'datetime'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function isActive(): bool
    {
        return in_array($this->status, [self::QUEUED, self::RUNNING], true);
    }

    /** Still "running" long after any API call could take: its job died (fatal, timeout, killed worker). */
    public function isStale(): bool
    {
        return $this->isActive() && $this->updated_at !== null
            && $this->updated_at->lt(now()->subMinutes((int) config('services.openai.restyle_stale_minutes', 10)));
    }

    public function originalUrl(): ?string
    {
        return MediaUrl::of($this->before['cdn_url'] ?? $this->before['path'] ?? null);
    }

    public function inkUrl(): ?string
    {
        return MediaUrl::versioned($this->ink_path, $this->updated_at?->timestamp);
    }

    public function resultUrl(): ?string
    {
        return MediaUrl::versioned($this->result_path, $this->updated_at?->timestamp);
    }

    /** The newest restyle of a subject that is still on the table (not discarded). */
    public static function latestFor(Model $subject): ?self
    {
        return static::query()
            ->where('subject_type', $subject->getMorphClass())
            ->where('subject_id', $subject->getKey())
            ->where('status', '!=', self::DISCARDED)
            ->latest('id')
            ->first();
    }
}
