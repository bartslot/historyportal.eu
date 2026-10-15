<?php

declare(strict_types=1);

namespace App\Http\Requests\Race;

use App\Services\Lessons\HarbourRace;
use Illuminate\Foundation\Http\FormRequest;

/** The teacher's lobby: team names, start, end. */
class UpdateRaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'names' => ['sometimes', 'array', 'min:'.HarbourRace::TEAMS_MIN, 'max:'.HarbourRace::TEAMS_MAX],
            'names.*' => ['nullable', 'string', 'max:'.HarbourRace::NAME_MAX],
            'action' => ['sometimes', 'in:start,end'],
        ];
    }
}
