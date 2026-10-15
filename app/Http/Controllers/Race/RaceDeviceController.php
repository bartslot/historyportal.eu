<?php

declare(strict_types=1);

namespace App\Http\Controllers\Race;

use App\Http\Controllers\Controller;
use App\Http\Requests\Race\JoinRaceRequest;
use App\Http\Requests\Race\PushRaceRequest;
use App\Models\RaceRun;
use App\Services\Lessons\HarbourRace;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\View\View;

/**
 * A team device in a harbour race: the controller page /race/{code} (the race QR opens it), picking
 * a team, pushing what the team gains, reading the race. Public and throttled; pupils have no
 * account and nothing about them is stored.
 */
class RaceDeviceController extends Controller
{
    /** Unknown codes one address may try per minute (a typo or two, not a scan). */
    private const MISSES_PER_MINUTE = 20;

    /** The interface languages (lang/*.json + English). */
    private const UI_LANGUAGES = ['en', 'nl', 'de', 'fr', 'it'];

    public function __construct(private readonly HarbourRace $race) {}

    public function show(string $code): View
    {
        $run = $this->live($code, ['teams', 'scene', 'lesson']);
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
                // The race's own ship, sailing the team's progress on the phone.
                'ship' => $this->shipUrl($run, $moment),
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
        $run = $this->live($code, ['teams']);
        // Only a phone that joined the team keeps its signal light on.
        $team = $request->integer('team');
        if ($team > 0 && $this->race->validToken($run, $team, $request->header('X-Race-Token'))) {
            $this->race->seen($run, $team);
            $run->load('teams');
        }

        return response()->json($this->race->state($run));
    }

    public function join(JoinRaceRequest $request, string $code): JsonResponse
    {
        $run = $this->live($code, ['teams']);
        $team = $run->teams->firstWhere('id', $request->integer('team_id'));
        abort_if($team === null, 422, 'No such team in this race.');
        $this->race->seen($run, $team->id);

        return response()->json([
            'team' => ['id' => $team->id, 'name' => $team->name],
            // The phone sends this with every push: proof it joined this team of this race.
            'token' => $this->race->teamToken($run, $team->id),
            'race' => $this->race->state($run->load('teams')),
        ]);
    }

    public function push(PushRaceRequest $request, string $code): JsonResponse
    {
        $run = $this->live($code);
        $team = $request->integer('team_id');
        abort_unless($this->race->validToken($run, $team, $request->header('X-Race-Token')), 403);
        [$run, $accepted] = $request->has('word')
            ? $this->race->pushWord($run, $team, $request->integer('word'))
            : $this->race->push($run, $team, (float) $request->input('delta'));

        return response()->json($this->race->state($run) + ['accepted' => $accepted]);
    }

    /** The picture of the ship the race is sailed with (the moment's reacting layer), or null. */
    private function shipUrl(RaceRun $run, array $moment): ?string
    {
        $id = $moment['react']['layer'] ?? $moment['payoff']['layer'] ?? null;
        $layers = (array) (((array) ($run->scene->shots ?? []))[0]['layers'] ?? []);
        foreach ($layers as $layer) {
            if ($id !== null && (int) ($layer['asset_id'] ?? 0) === (int) $id && ! empty($layer['path'])) {
                return MediaUrl::of($layer['path']);
            }
        }

        return null;
    }

    /**
     * A race that exists and has not expired. A code that does not counts against the asking
     * address, so trying codes off the top of one's head stops after a few dozen.
     *
     * @param  list<string>  $with
     */
    private function live(string $code, array $with = []): RaceRun
    {
        $run = RaceRun::live()->where('code', strtoupper($code))->with($with)->first();
        if ($run !== null) {
            return $run;
        }
        $key = 'race-miss:'.request()->ip();
        abort_if(RateLimiter::tooManyAttempts($key, self::MISSES_PER_MINUTE), 429);
        RateLimiter::hit($key, 60);
        abort(404);
    }
}
