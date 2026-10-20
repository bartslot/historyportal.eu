<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One item of the Dutch curriculum (resources/curriculum/nl-vo.php): a kerndoel, a tijdvak, a
 * kenmerkend aspect or a Canon window. Lessons link to it with a fit of `direct` or `partial`.
 */
class CurriculumGoal extends Model
{
    public const TYPES = ['kerndoel', 'tijdvak', 'kenmerkend_aspect', 'canonvenster'];

    public const FITS = ['direct', 'partial'];

    protected $fillable = ['type', 'code', 'slug', 'title', 'body', 'period', 'parent_id', 'source_url', 'sort'];

    /** "kerndoel:37", "ka:6.3": how a guide file or the picker names a goal. */
    public static function findByKey(string $key): ?self
    {
        [$type, $code] = array_pad(explode(':', $key, 2), 2, '');
        $type = $type === 'ka' ? 'kenmerkend_aspect' : ($type === 'canon' ? 'canonvenster' : $type);

        return self::query()->where('type', $type)->where('code', $code)->first();
    }

    public static function slugFor(string $type, string $code): string
    {
        return str_replace(['_', '.'], '-', $type).'-'.str_replace('.', '-', $code);
    }

    /** What a teacher reads before the title: "Kerndoel 37", "Canonvenster 14". */
    public function label(): string
    {
        return match ($this->type) {
            'kerndoel' => 'Kerndoel '.$this->code,
            'tijdvak' => 'Tijdvak '.$this->code,
            'kenmerkend_aspect' => 'Kenmerkend aspect '.$this->code,
            'canonvenster' => 'Canonvenster '.$this->code,
            default => $this->code,
        };
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('sort');
    }

    public function lessons(): BelongsToMany
    {
        return $this->belongsToMany(Lesson::class)->withPivot('fit')->withTimestamps();
    }
}
