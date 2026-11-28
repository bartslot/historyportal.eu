<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\OfflineLessonRequest;
use App\Http\Requests\Api\OfflineMediaCheckRequest;
use App\Http\Requests\Api\OfflineMediaRequest;
use App\Http\Requests\Api\OfflinePushRequest;
use App\Models\Lesson;
use App\Services\Collaboration\LessonCollaboration;
use App\Services\OfflineSync\LiveLesson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * /api/v1/offline: a laptop takes a lesson offline and brings it back (App\Services\OfflineSync).
 * The laptop's own History Portal calls these with the teacher's API token.
 */
class OfflineLessonController extends Controller
{
    public function __construct(private LiveLesson $live, private LessonCollaboration $collab) {}

    /** The lessons this account may edit, newest first: what the laptop offers to take offline. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $lessons = Lesson::query()
            ->when(! $user->isAdmin(), fn ($q) => $q->where(fn ($q) => $q->where('teacher_id', $user->id)
                ->orWhereHas('editors', fn ($e) => $e->whereKey($user->id))))
            ->withCount('scenes')
            ->latest('updated_at')
            ->limit(200)
            ->get(['id', 'lesson_code', 'title', 'updated_at', 'teacher_id']);

        return response()->json(['lessons' => $lessons->map(fn (Lesson $l) => [
            'code' => $l->lesson_code,
            'title' => $l->title,
            'scenes' => (int) $l->scenes_count,
            'updated_at' => $l->updated_at?->toIso8601String(),
            'mine' => (int) $l->teacher_id === (int) $user->id,
        ])->values()]);
    }

    /** The whole lesson; with claim=1 its scenes are also held for this account while it is offline. */
    public function show(OfflineLessonRequest $request, Lesson $lesson): JsonResponse
    {
        $busy = [];
        if ($request->boolean('claim')) {
            $busy = $this->collab->takeOffline($lesson, $request->user(), now()->addDays((int) config('offline_sync.hold_days')));
        }

        return response()->json([...$this->live->export($lesson, $this->hosts($request)), 'busy' => $busy]);
    }

    public function existing(OfflineMediaCheckRequest $request, Lesson $lesson): JsonResponse
    {
        return response()->json(['existing' => $this->live->existing($request->validated('files'))]);
    }

    /** A file made offline, stored under the lesson by its content, so the same file is stored once. */
    public function media(OfflineMediaRequest $request, Lesson $lesson): JsonResponse
    {
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        $name = sha1_file($file->getRealPath()).'.'.$ext;
        $path = $file->storeAs('lessons/'.$lesson->id.'/offline', $name, 'public');

        return response()->json(['path' => $path]);
    }

    public function push(OfflinePushRequest $request, Lesson $lesson): JsonResponse
    {
        $result = $this->live->apply($lesson, $request->user(), $request->validated());

        return response()->json($result, isset($result['conflicts']) ? 409 : 200);
    }

    /** Back online: the scenes this account held offline are free again. */
    public function release(OfflineLessonRequest $request, Lesson $lesson): JsonResponse
    {
        $this->collab->releaseOffline($lesson, $request->user());

        return response()->json(['released' => true]);
    }

    /** @return list<string> */
    private function hosts(Request $request): array
    {
        return array_values(array_unique(array_filter([$request->getHost(), parse_url((string) config('app.url'), PHP_URL_HOST)])));
    }
}
