<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\MusicLicence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/** A licensed music file in the shared library, picked per scene by the teacher. */
class MusicTrack extends Model
{
    protected $fillable = ['user_id', 'title', 'source_url', 'licence', 'licence_note', 'path'];

    protected function casts(): array
    {
        return ['licence' => MusicLicence::class];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function url(): string
    {
        return Storage::disk('public')->url($this->path);
    }

    /**
     * The tracks a lesson's scenes play, keyed by id, in the shape the player's mixer reads.
     *
     * @param  iterable<Scene>  $scenes
     * @return array<int, array{url: string, title: string}>
     */
    public static function forScenes(iterable $scenes): array
    {
        $ids = collect($scenes)
            ->flatMap(fn (Scene $s) => collect($s->music['layers'] ?? [])->pluck('track_id'))
            ->unique()->values();

        if ($ids->isEmpty()) {
            return [];
        }

        return static::query()->whereIn('id', $ids)->get()
            ->mapWithKeys(fn (self $t) => [$t->id => ['url' => $t->url(), 'title' => $t->title]])
            ->all();
    }
}
