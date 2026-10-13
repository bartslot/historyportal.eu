<?php

declare(strict_types=1);

namespace App\Http\Controllers\Race;

use App\Http\Controllers\Controller;
use App\Http\Requests\Race\OpenRaceRequest;
use App\Http\Requests\Race\UpdateRaceRequest;
use App\Models\Lesson;
use App\Models\RaceRun;
use App\Models\Scene;
use App\Services\Lessons\HarbourRace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use InvalidArgumentException;

/**
 * The teacher's side of a harbour race on team devices: open it from the class screen, name the
 * teams in the lobby, start, end, close. Only someone who may manage the lesson.
 */
class RaceController extends Controller
{
    public function __construct(private readonly HarbourRace $race) {}

    public function store(OpenRaceRequest $request, string $lessonCode): JsonResponse
    {
        $lesson = Lesson::where('lesson_code', strtoupper($lessonCode))->firstOrFail();
        abort_unless($request->user()->canManage($lesson), 403);
        $scene = Scene::where('lesson_id', $lesson->id)->findOrFail($request->integer('scene_id'));

        try {
            $run = $this->race->open($lesson, $scene, __('Team :number'));
        } catch (InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        }

        return response()->json($this->race->state($run), 201);
    }

    public function update(UpdateRaceRequest $request, string $code): JsonResponse
    {
        $run = $this->managed($request, $code);
        try {
            if ($request->has('names')) {
                $run = $this->race->rename($run, $request->input('names'));
            }
        } catch (InvalidArgumentException $e) {
            abort(422, $e->getMessage());
        }
        $run = match ($request->input('action')) {
            'start' => $this->race->start($run),
            'end' => $this->race->end($run),
            default => $run->load('teams'),
        };

        return response()->json($this->race->state($run));
    }

    public function destroy(Request $request, string $code): Response
    {
        $this->managed($request, $code)->delete();

        return response()->noContent();
    }

    private function managed(Request $request, string $code): RaceRun
    {
        $run = RaceRun::where('code', strtoupper($code))->with('lesson')->firstOrFail();
        abort_unless($request->user()?->canManage($run->lesson), 403);

        return $run;
    }
}
