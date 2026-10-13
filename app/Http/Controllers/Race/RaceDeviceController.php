<?php

declare(strict_types=1);

namespace App\Http\Controllers\Race;

use App\Http\Controllers\Controller;
use App\Http\Requests\Race\JoinRaceRequest;
use App\Http\Requests\Race\PushRaceRequest;
use App\Models\RaceRun;
use App\Services\Lessons\HarbourRace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/**
 * A team device in a harbour race: the controller page /race/{code} (the race QR opens it), picking
 * a team, pushing what the team gains, reading the race. Public and throttled; pupils have no
 * account and nothing about them is stored.
 */
class RaceDeviceController extends Controller
{
    /** The interface languages (lang/*.json + English). */
    private const UI_LANGUAGES = ['en', 'nl', 'de', 'fr', 'it'];

    public function __construct(private readonly HarbourRace $race) {}

    public function show(string $code): View
    {
        $run = RaceRun::where('code', strtoupper($code))->with(['teams', 'scene', 'lesson'])->firstOrFail();
        $moment = ($run->scene->config ?? [])['moment'] ?? [];
        // A pupil's phone speaks the lesson's language, not whatever the visitor's browser last had.
        if (in_array($run->lesson->language, self::UI_LANGUAGES, true)) {
            app()->setLocale($run->lesson->language);
        }

        return view('race.controller', [
            'run' => $run,
            'device' => [
                'code' => $run->code,
                'race' => $this->race->state($run),
                // Only what the meter needs: never the lesson's other content.
                'moment' => array_intersect_key($moment, array_flip(['name', 'meter_label', 'prompt', 'input', 'input_options', 'words', 'goal'])),
                'push_ms' => (int) config('race.push_ms'),
                'poll_ms' => (int) config('race.device_poll_ms'),
                'urls' => [
                    'state' => route('race.state', $run->code),
                    'join' => route('race.join', $run->code),
                    'push' => route('race.push', $run->code),
                ],
            ],
        ]);
    }

    public function state(Request $request, string $code): JsonResponse
    {
        $run = RaceRun::where('code', strtoupper($code))->with('teams')->firstOrFail();
        if ($request->integer('team') > 0) {
            $this->race->seen($run, $request->integer('team'));
            $run->load('teams');
        }

        return response()->json($this->race->state($run));
    }

    public function join(JoinRaceRequest $request, string $code): JsonResponse
    {
        $run = RaceRun::where('code', strtoupper($code))->with('teams')->firstOrFail();
        $team = $run->teams->firstWhere('id', $request->integer('team_id'));
        abort_if($team === null, 422, 'No such team in this race.');
        $this->race->seen($run, $team->id);

        return response()->json(['team' => ['id' => $team->id, 'name' => $team->name], 'race' => $this->race->state($run->load('teams'))]);
    }

    public function push(PushRaceRequest $request, string $code): JsonResponse
    {
        $run = RaceRun::where('code', strtoupper($code))->firstOrFail();
        $run = $this->race->push($run, $request->integer('team_id'), (float) $request->input('delta'));

        return response()->json($this->race->state($run));
    }
}
