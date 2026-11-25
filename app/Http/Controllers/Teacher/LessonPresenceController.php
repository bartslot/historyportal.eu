<?php

declare(strict_types=1);

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\LessonPresenceRequest;
use App\Models\Lesson;
use App\Services\Collaboration\LessonCollaboration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * The editor's side of several accounts in one lesson (resources/js/editor/collab.js). Plain JSON, not
 * Livewire: the ping runs every few seconds for every open editor, and a Livewire round trip would
 * re-render the whole editor each time.
 */
final class LessonPresenceController extends Controller
{
    public function __construct(private readonly LessonCollaboration $collab) {}

    /** "I am here, on this scene": holds it when free, and answers with who else is in the lesson. */
    public function ping(LessonPresenceRequest $request, Lesson $lesson): JsonResponse
    {
        return response()->json($this->collab->ping($lesson, $request->user(), $request->target()));
    }

    /** Take over: the scene becomes yours, whoever had it. Their editor turns read-only on its next ping. */
    public function takeOver(LessonPresenceRequest $request, Lesson $lesson): JsonResponse
    {
        $target = $request->target();
        abort_if($target === null, 422);

        $this->collab->takeOver($lesson, $request->user(), $target);

        return response()->json($this->collab->ping($lesson, $request->user(), $target));
    }

    /** The tab closed (sendBeacon): let go now rather than when the claim lapses. */
    public function leave(LessonPresenceRequest $request, Lesson $lesson): Response
    {
        $this->collab->leave($lesson, $request->user());

        return response()->noContent();
    }
}
