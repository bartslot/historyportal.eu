<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\RaceRun;
use App\Models\Scene;
use App\Models\User;
use App\Services\Lessons\HarbourRace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * The harbour race on team devices: the teacher opens, names, starts and ends it; team phones join,
 * push and poll; the first two teams over the line crew the ships, once, by server time; nothing
 * personal is stored and nothing lives past a day.
 */
class HarbourRaceServerTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::factory()->create(['teacher_id' => $this->teacher->id, 'status' => LessonStatus::Published->value]);
        $this->scene = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready', 'config' => ['moment' => [
            'enabled' => true, 'goal' => 4, 'teams' => 3, 'words' => ['right' => ['a', 'b', 'c', 'd'], 'wrong' => []],
            'race' => ['enabled' => true],
        ]]]);
    }

    private function open(): array
    {
        return $this->actingAs($this->teacher)
            ->postJson(route('race.store', $this->lesson->lesson_code), ['scene_id' => $this->scene->id])
            ->assertCreated()->json();
    }

    private function push(string $code, int $team, float $delta, string $device = 'device-0000-0000-0001'): array
    {
        return $this->withHeader('X-Race-Device', $device)->postJson(route('race.push', $code), ['team_id' => $team, 'delta' => $delta])->assertOk()->json();
    }

    public function test_the_teacher_opens_a_race_with_the_moments_teams_and_names_them_in_the_lobby(): void
    {
        $race = $this->open();

        $this->assertSame('lobby', $race['state']);
        $this->assertMatchesRegularExpression('/^[A-HJ-NP-Z2-9]{4}$/', $race['code']);
        $this->assertSame(['Team 1', 'Team 2', 'Team 3'], array_column($race['teams'], 'name'));

        $named = $this->patchJson(route('race.update', $race['code']), ['names' => ['<b>De Haaien</b>', 'Oranje', ' ', 'Zeehonden']])->assertOk()->json();
        $this->assertSame(['De Haaien', 'Oranje', 'Zeehonden'], array_column($named['teams'], 'name'));
    }

    public function test_only_who_manages_the_lesson_runs_its_race(): void
    {
        $race = $this->open();
        $other = User::factory()->create();

        $this->actingAs($other)->postJson(route('race.store', $this->lesson->lesson_code), ['scene_id' => $this->scene->id])->assertForbidden();
        $this->actingAs($other)->patchJson(route('race.update', $race['code']), ['action' => 'start'])->assertForbidden();
        $this->actingAs($other)->deleteJson(route('race.destroy', $race['code']))->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->postJson(route('race.store', $this->lesson->lesson_code), ['scene_id' => $this->scene->id])->assertUnauthorized();
    }

    public function test_a_scene_without_a_race_cannot_open_one(): void
    {
        $plain = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 2, 'kind' => 'narration', 'status' => 'ready', 'config' => ['moment' => ['race' => ['enabled' => false]]]]);
        $this->actingAs($this->teacher)->postJson(route('race.store', $this->lesson->lesson_code), ['scene_id' => $plain->id])->assertStatus(422);
    }

    public function test_devices_join_push_and_the_first_two_over_the_line_crew_the_ships(): void
    {
        $race = $this->open();
        [$t1, $t2, $t3] = array_column($race['teams'], 'id');
        $this->app['auth']->forgetGuards();

        $this->postJson(route('race.join', $race['code']), ['team_id' => $t2])->assertOk()->assertJsonPath('team.name', 'Team 2');
        $this->assertSame('lobby', $this->push($race['code'], $t2, 1)['state']);      // nothing counts before the start
        $this->assertEqualsWithDelta(0, $this->getJson(route('race.state', $race['code']))->json('teams.1.progress'), 0.001);

        $this->actingAs($this->teacher)->patchJson(route('race.update', $race['code']), ['action' => 'start'])->assertJsonPath('state', 'running');
        $this->app['auth']->forgetGuards();

        foreach ([1, 1, 1, 1] as $d) {
            $state = $this->push($race['code'], $t2, $d);
        }
        $this->assertNotNull($state['teams'][1]['finished_ms']);
        $this->assertSame('running', $state['state']);                                // the Zeehaen still needs a crew
        $this->push($race['code'], $t3, 0.5);
        foreach ([1, 1, 1, 1] as $d) {
            $state = $this->push($race['code'], $t1, $d);
        }
        $this->assertSame('finished', $state['state']);
        $this->assertEquals(['heemskerck' => $t2, 'zeehaen' => $t1], (array) $state['roles']);

        $this->push($race['code'], $t3, 1);                                            // after the finish nothing moves
        $this->assertEqualsWithDelta(0.5, $this->getJson(route('race.state', $race['code']))->json('teams.2.progress'), 0.001);
    }

    public function test_a_tampered_device_cannot_teleport_and_a_meter_never_passes_its_goal(): void
    {
        $race = $this->open();
        $team = $race['teams'][0]['id'];
        $this->patchJson(route('race.update', $race['code']), ['action' => 'start']);
        $this->app['auth']->forgetGuards();

        $this->assertEqualsWithDelta(1.0, $this->push($race['code'], $team, 8)['teams'][0]['progress'], 0.001);   // a quarter of 4 at most
        $this->withHeader('X-Race-Device', 'device-0000-0000-0001')->postJson(route('race.push', $race['code']), ['team_id' => $team, 'delta' => -3])->assertStatus(422);
        $this->push($race['code'], 999999, 1);                                         // a team of no race: ignored
        foreach (range(1, 6) as $i) {
            $state = $this->push($race['code'], $team, 1);
        }
        $this->assertEqualsWithDelta(4.0, $state['teams'][0]['progress'], 0.001);
    }

    public function test_ending_early_ranks_by_progress_and_crews_no_team_that_never_got_going(): void
    {
        $race = $this->open();
        [$t1, $t2, $t3] = array_column($race['teams'], 'id');
        $this->patchJson(route('race.update', $race['code']), ['action' => 'start']);
        $this->app['auth']->forgetGuards();
        $this->push($race['code'], $t3, 1);

        $ended = $this->actingAs($this->teacher)->patchJson(route('race.update', $race['code']), ['action' => 'end'])->json();
        $this->assertSame('finished', $ended['state']);
        $this->assertEquals(['heemskerck' => $t3], (array) $ended['roles']);
    }

    public function test_a_device_that_only_reads_counts_as_present_and_a_silent_team_loses_its_signal(): void
    {
        $race = $this->open();
        $team = $race['teams'][0]['id'];
        $this->app['auth']->forgetGuards();

        $this->assertFalse($this->getJson(route('race.state', $race['code']))->json('teams.0.joined'));
        $this->getJson(route('race.state', $race['code']).'?team='.$team)->assertJsonPath('teams.0.signal', true);
        Carbon::setTestNow(Carbon::now()->addSeconds(10));
        $this->getJson(route('race.state', $race['code']))->assertJsonPath('teams.0.joined', true)->assertJsonPath('teams.0.signal', false);
        Carbon::setTestNow();
    }

    public function test_nothing_personal_is_stored_and_nothing_lives_past_a_day(): void
    {
        $this->assertSame(['id', 'race_run_id', 'position', 'name', 'progress', 'finished_ms', 'last_seen_at', 'created_at', 'updated_at'], Schema::getColumnListing('race_teams'));

        $old = $this->open();
        Carbon::setTestNow(Carbon::now()->addHours(25));
        $this->open();                                                                  // a new race prunes the old one
        $this->assertNull(RaceRun::where('code', $old['code'])->first());
        Carbon::setTestNow();

        $race = $this->open();
        $this->deleteJson(route('race.destroy', $race['code']))->assertNoContent();
        $this->assertSame(0, RaceRun::where('code', $race['code'])->count());
        $this->assertSame(0, app(HarbourRace::class)->prune());
    }

    public function test_thirty_devices_behind_one_school_address_can_join_in_one_minute(): void
    {
        $race = $this->open();
        $team = $race['teams'][0]['id'];
        $this->app['auth']->forgetGuards();

        foreach (range(1, 30) as $i) {
            $this->postJson(route('race.join', $race['code']), ['team_id' => $team])->assertOk();
        }
        foreach (range(31, 60) as $i) {
            $this->postJson(route('race.join', $race['code']), ['team_id' => $team]);
        }
        $this->postJson(route('race.join', $race['code']), ['team_id' => $team])->assertStatus(429);   // 60 per run per minute
        RateLimiter::clear('race-join:'.$race['code']);
    }

    public function test_the_controller_page_shows_only_the_meter_and_the_teams(): void
    {
        $race = $this->open();
        $this->app['auth']->forgetGuards();
        $this->withoutVite();

        $html = $this->get(route('race.device', $race['code']))->assertOk()->getContent();
        $this->assertStringContainsString('data-race-device', $html);
        $this->assertStringContainsString('"name":"Team 1"', $html);
        $this->get(route('race.device', 'ZZZZ'))->assertNotFound();

        $this->lesson->update(['language' => 'nl']);
        $this->get(route('race.device', $race['code']))->assertSee('lang="nl"', false)->assertSee('In welk team zit jij?');
    }
}
