<?php

declare(strict_types=1);

namespace Tests\Feature\TestSessions;

use App\Models\TestEvent;
use App\Models\TestRrwebChunk;
use App\Models\TestSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

/** The recorder's routes: only an open session takes data, pupils never, reading is admin/owner. */
class TestSessionRoutesTest extends TestCase
{
    use RefreshDatabase;

    private function open(array $attributes = []): TestSession
    {
        return TestSession::create(['code' => 'DEMO1', 'started_at' => now(), ...$attributes]);
    }

    private function batch(array $events = [['t' => 1200, 'type' => 'click', 'data' => ['text' => 'Start de les', 'role' => 'button']]], ?array $rrweb = null): array
    {
        return array_filter(['events' => $events, 'rrweb' => $rrweb], fn ($v) => $v !== null);
    }

    public function test_a_teacher_opens_a_session_and_returns_to_the_page_with_the_code(): void
    {
        $teacher = User::factory()->teacher()->create();

        $response = $this->actingAs($teacher)->post(route('test-sessions.store'), ['return' => '/lesson/E3R2OK?x=1']);

        $session = TestSession::sole();
        $this->assertSame($teacher->id, $session->user_id);
        $this->assertNull($session->started_at, 'not started before the tester consents');
        $response->assertRedirect('/lesson/E3R2OK?x=1&test='.$session->code);
    }

    public function test_the_return_path_cannot_leave_the_site(): void
    {
        $teacher = User::factory()->teacher()->create();

        $this->actingAs($teacher)->post(route('test-sessions.store'), ['return' => '//evil.example/x'])
            ->assertSessionHasErrors('return');
        $this->assertSame(0, TestSession::count());
    }

    public function test_a_student_cannot_open_a_session(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->post(route('test-sessions.store'))->assertForbidden();
    }

    public function test_start_sets_the_clock_once_and_reports_elapsed_time(): void
    {
        TestSession::create(['code' => 'DEMO1']);

        $this->postJson('/test-sessions/demo1/start')->assertOk()->assertJsonPath('code', 'DEMO1');
        $started = TestSession::sole()->started_at;
        $this->travel(5)->seconds();

        $elapsed = $this->postJson('/test-sessions/DEMO1/start')->assertOk()->json('elapsed_ms');

        $this->assertEquals($started, TestSession::sole()->started_at);
        $this->assertGreaterThanOrEqual(5000, $elapsed);
    }

    public function test_a_valid_open_code_stores_events_and_a_gzipped_rrweb_chunk(): void
    {
        $session = $this->open();
        $big = [['type' => 2, 'timestamp' => 1, 'data' => ['html' => str_repeat('<p>Tasman</p>', 3000)]]];

        $this->postJson('/test-sessions/DEMO1/batch', $this->batch(rrweb: ['seq' => 0, 'events' => $big]))->assertNoContent();
        $this->postJson('/test-sessions/DEMO1/batch', $this->batch(rrweb: ['seq' => 0, 'events' => $big]))->assertNoContent(); // a retried beacon

        $event = TestEvent::where('test_session_id', $session->id)->first();
        $this->assertSame(['click', 1200, 'Start de les'], [$event->type, $event->t_ms, $event->payload['text']]);
        $chunk = TestRrwebChunk::sole();
        $this->assertTrue($chunk->gzipped);
        $this->assertSame($big, $chunk->decoded());
    }

    public function test_a_gzipped_batch_is_unpacked_and_validated(): void
    {
        $this->open();
        $gzip = fn (array $body): string => (string) gzencode((string) json_encode($body));
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_CONTENT_ENCODING' => 'gzip', 'HTTP_ACCEPT' => 'application/json'];

        $this->call('POST', '/test-sessions/DEMO1/batch', server: $headers, content: $gzip($this->batch()))->assertNoContent();
        $this->call('POST', '/test-sessions/DEMO1/batch', server: $headers, content: $gzip(['events' => [['t' => 1, 'type' => 'keystroke']]]))->assertUnprocessable();
        $this->call('POST', '/test-sessions/DEMO1/batch', server: $headers, content: 'not gzip')->assertUnprocessable();

        $this->assertSame(['click'], TestEvent::pluck('type')->all());
    }

