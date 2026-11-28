<?php

declare(strict_types=1);

namespace App\Http\Requests\Teacher;

use App\Models\Lesson;
use App\Services\Collaboration\LessonCollaboration;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The editor's ping, its goodbye, and Take over: who may send them (anyone who may edit the lesson) and
 * which part of the lesson they name ("scene:12" of THIS lesson, or "title").
 */
class LessonPresenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        $lesson = $this->route('lesson');

        return $lesson instanceof Lesson && (bool) $this->user()?->canEdit($lesson);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'target' => ['nullable', 'string', 'max:40', function (string $attribute, mixed $value, Closure $fail): void {
                if (! app(LessonCollaboration::class)->isValidTarget($this->route('lesson'), (string) $value)) {
                    $fail('Unknown part of the lesson.');
                }
            }],
        ];
    }

    public function target(): ?string
    {
        return $this->validated('target');
    }
}
