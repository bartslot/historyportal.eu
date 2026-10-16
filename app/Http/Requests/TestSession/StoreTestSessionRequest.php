<?php

declare(strict_types=1);

namespace App\Http\Requests\TestSession;

use Illuminate\Foundation\Http\FormRequest;

/** "Start test session" in the account menu: a teacher or admin opens a session for this page. */
class StoreTestSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null && ($user->isTeacher() || $user->isAdmin()) && ! $user->isGuestDemo();
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'label' => ['nullable', 'string', 'max:120'],
            // Only a path on this site: the redirect must never leave it.
            'return' => ['nullable', 'string', 'max:2000', 'regex:#^/(?!/)#'],
        ];
    }
}
