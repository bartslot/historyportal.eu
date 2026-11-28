<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

/**
 * One picture, sound, clip or 3D file made on the laptop while offline, uploaded before the push that
 * points at it. The kinds the editor itself accepts, and up to 200 MB for a clip.
 */
class OfflineMediaRequest extends OfflineLessonRequest
{
    public const EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'avif', 'mp4', 'webm', 'mov', 'mp3', 'm4a', 'wav', 'ogg', 'json', 'glb', 'spz'];

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:204800', 'extensions:'.implode(',', self::EXTENSIONS)],
        ];
    }
}
