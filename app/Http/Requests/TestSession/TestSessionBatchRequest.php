<?php

declare(strict_types=1);

namespace App\Http\Requests\TestSession;

use App\Models\TestEvent;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * One 5-second batch from the recorder: timeline events plus, optionally, a chunk of the rrweb
 * recording. Public (the tester may not be signed in); the open session code is the key, checked
 * in the controller, and a pupil is refused.
 */
class TestSessionBatchRequest extends FormRequest
{
    /** A whole request, rrweb full snapshot included. */
    public const MAX_BYTES = 4_000_000;

    public function authorize(): bool
    {
        return ! ($this->user()?->isStudent() ?? false);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'events' => ['present', 'array', 'max:500'],
            'events.*.t' => ['required', 'integer', 'min:0', 'max:86400000'],
            'events.*.type' => ['required', 'string', Rule::in(TestEvent::TYPES)],
            'events.*.data' => ['nullable', 'array', $this->smallJson(...)],
            'rrweb' => ['nullable', 'array'],
            'rrweb.seq' => ['required_with:rrweb', 'integer', 'min:0', 'max:1000000'],
            'rrweb.events' => ['required_with:rrweb', 'array', 'min:1', 'max:20000'],
        ];
    }

    private function smallJson(string $attribute, mixed $value, Closure $fail): void
    {
        if (strlen((string) json_encode($value)) > 2000) {
            $fail('The event payload is too large.');
        }
    }
}
