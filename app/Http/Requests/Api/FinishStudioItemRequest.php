<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/** The Mac finishes a studio item: the clip the studio made, or the reason there is none. */
class FinishStudioItemRequest extends FormRequest
{
    /** The token middleware already decided who this is. */
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $max = (int) config('story_video.studio.max_upload_mb', 200) * 1024;

        return [
            'claim' => ['required', 'string', 'max:64'],
            'file' => ['required_without:error', 'file', 'mimetypes:video/mp4,video/quicktime', "max:{$max}"],
            'error' => ['required_without:file', 'string', 'max:500'],
        ];
    }

    /** The caller is a script, not a browser: always answer in JSON. */
    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json(['message' => 'Invalid request.', 'errors' => $validator->errors()], 422));
    }
}
