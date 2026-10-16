<?php

declare(strict_types=1);

namespace Tests\Feature\TestSessions;

use App\Models\TestEvent;
use App\Models\TestSession;
use App\Services\TestSessions\TestSessionReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/** test:report on fixture events: the timeline reads right and every problem kind is flagged. */
class TestSessionReportTest extends TestCase
{
    use RefreshDatabase;

    /** @return list<array{t_ms: int, type: string, payload: ?array<string, mixed>}> */
    private function fixture(): array
    {
        $e = fn (int $t, string $type, ?array $payload = null): array => ['t_ms' => $t, 'type' => $type, 'payload' => $payload];

        return [
            $e(0, 'route', ['path' => '/lesson/E3R2OK']),
            $e(100, 'viewport', ['w' => 1280, 'h' => 800]),
            $e(12_000, 'click', ['text' => 'Start de les', 'role' => 'button']),
            $e(12_400, 'scene', ['event' => 'scene_started', 'sceneIndex' => 0]),
            $e(40_000, 'http_error', ['status' => 500, 'method' => 'POST', 'url' => '/livewire/update']),
            $e(40_500, 'http_error', ['status' => 500, 'method' => 'POST', 'url' => '/livewire/update']), // same problem
            $e(41_000, 'click', ['text' => 'Klaar', 'role' => 'button']),
            $e(41_000, 'dead_click', ['text' => 'Klaar', 'role' => 'button']),
            $e(50_000, 'rage_click', ['text' => 'Laad', 'role' => 'button', 'count' => 3]),
            $e(51_000, 'route', ['path' => '/teacher']),
            $e(60_000, 'route', ['path' => '/lesson/E3R2OK']),
            $e(140_000, 'click', ['text' => 'Volgende', 'role' => 'button']),
            $e(141_000, 'console_error', ['message' => 'TypeError: x is undefined']),
            $e(142_000, 'stop'),
        ];
    }

    public function test_it_flags_errors_rage_dead_idle_and_back_and_forth(): void
    {
        $flags = (new TestSessionReport)->flags($this->fixture());

        $this->assertSame([
            [40_000, 'fout', 'fout 500 POST /livewire/update'],
            [41_000, 'dode klik', "dode klik 'Klaar' [button]"],
            [50_000, 'woedeklik', "woedeklik 'Laad' [button] (3×)"],
            [60_000, 'stil', '80 s niets gedaan (01:00 tot 02:20)'],
            [60_000, 'heen en terug', '/lesson/E3R2OK → /teacher → na 9 s terug'],
            [141_000, 'fout', 'console: TypeError: x is undefined'],
        ], array_map(fn (array $f): array => [$f['t_ms'], $f['kind'], $f['text']], $flags));
    }

    public function test_the_timeline_is_one_compact_line_per_minute(): void
    {
        $timeline = (new TestSessionReport)->timeline(array_slice($this->fixture(), 0, 5));

        $this->assertSame(
            "- 00:00 pagina /lesson/E3R2OK · 00:00 scherm 1280×800 · 00:12 klik 'Start de les' [button] · 00:12 scène 1 · 00:40 fout 500 POST /livewire/update",
            $timeline,
        );
    }

    public function test_clock_round_trips(): void
    {
        $this->assertSame('01:15', TestSessionReport::clock(75_300));
        $this->assertSame('1:01:15', TestSessionReport::clock(3_675_000));
        $this->assertSame(75_000, TestSessionReport::parseClock('01:15'));
        $this->assertNull(TestSessionReport::parseClock('soon'));
    }

    public function test_the_command_writes_the_report_file(): void
    {
        $session = TestSession::create(['code' => 'DEMO1', 'label' => 'Tasman', 'started_at' => now(), 'ended_at' => now()->addMinutes(3)]);
        foreach ($this->fixture() as $event) {
            TestEvent::create(['test_session_id' => $session->id, ...$event]);
        }
        $dir = storage_path('framework/testing/test-reports');
        File::deleteDirectory($dir);

        $this->artisan('test:report', ['code' => 'demo1', '--dir' => $dir, '--no-snapshots' => true])->assertSuccessful();

        $report = File::get($dir.'/'.now()->toDateString().'-DEMO1.md');
        $this->assertStringContainsString('# Testsessie DEMO1 · Tasman', $report);
        $this->assertStringContainsString('## Bevindingen (6)', $report);
        $this->assertStringContainsString("- 00:41 **dode klik** dode klik 'Klaar' [button]", $report);
        $this->assertStringContainsString("00:12 klik 'Start de les' [button]", $report);
        File::deleteDirectory($dir);
    }
}
