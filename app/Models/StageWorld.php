<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * A world a teacher saved from one of their stage25d scenes (EditsStage25d saveStage25dWorldAs). It has the shape of a
 * config/worlds.php entry (preset()), so picking one goes through the same pickStage25dWorld.
 */
class StageWorld extends Model
{
    /** The picker's key for a saved world: never a config/worlds.php key (those have no colon). */
    public const KEY_PREFIX = 'mine:';

    protected $fillable = ['user_id', 'name', 'bundle', 'parts', 'thumb_path'];

    protected function casts(): array
    {
        return ['parts' => 'array'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function key(): string
    {
        return self::KEY_PREFIX.$this->id;
    }

    /** @return array{label: string, bundle: string, set: array<string,mixed>, look: array<string,float>, thumb: ?string} */
    public function preset(): array
    {
        return [
            'label' => $this->name,
            'bundle' => $this->bundle,
            'set' => (array) ($this->parts['set'] ?? []),
            'look' => (array) ($this->parts['look'] ?? []),
            'thumb' => $this->thumb_path ? Storage::disk('public')->url($this->thumb_path) : null,
        ];
    }
}
