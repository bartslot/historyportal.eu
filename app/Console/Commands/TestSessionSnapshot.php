<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\TestSession;
use App\Services\TestSessions\TestSessionReport;
use App\Services\TestSessions\TestSessionSnapshots;
use Illuminate\Console\Command;

/**
 * One moment of a recorded test session as a PNG, replayed silently in headless Chromium.
 *
 *   php artisan test:snapshot DEMO1 --at=01:15
 */
class TestSessionSnapshot extends Command
{
    protected $signature = 'test:snapshot
        {code : The test session}
        {--at=00:00 : Time since the session start, MM:SS or H:MM:SS}
        {--out= : PNG path (default storage/app/private/test-snapshots/CODE-MM-SS.png)}';

    protected $description = 'Render a test session at one moment to a PNG (silent replay)';

    public function handle(TestSessionSnapshots $snapshots): int
    {
        $session = TestSession::where('code', strtoupper((string) $this->argument('code')))->first();
        $at = TestSessionReport::parseClock((string) $this->option('at'));

        if (! $session || $at === null) {
            $this->error($session ? 'Give --at as MM:SS.' : 'No such test session.');

            return self::FAILURE;
        }

        $out = (string) ($this->option('out')
            ?: storage_path('app/private/test-snapshots/'.$session->code.'-'.str_replace(':', '-', TestSessionReport::clock($at)).'.png'));

        $written = $snapshots->render($session, [$out => $at]);

        if ($written === []) {
            $this->error('Nothing recorded to replay.');

            return self::FAILURE;
        }

        $this->line($written[0]);

        return self::SUCCESS;
    }
}