    public function test_unknown_unstarted_and_ended_codes_are_refused(): void
    {
        $this->postJson('/test-sessions/NOPE1/batch', $this->batch())->assertNotFound();

        TestSession::create(['code' => 'WAIT1']);
        $this->postJson('/test-sessions/WAIT1/batch', $this->batch())->assertStatus(410);

        $this->open(['code' => 'DONE1', 'ended_at' => now()]);
        $this->postJson('/test-sessions/DONE1/batch', $this->batch())->assertStatus(410);
        $this->postJson('/test-sessions/DONE1/start')->assertStatus(410);

        $this->assertSame(0, TestEvent::count());
    }

    public function test_invalid_events_are_rejected(): void
    {
        $this->open();

        $this->postJson('/test-sessions/DEMO1/batch', $this->batch([['t' => 1, 'type' => 'keystroke']]))->assertUnprocessable();
        $this->postJson('/test-sessions/DEMO1/batch', $this->batch([['t' => -5, 'type' => 'click']]))->assertUnprocessable();
        $this->postJson('/test-sessions/DEMO1/batch', $this->batch([['t' => 1, 'type' => 'click', 'data' => ['text' => str_repeat('x', 3000)]]]))->assertUnprocessable();

        $this->assertSame(0, TestEvent::count());
    }

    public function test_a_pupil_is_never_recorded(): void
    {
        $this->open();
        $pupil = User::factory()->student()->create();

        $this->actingAs($pupil)->postJson('/test-sessions/DEMO1/start')->assertForbidden();
        $this->actingAs($pupil)->postJson('/test-sessions/DEMO1/batch', $this->batch())->assertForbidden();
        $this->assertSame(0, TestEvent::count());
    }

    public function test_end_closes_the_session(): void
    {
        $this->open();

        $this->postJson('/test-sessions/DEMO1/end')->assertNoContent();

        $this->assertNotNull(TestSession::sole()->ended_at);
        $this->postJson('/test-sessions/DEMO1/batch', $this->batch())->assertStatus(410);
    }

    public function test_the_ingest_routes_are_throttled_per_code(): void
    {
        $this->open();
        RateLimiter::clear('test-session:DEMO1:127.0.0.1');

        foreach (range(1, 40) as $_) {
            $this->postJson('/test-sessions/DEMO1/batch', $this->batch([]))->assertNoContent();
        }

        $this->postJson('/test-sessions/DEMO1/batch', $this->batch([]))->assertTooManyRequests();
    }

    public function test_only_admins_and_the_owner_can_read_a_session(): void
    {
        $owner = User::factory()->teacher()->create();
        $session = $this->open(['user_id' => $owner->id]);
        TestEvent::create(['test_session_id' => $session->id, 't_ms' => 12, 'type' => 'click', 'payload' => ['text' => 'Klaar']]);

        $this->getJson('/test-sessions/DEMO1')->assertUnauthorized();
        $this->actingAs(User::factory()->teacher()->create())->getJson('/test-sessions/DEMO1')->assertForbidden();
        $this->actingAs($owner)->getJson('/test-sessions/DEMO1')->assertOk()->assertJsonPath('events.0.payload.text', 'Klaar');
        $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/test-sessions/DEMO1')->assertOk();
    }

    public function test_prune_deletes_sessions_older_than_30_days_with_everything_they_recorded(): void
    {
        $old = $this->open(['code' => 'OLD01']);
        $old->forceFill(['created_at' => now()->subDays(TestSession::RETENTION_DAYS + 1)])->save();
        TestEvent::create(['test_session_id' => $old->id, 't_ms' => 1, 'type' => 'click']);
        TestRrwebChunk::create(['test_session_id' => $old->id, 'seq' => 0, ...TestRrwebChunk::encode([['type' => 4]])]);
        $fresh = $this->open(['code' => 'NEW01']);

        Artisan::call('model:prune', ['--model' => [TestSession::class]]);

        $this->assertSame([$fresh->id], TestSession::pluck('id')->all());
        $this->assertSame(0, TestEvent::count());
        $this->assertSame(0, TestRrwebChunk::count());
    }
}
