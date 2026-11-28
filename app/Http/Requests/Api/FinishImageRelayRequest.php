<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

/** The Mac's answer to one picture request: the picture, or why there is none. */
class FinishImageRelayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;   // ImageRelayToken has checked the caller
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'picture' => ['required_without:error', 'file', 'mimes:png,jpg,jpeg,webp', 'max:30000'],
            'error' => ['required_without:picture', 'string', 'max:2000'],
        ];
    }
}
