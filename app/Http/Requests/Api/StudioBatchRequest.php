<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/** The Mac asks for a batch (max items) or hands one back (claim). */
class StudioBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'max' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'claim' => ['sometimes', 'string', 'max:64'],
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json(['message' => 'Invalid request.', 'errors' => $validator->errors()], 422));
    }
}
