<?php

declare(strict_types=1);

namespace App\Http\Requests\Race;

use Illuminate\Foundation\Http\FormRequest;

/** A team device picks its team. Public: pupils have no account. */
class JoinRaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['team_id' => ['required', 'integer', 'min:1']];
    }
}
