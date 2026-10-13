<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Models\Lesson;
use App\Models\RaceRun;
use App\Models\RaceTeam;
use App\Models\Scene;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * The harbour race on team devices: the class screen opens a run for a race moment, the teacher
 * names the teams in the lobby and starts it, the teams' phones push what they gain, and the first
 * two teams over the line crew the Heemskerck and the Zeehaen. resources/js/scene/race.js holds the
 * same rules for the race played on the class screen alone; this is the shared copy for devices.
 *
 * Nothing personal is stored: team names come from the teacher, devices are not recorded. A run is
 * deleted when the race ends (the class screen closes it) and at the latest after config race.ttl_hours;
 * every new run first deletes the expired ones, so the limit holds even when cron does not run.
 */
final class HarbourRace
{
    /** Codes pupils type: no 0/O, 1/I/L, so a code read off the board is the code that works. */
    private const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    private const CODE_LENGTH = 4;

    public const NAME_MAX = 24;

    public const TEAMS_MIN = 2;

    public const TEAMS_MAX = 8;

    public const SHIPS = ['heemskerck', 'zeehaen'];

    /**
     * Open a race for a race moment, in the lobby, with the moment's number of teams (4 unless set).
     */
    public function open(Lesson $lesson, Scene $scene, string $teamName): RaceRun
    {
        $moment = ($scene->config ?? [])['moment'] ?? null;
        if ($scene->lesson_id !== $lesson->id || ! is_array($moment) || ! ($moment['race']['enabled'] ?? false)) {
            throw new InvalidArgumentException('This scene has no harbour race.');
        }
        $this->prune();

        $teams = (int) ($moment['teams'] ?? 0);
        $teams = $teams >= self::TEAMS_MIN ? min(self::TEAMS_MAX, $teams) : 4;

        return DB::transaction(function () use ($lesson, $scene, $moment, $teams, $teamName): RaceRun {
            $run = RaceRun::create([
                'lesson_id' => $lesson->id,
                'scene_id' => $scene->id,
                'code' => $this->freshCode(),
                // Set, not left to the column default: the new model answers the class screen at once.
                'state' => 'lobby',
                'goal' => max(1, min(MomentSpec::RIGHT_MAX, (int) ($moment['goal'] ?? 4))),
                'expires_at' => Carbon::now()->addHours((int) config('race.ttl_hours', 24)),
            ]);
            for ($i = 0; $i < $teams; $i++) {
                $run->teams()->create(['position' => $i, 'name' => str_replace(':number', (string) ($i + 1), $teamName)]);
            }

            return $run->load('teams');
        });
    }

    /**
     * The lobby: the teacher's team names (moderation is theirs: pupils never type a name). Teams
     * beyond the list are removed, new ones added, up to TEAMS_MAX; only before the start.
     *
     * @param  list<string>  $names
     */
    public function rename(RaceRun $run, array $names): RaceRun
    {
        if ($run->state !== 'lobby') {
            return $run->load('teams');
        }
        $names = array_slice(array_values(array_filter(array_map(self::cleanName(...), $names), fn (string $n): bool => $n !== '')), 0, self::TEAMS_MAX);
        if (count($names) < self::TEAMS_MIN) {
            throw new InvalidArgumentException('A race needs at least two teams.');
        }

        DB::transaction(function () use ($run, $names): void {
            $run->teams()->where('position', '>=', count($names))->delete();
            foreach ($names as $i => $name) {
                $run->teams()->updateOrCreate(['position' => $i], ['name' => $name]);
            }
        });

        return $run->load('teams');
    }

    public function start(RaceRun $run): RaceRun
    {
        if ($run->state === 'lobby') {
            $run->update(['state' => 'running', 'started_at' => Carbon::now()]);
        }

        return $run->load('teams');
    }

