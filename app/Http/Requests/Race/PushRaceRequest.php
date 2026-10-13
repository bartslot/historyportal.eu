<?php

declare(strict_types=1);

namespace App\Http\Requests\Race;

use Illuminate\Foundation\Http\FormRequest;

/** A team device's gain since its last push (meter steps). The service clamps it. */
class PushRaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'team_id' => ['required', 'integer', 'min:1'],
            // A sensor's gain (meter steps) or a right word found (its index in the moment's list).
            'delta' => ['required_without:word', 'numeric', 'min:0', 'max:8'],
            'word' => ['sometimes', 'integer', 'min:0', 'max:7'],
        ];
    }
}
