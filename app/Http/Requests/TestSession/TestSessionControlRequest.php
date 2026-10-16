<?php

declare(strict_types=1);

namespace App\Http\Requests\TestSession;

use Illuminate\Foundation\Http\FormRequest;

/** Consent given (start) or Stop pressed (end). Never for a pupil: pupils are not recorded. */
class TestSessionControlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ! ($this->user()?->isStudent() ?? false);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }
}
