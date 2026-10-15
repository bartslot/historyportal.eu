<?php

declare(strict_types=1);

namespace App\Http\Requests\Race;

use Illuminate\Foundation\Http\FormRequest;

/** The class screen opens a race for one of its lesson's scenes. */
class OpenRaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return ['scene_id' => ['required', 'integer', 'min:1']];
    }
}
