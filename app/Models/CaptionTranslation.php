<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One subtitle line in one language for one lesson; see App\Services\Captions\CaptionTranslator. */
class CaptionTranslation extends Model
{
    protected $fillable = ['lesson_id', 'source_hash', 'language', 'source_text', 'machine_text', 'teacher_text'];

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    /** What the class reads: the teacher's correction when there is one. */
    public function text(): string
    {
        return $this->teacher_text ?? $this->machine_text;
    }
}
