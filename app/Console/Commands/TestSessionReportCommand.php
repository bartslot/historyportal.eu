<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\TestEvent;
use App\Models\TestSession;
use App\Services\TestSessions\TestSessionReport;
use App\Services\TestSessions\TestSessionSnapshots;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

/**
 * The report Claude reads after a test: timeline, auto-flagged problems, a snapshot per flag.
 *
 *   php artisan test:report DEMO1
 *
 * Written to the vault's live-test-sessions/reports/ when that folder's parent exists (Bart's Mac),
 * else to storage/app/private/test-reports. Snapshots go in a folder next to the report.
 */
class TestSessionReportCommand extends Command
{
    public const VAULT_DIR = '/Users/bartslot/BartsAutomation/BartsDev/Memory/historyportal/topics/live-test-sessions/reports';

    /** One snapshot per flag, up to this many. */
    private const MAX_SNAPSHOTS = 20;

    protected $signature = 'test:report
        {code : The test session}
        {--dir= : Folder for the report (default: the vault, else storage/app/private/test-reports)}
        {--no-snapshots : Skip the replay screenshots}';

    protected $description = 'Write the timeline + findings report for a test session';

    public function handle(TestSessionReport $report, TestSessionSnapshots $snapshots): int
    {
        $session = TestSession::where('code', strtoupper((string) $this->argument('code')))->first();

        if (! $session) {
            $this->error('No such test session.');

            return self::FAILURE;
        }

        $events = $session->events()->orderBy('t_ms')->orderBy('id')->get()
            ->map(fn (TestEvent $e): array => ['t_ms' => $e->t_ms, 'type' => $e->type, 'payload' => $e->payload])
            ->all();
        $flags = $report->flags($events);

        $dir = (string) ($this->option('dir') ?: (is_dir(dirname(self::VAULT_DIR)) ? self::VAULT_DIR : storage_path('app/private/test-reports')));
        $name = ($session->started_at ?? $session->created_at)->toDateString().'-'.$session->code;
        File::ensureDirectoryExists($dir);
        File::deleteDirectory("{$dir}/{$name}"); // a rerun must not leave the last run's pictures

        $images = $this->option('no-snapshots') ? [] : $this->snapshots($snapshots, $session, $flags, "{$dir}/{$name}");

        $recording = [
            'chunks' => $session->chunks()->count(),
            'bytes' => (int) $session->chunks()->sum(DB::raw('length(events)')),
        ];

        $path = "{$dir}/{$name}.md";
        File::put($path, $report->markdown($session, $events, $flags, $images, $recording));
        $this->line($path);
        $this->info(count($flags).' findings, '.count($images).' snapshots.');

        return self::SUCCESS;
    }

    /**
     * @param  list<array{t_ms: int, kind: string, text: string}>  $flags
     * @return array<int, string> flag index => image path relative to the report
     */
    private function snapshots(TestSessionSnapshots $snapshots, TestSession $session, array $flags, string $folder): array
    {
        $shots = [];
        $index = [];
        foreach (array_slice($flags, 0, self::MAX_SNAPSHOTS, true) as $i => $flag) {
            $file = sprintf('%02d-%s-%s.png', $i + 1, str_replace(':', '-', TestSessionReport::clock($flag['t_ms'])), str_replace(' ', '-', $flag['kind']));
            $shots["{$folder}/{$file}"] = $flag['t_ms'];
            $index["{$folder}/{$file}"] = $i;
        }

        try {
            $written = $snapshots->render($session, $shots);
        } catch (Throwable $e) {
            $this->warn('No snapshots: '.$e->getMessage());

            return [];
        }

        $images = [];
        foreach ($written as $out) {
            $images[$index[$out]] = basename($folder).'/'.basename($out);
        }

        return $images;
    }
}
