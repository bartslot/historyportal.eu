<?php

declare(strict_types=1);

namespace App\Http\Requests\Teacher;

use App\Services\Import\TwineParser;
use App\Services\Stage25d\StageWorlds;
use Closure;
use Illuminate\Foundation\Http\FormRequest;

/** A Twine story file (the .html Twine publishes) and the world its 3D scenes stand in. */
class ImportTwineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;   // behind the teacher auth middleware: any teacher imports into a lesson of their own
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'story' => ['required', 'file', 'extensions:html,htm', 'mimetypes:text/html,text/plain', 'max:'.intdiv(TwineParser::MAX_BYTES, 1000)],
            'world' => ['required', 'string', 'max:64', function (string $attribute, mixed $value, Closure $fail): void {
                if (StageWorlds::preset((string) $value, $this->user()?->id) === null) {
                    $fail(__('Pick a world for the 3D scenes.'));
                }
            }],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'story.required' => __('Choose a Twine story file.'),
            'story.extensions' => __('A Twine story is an .html file.'),
            'story.mimetypes' => __('A Twine story is an .html file.'),
            'story.max' => __('This file is too large for a Twine story.'),
        ];
    }
}
