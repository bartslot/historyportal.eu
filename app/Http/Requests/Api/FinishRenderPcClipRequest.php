<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/** The render PC finishes a clip: the video, or the reason there is none. */
class FinishRenderPcClipRequest extends FormRequest
{
    /** The token middleware already decided who this is. */
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $max = (int) config('story_video.render_pc.max_upload_mb', 200) * 1024;

        return [
            'claim' => ['required', 'string', 'max:64'],
            'video' => ['required_without:error', 'file', 'mimetypes:video/mp4,video/quicktime', "max:{$max}"],
            'error' => ['required_without:video', 'string', 'max:500'],
        ];
    }

    /** The worker is a script, not a browser: always answer in JSON. */
    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json(['message' => 'Invalid request.', 'errors' => $validator->errors()], 422));
    }
}
