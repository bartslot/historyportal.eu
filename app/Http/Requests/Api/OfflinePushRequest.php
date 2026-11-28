<?php

declare(strict_types=1);

namespace App\Http\Requests\Api;

/**
 * A laptop's changes to a lesson it took offline (App\Services\OfflineSync\LiveLesson::apply).
 *
 *  - id_map: laptop scene id => live scene id, for every scene the laptop already knew
 *  - scenes[]: one per scene that changed on the laptop. `key` is its laptop id, `id` its live id (none for
 *    a scene made offline), `base` the live fingerprint it was pulled with, `deleted` when it was deleted
 *    there, `resolution` the teacher's answer to a conflict (mine / both; "theirs" is simply not sent)
 *  - lesson: the lesson's own columns, its quiz pool and the running order of laptop scene ids, when those
 *    changed on the laptop
 */
class OfflinePushRequest extends OfflineLessonRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'id_map' => ['present', 'array'],
            'id_map.*' => ['integer'],
            'scenes' => ['present', 'array', 'max:2000'],
            'scenes.*.key' => ['required', 'integer'],
            'scenes.*.id' => ['nullable', 'integer'],
            'scenes.*.base' => ['nullable', 'string', 'size:40'],
            'scenes.*.deleted' => ['sometimes', 'boolean'],
            'scenes.*.resolution' => ['nullable', 'in:mine,both'],
            'scenes.*.status' => ['nullable', 'string', 'max:20'],
            'scenes.*.fields' => ['sometimes', 'array'],
            'scenes.*.questions' => ['sometimes', 'array'],
            'lesson' => ['nullable', 'array'],
            'lesson.base' => ['required_with:lesson', 'string', 'size:40'],
            'lesson.resolution' => ['nullable', 'in:mine'],
            'lesson.fields' => ['sometimes', 'array'],
            'lesson.questions' => ['sometimes', 'array'],
            'lesson.order' => ['sometimes', 'array'],
            'lesson.order.*' => ['integer'],
        ];
    }
}
