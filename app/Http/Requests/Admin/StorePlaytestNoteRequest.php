<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/** One spoken playtest note from the admin-only recorder (x-playtest-recorder). */
class StorePlaytestNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $point = fn (string $key): array => [
            "$key" => ['required', 'array'],
            "$key.x" => ['required', 'integer'],
            "$key.y" => ['required', 'integer'],
            "$key.fx" => ['nullable', 'numeric'],
            "$key.fy" => ['nullable', 'numeric'],
            "$key.element" => ['nullable', 'array'],
            "$key.element.selector" => ['nullable', 'string', 'max:500'],
            "$key.element.text" => ['nullable', 'string', 'max:200'],
            "$key.element.rect" => ['nullable', 'array', 'size:4'],
            "$key.element.rect.*" => ['integer'],
        ];

        return [
            'text' => ['required', 'string', 'max:2000'],
            'url' => ['required', 'url', 'max:2000'],
            'spoken_at' => ['required', 'date'],
            'duration_ms' => ['nullable', 'integer', 'min:0', 'max:600000'],
            'viewport' => ['nullable', 'array', 'size:2'],
            'viewport.*' => ['integer', 'min:0'],
            'scroll' => ['nullable', 'array', 'size:2'],
            'scroll.*' => ['integer'],
            'visited' => ['nullable', 'array', 'max:12'],
            'visited.*' => ['string', 'max:500'],
            'lang' => ['nullable', 'string', 'max:20'],
            ...$point('start'),
            ...$point('end'),
        ];
    }
}
