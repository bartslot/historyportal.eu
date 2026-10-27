<?php

declare(strict_types=1);

namespace App\Http\Requests\Predict;

use App\Models\PredictionAnswer;
use App\Services\Lessons\PredictSpec;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * One typed answer at a predict moment, from the player. Public like the quiz score: a pupil on
 * their own device is not signed in. The class's or a team's answer comes from the board, which the
 * controller only accepts from someone who may manage the lesson.
 */
class StorePredictionAnswerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'scene_id' => ['required', 'integer', 'min:1'],
            'phase' => ['required', Rule::in(PredictionAnswer::PHASES)],
            'text' => ['required', 'string', 'min:1', 'max:'.PredictSpec::ANSWER_MAX],
            // The browser's run token: a pupil session, the key to reading the feedback back.
            'session' => ['required', 'string', 'regex:/^[A-Za-z0-9-]{16,64}$/'],
            'answerer' => ['required', Rule::in(PredictionAnswer::ANSWERERS)],
            'label' => ['nullable', 'string', 'max:40'],
            'class_code' => ['nullable', 'string', 'max:12'],
            'classroom_id' => ['nullable', 'integer'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'text' => trim(strip_tags((string) $this->input('text', ''))),
            'label' => filled($this->input('label')) ? trim(strip_tags((string) $this->input('label'))) : null,
        ]);
    }
}
