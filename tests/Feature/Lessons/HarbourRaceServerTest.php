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
        // The miss counter lives in the cache, which outlives a single test.
        RateLimiter::clear('race-miss:127.0.0.1');

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

    /** @var array<int, string> team id => the token its phone got at join */
    private array $tokens = [];

    private function join(string $code, int $team): array
    {
        $body = $this->postJson(route('race.join', $code), ['team_id' => $team])->assertOk()->json();
        $this->tokens[$team] = $body['token'];

        return $body;
    }

    /** A push one second after the last: a team may gain a quarter of its meter per second. */
    private function push(string $code, int $team, float $delta, string $device = 'device-0000-0000-0001'): array
    {
        Carbon::setTestNow(Carbon::now()->addSecond());
        $token = $this->tokens[$team] ?? app(HarbourRace::class)->teamToken(RaceRun::where('code', $code)->firstOrFail(), $team);

        return $this->withHeaders(['X-Race-Device' => $device, 'X-Race-Token' => $token])
            ->postJson(route('race.push', $code), ['team_id' => $team, 'delta' => $delta])->assertOk()->json();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
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

        $this->assertSame('Team 2', $this->join($race['code'], $t2)['team']['name']);
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
        foreach (range(1, 6) as $i) {
            $state = $this->push($race['code'], $team, 1);
        }
        $this->assertEqualsWithDelta(4.0, $state['teams'][0]['progress'], 0.001);
    }

    public function test_a_push_needs_the_token_of_that_team_and_a_team_gains_no_faster_than_a_quarter_meter_a_second(): void
    {
        $race = $this->open();
        [$t1, $t2] = array_column($race['teams'], 'id');
        $this->patchJson(route('race.update', $race['code']), ['action' => 'start']);
        $this->app['auth']->forgetGuards();
        $this->join($race['code'], $t1);
        Carbon::setTestNow(Carbon::now());                                              // real time must not leak in

        $push = fn (int $team, ?string $token) => $this->withHeaders(['X-Race-Token' => (string) $token])
            ->postJson(route('race.push', $race['code']), ['team_id' => $team, 'delta' => 1]);
        $push($t2, null)->assertForbidden();                                            // no join, no push
        $push($t2, $this->tokens[$t1])->assertForbidden();                              // one team's token is not another's
        $this->assertEqualsWithDelta(1.0, $push($t1, $this->tokens[$t1])->assertOk()->json('accepted'), 0.001);
        // Many phones (or forged requests) in the same instant: the team still gains no faster.
        $this->assertEqualsWithDelta(0.0, $push($t1, $this->tokens[$t1])->json('accepted'), 0.001);
        Carbon::setTestNow(Carbon::now()->addMilliseconds(500));
        $this->assertEqualsWithDelta(0.5, $push($t1, $this->tokens[$t1])->json('accepted'), 0.001);
    }

    public function test_only_a_phone_that_joined_keeps_its_teams_signal_on(): void
    {
        $race = $this->open();
        $team = $race['teams'][0]['id'];
        $this->app['auth']->forgetGuards();

        $this->getJson(route('race.state', $race['code']).'?team='.$team)->assertJsonPath('teams.0.joined', false);
        $this->join($race['code'], $team);
        Carbon::setTestNow(Carbon::now()->addSeconds(10));
        $this->withHeader('X-Race-Token', $this->tokens[$team])->getJson(route('race.state', $race['code']).'?team='.$team)
            ->assertJsonPath('teams.0.signal', true);
    }

    public function test_an_expired_race_is_gone_and_trying_codes_is_cut_short(): void
    {
        $race = $this->open();
        $this->app['auth']->forgetGuards();
        Carbon::setTestNow(Carbon::now()->addHours(25));
        $this->getJson(route('race.state', $race['code']))->assertNotFound();      // before any prune ran
        Carbon::setTestNow();

        // The expired race was the first miss; nineteen more codes are still answered, the next is cut short.
        foreach (range(1, 19) as $i) {
            $this->getJson(route('race.state', 'ZZ'.str_pad((string) $i, 2, '0', STR_PAD_LEFT)))->assertNotFound();
        }
        $this->getJson(route('race.state', 'ZZZZ'))->assertStatus(429);
        RateLimiter::clear('race-miss:127.0.0.1');
    }

    public function test_opening_a_scenes_race_again_replaces_the_old_one(): void
    {
        $first = $this->open();
        $second = $this->open();
        $this->assertNotSame($first['code'], $second['code']);
        $this->assertSame(1, RaceRun::count());
    }

    public function test_a_right_word_counts_once_per_team_however_many_phones_tap_it(): void
    {
        $race = $this->open();
        [$t1, $t2] = array_column($race['teams'], 'id');
        $this->patchJson(route('race.update', $race['code']), ['action' => 'start']);
        $this->app['auth']->forgetGuards();
        $this->join($race['code'], $t1);
        $this->join($race['code'], $t2);

        $word = fn (int $team, int $index, string $device) => $this->withHeaders(['X-Race-Token' => $this->tokens[$team], 'X-Race-Device' => $device])
            ->postJson(route('race.push', $race['code']), ['team_id' => $team, 'word' => $index])->assertOk()->json();

        $this->assertEqualsWithDelta(1.0, $word($t1, 2, 'phone-a-000000000001')['accepted'], 0.001);
        $again = $word($t1, 2, 'phone-b-000000000002');                                // another phone, same team, same word
        $this->assertEqualsWithDelta(0.0, $again['accepted'], 0.001);
        $this->assertEqualsWithDelta(1.0, $again['teams'][0]['progress'], 0.001);
        $this->assertSame([2], $again['teams'][0]['words']);                           // every phone of the team sees it used
        $this->assertEqualsWithDelta(1.0, $word($t2, 2, 'phone-c-000000000003')['accepted'], 0.001);   // another team may find it too
        $this->assertEqualsWithDelta(0.0, $word($t1, 7, 'phone-a-000000000001')['accepted'], 0.001);   // not one of the four words
        // Different words in the same instant all count: each word is its own limit, no speed cap.
        foreach ([0, 1, 3] as $i) {
            $state = $word($t1, $i, 'phone-a-000000000001');
        }
        $this->assertEqualsWithDelta(4.0, $state['teams'][0]['progress'], 0.001);
        $this->assertNotNull($state['teams'][0]['finished_ms']);
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
        $this->join($race['code'], $team);
        $this->withHeader('X-Race-Token', $this->tokens[$team])->getJson(route('race.state', $race['code']).'?team='.$team)->assertJsonPath('teams.0.signal', true);
        Carbon::setTestNow(Carbon::now()->addSeconds(10));
        $this->getJson(route('race.state', $race['code']))->assertJsonPath('teams.0.joined', true)->assertJsonPath('teams.0.signal', false);
        Carbon::setTestNow();
    }

    public function test_nothing_personal_is_stored_and_nothing_lives_past_a_day(): void
    {
        $this->assertSame(['id', 'race_run_id', 'position', 'name', 'progress', 'finished_ms', 'last_seen_at', 'created_at', 'updated_at', 'pushed_ms', 'words'], Schema::getColumnListing('race_teams'));

        $old = $this->open();
        Carbon::setTestNow(Carbon::now()->addHours(25));
        $other = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 3, 'kind' => 'narration', 'status' => 'ready', 'config' => $this->scene->config]);
        $this->actingAs($this->teacher)->postJson(route('race.store', $this->lesson->lesson_code), ['scene_id' => $other->id])->assertCreated();
        $this->assertNull(RaceRun::where('code', $old['code'])->first());                // a new race (any scene) prunes the expired one
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
