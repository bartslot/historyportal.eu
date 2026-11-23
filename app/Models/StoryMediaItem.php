<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Support\MediaUrl;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One thing story to video makes for a lesson: a character sheet, an empty world shot or a clip.
 * See App\Services\StoryVideo\StoryVideoRun.
 *
 * @property StoryMediaKind $kind
 * @property StoryMediaStatus $status
 * @property array<string, mixed>|null $input
 * @property array<string, mixed>|null $style
 */
class StoryMediaItem extends Model
{
    protected $fillable = [
        'lesson_id', 'scene_id', 'kind', 'key', 'position', 'label', 'input', 'status', 'prompt', 'note',
        'model', 'generation_id', 'attempts', 'style', 'path', 'error', 'started_at',
    ];

    protected $attributes = ['status' => 'planned', 'attempts' => 0, 'position' => 0];

    protected function casts(): array
    {
        return [
            'kind' => StoryMediaKind::class,
            'status' => StoryMediaStatus::class,
            'input' => 'array',
            'style' => 'array',
            'attempts' => 'integer',
            'position' => 'integer',
            'started_at' => 'datetime',
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

    public function url(): ?string
    {
        return $this->path ? MediaUrl::of($this->path) : null;
    }
}
