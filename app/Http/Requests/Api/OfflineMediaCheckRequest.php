<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

/** Which of these files the live site already has, byte for byte (path + sha1), so they are not uploaded again. */
class OfflineMediaCheckRequest extends OfflineLessonRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'files' => ['present', 'array', 'max:5000'],
            'files.*.path' => ['required', 'string', 'max:500'],
            'files.*.sha1' => ['required', 'string', 'size:40'],
        ];
    }
}
