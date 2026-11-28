<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use App\Models\Lesson;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Editing a lesson offline (App\Services\OfflineSync): only somebody who may open the lesson in the editor
 * may take it to a laptop or bring changes back.
 */
class OfflineLessonRequest extends FormRequest
{
    public function authorize(): bool
    {
        $lesson = $this->route('lesson');

        return $lesson instanceof Lesson && $this->user()?->canEdit($lesson) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'claim' => ['sometimes', 'boolean'],
        ];
    }
}