    /**
     * A team device's gain. Atomic under a lock on the run: the progress never passes the goal, a
     * request never adds more than a quarter of the meter (a tampered device cannot teleport), and
     * the crews are decided exactly once, by server time.
     */
    public function push(RaceRun $run, int $teamId, float $delta): RaceRun
    {
        $delta = max(0.0, min($run->goal / 4, $delta));

        DB::transaction(function () use ($run, $teamId, $delta): void {
            $locked = RaceRun::whereKey($run->id)->lockForUpdate()->first();
            if ($locked === null || $locked->state !== 'running') {
                return;
            }
            $team = RaceTeam::where('race_run_id', $locked->id)->whereKey($teamId)->lockForUpdate()->first();
            if ($team === null) {
                return;
            }
            $progress = min((float) $locked->goal, round($team->progress + $delta, 3));
            $finished = $team->finished_ms === null && $progress >= $locked->goal - 0.001;
            $team->update([
                'progress' => $progress,
                'last_seen_at' => Carbon::now(),
                'finished_ms' => $finished ? (int) $locked->started_at->diffInMilliseconds(Carbon::now()) : $team->finished_ms,
            ]);
            if ($finished) {
                $this->decideIfDone($locked);
            }
        });

        return $run->fresh('teams');
    }

    /** A device that only reads: its team counts as present (at most one write per team per 3 s). */
    public function seen(RaceRun $run, int $teamId): void
    {
        RaceTeam::where('race_run_id', $run->id)->whereKey($teamId)
            ->where(fn ($q) => $q->whereNull('last_seen_at')->orWhere('last_seen_at', '<', Carbon::now()->subSeconds(3)))
            ->update(['last_seen_at' => Carbon::now()]);
    }

    /**
     * The teacher ends the race: finishers in their order, then the rest by progress (ties to the
     * lower team number). A team that never got going crews nothing.
     */
    public function end(RaceRun $run): RaceRun
    {
        DB::transaction(function () use ($run): void {
            $locked = RaceRun::whereKey($run->id)->lockForUpdate()->first();
            if ($locked !== null && $locked->state !== 'finished') {
                $this->finish($locked);
            }
        });

        return $run->fresh('teams');
    }

    /** Everything the class screen and the devices show. No personal data exists to leak. */
    public function state(RaceRun $run): array
    {
        $signal = (int) config('race.signal_seconds', 6);

        return [
            'code' => $run->code,
            'state' => $run->state,
            'goal' => $run->goal,
            'roles' => $run->roles ?? (object) [],
            'teams' => $run->teams->map(fn (RaceTeam $t): array => [
                'id' => $t->id,
                'name' => $t->name,
                'progress' => $t->progress,
                'finished_ms' => $t->finished_ms,
                'joined' => $t->last_seen_at !== null,
                'signal' => $t->last_seen_at !== null && $t->last_seen_at->gt(Carbon::now()->subSeconds($signal)),
            ])->values()->all(),
        ];
    }

    /** Delete every run past its time. Run hourly (races:prune) and before each new race. */
    public function prune(): int
    {
        return RaceRun::where('expires_at', '<', Carbon::now())->delete();
    }

    public static function cleanName(mixed $name): string
    {
        return is_scalar($name) ? mb_substr(trim(strip_tags((string) $name)), 0, self::NAME_MAX) : '';
    }

    private function decideIfDone(RaceRun $run): void
    {
        $teams = RaceTeam::where('race_run_id', $run->id)->get();
        $finished = $teams->whereNotNull('finished_ms')->count();
        if ($finished >= min(count(self::SHIPS), $teams->count())) {
            $this->finish($run);
        }
    }

    private function finish(RaceRun $run): void
    {
        $order = RaceTeam::where('race_run_id', $run->id)->get()
            ->sort(fn (RaceTeam $a, RaceTeam $b): int => [$a->finished_ms === null, $a->finished_ms, -$a->progress, $a->position]
                <=> [$b->finished_ms === null, $b->finished_ms, -$b->progress, $b->position])
            ->filter(fn (RaceTeam $t): bool => $t->progress > 0)
            ->values();
        $roles = [];
        foreach (self::SHIPS as $place => $ship) {
            if (isset($order[$place])) {
                $roles[$ship] = $order[$place]->id;
            }
        }
        $run->update(['state' => 'finished', 'finished_at' => Carbon::now(), 'roles' => $roles]);
    }

    private function freshCode(): string
    {
        do {
            $code = '';
            for ($i = 0; $i < self::CODE_LENGTH; $i++) {
                $code .= self::CODE_ALPHABET[random_int(0, strlen(self::CODE_ALPHABET) - 1)];
            }
        } while (RaceRun::where('code', $code)->exists());

        return $code;
    }
}
