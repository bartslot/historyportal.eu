<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Contracts\Debug\ShouldntReport;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * An edit to a scene somebody else holds (LessonCollaboration::authorizeEdit). Nothing was written.
 *
 * Rendered as a 409 so the whole Livewire request is dropped before any property is set or any method
 * runs; resources/js/editor/collab.js catches the 409, keeps Livewire's error modal away, and turns the
 * editor read-only with "<name> took over this scene". Not an error worth logging: it is the lock working.
 */
final class SceneClaimTaken extends RuntimeException implements ShouldntReport
{
    public function __construct(public readonly string $holderName, public readonly string $target)
    {
        parent::__construct("{$target} is held by {$holderName}");
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'collab' => 'claim-taken',
            'holder' => $this->holderName,
            'target' => $this->target,
        ], 409);
    }
}
