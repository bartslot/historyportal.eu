<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/** A finished film for a scene, made outside the pipeline (a Blender render, an older batch). */
class AttachSceneFilmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $max = (int) config('story_video.render_pc.max_upload_mb', 200) * 1024;

        return [
            'film' => ['required', 'file', 'mimetypes:video/mp4,video/quicktime', "max:{$max}"],
        ];
    }

    protected function failedValidation(Validator $validator): never
    {
        throw new HttpResponseException(response()->json(['message' => 'Invalid request.', 'errors' => $validator->errors()], 422));
    }
}
